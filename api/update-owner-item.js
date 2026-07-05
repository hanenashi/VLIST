// api/update-owner-item.js - update one wishlist item after owner PIN verification
import { neon } from '@neondatabase/serverless';
import { parsePrice, readJsonBody, verifyOwnerPin } from './_owner.js';

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

  const token = (body.token || '').toString().trim();
  const pin = (body.pin || '').toString().trim();
  const id = body.id;
  const name = (body.name || '').toString().trim();
  const link = (body.link || '').toString().trim();
  const note = (body.note || '').toString().trim();
  const status = (body.status || 'default').toString().toLowerCase().trim();
  const isPublic = toBool(body.is_public);
  const price = parsePrice(body.price);

  if (!token || !pin || !id || !name || isPublic === null) {
    res.status(400).json({ error: 'missing_fields' });
    return;
  }

  if (price === undefined) {
    res.status(400).json({ error: 'invalid_price' });
    return;
  }

  if (!['default', 'reserved', 'bought'].includes(status)) {
    res.status(400).json({ error: 'invalid_status' });
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
      UPDATE wishlist_items
      SET name = ${name}, link = ${link || null}, note = ${note || null},
          price = ${price}, status = ${status}, is_public = ${isPublic}
      WHERE id = ${id} AND wishlist_id = ${verified.list.id}
      RETURNING id, wishlist_id, name, link, note, price, status, is_public, created_at;
    `;

    if (!rows || rows.length === 0) {
      res.status(404).json({ error: 'not_found' });
      return;
    }

    res.status(200).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'db_error', message: err.message });
  }
}
