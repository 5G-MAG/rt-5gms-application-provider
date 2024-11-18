/*
License: 5G-MAG Public License (v1.0)
Author: Vuk Stojkovic
Copyright: (C) Fraunhofer FOKUS
For full license terms please see the LICENSE file distributed with this
program. If this file is missing then the license can be retrieved from
https://drive.google.com/file/d/1cinCiA778IErENZ3JN52VFW-1ffHpx7Z/view
*/

import { createChcFromJson } from "./modules/contentHostingConfiguration.js";
import { createNewCertificate, showCertificateDetails } from "./modules/serverCertificates.js";
import { showProtocols } from "./modules/protocols.js";
import { setConsumptionReporting,showConsumptionReporting, deleteConsumptionReporting } from "./modules/consumptionReporting.js";
import { createMetricsJson, showMetricsReporting, confirmMetricsDeletion, deleteMetricsConfiguration } from "./modules/metricsReporting.js";
import { setDynamicPolicy, showDynamicPolicies, deleteDynamicPolicy } from "./modules/dynamicPolicies.js";
import { generateM8Json } from "./modules/m8.js";

//let operatingUrl = '';
let operatingUrl = 'http://127.0.0.1:8000/'
let isConnectionLost = false;

window.createNewSession = createNewSession;
window.deleteProvisioningSession = deleteProvisioningSession;
window.getProvisioningSessionDetails = getProvisioningSessionDetails;
window.createChcFromJson = createChcFromJson;
window.createNewCertificate = createNewCertificate;
window.showProtocols = showProtocols;
window.showCertificateDetails = showCertificateDetails;
window.setConsumptionReporting = setConsumptionReporting;
window.showConsumptionReporting = showConsumptionReporting;
window.deleteConsumptionReporting = deleteConsumptionReporting;
window.createMetricsJson = createMetricsJson;
window.showMetricsReporting = showMetricsReporting;
window.confirmMetricsDeletion = confirmMetricsDeletion;
window.deleteMetricsConfiguration = deleteMetricsConfiguration;
window.setDynamicPolicy = setDynamicPolicy;
window.showDynamicPolicies = showDynamicPolicies;
window.deleteDynamicPolicy = deleteDynamicPolicy;
window.generateM8Json = generateM8Json;

document.addEventListener('DOMContentLoaded', async () => {
  await loadAllSessions();
});

function checkAFstatus() {
  fetch(`${operatingUrl}connection_checker`)
    .then(response => {
      if (!response.ok && !isConnectionLost) {
        document.getElementById('AFStatus').innerText = 'Connection with Application Function: ❌';
        clearTable();
        removeAllSessionsFromWebServer();
        showConnectionLostAlert();
        isConnectionLost = true;
      } else if (response.ok) {
        document.getElementById('AFStatus').innerText = 'Connection with Application Function: ✅';
        isConnectionLost = false;
      }
    })
    .catch(error => {
      console.error('Error:', error);
      if (!isConnectionLost) {
        document.getElementById('AFStatus').innerText = 'Connection with AF interrupted.';
        clearTable();
        removeAllSessionsFromWebServer();
        showConnectionLostAlert();
        isConnectionLost = true;
      }
    });
}

function showConnectionLostAlert() {
  Swal.fire({
    title: 'Lost connection with Application Function!',
    text: 'All session data has been purged.',
    icon: 'warning',
    confirmButtonText: 'OK'
  });
}

function removeAllSessionsFromWebServer() {
  fetch(`${operatingUrl}remove_all_sessions`, {
    method: 'DELETE'
  })
  .then(response => {
    if (!response.ok) {
      console.error('Failed to purge all sessions from the backend server.');
    }
  })
  .catch(error => {
    console.error('Error clearing sessions from the backend server:', error);
  });
}

function policyTemplateOptionsCheck(session_id, fn) {
  fetch(`${operatingUrl}policy_template_checker/${session_id}`).then(response => (response.ok && response.json()['enabled']), response => false).then(fn);
}

