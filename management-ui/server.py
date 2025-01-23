'''
License: 5G-MAG Public License (v1.0)
Author: Vuk Stojkovic, David Waring
Copyright: (C) Fraunhofer FOKUS, British Broadcasting Corporation
For full license terms please see the LICENSE file distributed with this
program. If this file is missing then the license can be retrieved from
https://drive.google.com/file/d/1cinCiA778IErENZ3JN52VFW-1ffHpx7Z/view
'''

import os
import json
import requests
import asyncio
import httpx
import aiofiles
from dotenv import load_dotenv
from typing import Optional
from fastapi import FastAPI, Query, Depends, HTTPException, Response, Request
from fastapi.responses import JSONResponse, FileResponse, PlainTextResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from utils import lib_to_sys_path
from fastapi.encoders import jsonable_encoder


load_dotenv()
lib_to_sys_path()

from rt_m1_client.types import ResourceId, ApplicationId, ConsumptionReportingConfiguration, PolicyTemplate, MetricsReportingConfiguration
from rt_m1_client.configuration import Configuration
from rt_m1_client.session import M1Session
from rt_m1_client.data_store import JSONFileDataStore
from rt_m1_client.exceptions import M1Error
from rt_m1_client import app_configuration

from rt_media_configuration import MediaConfiguration, MediaEntry, MediaDistribution, MediaEntryPoint, MediaAppDistribution, MediaMetricsReportingConfiguration, MediaServerCertificate, MediaGeoFencing, MediaConsumptionReportingConfiguration, MediaDynamicPolicy

config = Configuration()

OPTIONS_ENDPOINT = os.getenv("OPTIONS_ENDPOINT", "http://" + config.get('m1_address', 'localhost') + ":" + config.get('m1_port',7777) + "/3gpp-m1/v2/provisioning-sessions/")
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://0.0.0.0:8000,http://127.0.0.1:8000,http://localhost:8000").split(',')

app = FastAPI()
_m1_session = None
_media_configuration = None
_media_session = None

# Auxiliary function to pass proper configuration as dependency injection parameter
def get_config():
    return Configuration()

async def get_session():
    global _m1_session
    if _m1_session is None:
        data_store_dir = app_configuration.get('data_store')
        data_store = await JSONFileDataStore(data_store_dir) if data_store_dir else None
        _m1_session = await M1Session(
            (app_configuration.get('m1_address', 'localhost'), app_configuration.get('m1_port', 7777)),
            data_store,
            app_configuration.get('certificate_signing_class')
        )
    return _m1_session

async def initialize_media_configuration():
    global _media_configuration
    session = await get_session()
    if _media_configuration is None:
        _media_configuration = await MediaConfiguration(
            persistent_data_store=session.data_store(),
            m1_session=session)
        await _media_configuration.restoreModel()
    return _media_configuration

# Error handling
@app.exception_handler(M1Error)
async def m1_error_handler(request: Request, exc: M1Error):
    if exc.args[2] is not None:
        return JSONResponse(status_code=exc.args[1], content=exc.args[2])
    return PlainTextResponse(status_code=exc.args[1], content=exc.args[0])

# UI rendering
app.mount("/src", StaticFiles(directory="src"), name="src")
templates = Jinja2Templates(directory="src/templates")
@app.get("/")
def landing_page():
    return FileResponse("src/templates/index.html")


@app.post("/create_session")
async def new_provisioning_session(app_id: Optional[str] = None, asp_id: Optional[str] = None):
    session = await get_session()
    app_id = app_id or config.get('external_app_id')
    asp_id = asp_id or config.get('asp_id')

    provisioning_session_id: Optional[ResourceId] = await session.createDownlinkPullProvisioningSession(
        ApplicationId(app_id),
        ApplicationId(asp_id) if asp_id else None)
    
    if provisioning_session_id is None:
        raise HTTPException(status_code=400, detail="Failed to create a new provisioning session")
    
    return {"provisioning_session_id": provisioning_session_id}


async def create_media_session_dependency():
    global _media_session
    global _media_configuration
    
    if _media_session is None:
        media_configuration = await initialize_media_configuration()
        app_id = app_configuration.get('external_app_id')
        asp_id = app_configuration.get('asp_id')

        _media_session = await media_configuration.newMediaSession(
            is_downlink=True,
            external_app_id=app_id,
            asp_id=asp_id
        )
    return _media_session

