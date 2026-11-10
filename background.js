const DEFAULT_CUBETRACK_URL = "https://caleb-esc.github.io/CubeTrack/";
const CSTIMER_URLS = ["https://cstimer.net/*", "https://www.cstimer.net/*"];

async function getCubeTrackUrl() {
  const { cubetrackUrl } = await chrome.storage.local.get("cubetrackUrl");
  return (cubetrackUrl || DEFAULT_CUBETRACK_URL).trim();
}

async function requestTab(tabId, message) {
  try {
    return await chrome.tabs.sendMessage(tabId, message);
  } catch {
    throw new Error("The page bridge is not ready. Reload the csTimer or CubeTrack tab and try again.");
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "GET_SETTINGS") {
    getCubeTrackUrl().then((cubetrackUrl) => sendResponse({ ok: true, cubetrackUrl }));
    return true;
  }

  if (message?.type === "SAVE_SETTINGS") {
    const cubetrackUrl = String(message.cubetrackUrl || DEFAULT_CUBETRACK_URL).trim();
    chrome.storage.local.set({ cubetrackUrl }).then(() => sendResponse({ ok: true, cubetrackUrl }));
    return true;
  }

  if (message?.type !== "SYNC_FROM_CSTIMER") return false;

  (async () => {
    try {
      const tabs = await chrome.tabs.query({ url: CSTIMER_URLS });
      const timerTab = tabs[0];
      if (!timerTab?.id) throw new Error("Open csTimer in Chrome first, then reload its tab.");

      const read = await requestTab(timerTab.id, { type: "READ_CSTIMER_SOLVES" });
      if (!read?.ok) throw new Error(read?.error || "Could not read solves from csTimer.");
      if (!read.solves?.length) throw new Error("No solves found. Check that the selected csTimer session has solves.");

      const cubetrackUrl = await getCubeTrackUrl();
      let target = (await chrome.tabs.query({ url: `${cubetrackUrl}*` }))[0];
      if (!target?.id) {
        target = await chrome.tabs.create({ url: cubetrackUrl, active: true });
        await new Promise((resolve) => setTimeout(resolve, 1200));
      }
      if (!target?.id) throw new Error("Could not open CubeTrack. Check the URL in settings.");

      const imported = await requestTab(target.id, { type: "IMPORT_SOLVES", solves: read.solves });
      if (!imported?.ok) throw new Error(imported?.error || "CubeTrack could not import the solves.");
      sendResponse({ ok: true, added: imported.added, total: read.solves.length });
    } catch (error) {
      sendResponse({ ok: false, error: error.message || "Sync failed." });
    }
  })();
  return true;
});
