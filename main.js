// main.js – one card per gift, colored by status

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

    data.forEach(row => {
      // 1) Wishlist header card (one per wishlist)
      const header = document.createElement('div');
      header.className = 'wishlist-card wishlist-card--header';

      const created = row.created_at
        ? new Date(row.created_at).toLocaleString()
        : '(neznámý čas)';

      header.innerHTML = `
        <h2>${escapeHtml(row.title || '(bez názvu)')}</h2>
        <div class="wishlist-meta">
          Slug: <code>${escapeHtml(row.slug || '(žádný)')}</code><br>
          Veřejný: ${row.is_public ? 'ano' : 'ne'}<br>
          Vytvořeno: ${escapeHtml(created)}
        </div>
      `;
      out.appendChild(header);

      // 2) One card per item, colored by status
      const items = Array.isArray(row.items) ? row.items : [];
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
    });
  } catch (err) {
    console.error(err);
    out.textContent = 'Chyba načítání: ' + err.message;
  }
}

loadData();
