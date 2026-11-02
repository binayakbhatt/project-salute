import React, { useState, useEffect } from 'react';
import { generatePDFQuote } from './utils/pdfGenerator';

const DEFAULT_D1_API_URL = 'https://project-salute-api.binayaksinbox.workers.dev';

const SCHEMES = {
  pli_santosh: { id: 'pli_santosh', name: 'PLI Santosh (Endowment Assurance)', quota: 'PLI', bonusPerThousand: 52 },
  pli_suraksha: { id: 'pli_suraksha', name: 'PLI Suraksha (Whole Life Assurance)', quota: 'PLI', bonusPerThousand: 76 },
  rpli_santosh: { id: 'rpli_santosh', name: 'RPLI Gram Santosh (Endowment)', quota: 'RPLI', bonusPerThousand: 48 },
  rpli_suraksha: { id: 'rpli_suraksha', name: 'RPLI Gram Suraksha (Whole Life)', quota: 'RPLI', bonusPerThousand: 60 },
};

function sanitizeText(str) {
  return String(str || '').replace(/[<>]/g, '').trim();
}

function calculateOfficialPLIMetrics(schemeKey, sumAssured, entryAge, termYears) {
  const scheme = SCHEMES[schemeKey] || SCHEMES.pli_santosh;
  const saUnits = sumAssured / 1000;
  const ageLoading = Math.max(0, entryAge - 25) * 0.42;
  const termFactor = (1000 / termYears) * 0.86;
  const quotaAdj = scheme.quota === 'RPLI' ? 2.1 : 0;
  const surakshaAdj = schemeKey.includes('suraksha') ? -3.4 : 0;

  const annualRatePer1000 = Math.max(18, termFactor + ageLoading + quotaAdj + surakshaAdj);
  const monthlyPremium = Math.round((saUnits * annualRatePer1000) / 12);
  const annualPremium = monthlyPremium * 12;
  const totalInvested = annualPremium * termYears;

  const annualBonus = saUnits * scheme.bonusPerThousand;
  const totalBonus = annualBonus * termYears;
  const terminalBonus = termYears >= 20 ? Math.min(1000, Math.round((sumAssured / 10000) * 20)) : 0;
  const totalMaturity = sumAssured + totalBonus + terminalBonus;
  const netProfit = totalMaturity - totalInvested;
  const multiplier = totalInvested > 0 ? (totalMaturity / totalInvested).toFixed(2) : '0.00';
  const roiPct = totalInvested > 0 ? Math.round((netProfit / totalInvested) * 100) : 0;

  const remTerm3Yr = Math.max(1, termYears - 3);
  const svFactor3Yr = Math.min(0.85, Math.max(0.32, 0.88 - remTerm3Yr * 0.024));
  const paidUp3Yr = sumAssured * (3 / termYears);
  const surrenderValue3Yr = Math.round(paidUp3Yr * svFactor3Yr);
  const loanEligible3Yr = Math.round(surrenderValue3Yr * 0.9);
  const premiumsPaid3Yr = annualPremium * 3;

  const remTerm5Yr = Math.max(1, termYears - 5);
  const svFactor5Yr = Math.min(0.88, Math.max(0.36, 0.90 - remTerm5Yr * 0.022));
  const paidUp5Yr = sumAssured * (5 / termYears);
  const vestedBonus5Yr = annualBonus * 5;
  const surrenderValue5Yr = Math.round((paidUp5Yr + vestedBonus5Yr) * svFactor5Yr);
  const loanEligible5Yr = Math.round(surrenderValue5Yr * 0.9);

  const earlySurrenderTdsApplicable = surrenderValue3Yr >= 100000 && surrenderValue3Yr > premiumsPaid3Yr;
  const earlySurrenderTdsAmt = earlySurrenderTdsApplicable ? Math.round((surrenderValue3Yr - premiumsPaid3Yr) * 0.05) : 0;

  return {
    scheme, monthlyPremium, annualPremium, totalInvested, annualBonus, totalBonus, terminalBonus,
    totalMaturity, netProfit, multiplier, roiPct, paidUp3Yr: Math.round(paidUp3Yr),
    svFactor3Yr: svFactor3Yr.toFixed(3), surrenderValue3Yr, loanEligible3Yr, premiumsPaid3Yr,
    surrenderValue5Yr, loanEligible5Yr, earlySurrenderTdsAmt
  };
}

