/**
 * LEX NOVA HQ — FORENSIC ENGINE v6.0
 * /engine/scoring-processor.js - The Actuary
 * * THE SUPREME COMMAND: This module converts legal vulnerabilities into 
 * itemized, defensible financial exposure. It does not touch the UI.
 */

// ============================================================================
// 1. THE LEDGER (Financial Constants & Logic)
// ============================================================================

/**
 * THE PAIN TIERS: Base exposure costs based on Business Survival Impact.
 */
const SEVERITY_BASE = {
    "T1": { cost: 10000000, label: "EXTINCTION", desc: "Business cannot continue." },
    "T2": { cost: 2000000,  label: "UNCAPPED MONEY", desc: "No ceiling on exposure." },
    "T3": { cost: 500000,   label: "DEAL DEATH", desc: "Enterprise deals stop." },
    "T4": { cost: 150000,   label: "REGULATORY HEAT", desc: "Expensive but survivable." },
    "T5": { cost: 25000,    label: "FRICTION", desc: "Annoying, not existential." },
    "DEFAULT": { cost: 150000, label: "CLASSIFIED THREAT", desc: "Unknown threat vector." }
};

/**
 * THE SURFACES: Multipliers applied based on where the product operates.
 * If multiple are tripped, the Engine uses the highest applicable multiplier.
 */
const SURFACE_MULTIPLIERS = {
    "EXT.01": { val: 2.5, reason: "EU GDPR Revenue Penalty Scale" },
    "EXT.02": { val: 1.5, reason: "CPRA Per-Violation Scale" },
    "EXT.03": { val: 2.0, reason: "Provenance & Disgorgement Multiplier" },
    "EXT.04": { val: 3.0, reason: "Biometric Strict Liability (BIPA)" },
    "EXT.05": { val: 1.5, reason: "FTC Deceptive Practice Scale" },
    "EXT.06": { val: 3.0, reason: "Minor Protection Statutory Multiplier" },
    "EXT.07": { val: 2.0, reason: "Employment Discrimination Class Scale" },
    "EXT.08": { val: 3.0, reason: "B2C Consumer Class Action Multiplier" },
    "EXT.09": { val: 5.0, reason: "B2B Enterprise Uncapped Damages" },
    "EXT.10": { val: 2.0, reason: "Copyright Statutory Damages Scale" }
};

/**
 * THE ACTUARIAL DECAY: Solves the concurrency problem. 
 * Prevents absurd $200M totals by applying diminishing impact to concurrent threats.
 */
const ACTUARIAL_DECAY = {
    PRIMARY: 1.0,     // 100% impact for the most lethal threat
    SECONDARY: 0.5,   // 50% impact for the second most lethal threat
    SUBSEQUENT: 0.4   // 40% impact for all remaining threats
};

// ============================================================================
// 2. THE EXPOSURE MATH (Bifurcation & Decay)
// ============================================================================

/**
 * Calculates the exact dollar exposure, builds the itemized receipt, 
 * applies the decay curve, and sets the liability escalators.
 */