@app.post("/create_media_session")
async def create_media_session():
    try:
        media_session = await create_media_session_dependency()

        await _media_configuration.synchronise()
        response_data = {
            "media_session_id": media_session.id,
            "provisioning_session_id": media_session.provisioning_session_id
        }
        print(f"Media session created: {response_data}")
        return response_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create media session: {e}")

async def get_media_session():
    if _media_session is None:
        raise HTTPException(status_code=404, detail="Media session not created. Please create a session first.")
    return _media_session


def generate_relative_path(media_entry_name):
    if media_entry_name == "VoD: Elephant's Dream":
        return f"elephants_dream/1/client_manifest-all.mpd"
    elif media_entry_name == "VoD: Big Buck Bunny":
        return f"bbb/2/client_manifest-common_init.mpd"
    elif media_entry_name == "VoD: Testcard":
        return f"testcard/vod/manifests/avc-full.mpd"
    return None

   
@app.get("/fetch_all_sessions")
async def get_all_sessions():
    session = await get_session()
    session_ids = await session.provisioningSessionIds() 
    return {"session_ids": list(session_ids)}

@app.delete("/remove_all_sessions")
async def remove_all_sessions():    
    session = await get_session()
    session_ids = await session.provisioningSessionIds()

    for session_id in session_ids:
        result = await session.provisioningSessionDestroy(session_id)
        if result is None:
            raise HTTPException(status_code=404, detail=f"Provisioning Session {session_id} not found")
        if not result:
            raise HTTPException(status_code=500, detail=f"Failed to remove session {session_id}")
    return {"message": "All provisioning sessions were destroyed"}


@app.delete("/delete_session/{provisioning_session_id}")
async def cmd_delete_session(provisioning_session_id: str, config: Configuration = Depends(get_config)):
    session = await get_session()
    result = await session.provisioningSessionDestroy(provisioning_session_id)
    
    if result is None:
        raise HTTPException(status_code=404, detail=f"Provisioning Session {provisioning_session_id} not found")
    
    if not result:
        raise HTTPException(status_code=500, detail=f"Failed to destroy Provisioning Session {provisioning_session_id}")
    
    return JSONResponse(content={"message": f"Provisioning Session {provisioning_session_id} and all its resources were destroyed"}, status_code=200)


@app.post("/set_stream/{provisioning_session_id}")
async def set_stream(provisioning_session_id: str, config: Configuration = Depends(get_config)):
    try:

        media_configuration = await initialize_media_configuration()
        media_session = await media_configuration.mediaSessionByProvisioningSessionId(provisioning_session_id)

        if media_session is None:
            raise HTTPException(status_code=404, detail="Provisioning session not found")

        json_path = "examples/ContentHostingConfiguration_Llama-Drama_pull-ingest.json"
        with open(json_path, 'r') as f:
            chc = json.load(f)

        if media_session.media_entry is None:
            media_session.media_entry = MediaEntry(
                name="Default Media Entry",
                ingest_url_prefix=chc.get("ingestURL", "http://example.com/ingest"),
                is_pull=True,
                distributions=[
                    MediaDistribution(
                        domain_name_alias=dc.get("domainNameAlias", "default-alias.example.com")
                    ) for dc in chc.get("distributionConfigurations", [])
                ]
            )
        else:
            media_session.media_entry.ingest_url_prefix = chc.get("ingestURL", media_session.media_entry.ingest_url_prefix)
            media_session.media_entry.is_pull = chc.get("ingestMode", "pull") == "pull"
            media_session.media_entry.distributions = [
                MediaDistribution(
                    domain_name_alias=dc.get("domainNameAlias", "default-alias.example.com")
                ) for dc in chc.get("distributionConfigurations", [])
            ]

        for dc in chc.get("distributionConfigurations", []):
            entry_points = [
                MediaEntryPoint(
                    relative_path=ep.get("relativePath", "/default-path"),
                    content_type=ep.get("contentType", "application/dash+xml"),
                    profiles=ep.get("profiles", ["urn:mpeg:dash:profile:isoff-live:2011"])
                ) for ep in dc.get("entryPoints", []) if ep.get("relativePath")
            ]

            if entry_points:
                app_distribution = MediaAppDistribution(
                    name=dc.get("name", "Unnamed Distribution"),
                    entry_points=entry_points
                )
                media_session.media_entry.addAppDistribution(app_distribution)

        await media_configuration.synchronise()

        return JSONResponse(
            content={"message": f"Stream configuration set for provisioning session {provisioning_session_id}"},
            status_code=200
        )

    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error setting stream: {str(e)}")


