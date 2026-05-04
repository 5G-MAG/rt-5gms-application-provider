/*
License: 5G-MAG Public License (v1.0)
Author: Erik Gaida, Vuk Stojkovic
Copyright: (C) Fraunhofer FOKUS
For full license terms please see the LICENSE file distributed with this
program. If this file is missing then the license can be retrieved from
https://drive.google.com/file/d/1cinCiA778IErENZ3JN52VFW-1ffHpx7Z/view
*/

import { notifyInfo, notifySuccess, notifyError, confirmPrompt } from './notify.js';
let operatingUrl = '';

const METRIC_OPTIONS = [
    { id: 'metric1', value: 'urn:3GPP:ns:PSS:DASH:QM10#HTTPList', label: 'HTTP List', group: 'Release 17' },
    { id: 'metric2', value: 'urn:3GPP:ns:PSS:DASH:QM10#BufferLevel', label: 'Buffer Level', group: 'Release 17' },
    { id: 'metric3', value: 'urn:3GPP:ns:PSS:DASH:QM10#RepSwitchList', label: 'Representation Switch List', group: 'Release 17' },
    { id: 'metric4', value: 'urn:3GPP:ns:PSS:DASH:QM10#MPDInformation', label: 'MPD Information', group: 'Release 17' },
    { id: 'metric5', value: 'urn:3gpp:metadata:2020:VR:metrics#RenderedViewports', label: 'Rendered Viewports', group: 'Release 17' },
    { id: 'metric10', value: 'urn:3GPP:ns:PSS:DASH:QM10#InitialPlayoutDelay', label: 'Initial Playout Delay', group: 'Release 17' },
    { id: 'metric11', value: 'urn:3GPP:ns:PSS:DASH:QM10#PlayoutDelayforMediaStartup', label: 'Playout Delay for Media Startup', group: 'Release 17' },
    { id: 'metric12', value: 'urn:3GPP:ns:PSS:DASH:QM10#DeviceInformation', label: 'Device Information', group: 'Release 17' },
    { id: 'metric13', value: 'urn:3GPP:ns:PSS:DASH:QM10#AvgThroughput', label: 'Average Throughput', group: 'Release 17' },
    { id: 'metric14', value: 'urn:3GPP:ns:PSS:DASH:QM10#PlayList', label: 'Play List', group: 'Release 17' },
    { id: 'metric6', value: 'urn:3gpp:5gms:metrics:common-media-client-data:session', label: 'CMCD-client-data:Session', group: 'Release 19' },
    { id: 'metric7', value: 'urn:3gpp:5gms:metrics:common-media-client-data:object', label: 'CMCD-client-data:object', group: 'Release 19' },
    { id: 'metric8', value: 'urn:3gpp:5gms:metrics:common-media-client-data:request', label: 'CMCD-client-data:request', group: 'Release 19' },
    { id: 'metric9', value: 'urn:3gpp:5gms:metrics:common-media-client-data:status', label: 'CMCD-client-data:status', group: 'Release 19' }
];

const METRIC_LABEL_BY_VALUE = METRIC_OPTIONS.reduce((acc, metric) => {
    acc[String(metric.value).toLowerCase()] = metric.label;
    return acc;
}, {});

function getMetricDisplayLabel(metricValue) {
    const key = String(metricValue ?? '').toLowerCase();
    return METRIC_LABEL_BY_VALUE[key] || String(metricValue ?? '-');
}

