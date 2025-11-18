const SUPABASE_URL = "https://xevksbgxihdvjzgjmadm.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhldmtzYmd4aWhkdmp6Z2ptYWRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1Mjk1NzksImV4cCI6MjA3ODEwNTU3OX0.NqVD3uDNhx7_5J-bBh1CkjIHdpvWrrE_I3VNiJJYtzs";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function loadData() {
  const out = document.getElementById('output');

  const { data, error } = await supabaseClient
    .from('wishlist')
    .select('*');

  if (error) {
    out.textContent = "Chyba: " + error.message;
    console.error(error);
    return;
  }

  if (!data || data.length === 0) {
    out.textContent = "Žádné seznamy nenalezeny.";
    return;
  }

  out.innerHTML = "";

  data.forEach(row => {
    const card = document.createElement('div');
    card.className = 'wishlist-card';
    card.innerHTML = `
      <h2>${row.title}</h2>
      <div class="wishlist-meta">
        Slug: <code>${row.slug}</code><br>
        Veřejný: ${row.is_public ? 'ano' : 'ne'}<br>
        Vytvořeno: ${new Date(row.created_at).toLocaleString()}
      </div>
    `;
    out.appendChild(card);
  });
}

loadData();
