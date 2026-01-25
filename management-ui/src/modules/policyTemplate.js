/*
License: 5G-MAG Public License (v1.0)
Author: Erik Gaida
Copyright: (C) Fraunhofer FOKUS
For full license terms please see the LICENSE file distributed with this
program. If this file is missing then the license can be retrieved from
https://drive.google.com/file/d/1cinCiA778IErENZ3JN52VFW-1ffHpx7Z/view
*/

function parseRateString(str) {
  if (!str || typeof str !== 'string') return { val: '', unit: 'Mbps' };

  const regex = /^(-?(?:\d*\.\d+|\d+))\s*(bps|kbps|mbps|gbps|tbps)?$/i;
  const match = str.match(regex);

  if (match) {
    const val = match[1];
    let unitRaw = match[2] || 'Mbps';

    const unitMap = {
      'bps': 'bps',
      'kbps': 'Kbps',
      'mbps': 'Mbps',
      'gbps': 'Gbps',
      'tbps': 'Tbps'
    };
    
    const unit = unitMap[unitRaw.toLowerCase()] || 'Mbps';
    return { val: val, unit: unit };
  }

  const parts = str.split(' ');
  return { val: parts[0] || '', unit: parts[1] || 'Mbps' };
}

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

export async function listAllPolicyTemplate(sessionId) {
  try {
      const response = await fetch(`/list_policy_template_ids/${sessionId}`, { method: 'GET' });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || JSON.stringify(err) || `Error ${response.status}: ${response.statusText}`);
      }

      const policyIds = await response.json();
      const modalId = `PolicyListModal-${sessionId}`;
      const prev = document.getElementById(modalId);
      if (prev) prev.remove();

      let listContent = "";
      
      if (Array.isArray(policyIds) && policyIds.length > 0) {
          listContent = `<div style="display: flex; flex-direction: column; gap: 8px;">`;
          
          policyIds.forEach(([id, externalRef]) => {
            const btnId = `btn-edit-${id}`; 
            
            listContent += `
            <div style="background: #f9fafb; border: 1px solid #e5e7eb; padding: 12px; border-radius: 6px; display: flex; flex-direction: column; gap: 12px; align-items: flex-start;">
                
                <div style="width: 100%;">
                    <span style="font-size: 11px; text-transform: uppercase; color: #6b7280; font-weight: 700; letter-spacing: 0.05em; display: block; margin-bottom: 2px;">ID</span>
                    <div style="font-family: monospace; font-size: 14px; font-weight: 600; color: #111827; word-break: break-all;">
                        ${id}
                    </div>
                </div>

                <div style="width: 100%;">
                    <span style="font-size: 11px; text-transform: uppercase; color: #6b7280; font-weight: 700; letter-spacing: 0.05em; display: block; margin-bottom: 2px;">Ext. Ref</span>
                    <div style="font-family: monospace; font-size: 14px; font-weight: 600; color: #4b5563; word-break: break-all;">
                        ${externalRef || '-'}
                    </div>
                </div>

                <button type="button" id="${btnId}" 
                        style="background-color: #2563eb; color: white; border: none; padding: 6px 12px; border-radius: 4px; font-size: 12px; cursor: pointer; align-self: flex-end;">
                  Edit Details
                </button> 
            
            </div>`;
          });
          listContent += `</div>`;
          
      } else {
          listContent = `
            <div style="text-align: center; padding: 30px; color: #6b7280;">
                <p style="margin: 0; font-weight: 500;">No Policy Templates found.</p>
            </div>`;
      }

      const modalHtml = `
      <div id="${modalId}" class="modal" style="display: flex;">
        <div class="modal-content" style="max-width: 500px; display:flex; flex-direction:column; max-height:80vh; padding: 0;">
          <div class="modal-header" style="padding: 16px; border-bottom: 1px solid #e5e7eb; background: #fff; display: flex; justify-content: space-between; align-items: center;">
            <h3 style="margin:0; font-weight:600;">Active Policy Templates</h3>
            <button type="button" class="btn-close" onclick="document.getElementById('${modalId}').remove()" style="background:none; border:none; font-size:20px; cursor:pointer;">&times;</button>
          </div>
          <div class="modal-body" style="padding: 16px; overflow-y: auto; background-color: #fff;">
            ${listContent}
          </div>
          <div class="modal-footer" style="padding: 12px 16px; border-top: 1px solid #e5e7eb; background: #f9fafb; text-align: right;">
            <button class="btn btn-secondary" onclick="document.getElementById('${modalId}').remove()">Close</button>
          </div>
        </div>
      </div>`;

      const wrapper = document.createElement('div');
      wrapper.innerHTML = modalHtml;
      document.body.appendChild(wrapper.firstElementChild);

      if (Array.isArray(policyIds)) {
        policyIds.forEach(([id]) => {
            const btnId = `btn-edit-${id}`; 
            const btn = document.getElementById(btnId);
            if(btn) {
                btn.onclick = async () => {
                    try {

                        const resp = await fetch(`/provisioning_session/${sessionId}/policy_template/${id}`);
                        if(!resp.ok) throw new Error("Fetch details failed");
                        const fullData = await resp.json();
                        console.log(fullData)
                        document.getElementById(modalId).remove();
                        openPolicyTemplateForm(sessionId, fullData, id);
                        
                    } catch(err) {
                        alert("Could not load policy details: " + err.message);
                        console.error(err);
                    }
                };
            }
        });
      }

    } catch (e) {
      console.error(e);
      alert("Fehler beim Laden der Policies: " + e.message);
    } 
}
export async function openPolicyTemplateForm(sessionId, existingData = null, policyId = null) {

  const prev = document.getElementById(`PolicyTemplateModal-${sessionId}`);
  if (prev) prev.remove();

  const wrapper = document.createElement('div');
  wrapper.innerHTML = getPolicyTemplateModalHtml(sessionId);
  const modal = wrapper.firstElementChild;
  document.body.appendChild(modal);

  if (!modal) return;
  modal.style.display = "flex";

  if (existingData) {
    modal.querySelector('.modal-header h3').innerHTML = `Edit Policy Template:<br>${policyId}`;
    modal.querySelector('.btn-success').innerText = "Save Changes";
  }

  if (existingData) {
      if(existingData.externalReference) {
          document.getElementById(`pt-extRef-${sessionId}`).value = existingData.externalReference;
      }

      if (existingData.qoSSpecification) {
          const qos = existingData.qoSSpecification;
          if (qos.qosReference) document.getElementById(`qos-ref-${sessionId}`).value = qos.qosReference;
          
          if (qos.maxAuthBtrUl) {
              const p = parseRateString(qos.maxAuthBtrUl);
              document.getElementById(`maxAuthBtrUl-val-${sessionId}`).value = p.val;
              document.getElementById(`maxAuthBtrUl-unit-${sessionId}`).value = p.unit;
          }
          if (qos.maxAuthBtrDl) {
              const p = parseRateString(qos.maxAuthBtrDl);
              document.getElementById(`maxAuthBtrDl-val-${sessionId}`).value = p.val;
              document.getElementById(`maxAuthBtrDl-unit-${sessionId}`).value = p.unit;
          }
          if (qos.defPacketLossRateDl !== undefined) document.getElementById(`defPacketLossRateDl-${sessionId}`).value = qos.defPacketLossRateDl;
          if (qos.defPacketLossRateUl !== undefined) document.getElementById(`defPacketLossRateUl-${sessionId}`).value = qos.defPacketLossRateUl;
      }

      if (existingData.applicationSessionContext) {
          const asc = existingData.applicationSessionContext;
          if (asc.dnn) document.getElementById(`asc-dnn-${sessionId}`).value = asc.dnn;
          if (asc.sliceInfo) {
              if (asc.sliceInfo.sst !== undefined) document.getElementById(`asc-sst-${sessionId}`).value = asc.sliceInfo.sst;
              if (asc.sliceInfo.sd) document.getElementById(`asc-sd-${sessionId}`).value = asc.sliceInfo.sd;
          }
      }

      
      if (existingData.chargingSpecification) {
          const chg = existingData.chargingSpecification;
          const sel = document.getElementById(`chg-status-${sessionId}`);
          if (chg.sponStatus) {
              sel.value = chg.sponStatus;
              sel.dispatchEvent(new Event('change')); 
              window.toggleSponsorInput(sessionId);
          } else if (typeof chg.sponsorEnabled === "boolean") {
              sel.value = chg.sponsorEnabled ? "SPONSOR_ENABLED" : "SPONSOR_DISABLED";
              sel.dispatchEvent(new Event('change'));
              window.toggleSponsorInput(sessionId);
          }
          if (chg.sponId) document.getElementById(`chg-sponId-${sessionId}`).value = chg.sponId;
      }
  }

  function closeMyModal() {
    modal.remove();
  }

  modal.querySelectorAll('[data-close]').forEach(btn => {
    btn.onclick = closeMyModal;
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeMyModal();
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
    if (dnn) appSessionContext.dnn = dnn;
    const sst = sstRaw !== "" ? Number.parseInt(sstRaw, 10) : null;
    const sd = sdRaw || null;
    if (sst !== null || sd !== null) {
      const sliceInfo = {};
      if (!Number.isNaN(sst)) sliceInfo.sst = sst; 
      if (sd) sliceInfo.sd = String(sd); 
      if (Object.keys(sliceInfo).length > 0) appSessionContext.sliceInfo = sliceInfo;
    }

    const qosRef = (document.getElementById(`qos-ref-${sessionId}`)?.value || '').trim();
    const maxAuthBtrUlValRaw = (document.getElementById(`maxAuthBtrUl-val-${sessionId}`)?.value ?? "").trim();
    const maxAuthBtrUlUnit = document.getElementById(`maxAuthBtrUl-unit-${sessionId}`)?.value || "Mbps";
    const maxAuthBtrDlValRaw = (document.getElementById(`maxAuthBtrDl-val-${sessionId}`)?.value ?? "").trim();
    const maxAuthBtrDlUnit = document.getElementById(`maxAuthBtrDl-unit-${sessionId}`)?.value || "Mbps";
    const defPlrDlRaw = document.getElementById(`defPacketLossRateDl-${sessionId}`)?.value ?? "";
    const defPlrUlRaw = document.getElementById(`defPacketLossRateUl-${sessionId}`)?.value ?? "";
    const qoSSpec = {};
    if (qosRef) qoSSpec.qosReference = String(qosRef);
    
    const bitrateValuePattern = /^-?(?:\d*\.\d+|\d+)$/;

    if (maxAuthBtrUlValRaw !== "") {
        if (!bitrateValuePattern.test(maxAuthBtrUlValRaw)) {
            errorBox.innerText = "Error: maxAuthBtrUl must be a number like 10 or 10.5 (no exponent).";
            errorBox.style.display = "block";
            return;
        }

        qoSSpec.maxAuthBtrUl = `${maxAuthBtrUlValRaw} ${maxAuthBtrUlUnit}`;
    }

    if (maxAuthBtrDlValRaw !== "") {
        if (!bitrateValuePattern.test(maxAuthBtrDlValRaw)) {
            errorBox.innerText = "Error: maxAuthBtrDl must be a number like 20 or 20.5 (no exponent).";
            errorBox.style.display = "block";
            return;
        }
        qoSSpec.maxAuthBtrDl = `${maxAuthBtrDlValRaw} ${maxAuthBtrDlUnit}`;
    }
    const defPlrDl = defPlrDlRaw !== "" ? Number.parseInt(defPlrDlRaw, 10) : null;
    if (!Number.isNaN(defPlrDl) && defPlrDl !== null) qoSSpec.defPacketLossRateDl = defPlrDl;
    const defPlrUl = defPlrUlRaw !== "" ? Number.parseInt(defPlrUlRaw, 10) : null;
    if (!Number.isNaN(defPlrUl) && defPlrUl !== null) qoSSpec.defPacketLossRateUl = defPlrUl;

    // Charging
    const sponStatus = document.getElementById(`chg-status-${sessionId}`)?.value || "";
    const sponId = (document.getElementById(`chg-sponId-${sessionId}`)?.value || '').trim();
    const chargingSpec = {};
    if (sponStatus) chargingSpec.sponsorEnabled = (sponStatus === "SPONSOR_ENABLED");
    if (sponId) chargingSpec.sponId = String(sponId);

    const payload = {
      externalReference: extRef,
    };
    if (policyId) payload.policyTemplateId = policyId;
    if (Object.keys(appSessionContext).length > 0) payload.applicationSessionContext = appSessionContext;
    if (Object.keys(qoSSpec).length > 0) payload.qoSSpecification = qoSSpec;
    if (Object.keys(chargingSpec).length > 0) payload.chargingSpecification = chargingSpec;

    console.log("Sending Payload:", JSON.stringify(payload, null, 2));

    try {
      let url = `/create_policy_template/${sessionId}`;
      let method = 'POST';

      if (policyId) {
          url = `/provisioning_session/${sessionId}/policy_template/${policyId}`; 
          method = 'PUT'; 
      }
      console.log(payload)
      const response = await fetch(url, {
        method: method,
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

      listAllPolicyTemplate(sessionId);
    } catch (e) {
      console.error(e);
      errorBox.innerText = e.message || "Unknown error while saving Policy Template.";
      errorBox.style.display = "block";
    }
  };
}
