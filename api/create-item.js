// api/create-item.js - add an item to a wishlist after PIN verification
import { neon } from '@neondatabase/serverless';
import crypto from 'crypto';

function hashPin(pin) {
  return crypto.createHash('sha256').update(String(pin)).digest('hex');
}

function parsePrice(value) {
  const raw = (value ?? '').toString().trim();
  if (!raw) return null;

  const num = Number(raw.replace(',', '.'));
  if (Number.isNaN(num)) return undefined;
  return num;
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
    body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  } catch (e) {
    res.status(400).json({ error: 'invalid_json', message: e.message });
    return;
  }

  const token = (body.token || body.id || '').toString().trim();
  const pin = (body.pin || '').toString().trim();
  const name = (body.name || '').toString().trim();
  const link = (body.link || '').toString().trim();
  const note = (body.note || '').toString().trim();
  const price = parsePrice(body.price);

  if (!token || !pin || !name) {
    res.status(400).json({
      error: 'missing_fields',
      message: 'token, pin, and name are required',
    });
    return;
  }

  if (price === undefined) {
    res.status(400).json({ error: 'invalid_price', message: 'price must be number or empty' });
    return;
  }

  try {
    const sql = neon(process.env.DATABASE_URL);

    const lists = await sql`
      SELECT id, pin_hash
      FROM wishlist
      WHERE admin_token = ${token}
      LIMIT 1;
    `;

    if (!lists || lists.length === 0) {
      res.status(404).json({ error: 'not_found' });
      return;
    }

    const list = lists[0];
    if (!list.pin_hash || hashPin(pin) !== list.pin_hash) {
      res.status(403).json({ error: 'invalid_pin' });
      return;
    }

    const rows = await sql`
      INSERT INTO wishlist_items (wishlist_id, name, link, note, price, status, is_public)
      VALUES (${list.id}, ${name}, ${link || null}, ${note || null}, ${price}, 'default', true)
      RETURNING id, wishlist_id, name, link, note, price, status, is_public, created_at;
    `;

    res.status(200).json(rows[0]);
  } catch (err) {
    res.status(500).json({
      error: 'db_error',
      message: err.message,
      stack: err.stack,
    });
  }
}