function addSessionToTable(sessionId) {
  const m1Table = document.getElementById('m1_table');
  let row = m1Table.insertRow(-1);

  let cell1 = row.insertCell(0); // Provisioning Session ID
  let cell2 = row.insertCell(1); // Content Hosting Configuration
  let cell3 = row.insertCell(2); // Certification (Create, Show)
  let cell4 = row.insertCell(3); // Show Protocols
  let cell5 = row.insertCell(4); // Consumption Reporting (Set, Show, Delete)
  let cell6 = row.insertCell(5); // Dynamic Policies
  let cell7 = row.insertCell(6); // Metrics Reporting Configuration
  let cell8 = row.insertCell(7); // Session Details
  let cell9 = row.insertCell(8); // Delete session
  
  cell1.innerHTML = sessionId;

  cell2.innerHTML = `<button onclick="createChcFromJson('${sessionId}')" class="btn btn-primary table-button">Create</button>`;

  cell3.innerHTML = `<button onclick="createNewCertificate('${sessionId}')" class="btn btn-primary table-button">Create</button>
                     <button onclick="showCertificateDetails('${sessionId}')" class="btn btn-secondary table-button">Show</button>`;
  
  cell4.innerHTML = `<button onclick="showProtocols('${sessionId}')" class="btn btn-secondary table-button">Show</button>`;

  cell5.innerHTML = `<button onclick="setConsumptionReporting('${sessionId}')" class="btn btn-primary table-button">Set</button>
                      <button onclick="showConsumptionReporting('${sessionId}')" class="btn btn-secondary table-button">Show</button>
                      <button onclick="deleteConsumptionReporting('${sessionId}')" class="btn btn-danger table-button">Delete</button>`;

  cell6.innerHTML = `
                      <p class="policy-message"><img src="src/static/images/loading.gif" alt="loading..." /> Checking feature availability...</p>
                      <a href="#" onclick="setDynamicPolicy('${sessionId}')" class="dynamic-policy-link font-medium text-blue-600 dark:text-blue-500 hover:underline disabled-link">Set</a><br>
                      <a href="#" onclick="showDynamicPolicies('${sessionId}')" class="dynamic-policy-link font-medium text-green-600 dark:text-green-500 hover:underline ml-4 disabled-link">Show</a><br>
                      <a href="#" onclick="deleteDynamicPolicy('${sessionId}')" class="dynamic-policy-link font-medium text-red-600 dark:text-red-500 hover:underline ml-4 disabled-link">Delete</a>
                    `;
                    
                    policyTemplateOptionsCheck(sessionId, enabled => {
                      const links = cell6.getElementsByClassName('dynamic-policy-link');
                      for (let link of links) {
                        link.classList.remove('disabled-link');
                        if (!enabled) {
                          link.classList.add('disabled-link');
                          link.style.pointerEvents = 'none';
                          link.style.color = 'white'; 
                        } else {
                          link.style.pointerEvents = 'auto';
                          link.style.color = ''; 
                        }
                      }                   
                      const msg = cell6.getElementsByClassName('policy-message')[0];
                      msg.style.display = 'none'; 
                    });

  cell7.innerHTML = `<button onclick="createMetricsJson('${sessionId}')" class="btn btn-primary table-button">Create</button>
                    <button onclick="showMetricsReporting('${sessionId}')" class="btn btn-secondary table-button">Show</button>
                    <button onclick="deleteMetricsConfiguration('${sessionId}')" class="btn btn-danger table-button">Delete</button>`;
                    
  cell8.innerHTML = `<button onclick="getProvisioningSessionDetails()" class="btn btn-secondary table-button">Details</button>`;

  cell9.innerHTML = `<button onclick="deleteProvisioningSession('${sessionId}')" class="btn btn-danger table-button">Delete</button>`;
}

async function loadAllSessions() {
  try {
      const response = await fetch(`${operatingUrl}fetch_all_sessions`, {
          method: 'GET',
          headers: {
              'Content-Type': 'application/json'
          }
      });

      if (!response.ok) {
          Swal.fire({
              title: 'Failed to load data!',
              text: 'Check connection with the 5GMS Application Function.',
              icon: 'error',
              confirmButtonText: 'OK'
          });
          return;
      }

      const data = await response.json();
      const sessionIds = data.session_ids;

      sessionIds.forEach(sessionId => {
          addSessionToTable(sessionId);
      });

  } catch (error) {
      //console.error('Error:', error);
      Swal.fire({
          title: 'Error',
          text: 'An unexpected error occurred while loading the sessions.',
          icon: 'error',
          confirmButtonText: 'OK'
      });
  }
};

async function createNewSession(){
  try {
    const response = await fetch(`${operatingUrl}create_session`, { method: 'POST' });
    if (!response.ok) {
      Swal.fire({
        title: 'Failed to create new provisioning session!',
        text: 'Please, make sure that Application Function is running!',
        icon: 'error',
        confirmButtonText: 'OK'
      });
      return;
    }
    const data = await response.json();
    Swal.fire({
      title: 'Created Provisioning Session',
      text: `ID: ${data.provisioning_session_id}`,
      icon: 'success',
      confirmButtonText: 'OK'
    });
    addSessionToTable(data.provisioning_session_id);
  }
  catch (error) {
    console.error('Caught error:', error);
    Swal.fire({
      title: 'Network Error',
      text: 'Failed to communicate with the backend server.',
      icon: 'error',
      confirmButtonText: 'OK'
    });
  }
};

async function getProvisioningSessionDetails() {
  window.open(`${operatingUrl}details`, '_blank');
}

async function deleteProvisioningSession(sessionId) {
  const result = await Swal.fire({
    title: 'Delete Provisioning Session?',
    text: "Permanently remove provisioning session and it resources?",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Yes',
    cancelButtonText: 'No'
  });
  
  if (result.value) {
    try {
      const response = await fetch(`${operatingUrl}delete_session/${sessionId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        if (response.status === 404) {
          Swal.fire({
            title: 'Provisioning session not found.',
            text: 'The session might have already been deleted.',
            icon: 'info',
            confirmButtonText: 'OK'
          });
          removeSessionFromTable(sessionId);
        } else {
          Swal.fire({
            title: 'Failed to delete the provisioning session.',
            text: '',
            icon: 'error',
            confirmButtonText: 'OK'
          });
        }
        return;
      }

      Swal.fire({
        title: 'Deleted Provisioning session',
        text: `${sessionId} deleted with all resources`,
        icon: 'success',
        confirmButtonText: 'OK'
      });
      
      removeSessionFromTable(sessionId);

    } catch (error) {
      Swal.fire({
        title: 'Error',
        text: 'An error occurred while deleting the session.',
        icon: 'error',
        confirmButtonText: 'OK'
      });
    }
  }
}

function removeSessionFromTable(sessionId) {
  let m1_table = document.getElementById('m1_table');
  for (let i = 1; i < m1_table.rows.length; i++) {
    if (m1_table.rows[i].cells[0].innerHTML === sessionId) {
      m1_table.deleteRow(i);
      break;
    }
  }
}

function clearTable() {
  const m1Table = document.getElementById('m1_table');
  while (m1Table.rows.length > 1) {
    m1Table.deleteRow(1);
  }
}

window.onload = function() {
  setInterval(checkAFstatus, 5000);
}
