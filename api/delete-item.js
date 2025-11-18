// api/delete-item.js
import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  if (!process.env.DATABASE_URL) {
    res.status(500).json({ error: 'missing_database_url' });
    return;
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  } catch (e) {
    res.status(400).json({ error: 'invalid_json', message: e.message });
    return;
  }

  const { id } = body;
  if (!id) {
    res.status(400).json({ error: 'missing_id' });
    return;
  }

  try {
    const sql = neon(process.env.DATABASE_URL);
    const result = await sql`
      DELETE FROM wishlist_items
      WHERE id = ${id}
      RETURNING id;
    `;

    if (result.length === 0) {
      res.status(404).json({ error: 'not_found' });
      return;
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'db_error', message: err.message });
  }
}