function getMetricsDetailsModalHtml(sessionId, metricsId, configuration) {
    const urlFilters = Array.isArray(configuration?.urlFilters) ? configuration.urlFilters : [];
    const metrics = Array.isArray(configuration?.metrics) ? configuration.metrics : [];

    const urlFiltersHtml = urlFilters.length > 0
        ? `<ul style="margin:0; padding-left:18px; color:#111827;">
            ${urlFilters.map(filter => `<li style="margin:4px 0; word-break:break-all;">${filter}</li>`).join('')}
          </ul>`
        : `<div style="color:#6b7280;">-</div>`;

    const metricsHtml = metrics.length > 0
        ? `<ul style="margin:0; padding-left:18px; color:#111827;">
            ${metrics.map(metric => `
                <li style="margin:8px 0;">
                  <div style="font-weight:600;">${getMetricDisplayLabel(metric)}</div>
                  <div style="font-size:12px; color:#6b7280; word-break:break-all;">${metric}</div>
                </li>
            `).join('')}
          </ul>`
        : `<div style="color:#6b7280;">-</div>`;

    const rows = [
        ['ID', metricsId],
        ['Scheme', configuration?.scheme || '-'],
        ['Data Network Name', configuration?.dataNetworkName || '-'],
        ['Reporting Interval', configuration?.reportingInterval ?? '-'],
        ['Sample Percentage', configuration?.samplePercentage ?? '-'],
        ['Sampling Period', configuration?.samplingPeriod ?? '-']
    ];

    return `
    <div id="MetricsDetailsModal-${sessionId}-${metricsId}" class="modal" style="display:flex;">
      <div class="modal-content" style="max-width:760px; display:flex; flex-direction:column; max-height:85vh; padding:0;">
        <div class="modal-header" style="padding:16px; border-bottom:1px solid #e5e7eb; background:#fff; display:flex; justify-content:space-between; align-items:center;">
          <div style="display:flex; flex-direction:column; gap:2px;">
            <h3 style="margin:0; font-weight:600;">Metrics Configuration Details</h3>
            <div style="font-size:12px; color:#6b7280; font-family:monospace;">Provisioning Session ID: ${sessionId}</div>
          </div>
          <button type="button" data-close style="background:none; border:none; font-size:20px; cursor:pointer;">&times;</button>
        </div>
        <div class="modal-body" style="padding:16px; overflow-y:auto; background-color:#fff; display:flex; flex-direction:column; gap:12px;">
          <div style="background:#f9fafb; border:1px solid #e5e7eb; border-radius:8px; padding:12px;">
            ${rows.map(([label, value]) => `
              <div style="display:flex; gap:12px; padding:6px 0; border-bottom:1px solid #eef2f7;">
                <div style="min-width:170px; font-size:12px; text-transform:uppercase; color:#6b7280; font-weight:700; letter-spacing:0.05em;">${label}</div>
                <div style="color:#111827; font-weight:500; word-break:break-all;">${value}</div>
              </div>
            `).join('')}
          </div>

          <div style="background:#f9fafb; border:1px solid #e5e7eb; border-radius:8px; padding:12px;">
            <div style="font-size:12px; text-transform:uppercase; color:#6b7280; font-weight:700; letter-spacing:0.05em; margin-bottom:6px;">URL Filters</div>
            ${urlFiltersHtml}
          </div>

          <div style="background:#f9fafb; border:1px solid #e5e7eb; border-radius:8px; padding:12px;">
            <div style="font-size:12px; text-transform:uppercase; color:#6b7280; font-weight:700; letter-spacing:0.05em; margin-bottom:6px;">Metrics</div>
            ${metricsHtml}
          </div>
        </div>
        <div class="modal-footer" style="padding:12px 16px; border-top:1px solid #e5e7eb; background:#f9fafb; text-align:right;">
          <button type="button" class="btn btn-secondary" data-close>Close</button>
        </div>
      </div>
    </div>`;
}

async function openMetricsDetailsModal(sessionId, metricsId) {
    try {
        const response = await fetch(`${operatingUrl}show_metrics/${sessionId}/${metricsId}`, { method: 'GET' });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `Error ${response.status}: ${response.statusText}`);
        }

        const configuration = await response.json();
        const modalId = `MetricsDetailsModal-${sessionId}-${metricsId}`;
        const previousModal = document.getElementById(modalId);
        if (previousModal) previousModal.remove();

        const wrapper = document.createElement('div');
        wrapper.innerHTML = getMetricsDetailsModalHtml(sessionId, metricsId, configuration);
        const modal = wrapper.firstElementChild;
        document.body.appendChild(modal);

        const closeModal = () => modal.remove();
        modal.querySelectorAll('[data-close]').forEach(btn => {
            btn.onclick = closeModal;
        });
        modal.addEventListener('click', (event) => {
            if (event.target === modal) closeModal();
        });
    } catch (error) {
        console.error('Error:', error);
        notifyError(error.message || 'Failed to load metrics details.');
    }
}

