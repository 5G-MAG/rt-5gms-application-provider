/*
License: 5G-MAG Public License (v1.0)
Author: Erik Gaida
Copyright: (C) Fraunhofer FOKUS
For full license terms please see the LICENSE file distributed with this
program. If this file is missing then the license can be retrieved from
https://drive.google.com/file/d/1cinCiA778IErENZ3JN52VFW-1ffHpx7Z/view
*/



// ========= HTML Factory =========
function getPolicyTemplateModalHtml(sessionId) {
  return `
  <div id="PolicyTemplateModal-${sessionId}" class="modal">
    <!-- Modal Content: Flex-Column Layout für Sticky Header/Footer -->
    <div class="modal-content" style="display:flex; flex-direction:column; max-height:90vh; padding:0;">
      
      <!-- STICKY HEADER -->
      <div class="modal-header"
          style="position:sticky; top:0; z-index:2; background:#fff;
                  padding:12px 16px; border-bottom:1px solid #e5e7eb;
                  display:flex; flex-direction:column; align-items:flex-start; gap:2px;">
        <h3 style="margin:0; font-weight:600;">Create Policy Template</h3>
        <div style="margin:0; font-weight:600; font-size:12px; color:#6b7280; letter-spacing:.02em;">
          3GPP TS 26.512 – Release 17
        </div>
      </div>

      <!-- FORM BODY (Scrollable) -->
      <form id="PolicyTemplate-form-modal-${sessionId}" novalidate
            style="display:flex; flex-direction:column; flex:1; min-height:0;">
        
        <div class="form-scrollable"
            style="flex:1 1 auto; overflow:auto; padding:16px; display:flex; flex-direction:column; gap:20px;">

          <!-- Error Message Container -->
          <div id="PolicyTemplate-error-${sessionId}" 
              style="display:none; color:#c00; font-weight:bold; border:1px solid #c00; padding:8px; border-radius:4px;">
          </div>

          <!-- 1. External Reference -->
          <div class="form-group">
            <h4 style="color:#0ea5e9; font-weight:700; font-size:16px; margin:0 0 10px 0;">External Reference</h4>
            <input type="text" id="pt-extRef-${sessionId}" required placeholder="e.g. HD_Premium" style="width:100%; padding:8px; border:1px solid #d1d5db; border-radius:4px;">
          </div>

          <!-- 2. M1QoSSpecification -->
          <div>
            <h4 style="color:#0ea5e9; font-weight:700; font-size:16px; margin:0 0 10px 0;">M1QoSSpecification</h4>
            <div style="border-left: 4px solid #f0f9ff; padding-left: 16px; display:flex; flex-direction:column; gap:12px;">
              
              <!-- QoS Ref -->
              <div class="form-group">
                <label for="qos-ref-${sessionId}">QoS Reference:</label>
                <input type="text" id="qos-ref-${sessionId}" placeholder="e.g. QOS_LOW_LATENCY">
              </div>

              <!-- Read Only Fields (Server Defined) 
              <div class="form-row" style="display:flex; gap:12px;">
                <div class="form-group" style="flex:1;">
                  <label style="font-size:12px; font-weight:600; color:#6b7280; margin-bottom:4px; display:block;">Max Bitrate UL (Read Only):</label>
                  <input type="text" 
                        id="maxBtrUl-${sessionId}"
                        readonly 
                        value="Wait for Server..." 
                        style="width:100%; background-color:#f3f4f6; color:#6b7280; border:1px solid #d1d5db; cursor:not-allowed; padding:6px 8px; border-radius:4px;">
                </div>

                <div class="form-group" style="flex:1;">
                  <label style="font-size:12px; font-weight:600; color:#6b7280; margin-bottom:4px; display:block;">Max Bitrate DL (Read Only):</label>
                  <input type="text" 
                        id="maxBtrDl-${sessionId}"
                        readonly 
                        value="Wait for Server..." 
                        style="width:100%; background-color:#f3f4f6; color:#6b7280; border:1px solid #d1d5db; cursor:not-allowed; padding:6px 8px; border-radius:4px;">
                </div>
              </div>
              -->
              
              <!-- Max Auth Bitrate UL (Input Group) -->
              <div class="form-group">
                <label>maxAuthBtrUl:</label>
                <div style="display: flex; align-items: center;">
                  <input type="number" 
                        id="maxAuthBtrUl-val-${sessionId}" 
                        step="any" 
                        min="0" 
                        placeholder="e.g. 10"
                        style="flex: 2; border-top-right-radius: 0; border-bottom-right-radius: 0; border-right: 0;">
                  
                  <select id="maxAuthBtrUl-unit-${sessionId}" 
                          style="flex: 1; border-top-left-radius: 0; border-bottom-left-radius: 0; background-color: #f9fafb; border-left:1px solid #e5e7eb;">
                    <option value="bps">bps</option>
                    <option value="Kbps">Kbps</option>
                    <option value="Mbps" selected>Mbps</option>
                    <option value="Gbps">Gbps</option>
                    <option value="Tbps">Tbps</option>
                  </select>
                </div>
              </div>

              <!-- Max Auth Bitrate DL (Input Group) -->
              <div class="form-group">
                <label>maxAuthBtrDl:</label>
                <div style="display: flex; align-items: center;">
                  <input type="number" 
                        id="maxAuthBtrDl-val-${sessionId}" 
                        step="any" 
                        min="0" 
                        placeholder="e.g. 20"
                        style="flex: 2; border-top-right-radius: 0; border-bottom-right-radius: 0; border-right: 0;">
                  
                  <select id="maxAuthBtrDl-unit-${sessionId}" 
                          style="flex: 1; border-top-left-radius: 0; border-bottom-left-radius: 0; background-color: #f9fafb; border-left:1px solid #e5e7eb;">
                    <option value="bps">bps</option>
                    <option value="Kbps">Kbps</option>
                    <option value="Mbps" selected>Mbps</option>
                    <option value="Gbps">Gbps</option>
                    <option value="Tbps">Tbps</option>
                  </select>
                </div>
              </div>

              <!-- Packet Loss Rates -->
              <div class="form-row" style="display:flex; gap:12px;">
                <div class="form-group" style="flex:1;">
                  <label>defPacketLossRateDl:</label>
                  <input type="number" id="defPacketLossRateDl-${sessionId}" placeholder="0 or bigger" min="0">
                </div>
                <div class="form-group" style="flex:1;">
                  <label>defPacketLossRateUl:</label>
                  <input type="number" id="defPacketLossRateUl-${sessionId}" placeholder="0 or bigger" min="0">
                </div>
              </div>
            </div>
          </div>

          <!-- 3. App Session Context -->
          <div>
            <h4 style="color:#0ea5e9; font-weight:700; font-size:16px; margin:0 0 10px 0;">application Session Context</h4>
            <div style="border-left: 4px solid #f0f9ff; padding-left: 16px; display:flex; flex-direction:column; gap:12px;">
              
              <div class="form-group">
                <label for="asc-dnn-${sessionId}">Data Network Name (DNN):</label>
                <input type="text" id="asc-dnn-${sessionId}" placeholder="e.g. internet">
              </div>

              <div class="form-row" style="display:flex; gap:12px; align-items:flex-end;">
                <div class="form-group" style="flex:0 0 90px;">
                  <label>SST (0-255):</label>
                  <input type="number" id="asc-sst-${sessionId}" min="0" max="255" placeholder="int">
                </div>
                <div class="form-group" style="flex:1;">
                  <label>SD (Hex 6 chars):</label>
                  <input type="text" id="asc-sd-${sessionId}" pattern="[0-9a-fA-F]{6}" placeholder="e.g. 000001">
                </div>
              </div>
            </div>
          </div>

          <!-- 4. Charging Specification -->
          <div>
            <h4 style="color:#0ea5e9; font-weight:700; font-size:16px; margin:0 0 10px 0;">Charging Specification</h4>
            <div style="border-left: 4px solid #f0f9ff; padding-left: 16px; display:flex; flex-direction:column; gap:12px;">

              <div class="form-group">
                <label>Sponsoring Status:</label>
            <select id="chg-status-${sessionId}" onchange="window.toggleSponsorInput('${sessionId}')">
              <option value="">-- Not Selected (None) --</option>
              <option value="SPONSOR_DISABLED">DISABLED</option>
              <option value="SPONSOR_ENABLED">ENABLED</option>
            </select>

              <div id="sponsor-container-${sessionId}" style="display: none; margin-top: 10px;">
                  <label>Sponsor ID:</label>
                  <input type="text" id="chg-sponId-${sessionId}" placeholder="e.g. Sponsor_X">
              </div>
            </div>
              
            </div>
          </div>

        </div>
        
        <!-- STICKY FOOTER -->
        <div class="modal-footer"
            style="position:sticky; bottom:0; z-index:2; background:#fff; 
                    border-top:1px solid #e5e7eb; padding:12px 16px;
                    display:flex; justify-content:flex-end; gap:10px;">
          <button type="button" class="btn btn-danger" data-close>Cancel</button>
          <button type="submit" class="btn btn-success">Create Policy Template</button>
        </div>

      </form>
    </div>
  </div>
  `;
}
window.toggleSponsorInput = function(sessionId) {
  const statusSelect = document.getElementById(`chg-status-${sessionId}`);
  const sponsorContainer = document.getElementById(`sponsor-container-${sessionId}`);
  const sponsorInput = document.getElementById(`chg-sponId-${sessionId}`);

  if (statusSelect && sponsorContainer) {
    if (statusSelect.value === 'SPONSOR_ENABLED') {
      sponsorContainer.style.display = 'block';
    } else {
      sponsorContainer.style.display = 'none';
      
      if(sponsorInput) sponsorInput.value = ""; 
    }
  }
};



