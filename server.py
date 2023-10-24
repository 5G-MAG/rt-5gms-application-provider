from fastapi import FastAPI, Query, Depends, HTTPException, Response
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from typing import List, Dict, Optional, Any
from pydantic import BaseModel
from utils import append_ap_packages_to_sys_path, __prettyPrintCertificate, __formatX509Name
append_ap_packages_to_sys_path()
import json
import subprocess
from config import Configuration, get_session
from rt_m1_client.types import ResourceId, ApplicationId, ContentHostingConfiguration, ConsumptionReportingConfiguration
from rt_m1_client.exceptions import M1Error


app = FastAPI()

app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

config = Configuration()

@app.get("/")
def landing_page():
    return FileResponse("templates/index.html")


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

class ConsumptionReportingConfiguration(Dict):
    reportingInterval: Optional[int]
    samplePercentage: Optional[float]
    locationReporting: Optional[bool]
    accessReporting: Optional[bool]

def get_config():
    return Configuration()

# Creates new provisioning session
# new-provisioning-session -e MyAppId -a MyASPId
@app.post("/create_session")
async def new_provisioning_session(app_id: Optional[str] = None, asp_id: Optional[str] = None):

    session = await get_session(config)

    app_id = app_id or config.get('external_app_id')
    asp_id = asp_id or config.get('asp_id')

    provisioning_session_id: Optional[ResourceId] = await session.createDownlinkPullProvisioningSession(
        ApplicationId(app_id),
        ApplicationId(asp_id) if asp_id else None)
    
    if provisioning_session_id is None:
        raise HTTPException(status_code=400, detail="Failed to create a new provisioning session")
        
    return {"provisioning_session_id": provisioning_session_id}

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
    
    return(f'Provisioning Session {provisioning_session_id} and all its resources were destroyed')

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
@app.get("/details")
async def get_provisioning_session_details():
    session = await get_session(config)
    details = {}

    
    for ps_id in await session.provisioningSessionIds():
        details[ps_id] = {"Certificates": {}}
        certs = await session.certificateIds(ps_id)

        for cert_id in certs:
            try:
                cert = await session.certificateGet(ps_id, cert_id)
                if cert is not None:
                    details[ps_id]["Certificates"][cert_id] = cert
                else:
                    details[ps_id]["Certificates"][cert_id] = "Certificate not yet uploaded"
            except Exception as err:
                details[ps_id]["Certificates"][cert_id] = f"Certificate not available: {str(err)}"

        chc = await session.contentHostingConfigurationGet(ps_id)
        details[ps_id]["ContentHostingConfiguration"] = chc if chc else "Not defined"

        crc = await session.consumptionReportingConfigurationGet(ps_id)
        details[ps_id]["ConsumptionReportingConfiguration"] = crc if crc else "Not defined"

    return JSONResponse(content={"Details": details})

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


@app.post("/set_consumption/{provisioning_session_id}")
async def set_consumption(provisioning_session_id: str, crc: ConsumptionReportingConfiguration) -> Any:
    session = await get_session(config)
    result = await session.setOrUpdateConsumptionReporting(provisioning_session_id, crc)
    if result:
        return {"message": "Consumption reporting parameters set"}
    raise HTTPException(status_code=400, detail="Failed to set consumption reporting parameters")

@app.get("/show_consumption/{provisioning_session_id}")
async def show_consumption(provisioning_session_id: str) -> Any:
    session = await get_session(config)
    crc = await session.consumptionReportingConfigurationGet(provisioning_session_id)
    if crc is None:
        return {"message": "No consumption reporting configured"}
    return {"Consumption Reporting": crc}

@app.delete("/del_consumption/{provisioning_session_id}")
async def del_consumption(provisioning_session_id: str):
    session = await get_session(config)
    result = await session.consumptionReportingConfigurationDelete(provisioning_session_id)
    if result:
        return Response(status_code=204)
    else:
        raise HTTPException(status_code=400, detail="No consumption reporting to remove")
