/*
License: 5G-MAG Public License (v1.0)
Author: Vuk Stojkovic
Copyright: (C) Fraunhofer FOKUS
For full license terms please see the LICENSE file distributed with this
program. If this file is missing then the license can be retrieved from
https://drive.google.com/file/d/1cinCiA778IErENZ3JN52VFW-1ffHpx7Z/view
*/




function getDynamicPolicyModalHtml(sessionId) {
   return `
  <div id="DynamicPolicyModal-${sessionId}" class="modal">
    <div class="modal-content" style="display:flex; flex-direction:column; max-height:90vh; padding:0;">
      
        <div class="modal-header"
            style="position:sticky; top:0; z-index:2; background:#fff;
                    padding:12px 16px; border-bottom:1px solid #e5e7eb;
                    display:flex; flex-direction:column; align-items:flex-start; gap:2px;">
          <h3 style="margin:0; font-weight:600;">Dynamic Policy</h3>
          <div style="margin:0; font-weight:600; font-size:12px; color:#6b7280; letter-spacing:.02em;">
            3GPP TS 26.512 – Release 17
          </div>
        </div>

      <form id="DynamicPolicy-form-modal-${sessionId}" novalidate style="display:flex; flex-direction:column; flex:1; min-height:0;">
        
        
        <div class="form-scrollable" style="flex:1 1 auto; overflow:auto; padding:16px; display:flex; flex-direction:column; gap:12px;">
  
          <div id="DynamicPolicy-error-${sessionId}" style="display:none;color:#c00;font-weight:bold;"></div>
          
          
          <div class="form-group">
            <label for="policyTemplateId-${sessionId}">policyTemplateId:</label>
            <input type="text" id="policyTemplateId-${sessionId}" required>
          </div>


          <div class="form-group">
            <label for="policyTemplateId-${sessionId}">policyTemplateId:</label>
            <input type="text" id="policyTemplateId-${sessionId}" required>
          </div>

          

        
          <div class="modal-footer"
              style="position:sticky; bottom:0; z-index:2; background:#fff; 
                      border-top:1px solid #e5e7eb; padding:12px 16px;
                      display:flex; justify-content:flex-end; gap:10px;">
            <button type="button" class="btn btn-danger" data-close>Cancel</button>
            <button type="submit" class="btn btn-success">Set Content Hosting Configuration</button>
          </div>
      </form>
    </div>
  </div>
  `;
}


export async function openDynamicPolicyForm(sessionId) {
  const prev = document.getElementById(`DynamicPolicyModal-${sessionId}`);
  if (prev) prev.remove();

  const wrapper = document.createElement('div');
  wrapper.innerHTML = getDynamicPolicyModalHtml(sessionId);
  document.body.appendChild(wrapper.firstElementChild);

  const modal = document.getElementById(`DynamicPolicyModal-${sessionId}`);
  if (!modal) return;
  modal.style.display = "flex";
}