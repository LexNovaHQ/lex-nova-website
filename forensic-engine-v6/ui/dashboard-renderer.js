/**
 * LEX NOVA HQ — FORENSIC ENGINE v6.0
 * /ui/dashboard-renderer.js - The Exhibition
 * * THE SUPREME COMMAND: This module solely handles the rendering of the final 
 * $72.5M dashboard, the Itemized Receipt, the 6-Column Threat Matrix, and Checkouts.
 */
import { getActiveProspectId, Telemetry } from '../bridge/firebase-adapter.js';

// ============================================================================
// 1. STATE & CONSTANTS
// ============================================================================
const HESITATION_WEBHOOK = "https://hook.eu1.make.com/r77qw3emv27csjq2eag7ibqku1juve4t";
const DOM_ID = 'state-dashboard';
const CURRENCY = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

const PLAN_DATA = {
    "agentic_shield": { name: "The Agentic Shield", price: 1500, delivery: "48 hours from Vault activation" },
    "workplace_shield": { name: "The Workplace Shield", price: 1500, delivery: "48 hours from Vault activation" },
    "complete_stack": { name: "The Complete Stack", price: 2500, delivery: "72 hours from Vault activation" }
};

// ── THE LAW: STATUTES & MANIFEST ──────────────────────────────────────────
const EXT_REFERENCE = {
    "EXT.01": { plain:"Your product touches EU users or data", penalty:"Up to €20M or 4% of global annual revenue", source:"GDPR Art. 83(5)" },
    "EXT.02": { plain:"Your product touches California users or data", penalty:"Up to $7,988 per violation — no cap", source:"CCPA/CPRA §1798.155" },
    "EXT.03": { plain:"Your AI ingests third-party data without provenance", penalty:"Up to $150,000 per work infringed (willful)", source:"17 U.S.C. §504(c)(2)" },
    "EXT.04": { plain:"Your product processes voice, face, or biometric data", penalty:"Up to $5,000 per violation + attorney fees", source:"BIPA 740 ILCS 14/20" },
    "EXT.05": { plain:"Your marketing makes unsubstantiated AI claims", penalty:"Up to $50,120 per violation", source:"FTC Act §5, 15 U.S.C. §45" },
    "EXT.06": { plain:"Your product is accessible to minors", penalty:"Up to $50,120 per violation + state AG enforcement", source:"COPPA 16 CFR §312" },
    "EXT.07": { plain:"Your AI makes decisions about people", penalty:"Up to $7,988 per violation + private right of action", source:"CCPA/CPRA ADMT" },
    "EXT.08": { plain:"Your product is consumer-facing (B2C)", penalty:"Up to $7,988 per consumer per violation", source:"CCPA/CPRA §1798.155" },
    "EXT.09": { plain:"Your product sells to businesses (B2B)", penalty:"Uncapped contract damages per enterprise deal", source:"UCC Art. 2 + Common Law" },
    "EXT.10": { plain:"Your AI generates content without ownership architecture", penalty:"Up to $150,000 per work (willful)", source:"17 U.S.C. §504(c)(2)" }
};

const DOC_DESCRIPTIONS = {
    DOC_TOS:  "Defines what you owe, caps what you pay, and makes agreements enforceable.",
    DOC_AGT:  "Limits exposure when your AI acts autonomously — agent liability boundaries.",
    DOC_AUP:  "Sets rules for how users interact with your AI — protects you from misuse.",
    DOC_DPA:  "Governs how you handle data — required for EU customers and enterprise deals.",
    DOC_SLA:  "Defines uptime commitments — prevents uncapped service credits.",
    DOC_PP:   "Tells users what data you collect — the document regulators check first.",
    DOC_PBK:  "Your playbook for negotiating enterprise contracts.",
    DOC_HND:  "Controls what your team can do with AI tools — stops IP leaks.",
    DOC_IP:   "Ensures everything your team builds belongs to you.",
    DOC_SOP:  "Defines when a human must review AI output.",
    DOC_DPIA: "Maps every risk your AI creates before regulators find it.",
    DOC_SCAN: "Finds every unauthorized AI tool your team is using today."
};

