/**
 * LEX NOVA HQ — FORENSIC ENGINE v6.0
 * /ui/dashboard-renderer.js - The Exhibition
 *
 * v2.0 FULL REWRITE:
 * - Expandable card architecture — no table, works on all screen sizes
 * - Mobile-first: stacks cleanly on 390px phones
 * - Source-aware Hostage Rule via hostage-rule.js
 * - Correct DB keys throughout
 * - Section I: Product Mirror (primaryProduct, primary_claim, featureMap.core)
 * - Section II: Traps (self_indictments, posture_alibi, legal_stack_alibi)
 * - Lex Nova Fix™ branding
 * - Architecture Manifest as bill-of-materials cards
 * - Partial cards: evidence visible, name + mechanism + legal blurred
 */

import { getActiveProspectId, Telemetry } from '../bridge/firebase-adapter.js';
import { applyHostageRule } from '../engine/scoring-processor.js';

// ============================================================================
// 1. CONSTANTS
// ============================================================================

const HESITATION_WEBHOOK = "https://hook.eu1.make.com/r77qw3emv27csjq2eag7ibqku1juve4t";
const DOM_ID = 'state-dashboard';
const CURRENCY = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

const PLAN_DATA = {
    agentic_shield:   { name: "The Agentic Shield",  price: 1500, delivery: "48 hours from Vault activation" },
    workplace_shield: { name: "The Workplace Shield", price: 1500, delivery: "48 hours from Vault activation" },
    complete_stack:   { name: "The Complete Stack",   price: 2500, delivery: "72 hours from Vault activation" }
};

const DOC_META = {
    DOC_TOS:  { short: "AI Terms of Service",       desc: "Defines what you owe, caps what you pay, and makes agreements enforceable." },
    DOC_AGT:  { short: "Agentic Addendum",          desc: "Limits exposure when your AI acts autonomously — agent liability boundaries." },
    DOC_AUP:  { short: "Acceptable Use Policy",     desc: "Sets rules for how users interact with your AI — protects you from misuse." },
    DOC_DPA:  { short: "Data Processing Agreement", desc: "Governs how you handle data — required for EU customers and enterprise deals." },
    DOC_SLA:  { short: "AI-Specific SLA",           desc: "Defines uptime commitments — prevents uncapped service credits." },
    DOC_PP:   { short: "Privacy Policy",            desc: "Tells users what data you collect — the document regulators check first." },
    DOC_PBK:  { short: "Negotiation Playbook",      desc: "Your playbook for winning enterprise contract negotiations." },
    DOC_HND:  { short: "AI Employee Handbook",      desc: "Controls what your team can do with AI tools — stops IP leaks." },
    DOC_IP:   { short: "IP Assignment Deed",        desc: "Ensures everything your team builds belongs to you." },
    DOC_SOP:  { short: "HITL Protocol",             desc: "Defines when a human must review AI output." },
    DOC_DPIA: { short: "Impact Assessment",         desc: "Maps every risk your AI creates before regulators find it." },
    DOC_SCAN: { short: "Shadow AI Scanner",         desc: "Finds every unauthorized AI tool your team is using today." }
};

const KITS = {
    agentic_shield:   ['DOC_TOS','DOC_AGT','DOC_AUP','DOC_DPA','DOC_SLA','DOC_PP','DOC_PBK'],
    workplace_shield: ['DOC_HND','DOC_IP','DOC_SOP','DOC_DPIA','DOC_SCAN','DOC_PBK'],
    complete_stack:   ['DOC_TOS','DOC_AGT','DOC_AUP','DOC_DPA','DOC_SLA','DOC_PP','DOC_HND','DOC_IP','DOC_DPIA','DOC_PBK']
};

// ============================================================================
// 2. HELPERS
// ============================================================================

function esc(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g,'&amp;').replace(/</g,'&lt;')
        .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function sevClasses(s) {
    if (s==='T1') return 'bg-danger/15 text-danger border-danger/40';
    if (s==='T2') return 'bg-orange-500/15 text-orange-400 border-orange-500/40';
    if (s==='T3') return 'bg-yellow-500/15 text-yellow-400 border-yellow-500/40';
    if (s==='T4') return 'bg-blue-500/15 text-blue-400 border-blue-500/40';
    return 'bg-marble/10 text-marble/40 border-marble/20';
}

