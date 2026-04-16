/**
 * LEX NOVA HQ — FORENSIC ENGINE v6.0
 * /ui/dashboard-renderer.js - The Exhibition
 * * THE SUPREME COMMAND: This module solely handles the rendering of the final 
 * $72.5M dashboard, the Itemized Receipt, the Threat Matrix, and the Checkouts.
 */

// ============================================================================
// 1. STATE & CONSTANTS
// ============================================================================
const DOM_ID = 'state-dashboard';
const CURRENCY = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

const PLAN_DATA = {
    "agentic_shield": { name: "The Agentic Shield", price: 1500, delivery: "48 hours from Vault activation" },
    "workplace_shield": { name: "The Workplace Shield", price: 1500, delivery: "48 hours from Vault activation" },
    "complete_stack": { name: "The Complete Stack", price: 2500, delivery: "72 hours from Vault activation" }
};

// ============================================================================
// 2. HELPER FUNCTIONS (Formatting & Styling)
// ============================================================================
function formatBadge(tier) {
    if (tier === 'T1') return '<span class="px-2 py-1 text-[9px] font-bold bg-danger/10 text-danger border border-danger/20 tracking-widest">T1 - EXTINCTION</span>';
    if (tier === 'T2') return '<span class="px-2 py-1 text-[9px] font-bold bg-orange-500/10 text-orange-500 border border-orange-500/20 tracking-widest">T2 - UNCAPPED</span>';
    if (tier === 'T3') return '<span class="px-2 py-1 text-[9px] font-bold bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 tracking-widest">T3 - DEAL DEATH</span>';
    return `<span class="px-2 py-1 text-[9px] font-bold bg-marble/10 text-marble/70 border border-marble/20 tracking-widest">${tier}</span>`;
}

// ============================================================================
// 3. THE HOSTAGE RULE (Sorting & Allocation)
// ============================================================================
function applyHostageRule(sortedThreats) {
    let lethal = [];
    let friction = [];

    // 1. Separate the threats
    sortedThreats.forEach(t => {
        if (t.calculatedSeverity === 'T1' || t.calculatedSeverity === 'T2') lethal.push(t);
        else friction.push(t);
    });

    // 2. The Allocation Math
    const CLEAR_LETHAL_LIMIT = 2; // Show max 2 lethal threats clearly to induce panic
    const CLEAR_FRICTION_LIMIT = 3; // Show max 3 minor threats to prove competence

    const clearGaps = [];
    const blurredGaps = []; // The Hostages
    const lockedGaps = [];  // The Iceberg

    // Process Lethal
    lethal.forEach((t, i) => {
        if (i < CLEAR_LETHAL_LIMIT) clearGaps.push(t);
        else blurredGaps.push(t); // Blur the rest of the lethal ones
    });

    // Process Friction
    friction.forEach((t, i) => {
        if (i < CLEAR_FRICTION_LIMIT) clearGaps.push(t);
        else lockedGaps.push(t); // Hide the rest in the iceberg box
    });

    // We need to flag the blurred ones so the Receipt knows to redact them
    const hostageIds = blurredGaps.map(t => t.threatId).concat(lockedGaps.map(t => t.threatId));

    return { clearGaps, blurredGaps, lockedGaps, hostageIds };
}

// ============================================================================
// 4. COMPONENT RENDERERS
// ============================================================================

function buildHeader(prospectData) {
    const compName = prospectData?.company || "Your Company";
    const founderName = prospectData?.founderName || prospectData?.name || "Founder";
    const jurisdiction = prospectData?.jurisdiction || "Global Market";

    return `
    <div class="mb-12 text-center lg:text-left">
        <h1 class="font-serif text-4xl md:text-5xl text-marble mb-2">Forensic Exposure Audit</h1>
        <p class="font-serif text-xl md:text-2xl text-gold italic mb-2">${compName}</p>
        <p class="font-sans text-xs text-marble/50 uppercase tracking-widest">
            Prepared for <span class="text-marble/80 font-bold">${founderName}</span> · ${jurisdiction}
        </p>
    </div>`;
}

