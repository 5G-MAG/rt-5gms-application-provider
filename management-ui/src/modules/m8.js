/*
License: 5G-MAG Public License (v1.0)
Author: Vuk Stojkovic
Copyright: (C) Fraunhofer FOKUS
For full license terms please see the LICENSE file distributed with this
program. If this file is missing then the license can be retrieved from
https://drive.google.com/file/d/1cinCiA778IErENZ3JN52VFW-1ffHpx7Z/view
*/

import { fetchHtmlForm } from '../utils.js'; 

export async function generateM8Json() {

    const m8Form = await fetchHtmlForm('src/forms/m8Form.html');

    try {

        const sessionResponse = await fetch('/fetch_all_sessions');
        if (!sessionResponse.ok) {
            Swal.fire('Error', 'Failed to fetch session data', 'error');
            return;
        }

        const { provisioning_session_ids: provisioningSessionIds, media_session_ids: mediaSessionIds } = await sessionResponse.json();
        if (!provisioningSessionIds.length || !mediaSessionIds.length) {
            Swal.fire('Error', 'No available provisioning or media sessions found.', 'error');
            return;
        }

        const provisioning_session_id = provisioningSessionIds[0];
        const media_session_id = mediaSessionIds[0];

        const { isConfirmed } = await Swal.fire({
            title: 'Choose Streaming Services',
            html: m8Form,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Publish',
            preConfirm: () => {
                return {
                    elephantsDream: document.getElementById('elephantsDream').checked,
                    bigBuckBunny: document.getElementById('bigBuckBunny').checked,
                    testcard: document.getElementById('testcard').checked
                };
            }
        });

        if (!isConfirmed) {
            Swal.fire('Cancelled', 'No services were selected.', 'info');
            return;
        }

        const selectedServices = [];

        if (document.getElementById('elephantsDream').checked) {
            selectedServices.push("VoD: Elephant's Dream");
        }
        if (document.getElementById('bigBuckBunny').checked) {
            selectedServices.push('VoD: Big Buck Bunny');
        }
        if (document.getElementById('testcard').checked) {
            selectedServices.push('VoD: Testcard');
        }

        if (selectedServices.length === 0) {
            Swal.fire('Error', 'You must select at least one service.', 'error');
            return;
        }

        const payload = {
            names: selectedServices
        };

        const response = await fetch(`/generate-m8/${provisioning_session_id}/${media_session_id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error('Failed to publish M8 JSON.');
        }

        const result = await response.json();
        Swal.fire('Success', 'Published M8 JSON!', 'success');
    } catch (error) {
        Swal.fire('Error', error.message, 'error');
    }
}
