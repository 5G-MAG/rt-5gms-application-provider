/*
License: 5G-MAG Public License (v1.0)
Author: Vuk Stojkovic
Copyright: (C) Fraunhofer FOKUS
For full license terms please see the LICENSE file distributed with this
program. If this file is missing then the license can be retrieved from
https://drive.google.com/file/d/1cinCiA778IErENZ3JN52VFW-1ffHpx7Z/view
*/


document.addEventListener('DOMContentLoaded', async () => {
  await loadAllSessions();
});

let operatingUrl = '';
let isConnectionLost = false;

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

function policyTemplateOptionsCheck(session_id, fn) {
  fetch(`${operatingUrl}policy_template_checker/${session_id}`).then(response => (response.ok && response.json()['enabled']), response => false).then(fn);
}


function clearTable() {

  const m1Table = document.getElementById('m1_table');
  while (m1Table.rows.length > 1) {
    m1Table.deleteRow(1);
  }
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
                      <p class="policy-message"><img src="static/images/loading.gif" alt="loading..." /> Checking feature availability...</p>
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

async function createChcFromJson(sessionId) {
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

async function createNewCertificate(sessionId) {
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
  
async function showCertificateDetails(sessionId) {
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


function showProtocols(sessionId) {
  window.open(`${operatingUrl}show_protocol/${sessionId}`, '_blank');
}

async function setConsumptionReporting(session_id) {
  const { value: formValues, dismiss } = await Swal.fire({
    title: 'Set consumption reporting parameters:',
    html:
      '<input id="swal-input1" class="swal2-input" type="number" placeholder="Reporting Interval">' +
      '<input id="swal-input2" class="swal2-input" type="number" placeholder="Sample Percentage"><br>' +
      '<br><label for="swal-input3">Location Reporting: </label>' +
      '<br><select id="swal-input3" class="swal2-input">' +
        '<option value="true">True</option>' +
        '<option value="false">False</option>' +
      '</select>' +
      '<br><br><label for="swal-input4">Access Reporting: </label><br>' +
      '<select id="swal-input4" class="swal2-input">' +
        '<option value="true">True</option>' +
        '<option value="false">False</option>' +
      '</select>',
    customClass:{
      popup: 'consumption-swall'
    },
    focusConfirm: false,
    showCancelButton: true,
    preConfirm: () => {
      let reportingInterval = document.getElementById('swal-input1').value;
      let samplePercentage = document.getElementById('swal-input2').value;

      if (!reportingInterval || !samplePercentage || isNaN(reportingInterval) || isNaN(samplePercentage)) {
        Swal.showValidationMessage("Set all parameters with valid numerical values!");
        return false;
      }
      if (samplePercentage < 0 || samplePercentage > 100) {
        Swal.showValidationMessage("Sample percentage must be between 0 and 100 %");
        return false;
      }
      return {
        reportingInterval: parseInt(reportingInterval),
        samplePercentage: parseFloat(samplePercentage),
        locationReporting: document.getElementById('swal-input3').value === 'true',
        accessReporting: document.getElementById('swal-input4').value === 'true'
      };
    }
  });

  if (formValues && !dismiss) {
    const payload = {
      reportingInterval: parseInt(formValues.reportingInterval, 10),
      samplePercentage: formValues.samplePercentage,
      locationReporting: formValues.locationReporting,
      accessReporting: formValues.accessReporting
    };

    const response = await fetch(`${operatingUrl}set_consumption/${session_id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json();
      Swal.fire({
        title: 'Error',
        text: errorData.detail || 'An error occurred while setting consumption parameters.',
        icon: 'error'
      });
      return;
    }

    const data = await response.json();
    Swal.fire({
      title: data.message,
      icon: 'success'
    });
  }
}

async function showConsumptionReporting(sessionId){
  const url = `${operatingUrl}show_consumption/${sessionId}`;
  window.open(url, '_blank');
}

async function deleteConsumptionReporting(sessionId) {
  const result = await Swal.fire({
    title: 'Delete Consumption Reporting?',
    text: "Are you sure? You won't be able to revert this.",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Yes',
    cancelButtonText: 'No'
  });

  if (result.isConfirmed) {
    try {
      const response = await fetch(`${operatingUrl}/del_consumption/${sessionId}`, {
        method: 'DELETE'
      });

      if (response.status === 204) {
        await Swal.fire({
          title: 'Deleted Consumption Reporting!',
          text: 'The consumption reporting has been deleted.',
          icon: 'success',
          confirmButtonText: 'OK'
        });
      } else {
    
        let data;
        try {
          data = await response.json();
        } catch (error) {
          data = { detail: "Unknown error occurred." };
        }

        await Swal.fire({
          title: 'Application Provider says:',
          text: data.detail,
          icon: 'error',
          confirmButtonText: 'OK'
        });
      }
    } catch (error) {
      await Swal.fire({
        title: 'Error',
        text: 'Network error or server not responding.',
        icon: 'error',
        confirmButtonText: 'OK'
      });
    }
  }
}

async function setDynamicPolicy(sessionId) {
  const { value: formValues, dismiss } = await Swal.fire({
    title: 'Create Dynamic Policy',
    html: 
    `
    <input id="externalReference" class="swal2-input" type="number" placeholder="External Policy ID" required>
    
    <br><br><p>Application Session Context:</p>
      <input id="sst" class="swal2-input" type="number" placeholder="SST">
      <input id="sd" class="swal2-input" placeholder="SD">
      <input id="dnn" class="swal2-input" type="text" placeholder="DNN">

      <br><br><p font-weight="bold">QoS Specification:</p>
      <input id="qosReference" class="swal2-input" placeholder="QoS Reference"><br>
      <br><input id="maxAuthBtrUl" class="swal2-input" type="number" placeholder="Max Auth Btr Ul">
      <select id="maxAuthBtrUlUnit" class="swal2-input">
        <option value="bps">Bps</option>
        <option value="kbps">Kbps</option>
        <option value="mbps">Mbps</option>
        <option value="gbps">Gbps</option>
        <option value="tbps">Tbps</option>
      </select>
      <br><input id="maxAuthBtrDl" class="swal2-input" type="number" placeholder="Max Auth Btr Dl">
      <select id="maxAuthBtrDlUnit" class="swal2-input">
        <option value="bps">Bps</option>
        <option value="kbps">Kbps</option>
        <option value="mbps">Mbps</option>
        <option value="gbps">Gbps</option>
        <option value="tbps">Tbps</option>
      </select>
      <br>
      <input id="defPacketLossRateDl" class="swal2-input" placeholder="Def Packet Loss Rate Dl">
      <input id="defPacketLossRateUl" class="swal2-input" placeholder="Def Packet Loss Rate Ul">

      <br><br><p>Charging Specification</p>
      <input id="sponId" class="swal2-input" placeholder="Sponsor ID">
      <select id="sponStatus" class="swal2-input">
        <option value="">Select Sponsor Status</option>
        <option value="SPONSOR_ENABLED">ENABLED</option>
        <option value="SPONSOR_DISABLED">DISABLED</option>
      </select>
      <input id="gpsi" class="swal2-input" placeholder="GPSI">


      <input id="state" class="swal2-input" placeholder="State">
      <input id="type" class="swal2-input" placeholder="Type">
    `,
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

async function showDynamicPolicies(sessionId) {
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

async function deleteDynamicPolicy(sessionId) {
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

async function createMetricsJson(sessionId) {
  const { value: formValues } = await Swal.fire({
      title: 'Create Metrics Reporting Configuration',
      html: `
          <input id="scheme" class="swal2-input" placeholder="Scheme">
          <input id="dataNetworkName" class="swal2-input" type='text' placeholder="Data Network Name" required>
          <input id="reportingInterval" class="swal2-input" type="number" placeholder="Reporting Interval (in seconds)" required>
          <input id="samplePercentage" class="swal2-input" type="number" placeholder="Sample Percentage (in seconds)" required>
          <input id="urlFilters" class="swal2-input" placeholder="URL Filters (comma-separated)" required>
          <input id="samplingPeriod" class="swal2-input" type="number" placeholder="Sampling Period (in seconds)" required>
          <div>
          <br><p>Select Metrics to report:</p>
            <input type="checkbox" id="metric2" value="urn:3GPP:ns:PSS:DASH:QM10#BufferLevel"><label for="metric2">Buffer Level</label><br>
            <input type="checkbox" id="metric3" value="urn:3GPP:ns:PSS:DASH:QM10#RepSwitchList"><label for="metric3">Representation Switch List</label><br>
            <input type="checkbox" id="metric4" value="urn:3GPP:ns:PSS:DASH:QM10#MPDInformation"><label for="metric4">MPD Information</label><br>
            <input type="checkbox" id="metric5" value="urn:3gpp:metadata:2020:VR:metrics#RenderedViewports"><label for="metric5">Rendered Viewports</label><br>
            <input type="checkbox" id="metric6" value="urn:3GPP:ns:PSS:DASH:QM10#InitialPlayoutDelay"><label for="metric6">Initial Playout Delay</label><br>
            <input type="checkbox" id="metric7" value="urn:3GPP:ns:PSS:DASH:QM10#PlayoutDelayForMediaStartup"><label for="metric7">Playout Delay for Media Startup</label><br>
            <input type="checkbox" id="metric8" value="urn:3GPP:ns:PSS:DASH:QM10#DeviceInformation"><label for="metric8">Device Information</label><br>
            <input type="checkbox" id="metric9" value="urn:3GPP:ns:PSS:DASH:QM10#AvgThroughput"><label for="metric9">Average Throughput</label><br>
            <input type="checkbox" id="metric10" value="urn:3GPP:ns:PSS:DASH:QM10#PlayList"><label for="metric10">Playlist</label>
          </div>
      `,
      customClass:{
        popup: 'metrics-swall'
      },
      focusConfirm: false,
      showCancelButton: true,
      preConfirm: () => {
          if (!document.getElementById('samplingPeriod').value) {
              Swal.showValidationMessage('Sampling Period is mandatory value');
              return false;
          }
          if (document.getElementById('samplingPeriod').value <= 0) {
            Swal.showValidationMessage('Sampling Period must be positive value.');
            return false;
          }
          if (document.getElementById('reportingInterval').value <= 0) {
            Swal.showValidationMessage('Reporting Interval must be a positive value');
            return false;
          }

          const metrics = [];
      ['metric2', 'metric3', 'metric4', 'metric5', 'metric6', 'metric7', 'metric8', 'metric9', 'metric10'].forEach(metricId => {
              if (document.getElementById(metricId).checked) {
                  metrics.push(document.getElementById(metricId).value);
              }
          });
          return {
              scheme: document.getElementById('scheme').value,
              dataNetworkName: document.getElementById('dataNetworkName').value,
              reportingInterval: parseInt(document.getElementById('reportingInterval').value),
              samplePercentage: parseInt(document.getElementById('samplePercentage').value),
              urlFilters: document.getElementById('urlFilters').value.split(',').map(item => item.trim()),
              samplingPeriod: parseInt(document.getElementById('samplingPeriod').value),
              metrics: metrics
          };
      }
  });

  if (formValues) {
      postMetricsData(sessionId, formValues);
  }
}

async function postMetricsData(sessionId, metricsConfiguration) {
  try {
      const response = await fetch(`${operatingUrl}create_metrics/${sessionId}`, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json'
          },
          body: JSON.stringify(metricsConfiguration)
      });

      if (!response.ok) {
          const errorData = await response.json();
          Swal.fire('Error', errorData.detail || 'An error occurred while creating the metrics reporting configuration.', 'error');
      } else {
          const result = await response.json();
          Swal.fire(`Metrics Reporting Configuration successfully created`, `ID: ${result.metrics_reporting_configuration_id}`, 'success');
      }
  } catch (error) {
      console.error('Error:', error);
      Swal.fire('Error', 'An unexpected error occurred.', 'error');
  }
}

async function showMetricsReporting(sessionId) {
  try {
      const metricsIDs = await fetchMetricsConfigurationIDs(sessionId);
      if (metricsIDs.length === 0) {
          Swal.fire('No Metrics Configurations', 'There are no metrics configurations available for this session.', 'info');
          return;
      }
      const linksHtml = metricsIDs.map(id => 
          `<button class="swal2-confirm swal2-styled" onclick="window.open('/show_metrics/${sessionId}/${id}', '_blank')">${id}</button>`
      ).join('<br>');

      Swal.fire({
          title: 'Select Metrics Configuration to display:',
          html: linksHtml,
          showCancelButton: true,
          showConfirmButton: false,
          customClass: {
              popup: 'metrics-ids-swall'
          }
      });
  } catch (error) {
      console.error('Error:', error);
      Swal.fire('No provisioned Metrics Reporting Configurations', '', 'error');
  }
}

async function fetchMetricsConfigurationIDs(sessionId) {
  const response = await fetch(`${operatingUrl}list_metrics_ids/${sessionId}`);
  if (!response.ok) {
      throw new Error('Failed to fetch metrics configurations');
  }
  return await response.json();
}

async function deleteMetricsConfiguration(sessionId) {
  try {
      const metricsIDs = await fetchMetricsConfigurationIDs(sessionId);
      if (metricsIDs.length === 0) {
          Swal.fire('No Metrics Configurations', 'There are no metrics configurations available for this session.', 'info');
          return;
      }
      const linksHtml = metricsIDs.map(id => 
          `<button class="swal2-confirm swal2-styled" onclick="confirmDeletion('${sessionId}', '${id}')">${id}</button>`
      ).join('<br>');

      Swal.fire({
          title: 'Select Metrics Configuration to delete:',
          html: linksHtml,
          showCancelButton: true,
          showConfirmButton: false,
          customClass: {
              popup: 'metrics-ids-swall'
          }
      });
  } catch (error) {
      console.error('Error:', error);
      Swal.fire('No provisioned Metrics Reporting Configurations', '', 'error');
  }
}

async function confirmDeletion(sessionId, metricsId) {
  Swal.fire({
      title: 'Delete Metrics Configuration?',
      text: `Configuration ${metricsId} will be deleted permanently.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes'
  }).then((result) => {
      if (result.isConfirmed) {
          deleteMetrics(sessionId, metricsId);
      }
  });
}

async function deleteMetrics(sessionId, metricsId) {
  try {
      const response = await fetch(`${operatingUrl}delete_metrics/${sessionId}/${metricsId}`, {
          method: 'DELETE'
      });
      if (response.ok) {
          Swal.fire(
              'Deleted!',
              `The metrics configuration ${metricsId} has been deleted.`,
              'success'
          ).then(() => {
            Swal.close();
          });
      } else {
          throw new Error('Failed to delete the metrics configuration');
      }
  } catch (error) {
      console.error('Error:', error);
      Swal.fire('Error', error.message, 'error');
  }
}

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

window.onload = function() {
  setInterval(checkAFstatus, 5000);
}
