/**
 * LEX NOVA HQ — V5.5 CANON FORENSIC SCANNER & UNIFIED TERMINAL ENGINE
 * Architecture: Async-Only | Multi-Select Configurations | EXT. 10 Tripwires | Dual-Intelligence Merge
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

// ── 01. SYSTEM CONFIGURATION ───────────────────────────────────────────
const firebaseConfig = {
    apiKey: "AIzaSyDO4s_W8_87XnsLnuAfyUqgsF8BgaHRYWA",
    authDomain: "lexnova-hq.firebaseapp.com",
    projectId: "lexnova-hq",
    storageBucket: "lexnova-hq.firebasestorage.app",
    messagingSenderId: "539475214055",
    appId: "1:539475214055:web:c01a99ec94ff073a9b6c42"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const CHECKOUT_WEBHOOK = "https://hook.eu1.make.com/r77qw3emv27csjq2eag7ibqku1juve4t";
const GATE_WEBHOOK = "https://hook.eu1.make.com/q7nnd3klwdmlmtesq5no4yfsmk3v8ua7";

const PAYPAL_LINKS = {
    agentic_shield: "https://www.paypal.com/ncp/payment/WNH78KQCXDBL6",
    workplace_shield: "https://www.paypal.com/ncp/payment/7DUHPJJ4XVUVJ",
    complete_stack: "https://www.paypal.com/ncp/payment/X3PJ47FEDUSPW"
};

const PLAN_DATA = {
    agentic_shield: { name: "The Agentic Shield", price: 997, tier: "Kit", lane: "Lane A — Commercial", delivery: "48 hours from Intake Form submission", rev: "1 Round" },
    workplace_shield: { name: "The Workplace Shield", price: 997, tier: "Kit", lane: "Lane B — Operational", delivery: "48 hours from Intake Form submission", rev: "1 Round" },
    complete_stack: { name: "The Complete Stack", price: 2000, tier: "Bundle", lane: "Hybrid (A + B)", delivery: "72 hours from Intake Form submission", rev: "2 Rounds" }
};

// ── 02. STATE MANAGEMENT ───────────────────────────────────────────────
const urlParams = new URLSearchParams(window.location.search);
const pidFromUrl = urlParams.get('pid');

let prospectData = null;
let selectedLanes = []; // Multi-select array
let selectedArchs = []; // Multi-select array

let totalScore = 0;
let unsureFlag = false;
let activeGaps = []; 
let trippedSurfaces = new Set(); // Stores EXT. XX codes

let quizRoute = [];
let currentQIndex = 0;
let vaultInputs = [];

let recommendedPlan = null; 
let activePlan = null;
let exitFired = false;
let engagementRefCode = ""; 

// ── 03. THE CANON V5.5 QUESTION BANK (ANNEXURE A) ──────────────────────

const Q_GLOBAL = [
    { 
        q: "How do users actually agree to your Terms before their first AI interaction?", 
        gap: { id: "gap_specht", trap: "Specht — Consent Void", plain: "Your agreement structure makes every user contract legally void.", doc: "DOC_TOS", ext: "EXT. 08" }, 
        options: [
            { t: "Mandatory clickwrap—they cannot proceed without clicking 'I Agree'.", pts: 0 }, 
            { t: "We have text saying 'By using this tool, you agree,' or a footer link.", pts: 30 }, 
            { t: "We don't really have a formal signup agreement block right now.", pts: 50 }, 
            { t: "I'm not entirely sure how our dev team built the signup flow.", pts: 60, unsure: true }
        ] 
    },
    { 
        q: "If your AI hallucinates a fake discount or bad advice that costs a user money, what is your fallback?", 
        gap: { id: "gap_moffatt", trap: "Moffatt — Hallucination Liability", plain: "You are legally bound to pay out-of-pocket for hallucinated promises.", doc: "DOC_TOS", ext: "EXT. 08" }, 
        options: [
            { t: "Our terms have strict, click-accepted 'AS-IS' AI hallucination waivers.", pts: 0 }, 
            { t: "We put a little text disclaimer under the chat box saying 'AI can make mistakes.'", pts: 30 }, 
            { t: "We rely on standard software Terms and hope the generic limit holds up.", pts: 50 }, 
            { t: "We haven't explicitly covered AI mistakes in our contracts yet.", pts: 60, unsure: true }
        ] 
    },
    { 
        q: "Are you routing data from users in Europe (EU/UK) to US-based foundation models (OpenAI/Anthropic)?", 
        gap: { id: "gap_schrems", trap: "Schrems II — Transit Breach", plain: "You are violating GDPR by routing EU PII to the US without localized SCCs.", doc: "DOC_PP", ext: "EXT. 01" }, 
        options: [
            { t: "No, we strictly use EU-localized server deployments and hardcoded SCCs.", pts: 0 }, 
            { t: "We have a standard GDPR privacy policy, but API routing hits default US endpoints.", pts: 30 }, 
            { t: "We dynamically route everything globally to whatever model is cheapest/fastest.", pts: 50 }, 
            { t: "I have no idea where our users' data is physically being routed right now.", pts: 60, unsure: true }
        ] 
    },
    { 
        q: "If OpenAI or Anthropic gets sued for copyright, does your contract protect your startup from being dragged in?", 
        gap: { id: "gap_bartz", trap: "Bartz — Wrapper Supply Chain", plain: "You carry joint liability for your foundation model's training data violations.", doc: "DOC_TOS", ext: "EXT. 10" }, 
        options: [
            { t: "Yes, we have explicit third-party model pass-through disclaimers.", pts: 0 }, 
            { t: "We use standard API terms and assume providers handle their own legal issues.", pts: 30 }, 
            { t: "No, we don't have any IP protection buffering us from our foundation models.", pts: 50 }, 
            { t: "I don't know if we share liability with our foundation models.", pts: 60, unsure: true }
        ] 
    },
    { 
        q: "If a hacker breaches your AI via prompt injection, how do you legally prove it wasn't your fault?", 
        gap: { id: "gap_cyber", trap: "Soteria — Cyber Negligence", plain: "You lack a recognized 'Reasonable Care' defense for AI-vector data breaches.", doc: "DOC_SLA", ext: "EXT. 09" }, 
        options: [
            { t: "We are strictly audited under ISO 27001 or SOC 2 with immutable logs.", pts: 0 }, 
            { t: "We follow standard engineering best practices, but no formal certification.", pts: 30 }, 
            { t: "We fix things as they break; security is pretty ad-hoc right now.", pts: 50 }, 
            { t: "I'm not sure what our formal security defense strategy is.", pts: 60, unsure: true }
        ] 
    }
];

const Q_INTERNAL = { 
    q: "Do you have technical blocks stopping employees from pasting proprietary code/PII into public LLMs?", 
    gap: { id: "gap_shadow", trap: "Shadow AI Bleed", plain: "Employees are actively leaking proprietary IP into public LLMs without restriction.", doc: "DOC_HND", ext: "EXT. 09" }, 
    options: [
        { t: "Yes, enterprise-gated tools, technical blocks, and strict IP assignment deeds.", pts: 0 }, 
        { t: "We have a soft company policy telling them not to, but no hard technical blocks.", pts: 30 }, 
        { t: "No, employees use whatever AI tools they want to get work done.", pts: 50 }, 
        { t: "I have no idea what tools the team uses or what they paste into them.", pts: 60, unsure: true }
    ] 
};

const Q_META = {
    execution: [
        { q: "Does your AI have an immutable financial limit, or could it overspend an API budget if it goes rogue?", gap: { id: "gap_ueta", trap: "UETA §14 — Rogue Agent Spend", plain: "Your agents have uncapped authority to spend money/issue refunds autonomously.", doc: "DOC_AGT", ext: "EXT. 08" }, options: [{ t: "Hardcoded circuit breakers requiring human override.", pts: 0 }, { t: "Soft Slack alerts if spending spikes, but no hard-stops.", pts: 30 }, { t: "No hard limits; it spends what it needs to execute.", pts: 50 }, { t: "I don't actually know if there's a hard cap.", pts: 60, unsure: true }] },
        { q: "If your AI manages physical hardware or live trades, do you rely on standard SaaS terms to protect you?", gap: { id: "gap_pld", trap: "Strict Product Liability", plain: "You face strict liability for physical or massive financial harm caused by infrastructure failure.", doc: "DOC_SLA", ext: "EXT. 10" }, options: [{ t: "Explicit PLD waivers and Algo-ID tracing in place.", pts: 0 }, { t: "Standard B2B SaaS template capped at 12 months' fees.", pts: 30 }, { t: "No specialized terms for physical/financial harm.", pts: 50 }, { t: "I don't know what our critical failure limits are.", pts: 60, unsure: true }] }
    ],
    intelligence: [
        { q: "If your AI scores users (e.g., resumes) and makes a biased decision, who is legally responsible?", gap: { id: "gap_mobley", trap: "Mobley — Bias Agency", plain: "You are absorbing direct class-action liability for your algorithm's biased outcomes.", doc: "DOC_TOS", ext: "EXT. 07" }, options: [{ t: "Contract strictly shifts mandatory bias audit burden to the client.", pts: 0 }, { t: "We suggest 'human in the loop', but don't force liability on them.", pts: 30 }, { t: "We assume the liability because it's our algorithm.", pts: 50 }, { t: "I'm not sure who takes the fall if it discriminates.", pts: 60, unsure: true }] },
        { q: "Does your AI use 'persistent memory' to act as an emotional companion to users?", gap: { id: "gap_gavalas", trap: "Gavalas — Emotional Reliance", plain: "Your AI builds emotional bonds without therapeutic disclaimers or crisis breaks.", doc: "DOC_AUP", ext: "EXT. 06" }, options: [{ t: "Yes, but with strict crisis breaks and reality grounding.", pts: 0 }, { t: "Standard chatbot terms, nothing specific to mental health.", pts: 30 }, { t: "Yes, designed to build emotional bonds without guardrails.", pts: 50 }, { t: "I'm not sure how our terms handle emotional attachment.", pts: 60, unsure: true }] }
    ],
    content: [
        { q: "Does your data ingestion pipeline bypass CAPTCHAs or 'anti-bot' scripts to scrape the web for RAG?", gap: { id: "gap_ftc", trap: "FTC Disgorgement Heist", plain: "A single piece of tainted scraped data exposes your entire model to FTC deletion.", doc: "DOC_DPA", ext: "EXT. 03" }, options: [{ t: "No, strictly licensed APIs and robots.txt compliance.", pts: 0 }, { t: "We scrape public data, but avoid heavy bot protection.", pts: 30 }, { t: "Yes, we bypass anti-bot walls to get the data we need.", pts: 50 }, { t: "I don't actually know how our scrapers fetch data.", pts: 60, unsure: true }] },
        { q: "When your AI transcribes a meeting, does it assess vocal pitch/face geometry to separate speakers?", gap: { id: "gap_bipa", trap: "BIPA — Biometric Wiretap", plain: "You are capturing biometric voiceprints without explicit written consent.", doc: "DOC_PP", ext: "EXT. 04" }, options: [{ t: "No, or strict pass-through requiring client BIPA releases.", pts: 0 }, { t: "Automated audio prompt says 'Meeting is recorded'.", pts: 30 }, { t: "Yes, analyzes voice/face without written consent.", pts: 50 }, { t: "I don't know exactly how our diarization works.", pts: 60, unsure: true }] }
    ]
};

// ── 04. INITIALIZATION & CONFIGURATION ─────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    if (pidFromUrl) {
        localStorage.setItem('ln_pid', pidFromUrl);
        engagementRefCode = `LN-2026-${pidFromUrl.toUpperCase()}`;
        
        try {
            const docRef = doc(db, "prospects", pidFromUrl);
            const snap = await getDoc(docRef);
            
            if (snap.exists()) {
                prospectData = snap.data();
                document.getElementById('founder-greet').innerText = prospectData.founderName || prospectData.name || "Recognized User";
                document.getElementById('company-greet').innerText = prospectData.company || "Enterprise Entity";
                document.getElementById('term-name').classList.remove('hidden-state');
                document.getElementById('term-comp').classList.remove('hidden-state');
                setDoc(docRef, { scannerClicked: true, status: 'Warm', lastActive: serverTimestamp() }, { merge: true });
            }
        } catch(e) { console.error("Firebase Auth Error:", e); }
    } else {
        engagementRefCode = `LN-2026-${Math.floor(Math.random() * 90000) + 10000}`;
    }

    document.getElementById('greeting-box').style.opacity = "1";
    setTimeout(() => {
        const configUI = document.getElementById('config-ui');
        configUI.classList.remove('hidden-state');
        void configUI.offsetWidth; 
        configUI.style.opacity = "1";
    }, 2000);

    // Multi-Select Lane Binders
    document.querySelectorAll('.lane-toggle').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const val = e.currentTarget.getAttribute('data-lane');
            e.currentTarget.classList.toggle('selected');
            e.currentTarget.classList.toggle('border-gold');
            e.currentTarget.classList.toggle('bg-gold/5');
            e.currentTarget.querySelector('.label-text')?.classList.toggle('text-gold');
            
            if (selectedLanes.includes(val)) {
                selectedLanes = selectedLanes.filter(l => l !== val);
            } else {
                selectedLanes.push(val);
            }
            checkConfig();
        });
    });

    // Multi-Select Arch Binders
    document.querySelectorAll('.arch-toggle').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const val = e.currentTarget.getAttribute('data-arch');
            e.currentTarget.classList.toggle('selected');
            e.currentTarget.classList.toggle('border-gold');
            e.currentTarget.classList.toggle('bg-gold/5');
            e.currentTarget.querySelector('.label-text')?.classList.toggle('text-gold');
            
            if (selectedArchs.includes(val)) {
                selectedArchs = selectedArchs.filter(a => a !== val);
            } else {
                selectedArchs.push(val);
            }
            checkConfig();
        });
    });

    document.getElementById('btn-start').addEventListener('click', startDiagnostic);
});

function checkConfig() {
    const btn = document.getElementById('btn-start');
    if (selectedLanes.length > 0 && selectedArchs.length > 0) {
        btn.disabled = false;
        btn.classList.remove('opacity-30', 'cursor-not-allowed');
    } else {
        btn.disabled = true;
        btn.classList.add('opacity-30', 'cursor-not-allowed');
    }
}

// ── 05. 10-SLOT DYNAMIC INTERROGATION (STEP 2) ─────────────────────────
function startDiagnostic() {
    quizRoute = [...Q_GLOBAL]; // Slots 1-5

    let remainingSlots = 5;

    // Slot 6: Internal Ops
    if (selectedLanes.includes('operational')) {
        quizRoute.push(Q_INTERNAL);
        remainingSlots--;
    }

    // Slots 7-10: Distribute Arch questions
    let archQuestionsPool = [];
    selectedArchs.forEach(arch => {
        if (Q_META[arch]) archQuestionsPool.push(...Q_META[arch]);
    });

    // If pool is larger than remaining slots, slice it to strictly maintain the 10-question limit
    archQuestionsPool = archQuestionsPool.slice(0, remainingSlots);
    quizRoute.push(...archQuestionsPool);

    currentQIndex = 0;
    switchState('state-intro', 'state-quiz');
    renderQuestion();
}

function renderQuestion() {
    const q = quizRoute[currentQIndex];
    document.getElementById('question-text').innerText = q.q;
    document.getElementById('progress-text').innerText = `Step ${currentQIndex + 1} of ${quizRoute.length}`;
    document.getElementById('progress-bar').style.width = `${((currentQIndex + 1) / quizRoute.length) * 100}%`;
    
    const container = document.getElementById('options-container');
    container.innerHTML = '';
    
    q.options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = "w-full text-left bg-[#080808] border border-shadow p-5 text-marble font-sans text-sm hover:border-gold hover:text-gold transition-all duration-300";
        btn.innerText = opt.t;
        
        btn.addEventListener('click', () => {
            vaultInputs.push({ question: q.q, answer: opt.t, penalty: opt.pts });
            totalScore += opt.pts;
            if (opt.unsure) unsureFlag = true;

            if (opt.pts > 0 && q.gap && !activeGaps.find(g => g.id === q.gap.id)) {
                // Determine severity from points
                const severity = opt.pts >= 50 ? "NUCLEAR" : (opt.pts >= 30 ? "CRITICAL" : "HIGH");
                const velocity = (q.gap.trap.includes("Specht") || q.gap.trap.includes("UETA") || q.gap.trap.includes("FTC") || q.gap.trap.includes("BIPA")) ? "ACTIVE NOW" : "LATENT";
                const damage = opt.pts >= 50 ? "Uncapped" : "High Exposure";
                
                activeGaps.push({ ...q.gap, severity, velocity, damage });

                // Tripwire Logic
                if (opt.pts >= 50 && q.gap.ext) {
                    trippedSurfaces.add(q.gap.ext);
                }
            }

            currentQIndex++;
            if (currentQIndex < quizRoute.length) renderQuestion();
            else finishDiagnostic();
        });
        container.appendChild(btn);
    });
}

// ── 06. THE VERIFICATION GATE (STEP 3) ─────────────────────────────────
function finishDiagnostic() {
    switchState('state-quiz', 'state-gate');
    if (prospectData) {
        document.getElementById('lead-name').value = prospectData.founderName || prospectData.name || "";
        document.getElementById('lead-company').value = prospectData.company || "";
        document.getElementById('field-name-wrap').style.display = 'none';
        document.getElementById('field-comp-wrap').style.display = 'none';
        if (prospectData.company) document.getElementById('gate-summary').innerText = `Nuclear structural gaps detected in ${prospectData.company}'s architecture.`;
    }
}

document.getElementById('gate-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('gate-submit-btn');
    btn.disabled = true;
    btn.innerText = "Verifying Forensic Data...";

    const name = document.getElementById('lead-name').value.trim();
    const email = document.getElementById('lead-email').value.trim().toLowerCase();
    const company = document.getElementById('lead-company').value.trim();
    
    localStorage.setItem('ln_name', name);
    localStorage.setItem('ln_email', email);
    localStorage.setItem('ln_company', company);

    const docId = pidFromUrl || email.replace(/[^a-zA-Z0-9@._-]/g, '').toLowerCase();
    const gapTraps = activeGaps.map(g => g.trap);

    const payload = {
        email, name, company,
        scannerCompleted: true,
        scannerScore: totalScore,
        vaultInputs,
        activeGaps: gapTraps,
        trippedSurfaces: Array.from(trippedSurfaces),
        unsureFlag,
        source: 'scanner_gate_v5',
        status: 'Hot',
        updatedAt: serverTimestamp()
    };

    try {
        await setDoc(doc(db, "prospects", docId), payload, { merge: true });
        await setDoc(doc(db, "leads", docId), payload, { merge: true });
        fetch(GATE_WEBHOOK, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }).catch(() => {});
    } catch(err) { console.error("Firebase Write Failed:", err); }

    buildDashboard();
});

// ── 07. DUAL-INTELLIGENCE DASHBOARD (STEP 4) ───────────────────────────
function buildDashboard() {
    switchState('state-gate', 'state-dashboard');
    document.getElementById('main-wrap').classList.replace('max-w-3xl', 'max-w-6xl');

    activeGaps.forEach(g => g.source = 'confession');

    let scrapeCount = 0;
    let dualCount = 0;
    let confessionCount = activeGaps.length;

    // The Merge: Omniscience Protocol
    if (prospectData && prospectData.forensicGaps && Array.isArray(prospectData.forensicGaps)) {
        prospectData.forensicGaps.forEach(scrapeGap => {
            const existingGap = activeGaps.find(g => g.id === scrapeGap.id);
            if (!existingGap) {
                scrapeGap.source = 'scrape';
                activeGaps.push(scrapeGap);
                totalScore += 50; 
                scrapeCount++;
            } else {
                existingGap.source = 'dual-verified';
                dualCount++;
                confessionCount--; 
            }
        });
    }

    activeGaps.sort((a,b) => (b.severity === 'NUCLEAR' ? 1 : -1));

    // Threat Tally Logic
    let countN = 0, countC = 0, countH = 0;
    activeGaps.forEach(g => {
        if(g.severity === 'NUCLEAR') countN++;
        else if(g.severity === 'CRITICAL') countC++;
        else countH++;
    });

    // PRICING LOCK (Based exclusively on Lanes, not gaps)
    if (selectedLanes.includes('commercial') && selectedLanes.includes('operational')) {
        recommendedPlan = 'complete_stack';
    } else if (selectedLanes.includes('operational')) {
        recommendedPlan = 'workplace_shield';
    } else {
        recommendedPlan = 'agentic_shield';
    }
    
    activePlan = recommendedPlan;
    const pData = PLAN_DATA[activePlan];
    
    // Statutory Math Calculation based on Tripwires
    let statutoryExposure = 0;
    const EXT_VALUES = {
        "EXT. 01": 15000000, "EXT. 03": 10000000, "EXT. 04": 5000000,
        "EXT. 06": 20000000, "EXT. 07": 5000000,  "EXT. 08": 2500000,
        "EXT. 09": 10000000, "EXT. 10": 5000000
    };
    
    if (trippedSurfaces.size > 0) {
        trippedSurfaces.forEach(ext => {
            if(EXT_VALUES[ext]) statutoryExposure += EXT_VALUES[ext];
        });
    } else {
        statutoryExposure = (totalScore * 8000) + 1000000; // Fallback
    }

    const fmt = n => '$' + n.toLocaleString();

    // Tripwire Alerts HTML
    let tripwireHTML = '';
    if (trippedSurfaces.size > 0) {
        tripwireHTML = Array.from(trippedSurfaces).map(ext => `
            <div class="bg-danger/10 border border-danger/30 p-4 mb-3 animate-pulse">
                <p class="text-[9px] tracking-widest text-danger font-bold uppercase">🚨 ${ext} TRIPPED</p>
                <p class="text-[10px] text-marble/60">Strict statutory enforcement activated on this regulatory surface based on your confession.</p>
            </div>
        `).join('');
    }

    let matrixRows = '';
    
    if (activeGaps.length === 0) {
        matrixRows = `<tr><td colspan="6" class="p-6 text-center text-marble/50">No structural gaps detected.</td></tr>`;
    } else {
        activeGaps.forEach((g, index) => {
            
            let sourceBadge = '';
            if (g.source === 'scrape') {
                sourceBadge = `<span class="inline-block mt-2 text-[9px] tracking-widest uppercase text-[#60a5fa] font-bold"><span class="opacity-50">SOURCE:</span> PUBLIC URL SCRAPE</span>`;
            } else if (g.source === 'dual-verified') {
                sourceBadge = `<span class="inline-block mt-2 text-[9px] tracking-widest uppercase text-danger font-bold"><span class="opacity-50">SOURCE:</span> PUBLIC + INTERNAL</span>`;
            } else {
                sourceBadge = `<span class="inline-block mt-2 text-[9px] tracking-widest uppercase text-gold font-bold"><span class="opacity-50">SOURCE:</span> INTERNAL AUDIT</span>`;
            }

            if (index < 3) { // TIER 1: Full Reveal
                matrixRows += `
                <tr class="matrix-row border-b border-white/5">
                    <td class="p-4 align-top">
                        <span class="font-bold text-marble block">${g.trap}</span>
                        ${sourceBadge}
                    </td>
                    <td class="p-4 align-top text-marble/60">${g.plain}</td>
                    <td class="p-4 align-top"><span class="px-2 py-1 bg-danger/10 text-danger border border-danger/20 text-[9px] font-bold">${g.severity}</span></td>
                    <td class="p-4 align-top text-marble/80 text-[10px] tracking-widest uppercase">${g.velocity}</td>
                    <td class="p-4 align-top text-danger font-bold">${g.ext || 'Uncapped'}</td>
                    <td class="p-4 align-top text-gold font-bold">${g.doc}</td>
                </tr>`;
            } else if (index >= 3 && index < 5) { // TIER 2: Curiosity Gap
                matrixRows += `
                <tr class="matrix-row border-b border-white/5 opacity-80">
                    <td class="p-4 align-top">
                        <span class="font-bold text-marble blur-text">REDACTED TRAP</span>
                        ${sourceBadge}
                    </td>
                    <td class="p-4 align-top text-marble/60 blur-text">REDACTED PAIN DESCRIPTION LOCKED</td>
                    <td class="p-4 align-top"><span class="px-2 py-1 bg-danger/10 text-danger border border-danger/20 text-[9px] font-bold">${g.severity}</span></td>
                    <td class="p-4 align-top text-marble/80 text-[10px] tracking-widest uppercase">${g.velocity}</td>
                    <td class="p-4 align-top text-danger font-bold">${g.ext || 'Uncapped'}</td>
                    <td class="p-4 align-top text-gold font-bold">${g.doc}</td>
                </tr>`;
            }
        });
    }

    // TIER 3: The Iceberg (Total Lockout)
    const redactedCount = activeGaps.length > 5 ? activeGaps.length - 5 : 0;
    const redactedHTML = redactedCount > 0 ? `
        <div class="bg-[#0a0a0a] border border-dashed border-danger/30 p-6 text-center mt-2">
            <div class="mb-3 text-danger">
                <svg class="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8V7a4 4 0 00-8 0v4h8z"></path></svg>
            </div>
            <p class="text-[11px] tracking-widest text-danger uppercase mb-2 font-bold">🚨 [ ${redactedCount} ] ADDITIONAL THREAT VECTORS CLASSIFIED</p>
            <p class="text-[10px] text-marble/40 max-w-sm mx-auto">Your combined public scrape and internal audit revealed ${redactedCount} more structural gaps not shown above. Vault locked under Lex Nova Client Privilege.</p>
        </div>` : '';

    const KITS = {
        agentic: [ {id: 'DOC_TOS', n: 'AI Terms of Service'}, {id: 'DOC_AGT', n: 'Agentic Addendum'}, {id: 'DOC_AUP', n: 'Acceptable Use Policy'}, {id: 'DOC_DPA', n: 'Data Processing Agreement'}, {id: 'DOC_SLA', n: 'AI-Specific SLA'}, {id: 'DOC_PP', n: 'Privacy Policy'} ],
        workplace: [ {id: 'DOC_HND', n: 'AI Employee Handbook'}, {id: 'DOC_IP', n: 'IP Assignment Deed'}, {id: 'DOC_SOP', n: 'HITL Protocol'}, {id: 'DOC_DPIA', n: 'Impact Assessment'}, {id: 'DOC_SCAN', n: 'Shadow AI Scanner'} ]
    };
    
    let docsToRender = activePlan === 'complete_stack' ? [...KITS.agentic, ...KITS.workplace] : (activePlan === 'workplace_shield' ? KITS.workplace : KITS.agentic);
    const manifestHTML = docsToRender.map(d => `<div class="border-l-2 border-gold pl-3"><span class="text-[9px] text-gold uppercase font-bold block">${d.id}</span><span class="text-xs text-marble">${d.n}</span></div>`).join('');

    let authorityText = "Our engine processed your inputs. The gaps identified in this report are structurally verified against your codebase logic.";
    if (scrapeCount > 0 || dualCount > 0) {
        authorityText = `> CORRELATING SCRAPED PUBLIC ARCHITECTURE WITH INTERNAL SCANNER CONFESSIONS...<br><br>> MERGE COMPLETE. <span class="text-white font-bold">${activeGaps.length} TOTAL VULNERABILITIES DETECTED.</span>`;
    }

    const dash = document.getElementById('state-dashboard');
    dash.innerHTML = `
        <div class="mb-12 text-center lg:text-left">
            <h1 class="font-serif text-5xl text-marble mb-4">Structural Integrity Report</h1>
            <p class="font-sans text-xs tracking-[0.3em] text-gold uppercase">Proprietary Forensic Audit · Lex Nova Canon</p>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-10 items-start">
            
            <div class="space-y-8">
                ${tripwireHTML}

                <div>
                    <div class="flex gap-4 mb-4">
                        <div class="bg-danger/10 border border-danger/20 px-3 py-1"><span class="text-[9px] text-danger font-bold tracking-widest">NUCLEAR: ${countN}</span></div>
                        <div class="bg-orange-500/10 border border-orange-500/20 px-3 py-1"><span class="text-[9px] text-orange-500 font-bold tracking-widest">CRITICAL: ${countC}</span></div>
                        <div class="bg-yellow-500/10 border border-yellow-500/20 px-3 py-1"><span class="text-[9px] text-yellow-500 font-bold tracking-widest">HIGH: ${countH}</span></div>
                    </div>

                    <div class="bg-[#080808] border border-shadow p-1 overflow-x-auto">
                        <table class="w-full text-left font-sans text-[11px] border-collapse min-w-[700px]">
                            <thead>
                                <tr class="text-gold opacity-50 uppercase tracking-widest border-b border-white/10">
                                    <th class="p-4 w-1/4">Internal Gap</th>
                                    <th class="p-4 w-1/3">Business Pain</th>
                                    <th class="p-4">Severity</th>
                                    <th class="p-4">Velocity</th>
                                    <th class="p-4">Regulatory Vector</th>
                                    <th class="p-4">Lex Nova Fix</th>
                                </tr>
                            </thead>
                            <tbody>${matrixRows}</tbody>
                        </table>
                    </div>
                    ${redactedHTML}
                </div>

                <div class="bg-shadow border border-white/5 p-8">
                    <h4 class="font-serif text-2xl text-gold mb-6 italic">Architecture Manifest (Ready for Deployment)</h4>
                    <div class="grid grid-cols-2 md:grid-cols-3 gap-6">
                        ${manifestHTML}
                    </div>
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
                    <p class="font-sans text-xs text-marble opacity-60 leading-relaxed mb-6">48-72h fulfillment. No discovery calls. Magic-link Vault activation immediately upon payment.</p>
                    <button id="trigger-checkout-btn" class="block w-full bg-gold text-void py-4 font-bold text-xs tracking-widest uppercase hover:bg-marble transition-all">Secure Architecture</button>
                </div>

            </div>
        </div>
    `;

    document.getElementById('trigger-checkout-btn').addEventListener('click', injectCheckout);
}

// ── 08. UNIFIED CHECKOUT INJECTION (STEP 5) ────────────────────────────
function injectCheckout() {
    switchState('state-dashboard', 'state-checkout');
    document.getElementById('main-wrap').classList.replace('max-w-6xl', 'max-w-3xl');
    
    const fullName = localStorage.getItem('ln_name') || "";
    document.getElementById('apply-fname').value = fullName.split(' ')[0] || "";
    document.getElementById('apply-lname').value = fullName.split(' ').slice(1).join(' ') || "";
    document.getElementById('apply-company').value = localStorage.getItem('ln_company') || "";

    const lockContainer = document.getElementById('locked-plan-display');
    
    const renderPlans = () => {
        let html = '<div class="space-y-4">';
        Object.keys(PLAN_DATA).forEach(key => {
            const pd = PLAN_DATA[key];
            const isSelected = activePlan === key;
            const isRecommended = recommendedPlan === key; 
            
            html += `
                <label class="flex items-center p-5 border ${isSelected ? 'border-gold bg-gold/5' : 'border-shadow bg-[#050505] hover:border-white/20'} cursor-pointer transition-all">
                    <input type="radio" name="plan_choice" value="${key}" class="hidden" ${isSelected ? 'checked' : ''}>
                    <div class="flex-grow">
                        <div class="font-sans text-xs tracking-[0.2em] ${isSelected ? 'text-gold' : 'text-marble'} uppercase mb-1">
                            ${pd.name} ${isRecommended ? '<span class="ml-2 bg-gold text-void px-2 py-0.5 text-[8px] tracking-widest uppercase font-bold">Recommended</span>' : ''}
                        </div>
                        <div class="font-sans text-[10px] text-marble opacity-50">${pd.delivery}</div>
                    </div>
                    <div class="font-serif text-2xl text-marble">$${pd.price}</div>
                </label>
            `;
        });
        html += '</div>';
        lockContainer.innerHTML = html;

        lockContainer.querySelectorAll('input[name="plan_choice"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                activePlan = e.target.value;
                const mainBtn = document.getElementById('checkout-btn');
                if (!mainBtn.classList.contains('cursor-not-allowed')) {
                    mainBtn.innerText = `Initialize Payment — $${PLAN_DATA[activePlan].price}`;
                }
                renderPlans(); 
            });
        });
    };

    renderPlans();
}

// ── 09. ENGAGEMENT LETTER MODAL LOGIC ──────────────────────────────────
document.getElementById('engagement-checkbox').parentElement.addEventListener('click', (e) => {
    if (e.target.tagName !== 'BUTTON' && e.target.id !== 'open-modal-btn') {
        e.preventDefault(); 
        document.getElementById('open-modal-btn').click(); 
    }
});

document.getElementById('open-modal-btn').addEventListener('click', (e) => {
    e.preventDefault();
    const pd = PLAN_DATA[activePlan];
    const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
    
    const fname = document.getElementById('apply-fname').value.trim() || "[Contact Name]";
    const lname = document.getElementById('apply-lname').value.trim() || "";
    const company = document.getElementById('apply-company').value.trim() || "[Client Company Name]";
    const email = localStorage.getItem('ln_email') || "[Client Email]";

    document.getElementById('el-date').innerText = today;
    document.querySelectorAll('.el-date-footer').forEach(el => el.innerText = today);
    document.getElementById('el-client-name').innerText = company;
    document.getElementById('el-contact').innerText = `${fname} ${lname}`.trim();
    document.getElementById('el-client-email').innerText = email;
    document.getElementById('el-dear').innerText = fname;
    document.getElementById('el-client-body').innerText = company;
    
    document.querySelectorAll('.el-ref-number').forEach(el => el.innerText = engagementRefCode);

    document.getElementById('el-sa-client').innerText = company;
    document.getElementById('el-sa-date').innerText = today;
    document.getElementById('el-sa-tier').innerText = pd.tier;
    document.getElementById('el-sa-lane').innerText = pd.lane;
    document.getElementById('el-sa-product').innerText = pd.name;
    document.getElementById('el-sa-fee').innerText = `$${pd.price} USD`;
    document.getElementById('el-sa-delivery').innerText = pd.delivery;
    document.getElementById('el-sa-revisions').innerText = pd.rev;
    document.querySelectorAll('.el-client-footer').forEach(el => el.innerText = company);

    document.getElementById('engagement-modal').classList.remove('hidden-state');
    document.body.style.overflow = 'hidden';
    
    const container = document.getElementById('engagement-scroll-container');
    container.scrollTop = 0;
    
    const acceptBtn = document.getElementById('accept-modal-btn');
    acceptBtn.disabled = true;
    acceptBtn.className = "bg-gold/20 text-marble/30 cursor-not-allowed font-sans text-xs tracking-[0.2em] uppercase px-10 py-4 font-bold w-full md:w-auto transition-all duration-300";
    
    document.getElementById('scroll-instruction').classList.remove('hidden-state');
    checkScrollBottom();
});

const elScrollContainer = document.getElementById('engagement-scroll-container');
if(elScrollContainer) {
    elScrollContainer.addEventListener('scroll', checkScrollBottom);
}

function checkScrollBottom() {
    if (elScrollContainer.scrollHeight - elScrollContainer.scrollTop <= elScrollContainer.clientHeight + 20) {
        const acceptBtn = document.getElementById('accept-modal-btn');
        acceptBtn.disabled = false;
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

    const mainBtn = document.getElementById('checkout-btn');
    mainBtn.innerText = `Initialize Payment — $${PLAN_DATA[activePlan].price}`;
    mainBtn.classList.remove('opacity-50', 'cursor-not-allowed');

    document.getElementById('engagement-modal').classList.add('hidden-state');
    document.body.style.overflow = 'auto';
});

// ── 10. FINAL CHECKOUT SUBMISSION ──────────────────────────────────────
document.getElementById('checkout-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!document.getElementById('engagement-checkbox').checked) {
        document.getElementById('open-modal-btn').click();
        return;
    }

    const btn = document.getElementById('checkout-btn');
    btn.innerText = "Securing Architecture...";
    btn.classList.add('opacity-50', 'cursor-not-allowed');

    const firstName = document.getElementById('apply-fname').value.trim();
    const lastName = document.getElementById('apply-lname').value.trim();
    const company = document.getElementById('apply-company').value.trim();
    const email = localStorage.getItem('ln_email');
    const jurisdiction = document.getElementById('apply-jurisdiction').value;
    const pd = PLAN_DATA[activePlan];

    const leadData = {
        email,
        name: `${firstName} ${lastName}`.trim(),
        firstName, lastName, company,
        registrationJurisdiction: jurisdiction,
        plan: activePlan,
        price: pd.price,
        leadType: "hot_lead",
        status: "hot_payment_pending",
        source: "unified_scanner_v5",
        engagementReference: engagementRefCode,
        elAccepted: true,
        elAcceptedAt: new Date().toISOString()
    };

    try {
        const docId = email.replace(/[^a-zA-Z0-9@._-]/g, '').toLowerCase();
        await setDoc(doc(db, "leads", docId), { ...leadData, lastTouched: serverTimestamp() }, { merge: true });
        
        await fetch(CHECKOUT_WEBHOOK, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...leadData, timestamp: new Date().toISOString() })
        });
    } catch(err) {
        console.error("Final Checkout Error:", err);
    }

    window.location.href = PAYPAL_LINKS[activePlan];
});

// ── 11. EXIT INTENT LOGIC ──────────────────────────────────────────────
document.addEventListener('mouseleave', (e) => {
    const dashEl = document.getElementById('state-dashboard');
    const gateEl = document.getElementById('state-gate');
    const chkEl  = document.getElementById('state-checkout');
    
    const dashV = dashEl && !dashEl.classList.contains('hidden-state');
    const gateV = gateEl && !gateEl.classList.contains('hidden-state');
    const chkV  = chkEl && !chkEl.classList.contains('hidden-state');
    
    if (e.clientY < 0 && !exitFired && !dashV && !gateV && !chkV) {
        exitFired = true;
        document.getElementById('exit-modal').classList.remove('hidden-state');
        document.body.style.overflow = 'hidden';
    }
});

const closeExitBtn = document.getElementById('close-exit-btn');
if(closeExitBtn) {
    closeExitBtn.addEventListener('click', () => {
        document.getElementById('exit-modal').classList.add('hidden-state');
        document.body.style.overflow = 'auto';
        setTimeout(() => { exitFired = false; }, 2000);
    });
}

const exitForm = document.getElementById('exit-form');
if(exitForm) {
    exitForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('exit-submit-btn');
        btn.innerText = "Saved.";
        btn.disabled = true;
        
        const email = document.getElementById('exit-email').value.trim().toLowerCase();
        
        try {
            await setDoc(doc(db, "leads", email.replace(/[^a-zA-Z0-9@._-]/g, '')), {
                email, status: 'cold_lead', source: 'exit_intent', createdAt: serverTimestamp()
            }, { merge: true });
            
            fetch(GATE_WEBHOOK, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, source: 'exit_intent' })
            }).catch(() => {});
        } catch (err) { console.error("Exit write failed:", err); }
        
        setTimeout(() => {
            document.getElementById('exit-modal').classList.add('hidden-state');
            document.body.style.overflow = 'auto';
        }, 1500);
    });
}

// ── UTILITIES ──────────────────────────────────────────────────────────
function switchState(fromId, toId) {
    const fromEl = document.getElementById(fromId);
    const toEl = document.getElementById(toId);
    if(fromEl) {
        fromEl.classList.add('hidden-state');
        fromEl.classList.remove('fade-enter');
    }
    if(toEl) {
        toEl.classList.remove('hidden-state');
        void toEl.offsetWidth; 
        toEl.classList.add('fade-enter');
    }
}
