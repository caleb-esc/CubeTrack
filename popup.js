const DEFAULT_URL = "https://caleb-esc.github.io/CubeTrack/";
const $ = (id) => document.getElementById(id);
const status = (text, kind = "") => { $("status").textContent = text; $("status").className = kind; };

async function send(message) {
  return chrome.runtime.sendMessage(message);
}

async function loadSettings() {
  try {
    const result = await send({ type: "GET_SETTINGS" });
    $("site").value = result?.cubetrackUrl || DEFAULT_URL;
  } catch {
    $("site").value = DEFAULT_URL;
  }
}

$("save").addEventListener("click", async () => {
  const cubetrackUrl = $("site").value.trim() || DEFAULT_URL;
  try {
    const url = new URL(cubetrackUrl);
    if (!/^https?:$/.test(url.protocol)) throw new Error("Use an http or https website address.");
    await send({ type: "SAVE_SETTINGS", cubetrackUrl: url.href });
    status("CubeTrack website saved.", "success");
  } catch (error) {
    status(error.message || "Could not save that address.", "error");
  }
});

$("sync").addEventListener("click", async () => {
  const button = $("sync");
  button.disabled = true;
  button.innerHTML = "<span>◌</span> Syncing…";
  status("Reading your csTimer session…");
  try {
    const result = await send({ type: "SYNC_FROM_CSTIMER" });
    if (!result?.ok) throw new Error(result?.error || "Sync failed.");
    status(`Done — ${result.added} new solve${result.added === 1 ? "" : "s"} added.`, "success");
  } catch (error) {
    status(error.message || "Sync failed.", "error");
  } finally {
    button.disabled = false;
    button.innerHTML = "<span>↗</span> Sync from csTimer";
  }
});

loadSettings();
