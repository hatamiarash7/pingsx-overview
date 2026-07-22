// The most recent dataset, kept so the export buttons have data to work with.
let latestData = null;

// Inject the content script into the active tab to (re)compute stats.
function requestStats() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];

    // Restricted pages (chrome://, the web store, the new-tab page, …)
    // can't be scripted, so injecting there throws. Guard for a normal
    // web page and show guidance instead of failing silently.
    if (!tab || !tab.url || !/^https?:/.test(tab.url)) {
      showMessage("not_ping");
      return;
    }

    chrome.scripting
      .executeScript({
        target: { tabId: tab.id },
        files: ["content.js"],
      })
      .catch(() => showMessage("not_ping"));
  });
}

// Inject once when the popup opens.
requestStats();

// Listen for messages from the content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action !== "showModal") return;

  if (message.status === "ok" && message.data) {
    latestData = message.data;
    showStats(message.data);
  } else {
    showMessage(message.status);
  }
});

const STATUS_MESSAGES = {
  not_ping: "Open a ping.sx ping page to see statistics.",
  empty: "Waiting for ping results…",
  error: "Couldn't read the ping table on this page.",
};

// Toggle between the stats view and a centered status message.
function showMessage(status) {
  document.getElementById("stats-view").hidden = true;
  document.getElementById("count-badge").hidden = true;

  const messageEl = document.getElementById("message");
  messageEl.hidden = false;
  messageEl.textContent = STATUS_MESSAGES[status] || STATUS_MESSAGES.error;
}

// Classify a latency value so it can be colour-coded in the UI.
function health(ms) {
  if (ms < 100) return "good";
  if (ms < 250) return "warn";
  return "bad";
}

// Render the computed statistics into the popup.
function showStats(data) {
  document.getElementById("message").hidden = true;
  document.getElementById("stats-view").hidden = false;

  const badge = document.getElementById("count-badge");
  badge.hidden = false;
  badge.textContent = `${data.count} nodes`;

  const hero = document.getElementById("avg-mean");
  hero.textContent = data.avg_mean.toFixed(2);
  hero.parentElement.className = "hero-value " + health(data.avg_mean);

  document.getElementById("avg-median").textContent = data.avg_median.toFixed(2);
  document.getElementById("avg-p95").textContent = data.avg_p95.toFixed(2);
  document.getElementById("last-mean").textContent = data.last_mean.toFixed(2);
  document.getElementById("best-mean").textContent = data.best_mean.toFixed(2);
  document.getElementById("worst-mean").textContent = data.worst_mean.toFixed(2);

  const list = document.getElementById("top5-list");
  const scale = data.avg_top5[0] ? data.avg_top5[0].avg : 1;

  list.innerHTML = "";
  data.avg_top5.forEach((item) => {
    const li = document.createElement("li");

    const loc = document.createElement("span");
    loc.className = "loc";
    loc.textContent = item.location;

    const val = document.createElement("span");
    val.className = "val";
    val.textContent = `${item.avg.toFixed(2)} ms`;

    const bar = document.createElement("div");
    bar.className = "bar";
    const fill = document.createElement("span");
    fill.className = health(item.avg);
    fill.style.width = Math.max(4, (item.avg / scale) * 100) + "%";
    bar.appendChild(fill);

    li.append(loc, val, bar);
    list.appendChild(li);
  });
}

// Trigger a browser download for the given text content.
function download(filename, mime, content) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportCsv() {
  if (!latestData) return;
  const header = "location,last,avg,best,worst,stdev";
  const lines = latestData.rows.map((r) =>
    [r.location, r.last, r.avg, r.best, r.wrst, r.stdev].join(",")
  );
  download("pingsx.csv", "text/csv", [header, ...lines].join("\n"));
}

function exportJson() {
  if (!latestData) return;
  download("pingsx.json", "application/json", JSON.stringify(latestData.rows, null, 2));
}

document.getElementById("refresh").addEventListener("click", requestStats);
document.getElementById("export-csv").addEventListener("click", exportCsv);
document.getElementById("export-json").addEventListener("click", exportJson);
