// api/public-list.js - fetch a public wishlist by slug without exposing secrets
import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
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

  const slug = ((req.query || {}).slug || '').toString().trim();
  if (!slug) {
    res.status(400).json({ error: 'missing_slug', message: 'slug is required' });
    return;
  }

  try {
    const sql = neon(process.env.DATABASE_URL);

    const lists = await sql`
      SELECT id, title, slug, is_public, created_at, description
      FROM wishlist
      WHERE slug = ${slug} AND is_public = true
      LIMIT 1;
    `;

    if (!lists || lists.length === 0) {
      res.status(404).json({ error: 'not_found' });
      return;
    }

    const list = lists[0];
    const items = await sql`
      SELECT id, wishlist_id, name, link, note, price, status, is_public, created_at
      FROM wishlist_items
      WHERE wishlist_id = ${list.id} AND is_public = true
      ORDER BY created_at ASC;
    `;

    res.status(200).json({
      id: list.id,
      title: list.title,
      slug: list.slug,
      is_public: list.is_public,
      created_at: list.created_at,
      description: list.description,
      items,
    });
  } catch (err) {
    res.status(500).json({
      error: 'db_error',
      message: err.message,
      stack: err.stack,
    });
  }
}
