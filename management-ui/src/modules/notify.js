/*
License: 5G-MAG Public License (v1.0)
Author: Erik Gaida
Edits: ChatGPT (notifications modularized)
Copyright: (C) Fraunhofer FOKUS
For full license terms please see the LICENSE file distributed with this
program. If this file is missing then the license can be retrieved from
https://drive.google.com/file/d/1cinCiA778IErENZ3JN52VFW-1ffHpx7Z/view
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
} = {}) {
  return new Promise(resolve => {
    const overlay = document.createElement("div");
    overlay.className = "notify-confirm__overlay";
    overlay.style.zIndex = Z;

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

    const done = (val) => {
      window.removeEventListener("keydown", onKey);
      overlay.remove();
      resolve(val);
    };
    const onKey = (e) => {
      if (e.key === "Escape") done(false);
      if (e.key === "Enter")  done(true);
    };

    cancelBtn.addEventListener("click", () => done(false));
    okBtn.addEventListener("click", () => done(true));
    overlay.addEventListener("click", (e) => { if (e.target === overlay) done(false); });
    window.addEventListener("keydown", onKey);

    actions.append(cancelBtn, okBtn);
    card.append(title, msg, actions);
    overlay.append(card);
    document.body.append(overlay);
    setTimeout(() => okBtn.focus(), 0);
  });
}
