/**
 * * LEX NOVA HQ — FORENSIC SCANNER v5.8
 * scanner-logic.js
 *
 * CHANGES FROM v5.6:
 * ─ PID bypass: skip email gate when PID found in Firestore
 * ─ scannerClicked fires on page load for PID visitors
 * ─ Status writes ENGAGED (matches admin panel)
 * ─ 6 new archetype questions — all 10 INT archetypes covered
 * ─ Always exactly 10 questions: 5 global + fill from archetype/internal
 * ─ Dashboard overhaul: scaled visibility tiers, evidence sources,
 *   founder/company name, exposure reference table, manifest descriptions
 * ─ getDocId() fixed for theFix strings not starting with DOC_
 * ─ checkConfig() moved inside DOMContentLoaded
 * ─ Version strings updated to v5.7
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import {
    getFirestore, doc, getDoc, setDoc, serverTimestamp,
    query, collection, where, getDocs
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

// ── 01. FIREBASE ────────────────────────────────────────────────────────
const firebaseConfig = {
    apiKey:            "AIzaSyDO4s_W8_87XnsLnuAfyUqgsF8BgaHRYWA",
    authDomain:        "lexnova-hq.firebaseapp.com",
    projectId:         "lexnova-hq",
    storageBucket:     "lexnova-hq.firebasestorage.app",
    messagingSenderId: "539475214055",
    appId:             "1:539475214055:web:c01a99ec94ff073a9b6c42"
};
const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

// ── 02. CONSTANTS ───────────────────────────────────────────────────────
const CHECKOUT_WEBHOOK = "https://hook.eu1.make.com/r77qw3emv27csjq2eag7ibqku1juve4t";
const GATE_WEBHOOK     = "https://hook.eu1.make.com/q7nnd3klwdmlmtesq5no4yfsmk3v8ua7";

const PAYPAL_LINKS = {
    agentic_shield:   "https://www.paypal.com/ncp/payment/WNH78KQCXDBL6",
    workplace_shield: "https://www.paypal.com/ncp/payment/7DUHPJJ4XVUVJ",
    complete_stack:   "https://www.paypal.com/ncp/payment/X3PJ47FEDUSPW"
};

const PLAN_DATA = {
    agentic_shield:   { name:"The Agentic Shield",  price:997,  tier:"Kit",    lane:"Lane A — Commercial",  delivery:"48 hours from Intake Form submission", rev:"1 Round" },
    workplace_shield: { name:"The Workplace Shield", price:997,  tier:"Kit",    lane:"Lane B — Operational", delivery:"48 hours from Intake Form submission", rev:"1 Round" },
    complete_stack:   { name:"The Complete Stack",   price:2000, tier:"Bundle", lane:"Hybrid (A + B)",       delivery:"72 hours from Intake Form submission", rev:"2 Rounds" }
};

// ── V5.8: ALIGNED EXT VALUES (Matches V2 Registry Reality) ───────────
const EXT_VALUES = {
    "EXT.01": 38000000, // €35M EU AI Act equivalent
    "EXT.02": 10000000, // CPRA base statutory aggregation
    "EXT.03": 30000000, // ₹250 crore DPDP Act equivalent
    "EXT.04":  5000000, // BIPA strict liability base
    "EXT.05": 20000000, // SEC/SEBI systemic enforcement base
    "EXT.06": 25000000, // Minor protection $15k/day scaling
    "EXT.07": 10000000, // Class-action employment baseline
    "EXT.08": 15000000, // FTC deceptive practice / ROSCA base
    "EXT.09": 20000000, // Enterprise reliance / wasted cost base
    "EXT.10": 50000000  // Copyright willful infringement base
};

// ── V5.8: EXT REFERENCE TABLE (Aligned to V2 Registry Key) ───────────
const EXT_REFERENCE = {
    "EXT.01": { plain:"Your product touches EU users, data, or markets", penalty:"Up to €35M or 7% of global annual revenue", source:"GDPR / EU AI Act" },
    "EXT.02": { plain:"Your product touches California users or data", penalty:"Uncapped statutory damages & AG civil penalties", source:"CPRA / State AI Laws" },
    "EXT.03": { plain:"Your product touches Indian users or data", penalty:"Up to ₹250 crore per instance + criminal exposure", source:"DPDP Act / IT Rules" },
    "EXT.04": { plain:"Your product processes biometric data (IL, TX, WA, CO)", penalty:"Strict liability $1,000-$5,000 per violation, per user", source:"BIPA / CUBI" },
    "EXT.05": { plain:"Your product operates in financial markets or algorithmic trading", penalty:"Broker license revocation + systemic intervention", source:"SEBI / SEC / IOSCO" },
    "EXT.06": { plain:"Your product is accessible to users under 18", penalty:"$15,000 per day per violation + private right of action", source:"COPPA / State Minor Laws" },
    "EXT.07": { plain:"Your product makes HR, hiring, or workforce decisions", penalty:"Direct discrimination liability + civil penalties", source:"NYC LL 144 / Employment Law" },
    "EXT.08": { plain:"Your product is consumer-facing (B2C)", penalty:"Uncapped FTC disgorgement + state UDAP actions", source:"FTC Act / State Consumer Law" },
    "EXT.09": { plain:"Your product sells to enterprise businesses (B2B)", penalty:"Uncapped contract damages (reliance/wasted costs)", source:"UCC Art. 2 + Commercial Law" },
    "EXT.10": { plain:"Your model trains on third-party scraped corpora", penalty:"Up to $150,000 per work (willful) + model destruction", source:"Copyright Act / Fair Use Doctrine" }
};

// ── V5.7: DOCUMENT MANIFEST DESCRIPTIONS ────────────────────────────────
const DOC_DESCRIPTIONS = {
    DOC_TOS:  "Defines what you owe, caps what you pay, and makes your customer agreements enforceable.",
    DOC_AGT:  "Limits your exposure when your AI acts autonomously — boundaries on agent liability.",
    DOC_AUP:  "Sets the rules for how users interact with your AI — protects you when they misuse it.",
    DOC_DPA:  "Governs how you handle other people's data — required for every EU customer and enterprise deal.",
    DOC_SLA:  "Defines uptime commitments and what happens when your AI goes down — prevents uncapped service credits.",
    DOC_PP:   "Tells users what data you collect and why — the document regulators check first.",
    DOC_PBK:  "Your playbook for negotiating enterprise contracts — know what to hold, what to flex.",
    DOC_HND:  "Controls what your team can and can't do with AI tools — stops IP leaks before they happen.",
    DOC_IP:   "Ensures everything your team builds with AI belongs to you — not to them, not to the model provider.",
    DOC_SOP:  "Defines when a human must review AI output — your defense against 'the AI decided' liability.",
    DOC_DPIA: "Maps every risk your AI creates before regulators find it — required in the EU, smart everywhere.",
    DOC_SCAN: "Finds every unauthorized AI tool your team is using today — the gaps you don't know about yet."
};
// ── V5.8: V2 REGISTRY THREAT_TO_DOC MAPPING ───────────────────────────
const THREAT_TO_DOC = {
    'UNI_CNS_001':'DOC_TOS','UNI_CNS_002':'DOC_TOS','UNI_CNS_003':'DOC_TOS','UNI_CNS_004':'DOC_TOS','UNI_CNS_005':'DOC_TOS','UNI_CNS_006':'DOC_TOS','UNI_CNS_007':'DOC_TOS',
    'UNI_LIA_001':'DOC_TOS','UNI_LIA_002':'DOC_TOS','UNI_LIA_003':'DOC_TOS','UNI_LIA_004':'DOC_TOS','UNI_LIA_005':'DOC_TOS','UNI_LIA_006':'DOC_TOS','UNI_LIA_007':'DOC_TOS',
    'UNI_HAL_001':'DOC_TOS','UNI_HAL_002':'DOC_TOS','UNI_HAL_003':'DOC_TOS','UNI_HAL_004':'DOC_TOS',
    'UNI_INF_001':'DOC_TOS','UNI_INF_002':'DOC_TOS','UNI_INF_003':'DOC_TOS','UNI_INF_004':'DOC_AUP',
    'UNI_PRV_001':'DOC_DPA','UNI_PRV_002':'DOC_DPA','UNI_PRV_003':'DOC_DPA',
    'UNI_DEC_001':'DOC_AUP','UNI_FRD_001':'DOC_AUP','UNI_FRD_002':'DOC_AUP',
    'I02_DEC_001':'DOC_AGT','I02_DEC_002':'DOC_AUP','I02_DEC_003':'DOC_TOS','I02_DEC_004':'DOC_AUP','I02_DEC_005':'DOC_AUP','I02_DEC_006':'DOC_TOS','I02_DEC_007':'DOC_AUP','I02_DEC_008':'DOC_TOS','I02_DEC_009':'DOC_AUP','I02_DEC_010':'DOC_AUP',
    'I02_HRM_001':'DOC_TOS','I02_HRM_002':'DOC_AUP','I02_FRD_001':'DOC_AUP',
    'I03_HRM_001':'DOC_AUP','I03_HRM_002':'DOC_TOS','I03_HRM_003':'DOC_TOS','I03_HRM_004':'DOC_AUP','I03_HRM_005':'DOC_TOS','I03_HRM_006':'DOC_TOS','I03_HRM_007':'DOC_AUP',
    'I04_INF_001':'DOC_TOS','I04_INF_002':'DOC_AUP','I04_INF_003':'DOC_AUP','I04_INF_004':'DOC_AUP','I04_INF_005':'DOC_TOS',
    'I05_INF_001':'DOC_TOS','I05_INF_002':'DOC_TOS','I05_INF_003':'DOC_DPA','I05_PRV_001':'DOC_DPA','I05_PRV_002':'DOC_DPA',
    'I06_PRV_001':'DOC_DPA','I06_PRV_002':'DOC_DPA','I06_PRV_003':'DOC_DPA','I06_LIA_001':'DOC_SLA',
    'I07_BIO_001':'DOC_AUP','I07_BIO_002':'DOC_AUP','I07_BIO_003':'DOC_AUP','I07_BIO_004':'DOC_AUP',
    'I08_LIA_001':'DOC_TOS','I08_LIA_002':'DOC_TOS','I08_LIA_003':'DOC_AGT','I08_LIA_004':'DOC_AGT',
    'I09_TRD_001':'DOC_TOS','I09_TRD_002':'DOC_AGT','I09_TRD_003':'DOC_TOS','I09_TRD_004':'DOC_AUP',
    'I10_LIA_001':'DOC_TOS','I10_LIA_002':'DOC_TOS'
};
const VELOCITY_DISPLAY = {
    "Immediate": "Active Now", "High": "This Year",
    "Upcoming":  "Incoming",   "Pending": "Watch"
};

// ── 03. GAP REGISTRY ────────────────────────────────────────────────────
// GLOBAL / UNIVERSAL
GAP_SPECHT.threatId = "UNI_CNS_001";
GAP_MOFFATT.threatId = "UNI_HAL_001";
GAP_SCHREMS.threatId = "UNI_PRV_001";
GAP_BARTZ.threatId = "UNI_INF_001";
GAP_WARRANTY.threatId = "UNI_LIA_004";
GAP_SHADOW.threatId = null; 

// ARCHETYPES
GAP_UETA.threatId = "UNI_LIA_007";           // Dropped INT01_AGT, moved to UNI_LIA
GAP_MOBLEY.threatId = "I02_DEC_001";         // The Judge - Vendor Immunity
GAP_CREATOR.threatId = "I04_INF_001";        // The Creator - Copyright Collapse
GAP_FTC.threatId = "I05_PRV_001";            // The Reader - Disgorgement
GAP_BIPA.threatId = "I07_BIO_001";           // The Translator - Voiceprint
GAP_COMPANION.threatId = "I03_HRM_002";      // The Companion - Memory Pathologization

// V5.7 NEW GAPS
GAP_OPTIMIZER.threatId = "UNI_HAL_003";      // Tort Negligence for Output (Closest V2 Match)
GAP_MOVER.threatId = "I10_LIA_001";          // The Mover - Bodily Injury
GAP_SHIELD.threatId = "I08_LIA_001";         // The Shield - False Negative
GAP_ROUTER.threatId = "I06_LIA_001";         // The Orchestrator - SLA Breach
GAP_PERSUASION.threatId = "I03_HRM_003";     // Psychological Manipulation

// ── 04. QUESTION BANK ───────────────────────────────────────────────────

// ── LAYER 1: GLOBAL (always served — 5 questions) ───────────────────────
const Q_GLOBAL = [
    {
        q: "When someone lands on your product for the first time — do they click 'I Agree' before they start using it, or do they just... start?",
        gap: GAP_SPECHT,
        options: [
            { t:"They hit a hard gate — checkbox or button, can't proceed without it.", pts:0 },
            { t:"There's a line somewhere saying 'by using this you agree' but no actual click required.", pts:30 },
            { t:"No formal agreement step — they just sign up and get access.", pts:50 },
            { t:"I'd have to check with engineering — I'm not actually sure how the signup flow works.", pts:60, unsure:true }
        ]
    },
    {
        q: "Your AI gives someone wrong information and they lose money because of it. What does your contract actually say happens next?",
        gap: GAP_MOFFATT,
        options: [
            { t:"We have explicit AI-specific waivers — the user clicked through before first use.", pts:0 },
            { t:"There's a small disclaimer somewhere near the chat saying AI can be wrong.", pts:30 },
            { t:"We use standard software terms — we're assuming those hold up for AI too.", pts:50 },
            { t:"We haven't specifically addressed AI errors in our contracts yet.", pts:60, unsure:true }
        ]
    },
    {
        q: "If you have users in Europe — where does their data actually go when it hits your AI pipeline?",
        gap: GAP_SCHREMS,
        options: [
            { t:"EU data stays on EU servers. We have the contractual clauses locked in.", pts:0 },
            { t:"We have a GDPR privacy policy, but the API calls go to OpenAI or Anthropic's US servers by default.", pts:30 },
            { t:"Everything routes to whatever endpoint is fastest — we don't restrict by geography.", pts:50 },
            { t:"Honestly I don't know the exact routing path our data takes.", pts:60, unsure:true }
        ]
    },
    {
        q: "You're built on OpenAI, Anthropic, or another foundation model. If they get hit with a copyright lawsuit over their training data — does anything in your contract separate you from that?",
        gap: GAP_BARTZ,
        options: [
            { t:"Yes — we have explicit pass-through clauses that insulate us from upstream IP liability.", pts:0 },
            { t:"We use their standard API terms and assume their legal issues stay their legal issues.", pts:30 },
            { t:"Nothing in our contracts addresses this at all.", pts:50 },
            { t:"I don't know if our contracts cover upstream model liability.", pts:60, unsure:true }
        ]
    },
    {
        q: "Where does your 'we're not liable for this' language actually live in your terms — and how is it formatted?",
        gap: GAP_WARRANTY,
        options: [
            { t:"It's in ALL CAPS in a dedicated section that users can't miss.", pts:0 },
            { t:"It's in there, but formatted the same as everything else — regular sentence case.", pts:30 },
            { t:"We have a general limitation of liability clause but nothing AI-specific.", pts:50 },
            { t:"I'd have to pull up our terms to check — I'm not sure how it's formatted.", pts:60, unsure:true }
        ]
    }
];

// ── LAYER 2: INTERNAL (served if operational lane selected) ─────────────
const Q_INTERNAL = {
    q: "Right now, today — can your employees paste your source code or a client's data into ChatGPT and walk out the door with it?",
    gap: GAP_SHADOW,
    options: [
        { t:"No — technical blocks, enterprise tools only, and everyone's signed IP assignment agreements.", pts:0 },
        { t:"We have a policy that says don't do it, but nothing actually stops them technically.", pts:30 },
        { t:"Yes — the team uses whatever AI tools they want, no restrictions.", pts:50 },
        { t:"I genuinely don't know what AI tools people are using or what they're feeding into them.", pts:60, unsure:true }
    ]
};

// ── LAYER 3: ARCHETYPE QUESTIONS (fill remaining slots to reach 10) ─────
const Q_META = {
    actions: [
        {
            q: "If your AI starts making decisions or spending money on a loop at 3am — what actually stops it?",
            gap: GAP_UETA,
            options: [
                { t:"Hard limit — it hits a cap and shuts down until a human resets it.", pts:0 },
                { t:"We get an alert if something spikes, but there's no automatic kill.", pts:30 },
                { t:"Nothing hard — it runs until the task is done.", pts:50 },
                { t:"I'd have to check — I don't know if there's a hard cap in place.", pts:60, unsure:true }
            ]
        },
        {
            q: "Your AI recommends something to a customer — a product, a strategy, a vendor, a hire — and that recommendation costs them real money. What does your contract say you owe them?",
            gap: GAP_OPTIMIZER,
            options: [
                { t:"We have an explicit clause capping our exposure for AI-generated recommendations — the customer signs off on it.", pts:0 },
                { t:"Our general limitation of liability clause covers this, but nothing specifically mentions AI recommendations.", pts:30 },
                { t:"We don't have anything in the contract about what happens when a recommendation goes wrong.", pts:50 },
                { t:"I'm not sure if our contracts address recommendation liability at all.", pts:60, unsure:true }
            ]
        },
        {
            q: "Your AI controls something in the physical world — a robot, a vehicle, a drone, a wearable, a piece of equipment. If it causes injury or property damage, does your contract put a ceiling on what you pay?",
            gap: GAP_MOVER,
            options: [
                { t:"Yes — explicit product liability cap, mandatory insurance requirement, and human override architecture documented.", pts:0 },
                { t:"We have general liability limits but nothing specific to physical harm from AI-controlled systems.", pts:30 },
                { t:"No — our contracts don't address physical harm scenarios at all.", pts:50 },
                { t:"I don't know if our contracts cover this — we haven't thought about the physical liability angle.", pts:60, unsure:true }
            ]
        }
    ],
    evaluates: [
        {
            q: "If your AI makes a wrong call about a person — a bad hire, a missed fraud flag, a denied claim — who does your contract say is responsible for that?",
            gap: GAP_MOBLEY,
            options: [
                { t:"Contract explicitly shifts audit and final-decision liability to the client.", pts:0 },
                { t:"We recommend human review but the contract doesn't assign liability clearly.", pts:30 },
                { t:"We built the model so we'd be on the hook — it's our system.", pts:50 },
                { t:"I'm not sure our contracts actually address this.", pts:60, unsure:true }
            ]
        },
        {
            q: "Your AI is supposed to catch something — fraud, a security breach, a compliance violation, a safety risk. It misses. Your client gets hit. What does your contract say about who pays for the fallout?",
            gap: GAP_SHIELD,
            options: [
                { t:"Explicit limitation — our exposure is capped at fees paid, and the contract says we don't guarantee detection of every threat.", pts:0 },
                { t:"We have a general disclaimer that our system isn't perfect, but nothing caps what we'd owe if a miss causes real damage.", pts:30 },
                { t:"Nothing in the contract addresses what happens when we miss something — the client assumes we catch everything.", pts:50 },
                { t:"I haven't thought about what our contract says if the AI fails to detect a real threat.", pts:60, unsure:true }
            ]
        }
    ],
    creates: [
        {
            q: "When your AI produces an output — generated text, a summary, a transcription, code — does your contract say who owns it and what you're liable for if it's wrong or stolen?",
            gap: GAP_CREATOR,
            options: [
                { t:"Yes — explicit ownership assignment and AI-specific liability limits, both.", pts:0 },
                { t:"Standard software terms — we haven't written anything specific to AI outputs.", pts:30 },
                { t:"Nothing in our contracts addresses AI output ownership or liability at all.", pts:50 },
                { t:"I'd have to pull up the contracts — not sure what they say.", pts:60, unsure:true }
            ]
        },
        {
            q: "Does your system pull data from the web, scrape documents, or ingest content from sources outside your own platform?",
            gap: GAP_FTC,
            options: [
                { t:"Yes — licensed sources only, robots.txt compliant, with documented provenance for everything we ingest.", pts:0 },
                { t:"We pull public data but stay away from sites with heavy bot protection.", pts:30 },
                { t:"Yes — we go wherever the data is, including through anti-bot measures or unverified sources.", pts:50 },
                { t:"I don't know the full details of what our pipeline actually ingests or where it comes from.", pts:60, unsure:true }
            ]
        },
        {
            q: "Your AI processes human voice — transcribing calls, generating speech, analyzing tone, or identifying speakers. Do you have explicit written consent from every person whose voice enters your system?",
            gap: GAP_BIPA,
            options: [
                { t:"Yes — written consent collected before any voice processing begins, with explicit disclosure of what we do with the audio.", pts:0 },
                { t:"We have a general terms acceptance, but nothing specific to voice processing or biometric data.", pts:30 },
                { t:"No — voice data flows in through meetings, uploads, or API calls with no specific consent step.", pts:50 },
                { t:"I don't know what consent we collect for voice data specifically.", pts:60, unsure:true }
            ]
        },
        {
            q: "Under the hood, your product calls other AI models or APIs — OpenAI, Anthropic, Google, open-source models, third-party tools. If one of them produces something harmful, wrong, or illegal — who does your contract say pays for that?",
            gap: GAP_ROUTER,
            options: [
                { t:"We have explicit pass-through clauses — downstream provider liability flows back to them, not us.", pts:0 },
                { t:"We use their standard API terms and assume their liability stays with them, but our contract with customers doesn't address it.", pts:30 },
                { t:"Nothing in our contracts distinguishes between our output and a downstream model's output — we'd be on the hook for all of it.", pts:50 },
                { t:"I don't actually know which models we call downstream or what our liability looks like if one of them fails.", pts:60, unsure:true }
            ]
        }
    ],
    talks: [
        {
            q: "If your AI builds an ongoing relationship with a user — remembers their history, adapts to their personality — what happens in your contract when that goes wrong?",
            gap: GAP_COMPANION,
            options: [
                { t:"Explicit crisis break clauses, reality grounding requirements, and hard limits on emotional dependency language.", pts:0 },
                { t:"Standard chatbot disclaimers — nothing specifically about persistent AI relationships or mental health risk.", pts:30 },
                { t:"Our AI is designed to build strong ongoing bonds — no specific guardrails in the contract.", pts:50 },
                { t:"I haven't thought about what the contract says about this specifically.", pts:60, unsure:true }
            ]
        },
        {
            q: "Does your AI adapt how it talks to people based on their behavior — using urgency, emotional language, personalized nudges, or persistent follow-ups to drive them toward a decision?",
            gap: GAP_PERSUASION,
            options: [
                { t:"Yes, but we disclose the AI identity, the commercial intent, and give users a clear opt-out from persuasion features.", pts:0 },
                { t:"The AI adapts its tone and approach, but we don't explicitly disclose that to users anywhere.", pts:30 },
                { t:"Yes — the AI is designed to be persuasive and build emotional connection. No disclosure or opt-out exists.", pts:50 },
                { t:"I'm not sure how much the AI adapts its communication style or whether users know about it.", pts:60, unsure:true }
            ]
        }
    ]
};

// ── 05. STATE ───────────────────────────────────────────────────────────
const urlParams  = new URLSearchParams(window.location.search);
const pidFromUrl = urlParams.get('pid');

let prospectData      = null;
let selectedLanes     = [];
let selectedArchs     = [];
let totalScore        = 0;
let unsureFlag        = false;
let activeGaps        = [];
let trippedSurfaces   = new Set();
let quizRoute         = [];
let currentQIndex     = 0;
let vaultInputs       = [];
let recommendedPlan   = null;
let activePlan        = null;
let engagementRefCode = "";

// ── 06. HELPERS ─────────────────────────────────────────────────────────
function addExt(extStr) {
    if (!extStr) return;
    extStr.split(',').map(e => e.trim()).forEach(e => { if (e) trippedSurfaces.add(e); });
}
function truncatePain(pain, max = 110) {
    if (!pain) return '';
    return pain.length > max ? pain.substring(0, max) + '…' : pain;
}

// V5.7: Fixed getDocId — only returns DOC_ prefixed IDs
function getDocId(theFix, threatId) {
    if (threatId && THREAT_TO_DOC[threatId]) return THREAT_TO_DOC[threatId];
    if (theFix) {
        const match = theFix.match(/DOC_[A-Z]+/);
        if (match) return match[0];
    }
    return '—';
}

function velDisplay(v) { return VELOCITY_DISPLAY[v] || v; }
function sevClasses(s) {
    switch ((s || '').toUpperCase()) {
        case 'NUCLEAR':  return 'bg-danger/10 text-danger border border-danger/20';
        case 'CRITICAL': return 'bg-orange-500/10 text-orange-500 border border-orange-500/20';
        default:         return 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20';
    }
}

// V5.7: Updated source badge — uses actual evidence_source
function sourceBadge(g) {
    if (g.source === 'dual-verified') {
        const evidSrc = g.evidence_source || g.evidence?.found || g.evidence?.source || '';
        const srcLabel = evidSrc ? evidSrc.replace(/\[FOUND:.*?\]/g,'').replace(/\[ABSENT:.*?\]/g,'').trim().substring(0,60) : 'Public + Internal';
        return `<span class="inline-block mt-1 text-[9px] tracking-widest uppercase text-danger font-bold"><span class="opacity-50">VERIFIED:</span> ${srcLabel}</span>`;
    }
    if (g.source === 'scrape' || (g.evidence && (g.evidence.found || g.evidence.source))) {
        const evidSrc = g.evidence_source || g.evidence?.source || '';
        const srcLabel = evidSrc ? evidSrc.substring(0,60) : 'Public Document';
        return `<span class="inline-block mt-1 text-[9px] tracking-widest uppercase text-[#60a5fa] font-bold"><span class="opacity-50">FOUND IN:</span> ${srcLabel}</span>`;
    }
    if (!g.dualVerifiable)
        return `<span class="inline-block mt-1 text-[9px] tracking-widest uppercase text-gold font-bold"><span class="opacity-50">SOURCE:</span> INTERNAL AUDIT</span>`;
    return `<span class="inline-block mt-1 text-[9px] tracking-widest uppercase text-gold font-bold"><span class="opacity-50">SOURCE:</span> INTERNAL AUDIT</span>`;
}
// V5.8: TIER TRANSLATOR (Maps V2 Registry T1-T5 to UI)
const TIER_MAP = {
    'T1': { label: 'EXTINCTION', class: 'bg-danger/10 text-danger border border-danger/20', weight: 5 },
    'T2': { label: 'NUCLEAR',    class: 'bg-danger/10 text-danger border border-danger/20', weight: 4 },
    'T3': { label: 'CRITICAL',   class: 'bg-orange-500/10 text-orange-500 border border-orange-500/20', weight: 3 },
    'T4': { label: 'CRITICAL',   class: 'bg-orange-500/10 text-orange-500 border border-orange-500/20', weight: 2 },
    'T5': { label: 'HIGH',       class: 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20', weight: 1 }
};

function getTier(g) {
    const raw = (g.painTier || g.Pain_Tier || g.severity || 'T5').toUpperCase();
    return TIER_MAP[raw] || TIER_MAP['T5']; 
}
function evidenceBlock(g) {
    if (!g.evidence || (!g.evidence.found && !g.evidence.source && !g.evidence.reason)) return '';
    const found = g.evidence.found || g.evidence.source || '';
    const reason = g.evidence.connection || g.evidence.reason || '';
    if (!found && !reason) return '';
    return `
    <div class="mt-3 p-2 bg-[#050505] border border-white/10 font-mono text-[10px] text-marble/70 leading-relaxed">
        ${found ? `<div><span class="text-gold font-bold">&gt; EVIDENCE:</span> ${found.substring(0,200)}${found.length>200?'…':''}</div>` : ''}
        ${reason ? `<div class="mt-1"><span class="text-danger font-bold">&gt; CONNECTION:</span> ${reason.substring(0,200)}${reason.length>200?'…':''}</div>` : ''}
    </div>`;
}

// ── 07. INITIALIZATION — V5.8 ──────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {

    let pidBypassed = false;

    if (pidFromUrl) {
        localStorage.setItem('ln_pid', pidFromUrl);
        engagementRefCode = `LN-2026-${pidFromUrl.toUpperCase()}`;
        try {
            const snap = await getDoc(doc(db, "prospects", pidFromUrl));
            if (snap.exists()) {
                prospectData = snap.data();

                if (prospectData.email) localStorage.setItem('ln_email', prospectData.email);
                if (prospectData.company) localStorage.setItem('ln_company', prospectData.company);

                await setDoc(doc(db, "prospects", pidFromUrl), {
                    scannerClicked: true,
                    scannerStep:    'page_loaded',
                    scannerStepAt:  serverTimestamp(),
                    status:         'ENGAGED',
                    lastActive:     serverTimestamp()
                }, { merge: true });

                try {
                    const leadDocId = prospectData.email
                        ? prospectData.email.replace(/[^a-zA-Z0-9@._-]/g, '').toLowerCase()
                        : pidFromUrl;
                    await setDoc(doc(db, "leads", leadDocId), {
                        email:     prospectData.email || '',
                        company:   prospectData.company || '',
                        source:    'scanner_pid_bypass_v5.8',
                        status:    'warm_lead',
                        scannerClicked: true,
                        createdAt: serverTimestamp()
                    }, { merge: true });
                } catch(err) { console.error("PID bypass lead write:", err); }

                // ── BUILD PERSONALIZED HERO ──────────────────────────
                const founderFirst = (prospectData.founderName || prospectData.name || '').split(' ')[0] || 'there';
                const compName     = prospectData.company || 'your company';
                const gapCount     = (prospectData.forensicGaps || []).length;

                document.getElementById('pid-greeting').innerText = `Hi ${founderFirst},`;
                document.getElementById('pid-headline').innerText = `${compName}'s AI Architecture Audit`;

                if (gapCount > 0) {
                    let nuc = 0, crit = 0, high = 0;
                    prospectData.forensicGaps.forEach(g => {
                        const s = (g.severity || '').toUpperCase();
                        if (s === 'NUCLEAR') nuc++;
                        else if (s === 'CRITICAL') crit++;
                        else high++;
                    });

                    document.getElementById('pid-body').innerText =
                        `We reviewed ${compName}'s public legal architecture and mapped ${gapCount} structural gaps across your setup. This scanner confirms which ones are active inside your actual operations.`;

                    let badgeHTML = '';
                    if (nuc)  badgeHTML += `<span class="bg-danger/10 border border-danger/20 px-3 py-1 text-[9px] text-danger font-bold tracking-widest">${nuc} NUCLEAR</span>`;
                    if (crit) badgeHTML += `<span class="bg-orange-500/10 border border-orange-500/20 px-3 py-1 text-[9px] text-orange-500 font-bold tracking-widest">${crit} CRITICAL</span>`;
                    if (high) badgeHTML += `<span class="bg-yellow-500/10 border border-yellow-500/20 px-3 py-1 text-[9px] text-yellow-500 font-bold tracking-widest">${high} HIGH</span>`;
                    document.getElementById('pid-badges').innerHTML = badgeHTML;
                    document.getElementById('pid-intel-detail').innerText =
                        `${gapCount} gaps identified from public documents, product pages, and legal terms. The scanner cross-references these against your internal setup.`;
                    document.getElementById('pid-intel').classList.remove('hidden-state');
                } else {
                    document.getElementById('pid-body').innerText =
                        `This scanner maps the structural gaps in ${compName}'s AI legal architecture. 10 questions, 90 seconds — confirms where your setup stands today.`;
                }

                // ── PRE-SELECT CONFIG FROM FIRESTORE ────────────────
                // Lanes
                const plan = prospectData.intendedPlan || 'agentic_shield';
                if (plan === 'complete_stack') {
                    selectedLanes = ['commercial', 'operational'];
                } else if (plan === 'workplace_shield') {
                    selectedLanes = ['operational'];
                } else {
                    selectedLanes = ['commercial'];
                }

                // Archetypes — map INT codes to arch groups
                const archMap = {
                    'INT.01': 'actions', 'INT.09': 'actions', 'INT.10': 'actions',
                    'INT.02': 'evaluates', 'INT.08': 'evaluates',
                    'INT.04': 'creates', 'INT.05': 'creates', 'INT.06': 'creates', 'INT.07': 'creates',
                    'INT.03': 'talks'
                };
                const archSet = new Set();
                (prospectData.primaryArchetype || []).forEach(code => {
                    if (archMap[code]) archSet.add(archMap[code]);
                });
                // If no archetypes in data, default to 'creates' (safest broad coverage)
                if (archSet.size === 0) archSet.add('creates');
                selectedArchs = Array.from(archSet);

                // Show the hero
                document.getElementById('pid-hero').classList.remove('hidden-state');

               // Remove loading state — hero is now populated
                document.getElementById('pid-hero').classList.remove('pid-hero-loading');

                // Wire the start button to skip config and go straight to quiz
                document.getElementById('pid-start-btn').addEventListener('click', () => {
                    setDoc(doc(db, "prospects", pidFromUrl), {
                        scannerStep: 'config_complete', scannerStepAt: serverTimestamp()
                    }, { merge: true }).catch(() => {});
                    startDiagnostic();
                });

                pidBypassed = true;
            } else {
                // PID not found in Firestore — fall back to normal flow
                const emailField = document.getElementById('entry-email');
                if (emailField) emailField.placeholder = "you@company.com";
                // Unhide entry gate (CSS hid it for pid-mode)
                document.getElementById('entry-gate').style.display = '';
            }
        } catch(e) {
            console.error("PID lookup:", e);
            // On error, fall back to normal flow
            document.getElementById('entry-gate').style.display = '';
        }
    } else {
        engagementRefCode = `LN-2026-${Math.floor(Math.random() * 90000) + 10000}`;
    }

    // ── NON-PID FLOW: terminal greeting + config (unchanged) ────────
    if (!pidBypassed) {
        document.getElementById('greeting-box').style.opacity = "1";
        setTimeout(() => {
            const ui = document.getElementById('config-ui');
            ui.classList.remove('hidden-state');
            void ui.offsetWidth;
            ui.style.opacity = "1";
        }, 2000);
    }

    // Lane toggles (still needed for non-PID visitors)
    document.querySelectorAll('.lane-toggle').forEach(btn => {
        btn.addEventListener('click', e => {
            const v = e.currentTarget.getAttribute('data-lane');
            e.currentTarget.classList.toggle('selected');
            e.currentTarget.classList.toggle('border-gold');
            e.currentTarget.classList.toggle('bg-gold/5');
            e.currentTarget.querySelector('.label-text')?.classList.toggle('text-gold');
            selectedLanes = selectedLanes.includes(v)
                ? selectedLanes.filter(l => l !== v)
                : [...selectedLanes, v];
            checkConfig();
        });
    });

    // Arch toggles (still needed for non-PID visitors)
    document.querySelectorAll('.arch-toggle').forEach(btn => {
        btn.addEventListener('click', e => {
            const v = e.currentTarget.getAttribute('data-arch');
            e.currentTarget.classList.toggle('selected');
            e.currentTarget.classList.toggle('border-gold');
            e.currentTarget.classList.toggle('bg-gold/5');
            e.currentTarget.querySelector('.label-text')?.classList.toggle('text-gold');
            selectedArchs = selectedArchs.includes(v)
                ? selectedArchs.filter(a => a !== v)
                : [...selectedArchs, v];
            checkConfig();
        });
    });

    function checkConfig() {
        const ok  = selectedLanes.length > 0 && selectedArchs.length > 0;
        const btn = document.getElementById('btn-start');
        btn.disabled = !ok;
        btn.classList.toggle('opacity-30',         !ok);
        btn.classList.toggle('cursor-not-allowed', !ok);
    }

    document.getElementById('btn-start').addEventListener('click', startDiagnostic);
});
// ── 08. ENTRY GATE ──────────────────────────────────────────────────────
document.getElementById('entry-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = document.getElementById('entry-submit-btn');
    btn.disabled   = true;
    btn.innerText  = "Verifying...";

    const email   = document.getElementById('entry-email').value.trim().toLowerCase();
    const company = document.getElementById('entry-company').value.trim();

    localStorage.setItem('ln_email',   email);
    localStorage.setItem('ln_company', company);

    if (!prospectData) {
        try {
            const q = query(collection(db, "prospects"), where("email", "==", email));
            const snap = await getDocs(q);
            if (!snap.empty) {
                const matchDoc = snap.docs[0];
                prospectData = matchDoc.data();
                const matchId = matchDoc.id;
                engagementRefCode = `LN-2026-${matchId.toUpperCase()}`;
                await setDoc(doc(db, "prospects", matchId), {
                    scannerClicked: true,
                    status:         'ENGAGED',
                    lastActive:     serverTimestamp()
                }, { merge:true });
            }
        } catch(err) { console.error("Entry gate prospect lookup:", err); }
    } else {
        try {
            await setDoc(doc(db, "prospects", pidFromUrl), {
                scannerClicked: true,
                status:         'ENGAGED',
                lastActive:     serverTimestamp()
            }, { merge:true });
        } catch(err) { console.error("PID scannerClicked write:", err); }
    }

    try {
        const docId = email.replace(/[^a-zA-Z0-9@._-]/g, '').toLowerCase();
        await setDoc(doc(db, "leads", docId), {
            email, company,
            source:    'scanner_entry_v5.7',
            status:    'warm_lead',
            createdAt: serverTimestamp()
        }, { merge:true });
    } catch(err) { console.error("Entry lead write:", err); }

    document.getElementById('entry-gate').classList.add('hidden-state');

    const greetName = prospectData?.founderName || prospectData?.name || email.split('@')[0] || "Guest";
    const greetComp = prospectData?.company || company || "Unknown";
    document.getElementById('founder-greet').innerText = greetName;
    document.getElementById('company-greet').innerText = greetComp;
    document.getElementById('term-name').classList.remove('hidden-state');
    document.getElementById('term-comp').classList.remove('hidden-state');
    // ── DISMISS LOADER ──────────────────────────────────────────
    clearInterval(window._lnMsgInterval);
    const _loader = document.getElementById('ln-loader');
    if (_loader) {
        _loader.style.opacity = '0';
        setTimeout(() => _loader.remove(), 400);
    }

    document.getElementById('greeting-box').style.opacity = "1";

    setTimeout(() => {
        const ui = document.getElementById('config-ui');
        ui.classList.remove('hidden-state');
        void ui.offsetWidth;
        ui.style.opacity = "1";
    }, 300);
});

// ── 09. QUIZ ENGINE — V5.7: ALWAYS 10 QUESTIONS ────────────────────────
const ARCH_PRIORITY = ['actions', 'evaluates', 'creates', 'talks'];
const ARCH_ALL_QUESTIONS = [];
ARCH_PRIORITY.forEach(arch => {
    if (Q_META[arch]) Q_META[arch].forEach(q => ARCH_ALL_QUESTIONS.push({ ...q, _arch: arch }));
});

function startDiagnostic() {
    const TARGET = 10;
    quizRoute = [...Q_GLOBAL]; // 5 always

    // Track used question IDs to prevent duplicates
    const usedGapIds = new Set(Q_GLOBAL.map(q => q.gap?.id || ''));

    // Add internal if operational selected
    if (selectedLanes.includes('operational')) {
        quizRoute.push(Q_INTERNAL);
        usedGapIds.add(Q_INTERNAL.gap?.id || '');
    }

    // Phase 1: Selected archetype questions first
    const selectedPool = [];
    ARCH_PRIORITY.forEach(arch => {
        if (!selectedArchs.includes(arch) || !Q_META[arch]) return;
        Q_META[arch].forEach(q => {
            const gapId = q.gap?.id || q.gaps?.[0]?.id || '';
            if (!usedGapIds.has(gapId)) {
                selectedPool.push(q);
                usedGapIds.add(gapId);
            }
        });
    });

    // Phase 2: Fill remaining from unselected archetypes
    const unselectedPool = [];
    ARCH_PRIORITY.forEach(arch => {
        if (selectedArchs.includes(arch) || !Q_META[arch]) return;
        Q_META[arch].forEach(q => {
            const gapId = q.gap?.id || q.gaps?.[0]?.id || '';
            if (!usedGapIds.has(gapId)) {
                unselectedPool.push(q);
                usedGapIds.add(gapId);
            }
        });
    });

    // Combine: selected first, then unselected to fill
    const remaining = TARGET - quizRoute.length;
    const combined = [...selectedPool, ...unselectedPool];
    quizRoute.push(...combined.slice(0, remaining));

    // Safety: if somehow still under 10, we proceed with what we have
    currentQIndex = 0;
    switchState('state-intro', 'state-quiz');
    renderQuestion();
}

function renderQuestion() {
    const q = quizRoute[currentQIndex];
    document.getElementById('question-text').innerText  = q.q;
    document.getElementById('progress-text').innerText  = `Step ${currentQIndex + 1} of ${quizRoute.length}`;
    document.getElementById('progress-bar').style.width = `${((currentQIndex + 1) / quizRoute.length) * 100}%`;

    const container = document.getElementById('options-container');
    container.innerHTML = '';

    q.options.forEach(opt => {
        const btn       = document.createElement('button');
        btn.className   = "w-full text-left bg-[#080808] border border-shadow p-5 text-marble font-sans text-sm hover:border-gold hover:text-gold transition-all duration-300";
        btn.innerText   = opt.t;
        btn.addEventListener('click', () => {
            vaultInputs.push({ question:q.q, answer:opt.t, penalty:opt.pts });
            totalScore += opt.pts;
            if (opt.unsure) unsureFlag = true;

            if (opt.pts > 0) {
                if (q.gap && !activeGaps.find(g => g.threatId === q.gap.threatId || g.id === q.gap.id)) {
                    activeGaps.push({ ...q.gap, source:'scanner' });
                    addExt(q.gap.ext);
                }
                if (q.gaps) {
                    q.gaps.forEach(gap => {
                        if (!activeGaps.find(g => g.threatId === gap.threatId || g.id === gap.id)) {
                            activeGaps.push({ ...gap, source:'scanner' });
                            addExt(gap.ext);
                        }
                    });
                }
            }

          currentQIndex++;

            if (pidFromUrl) {
                setDoc(doc(db, "prospects", pidFromUrl), {
                    scannerStep: `answered_q${currentQIndex}`,
                    lastQuestionSeen: currentQIndex + 1,
                    scannerStepAt: serverTimestamp()
                }, { merge: true }).catch(() => {});
            }

            if (currentQIndex < quizRoute.length) renderQuestion();
            else finishDiagnostic();
        });
        container.appendChild(btn);
    });
}

// ── 10. FINISH DIAGNOSTIC ───────────────────────────────────────────────
async function finishDiagnostic() {
    if (pidFromUrl) {
        await setDoc(doc(db, "prospects", pidFromUrl), {
            scannerStep: 'quiz_complete', scannerStepAt: serverTimestamp()
        }, { merge: true }).catch(() => {});
    }

    switchState('state-quiz', 'state-dashboard');
    const email   = localStorage.getItem('ln_email')   || '';
    const company = localStorage.getItem('ln_company') || '';
    const docId   = pidFromUrl
        ? pidFromUrl
        : email.replace(/[^a-zA-Z0-9@._-]/g, '').toLowerCase();

    const payload = {
        email, company,
        scannerCompleted: true,
        scannerScore:     totalScore,
        vaultInputs,
        activeGaps,
        trippedSurfaces:  Array.from(trippedSurfaces),
        unsureFlag,
        lanes:            selectedLanes,
        metaVerbs:        selectedArchs,
        source:           'scanner_gate_v5.8',
        status:           'Hot',
        updatedAt:        serverTimestamp()
    };

    try {
        if (docId) {
            await setDoc(doc(db, "prospects", docId), payload, { merge:true });
            await setDoc(doc(db, "leads",     docId), payload, { merge:true });
        }
        fetch(GATE_WEBHOOK, {
            method:  'POST',
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify(payload)
        }).catch(() => {});
    } catch(err) { console.error("Scan write failed:", err); }

    buildDashboard();
}

// ── 11. DUAL-INTELLIGENCE DASHBOARD — V5.7 OVERHAUL ─────────────────────
function buildDashboard() {
    document.getElementById('main-wrap').classList.replace('max-w-3xl', 'max-w-6xl');

    const founderName = prospectData?.founderName || prospectData?.name || localStorage.getItem('ln_email')?.split('@')[0] || 'Founder';
    const companyName = prospectData?.company || localStorage.getItem('ln_company') || 'Your Company';

    let scrapeCount = 0, dualCount = 0;

    if (prospectData?.forensicGaps?.length) {
        prospectData.forensicGaps.forEach(sg => {
            addExt(sg.ext);
            if (sg.extSurfaces) sg.extSurfaces.forEach(e => trippedSurfaces.add(e));
            const existing = activeGaps.find(g =>
                (sg.threatId && g.threatId && g.threatId === sg.threatId) ||
                (sg.id       && g.id       && g.id       === sg.id)
            );
            if (!existing) {
                activeGaps.push({ ...sg, source:'scrape' });
                scrapeCount++;
            } else {
                existing.source = 'dual-verified';
                if (sg.evidence)        existing.evidence        = sg.evidence;
                if (sg.evidenceTier)    existing.evidenceTier    = sg.evidenceTier;
                if (sg.evidence_source) existing.evidence_source = sg.evidence_source;
                const w  = { NUCLEAR:3, CRITICAL:2, HIGH:1 };
                const hW = w[(sg.severity       || '').toUpperCase()] || 0;
                const sW = w[(existing.severity || '').toUpperCase()] || 0;
                if (hW > sW) existing.severity = sg.severity.toUpperCase();
                dualCount++;
            }
        });
    }

    activeGaps.forEach(g => { if (!g.source) g.source = 'scanner'; });

    const srcW = g => g.source === 'dual-verified' ? 3 : g.source === 'scrape' ? 2 : 1;
    activeGaps.sort((a, b) => {
        const sd = getTier(b).weight - getTier(a).weight;
        return sd !== 0 ? sd : srcW(b) - srcW(a);
    });

    // V5.8: Consolidated Counters
    let cExt = 0, cNuc = 0, cCrit = 0, cHigh = 0;
    activeGaps.forEach(g => {
        const t = getTier(g).label;
        if (t === 'EXTINCTION') cExt++;
        else if (t === 'NUCLEAR') cNuc++;
        else if (t === 'CRITICAL') cCrit++;
        else cHigh++;
    });

    // ── V5.7: SCALED VISIBILITY TIERS ───────────────────────────────────
    const total = activeGaps.length;
    let showFull, showBlur;
    if (total <= 4)       { showFull = 2; showBlur = 1; }
    else if (total <= 10) { showFull = 3; showBlur = 2; }
    else if (total <= 20) { showFull = 5; showBlur = 3; }
    else                  { showFull = 6; showBlur = 4; }
    const showTotal = showFull + showBlur;

    recommendedPlan = (selectedLanes.includes('commercial') && selectedLanes.includes('operational'))
        ? 'complete_stack'
        : selectedLanes.includes('operational') ? 'workplace_shield' : 'agentic_shield';
    activePlan = recommendedPlan;
    const pData = PLAN_DATA[activePlan];

    let statutoryExposure = 0;
    if (trippedSurfaces.size > 0) {
        trippedSurfaces.forEach(ext => { if (EXT_VALUES[ext]) statutoryExposure += EXT_VALUES[ext]; });
    } else {
        statutoryExposure = (totalScore * 8000) + 1000000;
    }
    const fmt = n => '$' + n.toLocaleString();

    const authorityText = (scrapeCount > 0 || dualCount > 0)
        ? `> CORRELATING PUBLIC ARCHITECTURE WITH INTERNAL CONFESSIONS...<br><br>> MERGE COMPLETE. <span class="text-white font-bold">${activeGaps.length} TOTAL VULNERABILITIES DETECTED.</span>`
        : `> ENGINE PROCESSED YOUR INPUTS.<br><br>> <span class="text-white font-bold">${activeGaps.length} STRUCTURAL GAPS IDENTIFIED</span> AGAINST YOUR ARCHITECTURE.`;

    let tripwireHTML = '';
    if (trippedSurfaces.size > 0) {
        tripwireHTML = Array.from(trippedSurfaces).map(ext => {
            const ref = EXT_REFERENCE[ext];
            const label = ref ? ref.plain : ext;
            return `
            <div class="bg-danger/10 border border-danger/30 p-4 mb-3">
                <p class="text-[9px] tracking-widest text-danger font-bold uppercase">🚨 ${ext} TRIPPED — ${label}</p>
            </div>`;
        }).join('');
    }

    // ── V5.7: BUILD GAP MATRIX ROWS WITH TIERS ─────────────────────────
    let matrixRows = activeGaps.length === 0
        ? `<tr><td colspan="6" class="p-6 text-center text-marble/50 font-sans text-xs">No structural gaps detected.</td></tr>`
        : '';

   activeGaps.forEach((g, i) => {
        if (i >= showTotal) return;
        const badge   = sourceBadge(g);
        const evBlock = evidenceBlock(g);
        const tierObj = getTier(g);
        const sc      = tierObj.class;
        const tierLbl = tierObj.label;
        const vd      = velDisplay(g.velocity);
        const docId   = getDocId(g.theFix, g.threatId);
        const docDesc = DOC_DESCRIPTIONS[docId] || '';
        const pain    = truncatePain(g.thePain);
        const gapNameStr = g.gapName || g.trap || '—';
        const isBlur  = i >= showFull;
        const expandId = `gap-expand-${i}`;
    // ── V5.8: THE VELVET ROPE BLUR LOGIC ──────────────────────────────
        let blurClass = '';
        let lockOverlay = '';

        if (index < 3) {
            // THE FREE KILLS: Fully visible
            blurClass = '';
        } else if (index === 3) {
            // THE TEASE: Partial blur, unreadable but tantalizing
            blurClass = 'blur-[3px] select-none opacity-80 pointer-events-none';
        } else {
            // THE LOCKOUT: Full blur
            blurClass = 'blur-md select-none opacity-30 pointer-events-none';
            
            // Only render the CTA overlay on the very first fully locked item (index 4)
            if (index === 4) {
                lockOverlay = `
                <div class="absolute inset-0 flex flex-col items-center justify-center z-10 p-4 text-center">
                    <div class="bg-black/90 border border-danger p-6 shadow-2xl">
                        <h4 class="text-danger font-bold text-lg uppercase mb-2">RESTRICTED ACCESS</h4>
                        <p class="text-sm text-gray-300 mb-4">You have ${activeGaps.length - 3} more active liabilities in your architecture. Legal access required to view complete threat mechanisms.</p>
                        <a href="offer-bundle.html?pid=${pidFromUrl}" class="inline-block bg-danger text-white px-6 py-3 font-bold uppercase tracking-widest hover:bg-white hover:text-black transition-all">Unlock Full Audit ($1,500)</a>
                    </div>
                </div>`;
            }
        }

        // Extract the terrifying backend prose (if it exists)
        const mechanismText = g.FP_Mechanism ? `<div class="mt-3 text-sm text-gray-300 font-mono"><strong>MECHANISM:</strong> ${g.FP_Mechanism}</div>` : '';
        const stakesText = (g.FP_Stakes && g.FP_Stakes !== 'NULL') ? `<div class="mt-2 text-sm text-danger font-bold uppercase tracking-wide"><strong>THE STAKES:</strong> ${g.FP_Stakes}</div>` : '';
        // ── DESKTOP ROW (hidden on mobile) ──────────────────────
        if (!isBlur) {
            matrixRows += `
            <tr class="matrix-row border-b border-white/5 hidden md:table-row">
                <td class="p-4 align-top"><span class="font-bold text-marble text-xs block">${gapNameStr}</span>${badge}</td>
                <td class="p-4 align-top"><span class="text-marble/70 text-[11px] leading-relaxed">${pain}</span></td>
                <td class="p-4 align-top">${evBlock || '<span class="text-marble/30 text-[10px]">Internal audit signal</span>'}</td>
                <td class="p-4 align-top"><span class="px-2 py-1 text-[9px] font-bold ${sc}">${tierLbl}</span></td>
                <td class="p-4 align-top text-marble/80 text-[10px] tracking-widest uppercase">${vd}</td>
                <td class="p-4 align-top"><span class="text-gold font-bold text-xs">${docId}</span>${docDesc?`<div class="text-[9px] text-marble/40 mt-1">${docDesc}</div>`:''}</td>
            </tr>`;
        } else {
            matrixRows += `
            <tr class="matrix-row border-b border-white/5 opacity-90 hidden md:table-row">
                <td class="p-4 align-top"><span class="font-bold text-marble text-xs block">${gapNameStr}</span>${badge}</td>
                <td class="p-4 align-top"><span class="text-marble/70 text-[11px] leading-relaxed" style="filter:blur(4px);user-select:none">${pain}</span></td>
                <td class="p-4 align-top"><span class="text-marble/30 text-[10px]" style="filter:blur(4px);user-select:none">${evBlock || 'Audit signal classified'}</span></td>
                <td class="p-4 align-top"><span class="px-2 py-1 text-[9px] font-bold ${sc}">${tierLbl}</span></td>
                <td class="p-4 align-top text-marble/80 text-[10px] tracking-widest uppercase">${vd}</td>
                <td class="p-4 align-top text-gold font-bold text-xs">${docId}</td>
            </tr>`;
        }

        // ── MOBILE CARD (hidden on desktop) ─────────────────────
        if (!isBlur) {
            matrixRows += `
            <tr class="md:hidden">
                <td colspan="6" class="p-0">
                    <div class="border-b border-white/5 p-4">
                        <div class="flex items-start justify-between gap-3 mb-2">
                            <span class="font-bold text-marble text-xs leading-tight flex-1">${gapNameStr}</span>
                            <span class="px-2 py-1 text-[9px] font-bold shrink-0 ${sc}">${tierLbl}</span>
                        </div>
                        <div class="text-marble/70 text-[11px] leading-relaxed mb-2">${pain}</div>
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-3">
                                <span class="text-gold font-bold text-[10px]">${docId}</span>
                                <span class="text-marble/40 text-[9px] uppercase tracking-widest">${vd}</span>
                            </div>
                            <button onclick="var el=document.getElementById('${expandId}');el.classList.toggle('hidden');this.textContent=el.classList.contains('hidden')?'Details ▸':'Hide ▴'" class="text-[9px] text-gold tracking-widest uppercase font-bold bg-transparent border border-gold/30 px-2 py-1 hover:bg-gold/10 transition-colors">Details ▸</button>
                        </div>
                        <div id="${expandId}" class="hidden mt-3 pt-3 border-t border-white/5">
                            <div class="mb-2">${badge}</div>
                            ${evBlock ? `<div class="mb-2">${evBlock}</div>` : ''}
                            ${docDesc ? `<div class="text-[9px] text-marble/40 leading-relaxed">${docDesc}</div>` : ''}
                        </div>
                    </div>
                </td>
            </tr>`;
        } else {
            matrixRows += `
            <tr class="md:hidden">
                <td colspan="6" class="p-0">
                    <div class="border-b border-white/5 p-4 opacity-90">
                        <div class="flex items-start justify-between gap-3 mb-2">
                            <span class="font-bold text-marble text-xs leading-tight flex-1">${gapNameStr}</span>
                            <span class="px-2 py-1 text-[9px] font-bold shrink-0 ${sc}">${tierLbl}</span>
                        </div>
                        <div class="text-marble/70 text-[11px] leading-relaxed mb-2" style="filter:blur(4px);user-select:none">${pain}</div>
                        <div class="flex items-center gap-3">
                            <span class="text-gold font-bold text-[10px]">${docId}</span>
                            <span class="text-marble/40 text-[9px] uppercase tracking-widest">${vd}</span>
                        </div>
                    </div>
                </td>
            </tr>`;
        }
    });

    // ── V5.7: ICEBERG — LOCKED GAPS ─────────────────────────────────────
    const redacted = activeGaps.length > showTotal ? activeGaps.length - showTotal : 0;
    const icebergHTML = redacted > 0 ? `
    <div class="bg-[#0a0a0a] border border-dashed border-danger/30 p-6 text-center mt-2">
        <div class="mb-3 text-danger">
            <svg class="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
            </svg>
        </div>
        <p class="text-[11px] tracking-widest text-danger uppercase mb-2 font-bold">🔒 [ ${redacted} ] ADDITIONAL THREAT VECTORS CLASSIFIED</p>
        <p class="text-[10px] text-marble/40 max-w-sm mx-auto">Combined forensic audit revealed ${redacted} further structural gaps across ${companyName}'s architecture. Full gap matrix unlocked upon engagement.</p>
    </div>` : '';

    // ── V5.7: EXPOSURE REFERENCE TABLE ──────────────────────────────────
    let exposureTableRows = '';
    const trippedArr = Array.from(trippedSurfaces).sort();
    trippedArr.forEach(ext => {
        const ref = EXT_REFERENCE[ext];
        if (!ref) return;
        exposureTableRows += `
        <tr class="border-b border-white/5">
            <td class="p-2 text-[9px] text-danger font-bold font-mono">${ext}</td>
            <td class="p-2 text-[10px] text-marble/70">${ref.plain}</td>
            <td class="p-2 text-[10px] text-marble font-bold">${ref.penalty}</td>
            <td class="p-2 text-[9px] text-marble/50 italic">${ref.source}</td>
        </tr>`;
    });

    const exposureRefHTML = trippedArr.length > 0 ? `
    <div class="mt-4">
        <button onclick="document.getElementById('exposure-detail').classList.toggle('hidden-state');this.innerText=this.innerText.includes('▸')?'▾ Hide calculation basis':'▸ How we calculated this'" class="text-[10px] text-gold tracking-widest uppercase font-bold cursor-pointer bg-transparent border-none hover:text-marble transition-colors">▸ How we calculated this</button>
        <div id="exposure-detail" class="hidden-state mt-3">
            <p class="text-[10px] text-marble/50 mb-3">Your architecture triggered ${trippedArr.length} regulatory surfaces. The table below shows the maximum statutory penalty for each. Your estimated exposure is the combined maximum across all triggered surfaces.</p>
            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="text-[8px] text-gold/60 uppercase tracking-widest border-b border-white/10">
                            <th class="p-2">Surface</th>
                            <th class="p-2">What It Means</th>
                            <th class="p-2">Maximum Penalty</th>
                            <th class="p-2">Statute</th>
                        </tr>
                    </thead>
                    <tbody>${exposureTableRows}</tbody>
                </table>
            </div>
        </div>
    </div>` : '';

    // ── V5.7: ARCHITECTURE MANIFEST WITH DESCRIPTIONS ───────────────────
    const KITS = {
        agentic: [
            { id:'DOC_TOS', n:'AI Terms of Service'     },
            { id:'DOC_AGT', n:'Agentic Addendum'        },
            { id:'DOC_AUP', n:'Acceptable Use Policy'   },
            { id:'DOC_DPA', n:'Data Processing Agreement'},
            { id:'DOC_SLA', n:'AI-Specific SLA'         },
            { id:'DOC_PP',  n:'Privacy Policy'           },
            { id:'DOC_PBK', n:'Negotiation Playbook'    }
        ],
        workplace: [
            { id:'DOC_HND',  n:'AI Employee Handbook'  },
            { id:'DOC_IP',   n:'IP Assignment Deed'    },
            { id:'DOC_SOP',  n:'HITL Protocol'         },
            { id:'DOC_DPIA', n:'Impact Assessment'     },
            { id:'DOC_SCAN', n:'Shadow AI Scanner'     },
            { id:'DOC_PBK',  n:'Negotiation Playbook'  }
        ]
    };

    const docsToRender = activePlan === 'complete_stack'
        ? [...KITS.agentic, ...KITS.workplace]
        : activePlan === 'workplace_shield' ? KITS.workplace : KITS.agentic;

    // Dedupe by id
    const seen = new Set();
    const dedupedDocs = docsToRender.filter(d => {
        if (seen.has(d.id)) return false;
        seen.add(d.id);
        return true;
    });

    const manifestHTML = dedupedDocs.map(d => `
    <div class="border-l-2 border-gold pl-3">
        <span class="text-[9px] text-gold uppercase font-bold block">${d.id}</span>
        <span class="text-xs text-marble block">${d.n}</span>
        <span class="text-[9px] text-marble/40 leading-relaxed block mt-1">${DOC_DESCRIPTIONS[d.id] || ''}</span>
    </div>`).join('');

    // ── V5.7: RENDER DASHBOARD ──────────────────────────────────────────
    document.getElementById('state-dashboard').innerHTML = `
    <div class="mb-12 text-center lg:text-left">
        <h1 class="font-serif text-4xl md:text-5xl text-marble mb-2">Structural Integrity Report</h1>
        <p class="font-serif text-xl md:text-2xl text-gold italic mb-2">${companyName}</p>
        <p class="font-sans text-xs text-marble/50">Prepared for <span class="text-marble/80 font-bold">${founderName}</span> · <span class="tracking-[0.3em] text-gold uppercase">Lex Nova Forensic Engine v5.7</span></p>
    </div>
    <div class="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-10 items-start">
        <div class="space-y-8">
            ${tripwireHTML}
            <div>
                <div class="flex gap-4 mb-4 flex-wrap">
                    <div class="bg-danger/10 border border-danger/20 px-3 py-1"><span class="text-[9px] text-danger font-bold tracking-widest">NUCLEAR: ${cN}</span></div>
                    <div class="bg-orange-500/10 border border-orange-500/20 px-3 py-1"><span class="text-[9px] text-orange-500 font-bold tracking-widest">CRITICAL: ${cC}</span></div>
                    <div class="bg-yellow-500/10 border border-yellow-500/20 px-3 py-1"><span class="text-[9px] text-yellow-500 font-bold tracking-widest">HIGH: ${cH}</span></div>
                    <div class="bg-[#080808] border border-white/10 px-3 py-1"><span class="text-[9px] text-marble font-bold tracking-widest">TOTAL: ${total}</span></div>
                </div>
                <div class="bg-[#080808] border border-shadow p-1 overflow-x-auto">
                    <table class="w-full text-left font-sans text-[11px] border-collapse md:min-w-[780px]">
                        <thead>
                            <tr class="text-[9px] text-gold/60 uppercase tracking-widest border-b border-white/10 hidden md:table-row">
                                <th class="p-4 w-[20%]">The Gap</th>
                                <th class="p-4 w-[25%]">What It Costs You</th>
                                <th class="p-4 w-[20%]">How We Found It</th>
                                <th class="p-4 w-[10%]">Severity</th>
                                <th class="p-4 w-[10%]">Clock</th>
                                <th class="p-4 w-[15%]">The Fix</th>
                            </tr>
                        </thead>
                        <tbody>${matrixRows}</tbody>
                    </table>
                </div>
                ${icebergHTML}
            </div>
            <div class="bg-shadow border border-white/5 p-8">
                <h4 class="font-serif text-2xl text-gold mb-2 italic">Architecture Manifest</h4>
                <p class="text-[10px] text-marble/40 mb-6">Every document below is built specifically for ${companyName}'s architecture. Review-ready in 48-72 hours.</p>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">${manifestHTML}</div>
            </div>
        </div>
        <div class="lg:sticky lg:top-8 space-y-6">
            <div class="bg-gold/5 border border-gold/30 p-6">
                <p class="text-[9px] tracking-[0.2em] text-gold uppercase font-bold mb-3">[DUAL-INTELLIGENCE PROTOCOL]</p>
                <p class="font-mono text-xs text-marble/70 leading-relaxed">${authorityText}</p>
            </div>
            <div class="bg-danger/10 border border-danger/30 p-8 text-center">
                <div class="border-b border-danger/20 pb-6 mb-4">
                    <p class="text-[9px] tracking-[0.2em] text-danger uppercase font-bold mb-2">${companyName} — Est. Annual Statutory Exposure</p>
                    <div class="font-serif text-5xl text-marble mb-2">${fmt(statutoryExposure)}+</div>
                    <p class="text-[9px] text-marble/40 uppercase tracking-widest mt-3">Based on ${trippedArr.length} regulatory surface${trippedArr.length!==1?'s':''} triggered · Status: ${unsureFlag ? 'Critical (Unknown Vectors)' : 'Actionable (Uncapped)'}</p>
                </div>
                ${exposureRefHTML}
            </div>
            <div class="bg-[#080808] border border-shadow p-8 text-center">
                <p class="text-[9px] tracking-[0.2em] text-marble opacity-50 uppercase font-bold mb-6">Required Fix: ${pData.name}</p>
                <div class="flex items-center justify-center gap-4 mb-6">
                    <span class="text-marble/30 line-through text-lg font-serif">$${pData.price === 997 ? '1,500' : '2,500'}</span>
                    <span class="text-gold text-5xl font-serif">$${pData.price}</span>
                </div>
                <p class="font-sans text-xs text-marble opacity-60 leading-relaxed mb-4">48-72h fulfillment. No discovery calls. Vault activation immediately upon payment.</p>
                <p class="font-sans text-[10px] text-marble/30 mb-6">${companyName} has ${total} structural gaps. The ${pData.name} closes them all.</p>
                <button id="trigger-checkout-btn" class="block w-full bg-gold text-void py-4 font-bold text-xs tracking-widest uppercase hover:bg-marble transition-all">Secure ${companyName}'s Architecture</button>
            </div>
        </div>
    </div>`;

    document.getElementById('trigger-checkout-btn').addEventListener('click', injectCheckout);

    if (pidFromUrl) {
        setDoc(doc(db, "prospects", pidFromUrl), {
            scannerStep: 'dashboard_viewed', scannerStepAt: serverTimestamp()
        }, { merge: true }).catch(() => {});
    }
}


// ── 12. CHECKOUT INJECTION ──────────────────────────────────────────────
function injectCheckout() {
    switchState('state-dashboard', 'state-checkout');
    document.getElementById('main-wrap').classList.replace('max-w-6xl', 'max-w-3xl');

    const fullName = localStorage.getItem('ln_name') || "";
    document.getElementById('apply-fname').value   = fullName.split(' ')[0] || "";
    document.getElementById('apply-lname').value   = fullName.split(' ').slice(1).join(' ') || "";
    document.getElementById('apply-company').value = localStorage.getItem('ln_company') || prospectData?.company || "";

    if (prospectData?.registrationJurisdiction) {
        const sel   = document.getElementById('apply-jurisdiction');
        const match = Array.from(sel.options).find(o =>
            prospectData.registrationJurisdiction.toLowerCase().includes(o.value.toLowerCase())
        );
        if (match) sel.value = match.value;
    }
    renderPlans();
}

function renderPlans() {
    const ctr = document.getElementById('locked-plan-display');
    let html = '<div class="space-y-4">';
    Object.keys(PLAN_DATA).forEach(key => {
        const pd    = PLAN_DATA[key];
        const isSel = activePlan === key;
        const isRec = recommendedPlan === key;
        html += `
        <label class="flex items-center p-5 border ${isSel ? 'border-gold bg-gold/5' : 'border-shadow bg-[#050505] hover:border-white/20'} cursor-pointer transition-all">
            <input type="radio" name="plan_choice" value="${key}" class="hidden" ${isSel ? 'checked' : ''}>
            <div class="flex-grow">
                <div class="font-sans text-xs tracking-[0.2em] ${isSel ? 'text-gold' : 'text-marble'} uppercase mb-1">
                    ${pd.name}
                    ${isRec ? '<span class="ml-2 bg-gold text-void px-2 py-0.5 text-[8px] tracking-widest uppercase font-bold">Recommended</span>' : ''}
                </div>
                <div class="font-sans text-[10px] text-marble opacity-50">${pd.delivery}</div>
            </div>
            <div class="font-serif text-2xl text-marble">$${pd.price}</div>
        </label>`;
    });
    html += '</div>';
    ctr.innerHTML = html;

    ctr.querySelectorAll('input[name="plan_choice"]').forEach(radio => {
        radio.addEventListener('change', e => {
            activePlan = e.target.value;
            resetELAcceptance();
            renderPlans();
        });
    });
}

function resetELAcceptance() {
    document.getElementById('engagement-checkbox').checked = false;
    const vc = document.getElementById('visual-checkbox');
    vc.classList.remove('bg-gold', 'border-gold');
    vc.classList.add('bg-void');
    document.getElementById('check-icon').classList.add('hidden');
    const mainBtn     = document.getElementById('checkout-btn');
    mainBtn.innerText = 'Accept Terms To Continue';
    mainBtn.classList.add('opacity-50', 'cursor-not-allowed');
}

// ── 13. ENGAGEMENT LETTER MODAL ─────────────────────────────────────────
document.getElementById('engagement-checkbox').parentElement.addEventListener('click', e => {
    if (e.target.tagName !== 'BUTTON' && e.target.id !== 'open-modal-btn') {
        e.preventDefault();
        document.getElementById('open-modal-btn').click();
    }
});

document.getElementById('open-modal-btn').addEventListener('click', e => {
    e.preventDefault();
    const pd    = PLAN_DATA[activePlan];
    const today = new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'long', year:'numeric' });

    const fname   = document.getElementById('apply-fname').value.trim()   || "[Contact Name]";
    const lname   = document.getElementById('apply-lname').value.trim()   || "";
    const company = document.getElementById('apply-company').value.trim() || "[Client Company Name]";
    const email   = localStorage.getItem('ln_email') || "[Client Email]";

    document.getElementById('el-date').innerText         = today;
    document.querySelectorAll('.el-date-footer').forEach(el => el.innerText = today);
    document.getElementById('el-client-name').innerText  = company;
    document.getElementById('el-contact').innerText      = `${fname} ${lname}`.trim();
    document.getElementById('el-client-email').innerText = email;
    document.getElementById('el-dear').innerText         = fname;
    document.getElementById('el-client-body').innerText  = company;
    document.querySelectorAll('.el-ref-number').forEach(el => el.innerText = engagementRefCode);
    document.getElementById('el-sa-client').innerText    = company;
    document.getElementById('el-sa-date').innerText      = today;
    document.getElementById('el-sa-tier').innerText      = pd.tier;
    document.getElementById('el-sa-lane').innerText      = pd.lane;
    document.getElementById('el-sa-product').innerText   = pd.name;
    document.getElementById('el-sa-fee').innerText       = `$${pd.price} USD`;
    document.getElementById('el-sa-delivery').innerText  = pd.delivery;
    document.getElementById('el-sa-revisions').innerText = pd.rev;
    document.querySelectorAll('.el-client-footer').forEach(el => el.innerText = company);

    document.getElementById('engagement-modal').classList.remove('hidden-state');
    document.body.style.overflow = 'hidden';

    const container     = document.getElementById('engagement-scroll-container');
    container.scrollTop = 0;

    const acceptBtn     = document.getElementById('accept-modal-btn');
    acceptBtn.disabled  = true;
    acceptBtn.className = "bg-gold/20 text-marble/30 cursor-not-allowed font-sans text-xs tracking-[0.2em] uppercase px-10 py-4 font-bold w-full md:w-auto transition-all duration-300";
    document.getElementById('scroll-instruction').classList.remove('hidden-state');
    checkScrollBottom();
});

document.getElementById('close-modal-btn')?.addEventListener('click', () => {
    document.getElementById('engagement-modal').classList.add('hidden-state');
    document.body.style.overflow = 'auto';
});

const elScrollContainer = document.getElementById('engagement-scroll-container');
if (elScrollContainer) elScrollContainer.addEventListener('scroll', checkScrollBottom);

function checkScrollBottom() {
    if (elScrollContainer.scrollHeight - elScrollContainer.scrollTop <= elScrollContainer.clientHeight + 20) {
        const acceptBtn     = document.getElementById('accept-modal-btn');
        acceptBtn.disabled  = false;
        acceptBtn.className = "bg-gold text-void hover:bg-marble cursor-pointer font-sans text-xs tracking-[0.2em] uppercase px-10 py-4 font-bold w-full md:w-auto transition-all duration-300";
        document.getElementById('scroll-instruction').classList.add('hidden-state');
    }
}

document.getElementById('accept-modal-btn').addEventListener('click', () => {
    document.getElementById('engagement-checkbox').checked = true;
    const vc = document.getElementById('visual-checkbox');
    vc.classList.add('bg-gold', 'border-gold');
    vc.classList.remove('bg-void');
    document.getElementById('check-icon').classList.remove('hidden');
    const mainBtn     = document.getElementById('checkout-btn');
    mainBtn.innerText = `Initialize Payment — $${PLAN_DATA[activePlan].price}`;
    mainBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    document.getElementById('engagement-modal').classList.add('hidden-state');
    document.body.style.overflow = 'auto';
});

// ── 14. CHECKOUT SUBMISSION ─────────────────────────────────────────────
document.getElementById('checkout-form').addEventListener('submit', async e => {
    e.preventDefault();

    if (!document.getElementById('engagement-checkbox').checked) {
        document.getElementById('open-modal-btn').click();
        return;
    }

    const btn     = document.getElementById('checkout-btn');
    btn.innerText = "Securing Architecture...";
    btn.classList.add('opacity-50', 'cursor-not-allowed');

    const firstName    = document.getElementById('apply-fname').value.trim();
    const lastName     = document.getElementById('apply-lname').value.trim();
    const company      = document.getElementById('apply-company').value.trim();
    const email        = localStorage.getItem('ln_email');
    const jurisdiction = document.getElementById('apply-jurisdiction').value;
    const pd           = PLAN_DATA[activePlan];

    const leadData = {
        email,
        name:  `${firstName} ${lastName}`.trim(),
        firstName, lastName, company,
        registrationJurisdiction: jurisdiction,
        linkedinUrl:          prospectData?.linkedinUrl          || "",
        serviceJurisdictions: prospectData?.serviceJurisdictions || "",
        lanes:                selectedLanes,
        metaVerbs:            selectedArchs,
        intArchetypes:        prospectData?.intArchetypes        || [],
        extExposures:         Array.from(trippedSurfaces),
        plan:                 activePlan,
        price:                pd.price,
        leadType:             "hot_lead",
        status:               "hot_payment_pending",
        source:               "unified_scanner_v5.7",
        engagementReference:  engagementRefCode,
        elAccepted:           true,
        elAcceptedAt:         new Date().toISOString(),
        elAcceptedForPlan:    activePlan
    };

    try {
        const docId = email.replace(/[^a-zA-Z0-9@._-]/g, '').toLowerCase();
        await setDoc(doc(db, "leads", docId), { ...leadData, lastTouched:serverTimestamp() }, { merge:true });
        await fetch(CHECKOUT_WEBHOOK, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ ...leadData, timestamp:new Date().toISOString() })
        });
    } catch(err) { console.error("Checkout Error:", err); }

    window.location.href = PAYPAL_LINKS[activePlan];
});

// ── 15. UTILITIES ───────────────────────────────────────────────────────
function switchState(fromId, toId) {
    const f = document.getElementById(fromId);
    const t = document.getElementById(toId);
    if (f) { f.classList.add('hidden-state');    f.classList.remove('fade-enter'); }
    if (t) { t.classList.remove('hidden-state'); void t.offsetWidth; t.classList.add('fade-enter'); }
}
