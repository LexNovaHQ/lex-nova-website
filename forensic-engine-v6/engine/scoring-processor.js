/**
 * LEX NOVA HQ — FORENSIC ENGINE v6.0
 * /engine/scoring-processor.js - The Actuary
 * * THE SUPREME COMMAND: This module calculates the exact financial exposure,
 * applies the conversion multipliers, and merges the dual-intelligence payloads.
 */

// ============================================================================
// 1. CONSTANTS & MULTIPLIERS (The Wallet-Opener Math)
// ============================================================================

// The Statutory Base Floor (Minimum exposure for tripping a surface)
const EXT_BASE_VALUES = {
    "EXT.01": 20000000, // GDPR: €20M / $20M+ equivalent
    "EXT.02": 7988000,  // CCPA: High user base multiplier
    "EXT.03": 15000000, // Copyright (Willful infringement x scale)
    "EXT.04": 5000000,  // BIPA / Biometrics
    "EXT.05": 10000000, // FTC / Consumer Protection
    "EXT.06": 20000000, // COPPA
    "EXT.07": 5000000,  // ADMT / AI Decisions
    "EXT.08": 2500000,  // B2C General
    "EXT.09": 10000000, // B2B Enterprise Breach
    "EXT.10": 15000000  // AI Content / No IP protection
};

// The Actuarial Conversion Multipliers
const MULTIPLIERS = {
    GROSS_NEGLIGENCE: 1.5,  // Willful/Dangerous admission
    DUAL_VERIFIED: 1.2,     // Irrefutable evidence (Public + Internal)
    DISCOVERY_PREMIUM: 1.25 // unsureFlag = true (They don't know their own stack)
};

// ============================================================================
// 2. THE DUAL-INTELLIGENCE MERGE
// ============================================================================

function mergeIntelligence(prospectData, quizGaps) {
    console.log("> ACTUARY: Initiating Dual-Intelligence Merge...");
    const mergedList = [];
    const seenIds = new Set();
    
    // Safety check if prospectData is empty
    const forensicGaps = prospectData?.forensicGaps || [];

    // 1. Process Quiz Gaps first (The Confessions)
    quizGaps.forEach(qGap => {
        const threatId = qGap.threatId || qGap.id;
        let finalGap = { ...qGap, source: 'scanner' };
        
        // Cross-reference with the scrape
        const forensicMatch = forensicGaps.find(fg => (fg.threatId === threatId) || (fg.id === threatId));
        
        if (forensicMatch) {
            // DUAL-VERIFIED HIT
            finalGap.source = 'dual-verified';
            // Inherit the scraped evidence block
            finalGap.evidence = forensicMatch.evidence;
            // Upgrade severity if scrape found something worse than they confessed to
            const w = { 'NUCLEAR': 3, 'CRITICAL': 2, 'HIGH': 1 };
            if ((w[forensicMatch.severity?.toUpperCase()] || 0) > (w[finalGap.severity?.toUpperCase()] || 0)) {
                finalGap.severity = forensicMatch.severity;
            }
        }
        
        mergedList.push(finalGap);
        seenIds.add(threatId);
    });

    // 2. Process remaining Forensic Gaps (Scrape only)
    forensicGaps.forEach(fGap => {
        const threatId = fGap.threatId || fGap.id;
        if (!seenIds.has(threatId)) {
            mergedList.push({ ...fGap, source: 'scrape' });
            seenIds.add(threatId);
        }
    });

    return mergedList;
}

// ============================================================================
// 3. THE RUTHLESS SORTING ALGORITHM
// ============================================================================

function sortBySeverityAndVerification(a, b) {
    // 1. Primary Sort: Severity (T1 > T2 > T3)
    const sevW = { 'NUCLEAR': 3, 'CRITICAL': 2, 'HIGH': 1 };
    const sevA = sevW[a.severity?.toUpperCase()] || 0;
    const sevB = sevW[b.severity?.toUpperCase()] || 0;
    if (sevA !== sevB) return sevB - sevA;

    // 2. Secondary Sort: Verification (Dual-Verified > Scrape > Scanner)
    const srcW = { 'dual-verified': 3, 'scrape': 2, 'scanner': 1 };
    const srcA = srcW[a.source] || 0;
    const srcB = srcW[b.source] || 0;
    return srcB - srcA;
}

// Map the old severity labels to the new psychological T-Tiers
function mapToTier(severity) {
    const s = (severity || '').toUpperCase();
    if (s === 'NUCLEAR') return 'T1';
    if (s === 'CRITICAL') return 'T2';
    if (s === 'HIGH') return 'T3';
    return 'T3'; // Fallback
}

// ============================================================================
// 4. THE FINANCIAL ACTUARY (Calculating the Pain)
// ============================================================================

