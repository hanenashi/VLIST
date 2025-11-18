// main.js – v0.3a: create lists + show gifts

const VERCEL_BASE = 'https://vlist-kappa.vercel.app';

function getApiBase() {
  const host = window.location.hostname;
  if (host.endsWith('vercel.app')) {
    return '';
  }
  return VERCEL_BASE;
}

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatPrice(raw) {
  if (raw === null || raw === undefined || raw === '') return '';
  return `${raw} Kč`;
}

function shortenUrl(urlStr) {
  if (!urlStr) return '';
  try {
    const u = new URL(urlStr);
    let out = u.hostname.replace(/^www\./, '');
    if (u.pathname && u.pathname !== '/') {
      out += u.pathname.replace(/\/$/, '');
    }
    return out;
  } catch {
    return urlStr;
  }
}

function getItemCardClass(status) {
  switch ((status || 'default').toLowerCase()) {
    case 'reserved':
      return 'wishlist-card wishlist-item-card wishlist-item-card--reserved';
    case 'bought':
      return 'wishlist-card wishlist-item-card wishlist-item-card--bought';
    default:
      return 'wishlist-card wishlist-item-card wishlist-item-card--default';
  }
}

async function loadData() {
  const out = document.getElementById('output');
  const params = new URLSearchParams(window.location.search);
  const filterSlug = params.get('list') || null;

  out.textContent = 'Načítám…';

  const apiBase = getApiBase();

  try {
    const resp = await fetch(`${apiBase}/api/wishlist`);
    if (!resp.ok) throw new Error('HTTP ' + resp.status);

    const data = await resp.json();
    out.innerHTML = '';

    if (!data || data.length === 0) {
      out.textContent = 'Žádné seznamy nenalezeny.';
      return;
    }

    let lists = data;
    if (filterSlug) {
      lists = data.filter(row => row.slug === filterSlug);
      if (lists.length === 0) {
        out.textContent = 'Seznam nenalezen.';
        return;
      }
    }

    lists.forEach(row => {
      const header = document.createElement('div');
      header.className = 'wishlist-card wishlist-card--header';

      const created = row.created_at
        ? new Date(row.created_at).toLocaleString()
        : '(neznámý čas)';

      const descHtml = row.description
        ? `<p class="wishlist-description">${escapeHtml(row.description)}</p>`
        : '';

      header.innerHTML = `
        <h2>${escapeHtml(row.title || '(bez názvu)')}</h2>
        ${descHtml}
        <div class="wishlist-meta">
          Slug: <code>${escapeHtml(row.slug || '(žádný)')}</code><br>
          Veřejný: ${row.is_public ? 'ano' : 'ne'}<br>
          Vytvořeno: ${escapeHtml(created)}
        </div>
      `;
      out.appendChild(header);

      const items = Array.isArray(row.items) ? row.items : [];
      if (items.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'wishlist-card wishlist-item-card wishlist-item-card--default wishlist-empty';
        empty.textContent = 'Zatím žádné položky.';
        out.appendChild(empty);
      } else {
        items.forEach(it => {
          const name = escapeHtml(it.name);
          const note = it.note ? escapeHtml(it.note) : '';
          const price = formatPrice(it.price);
          const link = it.link ? String(it.link) : '';
          const status = it.status || 'default';

          const linkHtml = link
            ? `<a class="wishlist-item-link" href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer">
                 ${escapeHtml(shortenUrl(link))} ↗
               </a>`
            : '';

          const priceHtml = price
            ? `<span class="wishlist-item-price">${escapeHtml(price)}</span>`
            : '';

          const noteHtml = note
            ? `<div class="wishlist-item-note">${note}</div>`
            : '';

          const itemCard = document.createElement('div');
          itemCard.className = getItemCardClass(status);

          itemCard.innerHTML = `
            <div class="wishlist-item-main">
              <span class="wishlist-item-name">${name}</span>
              ${priceHtml}
            </div>
            <div class="wishlist-item-meta">
              ${linkHtml}
            </div>
            ${noteHtml}
          `;

          out.appendChild(itemCard);
        });
      }
    });
  } catch (err) {
    console.error(err);
    out.textContent = 'Chyba načítání: ' + err.message;
  }
}

function setupCreateForm() {
  const btn = document.getElementById('show-create');
  const form = document.getElementById('create-form');
  const cancel = document.getElementById('cancel-create');
  const resultBox = document.getElementById('create-result');

  if (!btn || !form || !cancel || !resultBox) return;

  const apiBase = getApiBase();

  btn.addEventListener('click', () => {
    form.style.display = 'block';
    btn.style.display = 'none';
    resultBox.innerHTML = '';
  });

  cancel.addEventListener('click', () => {
    form.reset();
    form.style.display = 'none';
    btn.style.display = 'inline-block';
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const title = (formData.get('title') || '').toString().trim();
    const description = (formData.get('description') || '').toString().trim();
    const pin = (formData.get('pin') || '').toString().trim();

    if (!title || !pin) {
      resultBox.textContent = 'Vyplň název i PIN.';
      return;
    }

    resultBox.textContent = 'Vytvářím nový list…';

    try {
      const resp = await fetch(`${apiBase}/api/create-list`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, pin }),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error('HTTP ' + resp.status + ': ' + errText);
      }

      const data = await resp.json();

      const basePath = window.location.origin +
        window.location.pathname.replace(/index\.html$/, '');

      const publicUrl = `${basePath}?list=${encodeURIComponent(data.slug)}`;
      const ownerUrl = `${basePath}?list=${encodeURIComponent(data.slug)}&k=${encodeURIComponent(data.admin_token)}`;

      resultBox.innerHTML = `
        <div class="wishlist-card">
          <p><strong>List vytvořen.</strong></p>
          <p>Veřejný odkaz (pro sdílení):<br>
            <a href="${publicUrl}" target="_blank" rel="noopener noreferrer">${publicUrl}</a>
          </p>
          <p>Odkaz pro úpravy (nesdílej ho veřejně):<br>
            <a href="${ownerUrl}" target="_blank" rel="noopener noreferrer">${ownerUrl}</a>
          </p>
        </div>
      `;

      form.reset();
      form.style.display = 'none';
      btn.style.display = 'inline-block';

      // Refresh lists
      loadData();
    } catch (err) {
      console.error(err);
      resultBox.textContent = 'Chyba při vytváření: ' + err.message;
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  setupCreateForm();
  loadData();
});
