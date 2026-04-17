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

function escapeHTML(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}



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

function formatBadge(s) {
    const sc = sevClasses(s);
    const label = labelSeverity(s);
    return `<span class="px-2 py-1 text-[9px] font-bold block w-max ${sc}">${label}</span>`;
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

// ============================================================================
// 4. COMPONENT RENDERERS (The Horizontal Cards)
// ============================================================================

function buildHeader(prospectData) {
    const compName = prospectData?.company || "Your Company";
    const founderName = prospectData?.founderName || "Founder"; 
    const jurisdiction = prospectData?.jurisdiction || "Global Market";
    const pid = prospectData?.prospectId || "UNKNOWN-PID";

    return `
    <div class="mb-12 text-center lg:text-left border-b border-white/10 pb-8">
        <h1 class="font-serif text-4xl md:text-5xl text-marble mb-2 uppercase tracking-widest">Structural Exposure Audit</h1>
        <p class="font-serif text-2xl text-gold italic mb-4">${compName} <span class="text-marble/30 font-sans text-xs ml-4 not-italic">PID: ${pid}</span></p>
        <p class="font-sans text-xs text-marble/50 uppercase tracking-widest">
            Prepared for <span class="text-marble/80 font-bold">${founderName}</span> <span class="mx-2 text-gold">|</span> ${jurisdiction}
        </p>
    </div>`;
}

function buildProfileAndFeatures(prospectData) {
    if (!prospectData) return '';
    
    // Fallbacks if data is missing
    const archetypes = prospectData.archetypes || prospectData.primaryArchetype || ['The Creator'];
    const archLabels = archetypes.map(a => `<span class="bg-gold/10 border border-gold/30 text-gold px-2 py-1 text-[9px] uppercase tracking-widest mr-2">${a}</span>`).join('');
    
    return `
    <div class="bg-[#050505] border border-white/5 p-6 mb-6">
        <p class="text-[9px] tracking-widest text-marble/50 uppercase font-bold mb-4">I. PRODUCT & FEATURE MAPPING</p>
        <div class="flex flex-wrap items-center gap-4 mb-4">
            <span class="text-[10px] text-marble/70 uppercase tracking-widest">Identified Architecture:</span>
            ${archLabels}
        </div>
        <p class="text-xs text-marble/70 leading-relaxed font-mono">
            Forensic scan confirms product architecture maps to the above liability archetypes. 
            Regulatory surfaces triggered based on evaluated features and public documentation.
        </p>
    </div>`;
}

function buildIndictmentsAndGhosts(prospectData) {
    if (!prospectData) return '';
    let html = `<div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">`;

if (prospectData.posture_alibi) {
        html += `
        <div class="bg-[#050505] border border-white/5 p-6 shadow-[inset_0_0_20px_rgba(255,215,0,0.02)]">
            <p class="text-[9px] tracking-widest text-gold uppercase font-bold mb-3">⊘ INVALID DEFENSE POSTURE (Ghost Protection)</p>
            <p class="text-[11px] text-marble/50 italic mb-2">"But we have ${escapeHTML(prospectData.posture_alibi.evidence?.[0]?.what_it_proves || 'an enterprise MSA')}..."</p>
            <p class="text-xs text-danger font-mono leading-relaxed border-l-2 border-danger pl-3">${escapeHTML(prospectData.posture_alibi.argument)}</p>
        </div>`;
    }

    if (prospectData.self_indictments && prospectData.self_indictments.length > 0) {
        const ind = prospectData.self_indictments[0];
        html += `
        <div class="bg-[#050505] border border-white/5 p-6 shadow-[inset_0_0_20px_rgba(220,38,38,0.02)]">
            <p class="text-[9px] tracking-widest text-gold uppercase font-bold mb-3">⚠ PUBLIC CONTRADICTION (Self-Indictment)</p>
            <p class="text-[11px] text-marble/50 italic mb-2">Marketing Claim: "${escapeHTML(ind.quote)}"</p>
            <p class="text-xs text-orange-500 font-mono leading-relaxed border-l-2 border-orange-500 pl-3">LEGAL REALITY: ${escapeHTML(ind.contradicts)}</p>
        </div>`;
    }
    html += `</div>`;
    return html;
}

// ============================================================================
// 5. COMPONENT RENDERERS (The 6-Column Threat Matrix)
// ============================================================================

function buildEvidenceData(g) {
    // Determine Verification Status
    let badge = `<span class="inline-block mt-2 px-2 py-1 text-[8px] tracking-[0.2em] uppercase bg-yellow-500/10 text-yellow-500 border border-yellow-500/30 font-bold">[ CONFIRMED BY YOU (INTERNAL AUDIT) ]</span>`;
    let evBlock = '';

    // If it came from the scrape, or dual-verified
    if (g.source === 'dual-verified' || g.dualVerifiable) {
        badge = `<span class="inline-block mt-2 px-2 py-1 text-[8px] tracking-[0.2em] uppercase bg-danger/10 text-danger border border-danger/30 font-bold animate-pulse">[ VERIFIED: PUBLIC + CONFIRMED BY YOU ]</span>`;
    } else if (g.source === 'scrape') {
        badge = `<span class="inline-block mt-2 px-2 py-1 text-[8px] tracking-[0.2em] uppercase bg-[#60a5fa]/10 text-[#60a5fa] border border-[#60a5fa]/30 font-bold">[ FOUND ON YOUR PUBLIC SITE ]</span>`;
    }

    // Extract Scraped Evidence if it exists
    const rawFound = g.evidence?.found || g.evidence?.source || '';
    // Apply the HTML Escaper to prevent silent DOM crashes
    const found = escapeHTML(rawFound.substring(0, 200) + (rawFound.length > 200 ? '...' : ''));

    if (found) {
        evBlock = `
        <div class="mt-3 p-3 bg-[#000000] border border-white/10 font-mono text-[9px] text-marble/60 leading-relaxed break-words whitespace-pre-wrap">
            <span class="text-gold font-bold block mb-1">&gt; SCRAPED EVIDENCE:</span> 
            ${found}
        </div>`;
    }

    return { badge, evBlock };
}
function buildThreatMatrix(hostageData) {
    let matrixRows = '';

    // 1. Render Clear Rows (The Proof)
    hostageData.clearGaps.forEach(g => {
        const evData = buildEvidenceData(g);
        const clock = formatVelocity(g.velocity);
        
        // Check for diligence pressure from test.txt
        // UNIVERSAL KEY FIX: Safely parse diligence_pressure based on test.txt schema
        const pressure = (g.diligence_pressure && g.diligence_pressure.active) 
            ? `<div class="mt-3 text-[9px] text-orange-500 uppercase tracking-[0.2em] font-bold border border-orange-500/30 bg-orange-500/10 px-2 py-1 inline-block">⚠ ${g.diligence_pressure.trigger || 'DUE DILIGENCE DEADLINE'}</div>` 
            : '';
        matrixRows += `
        <tr class="border-b border-white/5 bg-[#050505] hover:bg-[#080808] transition-colors">
            <td class="p-5 align-top w-[20%]">
                <span class="font-serif text-lg text-marble block mb-1 leading-tight">${g.threatName || g.name || g.trap}</span>
                ${evData.badge}
                ${evData.evBlock}
            </td>
            
            <td class="p-5 align-top w-[20%]">
                <span class="text-marble/90 text-[11px] leading-relaxed block mb-2 font-bold">${g.copywriting?.mechanism || g.thePain || 'Architecture gap detected.'}</span>
                <span class="text-marble/50 text-[10px] leading-relaxed block border-l border-gold/30 pl-2 mt-2">Trigger: ${g.copywriting?.trigger || 'Action occurs without hard gate.'}</span>
            </td>
            
            <td class="p-5 align-top w-[15%]">
                <span class="text-orange-500 font-mono text-[10px] leading-relaxed block mb-1">LEGAL PRECEDENT:</span>
                <span class="text-marble/80 text-[11px] leading-relaxed block font-bold">${g.legalAmmo || 'Pending FTC/State AG Enforcement Action'}</span>
            </td>

            <td class="p-5 align-top w-[20%]">
                ${formatBadge(g.calculatedSeverity)}
                <span class="text-danger text-[11px] leading-relaxed block mt-3">${g.copywriting?.impact || g.copywriting?.stakes || 'Liability exposure without ceiling. Catastrophic risk to enterprise deals.'}</span>
            </td>

            <td class="p-5 align-top w-[10%]">
                <span class="text-marble/80 font-mono text-[10px] tracking-widest uppercase block">${clock}</span>
                ${pressure}
            </td>

            <td class="p-5 align-top w-[15%]">
                <span class="text-gold font-bold text-[11px] block mb-1">${g.copywriting?.fix?.split(' ')[0] || 'Module Required'}</span>
                <span class="text-marble/50 text-[9px] leading-relaxed block">${DOC_DESCRIPTIONS[g.copywriting?.fix?.split(' ')[0]] || 'Lex Nova proprietary structural defense.'}</span>
            </td>
        </tr>`;
    });

    // 2. Render Blurred Hostage Rows
    hostageData.blurredGaps.forEach(g => {
        matrixRows += `
        <tr class="border-b border-white/5 bg-[#080808] opacity-80">
            <td class="p-5 align-top w-[20%]">
                <span class="font-serif text-lg text-marble block mb-1 leading-tight" style="filter:blur(4px);user-select:none">Classified Threat Vector</span>
                ${formatBadge(g.calculatedSeverity)}
            </td>
            <td class="p-5 align-top w-[20%]"><span class="text-marble/70 text-[11px] leading-relaxed block" style="filter:blur(4px);user-select:none">Detailed mechanism and structural trigger redacted.</span></td>
            <td class="p-5 align-top w-[15%]"><span class="text-marble/70 text-[11px] leading-relaxed block" style="filter:blur(4px);user-select:none">Classified Precedent</span></td>
            <td class="p-5 align-top w-[20%]"><span class="text-danger text-[11px] leading-relaxed block" style="filter:blur(4px);user-select:none">Severe downstream business consequence redacted. Full matrix unlocks on engagement.</span></td>
            <td class="p-5 align-top w-[10%]"><span class="text-marble/50 font-mono text-[10px] tracking-widest uppercase block" style="filter:blur(4px);user-select:none">PENDING</span></td>
            <td class="p-5 align-top w-[15%]"><span class="text-gold font-bold text-[11px] block" style="filter:blur(4px);user-select:none">Lex Nova Module</span></td>
        </tr>`;
    });

    return `
    <div class="mb-10 overflow-x-auto border border-shadow bg-[#050505]">
        <table class="w-full text-left font-sans text-[11px] border-collapse min-w-[1000px]">
            <thead>
                <tr class="text-[9px] text-gold/60 uppercase tracking-widest border-b border-white/10 bg-[#080808]">
                    <th class="p-5 w-[20%]">I. The Vulnerability & Evidence</th>
                    <th class="p-5 w-[20%]">II. Structural Absence</th>
                    <th class="p-5 w-[15%]">III. Legal Precedent</th>
                    <th class="p-5 w-[20%]">IV. Blast Radius</th>
                    <th class="p-5 w-[10%]">V. Clock</th>
                    <th class="p-5 w-[15%]">VI. The Fix</th>
                </tr>
            </thead>
            <tbody>${matrixRows}</tbody>
        </table>
    </div>`;
}

// ============================================================================
// 6. COMPONENT RENDERERS (Itemized Receipt)
// ============================================================================

function buildItemizedReceipt(financials, hostageIds) {
    let rowsHTML = '';

    financials.receiptLines.forEach(line => {
        // Redact the names of hostage rows in the receipt to maintain mystery
        const isRedacted = hostageIds.includes(line.threatId);
        const displayName = isRedacted ? `<span class="opacity-50">[ CLASSIFIED ${line.tier} THREAT ]</span>` : line.threatName;
        
        rowsHTML += `
        <tr class="border-b border-white/5">
            <td class="p-3 text-[11px] text-marble font-bold">${displayName}</td>
            <td class="p-3 text-[10px] text-marble/50">${CURRENCY.format(line.baseValue)} (${line.tier})</td>
            <td class="p-3 text-[10px] text-gold">x ${line.appliedMultiplier} <span class="opacity-50">(${line.multiplierReason})</span></td>
            <td class="p-3 text-[10px] text-marble/70">${line.decayLabel}</td>
            <td class="p-3 text-[11px] text-danger font-bold text-right">${CURRENCY.format(line.finalLineTotal)}</td>
        </tr>`;
    });

    return `
    <div class="mt-6 border-t border-danger/20 pt-6">
        <button onclick="document.getElementById('receipt-table').classList.toggle('hidden');" class="text-[9px] text-gold tracking-widest uppercase font-bold hover:text-marble transition-colors mb-4 w-full text-center">
            ▸ View Actuarial Calculation Basis
        </button>
        <div id="receipt-table" class="hidden overflow-x-auto bg-[#080808] border border-shadow p-4 text-left">
            <table class="w-full">
                <thead>
                    <tr class="text-[9px] text-marble/40 uppercase tracking-widest border-b border-white/10">
                        <th class="p-3">Vulnerability</th>
                        <th class="p-3">Base Severity</th>
                        <th class="p-3">Scale Multiplier</th>
                        <th class="p-3">Concurrent Adjustment</th>
                        <th class="p-3 text-right">Adjusted Exposure</th>
                    </tr>
                </thead>
                <tbody>${rowsHTML}</tbody>
            </table>
        </div>
    </div>`;
}

// ============================================================================
// 7. MASTER RENDER EXECUTION
// ============================================================================

export function renderDashboard(finalReport, prospectData) {
    console.log("> EXHIBITION: Building final $143M canvas (6-Column Matrix Layout)...");

    const container = document.getElementById(DOM_ID);
    
    // SAFETY CATCH: If the container is missing, scream in the console.
    if (!container) {
        console.error(`> 🚨 EXHIBITION FATAL: Cannot find DOM container with ID [${DOM_ID}]. Check your HTML file!`);
        return;
    }

    console.log("> EXHIBITION: DOM Container located. Processing Hostage Rule...");

    // 1. Process Hostage Data & Plan
    const hostageData = applyHostageRule(finalReport.sortedThreats);
    const plan = PLAN_DATA[finalReport.prescription] || PLAN_DATA['complete_stack'];
    
    // 2. Escalators (Corporate Veil / Criminal Flags)
    let flagsHTML = '';
    if (finalReport.financials.hasPersonalLiability) {
        flagsHTML += `<p class="bg-danger text-void px-3 py-1 text-[10px] font-bold tracking-widest uppercase inline-block mb-3 animate-pulse shadow-[0_0_15px_rgba(220,38,38,0.3)]">⚠ PIERCED CORPORATE VEIL DETECTED</p> `;
    }
    if (finalReport.financials.hasCriminalLiability) {
        flagsHTML += `<p class="bg-red-800 text-white px-3 py-1 text-[10px] font-bold tracking-widest uppercase inline-block mb-3 animate-pulse shadow-[0_0_15px_rgba(153,27,27,0.3)]">⚠ CRIMINAL EXPOSURE DETECTED</p>`;
    }

    // 3. Tally Counters for Left Side
    let cN = 0, cC = 0;
    finalReport.sortedThreats.forEach(t => {
        if (t.calculatedSeverity === 'T1') cN++;
        else if (t.calculatedSeverity === 'T2') cC++;
    });

    // 4. Build the Manifest HTML for Right Sidebar
    const docsToRender = KITS[finalReport.prescription] || KITS['agentic_shield'];
    const manifestHTML = docsToRender.map(d => `
    <div class="border-l-2 border-gold pl-3 mb-4 text-left">
        <span class="text-[9px] text-gold uppercase font-bold block">${d.id}</span>
        <span class="text-xs text-marble block">${d.n}</span>
        <span class="text-[9px] text-marble/40 leading-relaxed block mt-1">${DOC_DESCRIPTIONS[d.id] || ''}</span>
    </div>`).join('');

    console.log("> EXHIBITION: Injecting Matrix Layout into DOM...");

    // 5. MASTER LAYOUT INJECTION
    container.innerHTML = `
    <div class="w-full">
        ${buildHeader(prospectData)}
        ${buildProfileAndFeatures(prospectData)}
        ${buildIndictmentsAndGhosts(prospectData)}

        <div class="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-10 items-start">
            
            <div>
                <h3 class="font-serif text-2xl text-gold mb-6 italic">Threat Matrix & Architecture Gaps</h3>
                
                <div class="flex gap-4 mb-4 flex-wrap">
                    <div class="bg-danger/10 border border-danger/20 px-3 py-1"><span class="text-[9px] text-danger font-bold tracking-widest">T1 EXTINCTION: ${cN}</span></div>
                    <div class="bg-orange-500/10 border border-orange-500/20 px-3 py-1"><span class="text-[9px] text-orange-500 font-bold tracking-widest">T2 UNCAPPED: ${cC}</span></div>
                    <div class="bg-[#080808] border border-white/10 px-3 py-1"><span class="text-[9px] text-marble font-bold tracking-widest">TOTAL THREATS: ${finalReport.sortedThreats.length}</span></div>
                </div>

                ${buildThreatMatrix(hostageData)}
            </div>

            <div class="xl:sticky xl:top-8 space-y-6">
                
                <div class="bg-danger/10 border border-danger/30 p-8 text-center shadow-[0_0_40px_rgba(220,38,38,0.1)]">
                    ${flagsHTML}
                    <p class="text-[9px] tracking-[0.2em] text-danger uppercase font-bold mb-2">Maximum Concurrent Exposure</p>
                    <div class="font-serif text-5xl text-marble mb-2">${CURRENCY.format(finalReport.financials.totalExposure)}</div>
                    <p class="text-[9px] text-marble/40 uppercase tracking-widest mt-3">Calculated via Lex Nova Actuarial Engine v6.0</p>
                    ${buildItemizedReceipt(finalReport.financials, hostageData.hostageIds)}
                </div>

                <div class="bg-[#080808] border border-shadow p-8 text-center">
                    <p class="text-[9px] tracking-[0.2em] text-marble opacity-50 uppercase font-bold mb-6">Required Architecture Fix: ${plan.name}</p>
                    <div class="flex items-center justify-center gap-4 mb-6">
                        <span class="text-gold text-5xl font-serif">${CURRENCY.format(plan.price)}</span>
                    </div>
                    <p class="font-sans text-xs text-marble opacity-60 leading-relaxed mb-6">${plan.delivery}. No discovery calls. Vault activation immediately upon payment.</p>
                    
                    <button id="trigger-checkout-btn" class="block w-full bg-gold text-void py-4 font-bold text-xs tracking-widest uppercase hover:bg-marble transition-all mb-4 shadow-[0_0_15px_rgba(255,215,0,0.2)]">
                        Secure Architecture Now
                    </button>

                    <button id="trigger-valve-btn" class="block w-full text-[10px] text-marble/40 tracking-widest uppercase hover:text-marble transition-all">
                        > Have questions regarding your specific exposure? Request direct contact.
                    </button>
                </div>

                <div class="bg-[#050505] border border-white/5 p-8 mt-6">
                    <h4 class="font-serif text-xl text-gold mb-2 italic">Architecture Manifest</h4>
                    <p class="text-[10px] text-marble/40 mb-6">The documents required to neutralize the active threats.</p>
                    <div class="space-y-4">
                        ${manifestHTML}
                    </div>
                </div>

            </div>
        </div>
    </div>
    
    <div id="hesitation-modal" class="hidden fixed inset-0 bg-[#000000]/90 z-50 flex items-center justify-center p-4">
        <div class="bg-[#050505] border border-gold/30 p-8 max-w-md w-full text-center shadow-[0_0_50px_rgba(255,215,0,0.05)]">
            <h4 class="font-serif text-2xl text-gold mb-4">Request Direct Contact</h4>
            <p class="text-xs text-marble/70 leading-relaxed mb-4 text-left">
                Lex Nova maintains a strictly capped active client roster to protect the precision of our forensic drafting. Because of this, we do not maintain public sales calendars.
            </p>
            <p class="text-xs text-marble/70 leading-relaxed mb-8 text-left">
                However, we understand an exposure profile of this magnitude requires careful consideration. By confirming below, your matrix will be flagged for priority review. A Lex Nova partner will evaluate your specific architecture and contact you directly via email today to address your questions and coordinate a private consultation.
            </p>
            <button id="confirm-valve-btn" class="block w-full bg-transparent border border-gold text-gold py-3 font-bold text-xs tracking-widest uppercase hover:bg-gold hover:text-void transition-all mb-3">
                Flag Matrix For Review
            </button>
            <button onclick="document.getElementById('hesitation-modal').classList.add('hidden')" class="block w-full text-[10px] text-marble/50 tracking-widest uppercase hover:text-marble transition-all mt-4">
                Cancel
            </button>
        </div>
    </div>`;

// ============================================================================
// 8. TELEMETRY & EVENT WIRING
// ============================================================================

    // 1. THE MONEY
    document.getElementById('trigger-checkout-btn').addEventListener('click', async () => {
        const pid = getActiveProspectId();
        const planKey = finalReport.prescription;
        await Telemetry.logState('checkout_initiated');
        window.location.href = `./engagement.html?pid=${pid}&plan=${planKey}`;
    });

    // 2. THE HESITATION VALVE
    document.getElementById('trigger-valve-btn').addEventListener('click', () => {
        document.getElementById('hesitation-modal').classList.remove('hidden');
    });

    // 3. THE ASYNC OUT
    document.getElementById('confirm-valve-btn').addEventListener('click', async (e) => {
        const btn = e.target;
        btn.innerText = "REQUEST SENT.";
        btn.classList.replace('text-gold', 'text-void');
        btn.classList.replace('bg-transparent', 'bg-gold');
        
        const pid = getActiveProspectId();
        await Telemetry.logState('negotiation_requested');
        
        fetch(HESITATION_WEBHOOK, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                event: "HESITATION_VALVE_TRIGGERED", prospectId: pid,
                email: prospectData?.email || "Unknown", company: prospectData?.company || "Unknown",
                calculatedExposure: finalReport.financials.totalExposure, timestamp: new Date().toISOString()
            })
        }).catch(() => {});
        
        // Dismiss the modal gracefully
        setTimeout(() => {
            document.getElementById('hesitation-modal').classList.add('hidden');
            btn.innerText = "Flag Matrix For Review";
            btn.classList.replace('text-void', 'text-gold');
            btn.classList.replace('bg-gold', 'bg-transparent');
        }, 2000);
    });

    console.log("> EXHIBITION: Render Complete. Stripping CSS Cloak & Forcing Scroll.");
    container.classList.remove('hidden-state', 'hidden');
    container.style.display = 'block';
    container.style.opacity = '1';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
