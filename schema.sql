CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  segment TEXT,
  institution TEXT,
  qualification_route TEXT,
  primary_product TEXT,
  secondary_product TEXT,
  official_name TEXT,
  office_category TEXT,
  office_name TEXT,
  follow_up_date TEXT,
  remarks TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
