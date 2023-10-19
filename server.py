from fastapi import FastAPI
from typing import Optional
import argparse
from ap_package import append_ap_packages_to_sys_path
append_ap_packages_to_sys_path()

from config import Configuration, get_session
from rt_m1_client.types import ResourceId, ApplicationId


app = FastAPI()

PROVISIONING_SESSION_IDS = []

@app.post("/create_session")
async def new_provisioning_session():

    global PROVISIONING_SESSION_IDS

    args = argparse.Namespace(app_id="MyAppId", asp_id="MyASPId")
    config = Configuration()

    session = await get_session(config)
    app_id = args.app_id or config.get('external_app_id')
    asp_id = args.asp_id or config.get('asp_id')

    provisioning_session_id: Optional[ResourceId] = await session.createDownlinkPullProvisioningSession(ApplicationId(app_id), ApplicationId(asp_id) if asp_id else None)
    
    if provisioning_session_id is None:
        return {"error": "Failed to create a new provisioning session"}
        
    PROVISIONING_SESSION_IDS.append(str(provisioning_session_id))
    return {"message": f"Provisioning session {provisioning_session_id} created"}


@app.get("/list_sessions")
async def list_provisioning_session_ids():
    return '\n'.join(PROVISIONING_SESSION_IDS)
