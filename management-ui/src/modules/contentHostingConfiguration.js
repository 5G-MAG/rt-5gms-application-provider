/*
License: 5G-MAG Public License (v1.0)
Author: Erik Gaida
Copyright: (C) Fraunhofer FOKUS
For full license terms please see the LICENSE file distributed with this
program. If this file is missing then the license can be retrieved from
https://drive.google.com/file/d/1cinCiA778IErENZ3JN52VFW-1ffHpx7Z/view
*/
import { notifyError, notifySuccess, confirmPrompt } from "./notify.js";

const profilesList = [
  { value: "urn:mpeg:dash:profile:full:2011", label: "MPEG-DASH Full profile" },
  { value: "urn:mpeg:dash:profile:isoff-on-demand:2011", label: "ISO Base On Demand" },
  { value: "urn:mpeg:dash:profile:isoff-live:2011", label: "ISO Base Live" },
  { value: "urn:mpeg:dash:profile:isoff-main:2011", label: "ISO Base Main" },
  { value: "urn:mpeg:dash:profile:mp2t-main:2011", label: "MPEG-2 TS Main" },
  { value: "urn:mpeg:dash:profile:mp2t-simple:2011", label: "MPEG-2 TS Simple" },
  { value: "urn:3GPP:PSS:profile:DASH10", label: "3GP-DASH Release-10" },
  { value: "urn:dvb:dash:profile:dvb-dash:2014", label: "DVB DASH" },
  { value: "urn:hbbtv:dash:profile:isoff-live:2012", label: "HbbTV 1.5 DASH live" }
];


const HTTP_PULL = "urn:3gpp:5gms:content-protocol:http-pull-ingest";
const DASH_IF_PUSH = "urn:3gpp:5gms:content-protocol:dash-if-ingest";

const ALL_PROTOCOL_OPTIONS = [
  { value: HTTP_PULL, label: "HTTP pull-based content ingest protocol", supported: true },
  { value: DASH_IF_PUSH, label: "DASH-IF push-based content ingest protocol", supported: false },
];

const PROTOCOL_TO_PULL = {
  [HTTP_PULL]: true,
  [DASH_IF_PUSH]: false,
};


const KNOWN_PROFILE_VALUES = new Set(profilesList.map(p => p.value));

// Content-Types
const contentTypeOptions = [
  { value: "application/dash+xml", label: "MPEG-DASH (MPD)" },
  { value: "application/vnd.apple.mpegurl", label: "HLS (M3U8)" },
  { value: "application/x-mpegurl", label: "HLS (legacy x-mpegurl)" },
  { value: "application/vnd.ms-sstr+xml", label: "Smooth Streaming (ISM/ISMC)" },
  { value: "__custom__", label: "Other… (enter manually)" }
];


const REQUIRE_PROFILES = false;


const hasChoices = () => typeof window !== "undefined" && typeof window.Choices === "function";
function isValidMime(v) { return /^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/i.test(v || ""); }