function calculateFinancialExposure(mergedGaps, unsureFlag) {
    console.log("> ACTUARY: Processing confessions and building financial model...");
    
    let totalExposure = 0;
    let hasPersonalLiability = false;
    let hasCriminalLiability = false;
    const receiptLines = [];

    // Track which base statutes we've already charged them for 
    // (We don't double charge the $20M GDPR fine if they have two EU gaps)
    const chargedExts = new Set();

    mergedGaps.forEach(gap => {
    // 1. Determine Base Value from their jurisdictional surface (UNIVERSAL KEY FIX)
        let baseValue = 0;
        let extSource = "General Architecture Deficit";
        let extsToProcess = [];

        // Safely extract statutes from either the Quiz (ext string) or the Scrape (extSurfaces array)
        if (gap.ext && typeof gap.ext === 'string') {
            extsToProcess = gap.ext.split(',').map(e => e.trim());
        } else if (gap.extSurfaces && Array.isArray(gap.extSurfaces)) {
            extsToProcess = gap.extSurfaces;
        }

        for (const e of extsToProcess) {
            if (EXT_BASE_VALUES[e] && !chargedExts.has(e)) {
                baseValue = EXT_BASE_VALUES[e];
                chargedExts.add(e);
                extSource = e;
                break; // Only apply the highest uncharged statutory base per gap
            }
        }
        
        // Fallback if no specific statutory trigger was found but gap is active
        if (baseValue === 0) baseValue = 250000; 

        // 2. Apply The Multipliers
        let appliedMultiplier = 1.0;
        let multiplierReason = "Standard Assessment";

        // If they explicitly confessed to a highly dangerous practice (penalty = 50)
        if (gap.penalty === 50) {
            appliedMultiplier = MULTIPLIERS.GROSS_NEGLIGENCE;
            multiplierReason = "Willful Negligence Confessed";
        } 
        // If the threat is irrefutable
        else if (gap.source === 'dual-verified') {
            appliedMultiplier = MULTIPLIERS.DUAL_VERIFIED;
            multiplierReason = "Dual-Verified Evidence";
        }

        // 3. The Math
        let finalLineTotal = baseValue * appliedMultiplier;

        // 4. The Escalator Triggers (The Killshots)
        // Check for specific toxic threat IDs that trigger the pulsing UI banners
        if (gap.threatId === 'UNI_INF_001') hasPersonalLiability = true;
        if (gap.threatId === 'INT05_DIS_001') hasCriminalLiability = true;

        totalExposure += finalLineTotal;

        receiptLines.push({
            threatId: gap.threatId || gap.id,
            threatName: gap.trap || gap.gapName || 'Architecture Vulnerability',
            tier: mapToTier(gap.severity),
            baseValue: baseValue,
            appliedMultiplier: appliedMultiplier,
            multiplierReason: multiplierReason,
            decayLabel: 'Active Uncapped',
            finalLineTotal: finalLineTotal
        });
    });

    // 5. The Discovery Premium (The "I Don't Know" Tax)
    if (unsureFlag) {
        console.log("> ACTUARY: Unsure flag detected. Applying 25% Discovery Premium.");
        const premium = totalExposure * (MULTIPLIERS.DISCOVERY_PREMIUM - 1);
        totalExposure *= MULTIPLIERS.DISCOVERY_PREMIUM;
        
        receiptLines.push({
            threatId: 'SYS_UNCERTAINTY',
            threatName: 'Unquantified Internal Variables',
            tier: 'PREMIUM',
            baseValue: premium,
            appliedMultiplier: MULTIPLIERS.DISCOVERY_PREMIUM,
            multiplierReason: "User answered 'I don't know'",
            decayLabel: 'Discovery Phase Tax',
            finalLineTotal: premium
        });
    }

    console.log(`> ACTUARY: Calculated Maximum Concurrent Exposure: $${totalExposure.toLocaleString()}`);

    return {
        totalExposure,
        hasPersonalLiability,
        hasCriminalLiability,
        receiptLines
    };
}

// ============================================================================
// 5. THE DATA PACKER (Building the Briefcase for the Dashboard)
// ============================================================================

function determinePrescription(lanes) {
    if (!lanes || lanes.length === 0) return 'agentic_shield';
    if (lanes.includes('commercial') && lanes.includes('operational')) return 'complete_stack';
    if (lanes.includes('operational')) return 'workplace_shield';
    return 'agentic_shield';
}

export function generateFinalReport(interrogationState, lanes, surfaces, registryData, prospectData = {}) {
    console.log("> ACTUARY: Assembling Final Financial & Legal Briefcase...");

    // 1. Merge Public Scrape with Private Confessions
    const mergedGaps = mergeIntelligence(prospectData, interrogationState.activeGaps || []);

    // 2. Calculate the exact dollar amount of the pain
    const financialData = calculateFinancialExposure(mergedGaps, interrogationState.unsureFlag);

    // 3. Enhance gaps with copywriting from registry
    const enrichedThreats = mergedGaps.map(gap => {
        const threatId = gap.threatId || gap.id;
        const threatDef = registryData?.threats?.[threatId] || {};
        
        return {
            ...gap,
            ...threatDef, // Brings in copywriting, mechanism, trigger, stakes, fix
            threatId: threatId,
            threatName: gap.gapName || gap.trap || threatDef.name || 'Architecture Vulnerability',
            calculatedSeverity: mapToTier(gap.severity),
            // Inherit specific high-stress fields from prospectData if available
            legalAmmo: gap.legalAmmo || threatDef.legal?.ammo || threatDef.legalAmmo || "Pending State AG/FTC Enforcement Action",
            velocity: gap.velocity || "Immediate",
            diligence_pressure: prospectData.diligence_pressure || null
        };
    });

    // 4. Apply the Ruthless Sorting Algorithm (Dual-Verified to the top)
    enrichedThreats.sort(sortBySeverityAndVerification);

    // 5. Package the Final Report
    return {
        totalScore: interrogationState.totalScore || 0,
        unsureFlag: interrogationState.unsureFlag || false,
        activeGapsCount: enrichedThreats.length,
        financials: financialData,
        prescription: determinePrescription(lanes),
        rawConfessions: interrogationState.vaultInputs || [],
        sortedThreats: enrichedThreats
    };
}