function getMetricsCheckboxesHtml(sessionId, group) {
    return METRIC_OPTIONS
        .filter(metric => metric.group === group)
        .map(metric => `
            <label for="${metric.id}-${sessionId}" style="display:flex; align-items:center; gap:10px; margin:0; font-weight:500;">
              <input type="checkbox" id="${metric.id}-${sessionId}" value="${metric.value}" style="width:auto; margin:0;">
              <span>${metric.label}</span>
            </label>
        `)
        .join('');
}

function getMetricsReportingModalHtml(sessionId) {
    return `
    <div id="MetricsReportingModal-${sessionId}" class="modal">
      <div class="modal-content" style="display:flex; flex-direction:column; max-height:90vh; padding:0;">
        <div class="modal-header"
             style="position:sticky; top:0; z-index:2; background:#fff;
                    padding:12px 16px; border-bottom:1px solid #e5e7eb;
                    display:flex; flex-direction:column; align-items:flex-start; gap:2px;">
          <h3 style="margin:0; font-weight:600;">Create Metrics Reporting Configuration</h3>
          <div style="margin:0; font-weight:600; font-size:12px; color:#6b7280; letter-spacing:.02em;">
            3GPP TS 26.512 - Release 17/19
          </div>
          <div style="margin:0; font-size:12px; color:#6b7280; font-family:monospace;">
            Provisioning Session ID: ${sessionId}
          </div>
        </div>

        <form id="metrics-form-modal-${sessionId}" novalidate
              style="display:flex; flex-direction:column; flex:1; min-height:0;">
          <div class="form-scrollable"
               style="flex:1 1 auto; overflow:auto; padding:16px; display:flex; flex-direction:column; gap:16px;">

            <div id="metrics-error-${sessionId}" style="display:none; color:#c00; font-weight:bold; border:1px solid #c00; padding:8px; border-radius:4px;"></div>

            <div class="form-row" style="display:flex; gap:12px; flex-wrap:wrap;">
              <div class="form-group" style="flex:1; min-width:220px;">
                <label for="scheme-${sessionId}">Scheme:</label>
                <input id="scheme-${sessionId}" type="text" placeholder="Scheme">
              </div>
              <div class="form-group" style="flex:1; min-width:220px;">
                <label for="dataNetworkName-${sessionId}">Data Network Name:</label>
                <input id="dataNetworkName-${sessionId}" type="text" placeholder="Data Network Name">
              </div>
            </div>

            <div class="form-row" style="display:flex; gap:12px; flex-wrap:wrap;">
              <div class="form-group" style="flex:1; min-width:220px;">
                <label for="reportingInterval-${sessionId}">Reporting Interval (seconds):</label>
                <input id="reportingInterval-${sessionId}" type="number" min="1" placeholder="e.g. 10">
              </div>
              <div class="form-group" style="flex:1; min-width:220px;">
                <label for="samplePercentage-${sessionId}">Sample Percentage:</label>
                <input id="samplePercentage-${sessionId}" type="number" min="0" max="100" placeholder="e.g. 100">
              </div>
            </div>

            <div class="form-row" style="display:flex; gap:12px; flex-wrap:wrap;">
              <div class="form-group" style="flex:1; min-width:220px;">
                <label for="urlFilters-${sessionId}">URL Filters (comma-separated):</label>
                <input id="urlFilters-${sessionId}" type="text" placeholder="/path1,/path2">
              </div>
              <div class="form-group" style="flex:1; min-width:220px;">
                <label for="samplingPeriod-${sessionId}">Sampling Period (seconds):</label>
                <input id="samplingPeriod-${sessionId}" type="number" min="1" required placeholder="e.g. 5">
              </div>
            </div>

            <fieldset style="margin:0;">
              <legend>Metrics To Report</legend>
              <div style="border-left: 4px solid #f0f9ff; padding-left: 16px; display:flex; flex-direction:column; gap:14px;">
                <div>
                  <h4 style="color:#0ea5e9; font-weight:700; font-size:14px; margin:0 0 8px 0;">Release 17</h4>
                  <div style="display:flex; flex-direction:column; gap:8px;">
                    ${getMetricsCheckboxesHtml(sessionId, 'Release 17')}
                  </div>
                </div>
                <div>
                  <h4 style="color:#0ea5e9; font-weight:700; font-size:14px; margin:0 0 8px 0;">Release 19</h4>
                  <div style="display:flex; flex-direction:column; gap:8px;">
                    ${getMetricsCheckboxesHtml(sessionId, 'Release 19')}
                  </div>
                </div>
              </div>
            </fieldset>
          </div>

          <div class="modal-footer"
               style="position:sticky; bottom:0; z-index:2; background:#fff;
                      border-top:1px solid #e5e7eb; padding:12px 16px;
                      display:flex; justify-content:flex-end; gap:10px;">
            <button type="button" class="btn btn-danger" data-close>Cancel</button>
            <button type="submit" class="btn btn-success">Create Metrics Reporting Configuration</button>
          </div>
        </form>
      </div>
    </div>
    `;
}

