import React, { useState, useEffect } from 'react';
import { generatePDFQuote } from './utils/pdfGenerator';

const DEFAULT_D1_API_URL = 'https://project-salute-api.binayaksinbox.workers.dev';
const XONCHOYOR_XOPUN_PORTAL = 'https://binayakbhatt.github.io/sanchayer_sopno/';

const SCHEMES = {
  pli_santosh: { id: 'pli_santosh', name: 'PLI Santosh (Endowment Assurance)', quota: 'PLI', bonus: 52 },
  pli_suraksha: { id: 'pli_suraksha', name: 'PLI Suraksha (Whole Life Assurance)', quota: 'PLI', bonus: 76 },
  rpli_santosh: { id: 'rpli_santosh', name: 'RPLI Gram Santosh (Endowment)', quota: 'RPLI', bonus: 48 },
  rpli_suraksha: { id: 'rpli_suraksha', name: 'RPLI Gram Suraksha (Whole Life)', quota: 'RPLI', bonus: 60 },
};

const POSB_PORTFOLIO = [
  { id: 'sb', name: 'Post Office Savings Account (SB)', rate: '4.0% p.a.', tenure: 'Liquid', highlight: 'Sovereign salary/savings account with NEFT/RTGS & NACH auto-debit.' },
  { id: 'rd', name: '5-Year Recurring Deposit (RD)', rate: '6.7% p.a.', tenure: '5 Years', highlight: 'Disciplined monthly savings starting at ₹100/mo with loan facility after 12 installments.' },
  { id: 'td1', name: '1-Year Post Office Time Deposit (TD)', rate: '6.9% p.a.', tenure: '1 Year', highlight: 'Quarterly compounding annual payout; core building block for Xonchoyor Xopun laddering.' },
  { id: 'td2', name: '2-Year Post Office Time Deposit (TD)', rate: '7.0% p.a.', tenure: '2 Years', highlight: 'Guaranteed sovereign compounding for medium-term milestones.' },
  { id: 'td3', name: '3-Year Post Office Time Deposit (TD)', rate: '7.1% p.a.', tenure: '3 Years', highlight: 'Higher sovereign yield with quarterly compounding interest.' },
  { id: 'td5', name: '5-Year Post Office Time Deposit (TD)', rate: '7.5% p.a.', tenure: '5 Years', highlight: 'Qualifies for Section 80C tax deduction with annual guaranteed interest payout.' },
  { id: 'mis', name: 'Monthly Income Scheme (MIS)', rate: '7.4% p.a.', tenure: '5 Years', highlight: 'Guaranteed monthly cashflow up to ₹9L (Single) / ₹15L (Joint).' },
  { id: 'scss', name: 'Senior Citizens Savings Scheme (SCSS)', rate: '8.2% p.a.', tenure: '5 Years', highlight: 'Highest sovereign quarterly pension return for retiring personnel (up to ₹30 Lakh).' },
  { id: 'ppf', name: 'Public Provident Fund (PPF)', rate: '7.1% p.a. (EEE)', tenure: '15 Years', highlight: '100% tax-free interest and maturity under EEE status (up to ₹1.50 Lakh/yr u/s 80C).' },
  { id: 'ssy', name: 'Sukanya Samriddhi Yojana (SSY)', rate: '8.2% p.a. (EEE)', tenure: 'Girl Child (<10)', highlight: 'Highest tax-free sovereign rate for daughter higher education & marriage planning.' },
  { id: 'nsc', name: 'National Savings Certificate (NSC)', rate: '7.7% p.a.', tenure: '5 Years', highlight: 'High-yield certificate with Section 80C deduction on principal and reinvested interest.' },
  { id: 'kvp', name: 'Kisan Vikas Patra (KVP)', rate: '7.5% p.a.', tenure: '115 Months', highlight: '100% sovereign lump-sum wealth doubler with no upper investment limit.' },
  { id: 'mssc', name: 'Mahila Samman Savings Certificate (MSSC)', rate: '7.5% p.a.', tenure: '2 Years', highlight: 'Dedicated short-term high-return sovereign scheme for women personnel & nurses (up to ₹2L).' },
];

