function extractPingData() {
  const rows = [];

  document.querySelectorAll("tbody tr").forEach((tr) => {
    const tds = tr.querySelectorAll("td");
    if (tds.length < 11) return; // skip malformed rows

    const location = tds[0].innerText.trim();
    const last = parseFloat(tds[5].innerText.trim());
    const avg = parseFloat(tds[6].innerText.trim());
    const best = parseFloat(tds[7].innerText.trim());
    const wrst = parseFloat(tds[8].innerText.trim());
    const stdev = parseFloat(tds[9].innerText.trim());

    // push only if valid numeric values
    if ([last, avg, best, wrst, stdev].every((n) => !isNaN(n))) {
      rows.push({ location, last, avg, best, wrst, stdev });
    }
  });

  // mean calculator
  const mean = (arr, key) =>
    arr.reduce((sum, r) => sum + r[key], 0) / arr.length;

  const data = {
    last_mean: mean(rows, "last"),
    avg_mean: mean(rows, "avg"),
    best_mean: mean(rows, "best"),
    worst_mean: mean(rows, "wrst"),
    avg_top5: [...rows].sort((a, b) => b.wrst - a.wrst).slice(0, 5),
  };

  // Send the data to the modal
  chrome.runtime.sendMessage({ action: "showModal", data });
}

// Run the extraction when the extension icon is clicked
extractPingData();
