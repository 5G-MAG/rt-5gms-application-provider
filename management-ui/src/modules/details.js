/*
License: 5G-MAG Public License (v1.0)
Author: Erik Gaida
Copyright: (C) Fraunhofer FOKUS
For full license terms please see the LICENSE file distributed with this
program. If this file is missing then the license can be retrieved from
https://drive.google.com/file/d/1cinCiA778IErENZ3JN52VFW-1ffHpx7Z/view
*/
import { notifyInfo, notifySuccess, notifyError } from "./notify.js";

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
      <div class="chc-form-scrollable" id="${modalId}-body" style="flex:1 1 auto; min-height:0; overflow:auto;"></div>
      <div class="chc-modal-footer">
        <button type="button" class="btn btn-secondary" data-expand-all>Expand all</button>
        <button type="button" class="btn btn-secondary" data-collapse-all>Collapse all</button>
        <button type="button" class="btn btn-danger" data-close>Close</button>
      </div>
    </div>
  </div>`;
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
  ` : `
    <p style="margin:0 0 10px;"><b>Content Hosting Configuration not created.</b></p>
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