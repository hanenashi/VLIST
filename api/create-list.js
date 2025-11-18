// api/create-list.js – create new wishlist with PIN
import { neon } from '@neondatabase/serverless';
import crypto from 'crypto';

function slugify(input) {
  return String(input)
    .toLowerCase()
    .normalize('NFD')               // remove accents
    .replace(/[\u0300-\u036f]/g, '')// strip diacritics
    .replace(/[^a-z0-9]+/g, '-')    // non-alphanum -> dash
    .replace(/^-+|-+$/g, '')        // trim dashes
    || 'list';
}

async function ensureUniqueSlug(sql, baseSlug) {
  let slug = baseSlug;
  // Try a few times with short random suffix if needed
  for (let i = 0; i < 5; i++) {
    const existing = await sql`
      SELECT 1 FROM wishlist WHERE slug = ${slug} LIMIT 1;
    `;
    if (existing.length === 0) {
      return slug;
    }
    const suffix = Math.random().toString(36).slice(2, 6);
    slug = `${baseSlug}-${suffix}`;
  }
  return slug;
}

function hashPin(pin) {
  return crypto.createHash('sha256').update(String(pin)).digest('hex');
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
    res.status(500).json({
      error: 'missing_database_url',
      message: 'Env var DATABASE_URL is not set on Vercel',
    });
    return;
  }

  let body;
  try {
    if (typeof req.body === 'string') {
      body = JSON.parse(req.body || '{}');
    } else {
      body = req.body || {};
    }
  } catch (e) {
    res.status(400).json({ error: 'invalid_json', message: e.message });
    return;
  }

  const title = (body.title || '').trim();
  const description = (body.description || '').trim();
  const pin = (body.pin || '').trim();

  if (!title || !pin) {
    res.status(400).json({
      error: 'missing_fields',
      message: 'title and pin are required',
    });
    return;
  }

  try {
    const sql = neon(process.env.DATABASE_URL);

    const baseSlug = slugify(title);
    const slug = await ensureUniqueSlug(sql, baseSlug);
    const pinHash = hashPin(pin);

    const rows = await sql`
      INSERT INTO wishlist (title, description, slug, is_public, pin_hash)
      VALUES (${title}, ${description || null}, ${slug}, true, ${pinHash})
      RETURNING id, title, slug, admin_token;
    `;

    if (!rows || rows.length === 0) {
      res.status(500).json({ error: 'insert_failed' });
      return;
    }

    const row = rows[0];

    // We return admin_token only here, not via the public listing API.
    res.status(200).json({
      id: row.id,
      title: row.title,
      slug: row.slug,
      admin_token: row.admin_token,
    });
  } catch (err) {
    res.status(500).json({
      error: 'db_error',
      message: err.message,
      stack: err.stack,
    });
  }
}
