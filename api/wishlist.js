// api/wishlist.js – PURE DUMMY, NO DB

export default async function handler(req, res) {
  // CORS so GH Pages / localhost can call it
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // No DB, just a fixed JSON response
  res.status(200).json([
    {
      id: 'dummy-1',
      title: 'Dummy wishlist',
      slug: 'dummy',
      is_public: true,
      created_at: new Date().toISOString(),
    },
  ]);
}