function showMetricsError(sessionId, message) {
    const errorBox = document.getElementById(`metrics-error-${sessionId}`);
    if (!errorBox) return;
    errorBox.innerText = message;
    errorBox.style.display = 'block';
}

function clearMetricsError(sessionId) {
    const errorBox = document.getElementById(`metrics-error-${sessionId}`);
    if (!errorBox) return;
    errorBox.innerText = '';
    errorBox.style.display = 'none';
}

function setMetricsFieldInvalid(fieldElement) {
    if (!fieldElement) return;
    fieldElement.style.border = '2px solid #dc2626';
    fieldElement.setAttribute('aria-invalid', 'true');
}

function clearMetricsFieldInvalid(fieldElement) {
    if (!fieldElement) return;
    fieldElement.style.border = '';
    fieldElement.removeAttribute('aria-invalid');
}

function clearAllMetricsFieldInvalid(sessionId) {
    const form = document.getElementById(`metrics-form-modal-${sessionId}`);
    if (!form) return;
    form.querySelectorAll('input, select, textarea').forEach(clearMetricsFieldInvalid);
}

function setupMetricsValidationListeners(sessionId) {
    const form = document.getElementById(`metrics-form-modal-${sessionId}`);
    if (!form) return;
    form.querySelectorAll('input, select, textarea').forEach((field) => {
        const clear = () => clearMetricsFieldInvalid(field);
        field.addEventListener('input', clear);
        field.addEventListener('change', clear);
    });
}

function buildMetricsPayload(sessionId) {
    const schemeField = document.getElementById(`scheme-${sessionId}`);
    const dataNetworkNameField = document.getElementById(`dataNetworkName-${sessionId}`);
    const reportingIntervalField = document.getElementById(`reportingInterval-${sessionId}`);
    const samplePercentageField = document.getElementById(`samplePercentage-${sessionId}`);
    const urlFiltersField = document.getElementById(`urlFilters-${sessionId}`);
    const samplingPeriodField = document.getElementById(`samplingPeriod-${sessionId}`);

    const scheme = schemeField?.value || '';
    const dataNetworkName = (dataNetworkNameField?.value || '').trim();
    const reportingIntervalRaw = (reportingIntervalField?.value || '').trim();
    const samplePercentageRaw = (samplePercentageField?.value || '').trim();
    const urlFiltersRaw = (urlFiltersField?.value || '').trim();
    const samplingPeriodRaw = (samplingPeriodField?.value || '').trim();
    const reportingInterval = Number(reportingIntervalRaw);
    const samplePercentage = Number(samplePercentageRaw);
    const samplingPeriod = Number(samplingPeriodRaw);

    const missingFields = [];
    if (!samplingPeriodRaw) missingFields.push({ label: 'Sampling Period', field: samplingPeriodField });

    if (missingFields.length > 0) {
        missingFields.forEach(({ field }) => setMetricsFieldInvalid(field));
        if (missingFields.length === 1) {
            showMetricsError(sessionId, `${missingFields[0].label} is mandatory value`);
        } else {
            showMetricsError(sessionId, 'Please fill all mandatory fields.');
        }
        return null;
    }

    if (!Number.isInteger(samplingPeriod) || samplingPeriod <= 0) {
        setMetricsFieldInvalid(samplingPeriodField);
        showMetricsError(sessionId, 'Sampling Period must be positive value.');
        return null;
    }
    if (reportingIntervalRaw && (!Number.isInteger(reportingInterval) || reportingInterval <= 0)) {
        setMetricsFieldInvalid(reportingIntervalField);
        showMetricsError(sessionId, 'Reporting Interval must be a positive value');
        return null;
    }
    if (samplePercentageRaw && (!Number.isFinite(samplePercentage) || samplePercentage < 0.0 || samplePercentage > 100.0)) {
        setMetricsFieldInvalid(samplePercentageField);
        showMetricsError(sessionId, 'Sample Percentage must be between 0.0 and 100.0');
        return null;
    }
    const metrics = [];
    METRIC_OPTIONS.forEach(metric => {
        const metricCheckbox = document.getElementById(`${metric.id}-${sessionId}`);
        if (metricCheckbox && metricCheckbox.checked) {
            metrics.push(metricCheckbox.value);
        }
    });

    const payload = {
        samplingPeriod: samplingPeriod
    };
    if (scheme.trim() !== '') payload.scheme = scheme.trim();
    if (dataNetworkName !== '') payload.dataNetworkName = dataNetworkName;
    if (reportingIntervalRaw) payload.reportingInterval = reportingInterval;
    if (samplePercentageRaw) payload.samplePercentage = samplePercentage;
    if (urlFiltersRaw) {
        payload.urlFilters = urlFiltersRaw.split(',').map(item => item.trim()).filter(item => item !== '');
    }
    if (metrics.length > 0) payload.metrics = metrics;

    return payload;
}