export async function openPolicyTemplateForm(sessionId) {

  const prev = document.getElementById(`PolicyTemplateModal-${sessionId}`);
  if (prev) prev.remove();


  const wrapper = document.createElement('div');
  wrapper.innerHTML = getPolicyTemplateModalHtml(sessionId);
  const modal = wrapper.firstElementChild;
  document.body.appendChild(modal);

  if (!modal) return;
  modal.style.display = "flex";


  function closeMyModal() {
    modal.remove();
  }


  modal.querySelectorAll('[data-close]').forEach(btn => {
    btn.onclick = closeMyModal;
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeMyModal();
    }
  });

  const form = document.getElementById(`PolicyTemplate-form-modal-${sessionId}`);
  const errorBox = document.getElementById(`PolicyTemplate-error-${sessionId}`);

  form.onsubmit = async (event) => {
    event.preventDefault();
    errorBox.style.display = 'none';
    errorBox.innerText = '';


    const extRefInput = document.getElementById(`pt-extRef-${sessionId}`);
    

    let rawVal = extRefInput?.value || '';
    const extRef = String(rawVal).trim();

    if (!extRef) {
      errorBox.innerText = "Error: External Reference is required.";
      errorBox.style.display = "block";
      return;
    }

    const dnn = (document.getElementById(`asc-dnn-${sessionId}`)?.value || '').trim();
    const sstRaw = document.getElementById(`asc-sst-${sessionId}`)?.value ?? "";
    const sdRaw = (document.getElementById(`asc-sd-${sessionId}`)?.value || '').trim();

    const appSessionContext = {};

    if (dnn) {
      appSessionContext.dnn = dnn;
    }

    const sst = sstRaw !== "" ? Number.parseInt(sstRaw, 10) : null;
    const sd = sdRaw || null;

    if (sst !== null || sd !== null) {
      const sliceInfo = {};
      if (!Number.isNaN(sst)) {
        sliceInfo.sst = sst; 
      }
      if (sd) {

        sliceInfo.sd = String(sd); 
      }
      if (Object.keys(sliceInfo).length > 0) {
        appSessionContext.sliceInfo = sliceInfo;
      }
    }


    const qosRef = (document.getElementById(`qos-ref-${sessionId}`)?.value || '').trim();

    const maxAuthBtrUlVal = document.getElementById(`maxAuthBtrUl-val-${sessionId}`)?.value ?? "";
    const maxAuthBtrUlUnit = document.getElementById(`maxAuthBtrUl-unit-${sessionId}`)?.value || "Mbps";

    const maxAuthBtrDlVal = document.getElementById(`maxAuthBtrDl-val-${sessionId}`)?.value ?? "";
    const maxAuthBtrDlUnit = document.getElementById(`maxAuthBtrDl-unit-${sessionId}`)?.value || "Mbps";

    const defPlrDlRaw = document.getElementById(`defPacketLossRateDl-${sessionId}`)?.value ?? "";
    const defPlrUlRaw = document.getElementById(`defPacketLossRateUl-${sessionId}`)?.value ?? "";

    const qoSSpec = {};

    if (qosRef) {
      qoSSpec.qosReference = String(qosRef);
    }

    const ulVal = Number.parseFloat(maxAuthBtrUlVal);
    if (!Number.isNaN(ulVal)) {
      qoSSpec.maxAuthBtrUl = `${ulVal} ${maxAuthBtrUlUnit}`;
    }

    const dlVal = Number.parseFloat(maxAuthBtrDlVal);
    if (!Number.isNaN(dlVal)) {
      qoSSpec.maxAuthBtrDl = `${dlVal} ${maxAuthBtrDlUnit}`;
    }

    const defPlrDl = defPlrDlRaw !== "" ? Number.parseInt(defPlrDlRaw, 10) : null;
    if (!Number.isNaN(defPlrDl) && defPlrDl !== null) {
      qoSSpec.defPacketLossRateDl = defPlrDl;
    }

    const defPlrUl = defPlrUlRaw !== "" ? Number.parseInt(defPlrUlRaw, 10) : null;
    if (!Number.isNaN(defPlrUl) && defPlrUl !== null) {
      qoSSpec.defPacketLossRateUl = defPlrUl;
    }


    const sponStatus = document.getElementById(`chg-status-${sessionId}`)?.value || "";
    const sponId = (document.getElementById(`chg-sponId-${sessionId}`)?.value || '').trim();

    const chargingSpec = {};
    if (sponStatus) {
      chargingSpec.sponStatus = sponStatus;
    }
    if (sponId) {
      chargingSpec.sponId = String(sponId);
    }


    const payload = {
      externalReference: extRef,
    };

    if (Object.keys(appSessionContext).length > 0) {
      payload.applicationSessionContext = appSessionContext;
    }
    if (Object.keys(qoSSpec).length > 0) {
      payload.qoSSpecification = qoSSpec;
    }
    if (Object.keys(chargingSpec).length > 0) {
      payload.chargingSpecification = chargingSpec;
    }

    console.log("Sending Payload:", JSON.stringify(payload, null, 2));

    try {
      const response = await fetch(`/create_policy_template/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || JSON.stringify(err) || `Error ${response.status}: ${response.statusText}`);
      }

      const resData = await response.json();
      console.log("Success:", resData);
      closeMyModal();

    } catch (e) {
      console.error(e);
      errorBox.innerText = e.message || "Unknown error while creating Policy Template.";
      errorBox.style.display = "block";
    }
  };
}
