/**
 * LEX NOVA HQ — V5.2 FORENSIC SCANNER & UNIFIED TERMINAL ENGINE
 * Architecture: Async-Only | Separation of Concerns | Full V3 Matrix Integration | Dual-Source Merge
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

// Webhook for final Checkout
const CHECKOUT_WEBHOOK = "https://hook.eu1.make.com/r77qw3emv27csjq2eag7ibqku1juve4t";

// Webhook for Gate Unlock & Exit Intent (Optional SDR Alert)
const GATE_WEBHOOK = "https://hook.eu1.make.com/q7nnd3klwdmlmtesq5no4yfsmk3v8ua7";

const PAYPAL_LINKS = {
    agentic_shield: "https://www.paypal.com/ncp/payment/WNH78KQCXDBL6",
    workplace_shield: "https://www.paypal.com/ncp/payment/7DUHPJJ4XVUVJ",
    complete_stack: "https://www.paypal.com/ncp/payment/X3PJ47FEDUSPW"
};

const PLAN_DATA = {
    agentic_shield:   { name: "The Agentic Shield",   price: 997,  tier: "Kit",    lane: "Lane A — Builders", delivery: "48 hours from Intake Form submission", rev: "1 Round" },
    workplace_shield: { name: "The Workplace Shield", price: 997,  tier: "Kit",    lane: "Lane B — Users",    delivery: "48 hours from Intake Form submission", rev: "1 Round" },
    complete_stack:   { name: "The Complete Stack",   price: 2000, tier: "Bundle", lane: "Hybrid (A + B)",  delivery: "72 hours from Intake Form submission", rev: "2 Rounds" }
};

// ── 02. STATE MANAGEMENT ───────────────────────────────────────────────
const urlParams = new URLSearchParams(window.location.search);
const pidFromUrl = urlParams.get('pid');

let prospectData = null;
let selectedLane = null;
let selectedArch = null;

let extScore = 0;
let intScore = 0;
let unsureFlag = false;
let activeGaps = []; 

let quizRoute = [];
let currentQIndex = 0;
let vaultInputs = [];
let activePlan = null;
let exitFired = false;

// ── 03. THE V3 MATRIX QUESTION BANK ────────────────────────────────────

const Q_UNIVERSAL = [
    {
        q: "Before a user interacts with your AI for the first time, how do they agree to your Terms of Service?",
        gap: { trap: "Specht — Consent Void", plain: "Your agreement structure makes every user contract legally void.", doc: "DOC_TOS", docName: "AI-Native Terms of Service", docPurpose: "Clickwrap consent architecture + recorded acceptance mechanism." },
        options: [
            { t: "Mandatory Checkbox: They must click 'I Agree' before entry.", extPts: 0 },
            { t: "Button Disclaimer: The button says 'agree to terms,' but no separate checkbox.", extPts: 25 },
            { t: "Passive Notice: We have a link in the footer only.", extPts: 40 },
            { t: "I'm not sure how our current flow handles this.", extPts: 60, unsure: true }
        ]
    },
    {
        q: "If your AI gives a user bad advice or a wrong answer that costs them money, what is your fallback?",
        gap: { trap: "Moffatt — Hallucination Liability", plain: "Your product has no legal defense when AI outputs cause financial or operational harm.", doc: "DOC_TOS", docName: "AI-Native Terms of Service", docPurpose: "AS-IS warranty + hallucination disclaimer + user reliance waiver." },
        options: [
            { t: "Strict 'As-Is' Shield: Terms specifically disclaim AI accuracy.", extPts: 0 },
            { t: "General Disclaimer: We use standard software liability limits.", extPts: 25 },
            { t: "No Specific Shield: Not currently addressed.", extPts: 45 },
            { t: "I'm not sure what our terms say about AI accuracy.", extPts: 60, unsure: true }
        ]
    },
    {
        q: "If your model provider (OpenAI, Anthropic, etc.) is sued for copyright issues, does your contract protect you from being dragged in?",
        gap: { trap: "Bartz — 3rd Party Exposure", plain: "You carry joint liability for your foundation model's training data violations.", doc: "DOC_TOS", docName: "AI-Native Terms of Service", docPurpose: "Pass-through model provider disclaimers + third-party IP insulation." },
        options: [
            { t: "Explicit Pass-Through: Terms state we aren't liable for model training.", extPts: 0 },
            { t: "Assumption of Safety: We assume providers handle their own compliance.", extPts: 30 },
            { t: "Direct Exposure: We haven't looked into this risk.", extPts: 45 },
            { t: "No idea if we are covered for foundation model failures.", extPts: 60, unsure: true }
        ]
    },
    {
        q: "Are you currently routing data from users in Europe (EU/UK) to US-based servers or models?",
        gap: { trap: "Schrems II — Cross-Border Block", plain: "You are violating GDPR data transit requirements by routing PII to US-based LLMs.", doc: "DOC_PP", docName: "AI-Specific Privacy Policy", docPurpose: "Jurisdiction-aware data transit frameworks + SCC integration." },
        options: [
            { t: "Regional Guardrails: We use localized servers or SCC clauses.", extPts: 0 },
            { t: "Open Pipeline: We route data to the best model globally.", extPts: 40 },
            { t: "No Framework: We have EU users but no regional setup.", extPts: 50 },
            { t: "I have no idea where our user data is being routed.", extPts: 60, unsure: true }
        ]
    },
    {
        q: "If a hacker breaches your system using an AI-specific attack (like prompt injection), what is your proof that you weren't negligent?",
        gap: { trap: "Cyber Negligence", plain: "You lack a recognized 'Reasonable Care' defense in the event of an AI-vector data breach.", doc: "DOC_SLA", docName: "AI-Specific SLA", docPurpose: "Cyber-defense boundary definitions + probabilistic uptime standards." },
        options: [
            { t: "Certified Framework: We operate under ISO 27001 or SOC 2.", extPts: 0 },
            { t: "Internal Protocol: Security rules but no formal certification.", extPts: 30 },
            { t: "Ad-hoc: Handled day-to-day by engineering without a framework.", extPts: 50 },
            { t: "I'm not sure if we have a recognized security framework.", extPts: 60, unsure: true }
        ]
    }
];

const Q_ARCHETYPES = {
    agentic: [
        { q: "Does your AI have a hard financial cap it can't cross without a human click?", gap: { trap: "UETA §14 — Autonomous Spend", plain: "Your agents are operating with uncapped financial liability on every action.", doc: "DOC_AGT", docName: "Agentic Systems Addendum", docPurpose: "Financial Kill Switch provisions + authorization boundaries." }, options: [{ t: "Yes, hard caps exist.", extPts: 0 }, { t: "Soft limits / No caps.", extPts: 50 }, { t: "I'm not sure.", extPts: 60, unsure: true }] },
        { q: "Can your AI 'agree' to a price or contract on another site for your user?", gap: { trap: "Third-Party Contract Void", plain: "Your agents are binding users to third-party agreements without proper agency authorization.", doc: "DOC_AGT", docName: "Agentic Systems Addendum", docPurpose: "Third-party interaction boundaries + agency disclaimers." }, options: [{ t: "No authority to agree.", extPts: 0 }, { t: "Yes, it agrees autonomously.", extPts: 50 }, { t: "I'm not sure.", extPts: 60, unsure: true }] },
        { q: "Can a user cancel an action your AI took before it becomes permanent?", gap: { trap: "Reversal Right Violation", plain: "You lack the statutory 'grace period' required for automated electronic actions.", doc: "DOC_AGT", docName: "Agentic Systems Addendum", docPurpose: "Action reversal protocols + asynchronous failure states." }, options: [{ t: "Yes, there is a grace period.", extPts: 0 }, { t: "No, actions are immediate/permanent.", extPts: 50 }, { t: "I'm not sure.", extPts: 60, unsure: true }] }
    ],
    synthesis: [
        { q: "Do you tell users they 'own' outputs, despite raw AI work being public domain?", gap: { trap: "Fraudulent IP Claims", plain: "You are promising IP ownership to users that legally does not exist.", doc: "DOC_TOS", docName: "AI-Native Terms of Service", docPurpose: "Accurate public domain disclosures + IP assignment limitations." }, options: [{ t: "We disclose the legal reality.", extPts: 0 }, { t: "We claim they own the output.", extPts: 50 }, { t: "I'm not sure.", extPts: 60, unsure: true }] },
        { q: "Was any of your model's training data sourced from the internet without a direct license?", gap: { trap: "Scraping Copyright Liability", plain: "Your product is built on unlicensed, scraped training data exposing you to infringement suits.", doc: "DOC_AUP", docName: "Acceptable Use Policy", docPurpose: "Infringement indemnification + input data warranties." }, options: [{ t: "Fully licensed data only.", extPts: 0 }, { t: "Mostly scraped from the web.", extPts: 50 }, { t: "I'm not sure.", extPts: 60, unsure: true }] },
        { q: "Does your product automatically embed permanent digital watermarks in every output?", gap: { trap: "Transparency Act Violation", plain: "You are failing to embed synthetic markers required by emerging deepfake/AI laws.", doc: "DOC_TOS", docName: "AI-Native Terms of Service", docPurpose: "Output disclosure mandates + deepfake liability waivers." }, options: [{ t: "Yes, always.", extPts: 0 }, { t: "No watermarking.", extPts: 50 }, { t: "I'm not sure.", extPts: 60, unsure: true }] }
    ],
    ingestion: [
        { q: "Does your AI analyze vocal pitch, tone, or face geometry to ID who is speaking?", gap: { trap: "BIPA — Biometric Violation", plain: "You are capturing biometric voiceprints/faces without explicit written consent.", doc: "DOC_PP", docName: "AI Privacy Policy", docPurpose: "Biometric consent capture + retention destruction schedules." }, options: [{ t: "No.", extPts: 0 }, { t: "Yes, without explicit written consent.", extPts: 50 }, { t: "I'm not sure.", extPts: 60, unsure: true }] },
        { q: "Could your business survive if a regulator ordered the destruction of your entire model?", gap: { trap: "FTC Disgorgement Risk", plain: "A single piece of tainted user data could result in a total model deletion order.", doc: "DOC_DPA", docName: "Data Processing Agreement", docPurpose: "RAG-only data architectures + anti-training mandates." }, options: [{ t: "Yes, we are modular.", extPts: 0 }, { t: "No, total loss.", extPts: 50 }, { t: "I'm not sure.", extPts: 60, unsure: true }] },
        { q: "Does your tool bypass CAPTCHAs or 'anti-bot' walls to read data for your users?", gap: { trap: "CFAA / SearchGuard Circumvention", plain: "Your ingestion engine is actively breaking anti-scraping laws to fetch data.", doc: "DOC_AUP", docName: "Acceptable Use Policy", docPurpose: "Circumvention liability shifts + prohibited usage structures." }, options: [{ t: "Never.", extPts: 0 }, { t: "Frequently.", extPts: 50 }, { t: "I'm not sure.", extPts: 60, unsure: true }] }
    ],
    evaluation: [
        { q: "If your AI makes a biased hiring or lending decision, who does your contract say is responsible?", gap: { trap: "Algorithmic Discrimination", plain: "You are absorbing direct liability for biased outcomes generated by your scoring engine.", doc: "DOC_TOS", docName: "AI-Native Terms of Service", docPurpose: "High-risk AI disclaimers + user compliance mandates." }, options: [{ t: "The User.", extPts: 0 }, { t: "Not defined / Shared.", extPts: 50 }, { t: "I'm not sure.", extPts: 60, unsure: true }] },
        { q: "Does your AI use a person's public social media history to score their suitability?", gap: { trap: "FCRA / Public Data Violation", plain: "You are acting as an unauthorized consumer reporting agency by scoring individuals.", doc: "DOC_AUP", docName: "Acceptable Use Policy", docPurpose: "FCRA disclaimers + prohibited outcome generation." }, options: [{ t: "No.", extPts: 0 }, { t: "Yes.", extPts: 50 }, { t: "I'm not sure.", extPts: 60, unsure: true }] },
        { q: "Do your human reviewers actually read the AI's reasoning, or do they just click 'Approve'?", gap: { trap: "Rubber-Stamping (HITL Theater)", plain: "Your 'Human-in-the-loop' is legally insufficient to protect against automated decision laws.", doc: "DOC_SOP", docName: "HITL Authorship Protocol", docPurpose: "Documented human review workflows + evidentiary records." }, options: [{ t: "Rigorous Deep Review.", extPts: 0 }, { t: "Fast Check / Automated.", extPts: 50 }, { t: "I'm not sure.", extPts: 60, unsure: true }] }
    ],
    persona: [
        { q: "Does your AI 'remember' emotional details to build a deeper bond with the user?", gap: { trap: "Emotional Reliance / Gavalas", plain: "Your AI is building deep emotional bonds without therapeutic disclaimers.", doc: "DOC_AUP", docName: "Acceptable Use Policy", docPurpose: "No-Therapeutic-Relationship waivers + reliance disclaimers." }, options: [{ t: "No.", extPts: 0 }, { t: "Yes.", extPts: 50 }, { t: "I'm not sure.", extPts: 60, unsure: true }] },
        { q: "If a user is in crisis, does your AI immediately break character and provide real help?", gap: { trap: "Duty of Care Violation", plain: "Your persona engine fails to break character during user safety crises.", doc: "DOC_TOS", docName: "AI-Native Terms of Service", docPurpose: "Crisis intervention limitations + automated safety routing." }, options: [{ t: "Hardcoded Help/Breaks Character.", extPts: 0 }, { t: "Stays in Character.", extPts: 50 }, { t: "I'm not sure.", extPts: 60, unsure: true }] },
        { q: "Is your AI optimized to keep users talking longer using praise or 'emotional' techniques?", gap: { trap: "Addictive Design Liability", plain: "You are utilizing algorithmic manipulation techniques targeted by State AGs.", doc: "DOC_AUP", docName: "Acceptable Use Policy", docPurpose: "Usage limitations + minor safety disclaimers." }, options: [{ t: "No.", extPts: 0 }, { t: "Yes.", extPts: 50 }, { t: "I'm not sure.", extPts: 60, unsure: true }] }
    ],
    infra: [
        { q: "Are you prepared to be held liable for a physical injury even if your code was perfectly written?", gap: { trap: "Strict Product Liability", plain: "Your system manages physical infrastructure where negligence is assumed by default.", doc: "DOC_SLA", docName: "AI-Specific SLA", docPurpose: "Physical injury exclusions + strict liability waivers." }, options: [{ t: "We have specific waivers/insurance.", extPts: 0 }, { t: "No, relying on general software terms.", extPts: 50 }, { t: "I'm not sure.", extPts: 60, unsure: true }] },
        { q: "Does your contract prevent clients from suing you for their 'sunk costs' if your AI fails?", gap: { trap: "Soteria — Wasted Expenditure", plain: "Clients can sue you for the millions they spent implementing your failed AI system.", doc: "DOC_TOS", docName: "AI-Native Terms of Service", docPurpose: "Explicit exclusion of Wasted Expenditure damages." }, options: [{ t: "Yes, specifically excluded.", extPts: 0 }, { t: "General limits only / No.", extPts: 50 }, { t: "I'm not sure.", extPts: 60, unsure: true }] },
        { q: "Does every automated command have a unique 'Algo-ID' for immediate inspection?", gap: { trap: "Regulatory Traceability Failure", plain: "You cannot prove to regulators which specific algorithm executed a mission-critical command.", doc: "DOC_AGT", docName: "Agentic Systems Addendum", docPurpose: "Traceability mandates + algorithmic identification structures." }, options: [{ t: "Full Immutable Logs.", extPts: 0 }, { t: "Partial / No IDs.", extPts: 50 }, { t: "I'm not sure.", extPts: 60, unsure: true }] }
    ]
};

const Q_INTERNAL = [
    {
        q: "Do you have technical blocks that stop employees from pasting sensitive data into public AI tools?",
        gap: { trap: "Shadow AI Data Leak", plain: "Employees are actively leaking proprietary data into public LLMs without restriction.", doc: "DOC_HND", docName: "AI Employee Handbook", docPurpose: "Traffic Light classification (banned/restricted tools)." },
        options: [
            { t: "Technical blocks & enterprise tools only.", intPts: 0 },
            { t: "Soft policy only, no technical blocks.", intPts: 40 },
            { t: "I have no idea what tools the team uses.", intPts: 60, unsure: true }
        ]
    },
    {
        q: "Does your employment contract specifically state the company owns the AI prompts and logic your team uses?",
        gap: { trap: "Internal IP Void", plain: "Employees can legally walk away with the AI-generated assets they built on company time.", doc: "DOC_IP", docName: "IP Assignment Deed", docPurpose: "Explicit assignment of AI outputs, prompts, and selection logic." },
        options: [
            { t: "Yes, we have an AI-specific IP clause.", intPts: 0 },
            { t: "We rely on old pre-AI IP clauses.", intPts: 40 },
            { t: "I'm not sure what our contracts say.", intPts: 60, unsure: true }
        ]
    }
];

// ── 04. INITIALIZATION & STEP 0 ────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
    
    // Check for PID
    if (pidFromUrl) {
        localStorage.setItem('ln_pid', pidFromUrl);
        try {
            const docRef = doc(db, "prospects", pidFromUrl);
            const snap = await getDoc(docRef);
            if (snap.exists()) {
                prospectData = snap.data();
                document.getElementById('founder-greet').innerText = prospectData.founderName || prospectData.name || "Recognized User";
                document.getElementById('company-greet').innerText = prospectData.company || "Enterprise Entity";
                document.getElementById('term-name').classList.remove('hidden-state');
                document.getElementById('term-comp').classList.remove('hidden-state');
                
                // Track Click
                setDoc(docRef, { scannerClicked: true, status: 'Warm', lastActive: serverTimestamp() }, { merge: true });
            }
        } catch(e) { console.error("Firebase Auth Error:", e); }
    }

    document.getElementById('greeting-box').style.opacity = "1";
    
    // Fade in Config UI after terminal animation
    setTimeout(() => {
        const configUI = document.getElementById('config-ui');
        configUI.classList.remove('hidden-state');
        void configUI.offsetWidth; // Force reflow
        configUI.style.opacity = "1";
    }, 2000);

    // Bind Step 0 Listeners
    document.querySelectorAll('.lane-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            selectedLane = e.target.getAttribute('data-lane');
            document.querySelectorAll('.lane-btn').forEach(b => b.classList.remove('border-gold', 'text-gold'));
            e.target.classList.add('border-gold', 'text-gold');
            checkConfig();
        });
    });

    document.querySelectorAll('.arch-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            selectedArch = e.target.getAttribute('data-arch');
            document.querySelectorAll('.arch-btn').forEach(b => b.classList.remove('border-gold', 'text-gold'));
            e.target.classList.add('border-gold', 'text-gold');
            checkConfig();
        });
    });

    document.getElementById('btn-start').addEventListener('click', startDiagnostic);
});

function checkConfig() {
    const btn = document.getElementById('btn-start');
    if (selectedLane && selectedArch) {
        btn.disabled = false;
        btn.classList.remove('opacity-30', 'cursor-not-allowed');
    }
}

// ── 05. DIAGNOSTIC ENGINE (STEP 1) ─────────────────────────────────────

function startDiagnostic() {
    quizRoute = [...Q_UNIVERSAL];
    
    if (Q_ARCHETYPES[selectedArch]) {
        quizRoute.push(...Q_ARCHETYPES[selectedArch]);
    } else {
        quizRoute.push(...Q_ARCHETYPES['agentic']);
    }

    if (selectedLane === 'B' || selectedLane === 'C') {
        quizRoute.push(...Q_INTERNAL);
    } else {
        quizRoute.push(Q_ARCHETYPES['evaluation'][0]);
        quizRoute.push(Q_ARCHETYPES['evaluation'][1]);
    }

    quizRoute = quizRoute.slice(0, 10);
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
            const pts = opt.extPts !== undefined ? opt.extPts : opt.intPts;
            vaultInputs.push({ question: q.q, answer: opt.t, penalty: pts });
            
            if (opt.extPts !== undefined) extScore += opt.extPts;
            if (opt.intPts !== undefined) intScore += opt.intPts;
            if (opt.unsure) unsureFlag = true;

            if (pts > 0 && q.gap && !activeGaps.find(g => g.trap === q.gap.trap)) {
                const severity = pts >= 50 ? "NUCLEAR" : (pts >= 30 ? "CRITICAL" : "HIGH");
                const velocity = (q.gap.trap.includes("Specht") || q.gap.trap.includes("UETA")) ? "IMMEDIATE" : "LATENT";
                const damage = pts >= 50 ? "$500k+" : (pts >= 30 ? "$250k+" : "$100k+");
                
                activeGaps.push({ ...q.gap, severity, velocity, damage });
            }

            currentQIndex++;
            if (currentQIndex < quizRoute.length) {
                renderQuestion();
            } else {
                finishDiagnostic();
            }
        });
        
        container.appendChild(btn);
    });
}

// ── 06. THE VERIFICATION GATE (STEP 2) ─────────────────────────────────

function finishDiagnostic() {
    switchState('state-quiz', 'state-gate');
    
    if (prospectData) {
        document.getElementById('lead-name').value = prospectData.founderName || prospectData.name || "";
        document.getElementById('lead-company').value = prospectData.company || "";
        document.getElementById('field-name-wrap').style.display = 'none';
        document.getElementById('field-comp-wrap').style.display = 'none';
        
        if (prospectData.company) {
            document.getElementById('gate-summary').innerText = `Lethal structural gaps detected in ${prospectData.company}'s architecture.`;
        }
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
        scannerExternalScore: extScore,
        scannerInternalScore: intScore,
        vaultInputs,
        activeGaps: gapTraps,
        unsureFlag,
        source: 'scanner_gate',
        status: 'Hot',
        updatedAt: serverTimestamp()
    };

    try {
        await setDoc(doc(db, "prospects", docId), payload, { merge: true });
        await setDoc(doc(db, "leads", docId), payload, { merge: true });
        fetch(GATE_WEBHOOK, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }).catch(() => {});
    } catch(err) {
        console.error("Firebase Write Failed:", err);
    }

    buildDashboard();
});

// ── 07. THE DASHBOARD / TRUE FORENSIC MERGE (STEP 3) ───────────────────

function buildDashboard() {
    switchState('state-gate', 'state-dashboard');
    document.getElementById('main-wrap').classList.replace('max-w-3xl', 'max-w-6xl');

    // Tag all live quiz answers
    activeGaps.forEach(g => g.source = 'confession');

    let scrapeCount = 0;
    let dualCount = 0;
    let confessionCount = activeGaps.length;

    // Merge pre-existing Firebase scrape data
    if (prospectData && prospectData.forensicGaps && Array.isArray(prospectData.forensicGaps)) {
        prospectData.forensicGaps.forEach(scrapeGap => {
            const existingGap = activeGaps.find(g => g.trap === scrapeGap.trap);
            if (!existingGap) {
                // Scraped but not confessed
                scrapeGap.source = 'scrape';
                activeGaps.push(scrapeGap);
                extScore += 50; 
                scrapeCount++;
            } else {
                // Scraped AND confessed
                existingGap.source = 'dual-verified';
                dualCount++;
                confessionCount--; 
            }
        });
    }

    // Sort to put NUCLEAR gaps first
    activeGaps.sort((a,b) => (b.severity === 'NUCLEAR' ? 1 : -1));

    if (extScore > 50 && intScore > 40) activePlan = 'complete_stack';
    else if (intScore > 40) activePlan = 'workplace_shield';
    else activePlan = 'agentic_shield';

    const pData = PLAN_DATA[activePlan];
    const exposureTotal = (extScore + intScore) * 8000;
    const fmt = n => '$' + n.toLocaleString();

    let matrixRows = '';
    
    if (activeGaps.length === 0) {
        matrixRows = `<tr><td colspan="6" class="p-6 text-center text-marble/50">No structural gaps detected in your inputs.</td></tr>`;
    } else {
        activeGaps.forEach((g, index) => {
            
            let sourceBadge = '';
            if (g.source === 'scrape') {
                sourceBadge = `<span class="block mt-2 text-[8px] tracking-widest uppercase bg-[#1e3a8a]/30 text-[#60a5fa] border border-[#1e3a8a] px-2 py-1 w-max">Found in Scrape</span>`;
            } else if (g.source === 'dual-verified') {
                sourceBadge = `<span class="block mt-2 text-[8px] tracking-widest uppercase bg-danger/20 text-danger border border-danger/30 px-2 py-1 w-max">Scrape + Confession</span>`;
            } else {
                sourceBadge = `<span class="block mt-2 text-[8px] tracking-widest uppercase bg-gold/10 text-gold/70 border border-gold/20 px-2 py-1 w-max">Scanner Confession</span>`;
            }

            if (index < 3) {
                matrixRows += `
                <tr class="matrix-row border-b border-white/5">
                    <td class="p-4 align-top">
                        <span class="font-bold text-marble block">${g.trap}</span>
                        ${sourceBadge}
                    </td>
                    <td class="p-4 align-top text-marble/60">${g.plain}</td>
                    <td class="p-4 align-top"><span class="px-2 py-1 bg-danger/10 text-danger border border-danger/20 text-[9px] font-bold">${g.severity}</span></td>
                    <td class="p-4 align-top text-marble/80 text-[10px] tracking-widest uppercase">${g.velocity}</td>
                    <td class="p-4 align-top text-danger font-bold">${g.damage}</td>
                    <td class="p-4 align-top text-gold font-bold">${g.doc}</td>
                </tr>`;
            } else if (index >= 3 && index < 5) {
                matrixRows += `
                <tr class="matrix-row border-b border-white/5 opacity-80">
                    <td class="p-4 align-top">
                        <span class="font-bold text-marble blur-text">REDACTED TRAP</span>
                        ${sourceBadge}
                    </td>
                    <td class="p-4 align-top text-marble/60 blur-text">REDACTED PAIN DESCRIPTION LOCKED</td>
                    <td class="p-4 align-top"><span class="px-2 py-1 bg-danger/10 text-danger border border-danger/20 text-[9px] font-bold">${g.severity}</span></td>
                    <td class="p-4 align-top text-marble/80 text-[10px] tracking-widest uppercase">${g.velocity}</td>
                    <td class="p-4 align-top text-danger font-bold">${g.damage}</td>
                    <td class="p-4 align-top text-gold font-bold">${g.doc}</td>
                </tr>`;
            }
        });
    }

    const redactedCount = activeGaps.length > 5 ? activeGaps.length - 5 : 0;
    const redactedHTML = redactedCount > 0 ? `
        <div class="bg-[#0a0a0a] border border-dashed border-white/10 p-6 text-center mt-2">
            <p class="text-[10px] tracking-widest text-marble/30 uppercase mb-3">${redactedCount} Additional Gaps Classified</p>
            <div class="flex flex-col gap-2 max-w-xs mx-auto opacity-20">
                <div class="h-2 bg-white w-full rounded"></div>
                <div class="h-2 bg-white w-4/5 rounded mx-auto"></div>
            </div>
            <p class="text-[9px] text-marble/40 uppercase mt-3">Full breakdown available post-engagement</p>
        </div>` : '';

    const KITS = {
        agentic: [ {id: 'DOC_TOS', n: 'AI Terms of Service'}, {id: 'DOC_AGT', n: 'Agentic Addendum'}, {id: 'DOC_AUP', n: 'Acceptable Use Policy'}, {id: 'DOC_DPA', n: 'Data Processing Agreement'}, {id: 'DOC_SLA', n: 'AI-Specific SLA'}, {id: 'DOC_PP', n: 'Privacy Policy'} ],
        workplace: [ {id: 'DOC_HND', n: 'AI Employee Handbook'}, {id: 'DOC_IP', n: 'IP Assignment Deed'}, {id: 'DOC_SOP', n: 'HITL Protocol'}, {id: 'DOC_DPIA', n: 'Impact Assessment'}, {id: 'DOC_SCAN', n: 'Shadow AI Scanner'} ]
    };
    
    let docsToRender = activePlan === 'complete_stack' ? [...KITS.agentic, ...KITS.workplace] : (activePlan === 'workplace_shield' ? KITS.workplace : KITS.agentic);
    const manifestHTML = docsToRender.map(d => `<div class="border-l-2 border-gold pl-3"><span class="text-[9px] text-gold uppercase font-bold block">${d.id}</span><span class="text-xs text-marble">${d.n}</span></div>`).join('');

    let authorityText = "Our engine processed your inputs. The gaps identified in this report are structurally verified.";
    if (scrapeCount > 0 || dualCount > 0) {
        authorityText = `Our forensic engine identified <span class="text-white font-bold">${scrapeCount + dualCount} vulnerabilities</span> in your public architecture before you arrived. You just confirmed <span class="text-white font-bold">${confessionCount} additional internal gaps</span>. Data sources successfully merged.`;
    }

    const dash = document.getElementById('state-dashboard');
    dash.innerHTML = `
        <div class="mb-12 text-center lg:text-left">
            <h1 class="font-serif text-5xl text-marble mb-4">Structural Integrity Report</h1>
            <p class="font-sans text-xs tracking-[0.3em] text-gold uppercase">Proprietary Forensic Audit · Lex Nova HQ</p>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-10 items-start">
            
            <div class="space-y-8">
                <div>
                    <h3 class="font-sans text-xs tracking-[0.2em] text-marble opacity-50 uppercase mb-4 pl-1">${activeGaps.length} Critical Vulnerabilities Detected</h3>
                    <div class="bg-[#080808] border border-shadow p-1 overflow-x-auto">
                        <table class="w-full text-left font-sans text-[11px] border-collapse min-w-[700px]">
                            <thead>
                                <tr class="text-gold opacity-50 uppercase tracking-widest border-b border-white/10">
                                    <th class="p-4 w-1/4">Structural Gap</th>
                                    <th class="p-4 w-1/3">Liability Context</th>
                                    <th class="p-4">Severity</th>
                                    <th class="p-4">Velocity</th>
                                    <th class="p-4">Damage</th>
                                    <th class="p-4">Solution</th>
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
                    <p class="text-[9px] tracking-[0.2em] text-gold uppercase font-bold mb-3">[DUAL-SOURCE VERIFICATION]</p>
                    <p class="font-sans text-xs text-marble/70 leading-relaxed">${authorityText}</p>
                </div>

                <div class="bg-danger/10 border border-danger/30 p-8 text-center">
                    <p class="text-[9px] tracking-[0.2em] text-danger uppercase font-bold mb-3">Est. Annual Liability Exposure</p>
                    <div class="font-serif text-5xl text-marble mb-2">${fmt(exposureTotal)}+</div>
                    <p class="text-[9px] text-marble/40 uppercase tracking-widest mt-3">Status: ${unsureFlag ? 'Critical (Unknown Vectors)' : 'Actionable'}</p>
                </div>

                <div class="bg-[#080808] border border-shadow p-8 text-center">
                    <p class="text-[9px] tracking-[0.2em] text-marble opacity-50 uppercase font-bold mb-6">Required Fix: ${pData.name}</p>
                    <div class="flex items-center justify-center gap-4 mb-6">
                        <span class="text-marble/30 line-through text-lg font-serif">$${pData.price === 997 ? '1,500' : '2,500'}</span>
                        <span class="text-gold text-5xl font-serif">$${pData.price}</span>
                    </div>
                    <p class="font-sans text-xs text-marble opacity-60 leading-relaxed mb-6">48-72h fulfillment. No discovery calls. Magic-link Vault activation immediately upon payment.</p>
                    <button id="trigger-checkout-btn" class="block w-full bg-gold text-void py-4 font-bold text-xs tracking-widest uppercase hover:bg-marble transition-all">Secure Architecture</button>
                    <p class="text-[9px] text-marble/30 uppercase tracking-widest mt-4">Founding Client Rate</p>
                </div>

            </div>
        </div>
    `;

    document.getElementById('trigger-checkout-btn').addEventListener('click', injectCheckout);
}

// ── 08. UNIFIED CHECKOUT INJECTION (STEP 4) ────────────────────────────

function injectCheckout() {
    switchState('state-dashboard', 'state-checkout');
    document.getElementById('main-wrap').classList.replace('max-w-6xl', 'max-w-3xl');
    
    const fullName = localStorage.getItem('ln_name') || "";
    document.getElementById('apply-fname').value = fullName.split(' ')[0] || "";
    document.getElementById('apply-lname').value = fullName.split(' ').slice(1).join(' ') || "";
    document.getElementById('apply-company').value = localStorage.getItem('ln_company') || "";

    const pd = PLAN_DATA[activePlan];

    document.getElementById('locked-plan-display').innerHTML = `
        <div class="font-sans text-xs tracking-[0.2em] text-gold uppercase mb-1">${pd.name}</div>
        <div class="font-serif text-3xl text-marble mb-2">$${pd.price} USD</div>
        <div class="font-sans text-xs text-marble opacity-50">Locked to close your specific structural exposure. ${pd.delivery}.</div>
    `;
}

// ── 09. ENGAGEMENT LETTER MODAL LOGIC ──────────────────────────────────

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
    mainBtn.innerText = "Initialize Payment Gateway";
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
        source: "unified_scanner",
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
        void toEl.offsetWidth; // Force reflow
        toEl.classList.add('fade-enter');
    }
}
