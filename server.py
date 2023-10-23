from fastapi import FastAPI, Query, Depends, HTTPException
from fastapi.responses import JSONResponse
from typing import List, Dict, Optional, Any, Union
import argparse
from pydantic import BaseModel
from ap_package import append_ap_packages_to_sys_path
append_ap_packages_to_sys_path()
import json
import OpenSSL
import datetime
import traceback
import subprocess


from config import Configuration, get_session
from rt_m1_client.types import ResourceId, ApplicationId, ContentHostingConfiguration, ConsumptionReportingConfiguration
from rt_m1_client.exceptions import M1Error


app = FastAPI()
config = Configuration()

class DeleteSessionArgs(BaseModel):
    provisioning_session: Optional[str]
    ingesturl: str
    entrypoint: str

class CreateNewStreamModel(BaseModel):
    ingesturl: str
    app_id: str
    entrypoints: Optional[List[str]] = None
    name: Optional[str] = None
    asp_id: Optional[str] = None
    ssl: bool = False
    insecure: bool = True
    domain_name_alias: Optional[str] = None

def get_config():
    return Configuration()

async def __prettyPrintCertificate(cert: str, indent: int = 0) -> None:
    cert_desc = {}
    try:
        x509 = OpenSSL.crypto.load_certificate(OpenSSL.crypto.FILETYPE_PEM, cert)
    except OpenSSL.crypto.Error as err:
        print(f'{" "*indent} Certificate not understood as PEM data: {err}')
        return
    serial = x509.get_serial_number()
    subject = x509.get_subject()
    issuer = x509.get_issuer()
    start_str = x509.get_notBefore()
    if isinstance(start_str, bytes):
        start_str = start_str.decode('utf-8')
    start = datetime.datetime.strptime(start_str, '%Y%m%d%H%M%SZ').replace(tzinfo=datetime.timezone.utc)
    end_str = x509.get_notAfter()
    if isinstance(end_str, bytes):
        end_str = end_str.decode('utf-8')
    end = datetime.datetime.strptime(end_str, '%Y%m%d%H%M%SZ').replace(tzinfo=datetime.timezone.utc)
    subject_key = None
    issuer_key = None
    sans = []
    for ext_num in range(x509.get_extension_count()):
        ext = x509.get_extension(ext_num)
        ext_name = ext.get_short_name().decode('utf-8')
        if ext_name == "subjectKeyIdentifier":
            subject_key = str(ext)
        elif ext_name == "authorityKeyIdentifier":
            issuer_key = str(ext)
        elif ext_name == "subjectAltName":
            sans += [s.strip() for s in str(ext).split(',')]
    cert_info_prefix=' '*indent
    cert_desc=f'{cert_info_prefix}Serial = {serial}\n{cert_info_prefix}Not before = {start}\n{cert_info_prefix}Not after = {end}\n{cert_info_prefix}Subject = {__formatX509Name(subject)}\n'
    if subject_key is not None:
        cert_desc += f'{cert_info_prefix}          key={subject_key}\n'
    cert_desc += f'{cert_info_prefix}Issuer = {__formatX509Name(issuer)}'
    if issuer_key is not None:
        cert_desc += f'\n{cert_info_prefix}         key={issuer_key}'
    if len(sans) > 0:
        cert_desc += f'\n{cert_info_prefix}Subject Alternative Names:'
        cert_desc += ''.join([f'\n{cert_info_prefix}  {san}' for san in sans])
    return cert_desc

def __formatX509Name(x509name: OpenSSL.crypto.X509Name) -> str:
    ret = ",".join([f"{name.decode('utf-8')}={value.decode('utf-8')}" for name,value in x509name.get_components()])
    return ret

# Creates new provisioning session
# new-provisioning-session -e MyAppId -a MyASPId
@app.post("/create_session")
async def new_provisioning_session():

    session = await get_session(config)
    args = argparse.Namespace(app_id="MyAppId", asp_id="MyASPId")
    app_id = args.app_id or config.get('external_app_id')
    asp_id = args.asp_id or config.get('asp_id')

    provisioning_session_id: Optional[ResourceId] = await session.createDownlinkPullProvisioningSession(
        ApplicationId(app_id),
        ApplicationId(asp_id) if asp_id else None)
    
    if provisioning_session_id is None:
        return {"Failed to create a new provisioning session"}
        
    return {provisioning_session_id}


# Remove particular provisioning session
# del-stream -p ${provisioning_session_id}
@app.delete("/delete_session/{provisioning_session_id}")
async def cmd_delete_stream(provisioning_session_id: str, config: Configuration = Depends(get_config)) -> int:    
    session = await get_session(config)
    
    result = await session.provisioningSessionDestroy(provisioning_session_id)
    if result is None:
        print(f'Provisioning Session {provisioning_session_id} not found')
        return 1
    
    if not result:
        print(f'Failed to destroy Provisioning Session {provisioning_session_id}')
        return 1
    
    print(f'Provisioning Session {provisioning_session_id} and all its resources were destroyed')
    return 0

# Create CHC from json
# set-stream -p ${provisioning_session_id} ~/rt-5gms-application-function/examples/ContentHostingConfiguration_Big-Buck-Bunny_pull-ingest.json

