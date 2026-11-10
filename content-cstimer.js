// csTimer keeps its data in page-origin localStorage. Read only known session-like
// entries and normalize the common [time, scramble, comment, timestamp] record form.
function parseSessionValue(value, label) {
  let data;
  try { data = JSON.parse(value); } catch { return []; }
  const result = [];
  const sessionName = typeof data?.[0] === "string" ? data[0] : label;
  const records = Array.isArray(data) && Array.isArray(data[1]) ? data[1] :
    (Array.isArray(data?.solves) ? data.solves : []);

  for (const [index, raw] of records.entries()) {
    if (Array.isArray(raw)) {
      const rawTime = Number(raw[0]);
      if (!Number.isFinite(rawTime) || rawTime <= 0) continue;
      const millis = rawTime > 1000 ? rawTime : rawTime * 1000;
      const rawDate = Number(raw[3]);
      const timestamp = Number.isFinite(rawDate) && rawDate > 0 ? rawDate : Date.now() - (records.length - index);
      const comment = String(raw[2] || "");
      const dnf = /\bDNF\b/i.test(comment);
      const plusTwo = /\+2/.test(comment);
      result.push({
        id: `cstimer-${label}-${timestamp}-${index}`,
        seconds: (millis + (plusTwo ? 2000 : 0)) / 1000,
        puzzle: "333",
        penalty: dnf ? "DNF" : plusTwo ? "+2" : "",
        dnf,
        timestamp,
        scramble: String(raw[1] || ""),
        date: new Date(timestamp).toISOString(),
        session: sessionName
      });
    } else if (raw && typeof raw === "object") {
      const time = Number(raw.seconds ?? raw.time);
      if (!Number.isFinite(time) || time <= 0) continue;
      const timestamp = Number(raw.timestamp) || Date.now();
      const penalty = String(raw.penalty || "");
      result.push({
        id: String(raw.id || `cstimer-${label}-${timestamp}-${index}`),
        seconds: time,
        puzzle: String(raw.puzzle || "333"),
        penalty,
        dnf: Boolean(raw.dnf) || penalty.toUpperCase() === "DNF",
        timestamp,
        scramble: String(raw.scramble || ""),
        date: new Date(timestamp).toISOString(),
        session: sessionName
      });
    }
  }
  return result;
}

function readSolves() {
  const all = [];
  for (const key of Object.keys(localStorage)) {
    if (!/^session\d+$/i.test(key)) continue;
    all.push(...parseSessionValue(localStorage.getItem(key), key));
  }
  const seen = new Set();
  return all.filter((solve) => {
    if (seen.has(solve.id)) return false;
    seen.add(solve.id);
    return true;
  });
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "READ_CSTIMER_SOLVES") return false;
  try {
    const solves = readSolves();
    sendResponse(solves.length
      ? { ok: true, solves }
      : { ok: false, error: "No solves found in csTimer session storage. Select a session that contains solves." });
  } catch (error) {
    sendResponse({ ok: false, error: error.message || "Unable to read csTimer data." });
  }
  return true;
});
