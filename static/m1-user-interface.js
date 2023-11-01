/*
License: 5G-MAG Public License (v1.0)
Author: Vuk Stojkovic
Copyright: (C) Fraunhofer FOKUS
For full license terms please see the LICENSE file distributed with this
program. If this file is missing then the license can be retrieved from
https://drive.google.com/file/d/1cinCiA778IErENZ3JN52VFW-1ffHpx7Z/view
*/

async function createNewSession() {
  const response = await fetch('/create_session', { method: 'POST' });

  if(!response.ok){
    Swal.fire({
      title: 'Application Provider says:',
      text: 'Failed to create new session. Make sure that AF is running!',
      icon: 'error',
      confirmButtonText: 'OK'
    });
    return;
  }

  const data = await response.json();
  // alert(data.message);
  Swal.fire({
    title: 'Application Provider says:',
    text: `Created provisioning session with the ID: ${data.provisioning_session_id}`,
    icon: 'success',
    confirmButtonText: 'OK'
  });
  
  let session_table = document.getElementById('session_table');
  let row = session_table.insertRow(-1);
  let cell1 = row.insertCell(0);
  let cell2 = row.insertCell(1);
  let cell3 = row.insertCell(2);
  let cell4 = row.insertCell(3);
  let cell5 = row.insertCell(4);
  let cell6 = row.insertCell(5);
  let cell7 = row.insertCell(6);
  let cell8 = row.insertCell(7);
  let cell9 = row.insertCell(8);

  cell1.innerHTML = data.provisioning_session_id;
  cell2.innerHTML = `<button onclick="deleteProvisioningSession('${data.provisioning_session_id}')">Delete</button>`;
  cell3.innerHTML = `<button onclick="createChcFromJson('${data.provisioning_session_id}')">Create</button>`;
  cell4.innerHTML = `<button onclick="getProvisioningSessionDetails()">Show</button>`;
  cell5.innerHTML = `<button onclick="createNewCertificate('${data.provisioning_session_id}')">Create</button>`;
  cell6.innerHTML = data.certificate_id ? `<button onclick="showCertificateDetails('${data.provisioning_session_id}', '${data.certificate_id}')">Show</button>` : 'Not yet created';
  cell7.innerHTML = `<button onclick="listContentProtocols('${data.provisioning_session_id}')">Show</button>`;
  cell8.innerHTML = `<button onclick="getChcWithoutCertificate('${data.provisioning_session_id}')">Create</button>`;
  cell9.innerHTML = `
  <button onclick="setConsumptionReporting('${data.provisioning_session_id}')">Set</button>
  <button onclick="showConsumptionReporting('${data.provisioning_session_id}')">Show</button>
  <button onclick="deleteConsumptionReporting('${data.provisioning_session_id}')">Delete</button>`;

  localStorage.setItem(
    data.provisioning_session_id,
    JSON.stringify({
      session_id: data.session_id,
      certificate_id: data.certificate_id ? data.certificate_id : 'Not yet created',
      protocol_list_created: true
    }));

}

function removeSessionFromTableAndStorage(provisioning_session_id) {
  let session_table = document.getElementById('session_table');
  for (let i = 1; i < session_table.rows.length; i++) {
    if (session_table.rows[i].cells[0].innerHTML === provisioning_session_id) {
      session_table.deleteRow(i);
      break;
    }
  }
  localStorage.removeItem(provisioning_session_id);
  localStorage.removeItem(provisioning_session_id + "-cert");
}

