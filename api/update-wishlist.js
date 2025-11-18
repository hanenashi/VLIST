// api/update-wishlist.js
import { neon } from '@neondatabase/serverless';

function toBool(val) {
  if (typeof val === 'boolean') return val;
  if (typeof val === 'string') {
    const v = val.toLowerCase().trim();
    if (v === 'true' || v === '1' || v === 'ano') return true;
    if (v === 'false' || v === '0' || v === 'ne') return false;
  }
  return null;
}

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

  const { id, column, value } = body;

  if (!id || !column) {
    res.status(400).json({ error: 'missing_fields', message: 'id and column are required' });
    return;
  }

  const allowed = ['title', 'slug', 'description', 'is_public'];
  if (!allowed.includes(column)) {
    res.status(400).json({ error: 'invalid_column', message: 'Column not editable from debug API' });
    return;
  }

  try {
    const sql = neon(process.env.DATABASE_URL);
    let q;

    if (column === 'is_public') {
      const boolVal = toBool(value);
      if (boolVal === null) {
        return res.status(400).json({ error: 'invalid_value', message: 'is_public must be boolean' });
      }
      q = sql`UPDATE wishlist SET is_public = ${boolVal} WHERE id = ${id}`;
    } else if (column === 'title') {
      q = sql`UPDATE wishlist SET title = ${value} WHERE id = ${id}`;
    } else if (column === 'slug') {
      // slug should be non-empty if set
      const v = (value || '').toString().trim();
      q = sql`UPDATE wishlist SET slug = ${v || null} WHERE id = ${id}`;
    } else if (column === 'description') {
      const v = (value || '').toString().trim();
      q = sql`UPDATE wishlist SET description = ${v || null} WHERE id = ${id}`;
    }

    await q;
    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'db_error', message: err.message });
  }
}
