/*
License: 5G-MAG Public License (v1.0)
Author: Erik Gaida, Vuk Stojkovic
Copyright: (C) Fraunhofer FOKUS
For full license terms please see the LICENSE file distributed with this
program. If this file is missing then the license can be retrieved from
https://drive.google.com/file/d/1cinCiA778IErENZ3JN52VFW-1ffHpx7Z/view
*/

import { notifySuccess, notifyError, confirmPrompt } from './notify.js';

let operatingUrl =  '';

function setConsumptionFieldInvalid(fieldElement) {
  if (!fieldElement) return;
  fieldElement.style.border = '2px solid #dc2626';
  fieldElement.setAttribute('aria-invalid', 'true');
}

function clearConsumptionFieldInvalid(fieldElement) {
  if (!fieldElement) return;
  fieldElement.style.border = '';
  fieldElement.removeAttribute('aria-invalid');
}

function clearAllConsumptionFieldInvalid(sessionId) {
  const form = document.getElementById(`consumption-form-modal-${sessionId}`);
  if (!form) return;
  form.querySelectorAll('input, select, textarea').forEach(clearConsumptionFieldInvalid);
}

function setupConsumptionValidationListeners(sessionId) {
  const form = document.getElementById(`consumption-form-modal-${sessionId}`);
  if (!form) return;
  form.querySelectorAll('input, select, textarea').forEach((field) => {
    const clear = () => clearConsumptionFieldInvalid(field);
    field.addEventListener('input', clear);
    field.addEventListener('change', clear);
  });
}

function showConsumptionError(sessionId, message) {
  const errorBox = document.getElementById(`consumption-error-${sessionId}`);
  if (!errorBox) return;
  errorBox.innerText = message;
  errorBox.style.display = 'block';
}

function clearConsumptionError(sessionId) {
  const errorBox = document.getElementById(`consumption-error-${sessionId}`);
  if (!errorBox) return;
  errorBox.innerText = '';
  errorBox.style.display = 'none';
}

function getConsumptionReportingModalHtml(sessionId) {
  return `
    <div id="ConsumptionReportingModal-${sessionId}" class="modal">
      <div class="modal-content" style="display:flex; flex-direction:column; max-height:90vh; padding:0;">
        <div class="modal-header"
             style="position:sticky; top:0; z-index:2; background:#fff;
                    padding:12px 16px; border-bottom:1px solid #e5e7eb;
                    display:flex; flex-direction:column; align-items:flex-start; gap:2px;">
          <h3 style="margin:0; font-weight:600;">Set Consumption Reporting Configuration</h3>
          <div style="margin:0; font-weight:600; font-size:12px; color:#6b7280; letter-spacing:.02em;">
            3GPP TS 26.512 - Release 17
          </div>
          <div style="margin:0; font-size:12px; color:#6b7280; font-family:monospace;">
            Provisioning Session ID: ${sessionId}
          </div>
        </div>

        <form id="consumption-form-modal-${sessionId}" novalidate
              style="display:flex; flex-direction:column; flex:1; min-height:0;">
          <div class="form-scrollable"
               style="flex:1 1 auto; overflow:auto; padding:16px; display:flex; flex-direction:column; gap:16px;">
            <div id="consumption-error-${sessionId}"
                 style="display:none; color:#c00; font-weight:bold; border:1px solid #c00; padding:8px; border-radius:4px;">
            </div>

            <div class="form-row" style="display:flex; gap:12px; flex-wrap:wrap;">
              <div class="form-group" style="flex:1; min-width:220px;">
                <label for="reportingInterval-${sessionId}">Reporting Interval (seconds):</label>
                <input id="reportingInterval-${sessionId}" type="number" min="1" step="1" placeholder="e.g. 10">
              </div>
              <div class="form-group" style="flex:1; min-width:220px;">
                <label for="samplePercentage-${sessionId}">Sample Percentage:</label>
                <input id="samplePercentage-${sessionId}" type="number" min="0" max="100" step="any" placeholder="e.g. 100">
              </div>
            </div>

            <div class="form-row" style="display:flex; gap:12px; flex-wrap:wrap;">
              <div class="form-group" style="flex:1; min-width:220px;">
                <label for="locationReporting-${sessionId}">Location Reporting:</label>
                <select id="locationReporting-${sessionId}">
                  <option value="">Not set</option>
                  <option value="true">True</option>
                  <option value="false">False</option>
                </select>
              </div>
              <div class="form-group" style="flex:1; min-width:220px;">
                <label for="accessReporting-${sessionId}">Access Reporting:</label>
                <select id="accessReporting-${sessionId}">
                  <option value="">Not set</option>
                  <option value="true">True</option>
                  <option value="false">False</option>
                </select>
              </div>
            </div>
          </div>

          <div class="modal-footer"
               style="position:sticky; bottom:0; z-index:2; background:#fff;
                      border-top:1px solid #e5e7eb; padding:12px 16px;
                      display:flex; justify-content:flex-end; gap:10px;">
            <button type="button" class="btn btn-danger" data-close>Cancel</button>
            <button type="submit" class="btn btn-success">Set Consumption Reporting Configuration</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

async function fetchConsumptionConfiguration(sessionId) {
  const response = await fetch(`${operatingUrl}show_consumption/${sessionId}`, { method: 'GET' });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Error ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  return data?.['Consumption Reporting'] || null;
}

function prefillConsumptionForm(sessionId, configuration) {
  if (!configuration || typeof configuration !== 'object') return;

  const reportingIntervalField = document.getElementById(`reportingInterval-${sessionId}`);
  const samplePercentageField = document.getElementById(`samplePercentage-${sessionId}`);
  const locationReportingField = document.getElementById(`locationReporting-${sessionId}`);
  const accessReportingField = document.getElementById(`accessReporting-${sessionId}`);

  if (reportingIntervalField && configuration.reportingInterval !== undefined) {
    reportingIntervalField.value = configuration.reportingInterval;
  }
  if (samplePercentageField && configuration.samplePercentage !== undefined) {
    samplePercentageField.value = configuration.samplePercentage;
  }
  if (locationReportingField && typeof configuration.locationReporting === 'boolean') {
    locationReportingField.value = String(configuration.locationReporting);
  }
  if (accessReportingField && typeof configuration.accessReporting === 'boolean') {
    accessReportingField.value = String(configuration.accessReporting);
  }
}

function buildConsumptionPayload(sessionId) {
  const reportingIntervalField = document.getElementById(`reportingInterval-${sessionId}`);
  const samplePercentageField = document.getElementById(`samplePercentage-${sessionId}`);
  const locationReportingField = document.getElementById(`locationReporting-${sessionId}`);
  const accessReportingField = document.getElementById(`accessReporting-${sessionId}`);

  const reportingIntervalRaw = (reportingIntervalField?.value || '').trim();
  const samplePercentageRaw = (samplePercentageField?.value || '').trim();
  const locationReportingRaw = (locationReportingField?.value || '').trim();
  const accessReportingRaw = (accessReportingField?.value || '').trim();

  const payload = {};

  if (reportingIntervalRaw) {
    const reportingInterval = Number(reportingIntervalRaw);
    if (!Number.isInteger(reportingInterval) || reportingInterval <= 0) {
      setConsumptionFieldInvalid(reportingIntervalField);
      showConsumptionError(sessionId, 'Reporting Interval must be a positive integer.');
      return null;
    }
    payload.reportingInterval = reportingInterval;
  }

  if (samplePercentageRaw) {
    const samplePercentage = Number(samplePercentageRaw);
    if (!Number.isFinite(samplePercentage) || samplePercentage < 0 || samplePercentage > 100) {
      setConsumptionFieldInvalid(samplePercentageField);
      showConsumptionError(sessionId, 'Sample Percentage must be between 0 and 100.');
      return null;
    }
    payload.samplePercentage = samplePercentage;
  }

  if (locationReportingRaw !== '') {
    payload.locationReporting = locationReportingRaw === 'true';
  }

  if (accessReportingRaw !== '') {
    payload.accessReporting = accessReportingRaw === 'true';
  }

  return payload;
}

async function postConsumptionData(sessionId, payload) {
  try {
    const response = await fetch(`${operatingUrl}set_consumption/${sessionId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        ok: false,
        errorMessage: errorData.detail || 'An error occurred while setting consumption parameters.'
      };
    }

    const data = await response.json().catch(() => ({}));
    document.dispatchEvent(new Event('sessions:reload'));
    return {
      ok: true,
      message: data.message || 'Consumption reporting parameters set successfully.'
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      ok: false,
      errorMessage: 'Network error or server not responding.'
    };
  }
}