function buildIndictmentsAndGhosts(prospectData) {
    if (!prospectData) return '';

    let html = `<div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">`;

    // The Ghost Protection (Dismantling their alibi)
    if (prospectData.posture_alibi) {
        html += `
        <div class="bg-[#050505] border border-white/5 p-6">
            <p class="text-[9px] tracking-widest text-gold uppercase font-bold mb-3">⊘ INVALID DEFENSE POSTURE</p>
            <p class="text-[11px] text-marble/50 italic mb-2">"But we have ${prospectData.posture_alibi.evidence?.[0]?.what_it_proves || 'an enterprise MSA'}..."</p>
            <p class="text-xs text-danger font-mono leading-relaxed border-l-2 border-danger pl-3">${prospectData.posture_alibi.argument}</p>
        </div>`;
    }

    // The Self-Indictment (Weaponizing their copy)
    if (prospectData.self_indictments && prospectData.self_indictments.length > 0) {
        const ind = prospectData.self_indictments[0];
        html += `
        <div class="bg-[#050505] border border-white/5 p-6">
            <p class="text-[9px] tracking-widest text-gold uppercase font-bold mb-3">⚠ PUBLIC CONTRADICTION</p>
            <p class="text-[11px] text-marble/50 italic mb-2">Your marketing claims: "${ind.quote}"</p>
            <p class="text-xs text-orange-500 font-mono leading-relaxed border-l-2 border-orange-500 pl-3">LEGAL REALITY: ${ind.contradicts}</p>
        </div>`;
    }

    html += `</div>`;
    return html;
}

