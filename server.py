from fastapi import FastAPI
from typing import Optional
import argparse
from ap_package import append_ap_packages_to_sys_path
append_ap_packages_to_sys_path()

from config import Configuration, get_session
from rt_m1_client.types import ResourceId, ApplicationId


app = FastAPI()

@app.post("/create_session")
async def new_provisioning_session():

    args = argparse.Namespace(app_id="MyAppId", asp_id="MyASPId")
    config = Configuration()

    session = await get_session(config)
    app_id = args.app_id or config.get('external_app_id')
    asp_id = args.asp_id or config.get('asp_id')

    provisioning_session_id: Optional[ResourceId] = await session.createDownlinkPullProvisioningSession(ApplicationId(app_id), ApplicationId(asp_id) if asp_id else None)
    
    if provisioning_session_id is None:
        return {"error": "Failed to create a new provisioning session"}
        
    return {"message": f"Provisioning session {provisioning_session_id} created"}

