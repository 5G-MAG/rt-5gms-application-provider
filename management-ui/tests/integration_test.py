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
import os
from uuid import UUID
from dotenv import load_dotenv

load_dotenv()

FASTAPI_URL = os.getenv("FASTAPI_URL", "http://localhost:8000")

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
        
        # Create provisioning session
        create_url = f"{FASTAPI_URL}/create_session"
        create_response = await client.post(create_url)
        assert create_response.status_code == 200
        create_response_json = create_response.json()
        assert "provisioning_session_id" in create_response_json
        provisioning_session_id = create_response_json["provisioning_session_id"]
        assert is_uuid_valid(provisioning_session_id)

        # Content hosting configuring
        set_stream_url = f"{FASTAPI_URL}/set_stream/{provisioning_session_id}"
        set_stream_response = await client.post(set_stream_url)
        assert set_stream_response.status_code == 200
    
        # Certification
        set_certification_url = f"{FASTAPI_URL}/certificate/{provisioning_session_id}"
        set_certification_response = await client.post(set_certification_url)
        assert set_certification_response.status_code == 200
        set_certification_response_json = set_certification_response.json()
        assert "certificate_id" in set_certification_response_json
        certificate_id = set_certification_response_json["certificate_id"]
        assert is_uuid_valid(certificate_id)

        # Content protocols
        content_protocols = f"{FASTAPI_URL}/show_protocol/{provisioning_session_id}"
        content_protocols_response = await client.get(content_protocols)
        assert content_protocols_response.status_code == 200

        # Consumption reporting
        consumption_data = {
            "reportingInterval": 5.0,
            "samplePercentage": 5.667,
            "locationReporting": True,
            "accessReporting": True
        }

        set_consumption_url = f"{FASTAPI_URL}/set_consumption/{provisioning_session_id}"
        set_consumption_response = await client.post(set_consumption_url, json=consumption_data)
        assert set_consumption_response.status_code == 200

        show_consumption_url = f"{FASTAPI_URL}/show_consumption/{provisioning_session_id}"
        show_consumption_response = await client.get(show_consumption_url)
        assert show_consumption_response.status_code == 200
        show_consumption_response_json = show_consumption_response.json()

        consumption_report = show_consumption_response_json.get("Consumption Reporting", {})
        for key in consumption_data:
            assert consumption_report.get(key) == consumption_data[key], f"Mismatch in {key}"

        del_consumption_url = f"{FASTAPI_URL}/del_consumption/{provisioning_session_id}"
        del_consumption_response = await client.delete(del_consumption_url)
        assert del_consumption_response.status_code == 204

        # Show certificates
        show_certification_url = f"{FASTAPI_URL}/show_certificate/{provisioning_session_id}/{certificate_id}"
        show_certification_response = await client.get(show_certification_url)
        assert show_certification_response.status_code == 200

        # Create Dynamic Policy
        create_policy_url = f"{FASTAPI_URL}/create_policy_template/{provisioning_session_id}"
        create_policy_response = await client.post(create_policy_url, json={"externalReference": "111", "sst":"200"})
        assert create_policy_response.status_code == 200

        # Delete Provisioning Session
        delete_url = f"{FASTAPI_URL}/delete_session/{provisioning_session_id}"
        delete_response = await client.delete(delete_url)
        assert delete_response.status_code == 200
        delete_response_json = delete_response.json()
        expected_message = f"Provisioning Session {provisioning_session_id} and all its resources were destroyed"
        assert delete_response_json.get("message") == expected_message
