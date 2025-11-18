// Where the API really lives
const VERCEL_ORIGIN = 'https://vlist-kappa.vercel.app';

// If we are running on that origin (i.e. actually on Vercel),
// we can just call /api/... locally. Otherwise, call the Vercel domain.
const API_BASE =
  window.location.origin === VERCEL_ORIGIN ? '' : VERCEL_ORIGIN;

async function loadData() {
  const out = document.getElementById('output');
  out.textContent = 'Načítám…';

  try {
    const resp = await fetch(`${API_BASE}/api/wishlist`);
    if (!resp.ok) {
      throw new Error('HTTP ' + resp.status);
    }

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
