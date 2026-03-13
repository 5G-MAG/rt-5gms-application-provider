'''
License: 5G-MAG Public License (v1.0)
Author: Vuk Stojkovic, David Waring, Erik Gaida
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
from dotenv import load_dotenv
from typing import Optional, Dict
from fastapi import FastAPI, Query, Depends, HTTPException, Response, Request
from fastapi.responses import JSONResponse, FileResponse, PlainTextResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from utils import lib_to_sys_path
import traceback
load_dotenv()
lib_to_sys_path()

from rt_m1_client.types import ResourceId, ApplicationId, ConsumptionReportingConfiguration, MetricsReportingConfiguration
from rt_m1_client.configuration import Configuration
from rt_m1_client.session import M1Session
from rt_m1_client.data_store import JSONFileDataStore
from rt_m1_client.exceptions import M1Error
from rt_m1_client import app_configuration

from rt_media_configuration import MediaConfiguration, MediaEntry, MediaDistribution, MediaEntryPoint, MediaMetricsReportingConfiguration, MediaServerCertificate, MediaGeoFencing, MediaConsumptionReportingConfiguration, MediaDynamicPolicy, MediaSession
from rt_media_configuration.media_configuration import DEFAULT_CONFIG

config = Configuration()

OPTIONS_ENDPOINT = os.getenv("OPTIONS_ENDPOINT", "http://" + config.get('m1_address', 'localhost') + ":" + config.get('m1_port',7777) + "/3gpp-m1/v2/provisioning-sessions/")
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://0.0.0.0:8000,http://127.0.0.1:8000,http://localhost:8000").split(',')

app = FastAPI()
_m1_session = None
_media_configuration = None
_media_session = None
media_create_lock = asyncio.Lock()
_media_config = None

def _load_media_config_from_configuration():
    if os.getuid() == 0:
        media_config_path = "/etc/rt-5gms/media.conf"
    else:
        media_config_path = os.path.expanduser("~/.rt-5gms/media.conf")
    app_configuration.addSection('media-configuration', DEFAULT_CONFIG, media_config_path)
    return {
        key: app_configuration.get(key, section = "media-configuration")
        for key in app_configuration.getKeys(section = "media-configuration")
    }


@app.on_event("startup")
async def load_media_config():
    global _media_config
    _media_config = _load_media_config_from_configuration()
    app.mount("/m8_dir", StaticFiles(directory = _media_config.get("root_dir", ""), check_dir=False), name="m8_dir")

@app.get("/show_config")
async def get_m8():
    return _media_config


app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# UI rendering
app.mount("/src", StaticFiles(directory="src"), name="src")
templates = Jinja2Templates(directory="src/templates")
@app.get("/")
def landing_page():
    return FileResponse("src/templates/index.html")

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

@app.get("/fetch_all_sessions")
async def get_all_sessions():
    session = await get_M1Session()
    session_ids = await session.provisioningSessionIds() 
    return {"session_ids": list(session_ids)}


@app.post("/resync")
async def resync():
    media_configuration = await get_media_configuration()
    await media_configuration.synchronise()

    session = await get_M1Session()
    af_ids = list(await session.provisioningSessionIds() or [])
    return {"status": "ok", "session_ids": af_ids}

def _build_session_ui_info(session: MediaSession) -> Dict[str, bool]:
    reporting = session.reporting_configurations
    return {
        "hasContentHostingConfiguration": session.media_entry is not None,
        "hasServerCertificates": bool(session.certificates),
        "hasConsumptionReportingConfiguration": reporting is not None and reporting.consumption is not None,
        "hasPolicyTemplates": bool(session.dynamic_policies),
        "hasMetricsReportingConfiguration": reporting is not None and bool(reporting.metrics),
    }

@app.get("/provisioning_sessions/build_Informations_for_UI")
async def build_Informations_for_UI_all():
    media_configuration = await get_media_configuration()
    informations = {}
    for session in await media_configuration.mediaSessions():
        session_id = session.provisioning_session_id or session.id
        if session_id is None:
            continue
        informations[session_id] = _build_session_ui_info(session)
    return {"sessions": informations}

@app.get("/provisioning_session/{sessionId}/build_Informations_for_UI")
async def build_Informations_for_UI(sessionId: str):
    media_configuration = await get_media_configuration()
    session = await media_configuration.mediaSessionByProvisioningSessionId(sessionId)
    if session is None:
        raise HTTPException(status_code=404, detail="Provisioning session not found")
    return _build_session_ui_info(session)
# Auxiliary function to pass proper configuration as dependency injection parameter
def get_config():
    return Configuration()

async def get_M1Session():
    global _m1_session
    if _m1_session is None:
        data_store_dir = app_configuration.get('data_store')
        data_store = await JSONFileDataStore(data_store_dir) if data_store_dir else None
        _m1_session = await M1Session(
            (app_configuration.get('m1_address', 'localhost'),
            app_configuration.get('m1_port', 7777)),
            data_store,
            app_configuration.get('certificate_signing_class')
        )
    return _m1_session

async def get_media_configuration():
    global _media_configuration
    if _media_configuration is None:
        session = await get_M1Session()
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



async def create_media_session_dependency():
    global _media_session 
    media_configuration = await get_media_configuration()
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
    async with media_create_lock:
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




@app.post("/delete_sessions")
async def delete_sessions(request: Request):
    body = await request.json()
    session_ids = body.get("session_ids", [])

    to_delete = [str(s) for s in dict.fromkeys(session_ids)]
    m1 = await get_M1Session()
    media_configuration = await get_media_configuration()

    deleted = []
    not_found = []
    failed = []

    for psid in to_delete:
        try:
            result = await m1.provisioningSessionDestroy(psid)
            if result is None:
                not_found.append(psid)
                continue
            if not result:
                failed.append(psid)
                continue
            ms = await media_configuration.mediaSessionByProvisioningSessionId(psid)
            if ms is not None:
                try:
                    await media_configuration.removeMediaSession(entry=ms)
                except Exception:
                    pass
            try:
                await media_configuration.unset_data_store_app_distributions(psid)
            except Exception:
                pass
            deleted.append(psid)

        except Exception:
            failed.append(psid)
    try:
        await media_configuration.synchronise()
    except Exception:
        failed.extend(deleted)
        deleted.clear()

    return {
        "deleted": deleted,
        "not_found": not_found,
        "failed": failed,
    }
# =====================================
#   content hosting Congiguration
# =====================================
@app.post("/set_content_hosting_configuration/{provisioning_session_id}")
async def set_content_hosting_configuration(provisioning_session_id: str, request: Request, config = Depends(get_config)):
    try:
        content_hosting_configuration_JSON = await request.json()
        media_configuration = await get_media_configuration()
        media_session = await media_configuration.mediaSessionByProvisioningSessionId(provisioning_session_id)
        if media_session is None:
            raise HTTPException(status_code=404, detail="Provisioning session not found")
        distributions = [
            MediaDistribution(
                domain_name_alias=distribution.get("domainNameAlias"),
                entry_point=MediaEntryPoint(
                    relative_path=distribution.get("entryPoint", {}).get("relativePath"),
                    content_type=distribution.get("entryPoint", {}).get("contentType"),
                    profiles=distribution.get("entryPoint", {}).get("profiles"),
                )
            )
            for distribution in content_hosting_configuration_JSON.get("distributionConfigurations", [])
        ]
        if media_session.media_entry is None:
            media_session.media_entry = MediaEntry(
                name = content_hosting_configuration_JSON.get("name", ""),
                ingest_url_prefix =  content_hosting_configuration_JSON.get("ingestConfiguration", "").get("baseURL", ""),
                protocol = content_hosting_configuration_JSON.get("ingestConfiguration", "").get("protocol", "urn:3gpp:5gms:content-protocol:http-pull-ingest"),
                is_pull = bool(content_hosting_configuration_JSON.get("ingestConfiguration", "").get("pull", True)),
                distributions=distributions,
            )
        else:
            media_entry = media_session.media_entry
            media_entry.name = content_hosting_configuration_JSON.get("name", "")
            media_entry.ingest_url_prefix = content_hosting_configuration_JSON.get("ingestConfiguration", "").get("baseURL", "")
            media_entry.protocol = content_hosting_configuration_JSON.get("ingestConfiguration", "").get("protocol", "urn:3gpp:5gms:content-protocol:http-pull-ingest")
            media_entry.is_pull = bool(content_hosting_configuration_JSON.get("ingestConfiguration", "").get("pull", True))
            media_entry.distributions = distributions

        await media_configuration.synchronise()
        return JSONResponse(
            content={"message": f"Stream configuration saved for provisioning session {provisioning_session_id}"},
            status_code=200,
        )

    except HTTPException:
        raise
    except Exception as e:
        print("error:", e)
        raise HTTPException(status_code=500, detail=str(e))

"""
Endpoint: returns the Content Hosting Configuration
HTTP Method: GET
Path: /get_content_hosting_configuration/{provisioning_session_id}
"""
@app.get("/get_content_hosting_configuration/{provisioning_session_id}")
async def get_content_hosting_configuration(
    provisioning_session_id: str,        
    config = Depends(get_config)):
    try:
        media_configuration = await get_media_configuration()
        await media_configuration.synchronise()
        media_session = await media_configuration.mediaSessionByProvisioningSessionId(provisioning_session_id)
        if media_session is None or media_session.media_entry is None:
            raise HTTPException(status_code=404, detail="No CHC configuration found for this session")
        media_entry = media_session.media_entry
        distribution_configurations = []
        for dist in getattr(media_entry, "distributions", []) or []:
            entry_point_dict = {}
            if dist.entry_point is not None:
                entry_point_dict["relativePath"] = getattr(dist.entry_point, "relative_path", None)
                entry_point_dict["contentType"]  = getattr(dist.entry_point, "content_type", None)
                profiles_val = getattr(dist.entry_point, "profiles", None)
                if profiles_val is not None:
                    entry_point_dict["profiles"] = profiles_val
            distribution_configurations.append({
                "domainNameAlias": getattr(dist, "domain_name_alias", None),
                "entryPoint": entry_point_dict if entry_point_dict else None
            })

        app_distributions_list = []
        for ad in getattr(media_entry, "app_distributions", None) or []:
            ad_entry = {"name": getattr(ad, "name", None)}
            eps = []
            for ep in getattr(ad, "entry_points", None) or []:
                ep_dict = {
                    "relativePath": getattr(ep, "relative_path", None),
                    "contentType": getattr(ep, "content_type", None),
                }
                profiles_val = getattr(ep, "profiles", None)
                if profiles_val is not None:
                    ep_dict["profiles"] = profiles_val
                eps.append(ep_dict)
            if eps:
                ad_entry["entryPoints"] = eps
            app_distributions_list.append(ad_entry)

        result = {
            "name": getattr(media_entry, "name", None),
            "ingestConfiguration": {
                "pull":     getattr(media_entry, "is_pull", None),
                "protocol": getattr(media_entry, "protocol", None),
                "baseURL":  getattr(media_entry, "ingest_url_prefix", None),
            },
            "distributionConfigurations": distribution_configurations
        }
        if app_distributions_list:
            result["appDistributions"] = app_distributions_list
        return JSONResponse(content=result, status_code=200)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching CHC configuration: {str(e)}")

@app.delete("/provisioning_session/{provisioning_session_id}/contenthostingconfiguration/")
async def delete_content_hosting_configuration(provisioning_session_id: str):
    try:
        media_configuration = await get_media_configuration()
        media_session = await media_configuration.mediaSessionByProvisioningSessionId(provisioning_session_id)
        if media_session is None or media_session.media_entry is None:
            raise HTTPException(status_code=404, detail="No CHC configuration found for this session")
        media_session.media_entry = None
        await media_configuration.synchronise()
        return Response(status_code=204)
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error deleting CHC: {str(e)}")

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

    content_hosting_configuration_JSON = await session.contentHostingConfigurationGet(ps_id)
    details["ContentHostingConfiguration"] = content_hosting_configuration_JSON if content_hosting_configuration_JSON else "Not defined"

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
    session = await get_M1Session()
    ps_ids = await session.provisioningSessionIds()
    async def safe(ps_id):
        try:
            return await get_session_details(session, ps_id)
        except Exception as e:
            return ps_id, {
                "Certificates": {},
                "ContentHostingConfiguration": "Not defined",
                "ConsumptionReportingConfiguration": "Not defined",
                "PolicyTemplates": {},
                "MetricsReportingConfigurations": {},
                "_error": str(e),
            }
    pairs = await asyncio.gather(*(safe(ps) for ps in ps_ids))
    return {"Details": dict(pairs)}



@app.post("/certificate/{provisioning_session_id}")
async def new_certificate(provisioning_session_id: str, csr: bool = Query(False), extra_domain_names: Optional[str] = Query(None)):
    media_configuration = await get_media_configuration()
    session = await get_M1Session()
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
    session = await get_M1Session()
    try:
        cert_ids = await session.certificateIds(provisioning_session_id)
        if cert_ids is None:
            raise HTTPException(status_code=404, detail="No certificates found for the provided provisioning session ID")
        return {"certificate_ids": cert_ids}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/show_certificate/{provisioning_session_id}/{certificate_id}")
async def show_certificate(provisioning_session_id: str, certificate_id: str):
    session = await get_M1Session()
    cert = await session.certificateGet(provisioning_session_id, certificate_id)
    if cert is None:
        raise HTTPException(status_code=404, detail="Certificate not found")
    return cert


@app.get("/show_protocol/{provisioning_session_id}")
async def show_protocol(provisioning_session_id: str):
    media_configuration = await get_media_configuration()
    session = await get_M1Session()
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
    session = await get_M1Session()
    media_configuration = await get_media_configuration()
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
    session = await get_M1Session()
    crc = await session.consumptionReportingConfigurationGet(provisioning_session_id)
    if crc is None:
        return {"message": "No consumption reporting configured"}
    return {"Consumption Reporting": crc}


@app.delete("/del_consumption/{provisioning_session_id}")
async def del_consumption(provisioning_session_id: str):
    try:
        media_configuration = await get_media_configuration()
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

# =====================================
#   policy template
# =====================================
@app.post("/create_policy_template/{provisioning_session_id}") 
async def create_policy_template(provisioning_session_id: str, request: Request):
    media_configuration = await get_media_configuration()
    try:
        request_body_dict = await request.json()
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Invalid JSON input: {e}")

    if "externalReference" not in request_body_dict:
        raise HTTPException(status_code=422, detail="externalReference is required")

    ext_ref_str = str(request_body_dict["externalReference"]).strip()
    if not ext_ref_str:
        raise HTTPException(status_code=422, detail="externalReference must be non-empty")

    media_session = await media_configuration.mediaSessionByProvisioningSessionId(provisioning_session_id)
    if media_session is None:
        media_session = await media_configuration.newMediaSession(
            is_downlink=True,
            external_app_id="default_app",
            provisioning_session_id=provisioning_session_id,
        )

    policies = media_session.dynamic_policies or {}
    for _, policy_obj in policies.items():
        if policy_obj.id == ext_ref_str:
            raise HTTPException(status_code=409, detail="External Ref is already used")
    try:
        policy_payload = dict(request_body_dict)
        charging_spec = policy_payload.get("chargingSpecification")
        if isinstance(charging_spec, dict) and "sponStatus" in charging_spec:
            status_str = str(charging_spec.get("sponStatus", ""))
            charging_spec["sponsorEnabled"] = (status_str == "SPONSOR_ENABLED")
            charging_spec.pop("sponStatus", None)
        policy_payload.pop("externalReference", None)
        media_policy = MediaDynamicPolicy.fromJSONObject(policy_payload)
        media_policy.id = ext_ref_str
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(
            status_code=500, 
            detail=f"Error mapping JSON to MediaConfig types: {str(e)}"
        )    
    media_session.addDynamicPolicy(media_policy.id , media_policy)
    await media_configuration.synchronise()    
    return {"status": "created", "policy_template_id": media_policy.policy_template_id}

@app.get("/list_policy_template_ids/{provisioning_session_id}")
async def list_policy_template_ids(provisioning_session_id: str):
    media_configuration = await get_media_configuration()
    await media_configuration.synchronise()
    media_session = await media_configuration.mediaSessionByProvisioningSessionId(provisioning_session_id)
    policy_ids_and_ext_ref = []

    if media_session and media_session.dynamic_policies:
        for policy_id, policy_obj in media_session.dynamic_policies.items():
            ext_ref = policy_obj.id
            policy_ids_and_ext_ref.append((policy_id,ext_ref))
    return policy_ids_and_ext_ref

@app.get("/provisioning_session/{provisioning_session_id}/policy_template/{policy_template_id}")
async def get_policy_template_details(provisioning_session_id: str, policy_template_id: str):
    media_configuration = await get_media_configuration()
    await media_configuration.synchronise()
    
    media_session = await media_configuration.mediaSessionByProvisioningSessionId(provisioning_session_id)
    
    if not media_session or not media_session.dynamic_policies:
        raise HTTPException(status_code=404, detail="Session or Policies not found")

    policy_obj = media_session.dynamic_policies.get(policy_template_id)
    
    if not policy_obj:
        raise HTTPException(status_code=404, detail="Policy Template ID not found")
    response_data = policy_obj.jsonObject()
    return response_data

@app.put("/provisioning_session/{provisioning_session_id}/policy_template/{policy_template_id}")
async def update_policy_template(
    provisioning_session_id: str, 
    policy_template_id: str, 
    request: Request
):
    try:
        request_body_dict = await request.json()
        print("Received Update Data:\n" + json.dumps(request_body_dict, indent=2, sort_keys=True))

    except Exception:
        raise HTTPException(status_code=422, detail="Invalid JSON body")

    ext_ref_raw = request_body_dict.get("externalReference")
    if ext_ref_raw is None:
        raise HTTPException(status_code=422, detail="externalReference is required")
    ext_ref_str = str(ext_ref_raw).strip()
    if not ext_ref_str:
        raise HTTPException(status_code=422, detail="externalReference must be non-empty")
    
    policy_template_id_form_request = request_body_dict.get("policyTemplateId")
    if policy_template_id_form_request is not None and str(policy_template_id_form_request) != policy_template_id:
        raise HTTPException(status_code=422, detail="policyTemplateId does not match path parameter")
    print(policy_template_id_form_request)
    
    media_configuration = await get_media_configuration()
    media_session = await media_configuration.mediaSessionByProvisioningSessionId(provisioning_session_id)
    
    if not media_session or not media_session.dynamic_policies:
        raise HTTPException(status_code=404, detail="Session or Policies not found")

    policy_obj = media_session.dynamic_policies.get(policy_template_id)
    if not policy_obj:
        raise HTTPException(status_code=404, detail="Policy Template ID not found")
    
    policies = media_session.dynamic_policies or {}
    for other_id, other_policy in policies.items():
        print(other_id)
        if other_policy.id == ext_ref_str and other_id != policy_template_id:
            raise HTTPException(status_code=409, detail="External Ref is already used")

    try:
        policy_payload = dict(request_body_dict)
        charging_spec = policy_payload.get("chargingSpecification")
        if isinstance(charging_spec, dict) and "sponStatus" in charging_spec:
            status_str = str(charging_spec.get("sponStatus", ""))
            charging_spec["sponsorEnabled"] = (status_str == "SPONSOR_ENABLED")
            charging_spec.pop("sponStatus", None)
        policy_payload.pop("externalReference", None)
        policy_payload.pop("policyTemplateId", None)
        updated_policy = MediaDynamicPolicy.fromJSONObject(policy_payload)
        updated_policy.id = ext_ref_str
        if updated_policy.policy_template_id is None:
            updated_policy.policy_template_id = policy_obj.policy_template_id or policy_template_id
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Error mapping JSON to MediaConfig types: {str(e)}"
        )

    media_session.addDynamicPolicy(policy_template_id, updated_policy)
    await media_configuration.synchronise()
    return {"status": "updated", "policy_template_id": policy_template_id}


@app.delete("/provisioning_session/{provisioning_session_id}/policy_template/{policy_template_id}")
async def delete_policy_template(provisioning_session_id: str, policy_template_id: str):
    try:
        media_configuration = await get_media_configuration()
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

# ======================
# metrics
# ======================

@app.post("/create_metrics/{provisioning_session_id}")
async def create_metrics(provisioning_session_id: str, request: Request):
    session = await get_M1Session()
    request_body = await request.body()
    media_configuration = await get_media_configuration()
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
    session = await get_M1Session()
    metrics_reporting_configuration: Optional[MetricsReportingConfiguration] = await session.metricsReportingConfigurationGet(provisioning_session_id, metrics_reporting_configuration_id)
    if metrics_reporting_configuration is None:
        raise HTTPException(status_code=404, detail="MetricsReportingConfiguration not found")
    return metrics_reporting_configuration


@app.put("/update_metrics/{provisioning_session_id}/{metrics_reporting_configuration_id}")
async def update_metrics(provisioning_session_id: str, metrics_reporting_configuration_id: str, request: Request):
    try:
        media_configuration = await get_media_configuration()
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
        media_configuration = await get_media_configuration()
        media_session = await media_configuration.mediaSessionByProvisioningSessionId(provisioning_session_id)
        if media_session is None:
            raise HTTPException(status_code=404, detail="Provisioning session not found")

        reporting_configurations = media_session.reporting_configurations
        if reporting_configurations is None or reporting_configurations.metrics is None:
            raise HTTPException(status_code=404, detail="MetricsReportingConfiguration not found")

        metric_to_delete = None
        for metric in reporting_configurations.metrics:
            if metric.metrics_reporting_configuration_id == metrics_reporting_configuration_id:
                metric_to_delete = metric
                break

        if metric_to_delete is None:
            raise HTTPException(status_code=404, detail="MetricsReportingConfiguration not found")

        metrics_removed = media_session.removeMetricsReportingConfiguration(metric_to_delete)
        if not metrics_removed:
            raise HTTPException(status_code=404, detail="MetricsReportingConfiguration not found or could not be deleted")
        await media_configuration.synchronise()
        return Response(status_code=204)
    except HTTPException as e:
        raise e
    except Exception as e:
        traceback.print_exception(e)
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


@app.get("/export_ps_configuration")
async def export_ps_configuration():
    media_configuration = await get_media_configuration()
    return Response(
        content=media_configuration.serialise(pretty=True),
        media_type="application/json"
    )

@app.post("/import_ps_configuration")
async def import_ps_configuration(request: Request):
    try:
        body = await request.json()
        streams = body.get("streams", {})
        app_id = body.get("appId")
        asp_id = body.get("aspId")

        media_configuration = await get_media_configuration()
        m1 = await get_M1Session()

        for psid in list(await m1.provisioningSessionIds()):
            await m1.provisioningSessionDestroy(psid)

        await media_configuration.reset()

        for _ , session_data in streams.items():
            if app_id and "appId" not in session_data:
                session_data["appId"] = app_id
            media_session = MediaSession.fromJSONObject(session_data)
            if asp_id and media_session.asp_id is None:
                media_session.asp_id = asp_id
            await media_configuration.addMediaSession(media_session)

        await media_configuration.synchronise()
        await media_configuration.restoreModel()
        return {"message": "Provisioning session configuration imported successfully"}

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))