function sevLabel(s) {
    return { T1:'T1 — EXTINCTION', T2:'T2 — UNCAPPED', T3:'T3 — DEAL DEATH', T4:'T4 — REG HEAT', T5:'T5 — WATCH' }[s] || (s||'UNKNOWN');
}

function sevBadge(s) {
    return `<span class="inline-block px-2 py-[3px] text-[8px] font-bold tracking-widest border ${sevClasses(s)}">${sevLabel(s)}</span>`;
}

function sourceBadge(source) {
    if (source==='dual-verified')
        return `<span class="inline-block px-2 py-[3px] text-[8px] tracking-[0.12em] uppercase bg-danger/10 text-danger border border-danger/30 font-bold animate-pulse">⚡ VERIFIED: PUBLIC + CONFIRMED BY YOU</span>`;
    if (source==='quiz_confession')
        return `<span class="inline-block px-2 py-[3px] text-[8px] tracking-[0.12em] uppercase bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 font-bold">▸ CONFIRMED BY YOU (INTERNAL AUDIT)</span>`;
    return `<span class="inline-block px-2 py-[3px] text-[8px] tracking-[0.12em] uppercase bg-[#60a5fa]/10 text-[#60a5fa] border border-[#60a5fa]/30 font-bold">◉ FOUND ON YOUR PUBLIC SITE</span>`;
}

function velocityLabel(v) {
    return { ACTIVE_NOW:'ACTIVE NOW', THIS_YEAR:'THIS YEAR', INCOMING:'INCOMING', WATCH:'WATCH' }[(v||'').toUpperCase()] || 'ACTIVE NOW';
}

function docIdFromFix(fix) {
    if (!fix) return null;
    const m = fix.match(/^(DOC_[A-Z]+)/);
    return m ? m[1] : null;
}

// ============================================================================
// 3. EXPANDABLE CARD BUILDER
// ============================================================================

/**
 * Builds one threat card.
 * visibility: 'clear' | 'partial' | 'locked'
 *
 * Collapsed (always visible):
 *   CLEAR: name, tier badge, clock, source badge
 *   PARTIAL: name BLURRED, tier badge, clock, source badge, evidence block visible
 *
 * Expanded (toggled by click):
 *   CLEAR: mechanism, trigger, legal precedent, blast radius, Lex Nova Fix™
 *   PARTIAL: mechanism BLURRED, legal BLURRED, blast radius VISIBLE, Fix VISIBLE
 */
