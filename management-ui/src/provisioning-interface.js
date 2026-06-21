/*
License: 5G-MAG Public License (v1.0)
Author: Vuk Stojkovic, Erik Gaida
Copyright: (C) Fraunhofer FOKUS
For full license terms please see the LICENSE file distributed with this
program. If this file is missing then the license can be retrieved from
https://hub.5g-mag.com/Getting-Started/OFFICIAL_5G-MAG_Public_License_v1.0.pdf
*/

import { openContentHostingConfigurationForm, downloadContentHostingConfiguration, deleteContentHostingConfiguration } from "./modules/contentHostingConfiguration.js";
import { createNewCertificate, showCertificateDetails } from "./modules/serverCertificates.js";
import { showProtocols } from "./modules/protocols.js";
import { setConsumptionReporting, deleteConsumptionReporting } from "./modules/consumptionReporting.js";
import { createMetricsJson, showMetricsReporting } from "./modules/metricsReporting.js";
import { openPolicyTemplateForm, listAllPolicyTemplate } from "./modules/policyTemplate.js";
import { openDetails } from "./modules/details.js";
import { notifyInfo, notifySuccess, notifyError, confirmPrompt } from "./modules/notify.js";

let operatingUrl = '';
// let operatingUrl = 'http://127.0.0.1:8000/'
let isConnectionLost = false;

const LS_KEY = 'selectedSessions';
const selectedSessions = new Set(JSON.parse(localStorage.getItem(LS_KEY) || '[]'));
let sessionUiInfo = {};

window.createNewSession = createNewSession;

window.createNewCertificate = createNewCertificate;
window.showProtocols = showProtocols;
window.showCertificateDetails = showCertificateDetails;

window.setConsumptionReporting = setConsumptionReporting;
window.deleteConsumptionReporting = deleteConsumptionReporting;

window.createMetricsJson = createMetricsJson;
window.showMetricsReporting = showMetricsReporting;

window.openPolicyTemplateForm = openPolicyTemplateForm;
window.listAllPolicyTemplate = listAllPolicyTemplate;

window.toggleSessionSelection = toggleSessionSelection;
window.deleteSelectedSessions = deleteSelectedSessions;
window.openM8 = openM8;

window.openContentHostingConfigurationForm = openContentHostingConfigurationForm;
window.downloadContentHostingConfiguration = downloadContentHostingConfiguration;
window.deleteContentHostingConfiguration = deleteContentHostingConfiguration

window.clearTable = clearTable;
window.loadAllSessions = loadAllSessions;

window.openDetails = openDetails;
window.getProvisioningSessionDetails = getProvisioningSessionDetails;

window.exportPSConfiguration = exportPSConfiguration;
window.importPSConfiguration = importPSConfiguration;
window.openDetailsForSelected = function () {
  const ids = [...document.querySelectorAll('#m1_table tbody .session-checkbox:checked')]
    .map(cb => cb.getAttribute('data-session-id'));
  if (ids.length === 0) return notifyInfo("Please select at least one session.");
  openDetails(ids);
};


document.addEventListener('DOMContentLoaded', async () => {
  await loadAdminCapabilities();
  await loadAllSessions();
});

function setMafAutoDiscoverVisible(visible) {
  const wrap = document.getElementById('maf-auto-discover-wrap');
  if (!wrap) return;
  wrap.style.pointerEvents = visible ? '' : 'none';
  wrap.classList.toggle('maf-sync-unavailable', !visible);
}

async function loadAdminCapabilities() {
  try {
    const response = await fetch(`${operatingUrl}admin/capabilities`, { cache: 'no-store' });
    if (!response.ok) {
      setMafAutoDiscoverVisible(false);
      return;
    }
    const data = await response.json();
    const available = data.maf_discovery_available === true;
    setMafAutoDiscoverVisible(available);
    const toggle = document.getElementById('maf-auto-discover-toggle');
    if (toggle) {
      toggle.checked = data.maf_auto_discover === true;
      toggle.onchange = async () => {
        const enabled = toggle.checked === true;
        try {
          const saveResp = await fetch(`${operatingUrl}admin/maf_auto_discover`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ enabled })
          });
          const saveData = await saveResp.json().catch(() => ({}));
          if (!saveResp.ok) {
            toggle.checked = !enabled;
            notifyError(saveData.detail || 'Failed to update auto-load switch.');
            return;
          }
          notifySuccess(`Sync AF-Sessions ${enabled ? 'enabled' : 'disabled'}.`);
          if (enabled) {
            document.dispatchEvent(new Event('sessions:reload'));
          }
        } catch (error) {
          toggle.checked = !enabled;
          notifyError('Failed to update auto-load switch.');
        }
      };
    }
  } catch (error) {
    console.warn('Failed to load admin capabilities:', error);
    setMafAutoDiscoverVisible(false);
  }
}