"""
Endpoint: Retrieve all provisioning sessions details
HTTP Method: GET
Path: /details
"""
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

    pt_ids = await session.policyTemplateIds(ps_id)
    details["PolicyTemplates"] = {}
    for pt_id in pt_ids:
        pt = await session.policyTemplateGet(ps_id, pt_id)
        details["PolicyTemplates"][pt_id] = pt if pt else "PolicyTemplate not found"

    mrc_ids = await session.metricsReportingConfigurationIds(ps_id)
    details["MetricsReportingConfigurations"] = {}
    for mrc_id in mrc_ids:
        mrc = await session.metricsReportingConfigurationGet(ps_id, mrc_id)
        details["MetricsReportingConfigurations"][mrc_id] = mrc if mrc else "MetricsReportingConfiguration not found"

    return ps_id, details

@app.get("/details")
async def get_provisioning_session_details():
    session = await get_session()
    provisioning_session_ids = await session.provisioningSessionIds()
    tasks = [get_session_details(session, ps_id) for ps_id in provisioning_session_ids]
    details = await asyncio.gather(*tasks)
    return JSONResponse(content={"Details": dict(details)})


@app.post("/certificate/{provisioning_session_id}")
async def new_certificate(provisioning_session_id: str, csr: bool = Query(False), extra_domain_names: Optional[str] = Query(None)):
    media_configuration = await initialize_media_configuration()
    session = await get_session()
    cert_id = None
    domain_names = extra_domain_names.split(",") if extra_domain_names else None

    try:
        if csr:
            result = await session.certificateNewSigningRequest(
                provisioning_session_id, extra_domain_names=domain_names
            )
            if result is None:
                raise HTTPException(status_code=400, detail="Failed to reserve certificate")
            cert_id, csr_data = result
            
            media_server_certificate = MediaServerCertificate(
                local_ident=cert_id,
                domain_names=domain_names
            )
            media_session = await media_configuration.mediaSessionByProvisioningSessionId(provisioning_session_id)
            if media_session is None:
                media_session = await media_configuration.newMediaSession(
                    is_downlink=True,
                    external_app_id="default_app",
                    provisioning_session_id=provisioning_session_id
                )
            media_session.addCertificate(media_server_certificate)
            
            return {"certificate_id": cert_id, "csr": csr_data}

        cert_id = await session.createNewCertificate(
            provisioning_session_id, extra_domain_names=domain_names
        )
        if cert_id is None:
            raise HTTPException(status_code=400, detail="Failed to create certificate")

        media_server_certificate = MediaServerCertificate(
            local_ident=cert_id,
            certificate_id=cert_id,
            domain_names=domain_names
        )
        media_session = await media_configuration.mediaSessionByProvisioningSessionId(provisioning_session_id)
        if media_session is None:
            media_session = await media_configuration.newMediaSession(
                is_downlink=True,
                external_app_id="default_app",
                provisioning_session_id=provisioning_session_id
            )
        media_session.addCertificate(media_server_certificate)
        
        await media_configuration.synchronise()
        return {"certificate_id": cert_id}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))    

@app.get("/list_certificate_ids/{provisioning_session_id}")
async def list_certificate_ids(provisioning_session_id: str):
    config = Configuration()
    session = await get_session()
    try:
        cert_ids = await session.certificateIds(provisioning_session_id)
        if cert_ids is None:
            raise HTTPException(status_code=404, detail="No certificates found for the provided provisioning session ID")
        return {"certificate_ids": cert_ids}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/show_certificate/{provisioning_session_id}/{certificate_id}")
async def show_certificate(provisioning_session_id: str, certificate_id: str):
    session = await get_session(config)
    cert = await session.certificateGet(provisioning_session_id, certificate_id)
    if cert is None:
        raise HTTPException(status_code=404, detail="Certificate not found")
    return cert