// ========= HTML Factory =========
function getContentHostingConfigurationModalHtml(sessionId) {
  return `
  <div id="ContentHostingConfigurationModal-${sessionId}" class="modal">
    <div class="modal-content" style="display:flex; flex-direction:column; max-height:90vh; padding:0;">
      
      
        <div class="modal-header"
            style="position:sticky; top:0; z-index:2; background:#fff;
                    padding:12px 16px; border-bottom:1px solid #e5e7eb;
                    display:flex; flex-direction:column; align-items:flex-start; gap:2px;">
          <h3 style="margin:0; font-weight:600;">Content Hosting Configuration</h3>
          <div style="margin:0; font-weight:600; font-size:12px; color:#6b7280; letter-spacing:.02em;">
            3GPP TS 26.512 – Release 17
          </div>
        </div>



      <form id="chc-form-modal-${sessionId}" novalidate
            style="display:flex; flex-direction:column; flex:1; min-height:0;">
        
        
        <div class="form-scrollable"
             style="flex:1 1 auto; overflow:auto; padding:16px; display:flex; flex-direction:column; gap:12px;">
          
          <div id="chc-error-${sessionId}" style="display:none;color:#c00;font-weight:bold;"></div>

          <div class="form-group">
            <label for="content_hosting_configuration-name-${sessionId}">Name:</label>
            <input type="text" id="content_hosting_configuration-name-${sessionId}" required>
          </div>

          <fieldset style="margin:0; padding-bottom:8px;">
            <legend>Ingest Configuration</legend>

          
          <div class="form-group inline">
            <label class="label-inline" for="ingest-method-${sessionId}" style="margin-right:8px;">Ingest method</label>
            <span id="ingest-method-${sessionId}"
                  style="display:inline-block; padding:2px 10px; border-radius:9999px;
                        font-weight:600; font-size:12px; background:#e8faf0; color:#065f46;">
              Pull-based
            </span>
          </div>


            <div class="form-group">
              <label for="protocol-select-${sessionId}">Select protocol:</label>
              <select id="protocol-select-${sessionId}"></select>
              <div id="protocol-hint-${sessionId}" style="margin-top:6px; font-size:12px; color:#6b7280;"></div>
            </div>

            <div class="form-group">
              <label for="base-url-${sessionId}">BaseURL:</label>
              <input type="url" id="base-url-${sessionId}">

              <!-- Buttons UNTER dem Input -->
              <div class="baseurl-helpers">
                <button type="button" class="btn-ghost" id="btn-baseurl-http-${sessionId}">http://</button>
                <button type="button" class="btn-ghost" id="btn-baseurl-https-${sessionId}">https://</button>
              </div>
            </div>


          </fieldset>

          <fieldset id="dist-container-${sessionId}" style="margin:0;">
            <legend>Media Distribution Configurations</legend>
            <button type="button" class="btn btn-primary" id="add-dist-${sessionId}" style="margin:6px 0 0;">+ Add distribution</button>
          </fieldset>
        </div>

        
        <div class="modal-footer"
             style="position:sticky; bottom:0; z-index:2; background:#fff; 
                    border-top:1px solid #e5e7eb; padding:12px 16px;
                    display:flex; justify-content:space-between; align-items:center; gap:10px; width:100%; box-sizing:border-box;">
          <div style="display:flex; align-items:center; gap:8px; margin-right:auto;">
            <button type="button" class="btn btn-secondary" id="chc-upload-btn-${sessionId}">Prefill form JSON file</button>
            <input type="file" id="chc-upload-input-${sessionId}" accept="application/json" style="display:none" />
          </div>
          <div style="display:flex; gap:10px; margin-left:auto;">
            <button type="button" class="btn btn-danger" data-close>Cancel</button>
            <button type="submit" class="btn btn-success">Set Content Hosting Configuration</button>
          </div>
        </div>
      </form>
    </div>
  </div>
  `;
}



