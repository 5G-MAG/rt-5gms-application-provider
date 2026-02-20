/*
License: 5G-MAG Public License (v1.0)
Author: Vuk Stojkovic
Copyright: (C) Fraunhofer FOKUS
For full license terms please see the LICENSE file distributed with this
program. If this file is missing then the license can be retrieved from
https://drive.google.com/file/d/1cinCiA778IErENZ3JN52VFW-1ffHpx7Z/view
*/

let operatingUrl = '';

export async function createNewCertificate(sessionId) {
    try {
        const response = await fetch(`${operatingUrl}certificate/${sessionId}`, {
            method: 'POST'
        });
        const data = await response.json();
        if (response.ok) {
            Swal.fire({
                title: 'Certificate created successfully!',
                text: `ID: ${data.certificate_id}`,
                icon: 'success',
                confirmButtonText: 'OK'
            });
            document.dispatchEvent(new Event('sessions:reload'));
  
          } else {
            Swal.fire({
                title: 'Error',
                text: data.detail || 'An error occurred',
                icon: 'error',
                confirmButtonText: 'OK'
            });
        }
    } catch (error) {
        Swal.fire({
            title: 'Network Error',
            text: 'Failed to communicate with the server',
            icon: 'error',
            confirmButtonText: 'OK'
        });
      }
  }
    
export async function showCertificateDetails(sessionId) {
    try {
      const response = await fetch(`${operatingUrl}list_certificate_ids/${sessionId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
  
      if (!response.ok) {
        Swal.fire({
          title: 'Error',
          text: 'Certificate might not be activated for this Provisioning Session.',
          icon: 'error',
          confirmButtonText: 'OK'
        });
        return;
      }
  
      const data = await response.json();
      const certificateIds = data.certificate_ids;
  
      if (!certificateIds || certificateIds.length === 0) {
        Swal.fire({
          title: 'No Certificates for session',
          text: 'No certificates found for this Provisioning Session.',
          icon: 'info',
          confirmButtonText: 'OK'
        });
        return;
      }    
  
      const certificateId = certificateIds[0];
      window.open(`${operatingUrl}show_certificate/${sessionId}/${certificateId}`, '_blank');
  
    } catch (error) {
      Swal.fire({
        title: 'Network Error',
        text: 'Failed to communicate with the server.',
        icon: 'error',
        confirmButtonText: 'OK'
      });
    }
  }
  
