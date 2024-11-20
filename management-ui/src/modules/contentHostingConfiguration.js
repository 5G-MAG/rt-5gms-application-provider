/*
License: 5G-MAG Public License (v1.0)
Author: Vuk Stojkovic
Copyright: (C) Fraunhofer FOKUS
For full license terms please see the LICENSE file distributed with this
program. If this file is missing then the license can be retrieved from
https://drive.google.com/file/d/1cinCiA778IErENZ3JN52VFW-1ffHpx7Z/view
*/

let operatingUrl = '';

export async function createChcFromJson(sessionId) {
    const response = await fetch(`${operatingUrl}set_stream/${sessionId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) {
      Swal.fire({
        title: 'Failed to set hosting for the provisioning session.',
        text: '',
        icon: 'error',
        confirmButtonText: 'OK'
      });
      return;
    }  
    const data = await response.json();
    Swal.fire({
      title: data.message,
      text: "",
      icon: 'success',
      confirmButtonText: 'OK'
    });
  }
  