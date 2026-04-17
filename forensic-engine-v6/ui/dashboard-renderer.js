/**
 * LEX NOVA HQ — FORENSIC ENGINE v6.0
 * /ui/dashboard-renderer.js - The Exhibition
 *
 * SCHEMA v2.0: Full rewrite. Reads normalized output from scoring-processor v2.0.
 * - Section I: Product Mirror (primaryProduct, primary_claim, featureMap.core)
 * - Section II: Traps (self_indictments, posture_alibi, legal_stack_alibi)
 * - Section III: 6-Column Threat Matrix — correct DB keys throughout
 * - Hostage Rule: visible / partial-blur (Col 2+3 only) / locked
 * - Mobile: card layout on <lg screens, table on lg+
 * - Section V: Wallet-Opener sidebar
 */
import { getActiveProspectId, Telemetry } from '../bridge/firebase-adapter.js';

// ============================================================================
// 1. CONSTANTS
// ============================================================================
const HESITATION_WEBHOOK = "https://hook.eu1.make.com/r77qw3emv27csjq2eag7ibqku1juve4t";
const DOM_ID = 'state-dashboard';
const CURRENCY = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

const PLAN_DATA = {
    "agentic_shield":  { name: "The Agentic Shield",  price: 1500, delivery: "48 hours from Vault activation" },
    "workplace_shield": { name: "The Workplace Shield", price: 1500, delivery: "48 hours from Vault activation" },
    "complete_stack":  { name: "The Complete Stack",   price: 2500, delivery: "72 hours from Vault activation" }
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
    agentic_shield:  [ 'DOC_TOS', 'DOC_AGT', 'DOC_AUP', 'DOC_DPA', 'DOC_SLA', 'DOC_PP', 'DOC_PBK' ],
    workplace_shield: [ 'DOC_HND', 'DOC_IP', 'DOC_SOP', 'DOC_DPIA', 'DOC_SCAN', 'DOC_PBK' ],
    complete_stack:  [ 'DOC_TOS', 'DOC_AGT', 'DOC_AUP', 'DOC_DPA', 'DOC_SLA', 'DOC_PP', 'DOC_HND', 'DOC_IP', 'DOC_DPIA', 'DOC_PBK' ]
};

// ============================================================================
// 2. HELPERS
// ============================================================================