@app.get("/show_protocol/{provisioning_session_id}")
async def show_protocol(provisioning_session_id: str):
    media_configuration = await initialize_media_configuration()
    session = await get_session()
    try:
        protocols = await session.provisioningSessionProtocols(provisioning_session_id)
        if protocols is None:
            raise HTTPException(
                status_code=404,
                detail=f"Failed to fetch the content protocols for provisioning session {provisioning_session_id}"
            )
        protocol_data = {"provisioning_session": provisioning_session_id}
        protocol_data["Downlink"] = [
            proto["termIdentifier"] for proto in protocols.get("downlinkIngestProtocols", [])
        ] or "No downlink capability"
        protocol_data["Uplink"] = [
            proto["termIdentifier"] for proto in protocols.get("uplinkEgestProtocols", [])
        ] or "No uplink capability"
        geo_fencing_data = protocols.get("geoFencingLocatorTypes")
        if geo_fencing_data:
            try:
                media_geo_fencing_objects = [
                    await MediaGeoFencing.from3GPPObject({"locatorType": key, "locators": locators})
                    for key, locators in geo_fencing_data.items()
                ]
                protocol_data["Geo-fencing"] = [
                    geo_fencing.serialise(pretty=True) for geo_fencing in media_geo_fencing_objects
                ]
            except Exception as e:
                raise HTTPException(
                    status_code=500,
                    detail=f"Error converting geo-fencing data to MediaGeoFencing: {str(e)}"
                )
        else:
            protocol_data["Geo-fencing"] = "No geo-fencing capability"
        await media_configuration.synchronise()
        return protocol_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")


@app.post("/set_consumption/{provisioning_session_id}")
async def set_consumption(provisioning_session_id: str, crc: ConsumptionReportingConfiguration):
    session = await get_session()
    media_configuration = await initialize_media_configuration()
    try:
        media_crc = await MediaConsumptionReportingConfiguration.from3GPPObject(crc)
        media_session = await media_configuration.mediaSessionByProvisioningSessionId(provisioning_session_id)
        if media_session is None:
            media_session = await media_configuration.newMediaSession(
                is_downlink=True,
                external_app_id="default_app",
                provisioning_session_id=provisioning_session_id
            )
        media_session.setConsumptionReportingConfiguration(media_crc)
        await media_configuration.synchronise()
        return {"message": "Consumption reporting parameters set successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error setting consumption reporting parameters: {str(e)}")


@app.get("/show_consumption/{provisioning_session_id}")
async def show_consumption(provisioning_session_id: str):
    session = await get_session()
    crc = await session.consumptionReportingConfigurationGet(provisioning_session_id)
    if crc is None:
        return {"message": "No consumption reporting configured"}
    return {"Consumption Reporting": crc}


@app.delete("/del_consumption/{provisioning_session_id}")
async def del_consumption(provisioning_session_id: str):
    try:
        media_configuration = await initialize_media_configuration()
        media_session = await media_configuration.mediaSessionByProvisioningSessionId(provisioning_session_id)
        if media_session is None:
            raise HTTPException(status_code=404, detail="Provisioning session not found")
        media_session.unsetConsumptionReportingConfiguration()
        await media_configuration.synchronise()
        return Response(status_code=204) 
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"An error occurred while deleting consumption reporting: {str(e)}"
        )

@app.post("/create_policy_template/{provisioning_session_id}")
async def create_policy_template(provisioning_session_id: str, request: Request):
    session = await get_session()
    media_configuration = await initialize_media_configuration()
    try:
        request_body = await request.json()
        policy_template = PolicyTemplate.fromJSON(request_body)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Error processing policy template data: {str(e)}")
    try:
        media_policy = MediaDynamicPolicy.fromJSONObject(policy_template.toJSONObject())
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error converting PolicyTemplate to MediaDynamicPolicy: {str(e)}"
        )
    media_session = await media_configuration.mediaSessionByProvisioningSessionId(provisioning_session_id)
    if media_session is None:
        media_session = await media_configuration.newMediaSession(
            is_downlink=True,
            external_app_id="default_app",
            provisioning_session_id=provisioning_session_id
        )
    media_session.addDynamicPolicy(media_policy.policy_template_id, media_policy)
    await media_configuration.synchronise()
    return {"policy_template_id": media_policy.policy_template_id}


@app.get("/list_policy_template_ids/{provisioning_session_id}")
async def list_policy_template_ids(provisioning_session_id: str):
    provisionig_session_url = f"{OPTIONS_ENDPOINT}/{provisioning_session_id}"
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(provisionig_session_url)
            response.raise_for_status() 
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=f"Error when listing policy template IDs: {str(e)}")
    except httpx.RequestError as e:
        raise HTTPException(status_code=500, detail="Connection error to M1 interface")
    all_data = response.json()
    policy_template_ids = all_data.get("policyTemplateIds")
    if not policy_template_ids:
        raise HTTPException(status_code=404, detail="No PolicyTemplate found")
    return policy_template_ids    