function buildThreatCard(g, visibility, idx) {
    const cardId = `ln-card-${idx}`;
    const docId  = docIdFromFix(g.lexNovaFix);
    const docMeta = docId ? DOC_META[docId] : null;
    const clock  = velocityLabel(g.velocity);
    const isPartial = visibility === 'partial';

    // Evidence block (shown in collapsed for partials, in expanded for clears)
    const rawEvidence = g.evidenceFound || g.proofCitation || null;
    const evidenceTrunc = rawEvidence
        ? (rawEvidence.length > 320 ? rawEvidence.substring(0,320)+'...' : rawEvidence)
        : null;

    const evidenceBlockHTML = evidenceTrunc ? `
    <div class="mt-3 p-3 bg-black border border-white/10 font-mono text-[9px] text-marble/45 leading-relaxed break-words">
        <span class="text-gold font-bold block mb-1">&gt; SCRAPED EVIDENCE:</span>${esc(evidenceTrunc)}
    </div>` : '';

    // ── Collapsed header ───────────────────────────────────────────────
    const nameHTML = isPartial
        ? `<span class="font-serif text-base leading-tight block text-marble/10 select-none" style="filter:blur(7px)">██████████████████</span>`
        : `<span class="font-serif text-base text-marble leading-tight block">${esc(g.threatName)}</span>`;

    const collapsedHTML = `
    <div class="p-4 md:p-5 cursor-pointer" onclick="window.LN_toggleCard('${cardId}')">
        <div class="flex items-start justify-between gap-3">
            <div class="flex-1 min-w-0">
                ${nameHTML}
                <div class="flex flex-wrap items-center gap-2 mt-2">
                    ${sevBadge(g.calculatedSeverity)}
                    <span class="text-[9px] text-marble/30 font-mono uppercase">${clock}</span>
                </div>
                <div class="mt-2">${sourceBadge(g.source)}</div>
                ${isPartial ? evidenceBlockHTML : ''}
            </div>
            <div class="flex-shrink-0 flex flex-col items-end justify-between gap-3">
                ${isPartial && docMeta ? `
                <div class="text-right">
                    <p class="text-[8px] text-gold font-bold uppercase tracking-widest">${esc(docId)}</p>
                    <p class="text-[8px] text-marble/30 leading-tight">${esc(docMeta.short)}</p>
                </div>` : ''}
                <span id="${cardId}-chevron" class="text-marble/20 text-[10px] transition-transform duration-200 select-none">▼</span>
            </div>
        </div>
        ${isPartial && g.fpImpact ? `
        <div class="mt-3 pt-3 border-t border-white/5">
            <p class="text-[9px] text-marble/30 uppercase tracking-widest mb-1">Blast Radius</p>
            <p class="text-[11px] text-danger leading-relaxed">${esc(g.fpImpact)}</p>
        </div>` : ''}
    </div>`;

    // ── Expanded body ──────────────────────────────────────────────────
    let expandedHTML = '';

    if (!isPartial) {
        // CLEAR: full detail
        expandedHTML = `
        <div id="${cardId}-body" class="hidden border-t border-white/5">
            ${evidenceBlockHTML ? `<div class="px-4 md:px-5 py-4 border-b border-white/5">${evidenceBlockHTML}</div>` : ''}

            <div class="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/5">
                <div class="p-4 md:p-5">
                    <p class="text-[9px] text-marble/30 uppercase tracking-widest mb-2">Structural Absence</p>
                    ${g.fpMechanism ? `<p class="text-[11px] text-marble/80 leading-relaxed font-semibold mb-2">${esc(g.fpMechanism)}</p>` : ''}
                    ${g.fpTrigger  ? `<p class="text-[10px] text-marble/40 leading-relaxed border-l border-gold/20 pl-2 mt-1">Trigger: ${esc(g.fpTrigger)}</p>` : ''}
                </div>
                <div class="p-4 md:p-5">
                    <p class="text-[9px] text-orange-500/50 uppercase tracking-widest mb-2">Legal Precedent</p>
                    <p class="text-[11px] text-marble/65 leading-relaxed">${esc(g.legalPain || 'Pending enforcement action.')}</p>
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/5 border-t border-white/5">
                <div class="p-4 md:p-5">
                    <div class="flex items-center gap-2 mb-3">
                        <p class="text-[9px] text-marble/30 uppercase tracking-widest">Blast Radius</p>
                        ${sevBadge(g.calculatedSeverity)}
                    </div>
                    ${g.fpImpact ? `<p class="text-[11px] text-danger leading-relaxed mb-2">${esc(g.fpImpact)}</p>` : ''}
                    ${g.fpStakes ? `<p class="text-[10px] text-marble/35 leading-relaxed border-t border-white/5 pt-2">${esc(g.fpStakes)}</p>` : ''}
                    ${g.predatorSignature ? `<p class="text-[9px] text-marble/20 mt-2 uppercase tracking-widest">Plaintiff vector: ${esc(g.predatorSignature)}</p>` : ''}
                </div>
                <div class="p-4 md:p-5 bg-gold/[0.02]">
                    <p class="text-[9px] text-gold/50 uppercase tracking-widest mb-2">Lex Nova Fix™</p>
                    ${docMeta ? `
                        <p class="text-gold font-bold text-sm mb-1">${esc(docId)}</p>
                        <p class="text-[11px] text-marble/55 mb-2">${esc(docMeta.short)}</p>
                        <p class="text-[10px] text-marble/35 leading-relaxed">${esc(docMeta.desc)}</p>
                        ${g.lexNovaFix ? `<p class="text-[9px] text-marble/20 mt-2 border-t border-white/5 pt-2 italic">${esc(g.lexNovaFix)}</p>` : ''}
                    ` : `<p class="text-[11px] text-marble/50">${esc(g.lexNovaFix || 'Lex Nova proprietary module.')}</p>`}
                </div>
            </div>
        </div>`;

    } else {
        // PARTIAL: mechanism + legal blurred, blast radius + fix visible
        expandedHTML = `
        <div id="${cardId}-body" class="hidden border-t border-white/5">
            <div class="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/5">
                <div class="p-4 md:p-5">
                    <p class="text-[9px] text-marble/30 uppercase tracking-widest mb-2">Structural Absence</p>
                    <div class="select-none" style="filter:blur(6px)">
                        <p class="text-[11px] text-marble/70 leading-relaxed">${esc(g.fpMechanism || 'Architecture gap identified.')}</p>
                    </div>
                    <p class="text-[9px] text-marble/15 mt-2 italic">Activate to view full mechanism</p>
                </div>
                <div class="p-4 md:p-5">
                    <p class="text-[9px] text-orange-500/40 uppercase tracking-widest mb-2">Legal Precedent</p>
                    <div class="select-none" style="filter:blur(6px)">
                        <p class="text-[11px] text-marble/60 leading-relaxed">${esc(g.legalPain || 'Legal basis on file.')}</p>
                    </div>
                    <p class="text-[9px] text-marble/15 mt-2 italic">Activate to view case law</p>
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/5 border-t border-white/5">
                <div class="p-4 md:p-5">
                    <div class="flex items-center gap-2 mb-3">
                        <p class="text-[9px] text-marble/30 uppercase tracking-widest">Blast Radius</p>
                        ${sevBadge(g.calculatedSeverity)}
                    </div>
                    ${g.fpImpact ? `<p class="text-[11px] text-danger leading-relaxed">${esc(g.fpImpact)}</p>` : ''}
                </div>
                <div class="p-4 md:p-5 bg-gold/[0.02]">
                    <p class="text-[9px] text-gold/50 uppercase tracking-widest mb-2">Lex Nova Fix™</p>
                    ${docMeta ? `
                        <p class="text-gold font-bold text-sm mb-1">${esc(docId)}</p>
                        <p class="text-[11px] text-marble/55">${esc(docMeta.short)}</p>
                    ` : `<p class="text-[11px] text-marble/50">Lex Nova proprietary module.</p>`}
                </div>
            </div>
        </div>`;
    }

    return `
    <div id="${cardId}" class="border border-white/5 bg-[#050505] hover:border-white/10 transition-colors overflow-hidden">
        ${collapsedHTML}
        ${expandedHTML}
    </div>`;
}