function setAFStatus(connected) {
  const el = document.getElementById('af-status');
  if (!el) return;
  el.classList.toggle('af-ok', connected);
  el.classList.toggle('af-error', !connected);
  el.innerHTML = `<span class="af-dot"></span>${connected ? 'Application Function connected' : 'Application Function disconnected'
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



function getAllSessionCheckboxes() {
  return Array.from(document.querySelectorAll('#sessions-list .session-checkbox'));
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
  console.log("Bevor action", selectedSessions)
  const sessionId = checkbox.getAttribute('data-session-id');
  if (checkbox.checked) selectedSessions.add(sessionId);
  else selectedSessions.delete(sessionId);
  console.log("after action", selectedSessions)

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
    const resp = await fetch(`${operatingUrl}delete_sessions`, {
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
    const notFound = result.not_found || [];

    if (notFound.length) {
      notFound.forEach(id => {
        selectedSessions.delete(id);
      });
    }
    if ((result.failed || []).length) {
      notifyError(`Failed: ${result.failed.join(', ')}`);
    }

    localStorage.setItem(LS_KEY, JSON.stringify([...selectedSessions]));
    updateToggleButton();

    const nDel = (result.deleted || []).length;
    if (nDel) {
      notifySuccess(`Deleted ${nDel} session(s).`);
      document.dispatchEvent(new Event('sessions:reload'));
    }

  } catch (e) {
    console.error(e);
    notifyError(e.message || 'Batch delete failed.');
  }
}


async function openM8() {
  try {
    const url = `${operatingUrl}m8.json`;
    window.open(url);
  } catch (e) {
    console.error(e);
    notifyError('Could not open M8 JSON.');
  }
}

function sessionStatusDot(present) {
  return `<span class="session-status-dot ${present ? 'status-on' : 'status-off'}" title="${present ? 'Configured' : 'Not configured'}"></span>`;
}

function sessionRowDetail(text) {
  return text ? `<span class="session-row-detail">${text}</span>` : '';
}

function chcDetailText(d) {
  if (!d) return '';
  const parts = [];
  if (d.ingestMethod) parts.push(d.ingestMethod);
  if (d.contentType) parts.push(`<span class="detail-mono">${d.contentType}</span>`);
  return parts.join(' &middot; ');
}

function consumptionDetailText(d) {
  if (!d) return '';
  const tags = [];
  if (d.locationReporting) tags.push('location');
  if (d.accessReporting) tags.push('access');
  const pct = d.samplePercentage != null ? `${d.samplePercentage}% sample` : '';
  const iv = d.interval != null ? `every ${d.interval}s` : '';
  return [iv, pct, tags.join(', ')].filter(Boolean).join(' &middot; ');
}

function metricsDetailText(d) {
  if (!d) return '';
  const iv = d.interval != null ? `every ${d.interval}s` : '';
  const pct = d.samplePercentage != null ? `${d.samplePercentage}% sample` : '';
  const sp = d.samplingPeriod != null ? `${d.samplingPeriod}s period` : '';
  return [iv, pct, sp].filter(Boolean).join(' &middot; ');
}

async function addSessionToTable(sessionId) {
  const list = document.getElementById('sessions-list');

  const info = sessionUiInfo[sessionId] || {};
  const name = info.name || null;
  const hasContentHostingConfiguration = info.hasContentHostingConfiguration === true;
  const hasServerCertificates = info.hasServerCertificates === true;
  const hasConsumptionReportingConfiguration = info.hasConsumptionReportingConfiguration === true;
  const hasPolicyTemplates = info.hasPolicyTemplates === true;
  const hasMetricsReportingConfiguration = info.hasMetricsReportingConfiguration === true;
  const certCount = info.certificateCount || 0;
  const policyCount = info.policyTemplateCount || 0;

  const chcButtons = hasContentHostingConfiguration
    ? `<button onclick="openContentHostingConfigurationForm('${sessionId}', true)" class="btn btn-secondary table-button">Show/Edit</button>
       <button onclick="downloadContentHostingConfiguration('${sessionId}')" class="btn btn-secondary table-button">Download</button>
       <button onclick="deleteContentHostingConfiguration('${sessionId}')" class="btn btn-danger table-button">Delete</button>`
    : `<button onclick="openContentHostingConfigurationForm('${sessionId}', false)" class="btn btn-primary table-button">Create</button>`;

  const certButtons = hasServerCertificates
    ? `<button onclick="createNewCertificate('${sessionId}')" class="btn btn-primary table-button">Create</button>
       <button onclick="showCertificateDetails('${sessionId}')" class="btn btn-secondary table-button">Show</button>`
    : `<button onclick="createNewCertificate('${sessionId}')" class="btn btn-primary table-button">Create</button>`;

  const consumptionLabel = hasConsumptionReportingConfiguration ? 'Edit' : 'Create';
  const consumptionButtons = hasConsumptionReportingConfiguration
    ? `<button onclick="setConsumptionReporting('${sessionId}')" class="btn btn-primary table-button">${consumptionLabel}</button>
       <button onclick="deleteConsumptionReporting('${sessionId}')" class="btn btn-danger table-button">Delete</button>`
    : `<button onclick="setConsumptionReporting('${sessionId}')" class="btn btn-primary table-button">Create</button>`;

  const policyButtons = hasPolicyTemplates
    ? `<button onclick="openPolicyTemplateForm('${sessionId}')" class="btn btn-primary table-button">Create</button>
       <button onclick="listAllPolicyTemplate('${sessionId}')" class="btn btn-secondary table-button">List</button>`
    : `<button onclick="openPolicyTemplateForm('${sessionId}')" class="btn btn-primary table-button">Create</button>`;

  const metricsButtons = hasMetricsReportingConfiguration
    ? `<button onclick="createMetricsJson('${sessionId}')" class="btn btn-primary table-button">Create</button>
       <button onclick="showMetricsReporting('${sessionId}')" class="btn btn-secondary table-button">Show</button>`
    : `<button onclick="createMetricsJson('${sessionId}')" class="btn btn-primary table-button">Create</button>`;

  const card = document.createElement('div');
  card.className = 'session-card';
  card.setAttribute('data-session-id', sessionId);
  card.innerHTML = `
    <div class="session-card-header">
      <div class="session-card-title">
        ${name ? `<span class="session-name">${name}</span>` : ''}
        <span class="session-id-text">${sessionId}</span>
      </div>
      <input type="checkbox" class="session-checkbox" data-session-id="${sessionId}"
             onchange="toggleSessionSelection(this)" ${selectedSessions.has(sessionId) ? 'checked' : ''}>
    </div>
    <div class="session-card-body">
      <div class="session-row">
        ${sessionStatusDot(hasContentHostingConfiguration)}
        <div class="session-row-label-group">
          <span class="session-row-label">Content Hosting Configuration</span>
          ${sessionRowDetail(chcDetailText(info.chcDetail))}
        </div>
        <div class="session-row-actions">${chcButtons}</div>
      </div>
      <div class="session-row">
        ${sessionStatusDot(hasServerCertificates)}
        <div class="session-row-label-group">
          <span class="session-row-label">Server Certificates</span>
          ${sessionRowDetail(certCount === 0 ? 'none' : `${certCount} certificate${certCount !== 1 ? 's' : ''}`)}
        </div>
        <div class="session-row-actions">${certButtons}</div>
      </div>
      <div class="session-row">
        ${sessionStatusDot(!!info.chcDetail?.protocol)}
        <div class="session-row-label-group">
          <span class="session-row-label">Content Protocols</span>
          ${sessionRowDetail(info.chcDetail?.protocol ? `<span class="detail-mono">${info.chcDetail.protocol}</span>` : '')}
        </div>
        <div class="session-row-actions">
          <button onclick="showProtocols('${sessionId}')" class="btn btn-secondary table-button">Show</button>
        </div>
      </div>
      <div class="session-row">
        ${sessionStatusDot(hasConsumptionReportingConfiguration)}
        <div class="session-row-label-group">
          <span class="session-row-label">Consumption Reporting</span>
          ${sessionRowDetail(consumptionDetailText(info.consumptionDetail))}
        </div>
        <div class="session-row-actions">${consumptionButtons}</div>
      </div>
      <div class="session-row">
        ${sessionStatusDot(hasPolicyTemplates)}
        <div class="session-row-label-group">
          <span class="session-row-label">Policy Templates</span>
          ${sessionRowDetail(policyCount === 0 ? 'none' : `${policyCount} template${policyCount !== 1 ? 's' : ''}`)}
        </div>
        <div class="session-row-actions">${policyButtons}</div>
      </div>
      <div class="session-row">
        ${sessionStatusDot(hasMetricsReportingConfiguration)}
        <div class="session-row-label-group">
          <span class="session-row-label">Metrics Reporting</span>
          ${sessionRowDetail(metricsDetailText(info.metricsDetail))}
        </div>
        <div class="session-row-actions">${metricsButtons}</div>
      </div>
      <div class="session-row session-row--details">
        <div class="session-row-label-group" style="margin-left:18px">
          <span class="session-row-label">Session Details</span>
        </div>
        <div class="session-row-actions">
          <button onclick="openDetails(['${sessionId}'])" class="btn btn-secondary table-button">Details</button>
        </div>
      </div>
    </div>
  `;
  list.appendChild(card);
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
    const sessionIds = data.session_ids || [];
    sessionUiInfo = {};
    try {
      const infoResp = await fetch(`${operatingUrl}provisioning_sessions/build_Informations_for_UI`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      if (infoResp.ok) {
        const infoData = await infoResp.json();
        sessionUiInfo = infoData.sessions || {};
      }
    } catch (err) {
      console.warn('Failed to load UI info:', err);
    }
    const liveIds = new Set(sessionIds);
    let cleaned = false;
    selectedSessions.forEach(id => {
      if (!liveIds.has(id)) {
        selectedSessions.delete(id);
        cleaned = true;
      }
    });
    if (cleaned) {
      localStorage.setItem(LS_KEY, JSON.stringify([...selectedSessions]));
    }
    sessionIds.forEach(sessionId => addSessionToTable(sessionId));
    const countEl = document.getElementById('session-count');
    if (countEl) countEl.textContent = sessionIds.length;
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
    document.dispatchEvent(new Event('sessions:reload'));
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
  delete sessionUiInfo[sessionId];
  localStorage.setItem(LS_KEY, JSON.stringify([...selectedSessions]));
}

function clearTable() {
  const list = document.getElementById('sessions-list');
  if (list) list.innerHTML = '';
}

document.addEventListener('sessions:reload', async () => {
  clearTable();
  await loadAllSessions();
});

window.onload = function () {
  checkAFstatus();
  setInterval(checkAFstatus, 5000);
};

function exportPSConfiguration() {
  console.log("Exporting PS Configuration...");
  fetch(`${operatingUrl}export_ps_configuration`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  })
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to export configuration!');
      }
      return response.blob();
    })
    .then(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'provisioning_session_configurations.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    })
    .catch(error => {
      console.error('Error exporting configuration:', error);
      notifyError('Unexpected error while exporting configuration.');
    });
}

async function importPSConfiguration() {
  const ok = await confirmPrompt({
    message: 'Importing will replace all existing sessions. Continue?',
    confirmText: 'Import',
    cancelText: 'Cancel',
    tone: 'danger'
  });
  if (!ok) return;

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'application/json';
  fileInput.onchange = async (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const content = e.target.result;
        try {
          const response = await fetch(`${operatingUrl}import_ps_configuration`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: content
          });
          if (response.ok) {
            notifySuccess('Provisioning session configuration imported successfully.');
            document.dispatchEvent(new Event('sessions:reload'));
          } else {
            const errorData = await response.json();
            notifyError(`Failed to import configuration: ${errorData.detail}`);
          }
        } catch (error) {
          console.error('Error importing configuration:', error);
          notifyError('Unexpected error while importing configuration.');
        }
      };
      reader.readAsText(file);
    }
  };
  fileInput.click();
}