function buildItemizedReceipt(financials, hostageIds) {
    let rowsHTML = '';

    financials.receiptLines.forEach(line => {
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
        <button onclick="document.getElementById('receipt-table').classList.toggle('hidden');" class="text-[9px] text-gold tracking-widest uppercase font-bold hover:text-marble transition-colors mb-4">
            ▸ View Actuarial Calculation Basis
        </button>
        <div id="receipt-table" class="hidden overflow-x-auto bg-[#080808] border border-shadow p-4">
            <table class="w-full text-left">
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

function buildThreatMatrix(hostageData) {
    let matrixRows = '';

    // 1. Render Clear Rows
    hostageData.clearGaps.forEach(g => {
        matrixRows += `
        <tr class="border-b border-white/5 bg-[#050505]">
            <td class="p-4 align-top w-[25%]"><span class="font-bold text-marble text-xs block mb-2">${g.threatName || g.name}</span>${formatBadge(g.calculatedSeverity)}</td>
            <td class="p-4 align-top w-[25%]"><span class="text-marble/70 text-[11px] leading-relaxed block mb-1 font-bold">${g.copywriting?.mechanism || 'Architecture gap detected.'}</span><span class="text-marble/40 text-[10px]">${g.copywriting?.trigger || 'Triggered on scale.'}</span></td>
            <td class="p-4 align-top w-[30%]"><span class="text-danger text-[11px] leading-relaxed block">${g.copywriting?.impact || g.thePain || 'Liability exposure without ceiling.'}</span></td>
            <td class="p-4 align-top w-[20%]"><span class="text-gold font-bold text-[10px] block mb-1">${g.copywriting?.fix || 'Lex Nova Module Required'}</span></td>
        </tr>`;
    });

    // 2. Render Blurred Hostage Rows (TUMOR MASKING)
    hostageData.blurredGaps.forEach(g => {
        matrixRows += `
        <tr class="border-b border-white/5 bg-[#080808]">
            <td class="p-4 align-top w-[25%]"><span class="font-bold text-marble text-xs block mb-2" style="filter:blur(4px);user-select:none">Classified Architecture Threat</span>${formatBadge(g.calculatedSeverity)}</td>
            <td class="p-4 align-top w-[25%]"><span class="text-marble/70 text-[11px] leading-relaxed block mb-1" style="filter:blur(4px);user-select:none">Detailed mechanism redacted. Available upon engagement.</span></td>
            <td class="p-4 align-top w-[30%]"><span class="text-danger text-[11px] leading-relaxed block" style="filter:blur(4px);user-select:none">Severe downstream business consequence redacted.</span></td>
            <td class="p-4 align-top w-[20%]"><span class="text-gold font-bold text-[10px] block mb-1" style="filter:blur(4px);user-select:none">Module Required</span></td>
        </tr>`;
    });

    // 3. The Iceberg Box
    const lockedCount = hostageData.lockedGaps.length;
    const icebergHTML = lockedCount > 0 ? `
    <div class="bg-[#0a0a0a] border border-dashed border-danger/30 p-6 text-center mt-4">
        <p class="text-[11px] tracking-widest text-danger uppercase mb-2 font-bold">🔒 [ ${lockedCount} ] ADDITIONAL THREAT VECTORS CLASSIFIED</p>
        <p class="text-[10px] text-marble/40 max-w-sm mx-auto">Combined forensic audit revealed ${lockedCount} further structural gaps across your architecture. Full gap matrix unlocked upon engagement.</p>
    </div>` : '';

    return `
    <div class="mb-10 overflow-x-auto">
        <table class="w-full text-left font-sans text-[11px] border-collapse min-w-[800px]">
            <thead>
                <tr class="text-[9px] text-gold/60 uppercase tracking-widest border-b border-white/10">
                    <th class="p-4">The Threat</th>
                    <th class="p-4">Structural Absence & Trigger</th>
                    <th class="p-4">Business Stakes</th>
                    <th class="p-4">Lex Nova Fix</th>
                </tr>
            </thead>
            <tbody>${matrixRows}</tbody>
        </table>
        ${icebergHTML}
    </div>`;
}

// ============================================================================
// 5. MASTER RENDER EXECUTION
// ============================================================================

export function renderDashboard(finalReport, prospectData) {
    console.log("> EXHIBITION: Building final $72.5M canvas...");

    const container = document.getElementById(DOM_ID);
    if (!container) return;

    // 1. Process Data
    const hostageData = applyHostageRule(finalReport.sortedThreats);
    const plan = PLAN_DATA[finalReport.prescription];
    
    // 2. Escalators
    let flagsHTML = '';
    if (finalReport.financials.hasPersonalLiability) {
        flagsHTML += `<p class="bg-danger text-void px-3 py-1 text-[10px] font-bold tracking-widest uppercase inline-block mb-3 animate-pulse">⚠ PIERCED CORPORATE VEIL DETECTED</p> `;
    }
    if (finalReport.financials.hasCriminalLiability) {
        flagsHTML += `<p class="bg-red-800 text-white px-3 py-1 text-[10px] font-bold tracking-widest uppercase inline-block mb-3 animate-pulse">⚠ CRIMINAL EXPOSURE DETECTED</p>`;
    }

    // 3. Build Layout
    container.innerHTML = `
    <div class="max-w-6xl mx-auto">
        ${buildHeader(prospectData)}
        ${buildIndictmentsAndGhosts(prospectData)}

        <div class="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-10 items-start">
            
            <div>
                <h3 class="font-serif text-2xl text-gold mb-6 italic">Threat Matrix & Evidence</h3>
                ${buildThreatMatrix(hostageData)}
            </div>

            <div class="lg:sticky lg:top-8 space-y-6">
                
                <div class="bg-danger/10 border border-danger/30 p-8 text-center shadow-[0_0_40px_rgba(220,38,38,0.1)]">
                    ${flagsHTML}
                    <p class="text-[9px] tracking-[0.2em] text-danger uppercase font-bold mb-2">Maximum Concurrent Exposure</p>
                    <div class="font-serif text-5xl text-marble mb-2">${CURRENCY.format(finalReport.financials.totalExposure)}</div>
                    <p class="text-[9px] text-marble/40 uppercase tracking-widest mt-3">Calculated via Lex Nova Actuarial Engine v6.0</p>
                    ${buildItemizedReceipt(finalReport.financials, hostageData.hostageIds)}
                </div>

                <div class="bg-[#080808] border border-shadow p-8 text-center">
                    <p class="text-[9px] tracking-[0.2em] text-marble opacity-50 uppercase font-bold mb-6">Required Fix: ${plan.name}</p>
                    <div class="flex items-center justify-center gap-4 mb-6">
                        <span class="text-gold text-5xl font-serif">${CURRENCY.format(plan.price)}</span>
                    </div>
                    <p class="font-sans text-xs text-marble opacity-60 leading-relaxed mb-6">${plan.delivery}. No discovery calls. Vault activation immediately upon payment.</p>
                    
                    <button id="trigger-checkout-btn" class="block w-full bg-gold text-void py-4 font-bold text-xs tracking-widest uppercase hover:bg-marble transition-all mb-4 shadow-[0_0_15px_rgba(255,215,0,0.2)]">
                        Secure Architecture
                    </button>

                    <button id="trigger-valve-btn" class="block w-full text-[10px] text-marble/40 tracking-widest uppercase hover:text-marble transition-all">
                        > Have questions regarding your specific exposure? Request direct contact.
                    </button>
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

    // 4. Wire Event Listeners
    document.getElementById('trigger-checkout-btn').addEventListener('click', () => {
        // Assume integration with Stripe/Checkout logic here (Module 11)
        console.log("> CHECKOUT INITIATED");
    });

    document.getElementById('trigger-valve-btn').addEventListener('click', () => {
        document.getElementById('hesitation-modal').classList.remove('hidden');
    });

    document.getElementById('confirm-valve-btn').addEventListener('click', (e) => {
        e.target.innerText = "REQUEST SENT.";
        e.target.classList.replace('text-gold', 'text-void');
        e.target.classList.replace('bg-transparent', 'bg-gold');
        
        console.warn(`> 🚨 ASYNC OUT TRIGGERED: Emailing Partners for ${prospectData?.email || 'Prospect'}`);
        // Insert Make.com webhook fetch here
        
        setTimeout(() => {
            document.getElementById('hesitation-modal').classList.add('hidden');
            e.target.innerText = "Flag Matrix For Review";
            e.target.classList.replace('text-void', 'text-gold');
            e.target.classList.replace('bg-gold', 'bg-transparent');
        }, 2000);
    });
}
