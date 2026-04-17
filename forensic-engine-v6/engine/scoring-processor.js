/**
 * LEX NOVA HQ — FORENSIC ENGINE v6.0
 * /engine/scoring-processor.js - The Actuary
 *
 * SCHEMA v2.0:
 * - Primary source: true_gaps (new FP_ schema)
 * - Fallback for evidence.found: forensicGaps (legacy schema)
 * - Quiz confessions: activeGaps [{threatId, penalty}] objects
 * - mapToTier handles T1–T5 natively AND legacy NUCLEAR/CRITICAL/HIGH
 * - All output fields normalized — renderer reads predictable keys
 * - buildConfessedGaps() exported for main.js → firebase persistence
 */

// ============================================================================
// 1. CONSTANTS & MULTIPLIERS
// ============================================================================

const EXT_BASE_VALUES = {
    "EXT.01": 20000000,  // GDPR: €20M
    "EXT.02": 7988000,   // CCPA per-violation at scale
    "EXT.03": 15000000,  // Copyright willful infringement
    "EXT.04": 5000000,   // BIPA / biometrics
    "EXT.05": 10000000,  // FTC / consumer protection
    "EXT.06": 20000000,  // COPPA
    "EXT.07": 5000000,   // ADMT / AI decisions
    "EXT.08": 2500000,   // B2C general
    "EXT.09": 10000000,  // B2B enterprise breach
    "EXT.10": 15000000   // AI content / IP generation
};

const MULTIPLIERS = {
    GROSS_NEGLIGENCE: 1.5,   // penalty === 50 (dangerous confession)
    DUAL_VERIFIED: 1.2,      // public scrape + internal confession
    DISCOVERY_PREMIUM: 1.25  // unsureFlag: "I don't know my own stack"
};

// ============================================================================
// 2. TIER & VELOCITY MAPPERS
// ============================================================================

/**
 * Maps any severity format to T1–T5.
 * Handles: native "T1"–"T5", legacy "NUCLEAR"/"CRITICAL"/"HIGH".
 */
export function mapToTier(s) {
    if (!s || typeof s !== 'string') return 'T3';
    const upper = s.toUpperCase().trim();

    // Native T-tier (new schema) — pass through directly
    if (/^T[1-5]$/.test(upper)) return upper;

    // Legacy severity labels
    if (upper === 'NUCLEAR') return 'T1';
    if (upper === 'CRITICAL') return 'T2';
    if (upper === 'HIGH') return 'T3';
    if (upper === 'MEDIUM') return 'T3';
    if (upper === 'LOW') return 'T4';

    return 'T3'; // Safe fallback
}

/**
 * Maps legacy velocity strings to new vocabulary.
 */
function mapVelocity(v) {
    if (!v || typeof v !== 'string') return 'ACTIVE_NOW';
    const upper = v.toUpperCase().trim();
    if (upper === 'IMMEDIATE' || upper === 'ACTIVE_NOW') return 'ACTIVE_NOW';
    if (upper === 'THIS_YEAR') return 'THIS_YEAR';
    if (upper === 'UPCOMING' || upper === 'INCOMING') return 'INCOMING';
    if (upper === 'WATCH') return 'WATCH';
    return 'ACTIVE_NOW';
}

// ============================================================================
// 3. NORMALIZATION — SINGLE SCHEMA FOR RENDERER
// ============================================================================

/**
 * Builds the ext surfaces for actuary math.
 * Priority: forensicGaps.extSurfaces → registry triggers.ext → empty array.
 */
function getExtSurfaces(forensicMatch, registryData, threatId) {
    if (forensicMatch?.extSurfaces?.length) return forensicMatch.extSurfaces;
    const regThreat = registryData?.threats?.[threatId];
    if (regThreat?.triggers?.ext?.length) return regThreat.triggers.ext;
    return [];
}

/**
 * Normalizes a true_gaps item into the canonical output schema.
 * forensicMatch: optional matching forensicGaps entry for evidence.found.
 * quizMatch: optional {threatId, penalty} if founder confessed to this gap.
 */
