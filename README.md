# Project SALUTE | India Post — Dhemaji Sub Division (Lakhimpur Postal Division)

Official marketing, lead-capture, official PLI/RPLI ROI & 3-year loan calculator, Xonchoyor Xopun monthly 1-year TD ladder portal, and POSB TDS planner connected to Cloudflare D1.

## Repository File Structure
- `package.json`: Project dependencies and build scripts.
- `vite.config.js`: Vite configuration with relative base paths for GitHub Pages.
- `index.html`: Main HTML entry point with Tailwind CSS v4, FontAwesome, and jsPDF.
- `schema.sql`: Cloudflare D1 SQLite database table and index definitions.
- `worker.js`: Cloudflare Worker REST API backend.
- `src/main.jsx`: React DOM root mounting point.
- `src/App.jsx`: Main modularized React application component containing all 6 tabs, calculators, CRM, and D1 database sync.
- `src/utils/pdfGenerator.js`: Direct PDF quote generator utility using `jspdf` and `jspdf-autotable`.
- `.github/workflows/deploy.yml`: GitHub Actions auto-deployment pipeline for GitHub Pages.