const KITS = {
    agentic_shield: [ { id:'DOC_TOS', n:'AI Terms of Service' }, { id:'DOC_AGT', n:'Agentic Addendum' }, { id:'DOC_AUP', n:'Acceptable Use Policy' }, { id:'DOC_DPA', n:'Data Processing Agreement'}, { id:'DOC_SLA', n:'AI-Specific SLA' }, { id:'DOC_PP', n:'Privacy Policy' }, { id:'DOC_PBK', n:'Negotiation Playbook'} ],
    workplace_shield: [ { id:'DOC_HND', n:'AI Employee Handbook'}, { id:'DOC_IP', n:'IP Assignment Deed'}, { id:'DOC_SOP', n:'HITL Protocol'}, { id:'DOC_DPIA', n:'Impact Assessment'}, { id:'DOC_SCAN', n:'Shadow AI Scanner'}, { id:'DOC_PBK', n:'Negotiation Playbook'} ],
    complete_stack: [ { id:'DOC_TOS', n:'AI Terms of Service' }, { id:'DOC_AGT', n:'Agentic Addendum' }, { id:'DOC_AUP', n:'Acceptable Use Policy' }, { id:'DOC_DPA', n:'Data Processing Agreement'}, { id:'DOC_SLA', n:'AI-Specific SLA' }, { id:'DOC_PP', n:'Privacy Policy' }, { id:'DOC_HND', n:'AI Employee Handbook'}, { id:'DOC_IP', n:'IP Assignment Deed'}, { id:'DOC_DPIA', n:'Impact Assessment'}, { id:'DOC_PBK', n:'Negotiation Playbook'} ]
};

// ============================================================================
// 2. HELPER FUNCTIONS & SEVERITY STYLING
// ============================================================================
function sevClasses(s) {
    if (s === 'T1') return 'bg-danger/10 text-danger border border-danger/20';
    if (s === 'T2') return 'bg-orange-500/10 text-orange-500 border border-orange-500/20';
    if (s === 'T3') return 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20';
    return 'bg-marble/10 text-marble/70 border border-marble/20';
}

function labelSeverity(s) {
    if (s === 'T1') return 'T1 - EXTINCTION';
    if (s === 'T2') return 'T2 - UNCAPPED';
    if (s === 'T3') return 'T3 - DEAL DEATH';
    return s;
}

function formatVelocity(v) {
    if (!v) return 'ACTIVE NOW';
    const vel = v.toUpperCase();
    if (vel === 'IMMEDIATE') return 'ACTIVE NOW';
    if (vel === 'HIGH') return 'THIS YEAR';
    if (vel === 'UPCOMING') return 'INCOMING';
    return vel;
}

// ============================================================================
// 3. THE HOSTAGE RULE (V5.8 Scaled Visibility Logic)
// ============================================================================
function applyHostageRule(sortedThreats) {
    const total = sortedThreats.length;
    let showFull = 0, showBlur = 0;
    
    // Legacy v5.8 Scaled Visibility Limits
    if (total <= 4)       { showFull = 2; showBlur = 1; }
    else if (total <= 10) { showFull = 3; showBlur = 2; }
    else if (total <= 20) { showFull = 5; showBlur = 3; }
    else                  { showFull = 6; showBlur = 4; }
    
    const clearGaps = [];
    const blurredGaps = [];
    const lockedGaps = [];
    
    sortedThreats.forEach((t, i) => {
        if (i < showFull) clearGaps.push(t);
        else if (i < showFull + showBlur) blurredGaps.push(t);
        else lockedGaps.push(t);
    });
    
    const hostageIds = [...blurredGaps, ...lockedGaps].map(t => t.threatId);
    
    return { clearGaps, blurredGaps, lockedGaps, hostageIds };
}
