/**
 * LEX NOVA HQ — FORENSIC ENGINE v6.0
 * /ui/dom-manager.js - The Painter
 *
 * v2.0 CHANGES:
 * - INT code → arch group mapping for correct quiz routing on warm leads
 * - VIP screen shows Section I (product mirror) + Section II (traps) intel
 * - Telemetry.logAnswer wired into submitAnswer flow
 * - All function signatures preserved
 */

import { advanceToQuiz, advanceToDashboard } from '../core/state-machine.js';
import { buildInterrogationRoute, getNextQuestion, submitAnswer, getInterrogationPayload } from '../engine/question-router.js';
import { Telemetry, saveForensicPayload } from '../bridge/firebase-adapter.js';

// ============================================================================
// 1. INT CODE → ARCH GROUP MAPPING
// ============================================================================

/**
 * Translates INT archetype codes (from Firestore prospectData.primaryArchetype)
 * into the arch group keys used by buildInterrogationRoute().
 *
 * Multiple INT codes can map to the same arch group — deduplication is handled.
 *
 * INT.01 The Doer       → actions   (autonomous execution)
 * INT.02 The Judge      → evaluates (automated decisions)
 * INT.03 The Companion  → talks     (emotional/relational)
 * INT.04 The Creator    → creates   (generative output)
 * INT.05 The Reader     → creates   (ingestion/RAG — closest Q_META group)
 * INT.06 The Orchestrat → creates   (multi-model routing)
 * INT.07 The Translator → creates   (voice/biometric — I07_BIO_001 in creates)
 * INT.08 The Shield     → evaluates (cybersecurity decisions)
 * INT.09 The Optimizer  → optimizer (trading/pricing)
 * INT.10 The Mover      → mover     (physical/robotic)
 */
const INT_TO_ARCH = {
    'INT.01': 'actions',
    'INT.02': 'evaluates',
    'INT.03': 'talks',
    'INT.04': 'creates',
    'INT.05': 'creates',
    'INT.06': 'creates',
    'INT.07': 'creates',
    'INT.08': 'evaluates',
    'INT.09': 'optimizer',
    'INT.10': 'mover'
};

/**
 * Converts an array of INT codes to deduplicated arch group strings.
 * Falls back to ['creates'] if nothing maps.
 */
function intCodesToArchGroups(intCodes) {
    if (!intCodes || !Array.isArray(intCodes) || intCodes.length === 0) {
        return ['creates'];
    }
    const groups = new Set();
    intCodes.forEach(code => {
        const group = INT_TO_ARCH[code];
        if (group) groups.add(group);
    });
    return groups.size > 0 ? Array.from(groups) : ['creates'];
}

/**
 * Derives lane selection from intendedPlan field.
 */
function planToLanes(intendedPlan) {
    if (intendedPlan === 'complete_stack') return ['commercial', 'operational'];
    if (intendedPlan === 'workplace_shield') return ['operational'];
    return ['commercial']; // default: agentic_shield
}

// ============================================================================
// 2. UI STATE
// ============================================================================

let uiState = {
    email: '',
    company: '',
    selectedLanes: ['commercial'],
    selectedArchs: ['creates']
};

// ============================================================================
// 3. VIP SCREEN HELPERS — Product Intel Blocks
// ============================================================================

/**
 * Renders the Product Mirror block (Section I intelligence).
 * Shows primaryProduct.product_name, primary_claim, and featureMap.core
 * on the welcome screen so the prospect immediately sees personalization.
 */
