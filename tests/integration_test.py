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
import re

from uuid import UUID

FASTAPI_URL = "http://127.0.0.1:8000"

def is_uuid_valid(uuid_to_test: str, version: int = 4) -> bool:
    try:
        uuid_obj = UUID(uuid_to_test, version=version)
    except ValueError:
        return False
    return str(uuid_obj) == uuid_to_test

# Create provisioning session endpoint
@pytest.mark.asyncio
async def test_create_session():
    
    url = f"{FASTAPI_URL}/create_session"
    async with httpx.AsyncClient() as client:
        response = await client.post(url)
        
    assert response.status_code == 200, f"Expected status code 200, but received {response.status_code}"
    response_json = response.json()

    assert "provisioning_session_id" in response_json, "Key 'provisioning_session_id' not found in response"
    provisioning_session_id = response_json["provisioning_session_id"]

    assert is_uuid_valid(provisioning_session_id), f"Invalid UUID: {provisioning_session_id}"

# 