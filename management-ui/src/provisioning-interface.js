/*
License: 5G-MAG Public License (v1.0)
Author: Vuk Stojkovic, Erik Gaida
Copyright: (C) Fraunhofer FOKUS
For full license terms please see the LICENSE file distributed with this
program. If this file is missing then the license can be retrieved from
https://drive.google.com/file/d/1cinCiA778IErENZ3JN52VFW-1ffHpx7Z/view
*/

import { openContentHostingConfigurationForm, downloadContentHostingConfiguration } from "./modules/contentHostingConfiguration.js";
import { createNewCertificate, showCertificateDetails } from "./modules/serverCertificates.js";
import { showProtocols } from "./modules/protocols.js";
import { setConsumptionReporting, showConsumptionReporting, deleteConsumptionReporting } from "./modules/consumptionReporting.js";
import { createMetricsJson, showMetricsReporting, confirmMetricsDeletion, deleteMetricsConfiguration } from "./modules/metricsReporting.js";
import { setDynamicPolicy, showDynamicPolicies, deleteDynamicPolicy } from "./modules/dynamicPolicies.js";
import { openDetails } from "./modules/details.js";
import { notifyInfo, notifySuccess, notifyError, confirmPrompt } from "./modules/notify.js";

let operatingUrl = '';
// let operatingUrl = 'http://127.0.0.1:8000/'
let isConnectionLost = false;

const LS_KEY = 'selectedSessions';
const selectedSessions = new Set(JSON.parse(localStorage.getItem(LS_KEY) || '[]'));

window.createNewSession = createNewSession;

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

window.toggleSessionSelection = toggleSessionSelection;
window.deleteSelectedSessions = deleteSelectedSessions;

window.openContentHostingConfigurationForm = openContentHostingConfigurationForm;
window.downloadContentHostingConfiguration = downloadContentHostingConfiguration;

window.clearTable = clearTable;
window.loadAllSessions = loadAllSessions;

window.openDetails = openDetails;
window.getProvisioningSessionDetails = getProvisioningSessionDetails;

window.openDetailsForSelected = function () {
  const ids = [...document.querySelectorAll('#m1_table tbody .session-checkbox:checked')]
    .map(cb => cb.getAttribute('data-session-id'));
  if (ids.length === 0) return notifyInfo("Please select at least one session.");
  openDetails(ids);
};


document.addEventListener('DOMContentLoaded', async () => {
  await loadAllSessions();
});

function setAFStatus(connected) {
  const el = document.getElementById('af-status');
  if (!el) return;
  el.classList.toggle('af-ok', connected);
  el.classList.toggle('af-error', !connected);
  el.innerHTML = `<span class="af-dot"></span>${
    connected ? 'Application Function connected' : 'Application Function disconnected'
  }`;
}

async function resyncAndReload() {
  try { await fetch(`${operatingUrl}resync`, { method: 'POST' }); }
  catch (e) { console.warn('rehydrate error:', e); }
  clearTable();
  await loadAllSessions();
}

function checkAFstatus() {
  fetch(`${operatingUrl}connection_checker`, { cache: 'no-store' })
    .then(r => {
      const ok = r.ok;
      setAFStatus(ok);

      if (!ok && !isConnectionLost) {
        isConnectionLost = true;
      } else if (ok && isConnectionLost) {
        isConnectionLost = false;
        resyncAndReload();
      }
    })
    .catch(() => {
      setAFStatus(false);
      if (!isConnectionLost) { isConnectionLost = true; clearTable(); }
    });
}

function showConnectionLostAlert() {
  notifyError("Lost connection with Application Function! All session data has been purged.");
}

function policyTemplateOptionsCheck(session_id, fn) {
  fetch(`${operatingUrl}policy_template_checker/${session_id}`)
    .then(r => r.ok ? r.json() : { enabled: false })
    .then(data => fn(!!data.enabled))
    .catch(() => fn(false));
}

function getAllSessionCheckboxes() {
  return Array.from(document.querySelectorAll('#m1_table tbody .session-checkbox'));
}

function updateToggleButton() {
  const btn = document.getElementById('toggle-select-btn');
  if (!btn) return;

  const boxes = getAllSessionCheckboxes();
  const total = boxes.length;
  const checked = boxes.filter(cb => cb.checked).length;

  btn.disabled = total === 0;

  if (total === 0) {
    btn.textContent = 'Select all sessions';
    btn.classList.remove('btn-success', 'btn-danger');
    btn.classList.add('btn-secondary');
  } else {
    const allSelected = checked === total;
    if (allSelected) {
      btn.textContent = 'Deselect all sessions';
      btn.classList.remove('btn-success', 'btn-secondary');
      btn.classList.add('btn-danger');
    } else {
      btn.textContent = 'Select all sessions';
      btn.classList.remove('btn-danger', 'btn-secondary');
      btn.classList.add('btn-success');
    }
  }
}


