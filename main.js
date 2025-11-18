// main.js

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

      card.innerHTML = `
        <h2>${row.title}</h2>
        <div class="wishlist-meta">
          Slug: <code>${row.slug || '(žádný)'}</code><br>
          Veřejný: ${row.is_public ? 'ano' : 'ne'}<br>
          Vytvořeno: ${new Date(row.created_at).toLocaleString()}
        </div>
      `;

      out.appendChild(card);
    });
  } catch (err) {
    console.error(err);
    out.textContent = 'Chyba načítání: ' + err.message;
  }
}

loadData();