export default function App() {
  const [activeTab, setActiveTab] = useState('calculator');
  const [leads, setLeads] = useState([]);
  const [d1ApiUrl, setD1ApiUrl] = useState(() => localStorage.getItem('salute_d1_url') || DEFAULT_D1_API_URL);
  const [d1Status, setD1Status] = useState('offline');
  const [showD1Modal, setShowD1Modal] = useState(false);

  const [calcScheme, setCalcScheme] = useState('pli_santosh');
  const [calcSa, setCalcSa] = useState(500000);
  const [calcAge, setCalcAge] = useState(30);
  const [calcTerm, setCalcTerm] = useState(20);
  const [xxMonthlyDeposit, setXxMonthlyDeposit] = useState(5000);

  const [tdsScheme, setTdsScheme] = useState('scss');
  const [tdsPrincipal, setTdsPrincipal] = useState(1000000);
  const [tdsStrategies, setTdsStrategies] = useState({ form15g: true, splitCif: true, divertPli: false });

  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState({
    name: '', phone: '', segment: 'Assam Police & Battalions', dept: '',
    qualification_route: 'PLI', product: 'PLI Santosh (Endowment)',
    crosssell: 'Xonchoyor Xopun (Monthly 1-Yr TD Ladder)', official: '',
    office_category: 'Sub Office (SO)', office: '', followup: '', remark: ''
  });

  const metrics = calculateOfficialPLIMetrics(calcScheme, calcSa, calcAge, calcTerm);
  const investedPct = Math.min(Math.max(Math.round((metrics.totalInvested / metrics.totalMaturity) * 100), 20), 80);

  useEffect(() => {
    try {
      const local = JSON.parse(localStorage.getItem('salute_leads')) || [];
      setLeads(local);
    } catch { setLeads([]); }
    if (d1ApiUrl) fetchLeadsFromD1(d1ApiUrl);
  }, []);

  const fetchLeadsFromD1 = async (baseUrl = d1ApiUrl) => {
    const cleanUrl = baseUrl.replace(/\/+$/, '');
    if (!cleanUrl) return;
    setD1Status('syncing');
    try {
      const res = await fetch(`${cleanUrl}/api/leads`);
      if (!res.ok) throw new Error('D1 fetch failed');
      const data = await res.json();
      const remoteList = Array.isArray(data) ? data : data.leads || [];
      const normalized = remoteList.map((r) => ({
        id: r.id, name: r.full_name || r.name || '', phone: r.whatsapp || r.phone || '',
        segment: r.segment || 'Assam Police', dept: r.institution || r.dept || '',
        qualification_route: r.qualification_route || 'PLI', product: r.primary_product || r.product || 'PLI Santosh (Endowment)',
        crosssell: r.secondary_product || r.crosssell || 'Xonchoyor Xopun', official: r.official_name || r.official || '',
        office_category: r.office_category || 'Sub Office (SO)', office: r.office_name || r.office || '',
        followup: r.follow_up_date || r.followup || '', remark: r.remarks || r.remark || '',
        date: r.created_at ? new Date(r.created_at).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN'),
      }));
      setLeads(normalized);
      localStorage.setItem('salute_leads', JSON.stringify(normalized));
      setD1Status('online');
    } catch { setD1Status('offline'); }
  };

  const pushLocalLeadsToD1 = async () => {
    const cleanUrl = d1ApiUrl.replace(/\/+$/, '');
    if (!cleanUrl) { setShowD1Modal(true); return; }
    setD1Status('syncing');
    try {
      for (const l of leads) {
        await fetch(`${cleanUrl}/api/leads`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: String(l.id), full_name: l.name, whatsapp: l.phone, segment: l.segment,
            institution: l.dept, qualification_route: l.qualification_route || 'PLI',
            primary_product: l.product, secondary_product: l.crosssell, official_name: l.official,
            office_category: l.office_category, office_name: l.office, follow_up_date: l.followup || '', remarks: l.remark || ''
          })
        });
      }
      await fetchLeadsFromD1(cleanUrl);
      alert('Synced with Cloudflare D1 database!');
    } catch { setD1Status('offline'); alert('Could not reach Cloudflare Worker URL.'); }
  };

  const handleSaveD1Url = (e) => {
    e.preventDefault();
    const cleaned = d1ApiUrl.trim().replace(/\/+$/, '');
    setD1ApiUrl(cleaned);
    localStorage.setItem('salute_d1_url', cleaned);
    setShowD1Modal(false);
    if (cleaned) fetchLeadsFromD1(cleaned);
  };

  const handleLeadSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    const cleanName = sanitizeText(formData.name);
    const cleanPhone = formData.phone.replace(/\D/g, '').slice(-10);
    const cleanDept = sanitizeText(formData.dept);
    const cleanOfficial = sanitizeText(formData.official);
    const cleanOffice = sanitizeText(formData.office);
    const cleanRemark = sanitizeText(formData.remark);

    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      setFormError('Please enter a valid 10-digit WhatsApp mobile number starting with 6-9.');
      return;
    }

    const newLead = {
      id: `SALUTE-${Date.now()}`, name: cleanName, phone: cleanPhone, segment: formData.segment,
      dept: cleanDept, qualification_route: formData.qualification_route, product: formData.product,
      crosssell: formData.crosssell, official: cleanOfficial, office_category: formData.office_category,
      office: cleanOffice, followup: formData.followup, remark: cleanRemark, sa: calcSa, age: calcAge,
      term: calcTerm, monthlyPremium: metrics.monthlyPremium, maturity: metrics.totalMaturity,
      multiplier: metrics.multiplier, roiPct: metrics.roiPct, loan3Yr: metrics.loanEligible3Yr,
      date: new Date().toLocaleDateString('en-IN')
    };

    const updated = [newLead, ...leads];
    setLeads(updated);
    localStorage.setItem('salute_leads', JSON.stringify(updated));

    if (d1ApiUrl) {
      const cleanUrl = d1ApiUrl.replace(/\/+$/, '');
      try {
        await fetch(`${cleanUrl}/api/leads`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: newLead.id, full_name: newLead.name, age: newLead.age, whatsapp: newLead.phone,
            segment: newLead.segment, institution: newLead.dept, qualification_route: newLead.qualification_route,
            primary_product: newLead.product, secondary_product: newLead.crosssell, sum_assured: newLead.sa,
            term_years: newLead.term, official_name: newLead.official, office_category: newLead.office_category,
            office_name: newLead.office, follow_up_date: newLead.followup, remarks: newLead.remark, created_at: new Date().toISOString()
          })
        });
        setD1Status('online');
      } catch { setD1Status('offline'); }
    }

    generatePDFQuote(newLead, calcSa, calcTerm, metrics);
    setFormData({ ...formData, name: '', phone: '', dept: '', followup: '', remark: '' });
    setActiveTab('crm');
  };

  const deleteLead = async (id) => {
    if (!window.confirm('Delete this lead record?')) return;
    const updated = leads.filter((l) => l.id !== id);
    setLeads(updated);
    localStorage.setItem('salute_leads', JSON.stringify(updated));
    if (d1ApiUrl) {
      const cleanUrl = d1ApiUrl.replace(/\/+$/, '');
      try { await fetch(`${cleanUrl}/api/leads/${encodeURIComponent(id)}`, { method: 'DELETE' }); } catch {}
    }
  };

  const exportCSV = () => {
    if (leads.length === 0) return alert('No leads to export.');
    let csv = 'ID,Name,WhatsApp,Segment,Institution,PrimaryProduct,SecondaryCrossSell,OfficialName,OfficeCategory,OfficeName,FollowUpDate,FieldRemark,Date\n';
    leads.forEach((l) => {
      csv += `"${l.id}","${l.name}","${l.phone}","${l.segment || ''}","${l.dept}","${l.product}","${l.crosssell}","${l.official}","${l.office_category || ''}","${l.office}","${l.followup || ''}","${l.remark || ''}","${l.date}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'Project_SALUTE_Leads.csv'; a.click();
  };

  const posbRates = { scss: 0.082, mis: 0.074, td5yr: 0.075, td1yr: 0.069 };
  const activePosbRate = posbRates[tdsScheme] || 0.082;
  const effectivePrincipal = tdsStrategies.divertPli ? tdsPrincipal * 0.7 : tdsPrincipal;
  const perCifPrincipal = tdsStrategies.splitCif ? effectivePrincipal / 2 : effectivePrincipal;
  const annualPosbInterest = Math.round(perCifPrincipal * activePosbRate);
  const tdsThreshold = tdsScheme === 'scss' ? 50000 : 40000;
  const rawTds = annualPosbInterest > tdsThreshold ? Math.round(annualPosbInterest * 0.1) : 0;
  const finalTds = tdsStrategies.form15g ? 0 : rawTds;

  const xxAnnualCommitted = xxMonthlyDeposit * 12;
  const xxMaturityPerSlip = Math.round(xxMonthlyDeposit * 1.0708);
  const xxTotalAnnualPayout = xxMaturityPerSlip * 12;

  return (
    <div className="bg-slate-50 text-slate-800 font-sans antialiased min-h-screen flex flex-col">
      <header className="bg-gradient-to-r from-red-800 via-red-700 to-amber-700 text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col md:flex-row justify-between items-center gap-3">
          <div className="flex items-center space-x-3">
            <div className="bg-white p-1.5 rounded-xl shadow-md flex items-center justify-center">
              <svg width="36" height="36" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
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

          <button onClick={() => setShowD1Modal(true)} className="text-xs bg-red-950/80 hover:bg-red-950 px-3 py-1.5 rounded-full border border-red-400/40 flex items-center space-x-2 cursor-pointer">
            <span className={`w-2 h-2 rounded-full ${d1Status === 'online' ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
            <span>{d1Status === 'online' ? 'Cloudflare D1 Live' : 'Configure Cloudflare D1'}</span>
          </button>
        </div>
      </header>

      <nav className="bg-white border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 flex overflow-x-auto space-x-5">
          {[
            { id: 'calculator', label: '1. Official PLI/RPLI ROI & 3-Yr Loan Calc' },
            { id: 'xonchoyor', label: '2. Xonchoyor Xopun (1-Yr TD Ladder) & POSB' },
            { id: 'capture', label: '3. Shift-Change Lead Capture & PDF Quote' },
            { id: 'crm', label: `4. Captured Leads CRM (${leads.length})` },
            { id: 'tds', label: '5. POSB & PLI TDS Reduction Planner' },
            { id: 'sop', label: '6. Competent Authority SOP' },
          ].map((t) => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} className={`py-3 px-1 border-b-2 font-bold text-xs md:text-sm whitespace-nowrap cursor-pointer ${activeTab === t.id ? 'border-red-700 text-red-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-6 flex-grow w-full space-y-6">
        {activeTab === 'calculator' && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-black text-slate-800 mb-1">Official PLI &amp; RPLI Wealth-Doubler, Live ROI &amp; 3-Year Loan Calculator</h2>
            <p className="text-xs text-slate-500 mb-5">Calibrated to official Department of Posts Sankalan tables (Santosh ₹52/₹1,000, Suraksha ₹76/₹1,000, RPLI ₹48–₹60/₹1,000)</p>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Select PLI / RPLI Quota &amp; Plan</label>
                  <select value={calcScheme} onChange={(e) => setCalcScheme(e.target.value)} className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-sm font-semibold">
                    <option value="pli_santosh">PLI Santosh (Endowment - ₹52 Bonus/1,000)</option>
                    <option value="pli_suraksha">PLI Suraksha (Whole Life - ₹76 Bonus/1,000)</option>
                    <option value="rpli_santosh">RPLI Gram Santosh (Endowment - ₹48 Bonus/1,000)</option>
                    <option value="rpli_suraksha">RPLI Gram Suraksha (Whole Life - ₹60 Bonus/1,000)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Sum Assured: ₹{calcSa.toLocaleString('en-IN')}</label>
                  <select value={calcSa} onChange={(e) => setCalcSa(Number(e.target.value))} className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-sm font-semibold">
                    <option value={100000}>₹1,00,000</option>
                    <option value={200000}>₹2,00,000</option>
                    <option value={500000}>₹5,00,000 (Standard Field Pitch)</option>
                    <option value={1000000}>₹10,00,000</option>
                    <option value={2000000}>₹20,00,000</option>
                    <option value={5000000}>₹50,00,000 (Max PLI)</option>
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
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-red-50 p-3.5 rounded-xl border border-red-200">
                    <span className="text-[11px] font-bold uppercase text-red-700">Est. Monthly Deposit</span>
                    <div className="text-xl font-black text-red-900 mt-1">₹{metrics.monthlyPremium.toLocaleString('en-IN')}</div>
                  </div>
                  <div className="bg-emerald-50 p-3.5 rounded-xl border border-emerald-200">
                    <span className="text-[11px] font-bold uppercase text-emerald-700">Total Maturity</span>
                    <div className="text-xl font-black text-emerald-900 mt-1">₹{metrics.totalMaturity.toLocaleString('en-IN')}</div>
                  </div>
                  <div className="bg-blue-50 p-3.5 rounded-xl border border-blue-200">
                    <span className="text-[11px] font-bold uppercase text-blue-700">Net Wealth Gain</span>
                    <div className="text-xl font-black text-blue-900 mt-1">₹{metrics.netProfit.toLocaleString('en-IN')}</div>
                  </div>
                  <div className="bg-purple-50 p-3.5 rounded-xl border border-purple-200">
                    <span className="text-[11px] font-bold uppercase text-purple-700">ROI &amp; Multiplier</span>
                    <div className="text-xl font-black text-purple-900 mt-1">{metrics.multiplier}x (+{metrics.roiPct}%)</div>
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 space-y-1">
                    <span className="text-xs font-black uppercase text-amber-900">3-Year Loan Eligibility (90% Surrender Value)</span>
                    <div className="text-2xl font-black text-amber-950">≈ ₹{metrics.loanEligible3Yr.toLocaleString('en-IN')}</div>
                    <p className="text-[11px] text-amber-800">
                      3-Yr Surrender Value: ₹{metrics.surrenderValue3Yr.toLocaleString('en-IN')} | 5-Yr Loan (with vested bonus): ≈ ₹{metrics.loanEligible5Yr.toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div className="bg-slate-900 text-white p-4 rounded-xl space-y-1">
                    <span className="text-xs font-black uppercase text-yellow-300">PLI / RPLI TDS Rule (Sec 194DA)</span>
                    <p className="text-[11px] text-slate-300">
                      Regular Maturity is 100% Tax-Free u/s 10(10D) (₹0 TDS). Premature surrender (under 5 yrs) ≥ ₹1L attracts 5% TDS on gain (Est: ₹{metrics.earlySurrenderTdsAmt.toLocaleString('en-IN')}). Policy Loan = ₹0 TDS.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'xonchoyor' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-red-950 text-white p-6 rounded-2xl shadow-lg">
              <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 pb-4 border-b border-white/10">
                <div>
                  <span className="text-[11px] bg-amber-400 text-slate-950 font-black px-2.5 py-0.5 rounded-full uppercase">
                    Custom Monthly 1-Year TD Laddering Scheme
                  </span>
                  <h2 className="text-2xl font-black mt-1">Xonchoyor Xopun — Monthly 1-Yr Time Deposit Ladder</h2>
                  <p className="text-xs text-slate-300 mt-1">
                    Open one 1-Year POTD every month for 12 months. From Month 13 onwards, receive a guaranteed maturity payout every single month!
                  </p>
                </div>
                <a href="https://binayakbhatt.github.io/sanchayer_sopno/" target="_blank" rel="noopener noreferrer" className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black px-5 py-3 rounded-xl text-xs whitespace-nowrap shadow-md text-center">
                  Open Xonchoyor Xopun Portal ↗
                </a>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-5">
                <div className="bg-white/10 p-4 rounded-xl">
                  <label className="block text-xs font-bold uppercase text-amber-300 mb-1">Monthly 1-Yr TD Deposit</label>
                  <select value={xxMonthlyDeposit} onChange={(e) => setXxMonthlyDeposit(Number(e.target.value))} className="w-full p-2 bg-slate-900 text-white border border-white/20 rounded-lg text-sm font-bold">
                    <option value={2000}>₹2,000 / month</option>
                    <option value={5000}>₹5,000 / month</option>
                    <option value={10000}>₹10,000 / month</option>
                    <option value={20000}>₹20,000 / month</option>
                  </select>
                </div>
                <div className="bg-white/10 p-4 rounded-xl">
                  <span className="text-xs text-slate-300 uppercase font-bold">12-Month Principal</span>
                  <div className="text-xl font-black mt-1">₹{xxAnnualCommitted.toLocaleString('en-IN')}</div>
                </div>
                <div className="bg-white/10 p-4 rounded-xl">
                  <span className="text-xs text-emerald-300 uppercase font-bold">Month 13+ Monthly Payout</span>
                  <div className="text-xl font-black text-emerald-400 mt-1">₹{xxMaturityPerSlip.toLocaleString('en-IN')} / mo</div>
                </div>
                <div className="bg-white/10 p-4 rounded-xl">
                  <span className="text-xs text-amber-300 uppercase font-bold">Total 12-Slip Maturity</span>
                  <div className="text-xl font-black text-amber-300 mt-1">₹{xxTotalAnnualPayout.toLocaleString('en-IN')}</div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h3 className="text-lg font-black text-slate-800 mb-4">Standalone India Post POSB Schemes (Separate from Xonchoyor Xopun)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                {[
                  { name: 'Sukanya Samriddhi Yojana (SSY)', rate: '8.2% p.a. (Tax-Free)', desc: 'Girl child (under 10 yrs) education & marriage. 100% Tax-Free.' },
                  { name: 'Senior Citizens Savings Scheme (SCSS)', rate: '8.2% p.a.', desc: 'Quarterly guaranteed pension flow for retiring personnel.' },
                  { name: 'Monthly Income Scheme (MIS)', rate: '7.4% p.a.', desc: 'Guaranteed monthly cashflow up to ₹9L (Single) / ₹15L (Joint).' },
                  { name: 'Public Provident Fund (PPF)', rate: '7.1% p.a. (EEE)', desc: '15-year tax-free compounding with zero TDS.' },
                  { name: 'National Savings Certificate (NSC)', rate: '7.7% p.a.', desc: '5-year sovereign tax-saving certificate u/s 80C.' },
                  { name: 'Kisan Vikas Patra (KVP) & 5-Yr RD', rate: '7.5% / 6.7%', desc: 'Doubles lump sum in 115 months (KVP) or monthly savings (RD).' },
                ].map((s, idx) => (
                  <div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[11px] font-extrabold text-red-700 uppercase">{s.rate}</span>
                    <h4 className="font-bold text-slate-900 text-sm mt-0.5">{s.name}</h4>
                    <p className="text-slate-600 mt-1">{s.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'capture' && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-xl font-black text-slate-800 mb-1">Shift-Change Lead Capture &amp; Direct Customer Benefit PDF Quote</h2>
            <p className="text-xs text-slate-500 mb-5">Captures Name of SPM/BPM/Officials/ME, Office Type (BO/SO/HO), and optional Follow-Up Date.</p>
            {formError && <div className="mb-4 p-3 bg-red-50 border border-red-300 text-red-800 text-xs font-bold rounded-xl">{formError}</div>}

            <form onSubmit={handleLeadSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Prospect Full Name *</label>
                <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">10-Digit WhatsApp Number *</label>
                <input type="tel" required maxLength={10} value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Target Segment *</label>
                <select value={formData.segment} onChange={(e) => setFormData({ ...formData, segment: e.target.value })} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm">
                  <option value="Assam Police & Battalions">Assam Police &amp; Battalions</option>
                  <option value="Assam Fire & Emergency Services">Assam Fire &amp; Emergency Services</option>
                  <option value="Healthcare Professionals">Healthcare Professionals</option>
                  <option value="Defence & CAPF">Defence &amp; CAPF</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Institution / Hospital / Station *</label>
                <input type="text" required value={formData.dept} onChange={(e) => setFormData({ ...formData, dept: e.target.value })} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Primary PLI / RPLI Plan *</label>
                <select value={formData.product} onChange={(e) => setFormData({ ...formData, product: e.target.value })} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm">
                  <option value="PLI Santosh (Endowment)">PLI Santosh (Endowment - ₹52 Bonus)</option>
                  <option value="PLI Suraksha (Whole Life)">PLI Suraksha (Whole Life - ₹76 Bonus)</option>
                  <option value="RPLI Gram Santosh (Endowment)">RPLI Gram Santosh (Endowment - ₹48 Bonus)</option>
                  <option value="RPLI Gram Suraksha (Whole Life)">RPLI Gram Suraksha (Whole Life - ₹60 Bonus)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Secondary Cross-Sell Scheme *</label>
                <select value={formData.crosssell} onChange={(e) => setFormData({ ...formData, crosssell: e.target.value })} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm">
                  <option value="Xonchoyor Xopun (Monthly 1-Yr TD Ladder)">Xonchoyor Xopun (Custom Monthly 1-Yr TD Ladder)</option>
                  <option value="Post Office Savings Account (SB)">Post Office Savings Account (SB)</option>
                  <option value="5-Year Recurring Deposit (RD)">5-Year Recurring Deposit (RD)</option>
                  <option value="Standalone Post Office Time Deposit (1,2,3,5 Yr)">Standalone Post Office Time Deposit (1, 2, 3, 5 Yr)</option>
                  <option value="Monthly Income Scheme (MIS)">Monthly Income Scheme (MIS)</option>
                  <option value="Senior Citizens Savings Scheme (SCSS)">Senior Citizens Savings Scheme (SCSS)</option>
                  <option value="Public Provident Fund (PPF)">Public Provident Fund (PPF)</option>
                  <option value="Sukanya Samriddhi Yojana (SSY)">Sukanya Samriddhi Yojana (SSY)</option>
                  <option value="National Savings Certificate (NSC)">National Savings Certificate (NSC)</option>
                  <option value="Kisan Vikas Patra (KVP)">Kisan Vikas Patra (KVP)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Name of SPM / BPM / Officials / ME *</label>
                <input type="text" required value={formData.official} onChange={(e) => setFormData({ ...formData, official: e.target.value })} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Office Category *</label>
                  <select value={formData.office_category} onChange={(e) => setFormData({ ...formData, office_category: e.target.value })} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm">
                    <option value="Branch Office (BO)">Branch Office (BO)</option>
                    <option value="Sub Office (SO)">Sub Office (SO)</option>
                    <option value="Head Office (HO)">Head Office (HO)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Office Name *</label>
                  <input type="text" required value={formData.office} onChange={(e) => setFormData({ ...formData, office: e.target.value })} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Follow-Up Date (Optional)</label>
                <input type="date" value={formData.followup} onChange={(e) => setFormData({ ...formData, followup: e.target.value })} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Field Remark</label>
                <input type="text" value={formData.remark} onChange={(e) => setFormData({ ...formData, remark: e.target.value })} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm" />
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
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex flex-col md:flex-row justify-between items-center mb-5 pb-3 border-b border-slate-100 gap-3">
              <h2 className="text-xl font-black text-slate-800">Captured Leads Register ({leads.length})</h2>
              <div className="flex gap-2">
                <button onClick={pushLocalLeadsToD1} className="bg-indigo-700 hover:bg-indigo-800 text-white px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer">
                  Sync with Cloudflare D1
                </button>
                <button onClick={exportCSV} className="bg-slate-800 hover:bg-slate-900 text-white px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer">
                  Export CSV
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 uppercase text-[11px] font-bold">
                    <th className="p-3">Customer</th>
                    <th className="p-3">Institution</th>
                    <th className="p-3">Schemes</th>
                    <th className="p-3">SPM/BPM/Official &amp; Office</th>
                    <th className="p-3">Follow-Up</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {leads.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50">
                      <td className="p-3 font-bold">{l.name}<div className="font-normal text-slate-500">+91-{l.phone}</div></td>
                      <td className="p-3">{l.dept}</td>
                      <td className="p-3"><span className="font-bold text-red-700">{l.product}</span><div className="text-slate-500">+ {l.crosssell}</div></td>
                      <td className="p-3 font-semibold">{l.official}<div className="font-normal text-slate-500">{l.office_category} - {l.office}</div></td>
                      <td className="p-3">{l.followup || '—'}</td>
                      <td className="p-3 text-right space-x-2">
                        <button onClick={() => generatePDFQuote(l, calcSa, calcTerm, metrics)} className="bg-red-700 text-white px-3 py-1.5 rounded-lg font-bold cursor-pointer">PDF Quote</button>
                        <button onClick={() => deleteLead(l.id)} className="bg-slate-200 text-slate-700 px-2.5 py-1.5 rounded-lg cursor-pointer">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {leads.length === 0 && <div className="text-center py-10 text-slate-400 text-sm">No leads captured yet.</div>}
            </div>
          </div>
        )}

        {activeTab === 'tds' && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-xl font-black text-slate-800 mb-1">POSB Section 194A &amp; PLI Section 194DA TDS Reduction Planner</h2>
            <p className="text-xs text-slate-500 mb-5">Demonstrate how customers can legally reduce their TDS deduction to ₹0.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Select POSB Scheme</label>
                  <select value={tdsScheme} onChange={(e) => setTdsScheme(e.target.value)} className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-sm">
                    <option value="scss">Senior Citizens Savings Scheme (SCSS - 8.2%)</option>
                    <option value="mis">Monthly Income Scheme (MIS - 7.4%)</option>
                    <option value="td5yr">5-Year Time Deposit (7.5%)</option>
                    <option value="td1yr">Xonchoyor Xopun / 1-Year TD (6.9%)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Principal Amount (₹)</label>
                  <input type="number" step="50000" value={tdsPrincipal} onChange={(e) => setTdsPrincipal(Number(e.target.value))} className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-sm" />
                </div>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-100 p-3.5 rounded-xl">
                    <span className="text-xs font-bold text-slate-600 uppercase">Annual Interest / CIF</span>
                    <div className="text-xl font-black mt-1">₹{annualPosbInterest.toLocaleString('en-IN')}</div>
                  </div>
                  <div className="bg-emerald-50 p-3.5 rounded-xl border border-emerald-200">
                    <span className="text-xs font-bold text-emerald-700 uppercase">Net TDS After Planner</span>
                    <div className="text-xl font-black text-emerald-900 mt-1">₹{finalTds.toLocaleString('en-IN')}</div>
                  </div>
                </div>
                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 space-y-2 text-xs">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="checkbox" checked={tdsStrategies.form15g} onChange={(e) => setTdsStrategies({ ...tdsStrategies, form15g: e.target.checked })} />
                    <span><strong>Submit Form 15G / 15H:</strong> Reduces TDS to ₹0 if total taxable income is below basic exemption limit.</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="checkbox" checked={tdsStrategies.splitCif} onChange={(e) => setTdsStrategies({ ...tdsStrategies, splitCif: e.target.checked })} />
                    <span><strong>Split Deposit Across Spouse CIF:</strong> Doubles the ₹40,000 / ₹50,000 Section 194A threshold.</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="checkbox" checked={tdsStrategies.divertPli} onChange={(e) => setTdsStrategies({ ...tdsStrategies, divertPli: e.target.checked })} />
                    <span><strong>Allocate 30% into Tax-Free PLI / PPF / SSY:</strong> 100% exempt u/s 10(10D) with ₹0 TDS.</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'sop' && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <h2 className="text-xl font-black text-slate-800">Competent Authority Approach SOP (Dhemaji Sub Division)</h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              <strong>1. Meeting the Competent Authority (SP / Commandant / Jt. DHS / Medical Superintendent):</strong> Frame the visit as an Official Central Government India Post Financial Welfare &amp; Service Camp under Project SALUTE. Request a non-intrusive 1-table Helpdesk during shift-change windows.
            </p>
            <p className="text-xs text-slate-600 leading-relaxed">
              <strong>2. Dual PLI + RPLI Funnel:</strong> Permanent Govt/Degree/Diploma staff qualify for PLI (₹52–₹76 bonus). Contractual/ANM/Support staff qualify for RPLI Gram Santosh (₹48–₹60 bonus). Cross-sell Xonchoyor Xopun 1-Year Monthly TD Ladder to every prospect.
            </p>
          </div>
        )}
      </main>

      {showD1Modal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleSaveD1Url} className="bg-white p-6 rounded-2xl max-w-md w-full space-y-4">
            <h3 className="text-lg font-black text-slate-900">Connect Cloudflare D1 Worker URL</h3>
            <p className="text-xs text-slate-500">Paste your Cloudflare Worker URL (e.g. https://project-salute-api.binayaksinbox.workers.dev)</p>
            <input type="url" value={d1ApiUrl} onChange={(e) => setD1ApiUrl(e.target.value)} placeholder="https://project-salute-api.binayaksinbox.workers.dev" className="w-full p-2.5 border border-slate-300 rounded-lg text-sm" />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowD1Modal(false)} className="px-4 py-2 text-xs font-bold text-slate-600">Cancel</button>
              <button type="submit" className="bg-red-700 text-white px-4 py-2 rounded-lg text-xs font-bold">Save &amp; Connect</button>
            </div>
          </form>
        </div>
      )}

      <footer className="bg-slate-900 text-slate-400 py-5 mt-10 text-center text-xs">
        Project SALUTE — India Post, Dhemaji Sub Division (Lakhimpur Postal Division)
      </footer>
    </div>
  );
}