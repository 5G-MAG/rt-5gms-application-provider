/*
License: 5G-MAG Public License (v1.0)
Author: Vuk Stojkovic
Copyright: (C) Fraunhofer FOKUS
For full license terms please see the LICENSE file distributed with this
program. If this file is missing then the license can be retrieved from
https://drive.google.com/file/d/1cinCiA778IErENZ3JN52VFW-1ffHpx7Z/view
*/

import { fetchHtmlForm } from '../utils.js'; 
let operatingUrl = '';

export async function createMetricsJson(sessionId) {
    const metricsReportingForm = await fetchHtmlForm('src/forms/metricsReporting.html');

    const { value: formValues } = await Swal.fire({
        title: 'Create Metrics Reporting Configuration',
        html: metricsReportingForm,
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
  
  export async function showMetricsReporting(sessionId) {
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
  
  export async function fetchMetricsConfigurationIDs(sessionId) {
    const response = await fetch(`${operatingUrl}list_metrics_ids/${sessionId}`);
    if (!response.ok) {
        throw new Error('Failed to fetch metrics configurations');
    }
    return await response.json();
  }
  
  export async function deleteMetricsConfiguration(sessionId) {
    try {
        const metricsIDs = await fetchMetricsConfigurationIDs(sessionId);
        if (metricsIDs.length === 0) {
            Swal.fire('No Metrics Configurations', 'There are no metrics configurations available for this session.', 'info');
            return;
        }
        const linksHtml = metricsIDs.map(id => 
            `<button class="swal2-confirm swal2-styled" onclick="confirmMetricsDeletion('${sessionId}', '${id}')">${id}</button>`
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
  
  export async function confirmMetricsDeletion(sessionId, metricsId) {
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
  
  export async function deleteMetrics(sessionId, metricsId) {
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
  