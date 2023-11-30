'''
License: 5G-MAG Public License (v1.0)
Author: Vuk Stojkovic, David Waring
Copyright: (C) Fraunhofer FOKUS, British Broadcasting Corporation
For full license terms please see the LICENSE file distributed with this
program. If this file is missing then the license can be retrieved from
https://drive.google.com/file/d/1cinCiA778IErENZ3JN52VFW-1ffHpx7Z/view
'''

import json
import requests
import asyncio
from typing import Optional
from fastapi import FastAPI, Query, Depends, HTTPException, Response
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from utils import lib_to_sys_path
from config import Configuration, get_session

lib_to_sys_path()
from rt_m1_client.types import ResourceId, ApplicationId, ConsumptionReportingConfiguration


app = FastAPI()
config = Configuration()

# Auxiliary function to pass proper configuration as dependency injection parameter
def get_config():
    return Configuration()

# UI page rendering
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")
@app.get("/")
def landing_page():
    return FileResponse("templates/index.html")

"""
Endpoint: Create Provisioning Session
HTTP Method: POST
Path: /create_session
Description: This endpoint will create a empty provisioning session.
"""
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

"""
Endpoint: Delete Provisioning Session
HTTP Method: DELETE
Path: /delete_session/{provisioning_session_id}
Description: This endpoint will remove a provisioning session with all its resources.
"""
@app.delete("/delete_session/{provisioning_session_id}")
async def cmd_delete_session(provisioning_session_id: str, config: Configuration = Depends(get_config)):
    session = await get_session(config)
    result = await session.provisioningSessionDestroy(provisioning_session_id)
    
    if result is None:
        raise HTTPException(status_code=404, detail=f"Provisioning Session {provisioning_session_id} not found")
    
    if not result:
        raise HTTPException(status_code=500, detail=f"Failed to destroy Provisioning Session {provisioning_session_id}")
    
    return JSONResponse(content={"message": f"Provisioning Session {provisioning_session_id} and all its resources were destroyed"}, status_code=200)

"""
Endpoint: Create Content Hosting Configuration from JSON data example
HTTP Method: POST
Path: /set_stream/{provisioning_session_id}
Description: This endpoint will add Content hosting configuration to particular provisioning session, taking JSON example data.
"""
@app.post("/set_stream/{provisioning_session_id}")
async def set_stream(provisioning_session_id: str, config: Configuration = Depends(get_config)):
    session = await get_session(config)
    json_path = "examples/ContentHostingConfiguration_Llama-Drama_pull-ingest.json"
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
            return JSONResponse(content={"message": f"Failed to set hosting for provisioning session {provisioning_session_id}"}, status_code=400)
        
    return JSONResponse(content={"message": f"Hosting set for provisioning session {provisioning_session_id}"}, status_code=200)

# Auxiliary function to get details for a particular provisioning session in async manner
async def get_session_details(session, ps_id):
    details = {"Certificates": {}}
    certs = await session.certificateIds(ps_id)

    for cert_id in certs:
        try:
            cert = await session.certificateGet(ps_id, cert_id)
            details["Certificates"][cert_id] = cert if cert else "Certificate not yet uploaded"
        except Exception as err:
            details["Certificates"][cert_id] = f"Certificate not available: {str(err)}"

    chc = await session.contentHostingConfigurationGet(ps_id)
    details["ContentHostingConfiguration"] = chc if chc else "Not defined"

    crc = await session.consumptionReportingConfigurationGet(ps_id)
    details["ConsumptionReportingConfiguration"] = crc if crc else "Not defined"

    return ps_id, details

"""
Endpoint: Retrieve all provisioning sessions details
HTTP Method: GET
Path: /details
Description: This endpoint will return all details for all active provisioning sessions
"""
@app.get("/details")
async def get_provisioning_session_details():
    session = await get_session(config)
    provisioning_session_ids = await session.provisioningSessionIds()

    tasks = [get_session_details(session, ps_id) for ps_id in provisioning_session_ids]
    details = await asyncio.gather(*tasks)

    return JSONResponse(content={"Details": dict(details)})

"""
Endpoint: Set certificate for provisioning session
HTTP Method: POST
Path: /certificate/{provisioning_session_id}
Description: This endpoint will set a certificate for a particular provisioning session.
"""
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

"""
Endpoint: Show certificate for provisioning session
HTTP Method: GET
Path: /show_certificate/{provisioning_session_id}/{certificate_id}
Description: This endpoint will show a certificate for a particular provisioning session.
"""
@app.get("/show_certificate/{provisioning_session_id}/{certificate_id}")
async def show_certificate(provisioning_session_id: str, certificate_id: str, raw: Optional[bool] = False):

    session = await get_session(config)
    cert_data = await session.certificateGet(provisioning_session_id, certificate_id)

    if cert_data is None:
        raise HTTPException(status_code=404, detail=f"Unable to get certificate {certificate_id} for provisioning session {provisioning_session_id}")

    if raw:
        return {"raw_data": cert_data}

    return {"certificate_details": cert_data}

"""
Endpoint: Show protocol for provisioning session
HTTP Method: GET
Path: /show_protocol/{provisioning_session_id}
Description: This endpoint will show the protocol for a particular provisioning session.
"""
@app.get("/show_protocol/{provisioning_session_id}")
async def show_protocol(provisioning_session_id: str):

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

"""
Endpoint: Set consumption reporting for provisioning session
HTTP Method: POST
Path: /set_consumption/{provisioning_session_id}
Description: This endpoint will set consumption reporting for a particular provisioning session.
"""
@app.post("/set_consumption/{provisioning_session_id}")
async def set_consumption(provisioning_session_id: str, crc: ConsumptionReportingConfiguration):
    session = await get_session(config)
    result = await session.setOrUpdateConsumptionReporting(provisioning_session_id, crc)
    if result:
        return {"message": "Consumption reporting parameters set"}
    raise HTTPException(status_code=400, detail="Failed to set consumption reporting parameters")

"""
Endpoint: Show consumption reporting for provisioning session
HTTP Method: GET
Path: /show_consumption/{provisioning_session_id}
Description: This endpoint will retrieve consumption reporting data for a particular provisioning session.
"""
@app.get("/show_consumption/{provisioning_session_id}")
async def show_consumption(provisioning_session_id: str):
    session = await get_session(config)
    crc = await session.consumptionReportingConfigurationGet(provisioning_session_id)
    if crc is None:
        return {"message": "No consumption reporting configured"}
    return {"Consumption Reporting": crc}

"""
Endpoint: Delete consumption reporting for provisioning session
HTTP Method: DELETE
Path: /del_consumption/{provisioning_session_id}
Description: This endpoint will remove consumption reporting for a particular provisioning session.
"""
@app.delete("/del_consumption/{provisioning_session_id}")
async def del_consumption(provisioning_session_id: str):
    session = await get_session(config)
    result = await session.consumptionReportingConfigurationDelete(provisioning_session_id)
    if result:
        return Response(status_code=204)
    else:
        raise HTTPException(status_code=400, detail="No consumption reporting to remove")

"""
Endpoint: Connection checker
HTTP Method: GET
Path: /connection_checker
Description: This endpoint will check the connection to the M1 interface sending an OPTIONS request.
"""
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://0.0.0.0:8000",
                   "http://127.0.0.1:8000",
                   "http://localhost:8000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
@app.get("/connection_checker")
async def connection_checker():
    url = "http://127.0.0.23:7777/3gpp-m1/v2/provisioning-sessions/"
    try:
        response = requests.options(url)
        if response.status_code == 204:
            return {"status": "STABLE"}
        else:
            return {"status": "UNSTABLE"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