function buildLockedBatchCard(count) {
    if (count === 0) return '';
    const boxes = Array.from({length: Math.min(count, 6)}).map(() =>
        `<div class="w-7 h-7 border border-white/5 bg-[#080808] flex items-center justify-center"><span class="text-[10px] opacity-20">🔒</span></div>`
    ).join('');
    const extra = count > 6 ? `<div class="w-7 h-7 border border-white/5 bg-[#080808] flex items-center justify-center"><span class="text-[8px] text-marble/20">+${count-6}</span></div>` : '';

    return `
    <div class="border border-white/5 bg-[#050505] p-6 text-center">
        <div class="flex justify-center gap-2 mb-4 flex-wrap">${boxes}${extra}</div>
        <p class="text-[10px] text-marble/35 uppercase tracking-[0.2em] font-bold mb-1">
            ${count} Threat${count===1?'':'s'} Locked
        </p>
        <p class="text-[10px] text-marble/20 leading-relaxed mb-4 max-w-xs mx-auto">
            Full matrix + Lex Nova Fix™ citations unlock on engagement.
        </p>
        <button onclick="document.getElementById('trigger-checkout-btn')?.click()"
            class="border border-gold/30 text-gold/70 text-[9px] tracking-widest uppercase px-8 py-3 hover:bg-gold hover:text-void transition-all">
            Activate Architecture to Unlock →
        </button>
    </div>`;
}

// ============================================================================
// 4. SECTION I — PRODUCT MIRROR
// ============================================================================

