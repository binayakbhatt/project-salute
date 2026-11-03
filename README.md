# Project SALUTE | India Post — Dhemaji Sub Division

Official financial welfare, PLI/RPLI calculation, POSB cross-selling, TDS reduction planning, and shift-change lead capture web application for **Dhemaji Sub Division (Lakhimpur Postal Division, Assam Circle)**.

## Project Structure
- `index.html` — Main HTML entry with Tailwind CSS v4, FontAwesome, and jsPDF CDNs
- `package.json` — Vite + React dependencies and scripts
- `vite.config.js` — Vite configuration (`base: './'`)
- `.github/workflows/deploy.yml` — Automated GitHub Pages deployment workflow
- `schema.sql` — Cloudflare D1 SQLite table schema
- `worker.js` — Cloudflare Worker REST API for syncing leads
- `src/main.jsx` — React DOM entry point
- `src/App.jsx` — Main application with Psychological Master Pitch, PLI/RPLI Calculator, Xonchoyor Xopun Ladder, Lead Capture, CRM, TDS Calculator, and Competent Authority SOP
- `src/utils/pliCalculator.js` — Actuarial calculation engine for all 11 official PLI & RPLI schemes
- `src/utils/pdfGenerator.js` — Direct customer quote PDF generator
