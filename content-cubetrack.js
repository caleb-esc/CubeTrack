const STORE_KEY = "cubetrack_data_v1";

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "IMPORT_SOLVES") return false;
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY) || '{"solves":[],"practice":{}}');
    const solves = Array.isArray(saved.solves) ? saved.solves : [];
    const seen = new Set(solves.map((solve) => solve.id));
    let added = 0;
    for (const input of (Array.isArray(message.solves) ? message.solves : [])) {
      const seconds = Number(input?.seconds);
      const timestamp = Number(input?.timestamp) || Date.now();
      if (!Number.isFinite(seconds) || seconds <= 0) continue;
      const id = String(input.id || `cstimer-${timestamp}-${seconds}`);
      if (seen.has(id)) continue;
      solves.push({
        id,
        puzzle: String(input.puzzle || "333"),
        seconds,
        dnf: Boolean(input.dnf),
        penalty: String(input.penalty || ""),
        timestamp,
        scramble: String(input.scramble || ""),
        date: String(input.date || new Date(timestamp).toISOString())
      });
      seen.add(id);
      added += 1;
    }
    localStorage.setItem(STORE_KEY, JSON.stringify({ ...saved, solves }));
    window.dispatchEvent(new CustomEvent("cubetrack:solvesImported", { detail: { added } }));
    sendResponse({ ok: true, added, total: solves.length });
  } catch (error) {
    sendResponse({ ok: false, error: error.message || "Could not save solves to CubeTrack." });
  }
  return true;
});
