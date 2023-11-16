'''
License: 5G-MAG Public License (v1.0)
Author: Vuk Stojkovic
Copyright: (C) Fraunhofer FOKUS
For full license terms please see the LICENSE file distributed with this
program. If this file is missing then the license can be retrieved from
https://drive.google.com/file/d/1cinCiA778IErENZ3JN52VFW-1ffHpx7Z/view
'''

import pytest
import httpx
from uuid import UUID

FASTAPI_URL = "http://127.0.0.1:8000"

def is_uuid_valid(uuid_to_test: str, version: int = 4) -> bool:
    try:
        uuid_obj = UUID(uuid_to_test, version=version)
    except ValueError:
        return False
    return str(uuid_obj) == uuid_to_test

@pytest.mark.asyncio
async def test_provisioning_session_lifecycle():

    # One client instance
    async with httpx.AsyncClient() as client:
        
        # Create Provisioning Session
        create_url = f"{FASTAPI_URL}/create_session"
        create_response = await client.post(create_url)
        assert create_response.status_code == 200
        create_response_json = create_response.json()
        assert "provisioning_session_id" in create_response_json
        provisioning_session_id = create_response_json["provisioning_session_id"]
        assert is_uuid_valid(provisioning_session_id)

        # Delete Provisioning Session
        delete_url = f"{FASTAPI_URL}/delete_session/{provisioning_session_id}"
        delete_response = await client.delete(delete_url)
        assert delete_response.status_code == 200
        delete_response_json = delete_response.json()
        expected_message = f"Provisioning Session {provisioning_session_id} and all its resources were destroyed"
        assert delete_response_json.get("message") == expected_message