export async function setConsumptionReporting(sessionId) {
  const modalId = `ConsumptionReportingModal-${sessionId}`;
  const previousModal = document.getElementById(modalId);
  if (previousModal) previousModal.remove();

  const wrapper = document.createElement('div');
  wrapper.innerHTML = getConsumptionReportingModalHtml(sessionId);
  const modal = wrapper.firstElementChild;
  document.body.appendChild(modal);
  modal.style.display = 'flex';

  const closeModal = () => modal.remove();
  modal.querySelectorAll('[data-close]').forEach(btn => {
    btn.onclick = closeModal;
  });
  modal.addEventListener('click', (event) => {
    if (event.target === modal) closeModal();
  });

  setupConsumptionValidationListeners(sessionId);

  try {
    const existingConfiguration = await fetchConsumptionConfiguration(sessionId);
    if (existingConfiguration) {
      prefillConsumptionForm(sessionId, existingConfiguration);
    }
  } catch (error) {
    console.warn('Could not prefill consumption reporting form:', error);
  }

  const form = document.getElementById(`consumption-form-modal-${sessionId}`);
  if (!form) return;

  form.onsubmit = async (event) => {
    event.preventDefault();
    clearConsumptionError(sessionId);
    clearAllConsumptionFieldInvalid(sessionId);

    const payload = buildConsumptionPayload(sessionId);
    if (!payload) return;

    const result = await postConsumptionData(sessionId, payload);
    if (!result.ok) {
      showConsumptionError(sessionId, result.errorMessage || 'An unexpected error occurred while setting consumption reporting.');
      return;
    }

    notifySuccess(result.message);
    closeModal();
  };
}

export async function deleteConsumptionReporting(sessionId) {
  const isConfirmed = await confirmPrompt({
    message: 'Delete Consumption Reporting? This action cannot be undone.',
    confirmText: 'Delete',
    cancelText: 'Cancel',
    tone: 'danger'
  });
  if (!isConfirmed) return;

  try {
    const response = await fetch(`${operatingUrl}del_consumption/${sessionId}`, {
      method: 'DELETE'
    });

    if (response.status === 204) {
      notifySuccess('Consumption reporting has been deleted.');
      document.dispatchEvent(new Event('sessions:reload'));
      return;
    }

    const data = await response.json().catch(() => ({}));
    notifyError(data.detail || 'Failed to delete consumption reporting.');
  } catch (error) {
    console.error('Error:', error);
    notifyError('Network error or server not responding.');
  }
}