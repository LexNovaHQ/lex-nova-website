/**
 * LEX NOVA HQ — FORENSIC ENGINE v6.0
 * /config/governance.js - The Magna Carta
 * * CRITICAL: This file hardcodes the firm's margin baseline and legal firewall.
 * It uses Object.freeze() to physically prevent runtime mutation.
 */

// ============================================================================
// SECTION 1: THE MAGNA CARTA (Frozen Constants)
// ============================================================================

const PRICING = Object.freeze({
    KIT_BASELINE: 1500,
    BUNDLE_BASELINE: 2500,
    FLAGSHIP_BASELINE: 8000,
    FOUNDING_CLIENT_DISCOUNT: 997,
    CHANGE_ORDER_HOURLY: 250
});

const BUSINESS_STATE = Object.freeze({
    // FLIP THIS TO FALSE THE EXACT SECOND YOU SIGN CLIENT #3.
    FOUNDING_CLIENT_MODE_ACTIVE: true 
});

const LEGAL_FIREWALL = Object.freeze({
    DISCLAIMER_1: "Commercial Architecture Practice, Not a Law Firm.",
    DISCLAIMER_2: "Review-Ready Drafts Only.",
    DISCLAIMER_3: "No Attorney-Client Relationship."
});


// ============================================================================
// SECTION 2: SECURE GETTERS (Read-Only Access for the UI & Bridge)
// ============================================================================

/**
 * Returns the strictly formatted pricing payload.
 * If Founding Client Mode is active, it returns the $997 cost BUT includes 
 * the $1500 original price so the UI can render the anchor (strike-through).
 */
export function getKitPricing() {
    if (BUSINESS_STATE.FOUNDING_CLIENT_MODE_ACTIVE) {
        return {
            currentPrice: PRICING.FOUNDING_CLIENT_DISCOUNT, // $997
            anchorPrice: PRICING.KIT_BASELINE,              // $1500
            isDiscounted: true,
            displayString: "Founding Client Allocation"
        };
    }
    
    return {
        currentPrice: PRICING.KIT_BASELINE,                 // $1500
        anchorPrice: PRICING.KIT_BASELINE,                  // $1500
        isDiscounted: false,
        displayString: "Standard Kit Allocation"
    };
}

export function getBundlePricing() {
    return {
        currentPrice: PRICING.BUNDLE_BASELINE,              // $2500
        anchorPrice: PRICING.BUNDLE_BASELINE,               // $2500
        isDiscounted: false, // Bundles do not get the $997 discount
        displayString: "Complete Stack Allocation"
    };
}

export function getFirewallStrings() {
    return [LEGAL_FIREWALL.DISCLAIMER_1, LEGAL_FIREWALL.DISCLAIMER_2, LEGAL_FIREWALL.DISCLAIMER_3];
}


// ============================================================================
// SECTION 3: THE KILL SWITCH (Validation)
// ============================================================================

/**
 * Runs on boot via main.js. If a rogue dev or corrupted file alters the 
 * baseline pricing below $1,500, this physically crashes the application.
 */
export function validateGovernance() {
    if (PRICING.KIT_BASELINE !== 1500) {
        throw new Error("GOVERNANCE VIOLATION: Kit Baseline Price has been altered from $1,500. System Halt.");
    }
    if (PRICING.BUNDLE_BASELINE !== 2500) {
        throw new Error("GOVERNANCE VIOLATION: Bundle Baseline Price has been altered from $2,500. System Halt.");
    }
    if (PRICING.CHANGE_ORDER_HOURLY !== 250) {
        throw new Error("GOVERNANCE VIOLATION: Change Order Rate has been altered from $250. System Halt.");
    }
    return true; // Governance intact
}