function normalizeTrueGap(tg, forensicMatch, quizMatch, registryData) {
    const threatId = tg.Threat_ID;
    const isDualVerified = !!quizMatch;

    // Pain tier: read Pain_Tier natively (new schema is always T1–T5)
    const painTier = mapToTier(tg.Pain_Tier);

    // Evidence block: prefer forensicGaps.evidence.found (full raw text)
    // Fall back to proof_citation (shorter excerpt from true_gaps)
    const evidenceFound = forensicMatch?.evidence?.found || null;
    const proofCitation = (!tg.proof_citation || tg.proof_citation.startsWith('NULL'))
        ? null
        : tg.proof_citation;

    return {
        // Identity
        threatId,
        threatName: tg.Threat_Name || 'Architecture Vulnerability',
        source: isDualVerified ? 'dual-verified' : 'scrape',

        // Severity
        calculatedSeverity: painTier,
        painDepth: tg.Pain_Depth || 'Corporate',
        velocity: mapVelocity(tg.Velocity),
        status: tg.Status || 'Active',

        // Column 1 — Vulnerability & Evidence
        evidenceFound,
        proofCitation,

        // Column 2 — Structural Absence
        fpMechanism: tg.FP_Mechanism || null,
        fpTrigger: tg.FP_Trigger || null,
        structuralAbsence: tg.structural_absence || null,

        // Column 3 — Legal Precedent
        legalPain: tg.Legal_Pain || null,

        // Column 4 — Blast Radius
        fpImpact: tg.FP_Impact || null,
        fpStakes: (tg.FP_Stakes && tg.FP_Stakes !== 'NULL') ? tg.FP_Stakes : null,

        // Column 5 — Clock (diligence_pressure populated separately at merge level)
        diligence_pressure: null,

        // Column 6 — The Fix
        lexNovaFix: tg.Lex_Nova_Fix || null,

        // Actuary
        extSurfaces: getExtSurfaces(forensicMatch, registryData, threatId),
        penalty: quizMatch?.penalty || 0,

        // Metadata
        predatorSignature: tg.predator_signature || null,
        featureRef: tg.feature_ref || null,
        featureType: tg.feature_type || null,
    };
}

/**
 * Normalizes a quiz-confession gap into the canonical output schema.
 * Built from registry.json when no true_gaps entry exists for this threat.
 */
function normalizeRegistryGap(threatId, reg, forensicMatch, quizGap) {
    const evidenceFound = forensicMatch?.evidence?.found || null;
    const stakes = (reg.copywriting?.stakes && reg.copywriting.stakes !== 'NULL')
        ? reg.copywriting.stakes
        : null;

    return {
        // Identity
        threatId,
        threatName: reg.name || 'Architecture Vulnerability',
        source: 'quiz_confession',

        // Severity
        calculatedSeverity: mapToTier(reg.severity?.painTier),
        painDepth: reg.severity?.painDepth || 'Corporate',
        velocity: mapVelocity(reg.severity?.velocity),
        status: 'Active',

        // Column 1
        evidenceFound,
        proofCitation: null,

        // Column 2
        fpMechanism: reg.copywriting?.mechanism || null,
        fpTrigger: reg.copywriting?.trigger || null,
        structuralAbsence: null,

        // Column 3
        legalPain: reg.legal?.pain || null,

        // Column 4
        fpImpact: reg.copywriting?.impact || null,
        fpStakes: stakes,

        // Column 5
        diligence_pressure: null,

        // Column 6
        lexNovaFix: reg.copywriting?.fix || null,

        // Actuary
        extSurfaces: reg.triggers?.ext || [],
        penalty: quizGap?.penalty || 0,

        // Metadata
        predatorSignature: null,
        featureRef: null,
        featureType: null,
    };
}

// ============================================================================
// 4. THE DUAL-INTELLIGENCE MERGE
// ============================================================================

