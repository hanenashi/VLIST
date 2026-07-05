// main.js – single tokenized URL (?id=admin_token) + create form

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

function getUrlWithParam(key, value) {
  const url = new URL(window.location.href);
  url.search = '';
  url.searchParams.set(key, value);
  return url.toString();
}

function getOpenTargetFromInput(raw) {
  const value = (raw || '').toString().trim();
  if (!value) return null;

  try {
    const url = new URL(value);
    const id = (url.searchParams.get('id') || '').trim();
    const slug = (url.searchParams.get('list') || '').trim();
    if (id) return { key: 'id', value: id };
    if (slug) return { key: 'list', value: slug };
    return null;
  } catch {
    const queryStart = value.indexOf('?');
    if (queryStart !== -1) {
      const params = new URLSearchParams(value.slice(queryStart));
      const id = (params.get('id') || '').trim();
      const slug = (params.get('list') || '').trim();
      if (id) return { key: 'id', value: id };
      if (slug) return { key: 'list', value: slug };
      return null;
    }

    return { key: 'id', value };
  }
}

async function copyText(text) {
  if (!text) return false;

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to the textarea fallback.
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();

  let ok = false;
  try {
    ok = document.execCommand('copy');
  } finally {
    textarea.remove();
  }

  return ok;
}

function showCopyState(button, ok) {
  const original = button.dataset.label || button.textContent;
  button.dataset.label = original;
  button.textContent = ok ? 'Zkopírováno' : 'Nelze kopírovat';
  button.classList.toggle('copy-token--done', ok);

  window.setTimeout(() => {
    button.textContent = original;
    button.classList.remove('copy-token--done');
  }, 1400);
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

function createAddItemForm(token) {
  const card = document.createElement('div');
  card.className = 'wishlist-card add-item-card';
  card.innerHTML = `
    <h3>Přidat položku</h3>
    <form class="add-item-form">
      <div class="item-form-grid">
        <label class="item-form-name">
          Název
          <input type="text" name="name" required>
        </label>
        <label>
          Cena
          <input type="text" name="price" inputmode="decimal" placeholder="volitelné">
        </label>
        <label class="item-form-link">
          Odkaz
          <input type="url" name="link" placeholder="https://…">
        </label>
        <label>
          PIN
          <input type="password" name="pin" required autocomplete="off">
        </label>
        <label class="item-form-note">
          Poznámka
          <textarea name="note" rows="2"></textarea>
        </label>
      </div>
      <div class="form-actions">
        <button type="submit" class="btn-primary">Přidat</button>
        <span class="add-item-status" aria-live="polite"></span>
      </div>
    </form>
  `;

  const form = card.querySelector('.add-item-form');
  const status = card.querySelector('.add-item-status');
  const apiBase = getApiBase();

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const name = (formData.get('name') || '').toString().trim();
    const price = (formData.get('price') || '').toString().trim();
    const link = (formData.get('link') || '').toString().trim();
    const note = (formData.get('note') || '').toString().trim();
    const pin = (formData.get('pin') || '').toString().trim();

    if (!name || !pin) {
      status.textContent = 'Vyplň název a PIN.';
      return;
    }

    status.textContent = 'Ukládám položku…';

    try {
      const resp = await fetch(`${apiBase}/api/create-item`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, pin, name, price, link, note }),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        if (resp.status === 403) {
          throw new Error('špatný PIN');
        }
        throw new Error('HTTP ' + resp.status + ': ' + errText);
      }

      form.reset();
      status.textContent = 'Položka přidána.';
      loadList();
    } catch (err) {
      console.error(err);
      status.textContent = 'Chyba: ' + err.message;
    }
  });

  return card;
}

