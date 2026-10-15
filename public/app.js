import { inspectAccounts, DEFAULT_RPC_URL } from "./dist/core/solana.js";

const addressInput   = document.getElementById("addressInput");
const lookupBtn      = document.getElementById("lookupBtn");
const cardsContainer = document.getElementById("cardsContainer");
const resultCount    = document.getElementById("resultCount");
const resultsSummary = document.getElementById("resultsSummary");

const SAMPLE_SYSTEM = "11111111111111111111111111111111";
const SAMPLE_TOKEN  = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const SAMPLE_WALLET = "vines1vzrYbzLMRdu58syJa2uBaL3qETJAu2NZN";

document.getElementById("sampleSystemBtn").addEventListener("click", () => {
  addressInput.value = SAMPLE_SYSTEM;
  triggerQuery();
});

document.getElementById("sampleTokenBtn").addEventListener("click", () => {
  addressInput.value = SAMPLE_TOKEN;
  triggerQuery();
});

document.getElementById("sampleMultiBtn").addEventListener("click", () => {
  addressInput.value = [
    SAMPLE_SYSTEM,
    SAMPLE_TOKEN,
    SAMPLE_WALLET,
    "bad_address_example"
  ].join("\n");
  triggerQuery();
});

document.getElementById("clearBtn").addEventListener("click", () => {
  addressInput.value = "";
  cardsContainer.innerHTML = `<div class="empty-state">Cleared. Enter addresses above.</div>`;
  resultCount.textContent = "0";
  resultsSummary.textContent = "--";
});

lookupBtn.addEventListener("click", triggerQuery);

function parseAddresses(raw) {
  return raw.split(/[\s,]+/).map(s => s.trim()).filter(Boolean);
}

async function triggerQuery() {
  const addresses = parseAddresses(addressInput.value);
  if (addresses.length === 0) {
    alert("Enter at least one Solana address.");
    return;
  }

  lookupBtn.disabled = true;
  lookupBtn.textContent = "Querying...";
  cardsContainer.innerHTML = `<div class="empty-state">Connecting to Devnet RPC...</div>`;

  try {
    const results = await inspectAccounts(addresses, {
      rpcUrl: DEFAULT_RPC_URL,
      cluster: "devnet"
    });
    renderResults(results);
  } catch (err) {
    cardsContainer.innerHTML = `
      <div class="account-card">
        <div class="card-body">
          <div class="error-msg"><p>RPC connection failed: ${err.message}</p></div>
        </div>
      </div>
    `;
  } finally {
    lookupBtn.disabled = false;
    lookupBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
      </svg>
      Query Accounts
    `;
  }
}

function statusInfo(item) {
  if (!item.success) {
    return { label: "Invalid Address", cls: "error" };
  }
  if (!item.exists) {
    return { label: "No Onchain Account", cls: "notfound" };
  }
  if (item.executable) {
    return { label: "Executable Program", cls: "program" };
  }
  return { label: "Wallet / Data Account", cls: "wallet" };
}

function renderResults(results) {
  resultCount.textContent = String(results.length);
  const ok = results.filter(r => r.success && r.exists).length;
  const notFound = results.filter(r => r.success && !r.exists).length;
  const failed = results.filter(r => !r.success).length;

  const parts = [];
  if (ok > 0)       parts.push(`${ok} found`);
  if (notFound > 0) parts.push(`${notFound} not on Devnet`);
  if (failed > 0)   parts.push(`${failed} invalid`);
  resultsSummary.textContent = parts.join("  /  ") || "--";

  if (results.length === 0) {
    cardsContainer.innerHTML = `<div class="empty-state">No results.</div>`;
    return;
  }

  const list = document.createElement("div");
  list.className = "cards-list";

  results.forEach((item, i) => {
    const { label, cls } = statusInfo(item);
    const card = document.createElement("div");
    card.className = "account-card";

    const knownLabelHtml = item.knownLabel
      ? `<div class="card-known-label">${item.knownLabel}</div>`
      : "";

    let bodyHtml = "";

    if (item.success && item.exists) {
      // Found account - show full data
      bodyHtml = `
        <div class="card-body">
          <div class="metrics">
            <div class="metric">
              <div class="metric-label">SOL Balance</div>
              <div class="metric-val green">${item.solFormatted} SOL</div>
              <div class="metric-sub">${Number(item.lamports).toLocaleString()} lamports</div>
            </div>
            <div class="metric">
              <div class="metric-label">Account Type</div>
              <div class="metric-val">${item.executable ? "Program" : "Data Account"}</div>
              <div class="metric-sub">${item.dataSize?.toLocaleString()} bytes on chain</div>
            </div>
          </div>
          <div class="card-foot">
            <span class="owner-text">Owner: ${item.ownerLabel ? `${item.ownerLabel}` : item.owner}</span>
            <a class="explorer-link" href="${item.explorerUrl}" target="_blank" rel="noreferrer">View on Explorer &rarr;</a>
          </div>
        </div>
      `;
    } else if (item.success && !item.exists) {
      // Valid address, no onchain account
      bodyHtml = `
        <div class="card-body">
          <div class="metrics">
            <div class="metric">
              <div class="metric-label">SOL Balance</div>
              <div class="metric-val muted">0 SOL</div>
              <div class="metric-sub">0 lamports</div>
            </div>
            <div class="metric">
              <div class="metric-label">Onchain Status</div>
              <div class="metric-val muted">Not found</div>
              <div class="metric-sub">No account exists at this address on Devnet yet</div>
            </div>
          </div>
          <div class="card-foot">
            <span class="owner-text">No owner -- account not initialized</span>
            <a class="explorer-link" href="${item.explorerUrl}" target="_blank" rel="noreferrer">View on Explorer &rarr;</a>
          </div>
        </div>
      `;
    } else {
      // Failed -- invalid address or RPC error
      bodyHtml = `
        <div class="card-body">
          <div class="error-msg">
            <p>${item.error}</p>
          </div>
          <div class="card-foot">
            <span>Could not look up this address</span>
            <a class="explorer-link" href="${item.explorerUrl}" target="_blank" rel="noreferrer">Solana Explorer &rarr;</a>
          </div>
        </div>
      `;
    }

    card.innerHTML = `
      <div class="card-head">
        <div>
          <div class="card-index">Address ${i + 1} of ${results.length}</div>
          <div class="card-address">${item.address}</div>
          ${knownLabelHtml}
        </div>
        <span class="status-tag ${cls}">${label}</span>
      </div>
      ${bodyHtml}
    `;

    list.appendChild(card);
  });

  cardsContainer.innerHTML = "";
  cardsContainer.appendChild(list);
}