function buildProductMirror(prospectData, registryData) {
    if (!prospectData) return '';
    const pp       = prospectData.primaryProduct || {};
    const claim    = prospectData.primary_claim || null;
    const features = prospectData.featureMap?.core || [];
    const archetypes = registryData?.definitions?.archetypes || {};
    if (!pp.product_name && !claim && !features.length) return '';

    const featuresHTML = features.length ? `
    <div class="mt-5 pt-5 border-t border-white/5">
        <p class="text-[9px] text-marble/25 uppercase tracking-widest mb-3">Features Under Assessment</p>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            ${features.map(f => {
                const archDef  = archetypes[f.archetype];
                const archLabel = archDef ? `${f.archetype} — ${archDef.label}` : f.archetype;
                return `
                <div class="bg-[#080808] border border-white/5 p-4 hover:border-gold/20 transition-colors">
                    <p class="text-[8px] text-gold uppercase tracking-widest font-bold mb-1">${esc(archLabel)}</p>
                    <p class="text-sm text-marble font-semibold mb-2">${esc(f.feature_name)}</p>
                    ${f.evidence_quote ? `<p class="text-[9px] text-marble/25 italic border-l border-white/10 pl-2 leading-relaxed">"${esc(f.evidence_quote.length>100?f.evidence_quote.substring(0,100)+'...':f.evidence_quote)}"</p>` : ''}
                </div>`;
            }).join('')}
        </div>
    </div>` : '';

    return `
    <div class="mb-6 bg-[#050505] border border-white/5 p-5 md:p-6">
        <p class="text-[9px] tracking-widest text-marble/25 uppercase font-bold mb-4 pb-3 border-b border-white/5">
            I. PRODUCT & ARCHITECTURE ASSESSMENT
        </p>
        <div class="flex flex-col md:flex-row gap-5">
            <div class="flex-1">
                ${pp.product_name ? `
                    <p class="text-[9px] text-marble/30 uppercase tracking-widest mb-1">Primary Product</p>
                    <p class="font-serif text-2xl text-marble">${esc(pp.product_name)}</p>
                    ${pp.user ? `<p class="text-[10px] text-marble/35 mt-1">Serving: ${esc(pp.user)}</p>` : ''}
                ` : ''}
            </div>
            ${claim ? `
            <div class="flex-1 md:border-l md:border-white/5 md:pl-5">
                <p class="text-[9px] text-marble/30 uppercase tracking-widest mb-1">Public Claim Under Assessment</p>
                <p class="font-serif text-base text-marble/55 italic leading-relaxed">"${esc(claim)}"</p>
            </div>` : ''}
        </div>
        ${featuresHTML}
    </div>`;
}

// ============================================================================
// 5. SECTION II — THE TRAPS
// ============================================================================

function buildTraps(prospectData) {
    if (!prospectData) return '';
    const hasAlibi      = !!prospectData.posture_alibi?.argument;
    const hasIndictment = !!(prospectData.self_indictments?.length);
    const hasLegal      = !!prospectData.legal_stack_alibi?.overall_inadequacy;
    if (!hasAlibi && !hasIndictment && !hasLegal) return '';

    let html = `<div class="mb-6 space-y-3">`;

    if (hasAlibi || hasIndictment) {
        html += `<div class="grid grid-cols-1 md:grid-cols-2 gap-3">`;
        if (hasAlibi) {
            const a = prospectData.posture_alibi;
            const w = a.evidence?.[0]?.what_it_proves || 'standard enterprise coverage';
            html += `
            <div class="bg-[#050505] border border-white/5 p-5">
                <p class="text-[9px] tracking-widest text-gold uppercase font-bold mb-2">⊘ INVALID DEFENSE POSTURE</p>
                <p class="text-[10px] text-marble/35 italic mb-2">"${esc(w)}..."</p>
                <p class="text-[11px] text-danger font-mono leading-relaxed border-l-2 border-danger pl-3">${esc(a.argument)}</p>
            </div>`;
        }
        if (hasIndictment) {
            const ind = prospectData.self_indictments[0];
            html += `
            <div class="bg-[#050505] border border-white/5 p-5">
                <p class="text-[9px] tracking-widest text-gold uppercase font-bold mb-2">⚠ PUBLIC CONTRADICTION</p>
                <p class="text-[10px] text-marble/35 italic mb-2">Your marketing: "${esc(ind.quote)}"</p>
                <p class="text-[11px] text-orange-500 font-mono leading-relaxed border-l-2 border-orange-500 pl-3">LEGAL REALITY: ${esc(ind.contradicts)}</p>
            </div>`;
        }
        html += `</div>`;
    }

    if (hasLegal) {
        html += `
        <div class="bg-[#050505] border border-danger/15 p-5">
            <p class="text-[9px] tracking-widest text-danger uppercase font-bold mb-2">⊘ LEGAL STACK TEARDOWN</p>
            <p class="text-[11px] text-marble/45 font-mono leading-relaxed">${esc(prospectData.legal_stack_alibi.overall_inadequacy)}</p>
        </div>`;
    }

    html += `</div>`;
    return html;
}