async function deleteProvisioningSession(provisioning_session_id) {
  const result = await Swal.fire({
    title: 'Delete Provisioning Session?',
    text: "Are you sure? You won't be able to revert this.",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Yes',
    cancelButtonText: 'No'
  });

  if (result.value) {
    const response = await fetch(`/delete_session/${provisioning_session_id}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      if (response.status === 404) {
        removeSessionFromTableAndStorage(provisioning_session_id);
      } else {
        Swal.fire({
          title: 'M1 Application Provider says:',
          text: 'Failed to delete the provisioning session.',
          icon: 'error',
          confirmButtonText: 'OK'
        });
      }
      return;
    }

    const data = await response.json();
    Swal.fire({
      title: 'M1 Application Provider says:',
      text: `Provisioning session ${provisioning_session_id} deleted with all resources`,
      icon: 'success',
      confirmButtonText: 'OK'
    });

    removeSessionFromTableAndStorage(provisioning_session_id);
  }
}

async function createChcFromJson(session_id) {
  const response = await fetch(`/set_stream/${session_id}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    Swal.fire({
      title: 'M1 Application Provider says:',
      text: 'Failed to set hosting for the provisioning session.',
      icon: 'error',
      confirmButtonText: 'OK'
    });
    return;
  }
  
  const data = await response.json();
  Swal.fire({
    title: 'M1 Application Provider says:',
    text: data.message,
    icon: 'success',
    confirmButtonText: 'OK'
  });
}

function getProvisioningSessionDetails() {
  window.open('http://127.0.0.1:8000/details', '_blank');
}


async function createNewSessionWithCHCMultiple() {
    const response = await fetch('/chc_multiple_entry_points', { method: 'POST' });
    const data = await response.json();
    //alert(data.message);
    if(!response.ok){
      Swal.fire({
        title: 'Application Provider says:',
        text: 'Failed to create new session. Make sure that AF is running!',
        icon: 'error',
        confirmButtonText: 'OK'
      });
      return;
    }
    Swal.fire({
      title: 'M1 Application Provider says:',
      text: data.message,
      icon: 'success',
      confirmButtonText: 'OK'
    });
    let session_table = document.getElementById('session_table');
    let row = session_table.insertRow(-1);
    let cell1 = row.insertCell(0);
    let cell2 = row.insertCell(1);
    let cell3 = row.insertCell(2);
    let cell4 = row.insertCell(3);
    let cell5 = row.insertCell(4);
    let cell6 = row.insertCell(5);
    let cell7 = row.insertCell(6);
    let cell8 = row.insertCell(7);
    let cell9 = row.insertCell(8);

    cell1.innerHTML = data.session_id;
    cell2.innerHTML = `<button onclick="deleteProvisioningSession('${data.session_id}')">Delete</button>`;
    cell3.innerHTML = `<button onclick="createChcFromJson('${data.session_id}')">Create</button>`;
    cell4.innerHTML = `<button onclick="getProvisioningSessionDetails()">Show</button>`;
    cell5.innerHTML = `<button onclick="createNewCertificate('${data.session_id}')">Create</button>`;
    cell6.innerHTML = data.certificate_id ? `<button onclick="showCertificateDetails('${data.session_id}', '${data.certificate_id}')">Show</button>` : 'Not yet created';
    cell7.innerHTML = `<button onclick="listContentProtocols('${data.session_id}')">Show</button>`;
    cell8.innerHTML = `<button onclick="getChcWithoutCertificate('${data.session_id}')">Create</button>`;
    cell9.innerHTML = `
    <button onclick="setConsumptionReporting('${data.session_id}')">Set</button>
    <button onclick="showConsumptionReporting('${data.session_id}')">Show</button>
    <button onclick="deleteConsumptionReporting('${data.session_id}')">Delete</button>`;

    localStorage.setItem(
      data.session_id,
      JSON.stringify({
        session_id: data.session_id,
        certificate_id: data.certificate_id ? data.certificate_id : 'Not yet created',
        protocol_list_created: true
      }));
}

async function createNewCertificate(session_id) {
    const response = await fetch('/new_certificate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 'prov-session-id': session_id })
    });
    const data = await response.json();
    //alert(data.message);
    Swal.fire({
      title: 'M1 Application Provider says:',
      text: data.message,
      icon: 'success',
      confirmButtonText: 'OK'
    });
    if (data.certificate_id) {
      let session_table = document.getElementById('session_table');
      for(let i = 1; i < session_table.rows.length; i++){
        if(session_table.rows[i].cells[0].innerHTML === session_id){
          session_table.rows[i].cells[5].innerHTML = `<button onclick="showCertificateDetails('${session_id}', '${data.certificate_id}')">Show</button>`;
          let session_data = JSON.parse(localStorage.getItem(session_id));
          if (!session_data) {
            session_data = { session_id: session_id, certificate_ids: [] };
          }
          session_data.certificate_id = data.certificate_id;
          localStorage.setItem(session_id, JSON.stringify(session_data));
        }
      }
    }
}

async function showCertificateDetails(session_id, certificate_id) {
    const response = await fetch('/show_certificate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 'prov-session-id': session_id, 'certificate-id': certificate_id })
    });
    const data = await response.json();
    let detailsWindow = window.open("", "_blank");
    detailsWindow.document.write("<pre>" + data.details + "</pre>");
}

