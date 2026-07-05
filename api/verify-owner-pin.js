// api/verify-owner-pin.js - validate owner PIN for session unlock
import { neon } from '@neondatabase/serverless';
import { readJsonBody, verifyOwnerPin } from './_owner.js';

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

  if (!token || !pin) {
    res.status(400).json({ error: 'missing_fields', message: 'token and pin are required' });
    return;
  }

  try {
    const sql = neon(process.env.DATABASE_URL);
    const verified = await verifyOwnerPin(sql, token, pin);
    if (!verified.ok) {
      res.status(verified.status).json({ error: verified.error });
      return;
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'db_error', message: err.message });
  }
}
