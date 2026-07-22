// Known aliases for each metric column. The table is matched by header
// text so a layout change on ping.sx doesn't silently read the wrong
// columns; the numbers in the array are the historical fallback indices.
const COLUMNS = {
  location: { aliases: ["location", "node"], fallback: 0 },
  last: { aliases: ["last"], fallback: 5 },
  avg: { aliases: ["avg", "average"], fallback: 6 },
  best: { aliases: ["best", "min"], fallback: 7 },
  wrst: { aliases: ["wrst", "worst", "max"], fallback: 8 },
  stdev: { aliases: ["stdev", "std", "mdev"], fallback: 9 },
};

// Build a { metric: columnIndex } map from the table header row, falling
// back to the historical fixed indices when a header can't be matched.
function resolveColumns() {
  const headers = [...document.querySelectorAll("thead th")].map((th) =>
    th.innerText.trim().toLowerCase()
  );

  const map = {};
  for (const [key, { aliases, fallback }] of Object.entries(COLUMNS)) {
    const index = headers.findIndex((h) =>
      aliases.some((alias) => h.includes(alias))
    );
    map[key] = index === -1 ? fallback : index;
  }
  return map;
}

function extractPingData() {
  // Bail out early when the popup is opened on a page that isn't ping.sx.
  if (location.hostname !== "ping.sx") {
    send({ action: "showModal", status: "not_ping" });
    return;
  }

  const cols = resolveColumns();
  const rows = [];

  document.querySelectorAll("tbody tr").forEach((tr) => {
    const tds = tr.querySelectorAll("td");
    if (tds.length < 11) return; // skip malformed rows

    const cell = (key) => tds[cols[key]] && tds[cols[key]].innerText.trim();

    const location = cell("location");
    const last = parseFloat(cell("last"));
    const avg = parseFloat(cell("avg"));
    const best = parseFloat(cell("best"));
    const wrst = parseFloat(cell("wrst"));
    const stdev = parseFloat(cell("stdev"));

    // push only if valid numeric values
    if ([last, avg, best, wrst, stdev].every((n) => !isNaN(n))) {
      rows.push({ location, last, avg, best, wrst, stdev });
    }
  });

  // No results have streamed in yet (or the page has none).
  if (rows.length === 0) {
    send({ action: "showModal", status: "empty" });
    return;
  }

  // mean calculator
  const mean = (arr, key) =>
    arr.reduce((sum, r) => sum + r[key], 0) / arr.length;

  const data = {
    count: rows.length,
    last_mean: mean(rows, "last"),
    avg_mean: mean(rows, "avg"),
    best_mean: mean(rows, "best"),
    worst_mean: mean(rows, "wrst"),
    avg_top5: [...rows].sort((a, b) => b.avg - a.avg).slice(0, 5),
  };

  // Send the data to the modal
  send({ action: "showModal", status: "ok", data });
}

// The popup may be closed while the observer is still running, which
// leaves no receiver; swallow that expected error.
function send(message) {
  try {
    chrome.runtime.sendMessage(message).catch(() => {});
  } catch (_) {
    /* ignore */
  }
}

// Recompute whenever ping.sx appends or updates a result row, so the
// popup reflects locations as they stream in rather than a single
// early snapshot. Debounced to coalesce bursts of DOM mutations.
function watchForUpdates() {
  let timer = null;
  const observer = new MutationObserver(() => {
    clearTimeout(timer);
    timer = setTimeout(extractPingData, 300);
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

// The script is re-injected every time the popup opens; only wire up the
// observer once, but always emit a fresh snapshot.
extractPingData();
if (!window.__pingsxWatching) {
  window.__pingsxWatching = true;
  watchForUpdates();
}
