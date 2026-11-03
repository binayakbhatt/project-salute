import React, { useState, useEffect } from 'react';
import { generatePDFQuote } from './utils/pdfGenerator';
import { PLI_SCHEMES, calculatePLIMetrics } from './utils/pliCalculator';

const XONCHOYOR_XOPUN_PORTAL = 'https://binayakbhatt.github.io/sanchayer_sopno/';

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

function fmt(val) {
  return Number(val ?? 0).toLocaleString('en-IN');
}

function sanitizeInput(str) {
  return String(str || '').replace(/[<>]/g, '').trim();
}

export default function App() {
  const [activeTab, setActiveTab] = useState('pitch');
  const [leads, setLeads] = useState([]);
  const [d1Url, setD1Url] = useState(() => localStorage.getItem('salute_d1_url') || 'https://project-salute-api.binayaksinbox.workers.dev');
  const [syncStatus, setSyncStatus] = useState('offline');
  const [toast, setToast] = useState(null);

  const [calcScheme, setCalcScheme] = useState('pli_santosh');
  const [calcSa, setCalcSa] = useState(500000);
  const [calcAge, setCalcAge] = useState(30);
  const [calcTerm, setCalcTerm] = useState(20);
  const [xxMonthly, setXxMonthly] = useState(5000);

  // TDS Planner State
  const [tdsCategory, setTdsCategory] = useState('posb'); // 'posb' | 'pli'
  const [posbScheme, setPosbScheme] = useState('scss');
  const [posbPrincipal, setPosbPrincipal] = useState(1000000);
  const [posbOpts, setPosbOpts] = useState({ form15g: true, splitCif: true, divertPli: false });

  const [pliSurrenderVal, setPliSurrenderVal] = useState(250000);
  const [pliTotalPremiumsPaid, setPliTotalPremiumsPaid] = useState(180000);
  const [pliPolicyAgeYears, setPliPolicyAgeYears] = useState(3); // <5 yrs vs >=5 yrs

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
      notify('Please configure your database URL.', 'error');
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

  // POSB TDS Math (Sec 194A)
  const posbRates = { scss: 0.082, mis: 0.074, td5yr: 0.075, td1yr: 0.069 };
  const posbRate = posbRates[posbScheme] || 0.082;
  const effectivePrincipal = posbOpts.divertPli ? posbPrincipal * 0.7 : posbPrincipal;
  const perCifPrincipal = posbOpts.splitCif ? effectivePrincipal / 2 : effectivePrincipal;
  const annualPosbInterest = Math.round(perCifPrincipal * posbRate);
  const posbThreshold = posbScheme === 'scss' ? 50000 : 40000;
  const rawPosbTds = annualPosbInterest > posbThreshold ? Math.round(annualPosbInterest * 0.1) : 0;
  const netPosbTds = posbOpts.form15g ? 0 : rawPosbTds;

  // PLI / RPLI TDS Math (Sec 194DA & Sec 10(10D))
  // Rule: Regular maturity or death claim is 100% Tax-Free (0 TDS u/s 10(10D)).
  // Early surrender before 5 years where payout >= ₹1,00,000 attracts 5% TDS on net gain (surrender value minus total premiums paid).
  const isPliEarlySurrender = Number(pliPolicyAgeYears) < 5;
  const pliNetGain = Math.max(0, Number(pliSurrenderVal) - Number(pliTotalPremiumsPaid));
  const pliTdsApplicable = isPliEarlySurrender && Number(pliSurrenderVal) >= 100000 && pliNetGain > 0;
  const calculatedPliTds = pliTdsApplicable ? Math.round(pliNetGain * 0.05) : 0;

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
              className="text-xs bg-red-950 hover:bg-red-900 px-4 py-1.5 rounded-full border border-red-400/40 flex items-center space-x-2 cursor-pointer transition font-bold"
            >
              <span className={`w-2 h-2 rounded-full ${syncStatus === 'online' ? 'bg-emerald-400' : 'bg-amber-400 animate-ping'}`}></span>
              <span>Sync</span>
            </button>
          </div>
        </div>
      </header>

      <nav className="bg-white border-b border-slate-200 shadow-xs sticky top-[62px] z-40">
        <div className="max-w-7xl mx-auto px-4 flex overflow-x-auto space-x-4">
          {[
            { id: 'pitch', label: '1. Campaign Pitch & Strategy' },
            { id: 'calculator', label: '2. PLI & RPLI Calculator' },
            { id: 'xonchoyor', label: '3. Xonchoyor Xopun & POSB' },
            { id: 'capture', label: '4. Lead Capture' },
            { id: 'crm', label: `5. Captured Leads CRM (${leads.length})` },
            { id: 'tds', label: '6. TDS Calculator' },
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
              <h2 className="text-2xl sm:text-3xl font-black">Project SALUTE: Campaign Strategy &amp; Customer Pitch Manual</h2>
              <p className="text-xs sm:text-sm text-red-100 max-w-4xl leading-relaxed">
                Comprehensive field operating manual for Branch Postmasters (BPM), Sub Postmasters (SPM), and Marketing Executives (ME) across Dhemaji Sub Division. Detailed below are the official scheme summaries, tailored pitching scripts for each uniformed and emergency service segment, and optimal cross-selling product pairings.
              </p>
            </div>

            {/* Elaborated Four Life-Stage Pillars */}
            <div className="space-y-3">
              <h3 className="text-base font-black text-slate-900">Four Core Sovereign Financial Pillars</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-2">
                  <div className="w-8 h-8 rounded-xl bg-red-100 text-red-700 flex items-center justify-center font-black text-xs">01</div>
                  <h4 className="font-black text-slate-900 text-sm">PROTECT</h4>
                  <span className="text-[10px] bg-red-50 text-red-700 font-bold px-2 py-0.5 rounded uppercase">PLI &amp; RPLI</span>
                  <p className="text-xs text-slate-600 leading-relaxed pt-1">
                    High-bonus Postal Life Insurance (PLI Santosh/Suraksha) and Rural PLI (Gram Santosh) offering up to ₹50 Lakh sovereign cover, high bonuses (₹52–₹76 per ₹1,000 SA), 3-year loan eligibility, and tax-free maturity under Sec 10(10D).
                  </p>
                </div>

                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-xs">02</div>
                  <h4 className="font-black text-slate-900 text-sm">SAVE</h4>
                  <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded uppercase">Xonchoyor Xopun &amp; TD</span>
                  <p className="text-xs text-slate-600 leading-relaxed pt-1">
                    Our custom <strong>Xonchoyor Xopun</strong> (Monthly 1-Year Time Deposit Ladder) and POSB schemes (SB, RD, 1–5 Yr TD) providing disciplined recurring savings and guaranteed monthly liquidity from Month 13 onwards (~7.08% effective yield).
                  </p>
                </div>

                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-xs">03</div>
                  <h4 className="font-black text-slate-900 text-sm">NURTURE</h4>
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded uppercase">Sukanya Samriddhi</span>
                  <p className="text-xs text-slate-600 leading-relaxed pt-1">
                    Empowering daughters of service personnel through <strong>Sukanya Samriddhi Yojana (SSY)</strong>, delivering top-tier sovereign interest (8.2% p.a.) with 100% tax-free EEE status for higher education and marriage security.
                  </p>
                </div>

                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-black text-xs">04</div>
                  <h4 className="font-black text-slate-900 text-sm">RETIRE</h4>
                  <span className="text-[10px] bg-amber-50 text-amber-800 font-bold px-2 py-0.5 rounded uppercase">SCSS &amp; MIS</span>
                  <p className="text-xs text-slate-600 leading-relaxed pt-1">
                    Post-retirement financial independence through <strong>Senior Citizens Savings Scheme (SCSS)</strong> (8.2% quarterly payout) and <strong>Monthly Income Scheme (MIS)</strong> (7.4% monthly pension) with Section 194A TDS optimization.
                  </p>
                </div>
              </div>
            </div>

            
            {/* Customer Segments, Pitching Strategy & Cross-Selling Matrix */}
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                <h3 className="text-base font-black text-slate-900">Customer Segments &amp; Cross-Selling Matrix</h3>
              </div>

              {/* Psychological Master Pitch Script */}
              <div className="bg-indigo-50 border border-indigo-200 p-5 rounded-2xl shadow-sm space-y-3">
                <div className="flex items-center gap-2">
                  <div className="bg-indigo-600 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs"><i className="fa-solid fa-lightbulb"></i></div>
                  <h4 className="font-black text-indigo-900 text-sm uppercase tracking-wide">The Psychological Master Pitch (Avoid "Insurance")</h4>
                </div>
                <p className="text-xs text-indigo-800 leading-relaxed font-medium">
                  <strong>Psychology Insight:</strong> Younger generations instantly reject the word "Insurance" as an expense. Pitch PLI as an <strong>exclusive, high-yield Government Investment Scheme</strong> with built-in sovereign protection.
                </p>
                <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-inner text-xs text-slate-700 italic leading-relaxed space-y-2">
                  <p>
                    "Sir/Madam, as a [Police Officer/Doctor/Nurse], you belong to a very specific, selected category. The Government of India runs a highly exclusive wealth-doubler scheme that was originally available <strong>only to Postal and Telecom employees</strong>. Because it is run directly by the Government without any private middlemen, it offers the <strong>highest guaranteed bonus in India (₹52–₹76 per thousand)</strong>."
                  </p>
                  <p>
                    "Recently, this exclusive scheme was extended to state and central emergency personnel like you. You invest monthly, and your capital is 100% sovereign-backed. The best part? After 3 years, if you need emergency cash, you get a <strong>direct loan against it at just 10% p.a.</strong> without breaking the investment. And as a complimentary government benefit, your family gets a <strong>sovereign death protection cover</strong> matching your target maturity amount from day one."
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                {/* Segment 1 */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-3 hover:shadow-md transition">
                  <div className="flex justify-between items-start">
                    <h4 className="font-black text-slate-900 text-sm">1. Assam Police &amp; Police Battalions</h4>
                    <span className="text-[10px] bg-red-100 text-red-800 font-bold px-2.5 py-0.5 rounded-full">High Priority</span>
                  </div>
                  <p className="text-xs text-slate-600"><strong>Locations:</strong> SP Office Dhemaji, Police Lines, Jonai, and Armed/IR/Commando Battalions.</p>
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2 text-xs">
                    <div><strong>Primary Product:</strong> PLI Santosh (Endowment Assurance) / Suraksha (Whole Life).</div>
                    <div><strong>Secondary Cross-Sell Product:</strong> Xonchoyor Xopun (Monthly 1-Yr TD Ladder) or Sukanya Samriddhi Yojana (SSY).</div>
                    <div className="text-indigo-800 bg-indigo-50/50 p-2 rounded border border-indigo-100"><strong>Field Strategy:</strong> Focus on exclusivity and the 3-year emergency loan. "It's an elite investment for uniform personnel, offering cash-liquidity when duty calls, plus guaranteed family protection."</div>
                  </div>
                </div>

                {/* Segment 2 */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-3 hover:shadow-md transition">
                  <div className="flex justify-between items-start">
                    <h4 className="font-black text-slate-900 text-sm">2. Fire &amp; Emergency Services</h4>
                    <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2.5 py-0.5 rounded-full">First Responders</span>
                  </div>
                  <p className="text-xs text-slate-600"><strong>Locations:</strong> Dhemaji Fire Station &amp; Silapathar Fire Station.</p>
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2 text-xs">
                    <div><strong>Primary Product:</strong> PLI Suraksha (Whole Life Assurance) for maximum risk cover.</div>
                    <div><strong>Secondary Cross-Sell Product:</strong> 5-Year Recurring Deposit (RD) or National Savings Certificate (NSC).</div>
                    <div className="text-indigo-800 bg-indigo-50/50 p-2 rounded border border-indigo-100"><strong>Field Strategy:</strong> Highlight risk-heavy duty. "A pure government savings fund that rewards your bravery with the highest sovereign bonus, securing your family's future tax-free."</div>
                  </div>
                </div>

                {/* Segment 3 */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-3 hover:shadow-md transition">
                  <div className="flex justify-between items-start">
                    <h4 className="font-black text-slate-900 text-sm">3. Healthcare Professionals</h4>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full">Medical Staff</span>
                  </div>
                  <p className="text-xs text-slate-600"><strong>Locations:</strong> Dhemaji Civil Hospital, Jt. DHS Office, Silapathar Model Hospital, CHCs &amp; PHCs.</p>
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2 text-xs">
                    <div><strong>Primary Product:</strong> PLI Santosh (High Sum Assured up to ₹50 Lakhs).</div>
                    <div><strong>Secondary Cross-Sell Product:</strong> Post Office Monthly Income Scheme (MIS) or Public Provident Fund (PPF).</div>
                    <div className="text-indigo-800 bg-indigo-50/50 p-2 rounded border border-indigo-100"><strong>Field Strategy:</strong> Focus on tax planning. "Doctors and nurses pay high taxes. This exclusive govt scheme gives 80C deductions upfront and 100% tax-free maturity under 10(10D), unlike bank FDs."</div>
                  </div>
                </div>

                {/* Segment 4 */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-3 hover:shadow-md transition">
                  <div className="flex justify-between items-start">
                    <h4 className="font-black text-slate-900 text-sm">4. Defence &amp; CAPF Units</h4>
                    <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2.5 py-0.5 rounded-full">Central Forces</span>
                  </div>
                  <p className="text-xs text-slate-600"><strong>Locations:</strong> Army, CRPF, and Assam Rifles deployments across Dhemaji and Jonai sub-division.</p>
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2 text-xs">
                    <div><strong>Primary Product:</strong> RPLI Gram Santosh / PLI Suraksha.</div>
                    <div><strong>Secondary Cross-Sell Product:</strong> Kisan Vikas Patra (KVP) or Senior Citizens Savings Scheme (SCSS) for parents.</div>
                    <div className="text-indigo-800 bg-indigo-50/50 p-2 rounded border border-indigo-100"><strong>Field Strategy:</strong> Stress mobility & security. "Your postings change, but India Post is everywhere. It's an elite central govt wealth-doubler immune to stock market crashes."</div>
                  </div>
                </div>
              </div>
            </div>
</div>
          </div>
        )}

        {activeTab === 'calculator' && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-5">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-2 pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-black text-slate-800">Official India Post PLI &amp; RPLI Calculator</h2>
                <p className="text-xs text-slate-500">Includes all official schemes: Suraksha, Santosh, Suvidha, Sumangal, Yugal Suraksha, Children Policy, and RPLI variants.</p>
              </div>
              <a href="https://www.indiapost.gov.in/insurance-services/pli" target="_blank" rel="noopener noreferrer" className="text-xs bg-red-50 text-red-700 font-bold px-3 py-1.5 rounded-lg border border-red-200 hover:bg-red-100 transition">
                India Post Official PLI Portal ↗
              </a>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Select Scheme</label>
                  <select value={calcScheme} onChange={(e) => setCalcScheme(e.target.value)} className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-sm font-semibold">
                    <optgroup label="Postal Life Insurance (PLI)">
                      {Object.entries(PLI_SCHEMES).filter(([k]) => k.startsWith('pli_')).map(([k, s]) => (
                        <option key={k} value={k}>{s.name} (Bonus ₹{s.bonusPerThousand}/1K)</option>
                      ))}
                    </optgroup>
                    <optgroup label="Rural Postal Life Insurance (RPLI)">
                      {Object.entries(PLI_SCHEMES).filter(([k]) => k.startsWith('rpli_')).map(([k, s]) => (
                        <option key={k} value={k}>{s.name} (Bonus ₹{s.bonusPerThousand}/1K)</option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    Sum Assured (₹): <span className="text-red-700 font-black">₹{fmt(calcSa)}</span>
                  </label>
                  <input
                    type="number"
                    step="50000"
                    min={PLI_SCHEMES[calcScheme].minSa}
                    max={PLI_SCHEMES[calcScheme].maxSa}
                    value={calcSa}
                    onChange={(e) => setCalcSa(Math.max(PLI_SCHEMES[calcScheme].minSa, Math.min(PLI_SCHEMES[calcScheme].maxSa, Number(e.target.value) || 0)))}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-sm font-black text-red-800"
                    placeholder="Enter Sum Assured"
                  />
                  <div className="flex gap-1.5 mt-2 flex-wrap">
                    {[100000, 300000, 500000, 1000000, 2000000, 5000000].map((amt) => (
                      amt <= PLI_SCHEMES[calcScheme].maxSa && amt >= PLI_SCHEMES[calcScheme].minSa && (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setCalcSa(amt)}
                          className={`text-[10px] px-2 py-1 rounded font-bold transition ${calcSa === amt ? 'bg-red-700 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}
                        >
                          ₹{amt >= 100000 ? `${amt / 100000}L` : `${amt / 1000}K`}
                        </button>
                      )
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Entry Age: <span className="text-red-700 font-black">{calcAge} Years</span></label>
                  <input type="range" min={PLI_SCHEMES[calcScheme].minAge} max={PLI_SCHEMES[calcScheme].maxAge} value={calcAge} onChange={(e) => setCalcAge(Number(e.target.value))} className="w-full accent-red-700 cursor-pointer" />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Policy Term: <span className="text-red-700 font-black">{calcTerm} Years</span> (Matures at Age {metrics.maturityAge})</label>
                  <input type="range" min="5" max="35" value={calcTerm} onChange={(e) => setCalcTerm(Number(e.target.value))} className="w-full accent-red-700 cursor-pointer" />
                </div>
              </div>

              <div className="lg:col-span-2 space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="bg-red-50 p-3.5 rounded-xl border border-red-200">
                    <span className="font-bold text-red-700 uppercase block">Est. Monthly Deposit</span>
                    <div className="text-xl font-black text-red-900 mt-1">₹{fmt(metrics.monthlyPremium)}</div>
                  </div>
                  <div className="bg-emerald-50 p-3.5 rounded-xl border border-emerald-200">
                    <span className="font-bold text-emerald-700 uppercase block">Total Maturity</span>
                    <div className="text-xl font-black text-emerald-900 mt-1">₹{fmt(metrics.totalMaturity)}</div>
                  </div>
                  <div className="bg-blue-50 p-3.5 rounded-xl border border-blue-200">
                    <span className="font-bold text-blue-700 uppercase block">Net Profit</span>
                    <div className="text-xl font-black text-blue-900 mt-1">₹{fmt(metrics.netProfit)}</div>
                  </div>
                  <div className="bg-purple-50 p-3.5 rounded-xl border border-purple-200">
                    <span className="font-bold text-purple-700 uppercase block">Multiplier</span>
                    <div className="text-xl font-black text-purple-900 mt-1">{metrics.multiplier}x</div>
                  </div>
                </div>

                <div className="bg-slate-100 p-3.5 rounded-xl border border-slate-200">
                  <div className="flex justify-between text-xs font-bold text-slate-700 mb-1.5">
                    <span>Total Invested: ₹{fmt(metrics.totalInvested)}</span>
                    <span className="text-emerald-700">Maturity: ₹{fmt(metrics.totalMaturity)}</span>
                  </div>
                  <div className="w-full bg-slate-300 h-3 rounded-full overflow-hidden flex">
                    <div className="bg-slate-600 h-full" style={{ width: `${investedPct}%` }}></div>
                    <div className="bg-emerald-600 h-full" style={{ width: `${100 - investedPct}%` }}></div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 space-y-1.5">
                    <span className="font-black uppercase text-amber-950 block text-sm">3-Year &amp; 5-Year Loan Eligibility</span>
                    <div className="text-xl font-black text-amber-900">
                      3-Yr Loan: ₹{fmt(metrics.loanEligible3Yr)}
                    </div>
                    <p className="text-[11px] text-amber-800">
                      • 3-Yr Surrender Value: ₹{fmt(metrics.surrenderValue3Yr)} (90% loan = ₹{fmt(metrics.loanEligible3Yr)})<br />
                      • 5-Yr Loan (with bonus): <strong>₹{fmt(metrics.loanEligible5Yr)}</strong>
                    </p>
                  </div>
                  <div className="bg-slate-900 text-white p-4 rounded-xl space-y-1.5">
                    <span className="font-black uppercase text-yellow-300 block">PLI / RPLI TDS Rule (Sec 194DA)</span>
                    <p className="text-[11px] text-slate-300">
                      Regular Maturity = 100% Tax-Free u/s 10(10D) (₹0 TDS). Early surrender (&lt;5 yrs) &ge; ₹1L has 5% TDS on gain (Est: ₹{fmt(metrics.surrenderTds)}). Taking a 90% Policy Loan = <strong>₹0 TDS</strong>!
                    </p>
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
                  <div className="text-xl font-black text-emerald-400 mt-1">₹{fmt(xxMonthlyPayout)} / mo</div>
                </div>
                <div className="bg-white/10 p-3.5 rounded-xl border border-white/10">
                  <span className="text-slate-300 font-bold uppercase block">Total Annual Payout</span>
                  <div className="text-xl font-black text-amber-300 mt-1">₹{fmt(xxTotalAnnual)} / yr</div>
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
                  {Object.values(PLI_SCHEMES).map((s) => (
                    <option key={s.id} value={`${s.category} ${s.name}`}>{s.category} {s.name}</option>
                  ))}
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
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-5">
            <h2 className="text-xl font-black text-slate-800">TDS Calculator (POSB Sec 194A &amp; PLI/RPLI Sec 194DA)</h2>
            <p className="text-xs text-slate-500">Calculate tax deducted at source (TDS) for POSB savings interest and PLI/RPLI surrender payouts in accordance with Income Tax rules.</p>

            {/* Sub-toggle between POSB TDS and PLI TDS */}
            <div className="flex space-x-2 border-b border-slate-200 pb-3">
              <button
                onClick={() => setTdsCategory('posb')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${tdsCategory === 'posb' ? 'bg-red-700 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
              >
                POSB Interest TDS (Sec 194A)
              </button>
              <button
                onClick={() => setTdsCategory('pli')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${tdsCategory === 'pli' ? 'bg-red-700 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
              >
                PLI / RPLI Surrender TDS (Sec 194DA)
              </button>
            </div>

            {tdsCategory === 'posb' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                  <div>
                    <label className="block font-bold uppercase text-slate-700 mb-1">Select POSB Scheme</label>
                    <select value={posbScheme} onChange={(e) => setPosbScheme(e.target.value)} className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-sm">
                      <option value="scss">Senior Citizens Savings Scheme (SCSS - 8.2%)</option>
                      <option value="mis">Monthly Income Scheme (MIS - 7.4%)</option>
                      <option value="td5yr">5-Year Time Deposit (7.5%)</option>
                      <option value="td1yr">Xonchoyor Xopun / 1-Year TD (6.9%)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold uppercase text-slate-700 mb-1">Principal Amount (₹)</label>
                    <input type="number" step="50000" value={posbPrincipal} onChange={(e) => setPosbPrincipal(Number(e.target.value))} className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-sm" />
                  </div>
                  <div className="space-y-2 pt-2 border-t border-slate-200">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input type="checkbox" checked={posbOpts.form15g} onChange={(e) => setPosbOpts({ ...posbOpts, form15g: e.target.checked })} />
                      <span><strong>Submit Form 15G / 15H:</strong> Reduces TDS to ₹0 if total income is below taxable limit.</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input type="checkbox" checked={posbOpts.splitCif} onChange={(e) => setPosbOpts({ ...posbOpts, splitCif: e.target.checked })} />
                      <span><strong>Split Deposit Across Spouse CIF:</strong> Doubles the ₹40,000 / ₹50,000 Sec 194A threshold.</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input type="checkbox" checked={posbOpts.divertPli} onChange={(e) => setPosbOpts({ ...posbOpts, divertPli: e.target.checked })} />
                      <span><strong>Divert 30% into Tax-Free PLI / PPF:</strong> Lowers taxable POSB interest base.</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-100 p-4 rounded-xl">
                      <span className="font-bold text-slate-600 uppercase block">Annual Interest</span>
                      <div className="text-xl font-black mt-1">₹{fmt(annualPosbInterest)}</div>
                    </div>
                    <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200">
                      <span className="font-bold text-emerald-700 uppercase block">Net POSB TDS</span>
                      <div className="text-xl font-black text-emerald-900 mt-1">₹{fmt(netPosbTds)}</div>
                    </div>
                  </div>
                  <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 text-amber-900 space-y-1">
                    <strong>Section 194A Rule Summary:</strong> TDS threshold is ₹50,000 for senior citizens (SCSS) and ₹40,000 for others. If interest exceeds threshold and Form 15G/15H is not submitted, 10% TDS is deducted.
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                  <div>
                    <label className="block font-bold uppercase text-slate-700 mb-1">Policy Duration (Years Active)</label>
                    <select value={pliPolicyAgeYears} onChange={(e) => setPliPolicyAgeYears(Number(e.target.value))} className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-sm">
                      <option value={1}>1 Year (Early Surrender)</option>
                      <option value={2}>2 Years (Early Surrender)</option>
                      <option value={3}>3 Years (Early Surrender)</option>
                      <option value={4}>4 Years (Early Surrender)</option>
                      <option value={5}>5+ Years (Tax-Free Surrender)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold uppercase text-slate-700 mb-1">Total Surrender Payout Value (₹)</label>
                    <input type="number" step="25000" value={pliSurrenderVal} onChange={(e) => setPliSurrenderVal(Number(e.target.value))} className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block font-bold uppercase text-slate-700 mb-1">Total Premiums Paid (₹)</label>
                    <input type="number" step="25000" value={pliTotalPremiumsPaid} onChange={(e) => setPliTotalPremiumsPaid(Number(e.target.value))} className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-sm" />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-100 p-4 rounded-xl">
                      <span className="font-bold text-slate-600 uppercase block">Net Surrender Gain</span>
                      <div className="text-xl font-black mt-1">₹{fmt(pliNetGain)}</div>
                    </div>
                    <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200">
                      <span className="font-bold text-emerald-700 uppercase block">Calculated PLI TDS</span>
                      <div className="text-xl font-black text-emerald-900 mt-1">₹{fmt(calculatedPliTds)}</div>
                    </div>
                  </div>
                  <div className="bg-slate-900 text-white p-4 rounded-xl space-y-1.5">
                    <strong className="text-yellow-300">Section 194DA &amp; Sec 10(10D) Rule:</strong>
                    <ul className="text-[11px] text-slate-300 space-y-1 list-disc pl-4">
                      <li><strong>Regular Maturity / Death Claim:</strong> 100% exempt under Sec 10(10D) — <strong>₹0 TDS</strong>.</li>
                      <li><strong>Early Surrender (&lt;5 Years):</strong> If payout is &ge; ₹1,00,000 and surrender value exceeds total premiums paid, 5% TDS applies on net gain.</li>
                      <li><strong>Pro Tip:</strong> Taking a 90% Policy Loan instead of surrendering avoids premature termination and attracts <strong>₹0 TDS</strong>.</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
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

      <footer className="bg-slate-900 text-slate-400 py-6 mt-12 text-center text-xs space-y-1">
        <p className="font-bold text-slate-300">Project SALUTE — India Post, Dhemaji Sub Division (Lakhimpur Postal Division)</p>
      </footer>
    </div>
  );
}