function buildVipProductBlock(prospectData) {
    if (!prospectData) return '';

    const pp = prospectData.primaryProduct;
    const claim = prospectData.primary_claim;
    const features = prospectData.featureMap?.core || [];

    if (!pp?.product_name && !claim && features.length === 0) return '';

    let html = `
    <div class="mt-6 bg-[#050505] border border-white/5 p-5">
        <p class="text-[9px] tracking-widest text-gold uppercase font-bold mb-4">
            ▰ FORENSIC PRODUCT MAPPING
        </p>`;

    if (pp?.product_name) {
        html += `
        <div class="mb-4">
            <p class="text-[9px] text-marble/40 uppercase tracking-widest mb-1">Primary Product Identified</p>
            <p class="font-serif text-xl text-marble">${escVip(pp.product_name)}</p>
            ${pp.user ? `<p class="text-[10px] text-marble/40 mt-1">Target: ${escVip(pp.user)}</p>` : ''}
        </div>`;
    }

    if (claim) {
        html += `
        <div class="mb-4 border-l-2 border-gold/30 pl-3">
            <p class="text-[9px] text-marble/40 uppercase tracking-widest mb-1">Public Claim Under Assessment</p>
            <p class="font-serif text-base text-marble/70 italic">"${escVip(claim)}"</p>
        </div>`;
    }

    if (features.length > 0) {
        html += `<div class="mt-3">
            <p class="text-[9px] text-marble/40 uppercase tracking-widest mb-3">Features We Mapped</p>
            <div class="space-y-2">`;
        features.forEach(f => {
            html += `
            <div class="flex items-start gap-3 py-2 border-b border-white/5">
                <span class="text-gold text-[10px] mt-[2px]">▸</span>
                <div>
                    <p class="text-[11px] text-marble font-semibold">${escVip(f.feature_name)}</p>
                    ${f.evidence_quote
                        ? `<p class="text-[9px] text-marble/30 italic mt-1">"${escVip(f.evidence_quote.substring(0, 120))}${f.evidence_quote.length > 120 ? '...' : ''}"</p>`
                        : ''}
                </div>
            </div>`;
        });
        html += `</div></div>`;
    }

    html += `</div>`;
    return html;
}

/**
 * Renders the Traps block (Section II intelligence).
 * Shows self-indictment and ghost protection on welcome screen.
 */
function buildVipTrapsBlock(prospectData) {
    if (!prospectData) return '';

    const hasAlibi = !!prospectData.posture_alibi?.argument;
    const hasIndictment = !!(prospectData.self_indictments?.length);

    if (!hasAlibi && !hasIndictment) return '';

    let html = `<div class="mt-4 space-y-4">`;

    if (hasAlibi) {
        const alibi = prospectData.posture_alibi;
        const what = alibi.evidence?.[0]?.what_it_proves || 'standard enterprise terms';
        html += `
        <div class="bg-[#050505] border border-white/5 p-5">
            <p class="text-[9px] tracking-widest text-gold uppercase font-bold mb-2">⊘ INVALID DEFENSE POSTURE</p>
            <p class="text-[10px] text-marble/40 italic mb-2">"${escVip(what)}..."</p>
            <p class="text-[11px] text-danger font-mono leading-relaxed border-l-2 border-danger pl-3">
                ${escVip(alibi.argument)}
            </p>
        </div>`;
    }

    if (hasIndictment) {
        const ind = prospectData.self_indictments[0];
        html += `
        <div class="bg-[#050505] border border-white/5 p-5">
            <p class="text-[9px] tracking-widest text-gold uppercase font-bold mb-2">⚠ PUBLIC CONTRADICTION DETECTED</p>
            <p class="text-[10px] text-marble/40 italic mb-2">Your marketing says: "${escVip(ind.quote)}"</p>
            <p class="text-[11px] text-orange-500 font-mono leading-relaxed border-l-2 border-orange-500 pl-3">
                LEGAL REALITY: ${escVip(ind.contradicts)}
            </p>
        </div>`;
    }

    html += `</div>`;
    return html;
}

