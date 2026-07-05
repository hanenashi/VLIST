const DEBUG_ALLOWED_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "::1",
]);

if (!DEBUG_ALLOWED_HOSTS.has(window.location.hostname)) {
  document.body.innerHTML = `
    <main class="page">
      <h1>Debug panel vypnutý</h1>
      <p class="subtitle">Debug panel je dostupný jen lokálně.</p>
    </main>
  `;
  throw new Error("Debug panel disabled on this host");
}

document.getElementById("status").textContent =
  "Debug API je vypnuté. Admin režim bude řešen jinak.";
