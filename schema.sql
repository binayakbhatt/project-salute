-- Cloudflare D1 Database Schema for Project SALUTE
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
);

CREATE INDEX IF NOT EXISTS idx_leads_official ON salute_leads(official_name);
CREATE INDEX IF NOT EXISTS idx_leads_office ON salute_leads(office_category);
CREATE INDEX IF NOT EXISTS idx_leads_followup ON salute_leads(follow_up_date);
