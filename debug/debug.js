const API_BASE = window.location.hostname.endsWith("vercel.app")
  ? ""
  : "https://vlist-kappa.vercel.app";

const wishlistBox = document.getElementById("wishlist-table");
const itemsBox = document.getElementById("items-table");

const rawBox = document.getElementById("raw-json");
const rawItemsBox = document.getElementById("raw-items-json");

const statusEl = document.getElementById("status");

let fullData = null; // entire /api/wishlist payload

// =========================================
// Fetch everything
// =========================================
async function loadAll() {
  statusEl.textContent = "Načítám data…";

  try {
    const resp = await fetch(`${API_BASE}/api/wishlist`);
    if (!resp.ok) throw new Error("HTTP " + resp.status);

    const data = await resp.json();
    fullData = data;

    rawBox.value = JSON.stringify(data, null, 2);

    const itemsFlat = [];
    data.forEach(list => {
      list.items?.forEach(item => itemsFlat.push(item));
    });
    rawItemsBox.value = JSON.stringify(itemsFlat, null, 2);

    buildWishlistTable(data);
    buildItemsTable(itemsFlat);

    statusEl.textContent =
      `Načteno wishlistů: ${data.length}, položek: ${itemsFlat.length}`;

  } catch (e) {
    console.error(e);
    statusEl.textContent = "Chyba načítání: " + e.message;
  }
}

// =========================================
// Build Wishlist Table
// =========================================
function buildWishlistTable(rows) {
  const columns = [
    "id",
    "title",
    "slug",
    "description",
    "is_public",
    "created_at",
    "actions"
  ];

  const table = document.createElement("table");

  // Header
  const thead = document.createElement("thead");
  const trh = document.createElement("tr");
  columns.forEach(col => {
    const th = document.createElement("th");
    th.textContent = col;
    trh.appendChild(th);
  });
  thead.appendChild(trh);

  const tbody = document.createElement("tbody");

  rows.forEach(row => {
    const tr = document.createElement("tr");

    columns.forEach(col => {
      const td = document.createElement("td");

      if (col === "actions") {
        td.innerHTML =
          `<button class="action-btn action-delete" data-del-wishlist="${row.id}">Smazat</button>`;
      } else {
        td.textContent = row[col];
        td.dataset.rowId = row.id;
        td.dataset.column = col;
        td.classList.add("cell-editable");
      }

      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });

  table.appendChild(thead);
  table.appendChild(tbody);
  wishlistBox.innerHTML = "";
  wishlistBox.appendChild(table);
}

// =========================================
// Build Items Table
// =========================================
function buildItemsTable(rows) {
  const columns = [
    "id",
    "wishlist_id",
    "name",
    "price",
    "status",
    "link",
    "note",
    "is_public",
    "created_at",
    "actions"
  ];

  const table = document.createElement("table");

  const thead = document.createElement("thead");
  const trh = document.createElement("tr");
  columns.forEach(col => {
    const th = document.createElement("th");
    th.textContent = col;
    trh.appendChild(th);
  });
  thead.appendChild(trh);

  const tbody = document.createElement("tbody");

  rows.forEach(row => {
    const tr = document.createElement("tr");

    columns.forEach(col => {
      const td = document.createElement("td");

      if (col === "actions") {
        td.innerHTML =
          `<button class="action-btn action-delete" data-del-item="${row.id}">Smazat</button>`;
      }

      else if (col === "status") {
        const select = document.createElement("select");
        select.className = "status-select";
        ["default", "reserved", "bought"].forEach(s => {
          const opt = document.createElement("option");
          opt.value = s;
          opt.textContent = s;
          if (row.status === s) opt.selected = true;
          select.appendChild(opt);
        });
        select.dataset.rowId = row.id;
        select.dataset.column = "status";
        td.appendChild(select);
      }

      else {
        td.textContent = row[col];
        td.dataset.rowId = row.id;
        td.dataset.column = col;
        td.classList.add("cell-editable");
      }

      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });

  table.appendChild(thead);
  table.appendChild(tbody);
  itemsBox.innerHTML = "";
  itemsBox.appendChild(table);
}

// =========================================
// Event: Click = begin edit
// =========================================
document.addEventListener("dblclick", (e) => {
  const td = e.target.closest(".cell-editable");
  if (!td) return;

  const oldVal = td.textContent;
  const col = td.dataset.column;
  if (!col || col === "created_at" || col === "id" || col === "wishlist_id") return;

  td.classList.add("editing");

  const input = document.createElement("input");
  input.value = oldVal;
  input.style.width = "100%";

  td.textContent = "";
  td.appendChild(input);
  input.focus();

  input.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter") {
      ev.preventDefault();
      commitEdit(td, input.value);
    }
    if (ev.key === "Escape") {
      cancelEdit(td, oldVal);
    }
  });

  input.addEventListener("blur", () => {
    commitEdit(td, input.value);
  });
});

// =========================================
// Commit edit → API
// =========================================
async function commitEdit(td, newVal) {
  const oldVal = td.dataset.oldVal || null;
  if (newVal === oldVal) {
    td.classList.remove("editing");
    td.textContent = newVal;
    return;
  }

  const col = td.dataset.column;
  const rowId = td.dataset.rowId;

  td.classList.remove("editing");
  td.textContent = newVal;

  if (!col || !rowId) return;

  statusEl.textContent = "Ukládám změny…";

  const isItem = td.closest("#items-table") != null;
  const endpoint = isItem ? "/api/update-item" : "/api/update-wishlist";

  await fetch(`${API_BASE}${endpoint}`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ id: rowId, column: col, value: newVal })
  });

  loadAll();
}

// =========================================
// ESC to cancel edit
// =========================================
function cancelEdit(td, oldVal) {
  td.classList.remove("editing");
  td.textContent = oldVal;
}

// =========================================
// Save status dropdown
// =========================================
document.addEventListener("change", async (e) => {
  if (!e.target.classList.contains("status-select")) return;

  const rowId = e.target.dataset.rowId;
  const value = e.target.value;

  statusEl.textContent = "Ukládám změny…";

  await fetch(`${API_BASE}/api/update-item`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ id: rowId, column: "status", value })
  });

  loadAll();
});

// =========================================
// Delete actions
// =========================================
document.addEventListener("click", async (e) => {
  if (e.target.dataset.delWishlist) {
    const id = e.target.dataset.delWishlist;
    if (!confirm("Smazat celý wishlist?")) return;

    await fetch(`${API_BASE}/api/delete-wishlist`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({ id })
    });

    loadAll();
  }

  if (e.target.dataset.delItem) {
    const id = e.target.dataset.delItem;
    if (!confirm("Smazat položku?")) return;

    await fetch(`${API_BASE}/api/delete-item`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({ id })
    });

    loadAll();
  }
});

// =========================================
// Go
// =========================================
loadAll();