// ========= Main =========
export async function openContentHostingConfigurationForm(sessionId, isEdit = false) {
  const prev = document.getElementById(`ContentHostingConfigurationModal-${sessionId}`);
  if (prev) prev.remove();

  const wrapper = document.createElement('div');
  wrapper.innerHTML = getContentHostingConfigurationModalHtml(sessionId);
  document.body.appendChild(wrapper.firstElementChild);

  const modal = document.getElementById(`ContentHostingConfigurationModal-${sessionId}`);
  if (!modal) return;
  modal.style.display = "flex";

  // --- Error helpers ---
  function choicesBox(el) { return el?.parentElement?.querySelector('.choices') || null; }
  function updateTopError() {
    const box = document.getElementById(`chc-error-${sessionId}`);
    if (!box) return;
    const any = !!modal.querySelector('.field-error');
    box.style.display = any ? "" : "none";
    box.textContent = any ? (box.textContent || "Please fix the highlighted fields.") : "";
  }
  function setFieldError(el, msg) {
    const group = (el.closest?.('.form-group')) || el.parentElement || modal;
    let err = group.querySelector('.field-error');
    if (!err) {
      err = document.createElement('div');
      err.className = 'field-error';
      err.style.cssText = 'color:#c00;font-size:.9em;margin-top:6px;';
      group.appendChild(err);
    }
    err.textContent = msg;
    (choicesBox(el) || el).style.border = '2px solid #c00';
    updateTopError();
  }
  function clearFieldError(el) {
    const group = (el.closest?.('.form-group')) || el.parentElement || modal;
    const err = group.querySelector('.field-error');
    if (err) err.remove();
    (choicesBox(el) || el).style.border = '';
    updateTopError();
  }
  function clearAllFieldErrors() {
    modal.querySelectorAll('.field-error').forEach(n => n.remove());
    modal.querySelectorAll('input, select, .choices').forEach(n => (n.style.border = ''));
    updateTopError();
  }

  // --- Controls ---
  const nameInput = document.getElementById(`content_hosting_configuration-name-${sessionId}`);
  const baseUrlInput = document.getElementById(`base-url-${sessionId}`);

  // http & https 
  const httpBtn  = document.getElementById(`btn-baseurl-http-${sessionId}`);
  const httpsBtn = document.getElementById(`btn-baseurl-https-${sessionId}`);

  function setBaseUrlPrefix(prefix) {
    baseUrlInput.value = prefix;            
    clearFieldError(baseUrlInput);          
    baseUrlInput.focus();
    const len = baseUrlInput.value.length;
    if (baseUrlInput.setSelectionRange) baseUrlInput.setSelectionRange(len, len);
    baseUrlInput.dispatchEvent(new Event('input', { bubbles: true }));
  }

  httpBtn.addEventListener('click',  () => setBaseUrlPrefix('http://'));
  httpsBtn.addEventListener('click', () => setBaseUrlPrefix('https://'));



  const protocolSelect = document.getElementById(`protocol-select-${sessionId}`);
  const protocolHint = document.getElementById(`protocol-hint-${sessionId}`);
  const ingestMethodBadge = document.getElementById(`ingest-method-${sessionId}`);

  function renderIngestMethod(isPull) {
    if (isPull) {
      ingestMethodBadge.textContent = "Pull-based";
      ingestMethodBadge.style.background = "#e8faf0";
      ingestMethodBadge.style.color = "#065f46";
    } else {
      ingestMethodBadge.textContent = "Push-based";
      ingestMethodBadge.style.background = "#fee2e2";
      ingestMethodBadge.style.color = "#991b1b";
    }
  }



  let protocolChoices = null;

  function fillProtocolNative(preselect) {
    protocolSelect.innerHTML = "";
    ALL_PROTOCOL_OPTIONS.forEach(o => {
      const opt = document.createElement("option");
      opt.value = o.value;
      opt.textContent = `${o.label} (${o.value})${o.supported ? "" : " – not supported"}`;
      if (!o.supported) opt.disabled = true;
      protocolSelect.appendChild(opt);
    });
    protocolSelect.value = preselect || HTTP_PULL;
    renderIngestMethod(!!PROTOCOL_TO_PULL[protocolSelect.value]);
  }

  function buildProtocolChoices(preselectValue = null) {
    if (!hasChoices()) {
      fillProtocolNative(preselectValue);
      protocolHint.textContent = "Push-based ingest (DASH-IF) is currently not supported by the AF.";
      return;
    }
    if (protocolChoices) { protocolChoices.destroy(); protocolChoices = null; }
    protocolSelect.innerHTML = "";
    protocolChoices = new Choices(protocolSelect, {
      searchEnabled: false,
      shouldSort: false,
      placeholder: true,
      placeholderValue: 'Select protocol'
    });

    const items = ALL_PROTOCOL_OPTIONS.map(o => ({
      value: o.value,
      label: `${o.label} (${o.value})${o.supported ? "" : " – not supported"}`,
      disabled: !o.supported
    }));

    protocolChoices.setChoices(items, 'value', 'label', true);
    protocolChoices.setChoiceByValue(preselectValue || HTTP_PULL);

    renderIngestMethod(!!PROTOCOL_TO_PULL[preselectValue || HTTP_PULL]);
    protocolHint.textContent = "Push-based ingest (DASH-IF) is currently not supported by the AF.";
  }

  buildProtocolChoices();

  // Events
  nameInput.addEventListener('input', () => clearFieldError(nameInput));
  baseUrlInput.addEventListener('input', () => clearFieldError(baseUrlInput));
  protocolSelect.addEventListener('change', () => {
    clearFieldError(protocolSelect);
    const v = (protocolSelect.value || '').trim();
    renderIngestMethod(!!PROTOCOL_TO_PULL[v]);
  });

  // --- Distributions ---
  const distContainer = document.getElementById(`dist-container-${sessionId}`);

  function addDistributionEntry(data = {}) {
    const addBtn = document.getElementById(`add-dist-${sessionId}`);
    if (addBtn) clearFieldError(addBtn);

    const n = distContainer.querySelectorAll('.dist-entry').length;
    const el = document.createElement('div');
    el.className = 'dist-entry dist-entry-box';
    el.innerHTML = `
      <h5>EntryPoint ${n + 1}</h5>
      <div class="form-row">
        <div class="form-group" style="flex:1">
          <label>Relative Path:</label>
          <input type="text" class="dist-path">
        </div>
        <div class="form-group" style="flex:1">
          <label>Content-Type:</label>
          <select class="dist-contenttype"></select>
          <input type="text" class="dist-contenttype-custom" placeholder="e.g. application/xyz" style="display:none;margin-top:6px;">
        </div>
      </div>

      <div class="form-row profiles-row">
        <div class="form-group" style="flex:1">
          <label>Profiles (predefined)</label>
          <select class="dist-profiles" multiple></select>
        </div>
        <div class="form-group" style="flex:1">
          <label>Profiles (Custom)</label>
          <input type="text" class="dist-profiles-custom" placeholder="Add URNs… (Enter oder ,)">
        </div>
      </div>

      <button type="button" class="btn btn-danger remove-dist" style="display:none;margin-top:8px;">– Remove</button>
    `;
    distContainer.insertBefore(el, document.getElementById(`add-dist-${sessionId}`));

    // Content-Type
    const ctypeSel = el.querySelector('.dist-contenttype');
    const ctypeCustom = el.querySelector('.dist-contenttype-custom');
    contentTypeOptions.forEach(opt => {
      const o = document.createElement('option');
      o.value = opt.value; o.textContent = opt.label;
      ctypeSel.appendChild(o);
    });

    // Profiles (select)
    const profSel = el.querySelector('.dist-profiles');
    profilesList.forEach(opt => {
      const o = document.createElement('option');
      o.value = opt.value; o.textContent = `${opt.label} (${opt.value})`;
      profSel.appendChild(o);
    });


    let profChoices = null;
    if (hasChoices()) {
      profChoices = new Choices(profSel, {
        removeItemButton: true,
        placeholderValue: 'Select profile(s)',
        searchPlaceholderValue: 'Search profiles',
        shouldSort: true
      });
    }

    // Custom-URNs
    const profCustomInput = el.querySelector('.dist-profiles-custom');
    let profCustom = null;
    if (hasChoices()) {
      profCustom = new Choices(profCustomInput, {
        removeItemButton: true,
        duplicateItemsAllowed: false,
        paste: true,
        editItems: false,
        delimiters: ',',
        addItemText: (val) => `Press Enter to add "${val}"`,
        placeholder: true,
        placeholderValue: 'Add urn:…'
      });
    } else {
      profCustomInput.setAttribute('data-native-tags', '1');
    }

    el._profilesChoices = profChoices;
    el._profilesCustom = profCustom;

    // Prefill
    if (data.relativePath) el.querySelector('.dist-path').value = data.relativePath;

    if (data.contentType) {
      const match = contentTypeOptions.find(o => o.value.toLowerCase() === data.contentType.toLowerCase());
      if (match) {
        ctypeSel.value = match.value;
      } else {
        ctypeSel.value = "__custom__";
        ctypeCustom.style.display = '';
        ctypeCustom.value = data.contentType;
      }
    }

    if (Array.isArray(data.profiles)) {
      const known = data.profiles.filter(v => KNOWN_PROFILE_VALUES.has(v));
      const unknown = data.profiles.filter(v => !KNOWN_PROFILE_VALUES.has(v));
      if (hasChoices() && profChoices) {
        if (known.length) profChoices.setChoiceByValue(known);
      } else {
        Array.from(profSel.options).forEach(o => { if (known.includes(o.value)) o.selected = true; });
      }
      if (hasChoices() && profCustom) {
        if (unknown.length) profCustom.setValue(unknown);
      } else if (unknown.length) {
        profCustomInput.value = unknown.join(',');
      }
    }

    // Events
    const pathInp = el.querySelector('.dist-path');
    pathInp.addEventListener('input', () => clearFieldError(pathInp));

    ctypeSel.addEventListener('change', () => {
      const isCustom = ctypeSel.value === "__custom__";
      ctypeCustom.style.display = isCustom ? "" : "none";
      if (!isCustom) ctypeCustom.value = "";
      clearFieldError(ctypeSel);
    });
    ctypeCustom.addEventListener('input', () => {
      clearFieldError(ctypeSel);
    });

    profSel.addEventListener('change', () => clearFieldError(profSel));

    updateRemoveButtons(); updateTopError();
  }

  function applyChcToForm(chc) {
    if (!chc || typeof chc !== "object") return;
    clearAllFieldErrors();
    nameInput.value = chc.name || '';
    baseUrlInput.value = chc.ingestConfiguration?.baseURL || '';

    const preProt = (chc.ingestConfiguration?.protocol === DASH_IF_PUSH)
      ? HTTP_PULL
      : (chc.ingestConfiguration?.protocol || HTTP_PULL);

    if (hasChoices() && protocolChoices) {
      protocolChoices.setChoiceByValue(preProt);
    } else {
      const opt = Array.from(protocolSelect.options).find(o => o.value === preProt);
      if (opt) protocolSelect.value = preProt;
    }

    renderIngestMethod(!!PROTOCOL_TO_PULL[preProt]);

    if (Array.isArray(chc.distributionConfigurations) && chc.distributionConfigurations.length) {
      distContainer.querySelectorAll('.dist-entry').forEach(e => e.remove());
      chc.distributionConfigurations.forEach(dc => {
        const ep = dc.entryPoint || dc;
        addDistributionEntry({
          relativePath: ep.relativePath || '',
          contentType: ep.contentType || '',
          profiles: Array.isArray(ep.profiles) ? ep.profiles : []
        });
      });
    }
    updateTopError();
  }

  function updateRemoveButtons() {
    const entries = distContainer.querySelectorAll('.dist-entry');
    entries.forEach(entry => {
      const btn = entry.querySelector('.remove-dist');
      if (entries.length > 1) {
        btn.style.display = 'inline-block';
        btn.disabled = false;
        btn.onclick = () => { entry.remove(); updateEntryNumbers(); updateRemoveButtons(); updateTopError(); };
      } else {
        btn.style.display = 'none'; btn.disabled = true; btn.onclick = null;
      }
    });
  }
  function updateEntryNumbers() {
    distContainer.querySelectorAll('.dist-entry h5').forEach((h5, i) => { h5.textContent = `EntryPoint ${i + 1}`; });
  }

  document.getElementById(`add-dist-${sessionId}`).onclick = () => addDistributionEntry();
  addDistributionEntry();

  const uploadBtn = document.getElementById(`chc-upload-btn-${sessionId}`);
  const uploadInput = document.getElementById(`chc-upload-input-${sessionId}`);
  if (uploadBtn && uploadInput) {
    uploadBtn.addEventListener('click', () => uploadInput.click());
    uploadInput.addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const chc = JSON.parse(text);
        applyChcToForm(chc);
      } catch (err) {
        const errorBox = document.getElementById(`chc-error-${sessionId}`);
        if (errorBox) {
          errorBox.innerText = 'Invalid CHC JSON file.';
          errorBox.style.display = '';
        } else {
          Swal.fire({ title: 'Error', text: 'Invalid CHC JSON file.', icon: 'error', confirmButtonText: 'OK' });
        }
      } finally {
        e.target.value = '';
      }
    });
  }



  // --- Prefill (Edit) ---
  if (isEdit) {
    try {
      const res = await fetch(`/get_content_hosting_configuration/${sessionId}`);
      if (res.ok) {
        const chc = await res.json();
        applyChcToForm(chc);
      }
    } catch (e) {
      console.warn('Edit prefill failed:', e);
    }
  }

  // --- Close ---
  function closeChcModal() { modal.remove(); }
  modal.querySelectorAll('[data-close]').forEach(btn => btn.onclick = closeChcModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeChcModal();
  });

  // --- Submit ---
  document.getElementById(`chc-form-modal-${sessionId}`).onsubmit = async function (event) {
    event.preventDefault();

    const errorBox = document.getElementById(`chc-error-${sessionId}`);
    if (errorBox) { errorBox.style.display = 'none'; errorBox.innerText = ''; }
    clearAllFieldErrors();

    let protocolValue = (protocolSelect.value || '').trim();
    let hasError = false;

    if (!nameInput.value.trim()) { setFieldError(nameInput, 'Name is required.'); hasError = true; }
    if (!protocolValue) { setFieldError(protocolSelect, 'Please select an ingest protocol.'); hasError = true; }
    if (!baseUrlInput.value.trim()) { setFieldError(baseUrlInput, 'BaseURL is required.'); hasError = true; }


    if (protocolValue === DASH_IF_PUSH) {
      setFieldError(protocolSelect, 'Push ingest is not supported by the AF.');
      hasError = true;
    }

    const distEntries = Array.from(distContainer.querySelectorAll('.dist-entry'));
    if (distEntries.length === 0) {
      setFieldError(document.getElementById(`add-dist-${sessionId}`), 'Please add at least one distribution entry.');
      hasError = true;
    } else {
      for (const entry of distEntries) {
        const pathInput = entry.querySelector('.dist-path');
        const ctypeSelect = entry.querySelector('.dist-contenttype');
        const ctypeCustomInp = entry.querySelector('.dist-contenttype-custom');
        const profilesSelect = entry.querySelector('.dist-profiles');
        const profilesCustom = entry._profilesCustom;

        if (!pathInput.value.trim()) {
          setFieldError(pathInput, 'Relative path is required.'); hasError = true;
        }

        const contentType = (ctypeSelect.value === "__custom__")
          ? (ctypeCustomInp.value || "").trim()
          : ctypeSelect.value;

        if (!contentType) {
          setFieldError(ctypeSelect, 'Content-Type is required.'); hasError = true;
        } else if (ctypeSelect.value === "__custom__" && !isValidMime(contentType)) {
          setFieldError(ctypeSelect, 'Please enter a valid MIME type, e.g. application/xyz.'); hasError = true;
        }

      
        if (REQUIRE_PROFILES) {
          const known = Array.from(profilesSelect.selectedOptions).map(o => o.value);
          let custom = [];
          if (profilesCustom) {
            const raw = profilesCustom.getValue(true);
            custom = Array.isArray(raw) ? raw : (raw ? [raw] : []);
          } else {
            const raw = (entry.querySelector('.dist-profiles-custom')?.value || "");
            custom = raw.split(',').map(s => s.trim()).filter(Boolean);
          }
          const allProfiles = [...known, ...custom].filter(Boolean);
          if (allProfiles.length === 0) {
            setFieldError(profilesSelect, 'Select or add at least one profile.');
            hasError = true;
          }
        }
      }
    }

    if (hasError) {
      if (errorBox) { errorBox.textContent = 'Please fix the highlighted fields.'; errorBox.style.display = ''; }
      updateTopError();
      return;
    }

    const distributionConfigurations = distEntries.map(entry => {
      const path = entry.querySelector('.dist-path').value.trim();
      const ctypeSel = entry.querySelector('.dist-contenttype');
      const ctypeCustomInp = entry.querySelector('.dist-contenttype-custom');
      const profilesSel = entry.querySelector('.dist-profiles');
      const profilesCustom = entry._profilesCustom;

      const contentType = (ctypeSel.value === "__custom__")
        ? (ctypeCustomInp.value || "").trim()
        : ctypeSel.value;

      const selectedKnown = Array.from(profilesSel.selectedOptions).map(o => o.value);
      let customVals = [];
      if (profilesCustom) {
        const raw = profilesCustom.getValue(true);
        customVals = Array.isArray(raw) ? raw : (raw ? [raw] : []);
      } else {
        const raw = (entry.querySelector('.dist-profiles-custom')?.value || "");
        customVals = raw.split(',').map(s => s.trim()).filter(Boolean);
      }
      const profilesCombined = [...selectedKnown, ...customVals].filter(Boolean);

      const entryPoint = { relativePath: path, contentType };
      if (profilesCombined.length) {
        entryPoint.profiles = profilesCombined; 
      }

      return { entryPoint };
    });

    const pullFlag = !!PROTOCOL_TO_PULL[protocolValue];

    const payload = {
      name: nameInput.value.trim(),
      ingestConfiguration: {
        pull: pullFlag,
        protocol: protocolValue,
        baseURL: baseUrlInput.value.trim()
      },
      distributionConfigurations
    };
    console.log('Generated JSON:', payload);

    try {
      const response = await fetch(`/set_content_hosting_configuration/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        if (errorBox) { errorBox.innerText = err.detail || response.statusText || 'Unknown error'; errorBox.style.display = ''; }
        else { Swal.fire({ title: 'Error', text: err.detail || response.statusText, icon: 'error', confirmButtonText: 'OK' }); }
        updateTopError();
        return;
      }

      closeChcModal();

      let freshCHC = null;
      try {
        const r = await fetch(`/get_content_hosting_configuration/${sessionId}`, { cache: "no-store" });
        if (r.ok) freshCHC = await r.json();
      } catch {  }

      window.dispatchEvent(new CustomEvent("chc:saved", {
        detail: { sessionId, chc: freshCHC || payload }
      }));
      document.dispatchEvent(new Event('sessions:reload'));

      notifySuccess('Content Hosting Configuration saved.');

    } catch (e) {
      if (errorBox) { errorBox.innerText = 'Network error: ' + e.message; errorBox.style.display = ''; }
      else { Swal.fire({ title: 'Network or server error', text: e.message, icon: 'error', confirmButtonText: 'OK' }); }
      updateTopError();
    }
  };
}


export async function downloadContentHostingConfiguration(sessionId) {
  try {
    const res = await fetch(`/get_content_hosting_configuration/${sessionId}`);
    if (!res.ok) {
      const msg = (await res.json().catch(() => ({})))?.detail || res.statusText;
      return Swal.fire("Error", `CHC not available for ${sessionId}: ${msg}`, "error");
    }
    const data = await res.json();
    const safeName = (data.name || sessionId).replace(/[^\w.-]+/g, '_');
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Content_Hosting_Configuration_${safeName}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error("Download error:", err);
    Swal.fire("Error", "Problem while downloading Content Hosting Configuration.", "error");
  }
}

export async function deleteContentHostingConfiguration(sessionId) {
  try{
    const res = await fetch(`/provisioning_session/${sessionId}/contenthostingconfiguration/`,{
      method: 'DELETE'
      }
    );
    if (res.ok){
      notifySuccess('Content Hosting Configuration deleted.');
      document.dispatchEvent(new Event('sessions:reload'));
    } else {
      notifyError('Content Hosting Configuration was not deleted.');
    }
  }
  catch (err){
    console.error("CHC Delete error:", err);
    notifyError('Network error while deleting CHC.')
  }
}
