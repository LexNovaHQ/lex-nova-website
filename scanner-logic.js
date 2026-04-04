/**
 * LEX NOVA HQ — FORENSIC SCANNER v5.6
 * scanner-logic.js
 *
 * CHANGES FROM v5.5:
 * ─ Entry gate added: email + company collected before terminal/config
 * ─ Firestore cross-check on entry: prospects queried by email field
 * ─ PID pre-fills entry gate email if URL param present
 * ─ finishDiagnostic() writes full scan payload directly — no gate detour
 * ─ state-gate removed from flow entirely
 * ─ Exit intent modal and all exit intent logic removed
 * ─ query/collection/where/getDocs added to Firebase imports
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

const EXT_VALUES = {
    "EXT.01": 15000000, "EXT.02":  5000000, "EXT.03": 10000000,
    "EXT.04":  5000000, "EXT.05": 10000000, "EXT.06": 20000000,
    "EXT.07":  5000000, "EXT.08":  2500000, "EXT.09": 10000000,
    "EXT.10":  5000000
};

const VELOCITY_DISPLAY = {
    "Immediate": "Active Now", "High": "This Year",
    "Upcoming":  "Incoming",   "Pending": "Watch"
};

// ── 03. GAP REGISTRY ────────────────────────────────────────────────────
const GAP_SPECHT = {
    id:"gap_specht", threatId:"UNI_CON_001",
    trap:'"Browsewrap" Invalidity', legalAmmo:"Specht v. Netscape (2002)",
    severity:"CRITICAL", velocity:"Immediate",
    thePain:"Courts throw out arbitration clauses and liability caps",
    theFix:"DOC_TOS §1.1", ext:"EXT.08, EXT.09",
    evidenceTier:null, evidence:{ source:null, reason:null },
    source:"scanner", dualVerifiable:true
};
const GAP_MOFFATT = {
    id:"gap_moffatt", threatId:"UNI_HAL_001",
    trap:"Bot Accountability", legalAmmo:"Moffatt v. Air Canada (2024)",
    severity:"CRITICAL", velocity:"Immediate",
    thePain:"Company legally forced to pay out hallucinated financial promises",
    theFix:"DOC_TOS §8.1 & §8.2", ext:"EXT.08",
    evidenceTier:null, evidence:{ source:null, reason:null },
    source:"scanner", dualVerifiable:true
};
const GAP_SCHREMS = {
    id:"gap_schrems", threatId:"UNI_SEC_001",
    trap:"Illegal Data Migration", legalAmmo:"Schrems II (2020)",
    severity:"CRITICAL", velocity:"Immediate",
    thePain:"Routing EU data to US servers without Standard Contractual Clauses",
    theFix:"DOC_DPA §6.2", ext:"EXT.01",
    evidenceTier:null, evidence:{ source:null, reason:null },
    source:"scanner", dualVerifiable:true
};
const GAP_BARTZ = {
    id:"gap_bartz", threatId:"UNI_INF_001",
    trap:"Upstream Training Piracy Liability",
    legalAmmo:"Bartz v. Anthropic (Settlement approved Sep 2025)",
    severity:"NUCLEAR", velocity:"Immediate",
    thePain:"Largest copyright settlement in US history ($1.5B); piracy-sourced training is per se infringement",
    theFix:"DOC_TOS §8.7", ext:"EXT.10",
    evidenceTier:null, evidence:{ source:null, reason:null },
    source:"scanner", dualVerifiable:true
};
const GAP_WARRANTY = {
    id:"gap_warranty", threatId:"UNI_LIA_004",
    trap:"Inconspicuous Warranty Caps", legalAmmo:"UCC § 2-316 & § 2-719",
    severity:"NUCLEAR", velocity:"High",
    thePain:'Warranty disclaimers must be "conspicuous" (ALL CAPS) or courts strike them — leaving no liability protection',
    theFix:"DOC_TOS §9.2", ext:"EXT.08, EXT.09",
    evidenceTier:null, evidence:{ source:null, reason:null },
    source:"scanner", dualVerifiable:true
};
const GAP_SHADOW = {
    id:"SCAN_INTERNAL_001", threatId:null,
    trap:"Shadow AI Bleed", legalAmmo:"Trade Secret Law / Internal IP Policy",
    severity:"NUCLEAR", velocity:"Immediate",
    thePain:"Employees are actively leaking proprietary IP and client data into public LLMs without restriction or detection",
    theFix:"DOC_HND", ext:"EXT.09",
    evidenceTier:null, evidence:{ source:null, reason:null },
    source:"scanner", dualVerifiable:false
};
const GAP_UETA = {
    id:"gap_ueta", threatId:"INT01_AGT_001",
    trap:"Electronic Agent Authority", legalAmmo:"UETA § 14",
    severity:"NUCLEAR", velocity:"Immediate",
    thePain:"The principal is legally bound by its AI's operations, even if no human reviewed the action",
    theFix:"DOC_AGT §2.1", ext:"EXT.08, EXT.09",
    evidenceTier:null, evidence:{ source:null, reason:null },
    source:"scanner", dualVerifiable:true
};
const GAP_MOBLEY = {
    id:"gap_mobley", threatId:"INT02_DIS_001",
    trap:'Vendor Immunity / "HITL Theater"',
    legalAmmo:"Mobley v. Workday (Active 2025/2026)",
    severity:"NUCLEAR", velocity:"Immediate",
    thePain:'Judge rejected blanket immunity for the AI vendor; suit proceeds under "agency" theory against the software company directly',
    theFix:"DOC_AGT §2.2", ext:"EXT.07",
    evidenceTier:null, evidence:{ source:null, reason:null },
    source:"scanner", dualVerifiable:true
};
const GAP_CREATOR = {
    id:"gap_creator", threatId:"INT04_COP_001",
    trap:"Copyright Collapse", legalAmmo:"Thaler v. Perlmutter (2023/2025)",
    severity:"NUCLEAR", velocity:"Immediate",
    thePain:"Raw AI output falls into the public domain immediately; copyright requires documented human authorship",
    theFix:"DOC_TOS §6.2", ext:"EXT.10, EXT.08",
    evidenceTier:null, evidence:{ source:null, reason:null },
    source:"scanner", dualVerifiable:true
};
const GAP_FTC = {
    id:"gap_ftc", threatId:"INT05_DIS_001",
    trap:'The "Death Penalty" Disgorgement', legalAmmo:"FTC v. Rite Aid (2023)",
    severity:"NUCLEAR", velocity:"Immediate",
    thePain:"FTC ordering complete destruction of model, data, and algorithms trained on improperly obtained data",
    theFix:"DOC_DPA §4.1", ext:"EXT.03",
    evidenceTier:null, evidence:{ source:null, reason:null },
    source:"scanner", dualVerifiable:true
};
const GAP_BIPA = {
    id:"gap_bipa", threatId:"INT07_BIO_001",
    trap:'The "Diarization" Voiceprint Trap',
    legalAmmo:"Cruz v. Fireflies.AI (Dec 18, 2025) & Basich v. Microsoft Corp. (Feb 5, 2026)",
    severity:"NUCLEAR", velocity:"Immediate",
    thePain:"Assessing vocal pitch constitutes illegal biometric harvesting; standard audio prompts fail to satisfy statutory written consent requirements",
    theFix:"DOC_AUP §3.6", ext:"EXT.04, EXT.09",
    evidenceTier:null, evidence:{ source:null, reason:null },
    source:"scanner", dualVerifiable:true
};
const GAP_COMPANION = {
    id:"gap_companion", threatId:"INT03_COM_002",
    trap:"Persistent Memory Pathologization",
    legalAmmo:"Gavalas v. Google (Filed Mar 4, 2026)",
    severity:"NUCLEAR", velocity:"Immediate",
    thePain:"First wrongful death suit targeting Gemini; alleges AI manufactured delusional reality over 7 weeks and coached suicide; faulty design and wrongful death claims active",
    theFix:"DOC_TOS §5.2", ext:"EXT.08",
    evidenceTier:null, evidence:{ source:null, reason:null },
    source:"scanner", dualVerifiable:true
};

// ── 04. QUESTION BANK ───────────────────────────────────────────────────
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
            q: "Does your system pull data from the web, process meeting recordings, or ingest documents from outside your platform?",
            gaps: [GAP_FTC, GAP_BIPA],
            options: [
                { t:"Yes — licensed sources only, robots.txt compliant, written consent for any recordings.", pts:0 },
                { t:"We pull public data but stay away from sites with heavy bot protection.", pts:30 },
                { t:"Yes — we go wherever the data is, including through anti-bot walls or unverified audio.", pts:50 },
                { t:"I don't know the full details of what our pipeline actually ingests.", pts:60, unsure:true }
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
function getDocId(theFix) { return theFix ? theFix.split(' ')[0] : ''; }
function velDisplay(v) { return VELOCITY_DISPLAY[v] || v; }
function sevClasses(s) {
    switch ((s || '').toUpperCase()) {
        case 'NUCLEAR':  return 'bg-danger/10 text-danger border border-danger/20';
        case 'CRITICAL': return 'bg-orange-500/10 text-orange-500 border border-orange-500/20';
        default:         return 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20';
    }
}
function sourceBadge(g) {
    if (g.source === 'dual-verified')
        return `<span class="inline-block mt-1 text-[9px] tracking-widest uppercase text-danger font-bold"><span class="opacity-50">SOURCE:</span> CONFIRMED: PUBLIC + INTERNAL</span>`;
    if (g.source === 'scrape' || (g.evidence && g.evidence.source))
        return `<span class="inline-block mt-1 text-[9px] tracking-widest uppercase text-[#60a5fa] font-bold"><span class="opacity-50">SOURCE:</span> FOUND: PUBLIC SCRAPE</span>`;
    if (!g.dualVerifiable)
        return `<span class="inline-block mt-1 text-[9px] tracking-widest uppercase text-gold font-bold"><span class="opacity-50">SOURCE:</span> FLAGGED: INTERNAL AUDIT</span>`;
    return `<span class="inline-block mt-1 text-[9px] tracking-widest uppercase text-gold font-bold"><span class="opacity-50">SOURCE:</span> FLAGGED: INTERNAL AUDIT</span>`;
}
function evidenceBlock(g) {
    if (!g.evidence || (!g.evidence.source && !g.evidence.reason)) return '';
    return `
    <div class="mt-3 p-2 bg-[#050505] border border-white/10 font-mono text-[10px] text-marble/70 leading-relaxed">
        ${g.evidence.source ? `<div><span class="text-gold font-bold">&gt; LOCATION:</span> ${g.evidence.source}</div>` : ''}
        ${g.evidence.reason ? `<div class="mt-1"><span class="text-danger font-bold">&gt; SIGNAL:</span> ${g.evidence.reason}</div>` : ''}
    </div>`;
}

// ── 07. INITIALIZATION ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {

    // If PID in URL, pre-fill entry gate email
    // Prospect lookup happens on entry gate submit — not here
    if (pidFromUrl) {
        localStorage.setItem('ln_pid', pidFromUrl);
        engagementRefCode = `LN-2026-${pidFromUrl.toUpperCase()}`;
        try {
            const snap = await getDoc(doc(db, "prospects", pidFromUrl));
            if (snap.exists()) {
                prospectData = snap.data();
                // Pre-fill entry gate with known email
                const emailField = document.getElementById('entry-email');
                if (emailField && prospectData.email) emailField.value = prospectData.email;
                const companyField = document.getElementById('entry-company');
                if (companyField && prospectData.company) companyField.value = prospectData.company;
            }
        } catch(e) { console.error("PID pre-fill:", e); }
    } else {
        engagementRefCode = `LN-2026-${Math.floor(Math.random() * 90000) + 10000}`;
    }

    // Lane toggles
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

    // Arch toggles
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

    document.getElementById('btn-start').addEventListener('click', startDiagnostic);
});

function checkConfig() {
    const ok  = selectedLanes.length > 0 && selectedArchs.length > 0;
    const btn = document.getElementById('btn-start');
    btn.disabled = !ok;
    btn.classList.toggle('opacity-30',         !ok);
    btn.classList.toggle('cursor-not-allowed', !ok);
}

// ── 08. ENTRY GATE ──────────────────────────────────────────────────────
// Collects email + company before terminal/config shows.
// Cross-checks email against Firestore prospects collection.
// If match found: loads prospectData, sets scannerClicked, links scan to outreach thread.
// If no match: creates fresh record, proceeds as organic lead.

document.getElementById('entry-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = document.getElementById('entry-submit-btn');
    btn.disabled   = true;
    btn.innerText  = "Verifying...";

    const email   = document.getElementById('entry-email').value.trim().toLowerCase();
    const company = document.getElementById('entry-company').value.trim();

    localStorage.setItem('ln_email',   email);
    localStorage.setItem('ln_company', company);

    // Cross-check: query prospects collection by email field
    // Covers organic visitors who received cold email but visited site directly
    if (!prospectData) {
        try {
            const q = query(collection(db, "prospects"), where("email", "==", email));
            const snap = await getDocs(q);
            if (!snap.empty) {
                const matchDoc = snap.docs[0];
                prospectData = matchDoc.data();
                const matchId = matchDoc.id;
                engagementRefCode = `LN-2026-${matchId.toUpperCase()}`;
                // Link scanner session to outreach thread
                await setDoc(doc(db, "prospects", matchId), {
                    scannerClicked: true,
                    status:         'Warm',
                    lastActive:     serverTimestamp()
                }, { merge:true });
            }
        } catch(err) { console.error("Entry gate prospect lookup:", err); }
    } else {
        // PID match already loaded — just set scannerClicked
        try {
            await setDoc(doc(db, "prospects", pidFromUrl), {
                scannerClicked: true,
                status:         'Warm',
                lastActive:     serverTimestamp()
            }, { merge:true });
        } catch(err) { console.error("PID scannerClicked write:", err); }
    }

    // Write initial lead record regardless of match
    try {
        const docId = email.replace(/[^a-zA-Z0-9@._-]/g, '').toLowerCase();
        await setDoc(doc(db, "leads", docId), {
            email, company,
            source:    'scanner_entry_v5.6',
            status:    'warm_lead',
            createdAt: serverTimestamp()
        }, { merge:true });
    } catch(err) { console.error("Entry lead write:", err); }

    // Hide entry gate
    document.getElementById('entry-gate').classList.add('hidden-state');

    // Populate and show terminal
    const greetName = prospectData?.founderName || prospectData?.name || email.split('@')[0] || "Guest";
    const greetComp = prospectData?.company || company || "Unknown";
    document.getElementById('founder-greet').innerText = greetName;
    document.getElementById('company-greet').innerText = greetComp;
    document.getElementById('term-name').classList.remove('hidden-state');
    document.getElementById('term-comp').classList.remove('hidden-state');
    document.getElementById('greeting-box').style.opacity = "1";

    // Show config after terminal animation
    setTimeout(() => {
        const ui = document.getElementById('config-ui');
        ui.classList.remove('hidden-state');
        void ui.offsetWidth;
        ui.style.opacity = "1";
    }, 2000);
});

// ── 09. QUIZ ENGINE ─────────────────────────────────────────────────────
const ARCH_PRIORITY = ['actions', 'evaluates', 'creates', 'talks'];

function startDiagnostic() {
    quizRoute = [...Q_GLOBAL];
    let remainingSlots = 5;

    if (selectedLanes.includes('operational')) {
        quizRoute.push(Q_INTERNAL);
        remainingSlots--;
    }

    let archPool = [];
    ARCH_PRIORITY.forEach(arch => {
        if (!selectedArchs.includes(arch) || !Q_META[arch]) return;
        if (arch === 'creates' && selectedArchs.length === 4) {
            archPool.push(Q_META[arch][0]);
        } else {
            archPool.push(...Q_META[arch]);
        }
    });

    quizRoute.push(...archPool.slice(0, remainingSlots));
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
            if (currentQIndex < quizRoute.length) renderQuestion();
            else finishDiagnostic();
        });
        container.appendChild(btn);
    });
}

// ── 10. FINISH DIAGNOSTIC ───────────────────────────────────────────────
// Writes full scan payload to Firestore immediately after quiz.
// No gate detour — dashboard builds directly from here.

async function finishDiagnostic() {
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
        source:           'scanner_gate_v5.6',
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

// ── 11. DUAL-INTELLIGENCE DASHBOARD ─────────────────────────────────────
function buildDashboard() {
    document.getElementById('main-wrap').classList.replace('max-w-3xl', 'max-w-6xl');

    let scrapeCount = 0, dualCount = 0;

    if (prospectData?.forensicGaps?.length) {
        prospectData.forensicGaps.forEach(sg => {
            addExt(sg.ext);
            const existing = activeGaps.find(g =>
                (sg.threatId && g.threatId && g.threatId === sg.threatId) ||
                (sg.id       && g.id       && g.id       === sg.id)
            );
            if (!existing) {
                activeGaps.push({ ...sg, source:'scrape' });
                scrapeCount++;
            } else {
                existing.source = 'dual-verified';
                if (sg.evidence)     existing.evidence    = sg.evidence;
                if (sg.evidenceTier) existing.evidenceTier = sg.evidenceTier;
                const w  = { NUCLEAR:3, CRITICAL:2, HIGH:1 };
                const hW = w[(sg.severity       || '').toUpperCase()] || 0;
                const sW = w[(existing.severity || '').toUpperCase()] || 0;
                if (hW > sW) existing.severity = sg.severity.toUpperCase();
                dualCount++;
            }
        });
    }

    activeGaps.forEach(g => { if (!g.source) g.source = 'scanner'; });

    const sevW = { NUCLEAR:3, CRITICAL:2, HIGH:1 };
    const srcW = g => g.source === 'dual-verified' ? 3 : g.source === 'scrape' ? 2 : 1;
    activeGaps.sort((a, b) => {
        const sd = (sevW[(b.severity || '').toUpperCase()] || 0) - (sevW[(a.severity || '').toUpperCase()] || 0);
        return sd !== 0 ? sd : srcW(b) - srcW(a);
    });

    let cN = 0, cC = 0, cH = 0;
    activeGaps.forEach(g => {
        const s = (g.severity || '').toUpperCase();
        if (s === 'NUCLEAR') cN++; else if (s === 'CRITICAL') cC++; else cH++;
    });

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
        : "Engine processed your inputs. Gaps identified are structurally verified against your architecture.";

    let tripwireHTML = '';
    if (trippedSurfaces.size > 0) {
        tripwireHTML = Array.from(trippedSurfaces).map(ext => `
        <div class="bg-danger/10 border border-danger/30 p-4 mb-3 animate-pulse">
            <p class="text-[9px] tracking-widest text-danger font-bold uppercase">🚨 ${ext} TRIPPED</p>
            <p class="text-[10px] text-marble/60">Strict statutory enforcement activated on this surface based on your audit.</p>
        </div>`).join('');
    }

    let matrixRows = activeGaps.length === 0
        ? `<tr><td colspan="6" class="p-6 text-center text-marble/50 font-sans text-xs">No structural gaps detected.</td></tr>`
        : '';

    activeGaps.forEach((g, i) => {
        if (i >= 6) return;
        const badge  = sourceBadge(g);
        const evBlock = evidenceBlock(g);
        const sc     = sevClasses(g.severity);
        const vd     = velDisplay(g.velocity);
        const docId  = getDocId(g.theFix);
        const pain   = truncatePain(g.thePain);

        if (i < 3) {
            matrixRows += `
            <tr class="matrix-row border-b border-white/5">
                <td class="p-4 align-top"><span class="font-bold text-marble text-xs block">${g.trap}</span>${badge}</td>
                <td class="p-4 align-top"><span class="text-marble/70 text-[11px] leading-relaxed">${pain}</span></td>
                <td class="p-4 align-top">${evBlock || '<span class="text-marble/30 text-[10px]">Internal audit signal</span>'}</td>
                <td class="p-4 align-top"><span class="px-2 py-1 text-[9px] font-bold ${sc}">${g.severity}</span></td>
                <td class="p-4 align-top text-marble/80 text-[10px] tracking-widest uppercase">${vd}</td>
                <td class="p-4 align-top text-gold font-bold text-xs">${docId}</td>
            </tr>`;
        } else {
            matrixRows += `
            <tr class="matrix-row border-b border-white/5 opacity-90">
                <td class="p-4 align-top"><span class="font-bold text-marble text-xs block" style="filter:blur(3px);user-select:none">${g.trap}</span>${badge}</td>
                <td class="p-4 align-top"><span class="text-marble/70 text-[11px] leading-relaxed" style="filter:blur(3px);user-select:none">${pain}</span></td>
                <td class="p-4 align-top">${evBlock || '<span class="text-marble/30 text-[10px]">Internal audit signal</span>'}</td>
                <td class="p-4 align-top"><span class="px-2 py-1 text-[9px] font-bold ${sc}">${g.severity}</span></td>
                <td class="p-4 align-top text-marble/80 text-[10px] tracking-widest uppercase">${vd}</td>
                <td class="p-4 align-top text-gold font-bold text-xs">${docId}</td>
            </tr>`;
        }
    });

    const redacted = activeGaps.length > 6 ? activeGaps.length - 6 : 0;
    const icebergHTML = redacted > 0 ? `
    <div class="bg-[#0a0a0a] border border-dashed border-danger/30 p-6 text-center mt-2">
        <div class="mb-3 text-danger">
            <svg class="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
            </svg>
        </div>
        <p class="text-[11px] tracking-widest text-danger uppercase mb-2 font-bold">🔒 [ ${redacted} ] ADDITIONAL THREAT VECTORS CLASSIFIED</p>
        <p class="text-[10px] text-marble/40 max-w-sm mx-auto">Combined forensic audit revealed ${redacted} further structural gaps. Vault locked under Lex Nova Client Privilege.</p>
    </div>` : '';

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

    const manifestHTML = docsToRender.map(d => `
    <div class="border-l-2 border-gold pl-3">
        <span class="text-[9px] text-gold uppercase font-bold block">${d.id}</span>
        <span class="text-xs text-marble">${d.n}</span>
    </div>`).join('');

    document.getElementById('state-dashboard').innerHTML = `
    <div class="mb-12 text-center lg:text-left">
        <h1 class="font-serif text-5xl text-marble mb-4">Structural Integrity Report</h1>
        <p class="font-sans text-xs tracking-[0.3em] text-gold uppercase">Proprietary Forensic Audit · Lex Nova Canon V5.6</p>
    </div>
    <div class="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-10 items-start">
        <div class="space-y-8">
            ${tripwireHTML}
            <div>
                <div class="flex gap-4 mb-4 flex-wrap">
                    <div class="bg-danger/10 border border-danger/20 px-3 py-1"><span class="text-[9px] text-danger font-bold tracking-widest">NUCLEAR: ${cN}</span></div>
                    <div class="bg-orange-500/10 border border-orange-500/20 px-3 py-1"><span class="text-[9px] text-orange-500 font-bold tracking-widest">CRITICAL: ${cC}</span></div>
                    <div class="bg-yellow-500/10 border border-yellow-500/20 px-3 py-1"><span class="text-[9px] text-yellow-500 font-bold tracking-widest">HIGH: ${cH}</span></div>
                </div>
                <div class="bg-[#080808] border border-shadow p-1 overflow-x-auto">
                    <table class="w-full text-left font-sans text-[11px] border-collapse min-w-[780px]">
                        <thead>
                            <tr class="text-[9px] text-gold/60 uppercase tracking-widest border-b border-white/10">
                                <th class="p-4 w-[20%]">The Gap</th>
                                <th class="p-4 w-[25%]">What It Costs You</th>
                                <th class="p-4 w-[20%]">How We Found It</th>
                                <th class="p-4 w-[10%]">Severity</th>
                                <th class="p-4 w-[10%]">Clock</th>
                                <th class="p-4 w-[10%]">The Fix</th>
                            </tr>
                        </thead>
                        <tbody>${matrixRows}</tbody>
                    </table>
                </div>
                ${icebergHTML}
            </div>
            <div class="bg-shadow border border-white/5 p-8">
                <h4 class="font-serif text-2xl text-gold mb-6 italic">Architecture Manifest (Ready for Deployment)</h4>
                <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">${manifestHTML}</div>
            </div>
        </div>
        <div class="lg:sticky lg:top-8 space-y-6">
            <div class="bg-gold/5 border border-gold/30 p-6">
                <p class="text-[9px] tracking-[0.2em] text-gold uppercase font-bold mb-3">[DUAL-INTELLIGENCE PROTOCOL]</p>
                <p class="font-mono text-xs text-marble/70 leading-relaxed">${authorityText}</p>
            </div>
            <div class="bg-danger/10 border border-danger/30 p-8 text-center">
                <div class="border-b border-danger/20 pb-6 mb-6">
                    <p class="text-[9px] tracking-[0.2em] text-danger uppercase font-bold mb-2">Est. Annual Statutory Exposure</p>
                    <div class="font-serif text-5xl text-marble mb-2">${fmt(statutoryExposure)}+</div>
                    <p class="text-[9px] text-marble/40 uppercase tracking-widest mt-3">Status: ${unsureFlag ? 'Critical (Unknown Vectors)' : 'Actionable (Uncapped)'}</p>
                </div>
            </div>
            <div class="bg-[#080808] border border-shadow p-8 text-center">
                <p class="text-[9px] tracking-[0.2em] text-marble opacity-50 uppercase font-bold mb-6">Required Fix: ${pData.name}</p>
                <div class="flex items-center justify-center gap-4 mb-6">
                    <span class="text-marble/30 line-through text-lg font-serif">$${pData.price === 997 ? '1,500' : '2,500'}</span>
                    <span class="text-gold text-5xl font-serif">$${pData.price}</span>
                </div>
                <p class="font-sans text-xs text-marble opacity-60 leading-relaxed mb-6">48-72h fulfillment. No discovery calls. Vault activation immediately upon payment.</p>
                <button id="trigger-checkout-btn" class="block w-full bg-gold text-void py-4 font-bold text-xs tracking-widest uppercase hover:bg-marble transition-all">Secure Architecture</button>
            </div>
        </div>
    </div>`;

    document.getElementById('trigger-checkout-btn').addEventListener('click', injectCheckout);
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
        source:               "unified_scanner_v5.6",
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
