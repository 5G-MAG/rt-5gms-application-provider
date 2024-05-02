/*
License: 5G-MAG Public License (v1.0)
Author: Vuk Stojkovic
Copyright: (C) Fraunhofer FOKUS
For full license terms please see the LICENSE file distributed with this
program. If this file is missing then the license can be retrieved from
https://drive.google.com/file/d/1cinCiA778IErENZ3JN52VFW-1ffHpx7Z/view
*/

// Auxiliary function to clear storage when the connection is lost

let isStorageCleared = false;
function clearStorage() {
  localStorage.clear();
  let session_table = document.getElementById('session_table');
  for (let i = session_table.rows.length - 1; i > 0; i--) {
    session_table.deleteRow(i);
  }
}

function showConnectionLostAlert() {
  Swal.fire({
    title: 'Lost connection with Application Function!',
    text: 'All session data has been purged.',
    icon: 'warning',
    confirmButtonText: 'OK'
  });
}

function checkAFstatus() {
  fetch('http://127.0.0.1:8000/connection_checker')
  .then(response => {
    if (!response.ok && !isStorageCleared) {
      document.getElementById('AFStatus').innerText = 'Connection with Application Function: ❌';
      clearStorage();
      showConnectionLostAlert();
      isStorageCleared = true;
    } else if (response.ok) {
      document.getElementById('AFStatus').innerText = 'Connection with Application Function: ✅';
      isStorageCleared = false;}
  })
  .catch(error => {
    console.error('Error:', error);
    if (!isStorageCleared) {
      document.getElementById('AFStatus').innerText = 'Connection with AF interrupted.';
      clearStorage();
      showConnectionLostAlert();
      isStorageCleared = true;}
  });
}

function addSessionToTable(sessionId) {
  const sessionData = JSON.parse(localStorage.getItem(sessionId));
  const session_table = document.getElementById('session_table');
  let row = session_table.insertRow(-1);

  let cell1 = row.insertCell(0); // Session ID
  let cell2 = row.insertCell(1); // Create CHC from JSON
  let cell3 = row.insertCell(2); // Create and show certificate
  let cell4 = row.insertCell(3); // Show Protocols button
  let cell5 = row.insertCell(4); // Consumption Reporting (Set, Show, Delete)
  let cell6 = row.insertCell(5); // Dynamic Policies
  let cell7 = row.insertCell(6); // Show Session Details
  let cell8 = row.insertCell(7); // Metrics Reporting Configuration
  let cell9 = row.insertCell(8); // Delete session

  cell1.innerHTML = sessionId;
  cell2.innerHTML = `<button onclick="createChcFromJson('${sessionId}')" class="btn btn-primary table-button">Create</button>`;
  cell3.innerHTML = `<button onclick="createNewCertificate('${sessionId}')" class="btn btn-primary table-button">Create</button>
                      <button onclick="showCertificateDetails('${sessionId}', '${sessionData.certificate_id}')" class="btn btn-info table-button">Show</button>`
  cell4.innerHTML = `<button onclick="getProtocols('${sessionId}')" class="btn btn-info table-button">Show</button>`;
  cell5.innerHTML = `<button onclick="setConsumptionReporting('${sessionId}')" class="btn btn-primary table-button">Set</button>
                      <button onclick="showConsumptionReporting('${sessionId}')" class="btn btn-info table-button">Show</button>
                      <button onclick="deleteConsumptionReporting('${sessionId}')" class="btn btn-danger table-button">Delete</button>`;
  cell6.innerHTML = `<button onclick="setDynamicPolicy('${sessionId}')" class="btn btn-primary table-button">Set</button>
                    <button onclick="showDynamicPolicies('${sessionId}', '${sessionData.policy_template_id}')" class="btn btn-info table-button">Show</button>
                    <button onclick="deleteDynamicPolicy('${sessionId}', '${sessionData.policy_template_id}')" class="btn btn-danger table-button">Delete</button>`;
  cell7.innerHTML = `<button onclick="getProvisioningSessionDetails()" class="btn btn-info table-button">Show</button>`;
  cell8.innerHTML = `<button onclick="createMetricsJson('${sessionId}')" class="btn btn-primary table-button">Create</button>
                      <button onclick="showMetricsReporting('${sessionId}')" class="btn btn-info table-button">Show</button>
                      <button onclick="deleteMetricsConfiguration('${sessionId}')" class="btn btn-danger table-button">Delete</button>`;
  cell9.innerHTML = `<button onclick="deleteProvisioningSession('${sessionId}')" class="btn btn-danger table-button">Remove</button>`;
}