/** Safe HTML escape for VIP screen content */
function escVip(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// ============================================================================
// 4. VIP SCREEN RENDER
// ============================================================================

/**
 * Called by State Machine when a WARM lead arrives.
 * Renders personalized welcome with product intel and traps preview.
 */
export function renderWelcomeScreen(prospectData) {
    console.log("> PAINTER: Rendering VIP Lounge with full product intel...");

    const founderFirst = (prospectData.founderName || '').split(' ')[0] || 'there';
    const compName = prospectData.company || 'your company';

    // Count threats by tier for the badge display
    const allGaps = [
        ...(prospectData.true_gaps || []),
        ...(prospectData.forensicGaps || [])
    ];

    // Deduplicate by ID for the count display
    const seenForCount = new Set();
    let extinctionCount = 0;
    let uncappedCount = 0;

    allGaps.forEach(g => {
        const id = g.Threat_ID || g.threatId;
        if (!id || seenForCount.has(id)) return;
        seenForCount.add(id);

        const tier = g.Pain_Tier || g.severity || '';
        const tierUpper = tier.toUpperCase();
        if (tierUpper === 'T1' || tierUpper === 'NUCLEAR') extinctionCount++;
        else if (tierUpper === 'T2' || tierUpper === 'CRITICAL') uncappedCount++;
    });

    const totalCount = seenForCount.size;

    // Paint name and headline
    const greetingEl = document.getElementById('pid-greeting');
    const headlineEl = document.getElementById('pid-headline');
    if (greetingEl) greetingEl.innerText = `${founderFirst},`;
    if (headlineEl) headlineEl.innerText = `${compName} — Forensic Architecture Audit`;

    // Paint body text
    const bodyEl = document.getElementById('pid-body');
    if (bodyEl) {
        bodyEl.innerText = totalCount > 0
            ? `We reviewed ${compName}'s public legal architecture and mapped ${totalCount} structural gap${totalCount === 1 ? '' : 's'}. This audit confirms which are active inside your operations today.`
            : `We reviewed ${compName}'s public legal architecture. This audit maps your exposure across your product and operations.`;
    }

    // Paint tier badges
    const badgesEl = document.getElementById('pid-badges');
    if (badgesEl) {
        let badgeHTML = '';
        if (extinctionCount > 0) {
            badgeHTML += `<span class="bg-danger/10 border border-danger/20 px-3 py-1 text-[9px] text-danger font-bold tracking-widest mr-2">${extinctionCount} T1 EXTINCTION</span>`;
        }
        if (uncappedCount > 0) {
            badgeHTML += `<span class="bg-orange-500/10 border border-orange-500/20 px-3 py-1 text-[9px] text-orange-500 font-bold tracking-widest">${uncappedCount} T2 UNCAPPED</span>`;
        }
        badgesEl.innerHTML = badgeHTML;
    }

    // Paint intel detail — product mirror + traps
    const intelDetailEl = document.getElementById('pid-intel-detail');
    if (intelDetailEl && totalCount > 0) {
        intelDetailEl.innerHTML =
            buildVipProductBlock(prospectData) +
            buildVipTrapsBlock(prospectData);
        document.getElementById('pid-intel')?.classList.remove('hidden-state');
    }

    // Wire the VIP Start Button
    const startBtn = document.getElementById('pid-start-btn');
    if (startBtn) {
        startBtn.onclick = () => {
            // Translate INT codes → arch groups using the mapping
            const intCodes = prospectData.primaryArchetype || [];
            const archs = intCodesToArchGroups(intCodes);
            const lanes = planToLanes(prospectData.intendedPlan);

            console.log(`> VIP START: INT codes [${intCodes.join(', ')}] → arch groups [${archs.join(', ')}]`);
            console.log(`> VIP START: Plan [${prospectData.intendedPlan}] → lanes [${lanes.join(', ')}]`);

            buildInterrogationRoute(lanes, archs);
            advanceToQuiz();
            paintNextQuestion();
        };
    }
}

// ============================================================================
// 5. COLD GATE
// ============================================================================

export function initializeGate() {
    const submitBtn = document.getElementById('gate-submit-btn');
    if (!submitBtn) return;

    submitBtn.onclick = (e) => {
        e.preventDefault();
        uiState.email   = document.getElementById('gate-email').value.trim().toLowerCase();
        uiState.company = document.getElementById('gate-company').value.trim();

        localStorage.setItem('ln_email', uiState.email);
        localStorage.setItem('ln_company', uiState.company);

        advanceToQuiz();
        buildInterrogationRoute(uiState.selectedLanes, uiState.selectedArchs);
        paintNextQuestion();
    };
}

// ============================================================================
// 6. CONFIG — Lane & Arch toggles (cold traffic)
// ============================================================================

export function initializeConfig() {
    const startBtn = document.getElementById('btn-start');
    if (!startBtn) return;

    const checkReady = () => {
        const isReady = uiState.selectedLanes.length > 0 && uiState.selectedArchs.length > 0;
        startBtn.disabled = !isReady;
        startBtn.classList.toggle('opacity-30', !isReady);
        startBtn.classList.toggle('cursor-not-allowed', !isReady);
    };

    document.querySelectorAll('.lane-toggle').forEach(btn => {
        btn.onclick = (e) => {
            const val = e.currentTarget.getAttribute('data-lane');
            e.currentTarget.classList.toggle('border-gold');
            e.currentTarget.classList.toggle('bg-gold/5');
            uiState.selectedLanes = uiState.selectedLanes.includes(val)
                ? uiState.selectedLanes.filter(l => l !== val)
                : [...uiState.selectedLanes, val];
            checkReady();
        };
    });

    document.querySelectorAll('.arch-toggle').forEach(btn => {
        btn.onclick = (e) => {
            const val = e.currentTarget.getAttribute('data-arch');
            e.currentTarget.classList.toggle('border-gold');
            e.currentTarget.classList.toggle('bg-gold/5');
            uiState.selectedArchs = uiState.selectedArchs.includes(val)
                ? uiState.selectedArchs.filter(a => a !== val)
                : [...uiState.selectedArchs, val];
            checkReady();
        };
    });

    if (startBtn) {
        startBtn.onclick = () => {
            buildInterrogationRoute(uiState.selectedLanes, uiState.selectedArchs);
            advanceToQuiz();
            paintNextQuestion();
        };
    }
}

// ============================================================================
// 7. BOOTSTRAPPER
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    initializeGate();
    initializeConfig();
});

