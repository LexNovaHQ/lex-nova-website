/**
 * LEX NOVA HQ — FORENSIC ENGINE v6.0
 * /engine/question-router.js - The Interrogator
 * * THE SUPREME COMMAND: This file strictly manages the 10-question logic.
 * It contains ZERO user interface. It builds the route, asks the questions, 
 * and stores the confessions.
 */

// ============================================================================
// 1. THE QUESTION BANK (Immutable Master Script)
// ============================================================================

const Q_GLOBAL = [
    {
        q: "When someone lands on your product for the first time — do they click 'I Agree' before they start using it, or do they just... start?",
        threatId: "UNI_CON_001",
        options: [
            { t: "They hit a hard gate — checkbox or button, can't proceed without it.", pts: 0 },
            { t: "There's a line somewhere saying 'by using this you agree' but no actual click required.", pts: 30 },
            { t: "No formal agreement step — they just sign up and get access.", pts: 50 },
            { t: "I'd have to check with engineering — I'm not actually sure how the signup flow works.", pts: 60, unsure: true }
        ]
    },
    {
        q: "Your AI gives someone wrong information and they lose money because of it. What does your contract actually say happens next?",
        threatId: "UNI_HAL_001",
        options: [
            { t: "We have explicit AI-specific waivers — the user clicked through before first use.", pts: 0 },
            { t: "There's a small disclaimer somewhere near the chat saying AI can be wrong.", pts: 30 },
            { t: "We use standard software terms — we're assuming those hold up for AI too.", pts: 50 },
            { t: "We haven't specifically addressed AI errors in our contracts yet.", pts: 60, unsure: true }
        ]
    },
    {
        q: "If you have users in Europe — where does their data actually go when it hits your AI pipeline?",
        threatId: "UNI_SEC_001",
        options: [
            { t: "EU data stays on EU servers. We have the contractual clauses locked in.", pts: 0 },
            { t: "We have a GDPR privacy policy, but the API calls go to OpenAI or Anthropic's US servers by default.", pts: 30 },
            { t: "Everything routes to whatever endpoint is fastest — we don't restrict by geography.", pts: 50 },
            { t: "Honestly I don't know the exact routing path our data takes.", pts: 60, unsure: true }
        ]
    },
    {
        q: "You're built on OpenAI, Anthropic, or another foundation model. If they get hit with a copyright lawsuit over their training data — does anything in your contract separate you from that?",
        threatId: "UNI_INF_001",
        options: [
            { t: "Yes — we have explicit pass-through clauses that insulate us from upstream IP liability.", pts: 0 },
            { t: "We use their standard API terms and assume their legal issues stay their legal issues.", pts: 30 },
            { t: "Nothing in our contracts addresses this at all.", pts: 50 },
            { t: "I don't know if our contracts cover upstream model liability.", pts: 60, unsure: true }
        ]
    },
    {
        q: "Where does your 'we're not liable for this' language actually live in your terms — and how is it formatted?",
        threatId: "UNI_LIA_004",
        options: [
            { t: "It's in ALL CAPS in a dedicated section that users can't miss.", pts: 0 },
            { t: "It's in there, but formatted the same as everything else — regular sentence case.", pts: 30 },
            { t: "We have a general limitation of liability clause but nothing AI-specific.", pts: 50 },
            { t: "I'd have to pull up our terms to check — I'm not sure how it's formatted.", pts: 60, unsure: true }
        ]
    }
];

const Q_INTERNAL = {
    q: "Right now, today — can your employees paste your source code or a client's data into ChatGPT and walk out the door with it?",
    threatId: "SCAN_INTERNAL_001",
    options: [
        { t: "No — technical blocks, enterprise tools only, and everyone's signed IP assignment agreements.", pts: 0 },
        { t: "We have a policy that says don't do it, but nothing actually stops them technically.", pts: 30 },
        { t: "Yes — the team uses whatever AI tools they want, no restrictions.", pts: 50 },
        { t: "I genuinely don't know what AI tools people are using or what they're feeding into them.", pts: 60, unsure: true }
    ]
};