@app.get("/show_policy_template/{provisioning_session_id}/{policy_template_id}")
async def show_policy_template(provisioning_session_id: str, policy_template_id: str):
    session = await get_session(config)    
    policy_template: Optional[PolicyTemplate] = await session.policyTemplateGet(provisioning_session_id, policy_template_id)
    if policy_template is None:
        raise HTTPException(status_code=404, detail="PolicyTemplate not found")
    return policy_template


@app.delete("/delete_policy_template/{provisioning_session_id}/{policy_template_id}")
async def delete_policy_template(provisioning_session_id: str, policy_template_id: str):
    try:
        media_configuration = await initialize_media_configuration()
        media_session = await media_configuration.mediaSessionByProvisioningSessionId(provisioning_session_id)
        if media_session is None:
            raise HTTPException(status_code=404, detail="Provisioning session not found")
        policy_removed = media_session.removeDynamicPolicy(policy_template_id)
        if not policy_removed:
            raise HTTPException(status_code=404, detail="PolicyTemplate not found or could not be deleted")
        await media_configuration.synchronise()
        return Response(status_code=204)
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"An error occurred while deleting the policy template: {str(e)}"
        )
    
@app.post("/create_metrics/{provisioning_session_id}")
async def create_metrics(provisioning_session_id: str, request: Request):
    session = await get_session()
    request_body = await request.body()
    media_configuration = await initialize_media_configuration()
    try:
        metrics_reporting_configuration = MetricsReportingConfiguration.fromJSON(request_body)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Error processing metrics reporting data: {str(e)}")
    try:
        media_metrics_reporting_configuration = await MediaMetricsReportingConfiguration.from3GPPObject(
            metrics_reporting_configuration
        )
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Error converting to MediaMetricsReportingConfiguration: {str(e)}"
        )
    media_session = await media_configuration.mediaSessionByProvisioningSessionId(provisioning_session_id)
    if media_session is None:
        media_session = await media_configuration.newMediaSession(
            is_downlink=True, 
            external_app_id="default_app", 
            provisioning_session_id=provisioning_session_id
        )
    media_session.addMetricsReportingConfiguration(media_metrics_reporting_configuration)
    await media_configuration.synchronise()
    return {
        "metrics_reporting_configuration_id":media_metrics_reporting_configuration.metrics_reporting_configuration_id,
        "media_metrics_reporting_configuration": media_metrics_reporting_configuration.serialise(pretty=True),
    }

@app.get("/show_metrics/{provisioning_session_id}/{metrics_reporting_configuration_id}")
async def show_metrics(provisioning_session_id: str, metrics_reporting_configuration_id: str):    
    session = await get_session()
    metrics_reporting_configuration: Optional[MetricsReportingConfiguration] = await session.metricsReportingConfigurationGet(provisioning_session_id, metrics_reporting_configuration_id)
    if metrics_reporting_configuration is None:
        raise HTTPException(status_code=404, detail="MetricsReportingConfiguration not found")
    return metrics_reporting_configuration
  

@app.put("/update_metrics/{provisioning_session_id}/{metrics_reporting_configuration_id}")
async def update_metrics(provisioning_session_id: str, metrics_reporting_configuration_id: str, request: Request):
    try:
        media_configuration = await initialize_media_configuration()
        media_session = await media_configuration.mediaSessionByProvisioningSessionId(provisioning_session_id)
        if media_session is None:
            raise HTTPException(status_code=404, detail="Provisioning session not found")
        request_body = await request.body()
        try:
            metrics_reporting_configuration = MetricsReportingConfiguration.fromJSON(request_body)
        except Exception as e:
            raise HTTPException(status_code=422, detail=f"Error processing metrics reporting data: {str(e)}")
        try:
            media_metrics_reporting_configuration = await MediaMetricsReportingConfiguration.from3GPPObject(
                metrics_reporting_configuration
            )
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Error converting to MediaMetricsReportingConfiguration: {str(e)}"
            )
        for metric in media_session.reporting_configurations.metrics or []:
            if metric.metrics_reporting_configuration_id == metrics_reporting_configuration_id:
                media_session.reporting_configurations.metrics.remove(metric)
                break
        else:
            raise HTTPException(
                status_code=404,
                detail="MetricsReportingConfiguration not found"
            )
        media_session.addMetricsReportingConfiguration(media_metrics_reporting_configuration)
        await media_configuration.synchronise()
        return Response(status_code=200)
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"An error occurred while updating metrics reporting configuration: {str(e)}"
        )
    

