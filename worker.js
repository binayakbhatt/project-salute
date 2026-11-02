export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-Salute-Key",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      await env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS salute_leads (
          id TEXT PRIMARY KEY,
          full_name TEXT NOT NULL,
          dob TEXT DEFAULT '',
          age INTEGER NOT NULL DEFAULT 30,
          whatsapp TEXT NOT NULL,
          segment TEXT NOT NULL,
          institution TEXT NOT NULL,
          qualification_route TEXT NOT NULL DEFAULT 'PLI',
          plan_type TEXT NOT NULL DEFAULT 'Santosh',
          primary_product TEXT NOT NULL,
          secondary_product TEXT NOT NULL,
          sum_assured INTEGER NOT NULL DEFAULT 500000,
          term_years INTEGER NOT NULL DEFAULT 20,
          official_name TEXT NOT NULL,
          office_category TEXT NOT NULL,
          office_name TEXT NOT NULL,
          follow_up_date TEXT DEFAULT '',
          remarks TEXT DEFAULT '',
          created_at TEXT NOT NULL
        )
      `).run();

      if (url.pathname === "/api/leads" && request.method === "GET") {
        const { results } = await env.DB.prepare("SELECT * FROM salute_leads ORDER BY created_at DESC LIMIT 500").all();
        return Response.json({ ok: true, leads: results || [] }, { headers: corsHeaders });
      }

      if (url.pathname === "/api/leads" && request.method === "POST") {
        const b = await request.json();
        const lead = {
          id: String(b.id || `SALUTE-${Date.now()}`),
          full_name: String(b.full_name || b.name || ""),
          dob: String(b.dob || ""),
          age: Number(b.age) || 30,
          whatsapp: String(b.whatsapp || b.phone || ""),
          segment: String(b.segment || "Assam Police"),
          institution: String(b.institution || b.dept || ""),
          qualification_route: b.qualification_route === "RPLI" ? "RPLI" : "PLI",
          plan_type: String(b.plan_type || "Santosh"),
          primary_product: String(b.primary_product || b.product || ""),
          secondary_product: String(b.secondary_product || b.crosssell || ""),
          sum_assured: Number(b.sum_assured) || 500000,
          term_years: Number(b.term_years) || 20,
          official_name: String(b.official_name || b.official || ""),
          office_category: String(b.office_category || "Sub Office (SO)"),
          office_name: String(b.office_name || b.office || ""),
          follow_up_date: String(b.follow_up_date || b.followup || ""),
          remarks: String(b.remarks || b.remark || ""),
          created_at: String(b.created_at || new Date().toISOString()),
        };

        await env.DB.prepare(`
          INSERT OR REPLACE INTO salute_leads (
            id, full_name, dob, age, whatsapp, segment, institution,
            qualification_route, plan_type, primary_product, secondary_product,
            sum_assured, term_years, official_name, office_category, office_name,
            follow_up_date, remarks, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          lead.id, lead.full_name, lead.dob, lead.age, lead.whatsapp, lead.segment, lead.institution,
          lead.qualification_route, lead.plan_type, lead.primary_product, lead.secondary_product,
          lead.sum_assured, lead.term_years, lead.official_name, lead.office_category, lead.office_name,
          lead.follow_up_date, lead.remarks, lead.created_at
        ).run();

        return Response.json({ ok: true, lead }, { status: 201, headers: corsHeaders });
      }

      if (url.pathname.startsWith("/api/leads/") && request.method === "DELETE") {
        const id = decodeURIComponent(url.pathname.replace("/api/leads/", ""));
        await env.DB.prepare("DELETE FROM salute_leads WHERE id = ?").bind(id).run();
        return Response.json({ ok: true, deleted: id }, { headers: corsHeaders });
      }

      return Response.json({ ok: false, error: "Route not found" }, { status: 404, headers: corsHeaders });
    } catch (err) {
      return Response.json({ ok: false, error: err.message }, { status: 500, headers: corsHeaders });
    }
  },
};