// ============================================================================
// 8. QUIZ PAINTER
// ============================================================================

async function paintNextQuestion() {
    const questionData = getNextQuestion();

    // Track question view — fires immediately when question renders
    if (questionData) {
        Telemetry.logQuestionView(questionData.stepCurrent);
    }

    // Quiz complete
    if (!questionData) {
        console.log("> PAINTER: Interrogation complete. Locking payload to vault...");

        const payload = getInterrogationPayload();

        try {
            await saveForensicPayload(payload.vaultInputs, payload.activeGaps);
        } catch (e) {
            console.error("> PAINTER: Failed to save forensic payload", e);
        }

        console.log("> PAINTER: Payload secured. Advancing to Dashboard.");
        advanceToDashboard();

        document.dispatchEvent(new CustomEvent('LnDiagnosticComplete', {
            detail: {
                lanes: uiState.selectedLanes,
                archs: uiState.selectedArchs
            }
        }));
        return;
    }

    // Paint progress bar
    const progressText = document.getElementById('progress-text');
    const progressBar  = document.getElementById('progress-bar');
    if (progressText) progressText.innerText = `Step ${questionData.stepCurrent} of ${questionData.stepTotal}`;
    if (progressBar)  progressBar.style.width = `${(questionData.stepCurrent / questionData.stepTotal) * 100}%`;

    // Paint question
    const questionTextEl = document.getElementById('question-text');
    if (questionTextEl) questionTextEl.innerText = questionData.questionText;

    // Paint options
    const container = document.getElementById('options-container');
    if (!container) return;
    container.innerHTML = '';

    questionData.options.forEach((opt, index) => {
        const btn = document.createElement('button');
        btn.className = "w-full text-left bg-[#080808] border border-shadow p-5 text-marble font-sans text-sm hover:border-gold hover:text-gold transition-all duration-300";
        btn.innerText = opt.t;

        btn.onclick = () => {
            // Freeze UI immediately — no double-click
            container.innerHTML = `
            <div class="w-full text-center text-gold text-[10px] uppercase tracking-widest animate-pulse p-5 border border-gold/20 bg-gold/5">
                Encrypting Response...
            </div>`;

            // ── ANSWER TELEMETRY ──────────────────────────────────────────
            // Fires before submitAnswer mutates state — logs live to Firestore
            Telemetry.logAnswer(
                questionData.stepCurrent,
                questionData.questionText,
                opt.t,
                opt.pts
            );

            // Submit to engine
            submitAnswer(index);

            // Recurse to next question
            paintNextQuestion();
        };

        container.appendChild(btn);
    });
}
