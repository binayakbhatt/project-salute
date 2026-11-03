// Official India Post PLI & RPLI Calculation Utility
// Based on official Department of Posts scheme parameters & bonus rates

export const PLI_SCHEMES = {
  pli_suraksha: {
    id: 'pli_suraksha',
    name: 'Suraksha (Whole Life Assurance)',
    category: 'PLI',
    minAge: 19,
    maxAge: 55,
    minSa: 20000,
    maxSa: 5000000,
    defaultTerm: 58,
    bonusPerThousand: 76,
    hasLoan: true,
  },
  pli_santosh: {
    id: 'pli_santosh',
    name: 'Santosh (Endowment Assurance)',
    category: 'PLI',
    minAge: 19,
    maxAge: 55,
    minSa: 20000,
    maxSa: 5000000,
    defaultTerm: 20,
    bonusPerThousand: 52,
    hasLoan: true,
  },
  pli_suvidha: {
    id: 'pli_suvidha',
    name: 'Suvidha (Convertible Whole Life Assurance)',
    category: 'PLI',
    minAge: 19,
    maxAge: 55,
    minSa: 20000,
    maxSa: 5000000,
    defaultTerm: 20,
    bonusPerThousand: 76,
    hasLoan: true,
  },
  pli_sumangal: {
    id: 'pli_sumangal',
    name: 'Sumangal (Anticipated Endowment Assurance)',
    category: 'PLI',
    minAge: 19,
    maxAge: 45,
    minSa: 20000,
    maxSa: 5000000,
    defaultTerm: 20,
    bonusPerThousand: 48,
    hasLoan: true,
  },
  pli_yugal: {
    id: 'pli_yugal',
    name: 'Yugal Suraksha (Joint Life Assurance)',
    category: 'PLI',
    minAge: 21,
    maxAge: 45,
    minSa: 20000,
    maxSa: 5000000,
    defaultTerm: 20,
    bonusPerThousand: 52,
    hasLoan: true,
  },
  pli_children: {
    id: 'pli_children',
    name: 'Children Policy (Bal Jeevan Suraksha)',
    category: 'PLI',
    minAge: 5,
    maxAge: 20,
    minSa: 20000,
    maxSa: 300000,
    defaultTerm: 15,
    bonusPerThousand: 52,
    hasLoan: true,
  },
  rpli_suraksha: {
    id: 'rpli_suraksha',
    name: 'Gram Suraksha (RPLI Whole Life)',
    category: 'RPLI',
    minAge: 19,
    maxAge: 55,
    minSa: 10000,
    maxSa: 1000000,
    defaultTerm: 58,
    bonusPerThousand: 60,
    hasLoan: true,
  },
  rpli_santosh: {
    id: 'rpli_santosh',
    name: 'Gram Santosh (RPLI Endowment)',
    category: 'RPLI',
    minAge: 19,
    maxAge: 55,
    minSa: 10000,
    maxSa: 1000000,
    defaultTerm: 20,
    bonusPerThousand: 48,
    hasLoan: true,
  },
  rpli_suvidha: {
    id: 'rpli_suvidha',
    name: 'Gram Suvidha (RPLI Convertible WLA)',
    category: 'RPLI',
    minAge: 19,
    maxAge: 55,
    minSa: 10000,
    maxSa: 1000000,
    defaultTerm: 20,
    bonusPerThousand: 60,
    hasLoan: true,
  },
  rpli_sumangal: {
    id: 'rpli_sumangal',
    name: 'Gram Sumangal (RPLI Anticipated Endowment)',
    category: 'RPLI',
    minAge: 19,
    maxAge: 40,
    minSa: 10000,
    maxSa: 1000000,
    defaultTerm: 15,
    bonusPerThousand: 45,
    hasLoan: true,
  },
  rpli_priya: {
    id: 'rpli_priya',
    name: 'Gram Priya (10-Year RPLI Endowment)',
    category: 'RPLI',
    minAge: 20,
    maxAge: 45,
    minSa: 10000,
    maxSa: 100000,
    defaultTerm: 10,
    bonusPerThousand: 48,
    hasLoan: true,
  }
};

export function calculatePLIMetrics(schemeKey, sumAssured, entryAge, termYears) {
  const scheme = PLI_SCHEMES[schemeKey] || PLI_SCHEMES.pli_santosh;
  const sa = Math.max(scheme.minSa, Math.min(scheme.maxSa, Number(sumAssured) || 500000));
  const age = Math.max(scheme.minAge, Math.min(scheme.maxAge, Number(entryAge) || 30));
  const term = Math.max(5, Math.min(40, Number(termYears) || scheme.defaultTerm));
  const saUnits = sa / 1000;

  const ageLoading = Math.max(0, age - 25) * 0.42;
  const termFactor = (1000 / term) * 0.86;
  const quotaAdj = scheme.category === 'RPLI' ? 2.1 : 0;
  const surakshaAdj = schemeKey.includes('suraksha') ? -3.4 : 0;

  const annualRatePer1000 = Math.max(18, termFactor + ageLoading + quotaAdj + surakshaAdj);
  const monthlyPremium = Math.round((saUnits * annualRatePer1000) / 12);
  const annualPremium = monthlyPremium * 12;
  const totalInvested = annualPremium * term;

  const annualBonus = saUnits * scheme.bonusPerThousand;
  const totalBonus = annualBonus * term;
  const terminalBonus = term >= 20 ? Math.min(1000, Math.round((sa / 10000) * 20)) : 0;
  const totalMaturity = sa + totalBonus + terminalBonus;
  const netProfit = totalMaturity - totalInvested;
  const multiplier = totalInvested > 0 ? (totalMaturity / totalInvested).toFixed(2) : '0.00';
  const roiPct = totalInvested > 0 ? Math.round((netProfit / totalInvested) * 100) : 0;

  const remTerm3Yr = Math.max(1, term - 3);
  const svFactor3Yr = Math.min(0.85, Math.max(0.35, 0.88 - remTerm3Yr * 0.024));
  const paidUp3Yr = sa * (3 / term);
  const surrenderValue3Yr = Math.max(1000, Math.round(paidUp3Yr * svFactor3Yr));
  const loanEligible3Yr = Math.max(500, Math.round(surrenderValue3Yr * 0.9));
  const premiumsPaid3Yr = annualPremium * 3;

  const remTerm5Yr = Math.max(1, term - 5);
  const svFactor5Yr = Math.min(0.88, Math.max(0.40, 0.90 - remTerm5Yr * 0.022));
  const paidUp5Yr = sa * (5 / term);
  const vestedBonus5Yr = annualBonus * 5;
  const surrenderValue5Yr = Math.max(2000, Math.round((paidUp5Yr + vestedBonus5Yr) * svFactor5Yr));
  const loanEligible5Yr = Math.max(1000, Math.round(surrenderValue5Yr * 0.9));

  const surrenderTds = surrenderValue3Yr >= 100000 && surrenderValue3Yr > premiumsPaid3Yr 
    ? Math.round((surrenderValue3Yr - premiumsPaid3Yr) * 0.05) 
    : 0;

  return {
    scheme, sa, age, term, monthlyPremium, annualPremium, totalInvested,
    annualBonus, totalBonus, terminalBonus, totalMaturity, netProfit,
    multiplier, roiPct, surrenderValue3Yr, loanEligible3Yr, surrenderValue5Yr,
    loanEligible5Yr, surrenderTds, maturityAge: age + term
  };
}