async function createNewSession() {
  const response = await fetch('/create_session', { method: 'POST' });
  if (!response.ok) {
    Swal.fire({
      title: 'Failed to create new session!',
      text: 'Please, make sure that Application Function is running!',
      icon: 'error',
      confirmButtonText: 'OK'
    });
    return;}

  const data = await response.json();
  Swal.fire({
    title: 'Created Provisioning Session',
    text: `ID: ${data.provisioning_session_id}`,
    icon: 'success',
    confirmButtonText: 'OK'
  });
  localStorage.setItem(data.provisioning_session_id, JSON.stringify({
    certificate_id: 'not yet created'
  }));
  addSessionToTable(data.provisioning_session_id);
}

function removeSessionFromTableAndStorage(sessionId) {
  let session_table = document.getElementById('session_table');
  for (let i = 1; i < session_table.rows.length; i++) {
    if (session_table.rows[i].cells[0].innerHTML === sessionId) {
      session_table.deleteRow(i);
      break;
    }
  }
  localStorage.removeItem(sessionId);
  localStorage.removeItem(sessionId + "-cert");
}

async function deleteProvisioningSession(sessionId) {
  const result = await Swal.fire({
    title: 'Delete Provisioning Session?',
    text: "Permanently remove provisioning session?",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Yes',
    cancelButtonText: 'No'
  });
  if (result.value) {
    const response = await fetch(`/delete_session/${sessionId}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      if (response.status === 404) {
        removeSessionFromTableAndStorage(sessionId);
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
      title: `Deleted Provisioning session`,
      text: `${sessionId} deleted with all resources`,
      icon: 'success',
      confirmButtonText: 'OK'
    });
    removeSessionFromTableAndStorage(sessionId);
  }
}

async function createChcFromJson(sessionId) {
  const response = await fetch(`/set_stream/${sessionId}`, {
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

async function getProvisioningSessionDetails() {
  window.open('http://127.0.0.1:8000/details', '_blank');
}

async function createNewCertificate(sessionId) {
  try {
      const response = await fetch(`/certificate/${sessionId}`, {
          method: 'POST'
      });
      const data = await response.json();
      if (response.ok) {

        // Storing certificate_id to the local storage
        let session_data = JSON.parse(localStorage.getItem(sessionId)) || {};
        session_data.certificate_id = data.certificate_id;
        localStorage.setItem(sessionId, JSON.stringify(session_data));

          Swal.fire({
              title: 'Certificate created successfully!',
              text: `ID: ${data.certificate_id}`,
              icon: 'success',
              confirmButtonText: 'OK'
          }); 

          let session_table = document.getElementById('session_table');

          for (let i = 1; i < session_table.rows.length; i++) {
            if (session_table.rows[i].cells[0].innerHTML === sessionId) {
                let cell = session_table.rows[i].cells[2];
                cell.innerHTML = `<button onclick="createNewCertificate('${sessionId}')" class="btn btn-primary table-button">Create</button>
                                  <button onclick="showCertificateDetails('${sessionId}', '${data.certificate_id}')" class="btn btn-info table-button">Show</button>`;
            }
        }

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

function showCertificateDetails(sessionId) {
  let session_data = JSON.parse(localStorage.getItem(sessionId));
  let certificate_id = session_data.certificate_id;
  window.open(`http://127.0.0.1:8000/show_certificate/${sessionId}/${certificate_id}`, '_blank');l
}


function getProtocols(sessionId) {
  window.open(`http://127.0.0.1:8000/show_protocol/${sessionId}`, '_blank');
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

    const response = await fetch(`/set_consumption/${session_id}`, {
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
  const url = `http://127.0.0.1:8000/show_consumption/${sessionId}`;
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
      const response = await fetch(`/del_consumption/${sessionId}`, {
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
  customClass:{
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
      const response = await fetch(`/create_policy_template/${sessionId}`, {
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
      localStorage.setItem(`policyTemplateId_${sessionId}`, data.policy_template_id);
      Swal.fire('Success', `Created Dynamic Policies with ID: "${data.policy_template_id}"`, 'success');
    } catch (error) {
      console.error('Error:', error);
      Swal.fire('Error', 'An unexpected error occurred.', 'error');
    }
  }
}

async function showDynamicPolicies(sessionId) {
  const policy_template_id = localStorage.getItem(`policyTemplateId_${sessionId}`);
  if (policy_template_id && policy_template_id !== 'undefined') {
      const url = `http://127.0.0.1:8000/show_policy_template/${sessionId}/${policy_template_id}`;
      window.open(url, '_blank');
  } else {
      Swal.fire({
        title: 'Error',
        text: 'Policy template ID not found or not created yet.',
        icon: 'error'
      });
  }
}

async function deleteDynamicPolicy(sessionId) {
  const policyTemplateId = localStorage.getItem(`policyTemplateId_${sessionId}`);
  if (!policyTemplateId || policyTemplateId === 'undefined') {
    await Swal.fire({
      title: 'Error',
      text: 'Policy template ID not found or not created yet.',
      icon: 'error',
      confirmButtonText: 'OK'
    });
    return;
  }
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
      const response = await fetch(`/delete_policy_template/${sessionId}/${policyTemplateId}`, {
        method: 'DELETE'
      });
      if (response.status === 204) {
        await Swal.fire({
          title: 'Deleted!',
          text: `The policy template with ID: ${policyTemplateId} has been deleted.`,
          icon: 'success',
          confirmButtonText: 'OK'
        });

        localStorage.removeItem(`policyTemplateId_${sessionId}`);
      } else {
        let data;
        try {
          data = await response.json();
        } catch (error) {
          data = { detail: "Unknown error occurred." };
        }
        await Swal.fire({
          title: 'Failed to Delete',
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
            <input type="checkbox" id="metric1" value="urn:3GPP:ns:PSS:DASH:QM10#HTTPList"><label for="metric1">HTTP List</label><br>
            <input type="checkbox" id="metric2" value="urn:3GPP:ns:PSS:DASH:QM10#BufferLevel"><label for="metric2">Buffer Level</label><br>
            <input type="checkbox" id="metric3" value="urn:3GPP:ns:PSS:DASH:QM10#RepSwitchList"><label for="metric3">Representation Switch List</label><br>
            <input type="checkbox" id="metric4" value="urn:3GPP:ns:PSS:DASH:QM10#MPDInformation"><label for="metric4">MPD Information</label><br>
            <input type="checkbox" id="metric5" value="urn:3gpp:metadata:2020:VR:metrics#RenderedViewports"><label for="metric5">Rendered Viewports</label>
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
          ['metric1', 'metric2', 'metric3', 'metric4', 'metric5'].forEach(metricId => {
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
      const response = await fetch(`/create_metrics/${sessionId}`, {
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
  const response = await fetch(`/list_metrics_ids/${sessionId}`);
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
      const response = await fetch(`/delete_metrics/${sessionId}/${metricsId}`, {
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

window.onload = function() {
  
  setInterval(checkAFstatus, 5000);

  let sessionTable = document.getElementById('session_table');
  for (let i = 0; i < localStorage.length; i++) {
    let session_id = localStorage.key(i);
    let session_data = JSON.parse(localStorage.getItem(session_id));

    let row = sessionTable.insertRow(-1);
    let cell1 = row.insertCell(0); // Session ID
    let cell2 = row.insertCell(1); // Create CHC from JSON
    let cell3 = row.insertCell(2); // Create and show certificate
    let cell4 = row.insertCell(3); // Show Protocols button
    let cell5 = row.insertCell(4); // Consumption Reporting (Set, Show, Delete)
    let cell6 = row.insertCell(5); // Dynamic Policies
    let cell7 = row.insertCell(6); // Show Session Details
    let cell8 = row.insertCell(7); // Metrics Reporting Configuration
    let cell9 = row.insertCell(8); // Delete session

    cell1.innerHTML = session_id;
    cell2.innerHTML = `<button onclick="createChcFromJson('${session_id}')" class="btn btn-primary table-button">Create</button>`;
    cell3.innerHTML = `<button onclick="createNewCertificate('${session_id}')" class="btn btn-primary table-button">Create</button>
                        <button onclick="showCertificateDetails('${session_id}', '${session_data ? session_data.certificate_id : ''}')" class="btn btn-info table-button">Show</button>`;
    cell4.innerHTML = `<button onclick="getProtocols('${session_id}')" class="btn btn-info table-button">Show</button>`;
    cell5.innerHTML = `<button onclick="setConsumptionReporting('${session_id}')" class="btn btn-primary table-button">Set</button>
                        <button onclick="showConsumptionReporting('${session_id}')" class="btn btn-info table-button">Show</button>
                        <button onclick="deleteConsumptionReporting('${session_id}')" class="btn btn-danger table-button">Delete</button>`;
    cell6.innerHTML = `<button onclick="setDynamicPolicy('${session_id}')" class="btn btn-primary table-button">Set</button>
                        <button onclick="showDynamicPolicies('${session_id}', '${session_data ? session_data.policy_template_id : ''}')" class="btn btn-info table-button">Show</button>
                        <button onclick="deleteDynamicPolicy('${session_id}', '${session_data ? session_data.policy_template_id : ''}')" class="btn btn-danger table-button">Delete</button>`;
    cell7.innerHTML = `<button onclick="getProvisioningSessionDetails()" class="btn btn-info table-button">Show</button>`;
    cell8.innerHTML = `<button onclick="createMetricsJson('${session_id}')" class="btn btn-primary table-button">Create</button>
                      <button onclick="showMetricsReporting('${session_id}')" class="btn btn-info table-button">Show</button>
                      <button onclick="deleteMetricsConfiguration('${session_id}')" class="btn btn-danger table-button">Delete</button>`;
    cell9.innerHTML = `<button onclick="deleteProvisioningSession('${session_id}')" class="btn btn-danger table-button">Remove</button>`;
  }
}