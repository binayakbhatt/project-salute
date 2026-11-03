export default {
  async fetch(request, env) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);

    try {
      if (url.pathname === '/api/leads' && request.method === 'GET') {
        const { results } = await env.DB.prepare('SELECT * FROM leads ORDER BY created_at DESC').all();
        return Response.json(results, { headers: corsHeaders });
      }

      if (url.pathname === '/api/leads' && request.method === 'POST') {
        const b = await request.json();
        await env.DB.prepare(
          `INSERT OR REPLACE INTO leads (
            id, full_name, whatsapp, segment, institution, qualification_route,
            primary_product, secondary_product, official_name, office_category,
            office_name, follow_up_date, remarks, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          b.id, b.full_name, b.whatsapp, b.segment, b.institution, b.qualification_route,
          b.primary_product, b.secondary_product, b.official_name, b.office_category,
          b.office_name, b.follow_up_date || '', b.remarks || '', b.created_at || new Date().toISOString()
        ).run();
        return Response.json({ success: true }, { headers: corsHeaders });
      }

      if (url.pathname.startsWith('/api/leads/') && request.method === 'DELETE') {
        const id = decodeURIComponent(url.pathname.replace('/api/leads/', ''));
        await env.DB.prepare('DELETE FROM leads WHERE id = ?').bind(id).run();
        return Response.json({ deleted: true }, { headers: corsHeaders });
      }

      return Response.json({ status: 'Project SALUTE API Online' }, { headers: corsHeaders });
    } catch (err) {
      return Response.json({ error: err.message }, { status: 500, headers: corsHeaders });
    }
  }
};