const Q_META = {
    actions: [
        { q: "If your AI starts making decisions or spending money on a loop at 3am — what actually stops it?", threatId: "INT01_AGT_001", options: [{t:"Hard cap", pts:0}, {t:"Alert only", pts:30}, {t:"Runs until done", pts:50}, {t:"Unsure", pts:60, unsure:true}] },
        { q: "Your AI recommends something... and that recommendation costs them real money. What does your contract say you owe them?", threatId: "INT09_REC_001", options: [{t:"Explicit clause", pts:0}, {t:"General liability only", pts:30}, {t:"Nothing", pts:50}, {t:"Unsure", pts:60, unsure:true}] },
        { q: "Your AI controls something in the physical world... If it causes injury or property damage, does your contract put a ceiling on what you pay?", threatId: "INT10_PHY_001", options: [{t:"Explicit liability cap", pts:0}, {t:"General limits only", pts:30}, {t:"No physical harm terms", pts:50}, {t:"Unsure", pts:60, unsure:true}] }
    ],
    evaluates: [
        { q: "If your AI makes a wrong call about a person (bad hire, denied claim) — who does your contract say is responsible for that?", threatId: "INT02_DIS_001", options: [{t:"Liability shifted to client", pts:0}, {t:"Human review recommended", pts:30}, {t:"We built it, we're on hook", pts:50}, {t:"Unsure", pts:60, unsure:true}] },
        { q: "Your AI is supposed to catch something (fraud, breach)... It misses. What does your contract say about who pays for the fallout?", threatId: "INT08_SEC_001", options: [{t:"Exposure capped at fees", pts:0}, {t:"General disclaimer only", pts:30}, {t:"Nothing addresses this", pts:50}, {t:"Unsure", pts:60, unsure:true}] }
    ],
    creates: [
        { q: "When your AI produces an output... does your contract say who owns it and what you're liable for if it's wrong or stolen?", threatId: "INT04_COP_001", options: [{t:"Explicit assignment", pts:0}, {t:"Standard software terms", pts:30}, {t:"Nothing addresses AI", pts:50}, {t:"Unsure", pts:60, unsure:true}] },
        { q: "Does your system pull data from the web, scrape documents, or ingest content from sources outside your own platform?", threatId: "INT05_DIS_001", options: [{t:"Licensed sources only", pts:0}, {t:"Public data, no bot protection", pts:30}, {t:"Wherever data is", pts:50}, {t:"Unsure", pts:60, unsure:true}] },
        { q: "Your AI processes human voice... Do you have explicit written consent from every person whose voice enters your system?", threatId: "INT07_BIO_001", options: [{t:"Written consent before", pts:0}, {t:"General terms only", pts:30}, {t:"No consent step", pts:50}, {t:"Unsure", pts:60, unsure:true}] },
        { q: "Under the hood, your product calls other AI models... If one of them produces something harmful — who does your contract say pays?", threatId: "INT06_ORC_001", options: [{t:"Pass-through clauses", pts:0}, {t:"Standard API terms", pts:30}, {t:"We are on the hook", pts:50}, {t:"Unsure", pts:60, unsure:true}] }
    ],
    talks: [
        { q: "If your AI builds an ongoing relationship with a user... what happens in your contract when that goes wrong?", threatId: "INT03_COM_002", options: [{t:"Crisis break clauses", pts:0}, {t:"Standard chatbot terms", pts:30}, {t:"No guardrails", pts:50}, {t:"Unsure", pts:60, unsure:true}] },
        { q: "Does your AI adapt how it talks to people based on their behavior... using urgency or emotional language to drive them toward a decision?", threatId: "INT03_CON_002", options: [{t:"Disclosed with opt-out", pts:0}, {t:"Adapts but not disclosed", pts:30}, {t:"Persuasive by design", pts:50}, {t:"Unsure", pts:60, unsure:true}] }
    ]
};

// ============================================================================
// 2. THE EXECUTION STATE (Memory)
// ============================================================================

let currentRoute = [];
let currentQIndex = 0;
let interrogationState = {
    vaultInputs: [],   // Stores the exact Q&A strings
    activeGaps: [],    // Stores the Threat_IDs they triggered
    totalScore: 0,     // Severity math
    unsureFlag: false  // Did they admit they don't know?
};

// ============================================================================
// 3. CORE EXECUTIONS (The Interrogation Logic)
// ============================================================================

/**
 * Builds the strict 10-question array based on their architecture.
 */
export function buildInterrogationRoute(selectedLanes, selectedArchs) {
    const TARGET = 10;
    currentRoute = [...Q_GLOBAL]; 
    const usedThreatIds = new Set(Q_GLOBAL.map(q => q.threatId));

    if (selectedLanes.includes('operational')) {
        currentRoute.push(Q_INTERNAL);
        usedThreatIds.add(Q_INTERNAL.threatId);
    }

    const archPriority = ['actions', 'evaluates', 'creates', 'talks'];
    
    // Phase 1: Pull from explicitly selected archetypes
    archPriority.forEach(arch => {
        if (!selectedArchs.includes(arch) || !Q_META[arch]) return;
        Q_META[arch].forEach(q => {
            if (!usedThreatIds.has(q.threatId) && currentRoute.length < TARGET) {
                currentRoute.push(q);
                usedThreatIds.add(q.threatId);
            }
        });
    });

    // Phase 2: Pad with generic threats if under 10
    archPriority.forEach(arch => {
        if (selectedArchs.includes(arch) || !Q_META[arch]) return;
        Q_META[arch].forEach(q => {
            if (!usedThreatIds.has(q.threatId) && currentRoute.length < TARGET) {
                currentRoute.push(q);
                usedThreatIds.add(q.threatId);
            }
        });
    });

    // Reset Memory for a clean run
    currentQIndex = 0;
    interrogationState = { vaultInputs: [], activeGaps: [], totalScore: 0, unsureFlag: false };
    
    console.log(`> INTERROGATOR: Route locked. ${currentRoute.length} questions queued.`);
}

/**
 * Hands the current question to the UI module.
 */
export function getNextQuestion() {
    if (currentQIndex >= currentRoute.length) return null; // Interrogation complete

    const q = currentRoute[currentQIndex];
    return {
        questionText: q.q,
        options: q.options,
        stepCurrent: currentQIndex + 1,
        stepTotal: currentRoute.length
    };
}

/**
 * Processes the user's click, updates the score, and logs the threat.
 * Returns boolean: TRUE if interrogation continues, FALSE if complete.
 */
export function submitAnswer(selectedOptionIndex) {
    // GUARD: Refuse to process if the interrogation is already over
    if (currentQIndex >= currentRoute.length) return false;

    const q = currentRoute[currentQIndex];
    const opt = q.options[selectedOptionIndex];

    // Log the raw text for the final output report
    interrogationState.vaultInputs.push({
        question: q.q,
        answer: opt.t,
        penalty: opt.pts
    });

    interrogationState.totalScore += opt.pts;
    if (opt.unsure) interrogationState.unsureFlag = true;

    // Any score > 0 means the gap is active
    if (opt.pts > 0 && !interrogationState.activeGaps.includes(q.threatId)) {
        interrogationState.activeGaps.push(q.threatId);
    }

    currentQIndex++;
    return currentQIndex < currentRoute.length;
}

/**
 * Hands the final payload to the Scoring Engine.
 */
export function getInterrogationPayload() {
    return interrogationState;
}
