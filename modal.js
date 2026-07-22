// Inject the content script when the modal is opened
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const activeTab = tabs[0].id;

  // Inject the content script
  chrome.scripting.executeScript({
    target: { tabId: activeTab },
    files: ["content.js"],
  });
});

// Listen for messages from the content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action !== "showModal") return;

  if (message.status === "ok" && message.data) {
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
  messageEl.textContent =
    STATUS_MESSAGES[status] || STATUS_MESSAGES.error;
}

// Render the computed statistics into the popup.
function showStats(data) {
  const { last_mean, avg_mean, best_mean, worst_mean, avg_top5 } = data;

  document.getElementById("message").hidden = true;
  document.getElementById("stats-view").hidden = false;

  document.getElementById("last-mean").textContent = last_mean.toFixed(2);
  document.getElementById("avg-mean").textContent = avg_mean.toFixed(2);
  document.getElementById("best-mean").textContent = best_mean.toFixed(2);
  document.getElementById("worst-mean").textContent = worst_mean.toFixed(2);

  const tbody = document.querySelector("#top5-table tbody");

  tbody.innerHTML = "";
  avg_top5.forEach((item) => {
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
