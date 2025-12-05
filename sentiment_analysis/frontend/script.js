// Automatically switch between local and production API
const API = window.location.hostname.includes("localhost") || window.location.hostname.includes("127.0.0.1")
  ? "http://127.0.0.1:5000"
  : "https://sentiment-backend-production.up.railway.app"; // <-- change to your actual Railway backend URL

// Single text analyze
document.getElementById("analyzeBtn").addEventListener("click", async () => {
  const text = document.getElementById("inputText").value.trim();
  const resultDiv = document.getElementById("result");
  resultDiv.innerHTML = "Analyzing...";
  
  if (!text) { 
    resultDiv.innerHTML = "Please type some text."; 
    return; 
  }
  
  try {
    const r = await fetch(`${API}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    });
    const j = await r.json();
    if (!r.ok) { 
      resultDiv.innerHTML = j.error || "Error"; 
      return; 
    }
    resultDiv.className = "result " + j.sentiment.toLowerCase();
    resultDiv.innerHTML = `<strong>${j.sentiment}</strong> — ${j.confidence}%<div class="small">${escapeHtml(j.text)}</div>`;
    loadHistory();
  } catch (e) {
    resultDiv.innerHTML = "Error contacting server";
    console.error(e);
  }
});

// CSV analyze
document.getElementById("analyzeCsvBtn").addEventListener("click", async () => {
  const file = document.getElementById("csvFile").files[0];
  if (!file) { 
    alert("Select a CSV file first."); 
    return; 
  }

  const form = new FormData();
  form.append("file", file);

  try {
    const r = await fetch(`${API}/analyze_csv`, { method: "POST", body: form });
    const j = await r.json();
    if (!r.ok) { 
      alert(j.error || "Error processing CSV"); 
      return; 
    }
    displayResultsTable(j.results || []);
  } catch (e) {
    alert("Error contacting server");
    console.error(e);
  }
});

// Download displayed results as CSV
document.getElementById("downloadResultsBtn").addEventListener("click", () => {
  const table = document.getElementById("resultsTable");
  if (!table) { 
    alert("No batch results to download."); 
    return; 
  }
  const rows = Array.from(table.querySelectorAll("tr")).map(tr =>
    Array.from(tr.querySelectorAll("td,th"))
      .map(td => `"${td.innerText.replace(/"/g, '""')}"`)
      .join(",")
  );
  const csv = rows.join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "batch_results.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

// Show history
document.getElementById("showHistoryBtn").addEventListener("click", loadHistory);

async function loadHistory() {
  const histDiv = document.getElementById("history");
  histDiv.innerHTML = "Loading...";
  try {
    const r = await fetch(`${API}/history`);
    const j = await r.json();
    const list = j.history || [];
    if (!list.length) { 
      histDiv.innerHTML = "<div class='small'>No history yet.</div>"; 
      return; 
    }
    histDiv.innerHTML = list.slice(0, 50).map(it => 
      `<div class="history-item ${it.sentiment.toLowerCase()}"><strong>${it.sentiment}</strong> — ${it.confidence}%<div class="small">${escapeHtml(it.text)}</div></div>`
    ).join("");
  } catch (e) {
    histDiv.innerHTML = "Could not load history.";
  }
}

function displayResultsTable(results) {
  const container = document.getElementById("tableContainer");
  if (!results.length) {
    container.innerHTML = "<div class='small'>No results.</div>";
    return;
  }
  let html = `<table id="resultsTable" style="width:100%; border-collapse:collapse;">
    <thead>
      <tr>
        <th style="border:1px solid #ddd;padding:8px">Text</th>
        <th style="border:1px solid #ddd;padding:8px">Sentiment</th>
        <th style="border:1px solid #ddd;padding:8px">Confidence</th>
      </tr>
    </thead>
    <tbody>`;
  for (const r of results) {
    const cls = r.sentiment.toLowerCase();
    html += `<tr class="${cls}">
      <td style="border:1px solid #eee;padding:8px">${escapeHtml(r.text)}</td>
      <td style="border:1px solid #eee;padding:8px"><strong>${r.sentiment}</strong></td>
      <td style="border:1px solid #eee;padding:8px">${r.confidence}%</td>
    </tr>`;
  }
  html += "</tbody></table>";
  container.innerHTML = html;
  loadHistory();
}

function escapeHtml(s) {
  return (s || "").replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[m]);
}

// Initial history load
loadHistory();
