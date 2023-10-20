from fastapi import FastAPI
from typing import Optional
import argparse
from ap_package import append_ap_packages_to_sys_path
append_ap_packages_to_sys_path()

from config import Configuration, get_session
from rt_m1_client.types import ResourceId, ApplicationId


app = FastAPI()

# Local approach
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


# Remove particular provisioning session

'''
async def cmd_delete_stream(args: argparse.Namespace, config: Configuration) -> int:
    session = await get_session(config)
    if args.provisioning_session is not None:
        ps_id = args.provisioning_session
    else:
        ps_id = await session.provisioningSessionIdByIngestUrl(args.ingesturl, args.entrypoint)
        if ps_id is None:
            print('No such hosting session found')
            return 1
    result = await session.provisioningSessionDestroy(ps_id)
    if result is None:
        print(f'Provisioning Session {ps_id} not found')
        return 1
    if not result:
        print(f'Failed to destroy Provisioning Session {ps_id}')
        return 1
    print(f'Provisioning Session {ps_id} and all its resources were destroyed')
    return 0

'''