@app.post("/set_stream/{provisioning_session_id}")
async def set_stream(provisioning_session_id: str, config: Configuration = Depends(get_config)) -> int:
    session = await get_session(config)
    
    json_path = "/home/stepski/rt-5gms-application-function/examples/ContentHostingConfiguration_Llama-Drama_pull-ingest.json"
    with open(json_path, 'r') as f:
        chc = json.load(f)
    
    old_chc = await session.contentHostingConfigurationGet(provisioning_session_id)
    
    if old_chc is None:
        result = await session.contentHostingConfigurationCreate(provisioning_session_id, chc)
    else:
        for dc in chc['distributionConfigurations']:
            for strip_field in ['canonicalDomainName', 'baseURL']:
                if strip_field in dc:
                    del dc[strip_field]
        result = await session.contentHostingConfigurationUpdate(provisioning_session_id, chc)

    if not result:
        print(f'Failed to set hosting for provisioning session {provisioning_session_id}')
        return 1
    
    print(f'Hosting set for provisioning session {provisioning_session_id}')
    return 0


# Retrieve Session Details
# list -v
@app.get("/details", response_model=List[dict])
async def list_provisioning_sessions():
    config = Configuration()
    try:
        session = await get_session(config)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    provisioning_sessions = []
    for ps_id in await session.provisioningSessionIds():
        ps_data = {"id": ps_id, "Certificates": [], "ContentHostingConfiguration": None, "ConsumptionReportingConfiguration": None}
        certs = await session.certificateIds(ps_id)
        for cert_id in certs:
            try:
                cert = await session.certificateGet(ps_id, cert_id)
                if cert is not None:
                    cert_data = await __prettyPrintCertificate(cert, indent=6)
                    ps_data["Certificates"].append({"id": cert_id, "data": cert_data})
                else:
                    ps_data["Certificates"].append({"id": cert_id, "data": "Certificate not yet uploaded"})
            except M1Error as err:
                ps_data["Certificates"].append({"id": cert_id, "error": str(err)})

        chc = await session.contentHostingConfigurationGet(ps_id)
        ps_data["ContentHostingConfiguration"] = chc

        crc = await session.consumptionReportingConfigurationGet(ps_id)
        ps_data["ConsumptionReportingConfiguration"] = crc

        provisioning_sessions.append(ps_data)

    return provisioning_sessions

@app.post("/create_session_chc")
async def create_session_chc():
    try:
        command = [
            "/home/stepski/rt-5gms-application-function/install/bin/m1-session",
            "new-stream",
            "-e", "MyAppId",
            "-a", "MyASPId",
            "-n", "Big Buck Bunny",
            "https://ftp.itec.aau.at/datasets/DASHDataset2014/BigBuckBunny/4sec/",
            "BigBuckBunny_4s_onDemand_2014_05_09.mpd"
        ]
        
        subprocess.run(command, check=True)
        
        return {"status": "success"}
    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    


@app.post("/certificate/{provisioning_session_id}")
async def new_certificate(provisioning_session_id: str, csr: bool = Query(False), extra_domain_names: str = Query(None)):
    config = Configuration()
    try:
        session = await get_session(config)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    if csr:
        try:
            result = await session.certificateNewSigningRequest(provisioning_session_id, extra_domain_names=extra_domain_names)
            if result is None:
                raise HTTPException(status_code=400, detail='Failed to reserve certificate')
            cert_id, csr_data = result
            return {"certificate_id": cert_id, "csr": csr_data}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    try:
        cert_id = await session.createNewCertificate(provisioning_session_id, extra_domain_names=extra_domain_names)
        if cert_id is None:
            raise HTTPException(status_code=400, detail='Failed to create certificate')
        return {"certificate_id": cert_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    

@app.get("/show_certificate/{provisioning_session_id}/{certificate_id}")
async def show_certificate(provisioning_session_id: str, certificate_id: str, raw: Optional[bool] = False):
    session = await get_session(config)
    cert_data = await session.certificateGet(provisioning_session_id, certificate_id)

    if cert_data is None:
        raise HTTPException(status_code=404, detail=f"Unable to get certificate {certificate_id} for provisioning session {provisioning_session_id}")

    if raw:
        return {"raw_data": cert_data}

    pretty_cert_data = await __prettyPrintCertificate(cert_data, indent=2)
    return {"certificate_details": pretty_cert_data}
    

@app.get("/show_protocol/{provisioning_session_id}")
async def show_protocol(provisioning_session_id: str) -> Any:
    session = await get_session(config)
    protocols = await session.provisioningSessionProtocols(provisioning_session_id)
    
    if protocols is None:
        raise HTTPException(status_code=404, detail=f"Failed to fetch the content protocols for provisioning session {provisioning_session_id}")
        
    protocol_data = {"provisioning_session": provisioning_session_id}

    if 'downlinkIngestProtocols' in protocols:
        protocol_data['Downlink'] = [proto["termIdentifier"] for proto in protocols['downlinkIngestProtocols']]
    else:
        protocol_data['Downlink'] = "No downlink capability"

    if 'uplinkEgestProtocols' in protocols:
        protocol_data['Uplink'] = [proto["termIdentifier"] for proto in protocols['uplinkEgestProtocols']]
    else:
        protocol_data['Uplink'] = "No uplink capability"

    if 'geoFencingLocatorTypes' in protocols:
        protocol_data['Geo-fencing'] = protocols['geoFencingLocatorTypes']
    else:
        protocol_data['Geo-fencing'] = "No geo-fencing capability"

    return protocol_data

