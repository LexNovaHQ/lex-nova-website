/**
 * LEX NOVA HQ — FORENSIC ENGINE v6.0
 * /engine/question-router.js - The Interrogator
 *
 * SCHEMA v2.0: All threat IDs migrated to REGISTRY_KEY_v2_0 format.
 * activeGaps now pushes OBJECTS {threatId, penalty} — not strings.
 * vaultInputs now includes threatId per entry for full traceability.
 */

// ============================================================================
// 1. THE QUESTION BANK — REGISTRY v2.0 IDs
// ============================================================================

const Q_GLOBAL = [
    {
        q: "When someone lands on your product for the first time — do they click 'I Agree' before they start using it, or do they just... start?",
        threatId: "UNI_CNS_001",
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
        threatId: "UNI_PRV_001",
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

// Workplace internal-operations question — mapped to UNI_PRV_002 (Missing DPAs / internal data exposure)
const Q_INTERNAL = {
    q: "Right now, today — can your employees paste your source code or a client's data into ChatGPT and walk out the door with it?",
    threatId: "UNI_PRV_002",
    options: [
        { t: "No — technical blocks, enterprise tools only, and everyone's signed IP assignment agreements.", pts: 0 },
        { t: "We have a policy that says don't do it, but nothing actually stops them technically.", pts: 30 },
        { t: "Yes — the team uses whatever AI tools they want, no restrictions.", pts: 50 },
        { t: "I genuinely don't know what AI tools people are using or what they're feeding into them.", pts: 60, unsure: true }
    ]
};

// Archetype-specific questions — all IDs migrated to v2.0
const Q_META = {
    actions: [
        { q: "If your AI starts making decisions or spending money on a loop at 3am — what actually stops it?",
          threatId: "UNI_LIA_007",
          options: [{t:"Hard spend cap + kill switch.", pts:0}, {t:"Alert only, human has to manually stop it.", pts:30}, {t:"Runs until the task completes.", pts:50}, {t:"Unsure.", pts:60, unsure:true}] },
    ],
    evaluates: [
        { q: "If your AI makes a wrong call about a person (bad hire, denied claim) — who does your contract say is responsible for that?",
          threatId: "I02_DEC_001",
          options: [{t:"Liability explicitly shifted to the client deploying it.", pts:0}, {t:"We recommend human review but the contract is silent on liability.", pts:30}, {t:"We built it, we're on the hook.", pts:50}, {t:"Unsure.", pts:60, unsure:true}] },
        { q: "Your AI is supposed to catch something (fraud, breach)... It misses. What does your contract say about who pays for the fallout?",
          threatId: "I08_LIA_001",
          options: [{t:"Exposure capped at fees paid.", pts:0}, {t:"General disclaimer only.", pts:30}, {t:"Nothing addresses this.", pts:50}, {t:"Unsure.", pts:60, unsure:true}] }
    ],
    creates: [
        { q: "When your AI produces an output — does your contract say who owns it and what you're liable for if it's wrong or stolen?",
          threatId: "I04_INF_001",
          options: [{t:"Explicit IP assignment + AI output disclaimer.", pts:0}, {t:"Standard software terms — assuming those apply.", pts:30}, {t:"Nothing addresses AI-generated output.", pts:50}, {t:"Unsure.", pts:60, unsure:true}] },
        { q: "Does your system pull data from the web, scrape documents, or ingest content from sources outside your own platform?",
          threatId: "I05_PRV_001",
          options: [{t:"Licensed sources only, provenance documented.", pts:0}, {t:"Public data — no documented licensing or opt-out compliance.", pts:30}, {t:"We ingest from wherever the data is.", pts:50}, {t:"Unsure.", pts:60, unsure:true}] },
        { q: "Your AI processes human voice or audio — do you have explicit written consent from every person whose voice enters your system?",
          threatId: "I07_BIO_001",
          options: [{t:"Written consent gate before any voice is captured.", pts:0}, {t:"General terms only, no specific voice consent.", pts:30}, {t:"No consent step at all.", pts:50}, {t:"Unsure.", pts:60, unsure:true}] },
        { q: "Under the hood, your product calls other AI models. If one of them produces something harmful — who does your contract say pays?",
          threatId: "I06_LIA_001",
          options: [{t:"Pass-through indemnification clauses in place.", pts:0}, {t:"We rely on standard API terms from each provider.", pts:30}, {t:"We are on the hook for anything our product outputs.", pts:50}, {t:"Unsure.", pts:60, unsure:true}] }
    ],
    talks: [
        { q: "If your AI builds an ongoing relationship with a user — what happens in your contract when that relationship goes wrong?",
          threatId: "I03_HRM_002",
          options: [{t:"Crisis escalation and break clauses explicitly written in.", pts:0}, {t:"Standard chatbot terms, no specific companion liability.", pts:30}, {t:"No guardrails at all.", pts:50}, {t:"Unsure.", pts:60, unsure:true}] },
        { q: "Does your AI adapt how it talks to people based on their behavior — using urgency or emotional language to drive them toward a decision?",
          threatId: "I03_HRM_003",
          options: [{t:"Disclosed with opt-out available.", pts:0}, {t:"It adapts but that's not disclosed anywhere.", pts:30}, {t:"Persuasion by design — that's the product.", pts:50}, {t:"Unsure.", pts:60, unsure:true}] }
    ],
    // Physical world — INT.10 — uses I10_LIA_001 (Bodily Injury Tort Exposure)
    mover: [
        { q: "Your AI controls something in the physical world. If it causes injury or property damage, does your contract put a ceiling on what you pay?",
          threatId: "I10_LIA_001",
          options: [{t:"Explicit physical harm liability cap written in.", pts:0}, {t:"General liability limits only — no physical harm specific language.", pts:30}, {t:"No physical harm terms at all.", pts:50}, {t:"Unsure.", pts:60, unsure:true}] }
    ],
    // AI recommendations causing financial harm — UNI_HAL_003 (Tort Negligence for Output)
    optimizer: [
        { q: "Your AI recommends something — a trade, a decision, an action. That recommendation costs the user real money. What does your contract say you owe them?",
          threatId: "UNI_HAL_003",
          options: [{t:"Explicit clause — outputs are informational only, no reliance liability.", pts:0}, {t:"General limitation of liability, but no recommendation-specific language.", pts:30}, {t:"Nothing addresses AI recommendation liability.", pts:50}, {t:"Unsure.", pts:60, unsure:true}] }
    ]
};

// ============================================================================
// 2. THE EXECUTION STATE (Memory)
// ============================================================================

let currentRoute = [];
let currentQIndex = 0;
let interrogationState = {
    vaultInputs: [],   // Full Q&A log including threatId
    activeGaps: [],    // {threatId, penalty} objects for scoring
    totalScore: 0,
    unsureFlag: false
};

// ============================================================================
// 3. CORE EXECUTIONS
// ============================================================================

/**
 * Builds the strict 10-question array based on architecture selection.
 */
export function buildInterrogationRoute(selectedLanes, selectedArchs) {
    const TARGET = 10;
    currentRoute = [...Q_GLOBAL];
    const usedThreatIds = new Set(Q_GLOBAL.map(q => q.threatId));

    // Operational lane adds the internal data question
    if (selectedLanes.includes('operational')) {
        if (!usedThreatIds.has(Q_INTERNAL.threatId) && currentRoute.length < TARGET) {
            currentRoute.push(Q_INTERNAL);
            usedThreatIds.add(Q_INTERNAL.threatId);
        }
    }

    // Map arch group names to Q_META keys
    const archToMetaKey = {
        actions:   'actions',
        evaluates: 'evaluates',
        creates:   'creates',
        talks:     'talks',
        mover:     'mover',
        optimizer: 'optimizer'
    };

    const archPriority = ['actions', 'evaluates', 'creates', 'talks', 'mover', 'optimizer'];

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

    // Phase 2: Pad to 10 from unselected archetypes
    archPriority.forEach(arch => {
        if (selectedArchs.includes(arch) || !Q_META[arch]) return;
        Q_META[arch].forEach(q => {
            if (!usedThreatIds.has(q.threatId) && currentRoute.length < TARGET) {
                currentRoute.push(q);
                usedThreatIds.add(q.threatId);
            }
        });
    });

    // Reset state
    currentQIndex = 0;
    interrogationState = { vaultInputs: [], activeGaps: [], totalScore: 0, unsureFlag: false };

    console.log(`> INTERROGATOR: Route locked. ${currentRoute.length} questions queued.`);
}

/**
 * Returns the current question data for the UI to render.
 */
export function getNextQuestion() {
    if (currentQIndex >= currentRoute.length) return null;
    const q = currentRoute[currentQIndex];
    return {
        questionText: q.q,
        options: q.options,
        stepCurrent: currentQIndex + 1,
        stepTotal: currentRoute.length
    };
}

/**
 * Processes the selected answer.
 * Pushes a full object {threatId, penalty, question, answer} to vaultInputs.
 * Pushes {threatId, penalty} to activeGaps — OBJECTS, not strings.
 * Returns true if more questions remain, false if complete.
 */
export function submitAnswer(selectedOptionIndex) {
    if (currentQIndex >= currentRoute.length) return false;

    const q = currentRoute[currentQIndex];
    const opt = q.options[selectedOptionIndex];

    // Full audit log — includes threatId for database traceability
    interrogationState.vaultInputs.push({
        threatId: q.threatId,
        question: q.q,
        answer: opt.t,
        penalty: opt.pts
    });

    interrogationState.totalScore += opt.pts;
    if (opt.unsure) interrogationState.unsureFlag = true;

    // Only record as an active gap if the answer indicates exposure
    if (opt.pts > 0) {
        const alreadyActive = interrogationState.activeGaps.some(g => g.threatId === q.threatId);
        if (!alreadyActive) {
            // OBJECT — not string. Actuary reads penalty for multiplier logic.
            interrogationState.activeGaps.push({
                threatId: q.threatId,
                penalty: opt.pts
            });
        }
    }

    currentQIndex++;
    return currentQIndex < currentRoute.length;
}

/**
 * Returns the final interrogation payload for the scoring engine.
 */
export function getInterrogationPayload() {
    return interrogationState;
}
