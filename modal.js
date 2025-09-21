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
  if (message.action === "showModal") {
    updateModal(message.data);
  }
});

// Function to update the modal with new data
function updateModal(data) {
  const { last_mean, avg_mean, best_mean, worst_mean, avg_top5 } = data;

  // Update the DOM with the received data
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
