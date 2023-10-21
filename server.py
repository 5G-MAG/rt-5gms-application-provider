from fastapi import FastAPI, Depends, HTTPException, Path
from typing import Optional, Any
import argparse
from pydantic import BaseModel
from ap_package import append_ap_packages_to_sys_path
append_ap_packages_to_sys_path()
import json

from config import Configuration, get_session
from rt_m1_client.types import ResourceId, ApplicationId, ContentHostingConfiguration


app = FastAPI()
config = Configuration()

class DeleteSessionArgs(BaseModel):
    provisioning_session: Optional[str]
    ingesturl: str
    entrypoint: str

def get_config():
    return Configuration()


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


