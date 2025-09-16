/*
License: 5G-MAG Public License (v1.0)
Author: Erik Gaida
Edits: ChatGPT (notifications modularized)
Copyright: (C) Fraunhofer FOKUS
For full license terms please see the LICENSE file distributed with this
program. If this file is missing then the license can be retrieved from
https://drive.google.com/file/d/1cinCiA778IErENZ3JN52VFW-1ffHpx7Z/view
*/
import { openContentHostingConfigurationForm } from "./contentHostingConfiguration.js";
import { notifyInfo, notifySuccess, notifyError } from "./notify.js";


const __chcOverrides = new Map();

const textOrDash = v => (v === undefined || v === null || v === "" || v === "Not defined") ? "—" : String(v);
const HTTP_PULL = "urn:3gpp:5gms:content-protocol:http-pull-ingest";
const DASH_IF_PUSH = "urn:3gpp:5gms:content-protocol:dash-if-ingest";

function escapeHtml(str) {
  return String(str)
    .replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

const htmlVal = (v) => escapeHtml(textOrDash(v));

function destroyModal(id){ const el=document.getElementById(id); if(el) el.remove(); }

function getDetailsModalHtml(modalId, title) {
  return `
  <div id="${modalId}" class="modal" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}">
    <div class="modal-content" style="display:flex; flex-direction:column; max-height:90vh; overflow:hidden;">
      <button class="close" type="button" data-close aria-label="Close">×</button>
      <h3 style="margin:0 0 8px; font-weight:600;">${escapeHtml(title)}</h3>
      <div class="chc-form-scrollable" id="${modalId}-body" style="flex:1 1 auto;"></div>
      <div class="chc-modal-footer">
        <button type="button" class="btn btn-secondary" data-expand-all>Expand all</button>
        <button type="button" class="btn btn-secondary" data-collapse-all>Collapse all</button>
        <button type="button" class="btn btn-danger" data-close>Close</button>
      </div>
    </div>
  </div>`;
}

async function openChcEditorFromDetails(sessionId, chcOrNull, reopenSelection) {
  destroyModal("DetailsModalAccordion");
  const sel = (reopenSelection && reopenSelection.length) ? reopenSelection : [sessionId];

  const onSaved = (ev) => {
    const { sessionId: savedId, chc } = ev.detail || {};
    if (!savedId) return;
    __chcOverrides.set(savedId, chc || null);

    document.dispatchEvent(new CustomEvent('sessions:reload'));

    window.removeEventListener("chc:saved", onSaved);
    openDetails(sel);
  };
  window.addEventListener("chc:saved", onSaved, { once: true });

  await openContentHostingConfigurationForm(sessionId, false);

  if (!chcOrNull || chcOrNull === "Not defined") return;

  requestAnimationFrame(() => {
    const modal = document.getElementById(`ContentHostingConfigurationModal-${sessionId}`);
    if (!modal) return;

    const nameInput = modal.querySelector(`#content_hosting_configuration-name-${sessionId}`);
    const baseUrlInput = modal.querySelector(`#base-url-${sessionId}`);
    const protocolSelect = modal.querySelector(`#protocol-select-${sessionId}`);
    const addBtn = modal.querySelector(`#add-dist-${sessionId}`);
    const distContainer = modal.querySelector(`#dist-container-${sessionId}`);

    if (nameInput) nameInput.value = chcOrNull.name || "";
    if (baseUrlInput) baseUrlInput.value = chcOrNull.ingestConfiguration?.baseURL || "";

    const proto = (chcOrNull.ingestConfiguration?.protocol === DASH_IF_PUSH)
      ? HTTP_PULL
      : (chcOrNull.ingestConfiguration?.protocol || HTTP_PULL);
    if (protocolSelect) {
      protocolSelect.value = proto;
      protocolSelect.dispatchEvent(new Event("change", { bubbles: true }));
    }

    
    distContainer?.querySelectorAll(".dist-entry").forEach(e => e.remove());
    const list = Array.isArray(chcOrNull.distributionConfigurations) ? chcOrNull.distributionConfigurations : [];
    if (list.length === 0) { addBtn?.click(); return; }
    list.forEach(dc => {
      const ep = dc.entryPoint || dc;
      addBtn?.click();
      const entry = distContainer?.querySelector(".dist-entry:last-of-type");
      if (!entry) return;
      const pathInput = entry.querySelector(".dist-path");
      if (pathInput) pathInput.value = ep.relativePath || "";

      const ctypeSel = entry.querySelector(".dist-contenttype");
      const ctypeCustomInp = entry.querySelector(".dist-contenttype-custom");
      const desired = (ep.contentType || "").toLowerCase();
      if (ctypeSel) {
        const optMatch = Array.from(ctypeSel.options).find(o => o.value.toLowerCase() === desired);
        if (optMatch) {
          ctypeSel.value = optMatch.value;
          ctypeSel.dispatchEvent(new Event("change", { bubbles: true }));
        } else {
          ctypeSel.value = "__custom__";
          ctypeSel.dispatchEvent(new Event("change", { bubbles: true }));
          if (ctypeCustomInp) ctypeCustomInp.value = ep.contentType || "";
        }
      }

      const profiles = Array.isArray(ep.profiles) ? ep.profiles : [];
      const profSel = entry.querySelector(".dist-profiles");
      const customCtl = entry._profilesCustom;
      const knownValues = []; const unknownValues = [];
      profiles.forEach(p => {
        const isKnown = !!(profSel && Array.from(profSel.options).some(o => o.value === p));
        (isKnown ? knownValues : unknownValues).push(p);
      });
      if (profSel && knownValues.length) {
        Array.from(profSel.options).forEach(o => { o.selected = knownValues.includes(o.value); });
        profSel.dispatchEvent(new Event("change", { bubbles: true }));
      }
      if (unknownValues.length) {
        if (customCtl && typeof customCtl.setValue === "function") customCtl.setValue(unknownValues);
        else {
          const nativeCustom = entry.querySelector(".dist-profiles-custom");
          if (nativeCustom) nativeCustom.value = unknownValues.join(",");
        }
      }
    });
  });
}


function buildSessionSection(sessionId, sessionDetails, reopenSelection) {
  const wrapper = document.createElement("div");
  wrapper.setAttribute("data-accordion-item", sessionId);
  wrapper.style.border = "1px solid #d4e3ec";
  wrapper.style.borderRadius = "10px";
  wrapper.style.background = "#fff";
  wrapper.style.margin = "8px 0";

  
  const safeDetails = (sessionDetails && typeof sessionDetails === "object") ? sessionDetails : {};
  const chc = safeDetails.ContentHostingConfiguration ?? "Not defined";
  const hasChc = !!chc && chc !== "Not defined";
  const chcName = (hasChc && typeof chc.name === "string" && chc.name.trim()) ? chc.name.trim() : "";

  
  const header = document.createElement("button");
  header.type = "button";
  header.className = "btn btn-secondary";
  header.style.cssText = [
    "width:100%","text-align:left","display:flex","align-items:center","justify-content:space-between",
    "gap:10px","border-radius:10px 10px 0 0","padding:10px 12px"
  ].join(";");
  header.setAttribute("data-accordion-toggle", "");
  header.innerHTML = `
    <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; width:100%;">
      <div style="min-width:0; display:flex; flex-direction:column; line-height:1.1;">
        <span class="hdr-name" title="${escapeHtml(chcName || sessionId)}"
              style="font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
          ${escapeHtml(chcName || sessionId)}
        </span>
        ${chcName ? `
          <span class="hdr-id" title="${escapeHtml(sessionId)}"
                style="font-size:12px; color:#6b7280; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
            ${escapeHtml(sessionId)}
          </span>` : ``}
      </div>
      <span style="flex:0 0 auto;" data-chevron>▾</span>
    </div>
  `;

 
  const content = document.createElement("div");
  content.setAttribute("data-accordion-content", "");
  content.style.padding = "12px 14px";
  content.style.display = "none";

  const chcBlock = hasChc ? `
    <div class="form-group">
      <label>Name</label>
      <input type="text" value="${htmlVal(chc.name)}" readonly>
    </div>
    <div class="form-group">
      <label>BaseURL</label>
      <input type="text" value="${htmlVal(chc?.ingestConfiguration?.baseURL)}" readonly>
    </div>
    <div class="form-group">
      <label>Protocol</label>
      <input type="text" value="${htmlVal(chc?.ingestConfiguration?.protocol)}" readonly>
    </div>
    <legend>Media Distribution Configurations</legend>
    <div>${renderDistributionsHtml(chc)}</div>
    <div style="display:flex; gap:8px; flex-wrap:wrap;">
      <button type="button" class="btn btn-primary" data-edit-chc>Edit</button>
      <button type="button" class="btn btn-primary" data-upload-chc>Upload</button>
      <input type="file" accept="application/json" data-upload-chc-input style="display:none;">
    </div>
  ` : `
    <p style="margin:0 0 10px;"><b>Content Hosting Configuration not created.</b></p>
    <div style="display:flex; gap:8px; flex-wrap:wrap;">
      <button type="button" class="btn btn-primary" data-create-chc>Create</button>
      <button type="button" class="btn btn-primary" data-upload-chc>Upload</button>
      <input type="file" accept="application/json" data-upload-chc-input style="display:none;">
    </div>
  `;

  content.innerHTML = `
    <fieldset><legend>Content Hosting Configuration</legend>${chcBlock}</fieldset>
    <fieldset><legend>Consumption Reporting</legend>
      <pre style="background:#f9fafb; padding:8px; border:1px solid #ddd;">${escapeHtml(JSON.stringify(safeDetails.ConsumptionReportingConfiguration ?? "Not defined", null, 2))}</pre>
    </fieldset>
    <fieldset><legend>Policy Templates</legend>
      <pre style="background:#f9fafb; padding:8px; border:1px solid #ddd;">${escapeHtml(JSON.stringify(safeDetails.PolicyTemplates ?? {}, null, 2))}</pre>
    </fieldset>
    <fieldset><legend>Metrics Reporting Configurations</legend>
      <pre style="background:#f9fafb; padding:8px; border:1px solid #ddd;">${escapeHtml(JSON.stringify(safeDetails.MetricsReportingConfigurations ?? {}, null, 2))}</pre>
    </fieldset>
    <fieldset><legend>Certificates</legend>
      <pre style="background:#f9fafb; padding:8px; border:1px solid #ddd;">${escapeHtml(JSON.stringify(safeDetails.Certificates ?? {}, null, 2))}</pre>
    </fieldset>
  `;

  if (hasChc) {
    content.querySelector('[data-edit-chc]')?.addEventListener('click', () => {
      openChcEditorFromDetails(sessionId, chc, reopenSelection);
    });
  } else {
    content.querySelector('[data-create-chc]')?.addEventListener('click', () => {
      openChcEditorFromDetails(sessionId, null, reopenSelection);
    });
  }

  const uploadBtn   = content.querySelector('[data-upload-chc]');
  const uploadInput = content.querySelector('[data-upload-chc-input]');
  uploadBtn?.addEventListener('click', () => uploadInput?.click());
  uploadInput?.addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const resp = await fetch(`/set_content_hosting_configuration/${sessionId}`, {
        method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(json)
      });
      if (!resp.ok) {
        let msg = resp.statusText;
        try { const j = await resp.json(); msg = j.detail || msg; } catch {}
        notifyError(msg || "Upload/Save failed.");
        return;
      }
      const saved = await fetch(`/get_content_hosting_configuration/${sessionId}`, { cache:'no-store' })
        .then(r => r.ok ? r.json() : null).catch(() => null);
      __chcOverrides.set(sessionId, saved || json);

      notifySuccess("Content Hosting Configuration uploaded & saved.");

      document.dispatchEvent(new CustomEvent('sessions:reload'));

      const sel = (reopenSelection && reopenSelection.length) ? reopenSelection : [sessionId];
      openDetails(sel);
    } catch (err) {
      notifyError("Invalid or unreadable JSON file.");
    } finally {
      e.target.value = '';
    }
  });

  header.addEventListener("click", () => {
    const visible = content.style.display !== "none";
    content.style.display = visible ? "none" : "block";
    const chev = header.querySelector("[data-chevron]");
    if (chev) chev.textContent = visible ? "▸" : "▾";
  });

  wrapper.appendChild(header);
  wrapper.appendChild(content);
  return wrapper;
}

