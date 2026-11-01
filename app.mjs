import { STRINGS } from "./strings.mjs";
import { validatePilotUrl } from "./url-validation.mjs";

const elements = {
  language: document.querySelector("#language"),
  status: document.querySelector("#status-text"),
  detail: document.querySelector("#status-detail"),
  connection: document.querySelector("#connection"),
  open: document.querySelector("#open-pilot"),
  refresh: document.querySelector("#refresh"),
  install: document.querySelector("#install"),
};
let language = "ru";
try {
  const stored = localStorage.getItem("erp-pilot-entry-language");
  if (stored && Object.hasOwn(STRINGS, stored)) language = stored;
} catch { /* Приватный режим может запрещать localStorage. */ }
let state = "loading";
let activeUrl = null;
let loading = false;
let installPrompt = null;

function renderState() {
  const strings = STRINGS[language];
  elements.status.textContent = strings[state];
  elements.connection.dataset.state = state;
  const detail = state === "offline" ? strings.offlineDetail : state === "unavailable" ? strings.unavailableDetail : "";
  elements.detail.textContent = detail;
  elements.detail.hidden = !detail;
  const available = state === "ready" && activeUrl;
  elements.open.classList.toggle("disabled", !available);
  elements.open.setAttribute("aria-disabled", available ? "false" : "true");
  elements.open.tabIndex = available ? 0 : -1;
  if (available) elements.open.href = activeUrl;
  else elements.open.removeAttribute("href");
  elements.refresh.disabled = loading;
}
function renderLanguage() {
  document.documentElement.lang = language;
  elements.language.value = language;
  elements.language.setAttribute("aria-label", STRINGS[language].language);
  for (const element of document.querySelectorAll("[data-i18n]")) {
    const value = STRINGS[language][element.dataset.i18n];
    if (typeof value === "string") element.textContent = value;
  }
  renderState();
}
async function refresh() {
  if (loading) return null;
  activeUrl = null;
  if (!navigator.onLine) {
    state = "offline";
    renderState();
    return null;
  }
  loading = true;
  state = "loading";
  renderState();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(new URL(`./config.json?t=${Date.now()}`, import.meta.url), {
      cache: "no-store",
      credentials: "omit",
      redirect: "error",
      signal: controller.signal,
    });
    if (!response.ok) throw new Error("Configuration unavailable");
    const config = await response.json();
    const url = validatePilotUrl(config?.app_url);
    if (config?.version !== 1 || config?.available !== true || !url) throw new Error("Configuration unavailable");
    activeUrl = url;
    state = "ready";
  } catch {
    state = navigator.onLine ? "unavailable" : "offline";
  } finally {
    clearTimeout(timeout);
    loading = false;
    renderState();
  }
  return activeUrl;
}
elements.language.addEventListener("change", () => {
  if (!Object.hasOwn(STRINGS, elements.language.value)) return;
  language = elements.language.value;
  try { localStorage.setItem("erp-pilot-entry-language", language); } catch { /* Выбор действует до закрытия страницы. */ }
  renderLanguage();
});
elements.refresh.addEventListener("click", refresh);
elements.open.addEventListener("click", async (event) => {
  event.preventDefault();
  if (elements.open.getAttribute("aria-disabled") === "true") return;
  // Адрес мог измениться после пробуждения телефона: перепроверяем перед переходом.
  const url = await refresh();
  if (url) window.location.assign(url);
});
window.addEventListener("online", refresh);
window.addEventListener("offline", () => {
  activeUrl = null;
  state = "offline";
  renderState();
});
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") refresh();
});
window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  installPrompt = event;
  elements.install.hidden = false;
});
elements.install.addEventListener("click", async () => {
  if (!installPrompt) return;
  await installPrompt.prompt();
  installPrompt = null;
  elements.install.hidden = true;
});
window.addEventListener("appinstalled", () => {
  installPrompt = null;
  elements.install.hidden = true;
});
renderLanguage();
refresh();
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js", { scope: "./", updateViaCache: "none" }).catch(() => {
    // Вход работает и без установки оболочки для офлайн-показа.
  });
}
