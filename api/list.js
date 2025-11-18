// api/list.js – fetch single wishlist by admin_token (id) + its items
import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  // CORS
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

  const { id } = req.query || {};
  if (!id) {
    res.status(400).json({ error: 'missing_id', message: 'id (admin_token) is required' });
    return;
  }

  try {
    const sql = neon(process.env.DATABASE_URL);

    const lists = await sql`
      SELECT id, title, slug, is_public, created_at, description, admin_token
      FROM wishlist
      WHERE admin_token = ${id}
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
      admin_token: list.admin_token,
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
