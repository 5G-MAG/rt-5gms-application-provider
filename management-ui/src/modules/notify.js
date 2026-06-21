/*
License: 5G-MAG Public License (v1.0)
Author: Erik Gaida
Copyright: (C) Fraunhofer FOKUS
For full license terms please see the LICENSE file distributed with this
program. If this file is missing then the license can be retrieved from
https://hub.5g-mag.com/Getting-Started/OFFICIAL_5G-MAG_Public_License_v1.0.pdf
*/
const Z = 2147483647;

function getHost(target = document.body) {
  const isBody = target === document.body || target === document.documentElement;
  const id = isBody ? "notify-host-body" : "notify-host-inset";
  const parent = isBody ? document.body : target;

  let host = parent.querySelector(`#${CSS.escape(id)}`);
  if (!host) {
    host = document.createElement("div");
    host.id = id;
    host.className = "notify-host" + (isBody ? "" : " notify-host--inset");
    if (!isBody && getComputedStyle(parent).position === "static") {
      parent.style.position = "relative";
    }
    parent.appendChild(host);
  }
  return host;
}

function showToast(text, tone = "info", { target = document.body, timeout = 2800 } = {}) {
  const host = getHost(target);
  const el = document.createElement("div");
  el.className = `notify notify--${tone}`;
  el.setAttribute("role", "status");
  el.textContent = text;

  const kill = () => {
    el.classList.remove("notify--show");
    el.addEventListener("transitionend", () => el.remove(), { once: true });
  };

  host.appendChild(el);
  requestAnimationFrame(() => el.classList.add("notify--show"));
  if (timeout > 0) setTimeout(kill, timeout);
  el.addEventListener("click", kill);
}

export const notifyInfo    = (t, o) => showToast(t, "info", o);
export const notifySuccess = (t, o) => showToast(t, "success", o);
export const notifyError   = (t, o) => showToast(t, "error", o);

export function confirmPrompt({
  message,
  confirmText = "OK",
  cancelText = "Cancel",
  tone = "danger",
  // optionaler Download-Button:
  // download: { url: string, fileName?: string, text?: string }
  download
} = {}) {
  // wenn kein Download übergeben wird, bleibt das alte Verhalten (boolean) erhalten
  const returnMode = download ? "tri" : "bool";

  return new Promise(resolve => {
    const overlay = document.createElement("div");
    overlay.className = "notify-confirm__overlay";
    overlay.style.zIndex = 2147483647;

    const card = document.createElement("div");
    card.className = "notify-confirm__card";

    const title = document.createElement("div");
    title.className = "notify-confirm__title";
    title.textContent = "Please confirm";

    const msg = document.createElement("div");
    msg.className = "notify-confirm__message";
    msg.textContent = message || "";

    const actions = document.createElement("div");
    actions.className = "notify-confirm__actions";

    const cancelBtn = document.createElement("button");
    cancelBtn.className = "notify-btn notify-btn--cancel";
    cancelBtn.type = "button";
    cancelBtn.textContent = cancelText;

    const okBtn = document.createElement("button");
    okBtn.className = `notify-btn notify-btn--ok notify-btn--${tone}`;
    okBtn.type = "button";
    okBtn.textContent = confirmText;

    const finish = (val) => {
      window.removeEventListener("keydown", onKey);
      overlay.remove();
      resolve(val);
    };
    const onKey = (e) => {
      if (e.key === "Escape") finish(returnMode === "bool" ? false : "cancel");
      if (e.key === "Enter")  finish(returnMode === "bool" ? true  : "ok");
    };

    cancelBtn.addEventListener("click", () => finish(returnMode === "bool" ? false : "cancel"));
    okBtn.addEventListener("click", () => finish(returnMode === "bool" ? true  : "ok"));
    overlay.addEventListener("click", (e) => { if (e.target === overlay) finish(returnMode === "bool" ? false : "cancel"); });
    window.addEventListener("keydown", onKey);

    actions.append(cancelBtn, okBtn);

    if (download && download.url) {
      const dlBtn = document.createElement("button");
      dlBtn.className = "notify-btn notify-btn--ok notify-btn--success";
      dlBtn.type = "button";
      dlBtn.textContent = download.text || "Download";
      dlBtn.addEventListener("click", () => {
        const a = document.createElement("a");
        a.href = download.url;
        if (download.fileName) a.download = download.fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        finish("download");
      });
      actions.append(dlBtn);
    }

    card.append(title, msg, actions);
    overlay.append(card);
    document.body.append(overlay);
    setTimeout(() => okBtn.focus(), 0);
  });
}