function renderItems(out, items) {
  if (items.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'wishlist-card wishlist-item-card wishlist-item-card--default wishlist-empty';
    empty.textContent = 'Zatím žádné položky.';
    out.appendChild(empty);
    return;
  }

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

async function loadList() {
  const out = document.getElementById('output');
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  const slug = params.get('list');

  if (!id && !slug) {
    out.innerHTML = 'Zatím žádný list. Vytvoř si nový výše, nebo vlož veřejný odkaz nebo tajný token.';
    return;
  }

  out.textContent = 'Načítám list…';

  const apiBase = getApiBase();
  const isOwnerMode = Boolean(id);
  const endpoint = isOwnerMode
    ? `${apiBase}/api/list?id=${encodeURIComponent(id)}`
    : `${apiBase}/api/public-list?slug=${encodeURIComponent(slug)}`;

  try {
    const resp = await fetch(endpoint);
    if (!resp.ok) {
      if (resp.status === 404) {
        out.textContent = 'List nenalezen. Zkontroluj odkaz.';
      } else {
        throw new Error('HTTP ' + resp.status);
      }
      return;
    }

    const row = await resp.json();
    out.innerHTML = '';

    // Header card
    const header = document.createElement('div');
    header.className = 'wishlist-card wishlist-card--header';

    const created = row.created_at
      ? new Date(row.created_at).toLocaleString()
      : '(neznámý čas)';

    const descHtml = row.description
      ? `<p class="wishlist-description">${escapeHtml(row.description)}</p>`
      : '';
    const publicUrl = getUrlWithParam('list', row.slug);
    const ownerUrl = isOwnerMode && row.admin_token ? getUrlWithParam('id', row.admin_token) : '';
    const ownerMetaHtml = isOwnerMode && row.admin_token
      ? `
        Owner token:
        <button class="copy-token" type="button" data-copy="${escapeHtml(row.admin_token)}" title="Kopírovat owner token">
          ${escapeHtml(row.admin_token)}
        </button><br>
        Owner odkaz:
        <button class="copy-token copy-token--url" type="button" data-copy="${escapeHtml(ownerUrl)}" title="Kopírovat owner odkaz">
          Kopírovat owner odkaz
        </button><br>
      `
      : '';

    header.innerHTML = `
      <h2>${escapeHtml(row.title || '(bez názvu)')}</h2>
      ${descHtml}
      <div class="wishlist-meta">
        Veřejný odkaz:
        <button class="copy-token copy-token--url" type="button" data-copy="${escapeHtml(publicUrl)}" title="Kopírovat veřejný odkaz">
          Kopírovat veřejný odkaz
        </button><br>
        ${ownerMetaHtml}
        Veřejný: ${row.is_public ? 'ano' : 'ne'}<br>
        Vytvořeno: ${escapeHtml(created)}
      </div>
    `;
    out.appendChild(header);
    if (isOwnerMode && row.admin_token) {
      out.appendChild(createAddItemForm(row.admin_token));
    }

    const items = Array.isArray(row.items) ? row.items : [];
    renderItems(out, items);
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
      const ownerUrl = `${basePath}?id=${encodeURIComponent(data.admin_token)}`;

      resultBox.innerHTML = `
        <div class="wishlist-card">
          <p><strong>List vytvořen.</strong></p>
          <p>Veřejný odkaz pro rodinu:<br>
            <a href="${publicUrl}" target="_blank" rel="noopener noreferrer">${publicUrl}</a>
          </p>
          <p>
            <button class="copy-token copy-token--url" type="button" data-copy="${escapeHtml(publicUrl)}" title="Kopírovat veřejný odkaz">
              Kopírovat veřejný odkaz
            </button>
          </p>
          <p>Owner odkaz pro úpravy:<br>
            <a href="${ownerUrl}" target="_blank" rel="noopener noreferrer">${ownerUrl}</a>
          </p>
          <p>
            <button class="copy-token copy-token--url" type="button" data-copy="${escapeHtml(ownerUrl)}" title="Kopírovat owner odkaz">
              Kopírovat owner odkaz
            </button>
          </p>
          <p>
            Owner token:
            <button class="copy-token" type="button" data-copy="${escapeHtml(data.admin_token)}" title="Kopírovat owner token">
              ${escapeHtml(data.admin_token)}
            </button>
          </p>
          <p><strong>PIN pro úpravy:</strong> ten, který jsi právě zadal. Nezapomeň si ho.</p>
        </div>
      `;

      form.reset();
      form.style.display = 'none';
      btn.style.display = 'inline-block';

      // Optional: navigate directly to the new list
      // window.location.href = shareUrl;

      // Or just reload view (if current URL already has ?id)
      loadList();
    } catch (err) {
      console.error(err);
      resultBox.textContent = 'Chyba při vytváření: ' + err.message;
    }
  });
}

function setupOpenForm() {
  const form = document.getElementById('open-form');
  const input = document.getElementById('token-input');
  const message = document.getElementById('open-message');

  if (!form || !input || !message) return;

  const params = new URLSearchParams(window.location.search);
  const currentId = params.get('id');
  const currentSlug = params.get('list');
  if (currentId) input.value = currentId;
  if (!currentId && currentSlug) input.value = currentSlug;

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const targetParam = getOpenTargetFromInput(input.value);
    if (!targetParam) {
      message.textContent = 'Vlož veřejný odkaz nebo tajný token.';
      input.focus();
      return;
    }

    const target = new URL(window.location.href);
    target.search = '';
    target.searchParams.set(targetParam.key, targetParam.value);
    window.location.href = target.toString();
  });
}

function setupCopyButtons() {
  document.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-copy]');
    if (!button) return;

    const ok = await copyText(button.dataset.copy || '');
    showCopyState(button, ok);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  setupOpenForm();
  setupCreateForm();
  setupCopyButtons();
  loadList();
});