// ============================================================================
// 6. ITEMIZED RECEIPT
// ============================================================================

function buildItemizedReceipt(financials, hostageIds) {
    let rows = '';
    financials.receiptLines.forEach(line => {
        const red = hostageIds.includes(line.threatId);
        const name = red ? `<span class="opacity-25 select-none">[ CLASSIFIED ${esc(line.tier)} THREAT ]</span>` : esc(line.threatName);
        rows += `
        <tr class="border-b border-white/5 text-[10px]">
            <td class="p-2 text-marble font-bold">${name}</td>
            <td class="p-2 text-marble/35 hidden sm:table-cell">${CURRENCY.format(line.baseValue)} (${line.tier})</td>
            <td class="p-2 text-gold hidden sm:table-cell">×${line.appliedMultiplier}</td>
            <td class="p-2 text-danger font-bold text-right">${CURRENCY.format(line.finalLineTotal)}</td>
        </tr>`;
    });

    return `
    <div class="mt-4 pt-4 border-t border-danger/20">
        <button onclick="document.getElementById('receipt-table').classList.toggle('hidden')"
            class="text-[9px] text-gold/40 tracking-widest uppercase font-bold hover:text-gold transition-colors mb-3 w-full text-center">
            ▸ View Actuarial Calculation Basis
        </button>
        <div id="receipt-table" class="hidden overflow-x-auto">
            <table class="w-full bg-[#080808] border border-white/5">
                <thead>
                    <tr class="text-[8px] text-marble/20 uppercase tracking-widest border-b border-white/10">
                        <th class="p-2 text-left">Vulnerability</th>
                        <th class="p-2 text-left hidden sm:table-cell">Base</th>
                        <th class="p-2 text-left hidden sm:table-cell">Mult.</th>
                        <th class="p-2 text-right">Exposure</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
    </div>`;
}

// ============================================================================
// 7. ARCHITECTURE MANIFEST
// ============================================================================

function buildManifest(prescription) {
    const docs = KITS[prescription] || KITS['agentic_shield'];
    const cards = docs.map(id => {
        const m = DOC_META[id];
        if (!m) return '';
        return `
        <div class="border border-white/5 bg-[#080808] p-4 hover:border-gold/20 transition-colors">
            <div class="flex items-start justify-between gap-2 mb-2">
                <div>
                    <p class="text-gold font-bold text-[11px] tracking-widest">${id}</p>
                    <p class="text-[11px] text-marble mt-[2px]">${esc(m.short)}</p>
                </div>
                <span class="flex-shrink-0 text-[7px] font-bold tracking-widest border border-gold/25 text-gold/50 px-2 py-[2px] bg-gold/5 uppercase">
                    INCLUDED
                </span>
            </div>
            <p class="text-[9px] text-marble/25 leading-relaxed">${esc(m.desc)}</p>
        </div>`;
    }).join('');

    return `
    <div class="bg-[#050505] border border-white/5 p-5 md:p-6">
        <div class="flex items-baseline justify-between mb-1">
            <h4 class="font-serif text-lg text-gold italic">Architecture Manifest</h4>
            <span class="text-[8px] text-marble/25 uppercase tracking-widest">${docs.length} docs</span>
        </div>
        <p class="text-[9px] text-marble/25 mb-4">
            The Lex Nova Fix™ stack prescribed for your threat profile.
        </p>
        <div class="space-y-2">${cards}</div>
    </div>`;
}

// ============================================================================
// 8. MASTER RENDER
// ============================================================================