@app.delete("/delete_metrics/{provisioning_session_id}/{metrics_reporting_configuration_id}")
async def delete_metrics(provisioning_session_id: str, metrics_reporting_configuration_id: str):
    try:
        media_configuration = await initialize_media_configuration()
        media_session = await media_configuration.mediaSessionByProvisioningSessionId(provisioning_session_id)
        if media_session is None:
            raise HTTPException(status_code=404, detail="Provisioning session not found")
        metrics_removed = media_session.removeMetricsReportingConfiguration(metrics_reporting_configuration_id)
        if not metrics_removed:
            raise HTTPException(status_code=404, detail="MetricsReportingConfiguration not found or could not be deleted")
        await media_configuration.synchronise()
        return Response(status_code=204)
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"An error occurred while deleting metrics reporting configuration: {str(e)}"
        )

@app.get("/list_metrics_ids/{provisioning_session_id}")
async def list_metrics_ids(provisioning_session_id: str):
    provisionig_session_url = f"{OPTIONS_ENDPOINT}/{provisioning_session_id}"
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(provisionig_session_url)
            response.raise_for_status() 
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=f"Error when listing metrics IDs: {str(e)}")
    except httpx.RequestError as e:
        raise HTTPException(status_code=500, detail="Connection error to M1 interface")
    all_data = response.json()
    metrics_ids = all_data.get("metricsReportingConfigurationIds")
    if not metrics_ids:
        raise HTTPException(status_code=404, detail="No MetricsReportingConfiguration found")
    return metrics_ids

@app.post("/simple_commit/{provisioning_session_id}")
async def simple_commit(provisioning_session_id):
    try:
        media_configuration = await initialize_media_configuration()
        print("Media configuration initialized.")
        media_session = await media_configuration.mediaSessionByProvisioningSessionId(provisioning_session_id)
        print(f"Media session retrieved: ID={media_session.id}")
        entries = [
            {"name": "VoD: Elephant's Dream", "profiles": ["urn:mpeg:dash:profile:isoff-live:2011"]},
            {"name": "VoD: Big Buck Bunny", "profiles": ["urn:mpeg:dash:profile:isoff-live:2011"]},
            {"name": "VoD: Testcard", "profiles": ["urn:mpeg:dash:profile:isoff-live:2011"]},
        ]
        distribution = MediaDistribution(
            domain_name_alias="alias.example.com",
        )
        media_entry = MediaEntry(
            name="Generic VoD stream",
            ingest_url_prefix="http://example.com/ingest",
            is_pull=True,
            distributions=[distribution]
        )
        media_session.media_entry = media_entry
        for entry in entries:
            relative_path = generate_relative_path(entry["name"])
            if not relative_path:
                continue
            entry_point = MediaEntryPoint(
                relative_path=relative_path,
                content_type="application/dash+xml",
                profiles=entry["profiles"]
            )
            app_distribution = MediaAppDistribution(
                name=entry["name"],
                entry_points=[entry_point]
            )
            media_entry.addAppDistribution(app_distribution)

        await media_configuration.synchronise()
        m8_output_dir = app_configuration.get("m8_output_dir", "/home/stepski/Desktop/m8")
        m8_file_path = f"{m8_output_dir}/m8.json"
        print(f"Expected M8 JSON file path: {m8_file_path}")

        async with aiofiles.open(m8_file_path, mode='r') as m8_file:
            m8_content = await m8_file.read()

        return {
            "status": "success",
            "message": "Configuration committed and M8 generated successfully",
            "m8_content": json.loads(m8_content),
        }
    except Exception as e:
        print(f"Error occurred during execution: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"An error occurred during simple commit: {str(e)}"
        )

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

"""
Endpoint: Connection checker
HTTP Method: GET
Path: /connection_checker
Description: This endpoint will check the connection to the M1 interface sending an OPTIONS request.
"""
@app.get("/connection_checker")
async def connection_checker():
    try:
        response = requests.options(OPTIONS_ENDPOINT)
        if response.status_code == 204:
            return {"status": "STABLE"}
        else:
            return {"status": "UNSTABLE"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/policy_template_checker/{provisioning_session_id}")
async def policy_template_checker(provisioning_session_id: str):
    policy_templates_url = f"{OPTIONS_ENDPOINT}/{provisioning_session_id}/policy-templates"
    try:
        response = requests.options(policy_templates_url)
        if response.status_code == 204 and 'POST' in response.headers['allow']:
            return {"enabled": True}
        return {"enabled": False}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