window.toggleSelectAll = function () {
  const boxes = getAllSessionCheckboxes();
  console.log(boxes)
  const total = boxes.length;
  const checked = boxes.filter(cb => cb.checked).length;

  const shouldDeselect = total > 0 && checked === total;

  if (shouldDeselect) {
    boxes.forEach(cb => { cb.checked = false; });
    selectedSessions.clear();
  } else {
    boxes.forEach(cb => {
      cb.checked = true;
      selectedSessions.add(cb.getAttribute('data-session-id'));
    });
  }
  localStorage.setItem(LS_KEY, JSON.stringify([...selectedSessions]));
  updateToggleButton();
};

function toggleSessionSelection(checkbox) {
  console.log("Bevor action",selectedSessions)
  const sessionId = checkbox.getAttribute('data-session-id');
  if (checkbox.checked) selectedSessions.add(sessionId);
  else selectedSessions.delete(sessionId);
  console.log("after action",selectedSessions)

  localStorage.setItem(LS_KEY, JSON.stringify([...selectedSessions]));
  updateToggleButton();
}

async function deleteSelectedSessions() {
  const sessionsToDelete = Array.from(new Set(selectedSessions));
  if (sessionsToDelete.length === 0) {
    notifyInfo("No sessions selected.");
    return;
  }

  const ok = await confirmPrompt({
    message: `Delete ${sessionsToDelete.length} selected session(s)? This action cannot be undone.`,
    confirmText: "Delete",
    cancelText: "Cancel",
    tone: "danger"
  });
  if (!ok) return;

  try {
    const resp = await fetch('/delete_sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_ids: sessionsToDelete })
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.detail || 'Server error.');
    }

    const result = await resp.json();
    (result.deleted || []).forEach(id => {
      removeSessionFromTable(id);
      selectedSessions.delete(id);
    });

    if ((result.not_found || []).length) {
      notifyInfo(`Not found: ${result.not_found.join(', ')}`);
    }
    if ((result.failed || []).length) {
      notifyError(`Failed: ${result.failed.join(', ')}`);
    }

    localStorage.setItem(LS_KEY, JSON.stringify([...selectedSessions]));
    updateToggleButton();

    const nDel = (result.deleted || []).length;
    if (nDel) notifySuccess(`Deleted ${nDel} session(s).`);

  } catch (e) {
    console.error(e);
    notifyError(e.message || 'Batch delete failed.');
  }
}


window.commitSelectedSessionsToM8 = async function commitSelectedSessionsToM8() {
  const sessions = Array.from(selectedSessions);

  if (sessions.length === 0) {
    notifyInfo("Please select at least one session.");
    return;
  }

  const ok = await confirmPrompt({
    message: `Publish ${sessions.length} selected session(s) to M8 JSON and generate m8.json?`,
    confirmText: "Publish",
    cancelText: "Cancel",
    tone: "primary"
  });
  if (!ok) return;

  try {
    const response = await fetch('/commit_selected_sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_ids: sessions })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Server returned an error.');
    }

    const result = await response.json();

    if (result.status === 'success' && result.m8_content) {
      notifySuccess('M8 JSON successfully published (open /m8/m8.json).');
    } else {
      notifyInfo('Sessions were committed, but no M8 content was returned.');
    }
  } catch (err) {
    console.error('Error publishing selected sessions:', err);
    notifyError(`Error publishing selection: ${err.message}`);
  }
};

