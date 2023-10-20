from fastapi import FastAPI, Depends, HTTPException, Path
from typing import Optional, Any
import argparse
from pydantic import BaseModel
from ap_package import append_ap_packages_to_sys_path
append_ap_packages_to_sys_path()

from config import Configuration, get_session
from rt_m1_client.types import ResourceId, ApplicationId


app = FastAPI()
config = Configuration()

class DeleteSessionArgs(BaseModel):
    provisioning_session: Optional[str]
    ingesturl: str
    entrypoint: str

def get_config():
    return Configuration()

# Creates new provisioning session
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