function esc(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function sevClasses(s) {
    if (s === 'T1') return 'bg-danger/10 text-danger border border-danger/30';
    if (s === 'T2') return 'bg-orange-500/10 text-orange-500 border border-orange-500/30';
    if (s === 'T3') return 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/30';
    if (s === 'T4') return 'bg-blue-500/10 text-blue-400 border border-blue-500/30';
    if (s === 'T5') return 'bg-marble/10 text-marble/50 border border-marble/20';
    return 'bg-marble/10 text-marble/50 border border-marble/20';
}

function sevLabel(s) {
    if (s === 'T1') return 'T1 — EXTINCTION';
    if (s === 'T2') return 'T2 — UNCAPPED';
    if (s === 'T3') return 'T3 — DEAL DEATH';
    if (s === 'T4') return 'T4 — REG HEAT';
    if (s === 'T5') return 'T5 — WATCH';
    return s || 'UNKNOWN';
}

function sevBadge(s) {
    return `<span class="inline-block px-2 py-1 text-[9px] font-bold tracking-widest ${sevClasses(s)}">${sevLabel(s)}</span>`;
}

function velocityLabel(v) {
    if (!v) return 'ACTIVE NOW';
    const u = v.toUpperCase();
    if (u === 'ACTIVE_NOW') return 'ACTIVE NOW';
    if (u === 'THIS_YEAR') return 'THIS YEAR';
    if (u === 'INCOMING') return 'INCOMING';
    if (u === 'WATCH') return 'WATCH';
    return u;
}

function docIdFromFix(fix) {
    if (!fix) return null;
    const match = fix.match(/^(DOC_[A-Z]+)/);
    return match ? match[1] : null;
}

// ============================================================================
// 3. HOSTAGE RULE — v2.0 Scaled Visibility
// ============================================================================

function applyHostageRule(sortedThreats) {
    const total = sortedThreats.length;
    let showFull, showBlur;

    if (total <= 4)       { showFull = 2; showBlur = 1; }
    else if (total <= 10) { showFull = 3; showBlur = 2; }
    else if (total <= 20) { showFull = 5; showBlur = 3; }
    else                  { showFull = 6; showBlur = 4; }

    const clearGaps   = sortedThreats.slice(0, showFull);
    const blurredGaps = sortedThreats.slice(showFull, showFull + showBlur);
    const lockedGaps  = sortedThreats.slice(showFull + showBlur);

    const hostageIds = [...blurredGaps, ...lockedGaps].map(t => t.threatId);

    return { clearGaps, blurredGaps, lockedGaps, hostageIds };
}

// ============================================================================
// 4. SECTION I — PRODUCT MIRROR
// ============================================================================

function buildProductMirror(prospectData, registryData) {
    if (!prospectData) return '';

    const pp = prospectData.primaryProduct || {};
    const claim = prospectData.primary_claim || null;
    const features = prospectData.featureMap?.core || [];
    const archetypes = registryData?.definitions?.archetypes || {};

    // Primary product block
    const productHTML = pp.product_name ? `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 pb-8 border-b border-white/5">
        <div>
            <p class="text-[9px] tracking-widest text-gold uppercase font-bold mb-2">Primary Product</p>
            <p class="font-serif text-2xl text-marble mb-2">${esc(pp.product_name)}</p>
            ${pp.user ? `<p class="text-[10px] text-marble/50 leading-relaxed">Built for: <span class="text-marble/70">${esc(pp.user)}</span></p>` : ''}
            ${pp.function ? `<p class="text-[10px] text-marble/40 leading-relaxed mt-1">Function: ${esc(pp.function)}</p>` : ''}
        </div>
        ${claim ? `
        <div class="md:border-l md:border-white/5 md:pl-6">
            <p class="text-[9px] tracking-widest text-gold uppercase font-bold mb-2">Primary Claim (What You Tell The Market)</p>
            <p class="font-serif text-lg text-marble/70 italic leading-relaxed">"${esc(claim)}"</p>
        </div>` : ''}
    </div>` : '';

    // Core features
    const featuresHTML = features.length ? `
    <div>
        <p class="text-[9px] tracking-widest text-marble/40 uppercase font-bold mb-4">Features Under Assessment</p>
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            ${features.map(f => {
                const archDef = archetypes[f.archetype];
                const archLabel = archDef ? `${f.archetype} — ${archDef.label}` : f.archetype;
                return `
                <div class="bg-[#080808] border border-white/5 p-4 hover:border-gold/20 transition-colors">
                    <p class="text-[9px] text-gold uppercase tracking-widest font-bold mb-1">${esc(archLabel)}</p>
                    <p class="text-sm text-marble font-semibold mb-2">${esc(f.feature_name)}</p>
                    <p class="text-[10px] text-marble/50 leading-relaxed mb-3">${esc(f.feature_description)}</p>
                    ${f.evidence_quote ? `<p class="text-[9px] text-marble/30 italic border-l border-white/10 pl-2 leading-relaxed">"${esc(f.evidence_quote)}"</p>` : ''}
                </div>`;
            }).join('')}
        </div>
    </div>` : '';

    if (!productHTML && !featuresHTML) return '';

    return `
    <div class="mb-10 bg-[#050505] border border-white/5 p-6 md:p-8">
        <p class="text-[9px] tracking-widest text-marble/40 uppercase font-bold mb-6 border-b border-white/5 pb-3">
            I. PRODUCT & ARCHITECTURE ASSESSMENT
        </p>
        ${productHTML}
        ${featuresHTML}
        ${pp.mechanism ? `
        <div class="mt-6 border-t border-white/5 pt-4">
            <p class="font-mono text-[9px] text-marble/30 leading-relaxed">
                &gt; MECHANISM CONFIRMED: ${esc(pp.mechanism)}
            </p>
        </div>` : ''}
    </div>`;
}

// ============================================================================
// 5. SECTION II — THE TRAPS
// ============================================================================

function buildTraps(prospectData) {
    if (!prospectData) return '';

    const hasAlibi    = !!prospectData.posture_alibi?.argument;
    const hasIndictment = !!(prospectData.self_indictments?.length);
    const hasLegal    = !!prospectData.legal_stack_alibi?.overall_inadequacy;

    if (!hasAlibi && !hasIndictment && !hasLegal) return '';

    let html = `
    <div class="mb-10">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">`;

    if (hasAlibi) {
        const alibi = prospectData.posture_alibi;
        const what = alibi.evidence?.[0]?.what_it_proves || 'an enterprise MSA';
        html += `
        <div class="bg-[#050505] border border-white/5 p-6">
            <p class="text-[9px] tracking-widest text-gold uppercase font-bold mb-3">⊘ INVALID DEFENSE POSTURE</p>
            <p class="text-[11px] text-marble/50 italic mb-3">"${esc(what)}..."</p>
            <p class="text-xs text-danger font-mono leading-relaxed border-l-2 border-danger pl-3">
                ${esc(alibi.argument)}
            </p>
        </div>`;
    }

    if (hasIndictment) {
        const ind = prospectData.self_indictments[0];
        html += `
        <div class="bg-[#050505] border border-white/5 p-6">
            <p class="text-[9px] tracking-widest text-gold uppercase font-bold mb-3">⚠ PUBLIC CONTRADICTION</p>
            <p class="text-[11px] text-marble/50 italic mb-3">Your marketing: "${esc(ind.quote)}"</p>
            <p class="text-xs text-orange-500 font-mono leading-relaxed border-l-2 border-orange-500 pl-3">
                LEGAL REALITY: ${esc(ind.contradicts)}
            </p>
        </div>`;
    }

    html += `</div>`; // close grid

    if (hasLegal) {
        html += `
        <div class="bg-[#050505] border border-danger/20 p-6">
            <p class="text-[9px] tracking-widest text-danger uppercase font-bold mb-3">⊘ LEGAL STACK TEARDOWN</p>
            <p class="text-xs text-marble/60 font-mono leading-relaxed">${esc(prospectData.legal_stack_alibi.overall_inadequacy)}</p>
        </div>`;
    }

    html += `</div>`; // close section
    return html;
}

// ============================================================================
// 6. SECTION III — THREAT MATRIX
// ============================================================================

function buildEvidenceBlock(g) {
    // Source badge
    let badge = '';
    if (g.source === 'dual-verified') {
        badge = `<span class="inline-block mt-2 px-2 py-1 text-[8px] tracking-[0.2em] uppercase bg-danger/10 text-danger border border-danger/30 font-bold animate-pulse">[ VERIFIED: PUBLIC + CONFIRMED BY YOU ]</span>`;
    } else if (g.source === 'scrape') {
        badge = `<span class="inline-block mt-2 px-2 py-1 text-[8px] tracking-[0.2em] uppercase bg-[#60a5fa]/10 text-[#60a5fa] border border-[#60a5fa]/30 font-bold">[ FOUND ON YOUR PUBLIC SITE ]</span>`;
    } else {
        badge = `<span class="inline-block mt-2 px-2 py-1 text-[8px] tracking-[0.2em] uppercase bg-yellow-500/10 text-yellow-500 border border-yellow-500/30 font-bold">[ CONFIRMED BY YOU ]</span>`;
    }

    // Evidence text — prefer full scraped text, fall back to short proof_citation
    const rawEvidence = g.evidenceFound || g.proofCitation || '';
    const truncated = rawEvidence.length > 280
        ? rawEvidence.substring(0, 280) + '...'
        : rawEvidence;

    const evidenceBlock = truncated ? `
    <div class="mt-3 p-3 bg-black border border-white/10 font-mono text-[9px] text-marble/50 leading-relaxed break-words whitespace-pre-wrap">
        <span class="text-gold font-bold block mb-1">&gt; SCRAPED EVIDENCE:</span>
        ${esc(truncated)}
    </div>` : '';

    return { badge, evidenceBlock };
}

// ── TABLE ROW: Clear (fully visible) ──────────────────────────────────────

function buildClearRow(g) {
    const ev = buildEvidenceBlock(g);
    const clock = velocityLabel(g.velocity);
    const docId = docIdFromFix(g.lexNovaFix);

    const pressure = (g.diligence_pressure?.active)
        ? `<div class="mt-3 text-[9px] text-orange-500 uppercase tracking-[0.2em] font-bold border border-orange-500/30 bg-orange-500/10 px-2 py-1 inline-block">⚠ ${esc(g.diligence_pressure.trigger || 'DUE DILIGENCE DEADLINE')}</div>`
        : '';

    return `
    <tr class="border-b border-white/5 bg-[#050505] hover:bg-[#080808] transition-colors align-top">
        <td class="p-4 align-top">
            <span class="font-serif text-base text-marble block mb-1 leading-tight">${esc(g.threatName)}</span>
            ${ev.badge}
            ${ev.evidenceBlock}
        </td>
        <td class="p-4 align-top">
            <span class="text-marble/80 text-[11px] leading-relaxed block font-semibold mb-2">
                ${esc(g.fpMechanism || g.structuralAbsence || 'Architecture gap detected.')}
            </span>
            ${g.fpTrigger ? `<span class="text-marble/40 text-[10px] leading-relaxed block border-l border-gold/20 pl-2 mt-2">Trigger: ${esc(g.fpTrigger)}</span>` : ''}
        </td>
        <td class="p-4 align-top">
            <span class="text-orange-500 font-mono text-[9px] uppercase tracking-widest block mb-1">LEGAL PRECEDENT:</span>
            <span class="text-marble/70 text-[11px] leading-relaxed block">${esc(g.legalPain || 'Pending regulatory enforcement action.')}</span>
        </td>
        <td class="p-4 align-top">
            ${sevBadge(g.calculatedSeverity)}
            <span class="text-danger text-[11px] leading-relaxed block mt-3">
                ${esc(g.fpImpact || 'Liability exposure without ceiling.')}
            </span>
            ${g.fpStakes ? `<span class="text-marble/40 text-[10px] leading-relaxed block mt-2 border-t border-white/5 pt-2">${esc(g.fpStakes)}</span>` : ''}
        </td>
        <td class="p-4 align-top">
            <span class="text-marble/70 font-mono text-[10px] tracking-widest uppercase block">${clock}</span>
            ${pressure}
        </td>
        <td class="p-4 align-top">
            <span class="text-gold font-bold text-[11px] block mb-1">${esc(docId || 'Module Required')}</span>
            <span class="text-marble/40 text-[9px] leading-relaxed block">
                ${esc(docId && DOC_DESCRIPTIONS[docId] ? DOC_DESCRIPTIONS[docId] : (g.lexNovaFix || 'Lex Nova proprietary structural defense.'))}
            </span>
        </td>
    </tr>`;
}

// ── TABLE ROW: Blurred (Col 2 & 3 redacted, rest visible) ─────────────────

function buildBlurredRow(g) {
    const ev = buildEvidenceBlock(g);
    const clock = velocityLabel(g.velocity);
    const docId = docIdFromFix(g.lexNovaFix);

    return `
    <tr class="border-b border-white/5 bg-[#080808] opacity-80 align-top">
        <td class="p-4 align-top">
            <span class="font-serif text-base text-marble block mb-1 leading-tight">${esc(g.threatName)}</span>
            ${ev.badge}
            <div class="mt-2 p-2 bg-black/50 border border-white/5 font-mono text-[9px] text-marble/20 italic">
                [evidence redacted — activate to view]
            </div>
        </td>
        <td class="p-4 align-top select-none" style="filter:blur(5px)">
            <span class="text-marble/70 text-[11px] leading-relaxed block">
                ${esc(g.fpMechanism || 'Structural mechanism classified.')}
            </span>
        </td>
        <td class="p-4 align-top select-none" style="filter:blur(5px)">
            <span class="text-orange-500 font-mono text-[9px] uppercase tracking-widest block mb-1">LEGAL PRECEDENT:</span>
            <span class="text-marble/70 text-[11px] leading-relaxed block">
                ${esc(g.legalPain || 'Legal basis classified.')}
            </span>
        </td>
        <td class="p-4 align-top">
            ${sevBadge(g.calculatedSeverity)}
            <span class="text-danger/50 text-[11px] leading-relaxed block mt-3 select-none" style="filter:blur(4px)">
                ${esc(g.fpImpact || 'Consequence classified.')}
            </span>
        </td>
        <td class="p-4 align-top">
            <span class="text-marble/50 font-mono text-[10px] tracking-widest uppercase block">${clock}</span>
        </td>
        <td class="p-4 align-top">
            <span class="text-gold font-bold text-[11px] block mb-1">${esc(docId || 'Module Required')}</span>
            <span class="text-marble/30 text-[9px] leading-relaxed block select-none" style="filter:blur(4px)">
                ${esc(docId && DOC_DESCRIPTIONS[docId] ? DOC_DESCRIPTIONS[docId] : 'Classified.')}
            </span>
        </td>
    </tr>`;
}

// ── TABLE ROW: Locked row (single collapsed row for all remaining) ─────────

function buildLockedRow(count) {
    if (count === 0) return '';
    return `
    <tr class="border-b border-white/5 bg-[#050505] align-middle">
        <td colspan="6" class="p-6 text-center">
            <div class="flex flex-col items-center gap-3">
                <span class="text-4xl">🔒</span>
                <p class="font-sans text-[10px] tracking-[0.2em] text-marble/40 uppercase font-bold">
                    ${count} Additional Threat${count === 1 ? '' : 's'} Locked
                </p>
                <p class="font-sans text-xs text-marble/30 max-w-sm leading-relaxed">
                    Full matrix unlocks immediately upon engagement. Every locked threat maps to a specific architecture fix.
                </p>
                <button 
                    onclick="document.getElementById('trigger-checkout-btn')?.click()"
                    class="mt-2 border border-gold/40 text-gold text-[9px] tracking-widest uppercase px-6 py-2 hover:bg-gold hover:text-void transition-all">
                    Secure Architecture to Unlock
                </button>
            </div>
        </td>
    </tr>`;
}

// ── DESKTOP TABLE ──────────────────────────────────────────────────────────

function buildDesktopTable(hostageData) {
    let rows = '';
    hostageData.clearGaps.forEach(g => rows += buildClearRow(g));
    hostageData.blurredGaps.forEach(g => rows += buildBlurredRow(g));
    rows += buildLockedRow(hostageData.lockedGaps.length);

    return `
    <div class="hidden lg:block mb-10 overflow-x-auto border border-white/5 bg-[#050505]">
        <table class="w-full text-left font-sans text-[11px] border-collapse min-w-[900px]">
            <thead>
                <tr class="text-[9px] text-gold/50 uppercase tracking-widest border-b border-white/10 bg-[#080808]">
                    <th class="p-4 w-[22%]">I. Vulnerability &amp; Evidence</th>
                    <th class="p-4 w-[20%]">II. Structural Absence</th>
                    <th class="p-4 w-[17%]">III. Legal Precedent</th>
                    <th class="p-4 w-[18%]">IV. Blast Radius</th>
                    <th class="p-4 w-[9%]">V. Clock</th>
                    <th class="p-4 w-[14%]">VI. The Fix</th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>
    </div>`;
}

// ── MOBILE CARDS ───────────────────────────────────────────────────────────

function buildMobileCard(g, isBlurred = false, isLocked = false) {
    const ev = buildEvidenceBlock(g);
    const docId = docIdFromFix(g.lexNovaFix);
    const clock = velocityLabel(g.velocity);

    if (isLocked) {
        return `
        <div class="border border-white/5 bg-[#050505] p-4 flex items-center gap-3">
            <span class="text-2xl">🔒</span>
            <p class="text-[10px] text-marble/30 uppercase tracking-widest">Threat Locked</p>
        </div>`;
    }

    const blur2 = isBlurred ? 'style="filter:blur(5px)" class="select-none"' : '';
    const blur3 = isBlurred ? 'style="filter:blur(5px)" class="select-none"' : '';

    return `
    <div class="border border-white/5 bg-[#050505] p-5 space-y-4 ${isBlurred ? 'opacity-80' : ''}">
        <!-- Header -->
        <div class="flex items-start justify-between gap-3 flex-wrap">
            <p class="font-serif text-base text-marble leading-tight">${esc(g.threatName)}</p>
            ${sevBadge(g.calculatedSeverity)}
        </div>
        ${ev.badge}
        ${!isBlurred ? ev.evidenceBlock : '<div class="p-2 bg-black/50 border border-white/5 font-mono text-[9px] text-marble/20 italic mt-2">[evidence redacted]</div>'}

        <!-- Structural Absence -->
        <div ${blur2}>
            <p class="text-[9px] text-gold uppercase tracking-widest mb-1">Structural Absence</p>
            <p class="text-[11px] text-marble/70 leading-relaxed">${esc(g.fpMechanism || 'Classified.')}</p>
            ${!isBlurred && g.fpTrigger ? `<p class="text-[10px] text-marble/40 mt-1">Trigger: ${esc(g.fpTrigger)}</p>` : ''}
        </div>

        <!-- Legal Precedent -->
        <div ${blur3}>
            <p class="text-[9px] text-orange-500 uppercase tracking-widest mb-1">Legal Precedent</p>
            <p class="text-[11px] text-marble/70 leading-relaxed">${esc(g.legalPain || 'Classified.')}</p>
        </div>

        <!-- Impact + Clock + Fix -->
        <div class="grid grid-cols-2 gap-4 pt-3 border-t border-white/5">
            <div>
                <p class="text-[9px] text-marble/40 uppercase tracking-widest mb-1">Impact</p>
                <p class="text-[10px] text-danger leading-relaxed">${esc(!isBlurred ? (g.fpImpact || 'Classified.') : 'Classified.')}</p>
            </div>
            <div>
                <p class="text-[9px] text-marble/40 uppercase tracking-widest mb-1">Clock</p>
                <p class="text-[10px] text-marble/70 font-mono">${clock}</p>
            </div>
        </div>
        <div class="pt-2 border-t border-white/5">
            <p class="text-[9px] text-marble/40 uppercase tracking-widest mb-1">The Fix</p>
            <p class="text-[10px] text-gold font-bold">${esc(docId || 'Lex Nova Module')}</p>
            ${docId && DOC_DESCRIPTIONS[docId] ? `<p class="text-[9px] text-marble/30 mt-1">${esc(DOC_DESCRIPTIONS[docId])}</p>` : ''}
        </div>
    </div>`;
}

function buildMobileCards(hostageData) {
    let cards = '';
    hostageData.clearGaps.forEach(g => cards += buildMobileCard(g, false, false));
    hostageData.blurredGaps.forEach(g => cards += buildMobileCard(g, true, false));

    const lockedCount = hostageData.lockedGaps.length;
    if (lockedCount > 0) {
        cards += `
        <div class="border border-white/5 bg-[#050505] p-6 text-center">
            <span class="text-3xl block mb-3">🔒</span>
            <p class="font-sans text-[10px] tracking-[0.2em] text-marble/40 uppercase font-bold mb-2">
                ${lockedCount} Threat${lockedCount === 1 ? '' : 's'} Locked
            </p>
            <p class="font-sans text-xs text-marble/30 leading-relaxed">
                Unlock the full matrix on engagement.
            </p>
        </div>`;
    }

    return `<div class="lg:hidden space-y-4 mb-10">${cards}</div>`;
}

// ============================================================================
// 7. SECTION VI — ITEMIZED RECEIPT
// ============================================================================

function buildItemizedReceipt(financials, hostageIds) {
    let rowsHTML = '';

    financials.receiptLines.forEach(line => {
        const isRedacted = hostageIds.includes(line.threatId);
        const displayName = isRedacted
            ? `<span class="opacity-40">[ CLASSIFIED ${line.tier} THREAT ]</span>`
            : esc(line.threatName);

        rowsHTML += `
        <tr class="border-b border-white/5 text-[10px]">
            <td class="p-3 text-marble font-bold">${displayName}</td>
            <td class="p-3 text-marble/40">${CURRENCY.format(line.baseValue)} (${line.tier})</td>
            <td class="p-3 text-gold">×${line.appliedMultiplier} <span class="text-marble/30">(${esc(line.multiplierReason)})</span></td>
            <td class="p-3 text-marble/40">${esc(line.decayLabel)}</td>
            <td class="p-3 text-danger font-bold text-right">${CURRENCY.format(line.finalLineTotal)}</td>
        </tr>`;
    });

    return `
    <div class="mt-6 border-t border-danger/20 pt-4">
        <button 
            onclick="document.getElementById('receipt-table').classList.toggle('hidden')"
            class="text-[9px] text-gold/60 tracking-widest uppercase font-bold hover:text-gold transition-colors mb-4 w-full text-center">
            ▸ View Actuarial Calculation Basis
        </button>
        <div id="receipt-table" class="hidden overflow-x-auto bg-[#080808] border border-white/10 p-3">
            <table class="w-full min-w-[600px]">
                <thead>
                    <tr class="text-[8px] text-marble/30 uppercase tracking-widest border-b border-white/10">
                        <th class="p-2 text-left">Vulnerability</th>
                        <th class="p-2 text-left">Base Severity</th>
                        <th class="p-2 text-left">Multiplier</th>
                        <th class="p-2 text-left">Adjustment</th>
                        <th class="p-2 text-right">Exposure</th>
                    </tr>
                </thead>
                <tbody>${rowsHTML}</tbody>
            </table>
        </div>
    </div>`;
}

// ============================================================================
// 8. MASTER RENDER
// ============================================================================

export function renderDashboard(finalReport, prospectData) {
    console.log("> EXHIBITION: Building dashboard (v2.0)...");

    const container = document.getElementById(DOM_ID);
    if (!container) {
        console.error(`> EXHIBITION FATAL: DOM container [${DOM_ID}] not found.`);
        return;
    }

    const hostageData = applyHostageRule(finalReport.sortedThreats);
    const plan = PLAN_DATA[finalReport.prescription] || PLAN_DATA['complete_stack'];

    // Escalator flags
    let flagsHTML = '';
    if (finalReport.financials.hasPersonalLiability) {
        flagsHTML += `<p class="bg-danger text-void px-3 py-1 text-[10px] font-bold tracking-widest uppercase inline-block mb-3 animate-pulse shadow-[0_0_15px_rgba(220,38,38,0.4)]">⚠ PIERCED CORPORATE VEIL DETECTED</p><br>`;
    }
    if (finalReport.financials.hasCriminalLiability) {
        flagsHTML += `<p class="bg-red-900 text-white px-3 py-1 text-[10px] font-bold tracking-widest uppercase inline-block mb-3 animate-pulse">⚠ CRIMINAL EXPOSURE DETECTED</p>`;
    }

    // Threat tier counters
    let cT1 = 0, cT2 = 0;
    finalReport.sortedThreats.forEach(t => {
        if (t.calculatedSeverity === 'T1') cT1++;
        else if (t.calculatedSeverity === 'T2') cT2++;
    });

    // Architecture Manifest
    const docsToRender = KITS[finalReport.prescription] || KITS['agentic_shield'];
    const manifestHTML = docsToRender.map(docId => `
    <div class="border-l-2 border-gold pl-3 mb-4">
        <span class="text-[9px] text-gold uppercase font-bold block">${docId}</span>
        <span class="text-xs text-marble block">${docId.replace('DOC_', '')}</span>
        <span class="text-[9px] text-marble/30 leading-relaxed block mt-1">${DOC_DESCRIPTIONS[docId] || ''}</span>
    </div>`).join('');

    container.innerHTML = `
    <div class="w-full">

        <!-- ═══ HEADER ═══ -->
        <div class="mb-10 border-b border-white/10 pb-8">
            <div class="flex flex-col md:flex-row md:justify-between md:items-end gap-4 mb-4">
                <div>
                    <h1 class="font-serif text-4xl md:text-5xl text-marble uppercase tracking-widest mb-2">
                        Structural Exposure Audit
                    </h1>
                    <p class="font-serif text-2xl text-gold italic">
                        ${esc(prospectData?.company || 'Your Company')}
                        <span class="text-marble/20 font-sans text-xs ml-4 not-italic">
                            PID: ${esc(prospectData?.prospectId || '—')}
                        </span>
                    </p>
                </div>
                <div class="text-left md:text-right">
                    <p class="font-sans text-[10px] text-marble/40 uppercase tracking-[0.2em] mb-1">
                        Prepared for: <span class="text-marble/70 font-bold">${esc(prospectData?.founderName || 'Founder')}</span>
                    </p>
                    <p class="font-sans text-[10px] text-marble/40 uppercase tracking-[0.2em]">
                        ${esc(prospectData?.jurisdiction || 'Global Market')}
                    </p>
                </div>
            </div>
        </div>

        <!-- ═══ SECTION I: PRODUCT MIRROR ═══ -->
        ${buildProductMirror(prospectData, finalReport.registry)}

        <!-- ═══ SECTION II: THE TRAPS ═══ -->
        ${buildTraps(prospectData)}

        <!-- ═══ MAIN GRID ═══ -->
        <div class="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-10 items-start">

            <!-- LEFT: Threat Matrix -->
            <div>
                <h3 class="font-serif text-2xl text-gold mb-4 italic">Threat Matrix &amp; Architecture Gaps</h3>

                <!-- Tier counters -->
                <div class="flex gap-3 mb-6 flex-wrap">
                    <div class="bg-danger/10 border border-danger/20 px-3 py-1">
                        <span class="text-[9px] text-danger font-bold tracking-widest">T1 EXTINCTION: ${cT1}</span>
                    </div>
                    <div class="bg-orange-500/10 border border-orange-500/20 px-3 py-1">
                        <span class="text-[9px] text-orange-500 font-bold tracking-widest">T2 UNCAPPED: ${cT2}</span>
                    </div>
                    <div class="bg-[#080808] border border-white/10 px-3 py-1">
                        <span class="text-[9px] text-marble font-bold tracking-widest">TOTAL: ${finalReport.sortedThreats.length}</span>
                    </div>
                </div>

                <!-- Desktop table -->
                ${buildDesktopTable(hostageData)}

                <!-- Mobile cards -->
                ${buildMobileCards(hostageData)}
            </div>

            <!-- RIGHT: Wallet-Opener -->
            <div class="xl:sticky xl:top-8 space-y-6">

                <!-- Exposure block -->
                <div class="bg-danger/10 border border-danger/30 p-8 text-center shadow-[0_0_40px_rgba(220,38,38,0.1)]">
                    ${flagsHTML}
                    <p class="text-[9px] tracking-[0.2em] text-danger uppercase font-bold mb-2">
                        Maximum Concurrent Exposure
                    </p>
                    <div class="font-serif text-5xl text-marble mb-1">
                        ${CURRENCY.format(finalReport.financials.totalExposure)}
                    </div>
                    <p class="text-[9px] text-marble/30 uppercase tracking-widest">
                        Calculated via Lex Nova Actuarial Engine v6.0
                    </p>
                    ${buildItemizedReceipt(finalReport.financials, hostageData.hostageIds)}
                </div>

                <!-- Checkout block -->
                <div class="bg-[#080808] border border-white/10 p-8 text-center">
                    <p class="text-[9px] tracking-[0.2em] text-marble/40 uppercase font-bold mb-4">
                        Required Architecture Fix
                    </p>
                    <p class="font-serif text-xl text-gold mb-2">${plan.name}</p>
                    <div class="font-serif text-5xl text-marble mb-2">${CURRENCY.format(plan.price)}</div>
                    <p class="font-sans text-xs text-marble/40 leading-relaxed mb-6">
                        ${plan.delivery}. No discovery calls. Vault activation immediately upon payment.
                    </p>

                    <button id="trigger-checkout-btn"
                        class="block w-full bg-gold text-void py-4 font-bold text-xs tracking-widest uppercase hover:bg-marble transition-all mb-4 shadow-[0_0_15px_rgba(197,160,89,0.2)]">
                        Secure Architecture Now
                    </button>

                    <button id="trigger-valve-btn"
                        class="block w-full text-[10px] text-marble/30 tracking-widest uppercase hover:text-marble/60 transition-all">
                        &gt; Questions about your exposure? Request direct contact.
                    </button>
                </div>

                <!-- Architecture Manifest -->
                <div class="bg-[#050505] border border-white/5 p-8">
                    <h4 class="font-serif text-xl text-gold mb-1 italic">Architecture Manifest</h4>
                    <p class="text-[10px] text-marble/30 mb-6">Documents required to neutralize active threats.</p>
                    ${manifestHTML}
                </div>

            </div>
        </div>
    </div>

    <!-- ═══ HESITATION MODAL ═══ -->
    <div id="hesitation-modal" class="hidden fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
        <div class="bg-[#050505] border border-gold/20 p-8 max-w-md w-full text-center">
            <h4 class="font-serif text-2xl text-gold mb-4">Request Direct Contact</h4>
            <p class="text-xs text-marble/60 leading-relaxed mb-4 text-left">
                Lex Nova maintains a strictly capped active client roster to protect the precision of our forensic drafting. We do not maintain public sales calendars.
            </p>
            <p class="text-xs text-marble/60 leading-relaxed mb-8 text-left">
                Your exposure profile has been flagged for priority review. A Lex Nova partner will evaluate your specific architecture and contact you directly via email today.
            </p>
            <button id="confirm-valve-btn"
                class="block w-full bg-transparent border border-gold text-gold py-3 font-bold text-xs tracking-widest uppercase hover:bg-gold hover:text-void transition-all mb-3">
                Flag Matrix For Priority Review
            </button>
            <button onclick="document.getElementById('hesitation-modal').classList.add('hidden')"
                class="block w-full text-[10px] text-marble/30 tracking-widest uppercase hover:text-marble/60 transition-all">
                Cancel
            </button>
        </div>
    </div>`;

    // ── Event Wiring ──────────────────────────────────────────────────────

    document.getElementById('trigger-checkout-btn')?.addEventListener('click', async () => {
        const pid = getActiveProspectId();
        const planKey = finalReport.prescription;
        await Telemetry.logState('checkout_initiated');
        window.location.href = `./engagement.html?pid=${pid}&plan=${planKey}`;
    });

    document.getElementById('trigger-valve-btn')?.addEventListener('click', () => {
        document.getElementById('hesitation-modal')?.classList.remove('hidden');
    });

    document.getElementById('confirm-valve-btn')?.addEventListener('click', async (e) => {
        const btn = e.target;
        btn.innerText = 'REQUEST SENT.';
        btn.classList.replace('text-gold', 'text-void');
        btn.classList.replace('bg-transparent', 'bg-gold');

        const pid = getActiveProspectId();
        await Telemetry.logState('negotiation_requested');

        fetch(HESITATION_WEBHOOK, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                event: 'HESITATION_VALVE_TRIGGERED',
                prospectId: pid,
                email: prospectData?.email || 'Unknown',
                company: prospectData?.company || 'Unknown',
                calculatedExposure: finalReport.financials.totalExposure,
                timestamp: new Date().toISOString()
            })
        }).catch(() => {});

        setTimeout(() => {
            document.getElementById('hesitation-modal')?.classList.add('hidden');
            btn.innerText = 'Flag Matrix For Priority Review';
            btn.classList.replace('text-void', 'text-gold');
            btn.classList.replace('bg-gold', 'bg-transparent');
        }, 2000);
    });

    console.log("> EXHIBITION: Render complete.");
    container.classList.remove('hidden-state', 'hidden');
    container.style.display = 'block';
    container.style.opacity = '1';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
