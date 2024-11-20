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

export async function setConsumptionReporting(session_id) {
    
    const consumptionReportingForm = await fetchHtmlForm('src/forms/consumptionReporting.html');
    
    const { value: formValues, dismiss } = await Swal.fire({
      title: 'Set consumption reporting parameters:',
      html:consumptionReportingForm,
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
  
export async function showConsumptionReporting(sessionId){
    const url = `${operatingUrl}show_consumption/${sessionId}`;
    window.open(url, '_blank');
}
  
export async function deleteConsumptionReporting(sessionId) {
    const result = await Swal.fire({
      title: 'Delete Consumption Reporting?',
      text: "Are you sure? You won't be able to revert this.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes',
      cancelButtonText: 'No',
    });
  
    if (result.isConfirmed) {
      try {
        const response = await fetch(`${operatingUrl}/del_consumption/${sessionId}`, {
          method: 'DELETE',
        });
  
        if (response.status === 204) {
          await Swal.fire({
            title: 'Deleted Consumption Reporting!',
            text: 'The consumption reporting has been deleted.',
            icon: 'success',
            confirmButtonText: 'OK',
          });
        } else {
          const data = await response.json();
          await Swal.fire({
            title: 'Application Provider says:',
            text: data.detail,
            icon: 'error',
            confirmButtonText: 'OK',
          });
        }
      } catch (error) {
        await Swal.fire({
          title: 'Error',
          text: 'Network error or server not responding.',
          icon: 'error',
          confirmButtonText: 'OK',
        });
      }
    }
  }
  