/*
License: 5G-MAG Public License (v1.0)
Author: Vuk Stojkovic
Copyright: (C) Fraunhofer FOKUS
For full license terms please see the LICENSE file distributed with this
program. If this file is missing then the license can be retrieved from
https://drive.google.com/file/d/1cinCiA778IErENZ3JN52VFW-1ffHpx7Z/view
*/

import { fetchHtmlForm } from '../utils.js'; 
let operatingUrl='';


export async function setDynamicPolicy(sessionId) {
    const dynamicpoliciesForm = await fetchHtmlForm('src/forms/dynamicPolicies.html');

    const { value: formValues, dismiss } = await Swal.fire({
      title: 'Create Dynamic Policy',
      html: dynamicpoliciesForm,
      customClass: {
        popup: 'policies-swall'
      },
      focusConfirm: false,
      preConfirm: () => {
        const externalReference = document.getElementById('externalReference').value;
        if (!externalReference) {
          Swal.showValidationMessage('External Policy ID is required');
          return false;
        }
        if (document.getElementById('sponStatus').value === "") {
          Swal.showValidationMessage('Please select a valid Sponsor Status');
          return false;
        }
  
        const sstValue = document.getElementById('sst').value;
        const sstNumber = parseInt(sstValue);
        if (sstValue === "" || isNaN(sstNumber) || sstNumber < 0 || sstNumber > 255) {
          Swal.showValidationMessage('SST must be between 0 and 255 inclusive');
          return false;
        }
        const sdValue = document.getElementById('sd').value;
        const hexRegex = /^[0-9A-Fa-f]{6}$/;
        if (!hexRegex.test(sdValue)) {
          Swal.showValidationMessage('SD must be a 6-digit hexadecimal string');
          return false;
        }
        const capitalizeUnit = (unit) => {
          switch (unit.toLowerCase()) {
            case "bps":
              return "bps";
            case "kbps":
              return "Kbps";
            case "mbps":
              return "Mbps";
            case "gbps":
              return "Gbps";
            case "tbps":
              return "Tbps";
            default:
              return unit;
          }
        };
        const policyData = {
          externalReference: externalReference,
          applicationSessionContext: {
            sliceInfo: {
              sst: document.getElementById('sst').value ? parseInt(document.getElementById('sst').value) : undefined,
              sd: document.getElementById('sd').value
            },
            dnn: document.getElementById('dnn').value
          },
          qoSSpecification: {
            qosReference: document.getElementById('qosReference').value,
            maxAuthBtrUl: document.getElementById('maxAuthBtrUl').value ? `${document.getElementById('maxAuthBtrUl').value} ${capitalizeUnit(document.getElementById('maxAuthBtrUlUnit').value)}` : undefined,
            maxAuthBtrDl: document.getElementById('maxAuthBtrDl').value ? `${document.getElementById('maxAuthBtrDl').value} ${capitalizeUnit(document.getElementById('maxAuthBtrDlUnit').value)}` : undefined,
            defPacketLossRateDl: document.getElementById('defPacketLossRateDl').value ? parseInt(document.getElementById('defPacketLossRateDl').value) : undefined,
            defPacketLossRateUl: document.getElementById('defPacketLossRateUl').value ? parseInt(document.getElementById('defPacketLossRateUl').value) : undefined
          },
          chargingSpecification: {
            sponId: document.getElementById('sponId').value,
            sponStatus: document.getElementById('sponStatus').value,
            gpsi: document.getElementById('gpsi').value ? document.getElementById('gpsi').value.split(',').map(item => item.trim()) : []
          },
          state: document.getElementById('state').value,
          stateReason: {
            type: document.getElementById('type').value
          }
        };
        const cleanPolicyData = JSON.parse(JSON.stringify(policyData, (key, value) => (value === "" || value === undefined) ? undefined : value));
        return cleanPolicyData;
      },
      showCancelButton: true,
    });
  
    if (formValues) {
      try {
        const response = await fetch(`${operatingUrl}create_policy_template/${sessionId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formValues)
        });
        if (!response.ok) {
          const errorData = await response.json();
          Swal.fire('Error', errorData.detail || 'An error occurred while creating the policy template.', 'error');
          return;
        }
        const data = await response.json();
        Swal.fire('Success', `Created Dynamic Policies with ID: "${data.policy_template_id}"`, 'success');
      } catch (error) {
        console.error('Error:', error);
        Swal.fire('Error', 'An unexpected error occurred.', 'error');
      }
    }
  }
  
export async function showDynamicPolicies(sessionId) {
    try {
      const response = await fetch(`${operatingUrl}list_policy_template_ids/${sessionId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
  
      if (!response.ok) {
        Swal.fire('Error', 'Failed to retrieve policy templates.', 'error');
        return;
      }
  
      const policyTemplateIds = await response.json();
  
      if (policyTemplateIds.length > 0) {
        const policyTemplateId = policyTemplateIds[0];
        const url = `${operatingUrl}show_policy_template/${sessionId}/${policyTemplateId}`;
        window.open(url, '_blank');
      } else {
        Swal.fire('Error', 'No policy template IDs found for this session.', 'error');
      }
    } catch (error) {
      console.error('Error:', error);
      Swal.fire('Error', 'An unexpected error occurred while retrieving the policy templates.', 'error');
    }
  }
  
export async function deleteDynamicPolicy(sessionId) {
    try {
      const response = await fetch(`${operatingUrl}list_policy_template_ids/${sessionId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
  
      if (!response.ok) {
        Swal.fire('Error', 'Failed to retrieve policy templates.', 'error');
        return;
      }
  
      const policyTemplateIds = await response.json();
      if (policyTemplateIds.length > 0) {
        const policyTemplateId = policyTemplateIds[0];
  
        const result = await Swal.fire({
          title: 'Delete Policy Template?',
          text: `Are you sure you want to delete the policy template with ID: ${policyTemplateId}?`,
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'Yes',
          cancelButtonText: 'No',
        });
  
        if (result.isConfirmed) {
          try {
            const deleteResponse = await fetch(`${operatingUrl}delete_policy_template/${sessionId}/${policyTemplateId}`, {
              method: 'DELETE'
            });
  
            if (deleteResponse.status === 204) {
              Swal.fire({
                title: 'Deleted!',
                text: `The policy template with ID: ${policyTemplateId} has been deleted.`,
                icon: 'success',
                confirmButtonText: 'OK'
              });
            } else {
              const data = await deleteResponse.json();
              Swal.fire('Failed to Delete', data.detail, 'error');
            }
          } catch (error) {
            Swal.fire('Error', 'Network error or server not responding.', 'error');
          }
        }
      } else {
        Swal.fire('Error', 'No policy template IDs found for this session.', 'error');
      }
    } catch (error) {
      console.error('Error:', error);
      Swal.fire('Error', 'An unexpected error occurred while retrieving the policy templates.', 'error');
    }
  }