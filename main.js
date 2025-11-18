// main.js – v0.2: show items under each wishlist

// Your Vercel production URL (canonical backend)
const VERCEL_BASE = 'https://vlist-kappa.vercel.app';

function getApiBase() {
  const host = window.location.hostname;

  // If we are running on the Vercel domain itself,
  // use same-origin `/api/...`
  if (host.endsWith('vercel.app')) {
    return '';
  }

  // Everywhere else (GitHub Pages, localhost, file:/// etc.)
  // call the Vercel backend directly.
  return VERCEL_BASE;
}

// --- helpers ---

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
      const card = document.createElement('div');
      card.className = 'wishlist-card';

      const created = row.created_at
        ? new Date(row.created_at).toLocaleString()
        : '(neznámý čas)';

      const slug = row.slug || '(žádný)';
      const isPublic = row.is_public ? 'ano' : 'ne';

      // Items (v0.2)
      const items = Array.isArray(row.items) ? row.items : [];

      let itemsHtml = '';
      if (items.length > 0) {
        const lis = items.map(it => {
          const name = escapeHtml(it.name);
          const note = it.note ? escapeHtml(it.note) : '';
          const price = formatPrice(it.price);
          const link = it.link ? String(it.link) : '';

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

          return `
            <li class="wishlist-item">
              <div class="wishlist-item-main">
                <span class="wishlist-item-name">${name}</span>
                ${priceHtml}
              </div>
              <div class="wishlist-item-meta">
                ${linkHtml}
              </div>
              ${noteHtml}
            </li>
          `;
        }).join('');

        itemsHtml = `
          <ul class="wishlist-items">
            ${lis}
          </ul>
        `;
      } else {
        itemsHtml = `
          <div class="wishlist-empty">
            Zatím žádné položky.
          </div>
        `;
      }

      card.innerHTML = `
        <h2>${escapeHtml(row.title || '(bez názvu)')}</h2>
        <div class="wishlist-meta">
          Slug: <code>${escapeHtml(slug)}</code><br>
          Veřejný: ${escapeHtml(isPublic)}<br>
          Vytvořeno: ${escapeHtml(created)}
        </div>
        ${itemsHtml}
      `;

      out.appendChild(card);
    });
  } catch (err) {
    console.error(err);
    out.textContent = 'Chyba načítání: ' + err.message;
  }
}

loadData();