export async function createMetricsJson(sessionId) {
    const modalId = `MetricsReportingModal-${sessionId}`;
    const previousModal = document.getElementById(modalId);
    if (previousModal) previousModal.remove();

    const wrapper = document.createElement('div');
    wrapper.innerHTML = getMetricsReportingModalHtml(sessionId);
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

    const form = document.getElementById(`metrics-form-modal-${sessionId}`);
    if (!form) return;
    setupMetricsValidationListeners(sessionId);

    form.onsubmit = async (event) => {
        event.preventDefault();
        clearMetricsError(sessionId);
        clearAllMetricsFieldInvalid(sessionId);

        const payload = buildMetricsPayload(sessionId);
        if (!payload) return;

        const result = await postMetricsData(sessionId, payload);
        if (result.ok) {
            notifySuccess(`Metrics Reporting Configuration created (ID: ${result.metricsReportingConfigurationId})`);
            closeModal();
            return;
        }
        showMetricsError(sessionId, result.errorMessage || 'An unexpected error occurred while creating the metrics reporting configuration.');
    };
}
  
  export async function postMetricsData(sessionId, metricsConfiguration) {
    try {
        const response = await fetch(`${operatingUrl}create_metrics/${sessionId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(metricsConfiguration)
        });
  
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return {
                ok: false,
                errorMessage: errorData.detail || 'An error occurred while creating the metrics reporting configuration.'
            };
        } else {
            const result = await response.json();
            document.dispatchEvent(new Event('sessions:reload'));
            return {
                ok: true,
                metricsReportingConfigurationId: result.metrics_reporting_configuration_id
            };
        }
    } catch (error) {
        console.error('Error:', error);
        return {
            ok: false,
            errorMessage: 'An unexpected error occurred.'
        };
    }
  }
  
  export async function showMetricsReporting(sessionId) {
    try {
        const metricsIDs = await fetchMetricsConfigurationIDs(sessionId);
        if (metricsIDs.length === 0) {
            notifyInfo('There are no metrics configurations available for this session.');
            return;
        }

        const modalId = `MetricsListModal-${sessionId}`;
        const previousModal = document.getElementById(modalId);
        if (previousModal) previousModal.remove();

        const listContent = metricsIDs.map((id) => `
            <div id="metrics-row-${sessionId}-${id}" style="background:#f9fafb; border:1px solid #e5e7eb; padding:12px; border-radius:6px; display:flex; flex-direction:column; gap:12px; align-items:flex-start;">
              <div style="width:100%;">
                <span style="font-size:11px; text-transform:uppercase; color:#6b7280; font-weight:700; letter-spacing:0.05em; display:block; margin-bottom:2px;">ID</span>
                <div style="font-family:monospace; font-size:14px; font-weight:600; color:#111827; word-break:break-all;">
                  ${id}
                </div>
              </div>
              <div style="display:flex; gap:8px; align-self:flex-end;">
                <button type="button" id="btn-show-metrics-${sessionId}-${id}" style="background-color:#2563eb; color:white; border:none; padding:6px 12px; border-radius:4px; font-size:12px; cursor:pointer;">
                  Open Details
                </button>
                <button type="button" id="btn-delete-metrics-${sessionId}-${id}" style="background-color:#dc2626; color:white; border:none; padding:6px 12px; border-radius:4px; font-size:12px; cursor:pointer;">
                  Delete
                </button>
              </div>
            </div>
        `).join('');

        const modalHtml = `
        <div id="${modalId}" class="modal" style="display:flex;">
          <div class="modal-content" style="max-width:520px; display:flex; flex-direction:column; max-height:80vh; padding:0;">
            <div class="modal-header" style="padding:16px; border-bottom:1px solid #e5e7eb; background:#fff; display:flex; justify-content:space-between; align-items:center;">
              <div style="display:flex; flex-direction:column; gap:2px;">
                <h3 style="margin:0; font-weight:600;">Metrics Reporting Configurations</h3>
                <div style="font-size:12px; color:#6b7280; font-family:monospace;">Provisioning Session ID: ${sessionId}</div>
              </div>
              <button type="button" data-close style="background:none; border:none; font-size:20px; cursor:pointer;">&times;</button>
            </div>
            <div class="modal-body" style="padding:16px; overflow-y:auto; background-color:#fff;">
              <div id="metrics-list-${sessionId}" style="display:flex; flex-direction:column; gap:8px;">
                ${listContent}
              </div>
            </div>
            <div class="modal-footer" style="padding:12px 16px; border-top:1px solid #e5e7eb; background:#f9fafb; text-align:right;">
              <button type="button" class="btn btn-secondary" data-close>Close</button>
            </div>
          </div>
        </div>`;

        const wrapper = document.createElement('div');
        wrapper.innerHTML = modalHtml;
        const modal = wrapper.firstElementChild;
        document.body.appendChild(modal);

        const closeModal = () => modal.remove();
        modal.querySelectorAll('[data-close]').forEach(btn => {
            btn.onclick = closeModal;
        });
        modal.addEventListener('click', (event) => {
            if (event.target === modal) closeModal();
        });

        const listContainer = document.getElementById(`metrics-list-${sessionId}`);

        metricsIDs.forEach((id) => {
            const showButton = document.getElementById(`btn-show-metrics-${sessionId}-${id}`);
            if (showButton) {
                showButton.onclick = () => {
                    openMetricsDetailsModal(sessionId, id);
                };
            }

            const deleteButton = document.getElementById(`btn-delete-metrics-${sessionId}-${id}`);
            if (!deleteButton) return;
            deleteButton.onclick = async () => {
                const isConfirmed = await confirmPrompt({
                    message: `Configuration ${id} will be deleted permanently.`,
                    confirmText: 'Yes',
                    cancelText: 'Cancel',
                    tone: 'danger'
                });
                if (!isConfirmed) return;

                const deleted = await deleteMetrics(sessionId, id);
                if (!deleted) return;

                const row = document.getElementById(`metrics-row-${sessionId}-${id}`);
                row?.remove();

                if (listContainer && listContainer.children.length === 0) {
                    listContainer.outerHTML = `
                        <div style="text-align:center; padding:30px; color:#6b7280;">
                          <p style="margin:0; font-weight:500;">No Metrics Configurations found.</p>
                        </div>`;
                }
            };
        });
    } catch (error) {
        console.error('Error:', error);
        notifyError('No provisioned Metrics Reporting Configurations');
    }
  }
  
  export async function fetchMetricsConfigurationIDs(sessionId) {
    const response = await fetch(`${operatingUrl}list_metrics_ids/${sessionId}`);
    if (!response.ok) {
        throw new Error('Failed to fetch metrics configurations');
    }
    return await response.json();
  }
  
  export async function deleteMetrics(sessionId, metricsId) {
    try {
        const response = await fetch(`${operatingUrl}delete_metrics/${sessionId}/${metricsId}`, {
            method: 'DELETE'
        });
        if (response.ok) {
            notifySuccess(`The metrics configuration ${metricsId} has been deleted.`);
            document.dispatchEvent(new Event('sessions:reload'));
            return true;
        } else {
            throw new Error('Failed to delete the metrics configuration');
        }
    } catch (error) {
        console.error('Error:', error);
        notifyError(error.message || 'Failed to delete the metrics configuration.');
        return false;
    }
  }