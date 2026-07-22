// The most recent dataset, kept so the export buttons have data to work with.
let latestData = null;

// Inject the content script into the active tab to (re)compute stats.
function requestStats() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) return;
    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      files: ["content.js"],
    });
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

  const messageEl = document.getElementById("message");
  messageEl.hidden = false;
  messageEl.textContent = STATUS_MESSAGES[status] || STATUS_MESSAGES.error;
}

// Render the computed statistics into the popup.
function showStats(data) {
  document.getElementById("message").hidden = true;
  document.getElementById("stats-view").hidden = false;

  document.getElementById("count").textContent = data.count;
  document.getElementById("last-mean").textContent = data.last_mean.toFixed(2);
  document.getElementById("avg-mean").textContent = data.avg_mean.toFixed(2);
  document.getElementById("avg-median").textContent = data.avg_median.toFixed(2);
  document.getElementById("avg-p95").textContent = data.avg_p95.toFixed(2);
  document.getElementById("best-mean").textContent = data.best_mean.toFixed(2);
  document.getElementById("worst-mean").textContent = data.worst_mean.toFixed(2);

  const tbody = document.querySelector("#top5-table tbody");

  tbody.innerHTML = "";
  data.avg_top5.forEach((item) => {
    const row = document.createElement("tr");

    const locationCell = document.createElement("td");
    locationCell.textContent = item.location; // Safe assignment
    row.appendChild(locationCell);

    const valueCell = document.createElement("td");
    valueCell.textContent = item.avg.toFixed(2); // Safe assignment
    row.appendChild(valueCell);

    tbody.appendChild(row);
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