function mergeIntelligence(prospectData, quizGaps, registryData) {
    console.log("> ACTUARY: Initiating Dual-Intelligence Merge (v2.0)...");

    // Primary source: true_gaps (new FP_ schema)
    const trueGaps = prospectData?.true_gaps || [];

    // Fallback for evidence.found: forensicGaps (legacy schema)
    const forensicGaps = prospectData?.forensicGaps || [];

    // Build forensicGaps index by threatId (case-insensitive match)
    const forensicIndex = {};
    forensicGaps.forEach(fg => {
        const id = fg.threatId || fg.id;
        if (id) forensicIndex[id] = fg;
    });

    // Build quiz gap index — handles both object format {threatId, penalty} and legacy strings
    const quizIndex = {};
    quizGaps.forEach(qg => {
        const id = typeof qg === 'string' ? qg : qg?.threatId;
        if (id) quizIndex[id] = typeof qg === 'object' ? qg : { threatId: id, penalty: 0 };
    });

    const mergedList = [];
    const seenIds = new Set();

    // ── STEP 1: Process true_gaps (primary) ───────────────────────────────
    trueGaps.forEach(tg => {
        const threatId = tg.Threat_ID;
        if (!threatId || seenIds.has(threatId)) return;

        const forensicMatch = forensicIndex[threatId] || null;
        const quizMatch = quizIndex[threatId] || null;

        const normalized = normalizeTrueGap(tg, forensicMatch, quizMatch, registryData);

        mergedList.push(normalized);
        seenIds.add(threatId);
    });

    // ── STEP 2: If no true_gaps, fall back to forensicGaps as primary ─────
    if (trueGaps.length === 0 && forensicGaps.length > 0) {
        console.log("> ACTUARY: No true_gaps found. Falling back to forensicGaps.");
        forensicGaps.forEach(fg => {
            const threatId = fg.threatId || fg.id;
            if (!threatId || seenIds.has(threatId)) return;

            const quizMatch = quizIndex[threatId] || null;

            // Normalize legacy forensicGap into canonical schema
            const normalized = {
                threatId,
                threatName: fg.gapName || 'Architecture Vulnerability',
                source: quizMatch ? 'dual-verified' : 'scrape',
                calculatedSeverity: mapToTier(fg.severity),
                painDepth: 'Corporate',
                velocity: mapVelocity(fg.velocity),
                status: 'Active',
                evidenceFound: fg.evidence?.found || null,
                proofCitation: null,
                fpMechanism: fg.thePain || null,
                fpTrigger: fg.evidence?.trigger || null,
                structuralAbsence: null,
                legalPain: null,
                fpImpact: null,
                fpStakes: null,
                diligence_pressure: null,
                lexNovaFix: fg.theFix || null,
                extSurfaces: fg.extSurfaces || getExtSurfaces(null, registryData, threatId),
                penalty: quizMatch?.penalty || 0,
                predatorSignature: null,
                featureRef: null,
                featureType: null,
            };

            mergedList.push(normalized);
            seenIds.add(threatId);
        });
    }

    // ── STEP 3: Process quiz confessions NOT already in true_gaps ─────────
    quizGaps.forEach(qg => {
        const threatId = typeof qg === 'string' ? qg : qg?.threatId;
        if (!threatId || seenIds.has(threatId)) return;

        const reg = registryData?.threats?.[threatId];
        if (!reg) {
            console.warn(`> ACTUARY: Quiz gap ${threatId} not found in registry. Skipping.`);
            return;
        }

        const forensicMatch = forensicIndex[threatId] || null;
        const quizGapObj = typeof qg === 'object' ? qg : { threatId, penalty: 0 };

        const normalized = normalizeRegistryGap(threatId, reg, forensicMatch, quizGapObj);

        mergedList.push(normalized);
        seenIds.add(threatId);
    });

    // Attach diligence_pressure at document level to highest-severity gap
    const dp = prospectData?.ghost_protection_global?.diligence_pressure
        || prospectData?.diligence_pressure
        || null;
    if (dp && mergedList.length > 0) {
        mergedList[0].diligence_pressure = dp;
    }

    return mergedList;
}

// ============================================================================
// 5. SORTING — APEX PREDATOR RULE
// ============================================================================

function sortBySeverityAndVerification(a, b) {
    // T4/T5 always sink to bottom — handled by Hostage Rule's locked section
    const isLowTier = t => t.calculatedSeverity === 'T4' || t.calculatedSeverity === 'T5';
    if (isLowTier(a) && !isLowTier(b)) return 1;
    if (!isLowTier(a) && isLowTier(b)) return -1;

    // APEX PREDATOR: Dual-Verified forces to top regardless of tier
    if (a.source === 'dual-verified' && b.source !== 'dual-verified') return -1;
    if (b.source === 'dual-verified' && a.source !== 'dual-verified') return 1;

    // Secondary: Severity (T1 > T2 > T3)
    const sevW = { 'T1': 5, 'T2': 4, 'T3': 3, 'T4': 2, 'T5': 1 };
    const sevA = sevW[a.calculatedSeverity] || 0;
    const sevB = sevW[b.calculatedSeverity] || 0;
    if (sevA !== sevB) return sevB - sevA;

    // Tertiary: Scrape > quiz_confession
    const srcW = { 'scrape': 2, 'quiz_confession': 1 };
    return (srcW[b.source] || 0) - (srcW[a.source] || 0);
}

