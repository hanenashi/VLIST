// api/update-list.js - update wishlist details after owner PIN verification
import { neon } from '@neondatabase/serverless';
import { readJsonBody, verifyOwnerPin } from './_owner.js';

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
    body = readJsonBody(req);
  } catch (e) {
    res.status(400).json({ error: 'invalid_json', message: e.message });
    return;
  }

  const token = (body.token || body.id || '').toString().trim();
  const pin = (body.pin || '').toString().trim();
  const title = (body.title || '').toString().trim();
  const description = (body.description || '').toString().trim();
  const isPublic = toBool(body.is_public);

  if (!token || !pin || !title || isPublic === null) {
    res.status(400).json({ error: 'missing_fields', message: 'token, pin, title, and is_public are required' });
    return;
  }

  try {
    const sql = neon(process.env.DATABASE_URL);
    const verified = await verifyOwnerPin(sql, token, pin);
    if (!verified.ok) {
      res.status(verified.status).json({ error: verified.error });
      return;
    }

    const rows = await sql`
      UPDATE wishlist
      SET title = ${title}, description = ${description || null}, is_public = ${isPublic}
      WHERE id = ${verified.list.id}
      RETURNING id, title, slug, is_public, created_at, description, admin_token;
    `;

    res.status(200).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'db_error', message: err.message });
  }
}
