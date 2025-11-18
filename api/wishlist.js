// api/wishlist.js – v0.2: wishlists + items from Neon
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

  if (!process.env.DATABASE_URL) {
    res.status(500).json({
      error: 'missing_database_url',
      message: 'Env var DATABASE_URL is not set on Vercel',
    });
    return;
  }

  try {
    const sql = neon(process.env.DATABASE_URL);

    // 1) Load wishlists
    const wishlists = await sql`
      SELECT *
      FROM wishlist
      ORDER BY created_at ASC;
    `;

    if (!wishlists || wishlists.length === 0) {
      res.status(200).json([]);
      return;
    }

    // 2) Load all public items
    const items = await sql`
      SELECT *
      FROM wishlist_items
      WHERE is_public = true
      ORDER BY created_at ASC;
    `;

    // 3) Attach items to parent wishlist
    const withItems = wishlists.map(list => {
      const listItems = items.filter(it => it.wishlist_id === list.id);
      return {
        ...list,
        items: listItems,
      };
    });

    res.status(200).json(withItems);
  } catch (err) {
    res.status(500).json({
      error: 'db_error',
      message: err.message,
      stack: err.stack,
    });
  }
}