// ============================================================================
// 6. FINANCIAL ACTUARY
// ============================================================================

function calculateFinancialExposure(mergedGaps, unsureFlag) {
    console.log("> ACTUARY: Calculating financial exposure...");

    let totalExposure = 0;
    let hasPersonalLiability = false;
    let hasCriminalLiability = false;
    const receiptLines = [];
    const chargedExts = new Set();

    mergedGaps.forEach(gap => {
        // Escalator triggers — use painDepth (cleaner than hardcoded IDs)
        if (gap.painDepth === 'Personal') hasPersonalLiability = true;
        if (gap.painDepth === 'Criminal') hasCriminalLiability = true;

        // Base value from jurisdictional surface
        let baseValue = 0;
        let extSource = 'General Architecture Deficit';

        for (const e of (gap.extSurfaces || [])) {
            if (EXT_BASE_VALUES[e] && !chargedExts.has(e)) {
                baseValue = EXT_BASE_VALUES[e];
                chargedExts.add(e);
                extSource = e;
                break;
            }
        }
        if (baseValue === 0) baseValue = 250000; // floor

        // Multipliers
        let appliedMultiplier = 1.0;
        let multiplierReason = 'Standard Assessment';

        if (gap.penalty === 50) {
            appliedMultiplier = MULTIPLIERS.GROSS_NEGLIGENCE;
            multiplierReason = 'Willful Negligence Confessed';
        } else if (gap.source === 'dual-verified') {
            appliedMultiplier = MULTIPLIERS.DUAL_VERIFIED;
            multiplierReason = 'Dual-Verified Evidence';
        }

        const finalLineTotal = baseValue * appliedMultiplier;
        totalExposure += finalLineTotal;

        receiptLines.push({
            threatId: gap.threatId,
            threatName: gap.threatName,
            tier: gap.calculatedSeverity,
            baseValue,
            appliedMultiplier,
            multiplierReason,
            decayLabel: 'Active Uncapped',
            finalLineTotal
        });
    });

    // Discovery Premium — "I don't know my own stack"
    if (unsureFlag) {
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

    console.log(`> ACTUARY: Maximum Concurrent Exposure: $${totalExposure.toLocaleString()}`);

    return { totalExposure, hasPersonalLiability, hasCriminalLiability, receiptLines };
}

// ============================================================================
// 7. PRESCRIPTION ENGINE
// ============================================================================

function determinePrescription(lanes) {
    if (!lanes || lanes.length === 0) return 'agentic_shield';
    if (lanes.includes('commercial') && lanes.includes('operational')) return 'complete_stack';
    if (lanes.includes('operational')) return 'workplace_shield';
    return 'agentic_shield';
}

// ============================================================================
// 8. CONFESSED GAPS BUILDER — Exported for main.js → Firebase persistence
// ============================================================================

/**
 * Builds full true_gaps-format objects from quiz activeGaps + registry.
 * Called in main.js after registry.json is loaded.
 * Output is saved to Firestore as confessedGaps[].
 */
export function buildConfessedGaps(activeGaps, registryData) {
    const confessedGaps = [];

    activeGaps.forEach(gap => {
        const threatId = typeof gap === 'string' ? gap : gap?.threatId;
        if (!threatId) return;

        const reg = registryData?.threats?.[threatId];
        if (!reg) {
            console.warn(`> BUILDER: ${threatId} not in registry — cannot build confessedGap.`);
            return;
        }

        const stakes = (reg.copywriting?.stakes && reg.copywriting.stakes !== 'NULL')
            ? reg.copywriting.stakes
            : null;

        confessedGaps.push({
            Threat_ID: threatId,
            Threat_Name: reg.name,
            Pain_Tier: reg.severity?.painTier || 'T3',
            Pain_Depth: reg.severity?.painDepth || 'Corporate',
            Velocity: reg.severity?.velocity || 'ACTIVE_NOW',
            Legal_Pain: reg.legal?.pain || null,
            FP_Mechanism: reg.copywriting?.mechanism || null,
            FP_Trigger: reg.copywriting?.trigger || null,
            FP_Impact: reg.copywriting?.impact || null,
            FP_Stakes: stakes,
            Lex_Nova_Fix: reg.copywriting?.fix || null,
            structural_absence: null,
            proof_citation: null,
            predator_signature: null,
            feature_ref: null,
            feature_type: null,
            Status: 'Active',
            source: 'quiz_confession',
            penalty: typeof gap === 'object' ? (gap.penalty || 0) : 0,
            evidence_source: 'quiz_confession',
            savedAt: new Date().toISOString()
        });
    });

    console.log(`> BUILDER: ${confessedGaps.length} confessedGaps assembled from quiz.`);
    return confessedGaps;
}

// ============================================================================
// 9. HOSTAGE RULE — Source-Aware Visibility Logic
// ============================================================================

/**
 * Applies the source-aware Hostage Rule to a sorted threat array.
 *
 * FULLY VISIBLE (earned, no cap):
 *   - ALL dual-verified threats (scrape + confession)
 *   - ALL quiz_confession threats (founder told us, scrape missed)
 *
 * FULLY VISIBLE (gifted, hard cap: 2):
 *   - Top 2 scrape-only T1 threats
 *
 * PARTIALLY VISIBLE (next up to 3 after fully-visible set):
 *   Show: evidence block, source badge, tier badge, blast radius, Lex Nova Fix™
 *   Blur: threat name, mechanism, legal precedent
 *   Note: quiz_confession threats are NEVER here — always promoted to fully visible.
 *
 * LOCKED:
 *   All remaining threats — single batch card with count + CTA.
 */
export function applyHostageRule(sortedThreats) {
    const total = sortedThreats.length;
    if (total === 0) {
        return { clearGaps: [], blurredGaps: [], lockedGaps: [], hostageIds: [] };
    }

    const clearGaps   = [];
    const blurredGaps = [];
    const lockedGaps  = [];
    const earnedIds   = new Set();

    // Step 1: Earned visibility — dual-verified and quiz_confession always fully shown
    sortedThreats.forEach(t => {
        if (t.source === 'dual-verified' || t.source === 'quiz_confession') {
            clearGaps.push(t);
            earnedIds.add(t.threatId);
        }
    });

    // Step 2: Gifted visibility — top 2 scrape-only T1 threats
    let giftedT1 = 0;
    sortedThreats.forEach(t => {
        if (earnedIds.has(t.threatId)) return;
        if (t.source === 'scrape' && t.calculatedSeverity === 'T1' && giftedT1 < 2) {
            clearGaps.push(t);
            earnedIds.add(t.threatId);
            giftedT1++;
        }
    });

    // Step 3: Partial + locked for everything else
    const remaining = sortedThreats.filter(t => !earnedIds.has(t.threatId));
    const partialCount = Math.min(3, remaining.length);

    remaining.forEach((t, i) => {
        if (i < partialCount) blurredGaps.push(t);
        else lockedGaps.push(t);
    });

    const hostageIds = [...blurredGaps, ...lockedGaps].map(t => t.threatId);

    console.log(`> HOSTAGE RULE: ${clearGaps.length} clear | ${blurredGaps.length} partial | ${lockedGaps.length} locked`);

    return { clearGaps, blurredGaps, lockedGaps, hostageIds };
}

// ============================================================================
// 10. MASTER REPORT GENERATOR
// ============================================================================

export function generateFinalReport(interrogationState, lanes, surfaces, registryData, prospectData = {}) {
    console.log("> ACTUARY: Assembling Final Briefcase...");

    const mergedGaps = mergeIntelligence(prospectData, interrogationState.activeGaps || [], registryData);
    const financialData = calculateFinancialExposure(mergedGaps, interrogationState.unsureFlag);

    mergedGaps.sort(sortBySeverityAndVerification);

    return {
        totalScore: interrogationState.totalScore || 0,
        unsureFlag: interrogationState.unsureFlag || false,
        activeGapsCount: mergedGaps.length,
        financials: financialData,
        prescription: determinePrescription(lanes),
        rawConfessions: interrogationState.vaultInputs || [],
        sortedThreats: mergedGaps,
        registry: registryData
    };
}