function calculateExposureReceipt(activeGaps, trippedSurfaces, registryData) {
    let rawReceiptLines = [];
    let hasPersonalLiability = false;
    let hasCriminalLiability = false;

    // 1. Determine the highest active multiplier based on their surfaces
    let highestMultiplier = 1.0;
    let multiplierReason = "Standard Corporate Liability";

    trippedSurfaces.forEach(ext => {
        if (SURFACE_MULTIPLIERS[ext] && SURFACE_MULTIPLIERS[ext].val > highestMultiplier) {
            highestMultiplier = SURFACE_MULTIPLIERS[ext].val;
            multiplierReason = SURFACE_MULTIPLIERS[ext].reason;
        }
    });

    // 2. Calculate the raw line items
    activeGaps.forEach(threatId => {
        const threatDef = registryData.threats[threatId];
        if (!threatDef) return;

        const painTier = threatDef.severity?.painTier || "DEFAULT";
        const painDepth = threatDef.severity?.painDepth || "Corporate";
        
        // Flag Escalators
        if (painDepth === "Personal") hasPersonalLiability = true;
        if (painDepth === "Criminal") hasCriminalLiability = true;

        const baseObj = SEVERITY_BASE[painTier] || SEVERITY_BASE["DEFAULT"];
        const baseValue = baseObj.cost;
        const lineTotal = baseValue * highestMultiplier;

        rawReceiptLines.push({
            threatId: threatId,
            threatName: threatDef.name || "Classified Gap",
            tier: painTier,
            baseValue: baseValue,
            appliedMultiplier: highestMultiplier,
            multiplierReason: multiplierReason,
            rawLineTotal: lineTotal,
            depth: painDepth
        });
    });

    // 3. Sort lines from most expensive to least expensive for the Decay Curve
    rawReceiptLines.sort((a, b) => b.rawLineTotal - a.rawLineTotal);

    // 4. Apply the Actuarial Decay Curve
    let totalExposure = 0;
    let finalReceiptLines = [];

    rawReceiptLines.forEach((line, index) => {
        let decayFactor;
        let decayLabel;

        if (index === 0) {
            decayFactor = ACTUARIAL_DECAY.PRIMARY;
            decayLabel = "100% (Primary Threat)";
        } else if (index === 1) {
            decayFactor = ACTUARIAL_DECAY.SECONDARY;
            decayLabel = "50% (Secondary Threat)";
        } else {
            decayFactor = ACTUARIAL_DECAY.SUBSEQUENT;
            decayLabel = "40% (Concurrent Threat)";
        }

        const adjustedLineTotal = line.rawLineTotal * decayFactor;
        totalExposure += adjustedLineTotal;

        finalReceiptLines.push({
            ...line,
            decayFactor: decayFactor,
            decayLabel: decayLabel,
            finalLineTotal: adjustedLineTotal
        });
    });

    return {
        totalExposure: totalExposure,
        receiptLines: finalReceiptLines,
        hasPersonalLiability: hasPersonalLiability,
        hasCriminalLiability: hasCriminalLiability
    };
}

// ============================================================================
// 3. THE PRESCRIPTION (Product Routing)
// ============================================================================

/**
 * Determines which legal product to pitch based on the user's operational reality.
 */
function determinePrescription(selectedLanes) {
    if (selectedLanes.includes('commercial') && selectedLanes.includes('operational')) {
        return "complete_stack";
    } else if (selectedLanes.includes('operational')) {
        return "workplace_shield";
    }
    return "agentic_shield"; // Default to commercial if only commercial (or neither) is selected
}

// ============================================================================
// 4. THE MASTER EXECUTION (Exported for State Machine)
// ============================================================================

/**
 * Called by the State Machine / Engine Controller when the Quiz ends. 
 * Takes the raw confessions and generates the final, structured report.
 */
export function generateFinalReport(interrogationState, selectedLanes, trippedSurfaces, registryData) {
    console.log("> ACTUARY: Processing confessions and building financial model...");

    // 1. Calculate the Money, The Receipt, The Decay, and The Escalators
    const financialData = calculateExposureReceipt(
        interrogationState.activeGaps, 
        trippedSurfaces, 
        registryData
    );

    // 2. Package the final report for the UI Renderer (The Painter)
    const finalReport = {
        totalScore: interrogationState.totalScore, // Raw point severity
        unsureFlag: interrogationState.unsureFlag, // Did they answer "I don't know"?
        activeGapsCount: interrogationState.activeGaps.length,
        financials: financialData,
        prescription: determinePrescription(selectedLanes),
        rawConfessions: interrogationState.vaultInputs
    };

    // Console Logging for systemic validation
    console.log(`> ACTUARY: Calculated Maximum Concurrent Exposure: $${finalReport.financials.totalExposure.toLocaleString()}`);
    if (financialData.hasPersonalLiability) console.warn("> ACTUARY: [PIERCED CORPORATE VEIL] Flag Triggered.");
    if (financialData.hasCriminalLiability) console.warn("> ACTUARY: [CRIMINAL EXPOSURE] Flag Triggered.");

    return finalReport;
}
