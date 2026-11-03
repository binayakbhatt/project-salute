export function generatePDFQuote(l, calcSa, calcTerm, metrics) {
  if (!window.jspdf) {
    alert('PDF library is loading. Please try again in 2 seconds.');
    return;
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.setFillColor(185, 28, 28);
  doc.rect(0, 0, 210, 30, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('INDIA POST - PROJECT SALUTE', 14, 12);
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Dhemaji Sub Division | Lakhimpur Postal Division, Assam Circle', 14, 19);
  doc.text('Financial Security for Those Who Serve and Care (100% Govt. of India Guarantee)', 14, 25);

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('OFFICIAL CUSTOMER BENEFIT, ROI & LOAN ELIGIBILITY QUOTE', 14, 39);

  doc.autoTable({
    startY: 43,
    head: [['Customer & Institution Profile', 'India Post Field Official & Office']],
    body: [
      [
        `Customer Name: ${l.name}\nWhatsApp: +91-${l.phone}\nSegment: ${l.segment}\nInstitution: ${l.dept}`,
        `Name of SPM/BPM/Official/ME: ${l.official}\nOffice Category: ${l.office_category}\nOffice Name: ${l.office}\nDate: ${l.date}`,
      ],
    ],
    theme: 'grid',
    headStyles: { fillColor: [185, 28, 28], textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 3.5 },
  });

  const saVal = l.sa || calcSa;
  const termVal = l.term || calcTerm;
  const mPrem = l.monthlyPremium || metrics.monthlyPremium;
  const matVal = l.maturity || metrics.totalMaturity;
  const multVal = l.multiplier || metrics.multiplier;
  const roiVal = l.roiPct || metrics.roiPct;
  const loanVal = l.loan3Yr || metrics.loanEligible3Yr;

  doc.autoTable({
    startY: doc.lastAutoTable.finalY + 6,
    head: [['Benefit Parameter', 'Projected Sovereign Value']],
    body: [
      ['Primary PLI / RPLI Scheme', `${l.product} (SA: ₹${Number(saVal ?? 0).toLocaleString('en-IN')} | Term: ${termVal} Yrs)`],
      ['Estimated Monthly Deposit', `₹${Number(mPrem ?? 0).toLocaleString('en-IN')} / month (Tax Rebate u/s 80C)`],
      ['Projected Total Maturity Payout', `₹${Number(matVal ?? 0).toLocaleString('en-IN')} (100% Tax-Free u/s 10(10D) - Zero TDS)`],
      ['Return on Investment (ROI) & Multiplier', `${multVal}x Total Premiums Multiplier (+${roiVal}% Net ROI)`],
      ['3-Year Loan Eligibility (90% Surrender Value)', `Approx. ₹${Number(loanVal ?? 0).toLocaleString('en-IN')} (Available after 3 continuous years)`],
      ['Secondary Cross-Sell Selected', `${l.crosssell} (https://binayakbhatt.github.io/sanchayer_sopno/)`],
    ],
    theme: 'striped',
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 3.5 },
  });

  let finalY = doc.lastAutoTable.finalY + 8;
  if (l.followup) {
    doc.setFillColor(254, 243, 199);
    doc.rect(14, finalY, 182, 10, 'F');
    doc.setTextColor(180, 83, 9);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text(`Scheduled Follow-Up Date: ${l.followup}`, 18, finalY + 6.5);
    finalY += 15;
  }

  if (l.remark) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(30, 41, 59);
    doc.text('Field Remark:', 14, finalY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(l.remark, 14, finalY + 5, { maxWidth: 180 });
  }

  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Issued under Project SALUTE | India Post — Dhemaji Sub Division (Lakhimpur Postal Division)', 14, 286);
  doc.save(`Project_SALUTE_Quote_${l.name.replace(/\s+/g, '_')}.pdf`);
}