function renderDistributionsHtml(chc) {
  if (!chc || chc === "Not defined" || !Array.isArray(chc.distributionConfigurations) || !chc.distributionConfigurations.length) {
    return `<p>No distribution entries.</p>`;
  }
  return chc.distributionConfigurations.map((dc, i) => {
    const ep = dc.entryPoint || dc;
    const profs = Array.isArray(ep.profiles) ? ep.profiles.join(", ") : "—";
    return `
      <div class="dist-entry" style="margin-bottom:10px;">
        <h5>EntryPoint ${i + 1}</h5>
        <div class="form-group">
          <label>Relative Path</label>
          <input type="text" value="${htmlVal(ep.relativePath)}" readonly>
        </div>
        <div class="form-group">
          <label>Content-Type</label>
          <input type="text" value="${htmlVal(ep.contentType)}" readonly>
        </div>
        <div class="form-group">
          <label>Profiles</label>
          <input type="text" value="${htmlVal(profs)}" readonly style="white-space:normal; overflow-wrap:anywhere;">
        </div>
      </div>
    `;
  }).join("");
}

export async function openDetails(sessionIds) {
  try {
    if (!Array.isArray(sessionIds)) sessionIds = [sessionIds];
    sessionIds = sessionIds.filter(Boolean);
    if (sessionIds.length === 0) {
      notifyInfo("Please select at least one session.");
      return;
    }

    const res = await fetch("/details", { cache: "no-store" });
    if (!res.ok) {
      notifyError("Could not load session details.");
      return;
    }
    const payload = await res.json();
    const allDetails = (payload && typeof payload === "object" && ("Details" in payload))
      ? (payload.Details || {}) : (payload || {});

    const present = sessionIds;

    const modalId = "DetailsModalAccordion";
    destroyModal(modalId);

    const wrapper = document.createElement("div");
    wrapper.innerHTML = getDetailsModalHtml(modalId, "Session Details");
    document.body.appendChild(wrapper.firstElementChild);

    const modal = document.getElementById(modalId);
    const body = document.getElementById(`${modalId}-body`);

    present.forEach(sid => {
      const details = allDetails[sid] || {
        ContentHostingConfiguration: "Not defined",
        ConsumptionReportingConfiguration: "Not defined",
        PolicyTemplates: {},
        MetricsReportingConfigurations: {},
        Certificates: {}
      };
      if (__chcOverrides.has(sid)) {
        const overrideChc = __chcOverrides.get(sid);
        details.ContentHostingConfiguration = overrideChc || "Not defined";
        __chcOverrides.delete(sid);
      }
      const section = buildSessionSection(sid, details, present);
      body.appendChild(section);
    });

    const closeAll = () => destroyModal(modalId);
    modal.querySelectorAll("[data-close]").forEach(btn => btn.addEventListener("click", closeAll));
    modal.addEventListener("click", e => { if (e.target === modal) closeAll(); });
    document.addEventListener("keydown", modal._esc = (ev) => { if (ev.key === "Escape") closeAll(); });

    const setAll = (show) => {
      body.querySelectorAll("[data-accordion-item]").forEach(item => {
        const cnt = item.querySelector("[data-accordion-content]");
        const chev = item.querySelector("[data-chevron]");
        if (!cnt) return;
        cnt.style.display = show ? "block" : "none";
        if (chev) chev.textContent = show ? "▾" : "▸";
      });
    };
    modal.querySelector("[data-expand-all]")?.addEventListener("click", () => setAll(true));
    modal.querySelector("[data-collapse-all]")?.addEventListener("click", () => setAll(false));
    modal.style.display = "flex";

  } catch (err) {
    console.error("[details] openDetails error:", err);
    notifyError(err?.message || "Unexpected error opening details.");
  }
}