async function listContentProtocols(session_id) {
    const response = await fetch('/get_protocol_list', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 'prov-session-id': session_id })
    });
    const data = await response.json();
    let detailsWindow = window.open("", "_blank");
    detailsWindow.document.write("<pre>" + data.details + "</pre>");
}

async function getChcWithoutCertificate(session_id) {
    const response = await fetch('/get_chc_without_certificate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 'prov-session-id': session_id })
    });
    const data = await response.json();
    //alert(data.message);
    Swal.fire({
      title: 'M1 Application Provider says:',
      text: data.message,
      icon: 'success',
      confirmButtonText: 'OK'
    }); 
}

async function createChcWithCertificate(session_id, certificate_id) {
    const response = await fetch('/create_chc_with_certificate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            'prov-session-id': session_id,
            'certificate-id': certificate_id
        })
    });

    if (!response.ok) {
        alert("Failed to create Content Hosting Configuration with certificate");
        return;
    }

    const data = await response.json();

    const newWindow = window.open("", "_blank");
    alert(data.message);
}

async function setConsumptionReporting(session_id) {
    const response = await fetch('/set_consumption_reporting', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 'prov-session-id': session_id })
    });
    const data = await response.json();
    //alert(data.message);
    Swal.fire({
      title: 'Application Provider says:',
      text: data.message,
      icon: 'success',
      confirmButtonText: 'OK'
    }); 
  }

async function showConsumptionReporting(session_id) {
    const response = await fetch('/show_consumption_reporting', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 'prov-session-id': session_id })
    });
    const data = await response.json();
    let detailsWindow = window.open("", "_blank");
    detailsWindow.document.write("<pre>" + data.details + "</pre>");
    }

    async function deleteConsumptionReporting(session_id) {
      const result = await Swal.fire({
        title: 'Delete Consumption Reporting?',
        text: "Are you sure? You won't be able to revert this.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes',
        cancelButtonText: 'No'
      });
    
      if (result.isConfirmed) {
        const response = await fetch('/delete_consumption_reporting', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 'prov-session-id': session_id })
        });
    
        const data = await response.json();
        //alert(data.message);
    
        if (response.ok) {
          Swal.fire({
            title: 'Application Provider says:',
            text: data.message,
            icon: 'success',
            confirmButtonText: 'OK'
          });
        } else {
          Swal.fire({
            title: 'Application Provider says:',
            text: data.message,
            icon: 'error',
            confirmButtonText: 'OK'
          });
        }
      }
}
    

window.onload = function() {
let session_table = document.getElementById('session_table');
for (let i = 0; i < localStorage.length; i++) {
  let session_id = localStorage.key(i);
  let session_data = JSON.parse(localStorage.getItem(session_id));
  let row = session_table.insertRow(-1);
  let cell1 = row.insertCell(0);
  let cell2 = row.insertCell(1);
  let cell3 = row.insertCell(2);
  let cell4 = row.insertCell(3);
  let cell5 = row.insertCell(4);
  let cell6 = row.insertCell(5);
  let cell7 = row.insertCell(6);
  let cell8 = row.insertCell(7);
  let cell9 = row.insertCell(8);

  cell1.innerHTML = session_id;
  cell2.innerHTML = `<button onclick="deleteProvisioningSession('${session_id}')">Delete</button>`;
  cell3.innerHTML = `<button onclick="createChcFromJson('${session_id}')">Create</button>`;
  cell4.innerHTML = `<button onclick="getProvisioningSessionDetails()">Show</button>`;
  cell5.innerHTML = `<button onclick="createNewCertificate('${session_id}')">Create</button>`;
  if (session_data.certificate_id && session_data.certificate_id !== 'Not yet created') {
    cell6.innerHTML = `<button onclick="showCertificateDetails('${session_id}', '${session_data.certificate_id}')">Show</button>`;
  } else {
    cell6.innerHTML = 'Not yet created';
  }
  if (session_data.protocol_list_created) {
    cell7.innerHTML = `<button onclick="listContentProtocols('${session_id}')">Show</button>`;
  } else {
    cell7.innerHTML = 'Not yet created';
  }
  cell8.innerHTML = `<button onclick="getChcWithoutCertificate('${session_id}')">Create</button>`;
    cell9.innerHTML = `
      <button onclick="setConsumptionReporting('${session_id}')">Set</button>
      <button onclick="showConsumptionReporting('${session_id}')">Show</button>
      <button onclick="deleteConsumptionReporting('${session_id}')">Delete</button>`;
}
}