async function addSessionToTable(sessionId) {
  const m1Table = document.getElementById('m1_table');
  const tbody = document.querySelector('#m1_table tbody');
  let row = tbody.insertRow(-1);
  row.setAttribute('data-session-id', sessionId);

  let cell1 = row.insertCell(0); // Provisioning Session ID
  let cell2 = row.insertCell(1); // Content Hosting Configuration
  let cell3 = row.insertCell(2); // Certification (Create, Show)
  let cell4 = row.insertCell(3); // Show Protocols
  let cell5 = row.insertCell(4); // Consumption Reporting (Set, Show, Delete)
  let cell6 = row.insertCell(5); // Dynamic Policies
  let cell7 = row.insertCell(6); // Metrics Reporting Configuration
  let cell8 = row.insertCell(7); // Session Details
  let cell9 = row.insertCell(8); // checkBox

  let content_hosting_configuration_exists = false;
  let name_form_CHC = '';
  const MAX_NAME_LEN = 15;
  try {
    const res = await fetch(`/get_content_hosting_configuration/${sessionId}`, { cache: 'no-store' });

    if (res.ok) {
      const data = await res.json();
      content_hosting_configuration_exists = true;
      name_form_CHC = data?.name || '';
      if (name_form_CHC.length > MAX_NAME_LEN) {
        name_form_CHC = name_form_CHC.slice(0, MAX_NAME_LEN - 3) + '...';
      }
    }
  } catch {  }

  cell1.classList.add('psid-col');

  if (content_hosting_configuration_exists) {
    cell1.innerHTML = `
      <div class="psid-cell">
        <div class="psid-name">${sessionId}</div>
      </div>
    `;

    cell2.innerHTML = `
      <div class="psid-name">${name_form_CHC || ''}</div>
      <button onclick="openContentHostingConfigurationForm('${sessionId}', true)" class="btn btn-secondary table-button">Show/Edit</button>
      <button type="button" class="btn btn-secondary table-button" onclick="downloadContentHostingConfiguration('${sessionId}')">Download</button>
      <button type="button" class="btn btn-info table-button" onclick="document.getElementById('upload-chc-${sessionId}').click()">Upload</button>
      <input type="file" id="upload-chc-${sessionId}" accept="application/json" style="display:none" />
    `;
  } else {
    cell1.innerHTML = `
      <div class="psid-cell">
        <div class="psid-name">${sessionId}</div>
      </div>
    `;

    cell2.innerHTML = `
      <button onclick="openContentHostingConfigurationForm('${sessionId}', false)" class="btn btn-primary table-button">Create</button>
      <button type="button" class="btn btn-info table-button" onclick="document.getElementById('upload-chc-${sessionId}').click()">Upload</button>
      <input type="file" id="upload-chc-${sessionId}" accept="application/json" style="display:none" />
    `;
  }

  const fileInput = cell2.querySelector(`#upload-chc-${sessionId}`);
  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const content_hosting_configuration_JSON = JSON.parse(text);

      const resp = await fetch(`/set_content_hosting_configuration/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(content_hosting_configuration_JSON),
      });

      if (!resp.ok) {
        const msg = (await resp.json().catch(() => { }))?.detail || resp.statusText;
        notifyError(msg || "Upload failed.");
      } else {
        notifySuccess("Content Hosting Configuration uploaded & saved.");
        clearTable();
        await loadAllSessions();
      }
    } catch (err) {
      notifyError("Error while processing CHC file.");
    } finally {
      e.target.value = '';
    }
  });

  cell3.innerHTML = `
    <button onclick="createNewCertificate('${sessionId}')" class="btn btn-primary table-button">Create</button>
    <button onclick="showCertificateDetails('${sessionId}')" class="btn btn-secondary table-button">Show</button>`;

  cell4.innerHTML = `<button onclick="showProtocols('${sessionId}')" class="btn btn-secondary table-button">Show</button>`;

  cell5.innerHTML = `
    <button onclick="setConsumptionReporting('${sessionId}')" class="btn btn-primary table-button">Set</button>
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

  cell7.innerHTML = `
    <button onclick="createMetricsJson('${sessionId}')" class="btn btn-primary table-button">Create</button>
    <button onclick="showMetricsReporting('${sessionId}')" class="btn btn-secondary table-button">Show</button>
    <button onclick="deleteMetricsConfiguration('${sessionId}')" class="btn btn-danger table-button">Delete</button>`;

  cell8.innerHTML = `<button onclick="openDetails(['${sessionId}'])" class="btn btn-secondary table-button">Details</button>`;


  cell9.innerHTML = `
    <input type="checkbox"
         class="session-checkbox"
         data-session-id="${sessionId}"
         onchange="toggleSessionSelection(this)">
    `;

  const cb = cell9.querySelector('.session-checkbox');
  cb.checked = selectedSessions.has(sessionId);
  updateToggleButton();
}

async function loadAllSessions() {
  try {
    const response = await fetch(`${operatingUrl}fetch_all_sessions`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      notifyError('Failed to load data! Check connection with the 5GMS Application Function.');
      return;
    }

    const data = await response.json();
    const sessionIds = data.session_ids;
    sessionIds.forEach(sessionId => addSessionToTable(sessionId));
    updateToggleButton();
  } catch (error) {
    console.error('Error:', error);
    notifyError('Unexpected error while loading the sessions.');
  }
}

async function createNewSession() {
  try {
    const response = await fetch(`${operatingUrl}create_media_session`, { method: 'POST' });
    if (!response.ok) {
      notifyError('Failed to create new provisioning session! Make sure the Application Function is running.');
      return;
    }
    const data = await response.json();
    notifySuccess(`Created Provisioning Session: ${data.provisioning_session_id}`);
    addSessionToTable(data.provisioning_session_id);
  }
  catch (error) {
    console.error('Caught error:', error);
    notifyError('Network error while communicating with the backend server.');
  }
}

async function getProvisioningSessionDetails() {
  window.open(`${operatingUrl}details`, '_blank');
}

function removeSessionFromTable(sessionId) {
  const esc = (window.CSS && CSS.escape)
    ? CSS.escape(sessionId)
    : sessionId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  let row = document.querySelector(`#m1_table tbody tr[data-session-id="${esc}"]`);
  if (!row) {
    row = Array.from(document.querySelectorAll('#m1_table tbody tr')).find(tr => {
      const idEl = tr.querySelector('.psid-id');
      return idEl && idEl.textContent.trim() === sessionId;
    });
  }
  if (row) row.remove();

  selectedSessions.delete(sessionId);
  localStorage.setItem(LS_KEY, JSON.stringify([...selectedSessions]));
}

function clearTable() {
  const m1Table = document.getElementById('m1_table');
  while (m1Table.rows.length > 1) {
    m1Table.deleteRow(1);
  }
}

document.addEventListener('sessions:reload', async () => {
  clearTable();
  await loadAllSessions();
});

document.getElementById('scrollTopBtn').onclick = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.onload = function () {
  checkAFstatus();
  setInterval(checkAFstatus, 5000);
};