const DHEMAJI_FACILITIES = [
  'Dhemaji Civil Hospital',
  'Office of Jt. Director of Health Services (Dhemaji)',
  'Dhemaji Urban Hospital',
  'Silapathar Model Hospital',
  'Gogamukh CHC',
  'Bengenagarah CHC',
  'Jonai CHC',
  'Machkhowa PHC',
  'Sissimukh Mini PHC',
  'Bordoloni Mini PHC',
  'SP Office Dhemaji',
  'Police Lines Dhemaji',
  'Armed / IR / Commando Police Battalion',
  'Fire Station Dhemaji / Silapathar',
  'Defence / CAPF Unit (Army/CRPF/Assam Rifles)',
  'Other Sub-Centre / Institution'
];

function sanitizeInput(str) {
  return String(str || '').replace(/[<>]/g, '').trim();
}

function calculatePLIMetrics(schemeKey, sa, age, term) {
  const scheme = SCHEMES[schemeKey] || SCHEMES.pli_santosh;
  const units = sa / 1000;
  const annualRate = Math.max(18, (1000 / term) * 0.86 + Math.max(0, age - 25) * 0.42 + (scheme.quota === 'RPLI' ? 2.1 : 0));
  const monthlyPremium = Math.round((units * annualRate) / 12);
  const annualPremium = monthlyPremium * 12;
  const totalInvested = annualPremium * term;

  const annualBonus = units * scheme.bonus;
  const totalBonus = annualBonus * term;
  const terminalBonus = term >= 20 ? Math.min(1000, Math.round((sa / 10000) * 20)) : 0;
  const totalMaturity = sa + totalBonus + terminalBonus;
  const netProfit = totalMaturity - totalInvested;
  const multiplier = totalInvested > 0 ? (totalMaturity / totalInvested).toFixed(2) : '0.00';
  const roiPct = totalInvested > 0 ? Math.round((netProfit / totalInvested) * 100) : 0;

  const paidUp3 = sa * (3 / term);
  const svFactor3 = Math.min(0.85, Math.max(0.32, 0.88 - Math.max(1, term - 3) * 0.024));
  const sv3 = Math.round(paidUp3 * svFactor3);
  const loan3 = Math.round(sv3 * 0.9);

  const paidUp5 = sa * (5 / term);
  const sv5 = Math.round((paidUp5 + annualBonus * 5) * Math.min(0.88, Math.max(0.36, 0.90 - Math.max(1, term - 5) * 0.022)));
  const loan5 = Math.round(sv5 * 0.9);

  const surrenderTds = sv3 >= 100000 && sv3 > annualPremium * 3 ? Math.round((sv3 - annualPremium * 3) * 0.05) : 0;

  return {
    scheme, monthlyPremium, annualPremium, totalInvested, annualBonus, totalBonus, terminalBonus,
    totalMaturity, netProfit, multiplier, roiPct, sv3, loan3, loan5, surrenderTds, maturityAge: age + term,
  };
}