export function renderDashboard(finalReport, prospectData) {
    console.log("> EXHIBITION: Rendering dashboard v2.0...");

    const container = document.getElementById(DOM_ID);
    if (!container) {
        console.error(`> EXHIBITION FATAL: Container [${DOM_ID}] missing.`);
        return;
    }

    const hostageData = applyHostageRule(finalReport.sortedThreats);
    const plan = PLAN_DATA[finalReport.prescription] || PLAN_DATA['complete_stack'];

    // Escalators
    let flagsHTML = '';
    if (finalReport.financials.hasPersonalLiability)
        flagsHTML += `<div class="bg-danger text-void px-3 py-2 text-[10px] font-bold tracking-widest uppercase text-center animate-pulse mb-3">⚠ PIERCED CORPORATE VEIL DETECTED</div>`;
    if (finalReport.financials.hasCriminalLiability)
        flagsHTML += `<div class="bg-red-900 text-white px-3 py-2 text-[10px] font-bold tracking-widest uppercase text-center animate-pulse mb-3">⚠ CRIMINAL EXPOSURE DETECTED</div>`;

    // Tier counters
    let cT1=0, cT2=0;
    finalReport.sortedThreats.forEach(t => { if(t.calculatedSeverity==='T1') cT1++; else if(t.calculatedSeverity==='T2') cT2++; });

    // Build cards
    let cardsHTML = '';
    let ci = 0;
    hostageData.clearGaps.forEach(g  => { cardsHTML += buildThreatCard(g, 'clear',   ci++); });
    hostageData.blurredGaps.forEach(g => { cardsHTML += buildThreatCard(g, 'partial', ci++); });
    cardsHTML += buildLockedBatchCard(hostageData.lockedGaps.length);

    container.innerHTML = `
    <div class="w-full max-w-6xl mx-auto px-4 md:px-6">

        <!-- HEADER -->
        <div class="mb-7 pb-6 border-b border-white/10">
            <div class="flex flex-col md:flex-row md:justify-between md:items-end gap-3">
                <div>
                    <h1 class="font-serif text-3xl md:text-5xl text-marble uppercase tracking-widest mb-1">Structural Exposure Audit</h1>
                    <p class="font-serif text-xl md:text-2xl text-gold italic">
                        ${esc(prospectData?.company || 'Your Company')}
                        <span class="text-marble/15 font-sans text-[9px] ml-3 not-italic tracking-widest">PID: ${esc(prospectData?.prospectId || '—')}</span>
                    </p>
                </div>
                <div class="text-left md:text-right">
                    <p class="text-[10px] text-marble/35 uppercase tracking-[0.12em]">
                        Prepared for: <span class="text-marble/65 font-bold">${esc(prospectData?.founderName || 'Founder')}</span>
                    </p>
                    <p class="text-[9px] text-marble/25 uppercase tracking-[0.12em] mt-1">${esc(prospectData?.jurisdiction || 'Global Market')}</p>
                </div>
            </div>
        </div>

        <!-- SECTION I -->
        ${buildProductMirror(prospectData, finalReport.registry)}

        <!-- SECTION II -->
        ${buildTraps(prospectData)}

        <!-- MAIN GRID -->
        <div class="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-7 items-start">

            <!-- LEFT: Threat Matrix -->
            <div>
                <div class="flex items-center justify-between mb-4 flex-wrap gap-2">
                    <h3 class="font-serif text-xl text-gold italic">Threat Matrix</h3>
                    <div class="flex gap-2 flex-wrap">
                        <span class="bg-danger/10 border border-danger/20 px-2 py-1 text-[9px] text-danger font-bold tracking-widest">T1: ${cT1}</span>
                        <span class="bg-orange-500/10 border border-orange-500/20 px-2 py-1 text-[9px] text-orange-400 font-bold tracking-widest">T2: ${cT2}</span>
                        <span class="bg-[#080808] border border-white/10 px-2 py-1 text-[9px] text-marble/60 font-bold tracking-widest">TOTAL: ${finalReport.sortedThreats.length}</span>
                    </div>
                </div>
                <div class="space-y-2">${cardsHTML}</div>
            </div>

            <!-- RIGHT: Wallet-Opener -->
            <div class="xl:sticky xl:top-6 space-y-4">

                <!-- Exposure -->
                <div class="bg-danger/10 border border-danger/30 p-5 text-center">
                    ${flagsHTML}
                    <p class="text-[9px] tracking-[0.15em] text-danger uppercase font-bold mb-1">Maximum Concurrent Exposure</p>
                    <div class="font-serif text-4xl text-marble mb-1 leading-none">${CURRENCY.format(finalReport.financials.totalExposure)}</div>
                    <p class="text-[8px] text-marble/20 uppercase tracking-widest">Lex Nova Actuarial Engine v6.0</p>
                    ${buildItemizedReceipt(finalReport.financials, hostageData.hostageIds)}
                </div>

                <!-- Checkout -->
                <div class="bg-[#080808] border border-white/10 p-5 text-center">
                    <p class="text-[8px] tracking-[0.15em] text-marble/25 uppercase font-bold mb-2">Required Architecture Fix</p>
                    <p class="font-serif text-lg text-gold mb-1">${esc(plan.name)}</p>
                    <div class="font-serif text-4xl text-marble mb-2 leading-none">${CURRENCY.format(plan.price)}</div>
                    <p class="text-[9px] text-marble/25 leading-relaxed mb-5">${esc(plan.delivery)}. No discovery calls.<br>Vault activation on payment.</p>
                    <button id="trigger-checkout-btn" class="block w-full bg-gold text-void py-4 font-bold text-[11px] tracking-widest uppercase hover:bg-marble transition-all mb-3">
                        Secure Architecture Now
                    </button>
                    <button id="trigger-valve-btn" class="block w-full text-[9px] text-marble/20 tracking-widest uppercase hover:text-marble/45 transition-all py-2">
                        Questions? Request direct contact.
                    </button>
                </div>

                <!-- Manifest -->
                ${buildManifest(finalReport.prescription)}

            </div>
        </div>
    </div>

    <!-- HESITATION MODAL -->
    <div id="hesitation-modal" class="hidden fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
        <div class="bg-[#050505] border border-gold/20 p-7 max-w-md w-full text-center">
            <h4 class="font-serif text-xl text-gold mb-4">Request Direct Contact</h4>
            <p class="text-xs text-marble/45 leading-relaxed mb-4 text-left">Lex Nova maintains a strictly capped active client roster to protect drafting precision. We do not maintain public sales calendars.</p>
            <p class="text-xs text-marble/45 leading-relaxed mb-6 text-left">Your matrix will be flagged for priority review. A Lex Nova partner will contact you directly via email today.</p>
            <button id="confirm-valve-btn" class="block w-full border border-gold text-gold py-3 font-bold text-[11px] tracking-widest uppercase hover:bg-gold hover:text-void transition-all mb-3">
                Flag Matrix For Priority Review
            </button>
            <button onclick="document.getElementById('hesitation-modal').classList.add('hidden')" class="block w-full text-[9px] text-marble/20 tracking-widest uppercase hover:text-marble/45 transition-all py-2">
                Cancel
            </button>
        </div>
    </div>`;

    // ── WIRE EVENTS ────────────────────────────────────────────────────

    window.LN_toggleCard = function(cardId) {
        const body    = document.getElementById(`${cardId}-body`);
        const chevron = document.getElementById(`${cardId}-chevron`);
        if (!body) return;
        const wasOpen = !body.classList.contains('hidden');
        body.classList.toggle('hidden', wasOpen);
        if (chevron) chevron.style.transform = wasOpen ? 'rotate(0deg)' : 'rotate(180deg)';
    };

    document.getElementById('trigger-checkout-btn')?.addEventListener('click', async () => {
        const pid = getActiveProspectId();
        await Telemetry.logState('checkout_initiated');
        window.location.href = `./engagement.html?pid=${pid}&plan=${finalReport.prescription}`;
    });

    document.getElementById('trigger-valve-btn')?.addEventListener('click', () => {
        document.getElementById('hesitation-modal')?.classList.remove('hidden');
    });

    document.getElementById('confirm-valve-btn')?.addEventListener('click', async (e) => {
        const btn = e.target;
        btn.innerText = 'REQUEST SENT.';
        btn.classList.replace('text-gold','text-void');
        btn.classList.add('bg-gold');
        const pid = getActiveProspectId();
        await Telemetry.logState('negotiation_requested');
        fetch(HESITATION_WEBHOOK, {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({
                event:'HESITATION_VALVE_TRIGGERED', prospectId: pid,
                email: prospectData?.email||'Unknown', company: prospectData?.company||'Unknown',
                calculatedExposure: finalReport.financials.totalExposure,
                timestamp: new Date().toISOString()
            })
        }).catch(()=>{});
        setTimeout(() => {
            document.getElementById('hesitation-modal')?.classList.add('hidden');
            btn.innerText = 'Flag Matrix For Priority Review';
            btn.classList.replace('text-void','text-gold');
            btn.classList.remove('bg-gold');
        }, 2000);
    });

    container.classList.remove('hidden-state','hidden');
    container.style.display = 'block';
    container.style.opacity = '1';
    window.scrollTo({ top: 0, behavior: 'smooth' });
    console.log("> EXHIBITION: Render complete.");
}