export default function App() {
  const [activeTab, setActiveTab] = useState('pitch');
  const [leads, setLeads] = useState([]);
  const [d1Url, setD1Url] = useState(() => localStorage.getItem('salute_d1_url') || DEFAULT_D1_API_URL);
  const [syncStatus, setSyncStatus] = useState('offline');
  const [showD1Modal, setShowD1Modal] = useState(false);
  const [toast, setToast] = useState(null);

  const [calcScheme, setCalcScheme] = useState('pli_santosh');
  const [calcSa, setCalcSa] = useState(500000);
  const [calcAge, setCalcAge] = useState(30);
  const [calcTerm, setCalcTerm] = useState(20);
  const [xxMonthly, setXxMonthly] = useState(5000);

  const [tdsScheme, setTdsScheme] = useState('scss');
  const [tdsPrincipal, setTdsPrincipal] = useState(1000000);
  const [tdsOpts, setTdsOpts] = useState({ form15g: true, splitCif: true, divertPli: false });

  const [formData, setFormData] = useState({
    name: '', phone: '', segment: 'Assam Police & Battalions', dept: 'Dhemaji Civil Hospital',
    qualification_route: 'PLI', product: 'PLI Santosh (Endowment Assurance)',
    crosssell: 'Xonchoyor Xopun (Monthly 1-Yr TD Ladder)', official: '',
    office_category: 'Sub Office (SO)', office: '', followup: '', remark: '',
  });

  const metrics = calculatePLIMetrics(calcScheme, calcSa, calcAge, calcTerm);
  const investedPct = Math.min(Math.max(Math.round((metrics.totalInvested / metrics.totalMaturity) * 100), 20), 80);

  const notify = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('salute_leads')) || [];
      setLeads(saved);
    } catch {
      setLeads([]);
    }
    if (d1Url) fetchLeads(d1Url);
  }, []);

  const fetchLeads = async (url = d1Url) => {
    const clean = url.replace(/\/+$/, '');
    if (!clean) return;
    setSyncStatus('syncing');
    try {
      const res = await fetch(`${clean}/api/leads`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.leads || [];
      const formatted = list.map((r) => ({
        id: r.id,
        name: r.full_name || r.name || '',
        phone: r.whatsapp || r.phone || '',
        segment: r.segment || 'Assam Police',
        dept: r.institution || r.dept || '',
        qualification_route: r.qualification_route || 'PLI',
        product: r.primary_product || r.product || 'PLI Santosh',
        crosssell: r.secondary_product || r.crosssell || 'Xonchoyor Xopun',
        official: r.official_name || r.official || '',
        office_category: r.office_category || 'SO',
        office: r.office_name || r.office || '',
        followup: r.follow_up_date || r.followup || '',
        remark: r.remarks || r.remark || '',
        date: r.created_at ? new Date(r.created_at).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN'),
      }));
      setLeads(formatted);
      localStorage.setItem('salute_leads', JSON.stringify(formatted));
      setSyncStatus('online');
    } catch {
      setSyncStatus('offline');
    }
  };

  const handleSyncD1 = async () => {
    const clean = d1Url.replace(/\/+$/, '');
    if (!clean) {
      setShowD1Modal(true);
      return;
    }
    setSyncStatus('syncing');
    try {
      for (const l of leads) {
        await fetch(`${clean}/api/leads`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: String(l.id),
            full_name: l.name,
            whatsapp: l.phone,
            segment: l.segment,
            institution: l.dept,
            qualification_route: l.qualification_route || 'PLI',
            primary_product: l.product,
            secondary_product: l.crosssell,
            official_name: l.official,
            office_category: l.office_category,
            office_name: l.office,
            follow_up_date: l.followup || '',
            remarks: l.remark || '',
          }),
        });
      }
      await fetchLeads(clean);
      notify('Successfully synced with database!');
    } catch {
      setSyncStatus('offline');
      notify('Sync failed. Working offline.', 'error');
    }
  };

  const handleLeadSubmit = async (e) => {
    e.preventDefault();
    const cleanName = sanitizeInput(formData.name);
    const cleanPhone = formData.phone.replace(/\D/g, '').slice(-10);
    const cleanOfficial = sanitizeInput(formData.official);
    const cleanOffice = sanitizeInput(formData.office);

    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      notify('Please enter a valid 10-digit Indian WhatsApp number (6-9).', 'error');
      return;
    }
    if (!cleanName || !cleanOfficial || !cleanOffice) {
      notify('Please fill out all required fields.', 'error');
      return;
    }

    const lead = {
      id: `SAL-${Date.now()}`,
      name: cleanName,
      phone: cleanPhone,
      segment: formData.segment,
      dept: sanitizeInput(formData.dept),
      qualification_route: formData.qualification_route,
      product: formData.product,
      crosssell: formData.crosssell,
      official: cleanOfficial,
      office_category: formData.office_category,
      office: cleanOffice,
      followup: formData.followup,
      remark: sanitizeInput(formData.remark),
      date: new Date().toLocaleDateString('en-IN'),
    };

    const updated = [lead, ...leads];
    setLeads(updated);
    localStorage.setItem('salute_leads', JSON.stringify(updated));

    if (d1Url) {
      try {
        await fetch(`${d1Url.replace(/\/+$/, '')}/api/leads`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: lead.id,
            full_name: lead.name,
            whatsapp: lead.phone,
            segment: lead.segment,
            institution: lead.dept,
            qualification_route: lead.qualification_route,
            primary_product: lead.product,
            secondary_product: lead.crosssell,
            official_name: lead.official,
            office_category: lead.office_category,
            office_name: lead.office,
            follow_up_date: lead.followup,
            remarks: lead.remark,
            created_at: new Date().toISOString(),
          }),
        });
        setSyncStatus('online');
      } catch {}
    }

    generatePDFQuote(lead, calcSa, calcTerm, metrics);
    notify('Lead saved & Direct PDF Quote downloaded!');
    setFormData({ ...formData, name: '', phone: '', followup: '', remark: '' });
    setActiveTab('crm');
  };

  const deleteLead = async (id) => {
    if (!window.confirm('Delete this lead record?')) return;
    const updated = leads.filter((l) => l.id !== id);
    setLeads(updated);
    localStorage.setItem('salute_leads', JSON.stringify(updated));
    if (d1Url) {
      try {
        await fetch(`${d1Url.replace(/\/+$/, '')}/api/leads/${encodeURIComponent(id)}`, { method: 'DELETE' });
      } catch {}
    }
    notify('Lead removed.', 'info');
  };

  const exportCSV = () => {
    if (leads.length === 0) return notify('No leads to export.', 'error');
    let csv = 'ID,Name,WhatsApp,Segment,Institution,PrimaryProduct,SecondaryCrossSell,OfficialName,OfficeCategory,OfficeName,FollowUpDate,FieldRemark,Date\n';
    leads.forEach((l) => {
      csv += `"${l.id}","${l.name}","${l.phone}","${l.segment}","${l.dept}","${l.product}","${l.crosssell}","${l.official}","${l.office_category}","${l.office}","${l.followup || ''}","${l.remark || ''}","${l.date}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Project_SALUTE_Leads.csv';
    a.click();
    notify('Leads exported as CSV successfully!');
  };

  const posbRates = { scss: 0.082, mis: 0.074, td5yr: 0.075, td1yr: 0.069 };
  const rate = posbRates[tdsScheme] || 0.082;
  const principal = tdsOpts.divertPli ? tdsPrincipal * 0.7 : tdsPrincipal;
  const perCif = tdsOpts.splitCif ? principal / 2 : principal;
  const annualInt = Math.round(perCif * rate);
  const threshold = tdsScheme === 'scss' ? 50000 : 40000;
  const rawTds = annualInt > threshold ? Math.round(annualInt * 0.1) : 0;
  const netTds = tdsOpts.form15g ? 0 : rawTds;

  const xxPrincipal = xxMonthly * 12;
  const xxMonthlyPayout = Math.round(xxMonthly * 1.0708);
  const xxTotalAnnual = xxMonthlyPayout * 12;

  return (
    <div className="bg-slate-50 text-slate-800 font-sans antialiased min-h-screen flex flex-col">
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-amber-300 px-4 py-3 rounded-xl shadow-2xl border border-amber-400 text-xs font-bold">
          {toast.msg}
        </div>
      )}

      <header className="bg-gradient-to-r from-red-800 via-red-700 to-amber-700 text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col md:flex-row justify-between items-center gap-3">
          <div className="flex items-center space-x-3">
            <div className="bg-white p-1.5 rounded-xl shadow-md flex items-center justify-center">
              <svg width="34" height="34" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M32 4L8 14V30C8 46.5 18.2 57.6 32 61C45.8 57.6 56 46.5 56 30V14L32 4Z" fill="#B91C1C" stroke="#F59E0B" strokeWidth="3"/>
                <path d="M18 27H46L39 33H14L18 27Z" fill="#FDE047"/>
                <path d="M22 36H48L42 42H18L22 36Z" fill="#FFFFFF"/>
                <circle cx="32" cy="18" r="4" fill="#FDE047"/>
              </svg>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg md:text-xl font-black tracking-tight">PROJECT SALUTE</h1>
                <span className="text-[10px] bg-yellow-400 text-red-950 font-extrabold px-2 py-0.5 rounded-full uppercase">
                  Dhemaji Sub Division
                </span>
              </div>
              <p className="text-xs text-red-100">
                India Post — Lakhimpur Postal Division | Financial Security for Those Who Serve &amp; Care
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleSyncD1}
              className="text-xs bg-red-950 hover:bg-red-900 px-3.5 py-1.5 rounded-full border border-red-400/40 flex items-center space-x-2 cursor-pointer transition font-bold"
            >
              <span className={`w-2 h-2 rounded-full ${syncStatus === 'online' ? 'bg-emerald-400' : 'bg-amber-400 animate-ping'}`}></span>
              <span>Sync</span>
            </button>
            <button
              onClick={() => setShowD1Modal(true)}
              className="text-xs bg-white/10 hover:bg-white/20 px-2.5 py-1.5 rounded-full border border-white/20 font-bold"
              title="Configure Database URL"
            >
              ⚙
            </button>
          </div>
        </div>
      </header>

      <nav className="bg-white border-b border-slate-200 shadow-xs sticky top-[62px] z-40">
        <div className="max-w-7xl mx-auto px-4 flex overflow-x-auto space-x-4">
          {[
            { id: 'pitch', label: '1. Campaign Pitch & Segments' },
            { id: 'calculator', label: '2. PLI/RPLI ROI & 3-Yr Loan Calc' },
            { id: 'xonchoyor', label: '3. Xonchoyor Xopun & POSB' },
            { id: 'capture', label: '4. Shift-Change Lead Capture & PDF' },
            { id: 'crm', label: `5. Captured Leads CRM (${leads.length})` },
            { id: 'tds', label: '6. POSB & PLI TDS Planner' },
            { id: 'sop', label: '7. Competent Authority SOP' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`py-3 px-1 border-b-2 font-bold text-xs md:text-sm whitespace-nowrap cursor-pointer transition-colors ${
                activeTab === t.id ? 'border-red-700 text-red-700' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-6 flex-grow w-full space-y-6">
        {activeTab === 'pitch' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-red-950 via-red-900 to-slate-900 text-white p-6 sm:p-8 rounded-2xl shadow-lg space-y-4">
              <span className="text-[11px] bg-amber-400 text-slate-950 font-extrabold px-3 py-1 rounded-full uppercase">
                India Post — Dhemaji Sub Division (Lakhimpur Postal Division)
              </span>
              <h2 className="text-2xl sm:text-3xl font-black">Project SALUTE: Financial Security for Those Who Serve and Care</h2>
              <p className="text-xs sm:text-sm text-red-100 max-w-4xl leading-relaxed">
                Tailored exclusively for Assam Police &amp; Battalions, Fire &amp; Emergency Services, Healthcare Professionals, and Defence/CAPF across Dhemaji District. Built upon four life-stage pillars: <strong>PROTECT</strong> (PLI Santosh/Suraksha &amp; RPLI Gram Santosh), <strong>SAVE</strong> (Xonchoyor Xopun Monthly 1-Yr TD Ladder &amp; POSB), <strong>NURTURE</strong> (SSY for girl child), and <strong>RETIRE</strong> (SCSS &amp; MIS).
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-3">
                <h3 className="text-base font-black text-slate-900">Target Service Segments in Dhemaji</h3>
                <ul className="text-xs text-slate-700 space-y-2">
                  <li>• <strong>Assam Police &amp; Battalions:</strong> District Executive Force, Armed/IR/Commando Battalions stationed across Dhemaji &amp; Jonai.</li>
                  <li>• <strong>Fire &amp; Emergency Services:</strong> First responders stationed at Dhemaji and Silapathar fire stations.</li>
                  <li>• <strong>Healthcare Professionals:</strong> Doctors, nurses, and medical staff at Dhemaji Civil Hospital, CHCs, and PHCs.</li>
                  <li>• <strong>Defence &amp; CAPF Units:</strong> Army, CRPF, and Assam Rifles personnel deployed in the region.</li>
                </ul>
              </div>
              
            </div>
          </div>
        )}

        {activeTab === 'calculator' && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-5">
            <h2 className="text-lg font-black text-slate-800 mb-1">Official PLI &amp; RPLI Wealth-Doubler &amp; 3-Year Loan Calculator</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Select Quota &amp; Plan</label>
                  <select value={calcScheme} onChange={(e) => setCalcScheme(e.target.value)} className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-sm font-semibold">
                    <option value="pli_santosh">PLI Santosh (Endowment - ₹52 Bonus)</option>
                    <option value="pli_suraksha">PLI Suraksha (Whole Life - ₹76 Bonus)</option>
                    <option value="rpli_santosh">RPLI Gram Santosh (Endowment - ₹48 Bonus)</option>
                    <option value="rpli_suraksha">RPLI Gram Suraksha (Whole Life - ₹60 Bonus)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Sum Assured: ₹{calcSa.toLocaleString('en-IN')}</label>
                  <select value={calcSa} onChange={(e) => setCalcSa(Number(e.target.value))} className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-sm font-semibold">
                    <option value={200000}>₹2,00,000</option>
                    <option value={500000}>₹5,00,000</option>
                    <option value={1000000}>₹10,00,000</option>
                    <option value={2000000}>₹20,00,000</option>
                    <option value={5000000}>₹50,00,000</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Entry Age: {calcAge} Years</label>
                  <input type="range" min="19" max="50" value={calcAge} onChange={(e) => setCalcAge(Number(e.target.value))} className="w-full accent-red-700 cursor-pointer" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Policy Term: {calcTerm} Years</label>
                  <input type="range" min="10" max="30" value={calcTerm} onChange={(e) => setCalcTerm(Number(e.target.value))} className="w-full accent-red-700 cursor-pointer" />
                </div>
              </div>

              <div className="lg:col-span-2 space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="bg-red-50 p-3.5 rounded-xl border border-red-200">
                    <span className="font-bold text-red-700 uppercase block">Est. Monthly Deposit</span>
                    <div className="text-xl font-black text-red-900 mt-1">₹{metrics.monthlyPremium.toLocaleString('en-IN')}</div>
                  </div>
                  <div className="bg-emerald-50 p-3.5 rounded-xl border border-emerald-200">
                    <span className="font-bold text-emerald-700 uppercase block">Total Maturity</span>
                    <div className="text-xl font-black text-emerald-900 mt-1">₹{metrics.totalMaturity.toLocaleString('en-IN')}</div>
                  </div>
                  <div className="bg-blue-50 p-3.5 rounded-xl border border-blue-200">
                    <span className="font-bold text-blue-700 uppercase block">Net Profit</span>
                    <div className="text-xl font-black text-blue-900 mt-1">₹{metrics.netProfit.toLocaleString('en-IN')}</div>
                  </div>
                  <div className="bg-purple-50 p-3.5 rounded-xl border border-purple-200">
                    <span className="font-bold text-purple-700 uppercase block">Multiplier</span>
                    <div className="text-xl font-black text-purple-900 mt-1">{metrics.multiplier}x</div>
                  </div>
                </div>

                <div className="bg-slate-100 p-3.5 rounded-xl border border-slate-200">
                  <div className="flex justify-between text-xs font-bold text-slate-700 mb-1.5">
                    <span>Total Invested: ₹{metrics.totalInvested.toLocaleString('en-IN')}</span>
                    <span className="text-emerald-700">Maturity: ₹{metrics.totalMaturity.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="w-full bg-slate-300 h-3 rounded-full overflow-hidden flex">
                    <div className="bg-slate-600 h-full" style={{ width: `${investedPct}%` }}></div>
                    <div className="bg-emerald-600 h-full" style={{ width: `${100 - investedPct}%` }}></div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 space-y-1">
                    <span className="font-black uppercase text-amber-900 block">3-Year Loan Eligibility (90% Surrender Value)</span>
                    <div className="text-2xl font-black text-amber-950">≈ ₹{metrics.loan3Yr.toLocaleString('en-IN')}</div>
                    <p className="text-[11px] text-amber-800">5-Yr Loan Eligibility: ≈ ₹{metrics.loan5Yr.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="bg-slate-900 text-white p-4 rounded-xl space-y-1">
                    <span className="font-black uppercase text-yellow-300 block">PLI / RPLI TDS Rule (Sec 194DA)</span>
                    <p className="text-[11px] text-slate-300">Regular Maturity = 100% Tax-Free (₹0 TDS). Policy Loan = ₹0 TDS.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'xonchoyor' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-red-950 text-white p-6 rounded-2xl shadow-lg space-y-4">
              <div className="flex flex-col md:flex-row justify-between md:items-center gap-3 pb-3 border-b border-white/10">
                <div>
                  <h2 className="text-xl font-black">Xonchoyor Xopun — Monthly 1-Yr Time Deposit Ladder</h2>
                  <p className="text-xs text-slate-300 mt-1">Open one 1-Year POTD every month for 12 months. From Month 13 onwards, receive a guaranteed monthly payout!</p>
                </div>
                <a href={XONCHOYOR_XOPUN_PORTAL} target="_blank" rel="noopener noreferrer" className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black px-4 py-3 rounded-xl text-xs whitespace-nowrap shadow-md text-center">
                  Open Official Xonchoyor Xopun Portal ↗
                </a>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs pt-2">
                <div className="bg-white/10 p-3.5 rounded-xl border border-white/10">
                  <label className="block text-amber-300 font-bold uppercase mb-1">Monthly 1-Yr TD Deposit</label>
                  <select value={xxMonthly} onChange={(e) => setXxMonthly(Number(e.target.value))} className="w-full p-2 bg-slate-900 text-white rounded-lg font-bold">
                    <option value={2000}>₹2,000 / mo</option>
                    <option value={5000}>₹5,000 / mo</option>
                    <option value={10000}>₹10,000 / mo</option>
                    <option value={20000}>₹20,000 / mo</option>
                  </select>
                </div>
                <div className="bg-white/10 p-3.5 rounded-xl border border-white/10">
                  <span className="text-slate-300 font-bold uppercase block">Month 13+ Monthly Payout</span>
                  <div className="text-xl font-black text-emerald-400 mt-1">₹{xxMonthlyPayout.toLocaleString('en-IN')} / mo</div>
                </div>
                <div className="bg-white/10 p-3.5 rounded-xl border border-white/10">
                  <span className="text-slate-300 font-bold uppercase block">Total Annual Payout</span>
                  <div className="text-xl font-black text-amber-300 mt-1">₹{xxTotalAnnual.toLocaleString('en-IN')} / yr</div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h3 className="text-base font-black text-slate-800 mb-3">Complete India Post POSB Portfolio (All 11 Schemes)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                {POSB_PORTFOLIO.map((s) => (
                  <div key={s.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <span className="font-extrabold text-red-700 uppercase">{s.rate}</span>
                    <h4 className="font-bold text-slate-900 text-sm mt-0.5">{s.name}</h4>
                    <p className="text-slate-600">{s.highlight}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'capture' && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-black text-slate-800 mb-1">Shift-Change Lead Capture &amp; Direct Customer PDF Quote</h2>
            <form onSubmit={handleLeadSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs mt-4">
              <div>
                <label className="block font-bold uppercase text-slate-700 mb-1">Prospect Full Name *</label>
                <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Customer Name" className="w-full p-2.5 border border-slate-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block font-bold uppercase text-slate-700 mb-1">10-Digit WhatsApp Mobile *</label>
                <input type="tel" required maxLength={10} value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="9864012345" className="w-full p-2.5 border border-slate-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block font-bold uppercase text-slate-700 mb-1">Institution / Facility *</label>
                <select value={formData.dept} onChange={(e) => setFormData({ ...formData, dept: e.target.value })} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm">
                  {DHEMAJI_FACILITIES.map((f) => (<option key={f} value={f}>{f}</option>))}
                </select>
              </div>
              <div>
                <label className="block font-bold uppercase text-slate-700 mb-1">Primary PLI / RPLI Plan *</label>
                <select value={formData.product} onChange={(e) => setFormData({ ...formData, product: e.target.value })} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm">
                  <option value="PLI Santosh (Endowment Assurance)">PLI Santosh (Endowment)</option>
                  <option value="PLI Suraksha (Whole Life Assurance)">PLI Suraksha (Whole Life)</option>
                  <option value="RPLI Gram Santosh (Endowment)">RPLI Gram Santosh</option>
                  <option value="RPLI Gram Suraksha (Whole Life)">RPLI Gram Suraksha</option>
                </select>
              </div>
              <div>
                <label className="block font-bold uppercase text-slate-700 mb-1">Name of SPM / BPM / Officials / ME *</label>
                <input type="text" required value={formData.official} onChange={(e) => setFormData({ ...formData, official: e.target.value })} placeholder="Official Name" className="w-full p-2.5 border border-slate-300 rounded-lg text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold uppercase text-slate-700 mb-1">Office Category *</label>
                  <select value={formData.office_category} onChange={(e) => setFormData({ ...formData, office_category: e.target.value })} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm">
                    <option value="Branch Office (BO)">BO</option>
                    <option value="Sub Office (SO)">SO</option>
                    <option value="Head Office (HO)">HO</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold uppercase text-slate-700 mb-1">Office Name *</label>
                  <input type="text" required value={formData.office} onChange={(e) => setFormData({ ...formData, office: e.target.value })} placeholder="Dhemaji MDG" className="w-full p-2.5 border border-slate-300 rounded-lg text-sm" />
                </div>
              </div>
              <div>
                <label className="block font-bold uppercase text-slate-700 mb-1">Follow-Up Date (Optional)</label>
                <input type="date" value={formData.followup} onChange={(e) => setFormData({ ...formData, followup: e.target.value })} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block font-bold uppercase text-slate-700 mb-1">Field Remark</label>
                <input type="text" value={formData.remark} onChange={(e) => setFormData({ ...formData, remark: e.target.value })} placeholder="Shift notes" className="w-full p-2.5 border border-slate-300 rounded-lg text-sm" />
              </div>
              <div className="md:col-span-2 flex justify-end pt-2">
                <button type="submit" className="bg-red-700 hover:bg-red-800 text-white font-black px-6 py-3 rounded-xl text-sm shadow-md cursor-pointer">
                  Save Lead &amp; Download Direct PDF Quote
                </button>
              </div>
            </form>
          </div>
        )}

        {activeTab === 'crm' && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-center pb-3 border-b border-slate-100 gap-3">
              <h2 className="text-xl font-black text-slate-800">Project SALUTE Lead Register ({leads.length})</h2>
              <div className="flex gap-2">
                <button onClick={handleSyncD1} className="bg-indigo-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer">Sync</button>
                <button onClick={exportCSV} className="bg-slate-800 text-white px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer">Export CSV</button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 uppercase font-bold">
                    <th className="p-3">Customer</th>
                    <th className="p-3">Institution</th>
                    <th className="p-3">Products</th>
                    <th className="p-3">SPM/BPM &amp; Office</th>
                    <th className="p-3">Follow-Up</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {leads.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50">
                      <td className="p-3 font-bold">{l.name}<div className="font-normal text-slate-500">+91-{l.phone}</div></td>
                      <td className="p-3">{l.dept}</td>
                      <td className="p-3"><span className="font-bold text-red-700">{l.product}</span></td>
                      <td className="p-3 font-semibold">{l.official}<div className="font-normal text-slate-500">{l.office_category} — {l.office}</div></td>
                      <td className="p-3">{l.followup || '—'}</td>
                      <td className="p-3 text-right space-x-2">
                        <button onClick={() => generatePDFQuote(l, calcSa, calcTerm, metrics)} className="bg-red-700 text-white px-3 py-1.5 rounded-lg font-bold cursor-pointer">PDF</button>
                        <button onClick={() => deleteLead(l.id)} className="bg-slate-200 text-slate-700 px-2.5 py-1.5 rounded-lg cursor-pointer">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {leads.length === 0 && <div className="text-center py-12 text-slate-400 text-sm">No leads captured yet.</div>}
            </div>
          </div>
        )}

        {activeTab === 'tds' && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <h2 className="text-xl font-black text-slate-800">POSB Section 194A &amp; PLI Section 194DA TDS Reduction Planner</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                <div>
                  <label className="block font-bold uppercase text-slate-700 mb-1">Select POSB Scheme</label>
                  <select value={tdsScheme} onChange={(e) => setTdsScheme(e.target.value)} className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-sm">
                    <option value="scss">Senior Citizens Savings Scheme (SCSS - 8.2%)</option>
                    <option value="mis">Monthly Income Scheme (MIS - 7.4%)</option>
                    <option value="td5yr">5-Year Time Deposit (7.5%)</option>
                    <option value="td1yr">Xonchoyor Xopun / 1-Year TD (6.9%)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold uppercase text-slate-700 mb-1">Principal Amount (₹)</label>
                  <input type="number" step="50000" value={tdsPrincipal} onChange={(e) => setTdsPrincipal(Number(e.target.value))} className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-sm" />
                </div>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-100 p-3.5 rounded-xl">
                    <span className="font-bold text-slate-600 uppercase block">Annual Interest</span>
                    <div className="text-xl font-black mt-1">₹{annualInt.toLocaleString('en-IN')}</div>
                  </div>
                  <div className="bg-emerald-50 p-3.5 rounded-xl border border-emerald-200">
                    <span className="font-bold text-emerald-700 uppercase block">Net TDS</span>
                    <div className="text-xl font-black text-emerald-900 mt-1">₹{netTds.toLocaleString('en-IN')}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'sop' && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4 text-xs">
            <h2 className="text-xl font-black text-slate-800">Competent Authority Approach SOP (Dhemaji Sub Division)</h2>
            <p className="text-slate-700 leading-relaxed">
              <strong>1. The Competent Authority Meeting:</strong> Frame visit as an Official Central Government India Post Financial Welfare &amp; Service Camp under Project SALUTE for Police, Fire, and Healthcare personnel. Request a non-intrusive 1-table Helpdesk during shift changes.
            </p>
          </div>
        )}
      </main>

      {showD1Modal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <form onSubmit={(e) => { e.preventDefault(); setShowD1Modal(false); fetchLeads(d1Url); }} className="bg-white p-6 rounded-2xl max-w-md w-full space-y-4 text-xs">
            <h3 className="text-base font-black text-slate-900">Cloudflare D1 Worker Settings</h3>
            <input type="url" value={d1Url} onChange={(e) => setD1Url(e.target.value)} className="w-full p-2.5 border border-slate-300 rounded-lg text-xs font-mono" />
            <div className="flex justify-end gap-2 pt-2">
              <button type="submit" className="bg-red-700 text-white px-4 py-2 rounded-lg font-bold">Save URL</button>
            </div>
          </form>
        </div>
      )}

      <footer className="bg-slate-900 text-slate-400 py-6 mt-12 text-center text-xs space-y-1">
        <p className="font-bold text-slate-300">Project SALUTE — India Post, Dhemaji Sub Division (Lakhimpur Postal Division)</p>
      </footer>
    </div>
  );
}
