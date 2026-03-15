/**
 * LEX NOVA HQ — CLIENT PORTAL (dashboard.js) — FULL FINAL VERSION
 * Architecture: 3 States × 5 Tabs | Date Delta Engine | Dual-Intel Radar
 *
 * PATCH LOG:
 *   v2 — Tab 1 State 1: Full report visible (no blur/lock). Post-payment client sees everything.
 *   v2 — Tab 1 State 1: All gaps shown, Hunter evidence blocks rendered for all gaps with evidence.
 *   v2 — CTA copy updated to reflect full visibility.
 */

import { onAuthStateChanged }              from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { doc, getDoc, setDoc, updateDoc }  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ── 01. CONSTANTS ──────────────────────────────────────────────────────
const PAYPAL = {
    agentic_shield:   "https://www.paypal.com/ncp/payment/WNH78KQCXDBL6",
    workplace_shield: "https://www.paypal.com/ncp/payment/7DUHPJJ4XVUVJ",
    complete_stack:   "https://www.paypal.com/ncp/payment/X3PJ47FEDUSPW",
    maintenance:      "https://www.paypal.com/webapps/billing/plans/subscribe?plan_id=P-3UN560448N490122YNGTN7PY",
    workplace_upsell: "https://www.paypal.com/ncp/payment/7DUHPJJ4XVUVJ",
    agentic_upsell:   "https://www.paypal.com/ncp/payment/WNH78KQCXDBL6"
};

const PLAN_NAMES = {
    agentic_shield:   "The Agentic Shield",
    workplace_shield: "The Workplace Shield",
    complete_stack:   "The Complete Stack",
    flagship:         "The Flagship"
};

const DOC_MANIFEST = {
    agentic_shield: [
        { id:"DOC_TOS",   name:"AI Terms of Service",        shields:["Hallucination Waiver","HITL Mandate","Liability Cap","Service Classification"] },
        { id:"DOC_PP",    name:"Privacy Policy",             shields:["Data Minimization","GDPR Art.13 Notice","Cookie Policy","Pixel Disclosure"] },
        { id:"DOC_AUP",   name:"Acceptable Use Policy",      shields:["Injection Ban","Deepfake Prohibition","Voice Cloning Ban","Watermark Mandate"] },
        { id:"DOC_DPA",   name:"Data Processing Agreement",  shields:["RAG-Only Mandate","Machine Unlearning","SCC Incorporation","Sub-Processor Cap"] },
        { id:"DOC_AGT",   name:"Agentic Addendum",           shields:["Circuit Breaker","Kill Switch","UETA §14 Authority","Idempotency Key"],   condition: d => !!d.action_scopes?.is_doer },
        { id:"DOC_SLA",   name:"AI Service Level Agreement", shields:["TTFT Standard","Maintenance Window","Uptime Math","Credit Remedy"],        condition: d => d.commercials?.uptime !== "none" || d.commercials?.ttft !== "none" },
        { id:"DOC_PBK_A", name:"Negotiation Playbook A",     shields:["Super Cap Script","Fallback Logic","Objection Handlers","Walk-Away Lines"] }
    ],
    workplace_shield: [
        { id:"DOC_SCAN",  name:"Shadow AI Scanner",          shields:["Anonymous Survey","Risk Discovery","Tool Classification","Threat Mapping"] },
        { id:"DOC_HND",   name:"AI Employee Handbook",       shields:["Traffic Light Policy","Data Paste Ban","Tool Whitelist","Incident Reporting"] },
        { id:"DOC_IP",    name:"IP Assignment Deed",         shields:["Prompt Ownership","Output Assignment","Moral Rights Waiver","Generation Attribution"] },
        { id:"DOC_SOP",   name:"HITL Protocol",              shields:["Human Layer Mandate","Authorship Standard","Review Threshold","Approval Chain"] },
        { id:"DOC_DPIA",  name:"Impact Assessment",          shields:["High-Risk Filter","EU AI Act Mapping","Scoring Matrix","Remediation Roadmap"] },
        { id:"DOC_PBK_B", name:"Operations Playbook B",      shields:["Team Rollout Script","Manager Briefing","Exception Handling","Audit Protocol"] }
    ]
};

// ── 02. GLOBAL STATE ───────────────────────────────────────────────────
window.clientData  = null;
window.portalState = null;
let radarCache     = [];

// ── 03. HELPERS ────────────────────────────────────────────────────────
const esc = s => s ? String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;") : "";
const $   = id => document.getElementById(id);
const fmtDate = ts => {
    if (!ts) return "—";
    const d = new Date(ts);
    return isNaN(d) ? "—" : d.toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"});
};

function getDocsForPlan(data) {
    const plan = data.plan;
    let docs = [];
    if (["agentic_shield","complete_stack","flagship"].includes(plan))
        docs.push(...DOC_MANIFEST.agentic_shield.filter(d => !d.condition || d.condition(data)));
    if (["workplace_shield","complete_stack","flagship"].includes(plan))
        docs.push(...DOC_MANIFEST.workplace_shield);
    return docs;
}

function getUpsellLane(data) {
    if (data.plan === "agentic_shield")
        return { label:"Workplace Shield", docs:DOC_MANIFEST.workplace_shield, price:997, paypal:PAYPAL.workplace_upsell };
    if (data.plan === "workplace_shield")
        return { label:"Agentic Shield", docs:DOC_MANIFEST.agentic_shield.filter(d => !d.condition), price:997, paypal:PAYPAL.agentic_upsell };
    return null;
}

// ── 04. AUTH STATE OBSERVER ────────────────────────────────────────────
onAuthStateChanged(window.firebaseAuth, async (user) => {
    const loginScreen  = $("screen-login");
    const portalScreen = $("screen-portal");
    const navControls  = $("nav-controls");
    const navRef       = $("nav-ref");

    if (!user) {
        if (navControls)  navControls.classList.add("hidden");
        if (portalScreen) portalScreen.classList.add("hidden");
        if (loginScreen)  { loginScreen.classList.remove("hidden"); loginScreen.classList.add("fade-in"); }
        return;
    }

    if (navControls) navControls.classList.remove("hidden");
    if (navRef)      navRef.textContent = user.email;
    if (loginScreen) loginScreen.classList.add("hidden");
    if (portalScreen){ portalScreen.classList.remove("hidden"); portalScreen.classList.add("fade-in"); }

    try {
        const ref  = doc(window.firebaseDb, "clients", user.email);
        const snap = await getDoc(ref);
        if (snap.exists() && snap.data().status && snap.data().status !== "pending") {
            window.clientData = { id: user.email, ...snap.data() };
            updateDoc(ref, { lastLogin: new Date().toISOString() }).catch(() => {});
        } else {
            window.clientData = { id: user.email, email: user.email, status: "paid", ...(snap.exists() ? snap.data() : {}) };
            setDoc(ref, { email: user.email, status: "paid", createdAt: new Date().toISOString() }, { merge: true }).catch(() => {});
        }
        routeToState(window.clientData);
    } catch(e) { console.error("Auth Router Error:", e); }
});

// ── 05. STATE ROUTER ───────────────────────────────────────────────────
function routeToState(data) {
    const s = data.status;
    if (s === "delivered") {
        window.portalState = 3;
    } else if (["intake_received","under_review","in_production"].includes(s)) {
        window.portalState = 2;
    } else {
        window.portalState = 1;
    }
    buildPortal(data, window.portalState);
}

// ── 06. PORTAL ORCHESTRATOR ────────────────────────────────────────────
function buildPortal(data, state) {
    const nm = $("dash-client-name");
    const pl = $("dash-plan-name");
    const mb = $("maintenance-badge");
    if (nm) nm.textContent = data.baseline?.company || data.company || data.founderName || "Founder";
    if (pl) pl.textContent = PLAN_NAMES[data.plan] || data.plan || "Legal Architecture Kit";
    if (mb && data.maintenanceActive) mb.classList.remove("hidden");

    const lvl = { paid:1, payment_received:1, intake_received:2, under_review:2, in_production:3, delivered:4 }[data.status] || 1;
    for (let i = 2; i <= 4; i++) {
        if (lvl >= i) {
            const nd = $(`node-${i}`); const lb = $(`label-${i}`);
            if (nd) nd.classList.replace("bg-shadow","bg-gold");
            if (lb) lb.classList.replace("opacity-30","text-gold");
        }
    }
    const fill = $("status-bar-fill");
    if (fill) fill.style.width = lvl >= 4 ? "100%" : ((lvl - 1) * 33.33) + "%";

    buildGlobalBanner(data, state);
    buildTabAccessRules(state);
    buildTab1Radar(data, state);
    buildTab2Vault(data, state);
    buildTab3Shields(data, state);
    buildTab4Checklist(data, state);
    buildTab5Syndicate(data);

    if (state === 3 && !data.debrief) {
        const modal = $("modal-debrief");
        if (modal) { modal.classList.remove("hidden"); document.body.style.overflow = "hidden"; }
    }

    activateTab("radar");
}

// ── 07. GLOBAL BANNER ─────────────────────────────────────────────────
function buildGlobalBanner(data, state) {
    const el   = $("global-banner");
    const text = $("global-banner-text");
    if (!el || !text) return;

    if (state === 1) {
        el.className = "w-full px-6 py-3 border-b flex items-center justify-center gap-3 bg-yellow-900/20 border-yellow-700/40";
        text.innerHTML = `<span class="text-[10px] tracking-[0.15em] uppercase font-bold text-yellow-400">SLA PAUSED</span>
            <span class="text-[10px] text-marble opacity-60">Your 72-hour delivery clock is paused. Submit your Vault to begin production.</span>`;
    } else if (state === 2) {
        const startTs  = data.submittedAt || data.intakeReceivedAt;
        const etaText  = startTs
            ? "Estimated Delivery: " + fmtDate(new Date(new Date(startTs).getTime() + 48 * 3600000).toISOString())
            : "ETA: 48 hours from Vault submission";
        el.className = "w-full px-6 py-3 border-b flex items-center justify-center gap-3 bg-gold/5 border-gold/30";
        text.innerHTML = `<span class="text-[10px] tracking-[0.15em] uppercase font-bold text-gold">SLA ACTIVE</span>
            <span class="text-[10px] text-marble opacity-60">Vault received. Documents in production. ${etaText}.</span>`;
    } else {
        el.className = "w-full px-6 py-3 border-b flex items-center justify-center gap-3 bg-safe/5 border-safe/30";
        text.innerHTML = `<span class="text-[10px] tracking-[0.15em] uppercase font-bold text-safe">ARCHITECTURE SHIELDED</span>
            <span class="text-[10px] text-marble opacity-60">Core kit delivered. ${data.maintenanceActive ? "Liability Maintenance Active." : ""}</span>`;
    }
}

// ── 08. TAB ACCESS — VELVET ROPE ──────────────────────────────────────
function buildTabAccessRules(state) {
    const locks = { shields: state < 2, checklist: state < 3 };
    ["radar","vault","shields","checklist","syndicate"].forEach(tab => {
        const btn = $(`tab-btn-${tab}`);
        if (!btn) return;
        btn.onclick = locks[tab]
            ? () => showPortalToast(tab)
            : () => activateTab(tab);
    });
}

function showPortalToast(tab) {
    const msgs = {
        shields:   "Submit your Vault to unlock your document architecture.",
        checklist: "Your documents must be delivered before engineering handoffs unlock."
    };
    const t = $("portal-toast");
    if (!t) return;
    t.textContent = msgs[tab] || "Complete the current phase to unlock.";
    t.classList.add("opacity-100");
    setTimeout(() => t.classList.remove("opacity-100"), 3000);
}

function activateTab(tabId) {
    ["radar","vault","shields","checklist","syndicate"].forEach(t => {
        const tab = $(`tab-${t}`); const btn = $(`tab-btn-${t}`);
        if (tab) { tab.classList.add("hidden"); tab.classList.remove("fade-in"); }
        if (btn) { btn.classList.remove("tab-active","text-gold"); btn.classList.add("opacity-50"); }
    });
    const at = $(`tab-${tabId}`); const ab = $(`tab-btn-${tabId}`);
    if (at) { at.classList.remove("hidden"); void at.offsetWidth; at.classList.add("fade-in"); }
    if (ab) { ab.classList.add("tab-active"); ab.classList.remove("opacity-50"); }
}
window.activateTab = activateTab;

// ════════════════════════════════════════════════════════════════════════
// ═════════ TAB 1: THE RADAR ══════════════════════════════════════════════
// ════════════════════════════════════════════════════════════════════════
async function buildTab1Radar(data, state) {
    const el = $("tab-radar");
    if (!el) return;
    if      (state === 1) renderRadarState1(el, data);
    else if (state === 2) renderRadarState2(el, data);
    else                  await renderRadarState3(el, data);
}

// ── STATE 1: Full Forensic Pre-Brief (no blur, no locks) ───────────────
function renderRadarState1(el, data) {

    // ── Dual-intel merge ──────────────────────────────────────────────
    let gaps = [];

    // Start with scanner gaps
    (data.activeGaps || []).forEach(g => {
        if (!gaps.find(x => x.id === g.id)) {
            gaps.push({ ...g, source: g.source || "scanner" });
        }
    });

    // Merge Hunter forensicGaps
    (data.forensicGaps || []).forEach(g => {
        const ex = gaps.find(x => x.id === g.id);
        if (!ex) {
            gaps.push({ ...g, source: "scrape" });
        } else {
            ex.source = "dual-verified";
            if (g.evidence) ex.evidence = g.evidence;
            // Escalate severity if Hunter rated it higher
            const w = { NUCLEAR:3, CRITICAL:2, HIGH:1 };
            if ((w[g.severity]||0) > (w[ex.severity]||0)) ex.severity = g.severity;
        }
    });

    // Sort: severity DESC, then evidence-bearing gaps first within same severity
    const sevW = { NUCLEAR:3, CRITICAL:2, HIGH:1 };
    const srcW = g => g.source === "dual-verified" ? 3 : (g.source === "scrape" || g.evidence ? 2 : 0);
    gaps.sort((a, b) => {
        const sd = (sevW[b.severity]||0) - (sevW[a.severity]||0);
        return sd !== 0 ? sd : srcW(b) - srcW(a);
    });

    // ── Stats ─────────────────────────────────────────────────────────
    const archetype    = data.internalCategory || (data.intArchetypes||[])[0] || "—";
    const laneTags     = data.lanes || [];
    const lane         = laneTags.includes("commercial") && laneTags.includes("operational") ? "Complete Stack" :
                         laneTags.includes("commercial") ? "Lane A — Commercial" :
                         laneTags.includes("operational") ? "Lane B — Operational" : "—";
    const extExposures = data.extExposures || Array.from(data.trippedSurfaces || []);
    const countN       = gaps.filter(g => g.severity === "NUCLEAR").length;
    const countC       = gaps.filter(g => g.severity === "CRITICAL").length;
    const countH       = gaps.filter(g => g.severity === "HIGH").length;

    // ── Severity colour helpers ────────────────────────────────────────
    const sColor = s => s === "NUCLEAR" ? "#ef4444" : s === "CRITICAL" ? "#f97316" : "#eab308";

    // ── Source badge ──────────────────────────────────────────────────
    const srcBadge = g => {
        if (g.source === "dual-verified")
            return `<span style="font-size:9px;color:#ef4444;font-weight:700;text-transform:uppercase;letter-spacing:.08em;"><span style="opacity:.5">SOURCE:</span> PUBLIC + INTERNAL</span>`;
        if (g.source === "scrape" || g.evidence)
            return `<span style="font-size:9px;color:#60a5fa;font-weight:700;text-transform:uppercase;letter-spacing:.08em;"><span style="opacity:.5">SOURCE:</span> PUBLIC URL SCRAPE</span>`;
        return `<span style="font-size:9px;color:#C5A059;font-weight:700;text-transform:uppercase;letter-spacing:.08em;"><span style="opacity:.5">SOURCE:</span> INTERNAL AUDIT</span>`;
    };

    // ── Evidence block ────────────────────────────────────────────────
    const evBlock = g => {
        if (!g.evidence || (!g.evidence.source && !g.evidence.reason)) return "";
        return `
        <div style="margin-top:10px;padding:8px 10px;background:#050505;border:1px solid rgba(255,255,255,.08);font-family:monospace;font-size:10px;line-height:1.6;color:rgba(234,232,227,.6);">
            ${g.evidence.source ? `<div><span style="color:#C5A059;font-weight:700;">&gt; LOCATION:</span> ${esc(g.evidence.source)}</div>` : ""}
            ${g.evidence.reason ? `<div style="margin-top:4px;"><span style="color:#ef4444;font-weight:700;">&gt; VIOLATION:</span> ${esc(g.evidence.reason)}</div>` : ""}
        </div>`;
    };

    // ── Full gap card — NO BLUR, NO LOCKS ─────────────────────────────
    const gapCard = g => `
    <div style="background:#080808;border:1px solid #252525;border-left:3px solid ${sColor(g.severity)};padding:16px;margin-bottom:10px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;gap:10px;flex-wrap:wrap;">
            <div>
                <div style="font-size:13px;font-weight:700;color:#EAE8E3;margin-bottom:4px;">${esc(g.trap)}</div>
                ${srcBadge(g)}
            </div>
            <span style="padding:2px 8px;border:1px solid ${sColor(g.severity)};color:${sColor(g.severity)};font-size:9px;font-weight:800;white-space:nowrap;">${g.severity}</span>
        </div>
        <div style="font-size:11px;color:rgba(234,232,227,.65);line-height:1.5;margin-bottom:4px;">${esc(g.plain)}</div>
        ${evBlock(g)}
        <div style="display:flex;gap:16px;margin-top:10px;font-size:10px;color:rgba(234,232,227,.4);flex-wrap:wrap;">
            <span>Vector: <strong style="color:${sColor(g.severity)}">${esc(g.ext||"—")}</strong></span>
            <span>Fix: <strong style="color:#C5A059">${esc(g.doc||"—")}</strong></span>
            <span>Velocity: <strong style="color:rgba(234,232,227,.7)">${esc(g.velocity||"—")}</strong></span>
        </div>
    </div>`;

    el.innerHTML = `<div class="fade-in" style="padding-bottom:40px;">

        <div style="margin-bottom:24px;">
            <h2 style="font-family:'Cormorant Garamond',serif;font-size:28px;color:#EAE8E3;margin-bottom:6px;">Your Forensic Pre-Brief</h2>
            <p style="font-size:11px;color:rgba(234,232,227,.5);letter-spacing:.1em;text-transform:uppercase;">Engine has mapped your full exposure surface. Submit your Vault to generate your bespoke architecture.</p>
        </div>

        <!-- Stats row -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:24px;">
            ${[
                ["AI Archetype",       archetype,                             "#C5A059"],
                ["Architecture Lane",  lane,                                  "#C5A059"],
                ["Nuclear",            countN + " Gaps",                      "#ef4444"],
                ["Critical",           countC + " Gaps",                      "#f97316"],
                ["High",               countH + " Gaps",                      "#eab308"],
                ["Regulatory Surfaces",extExposures.length + " Tripped",      "#EAE8E3"]
            ].map(([lbl,val,col]) => `
            <div style="background:#080808;border:1px solid #252525;padding:14px;">
                <div style="font-size:9px;color:rgba(234,232,227,.4);text-transform:uppercase;letter-spacing:.15em;margin-bottom:4px;">${lbl}</div>
                <div style="font-size:14px;color:${col};font-weight:600;">${esc(String(val))}</div>
            </div>`).join("")}
        </div>

        <!-- Dual-intel header -->
        <div style="background:rgba(197,160,89,.05);border:1px solid rgba(197,160,89,.2);padding:12px 16px;margin-bottom:16px;font-family:monospace;font-size:10px;color:rgba(234,232,227,.6);line-height:1.5;">
            <span style="color:#C5A059;font-weight:700;">&gt; DUAL-INTELLIGENCE PROTOCOL ACTIVE</span><br>
            &gt; Public URL scrape merged with internal audit confessions.<br>
            &gt; <span style="color:#EAE8E3;font-weight:700;">${gaps.length} TOTAL VULNERABILITIES DETECTED.</span>
        </div>

        <!-- Severity tally -->
        <div style="display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap;">
            <div style="background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.2);padding:4px 12px;"><span style="font-size:9px;color:#ef4444;font-weight:700;letter-spacing:.1em;">NUCLEAR: ${countN}</span></div>
            <div style="background:rgba(249,115,22,.1);border:1px solid rgba(249,115,22,.2);padding:4px 12px;"><span style="font-size:9px;color:#f97316;font-weight:700;letter-spacing:.1em;">CRITICAL: ${countC}</span></div>
            <div style="background:rgba(234,179,8,.1);border:1px solid rgba(234,179,8,.2);padding:4px 12px;"><span style="font-size:9px;color:#eab308;font-weight:700;letter-spacing:.1em;">HIGH: ${countH}</span></div>
        </div>

        <!-- All gap cards — full reveal -->
        ${gaps.length > 0
            ? gaps.map(gapCard).join("")
            : `<div style="font-size:11px;color:rgba(234,232,227,.4);padding:20px 0;">No pre-scan data available. Submit your Vault to initiate your forensic audit.</div>`
        }

        <!-- Vault CTA -->
        <div style="margin-top:28px;background:rgba(197,160,89,.06);border:1px solid rgba(197,160,89,.25);padding:20px;display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;">
            <div>
                <div style="font-size:13px;font-weight:700;color:#EAE8E3;margin-bottom:4px;">Ready to seal your architecture?</div>
                <div style="font-size:11px;color:rgba(234,232,227,.5);">Submit the Vault to lock your configuration and begin your 48-hour build.</div>
            </div>
            <button onclick="window.activateTab('vault')" style="background:#C5A059;color:#050505;padding:12px 24px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.15em;border:none;cursor:pointer;white-space:nowrap;">Open The Vault →</button>
        </div>

    </div>`;
}

// ── STATE 2: Production Heatmap (vault-based, reassurance) ─────────────
function renderRadarState2(el, data) {
    const b = data.baseline || {}, a = data.architecture || {}, scope = data.action_scopes || {};
    const threats = [];

    if (a.memory === "finetuning")   threats.push({ title:"Model Fine-Tuning Risk",       level:"CRITICAL", desc:"Algorithmic disgorgement risk (Rite Aid doctrine). DOC_DPA override clause restricts deletion requests to external vector store. Cannot delete embedded PII without model rebuild — mitigated via contractual indemnity limits." });
    if (scope.is_doer)               threats.push({ title:"Autonomous Agent Authority",   level:"CRITICAL", desc:`UETA §14 electronic agency liability activated. DOC_AGT circuit breaker hardcoded to ${scope.spend_limit||"declared session limits"}. Kill switch protocol injected. Rogue loop financial liability capped.` });
    if (a.sensitive_bio)             threats.push({ title:"Biometric Data Processing",    level:"CRITICAL", desc:"BIPA voiceprint capture liability active. Written consent requirements injected into DOC_PP and DOC_AUP. Diarization voiceprint exposure mitigated." });
    if (a.processes_pii)             threats.push({ title:"PII Processing Active",        level:"HIGH",     desc:"Personal data processing triggers GDPR/CCPA. DOC_DPA injected with RAG-Only mandate, machine unlearning rights, and sub-processor liability controls." });
    if (b.eu_users)                  threats.push({ title:"EU/UK Data Jurisdiction",      level:"HIGH",     desc:"GDPR and EU AI Act extraterritorial application. Standard Contractual Clauses (SCCs) injected into DOC_DPA for cross-border transfers." });
    if (scope.is_judge_hr || scope.is_judge_fin || scope.is_judge_legal)
                                     threats.push({ title:"High-Stakes Decisioning",      level:"HIGH",     desc:"Automated decision bias liability (Mobley doctrine). HITL mandate injected into DOC_TOS with mandatory human verification before output is actionable." });
    if (scope.is_companion)          threats.push({ title:"Conversational AI Companion",  level:"HIGH",     desc:"Emotional reliance liability (Gavalas doctrine). Crisis break clauses and reality grounding disclaimers injected into DOC_AUP and DOC_TOS." });
    if (scope.is_orchestrator)       threats.push({ title:"Multi-Agent Orchestration",    level:"HIGH",     desc:"Dynamic sub-processing liability chain. Vendor disclaimers and sub-processor indemnity controls injected into DOC_DPA." });
    if (a.sensitive_health)          threats.push({ title:"Health Data Processing",       level:"HIGH",     desc:"Potential HIPAA applicability flagged. DOC_DPA includes explicit health data provisions and controller/processor delineation." });
    if (threats.length === 0)        threats.push({ title:"Baseline SaaS Footprint",      level:"LOW",      desc:"Standard operational profile. Core legal architecture provides comprehensive coverage for your declared configuration." });

    const lc  = { CRITICAL:"#ef4444", HIGH:"#f97316", LOW:"#10b981" };
    const startTs = data.submittedAt || data.intakeReceivedAt;
    const eta = startTs ? fmtDate(new Date(new Date(startTs).getTime() + 48*3600000).toISOString()) : "within 48 hours";

    el.innerHTML = `<div class="fade-in" style="padding-bottom:40px;">
        <div style="background:rgba(197,160,89,.06);border:1px solid rgba(197,160,89,.3);padding:16px;display:flex;align-items:center;gap:12px;margin-bottom:24px;">
            <div style="width:10px;height:10px;border-radius:50%;background:#C5A059;animation:pulse 2s infinite;flex-shrink:0;"></div>
            <div>
                <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.15em;color:#C5A059;margin-bottom:2px;">PRODUCTION ACTIVE</div>
                <div style="font-size:11px;color:rgba(234,232,227,.6);">Architecture being drafted. Estimated delivery: ${eta}.</div>
            </div>
        </div>
        <div style="font-size:9px;color:rgba(234,232,227,.4);text-transform:uppercase;letter-spacing:.15em;margin-bottom:12px;">THREAT SURFACES BEING NEUTRALIZED BY YOUR KIT</div>
        ${threats.map(t => `
        <div style="background:#080808;border:1px solid #252525;border-left:3px solid ${lc[t.level]||"#C5A059"};padding:16px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;">
            <div style="flex:1;">
                <div style="font-size:13px;font-weight:700;color:#EAE8E3;margin-bottom:6px;">${esc(t.title)}</div>
                <div style="font-size:11px;color:rgba(234,232,227,.65);line-height:1.5;">${esc(t.desc)}</div>
            </div>
            <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex-shrink:0;">
                <span style="font-size:9px;font-weight:700;color:${lc[t.level]};border:1px solid ${lc[t.level]};padding:2px 8px;">${t.level}</span>
                <span style="font-size:9px;color:#10b981;font-weight:600;text-transform:uppercase;letter-spacing:.08em;">⚙ IN PRODUCTION</span>
            </div>
        </div>`).join("")}
    </div>`;
}

// ── STATE 3: Date Delta Engine ─────────────────────────────────────────
async function renderRadarState3(el, data) {
    el.innerHTML = `<div style="padding:40px;text-align:center;font-size:11px;color:rgba(234,232,227,.4);letter-spacing:.1em;">Loading Regulatory Intelligence...</div>`;
    try {
        if (radarCache.length === 0) {
            const snap = await getDoc(doc(window.firebaseDb, "settings", "regulatory_radar"));
            if (snap.exists()) radarCache = snap.data().entries || [];
        }
    } catch(e) { console.error("Radar fetch failed:", e); }

    const submittedAt = data.submittedAt ? new Date(data.submittedAt) : new Date();
    const today       = new Date();
    const matched     = radarCache.filter(entry => clientMatchesEntry(data, entry));

    const classified = matched.map(entry => {
        const eff = entry.effectiveDate ? new Date(entry.effectiveDate) : null;
        if (!eff || isNaN(eff)) return { ...entry, cls:"GREEN", badge:"Covered by your architecture." };
        if (eff <= submittedAt) {
            const days = Math.ceil((submittedAt - eff) / 86400000);
            return { ...entry, cls:"GREEN",  badge:`Shielded. Was active ${days} day${days!==1?"s":""} before your purchase.` };
        }
        if (eff > today) {
            const days = Math.ceil((eff - today) / 86400000);
            return { ...entry, cls:"YELLOW", badge:`Activating in ${days} day${days!==1?"s":""}.` };
        }
        const days = Math.ceil((eff - submittedAt) / 86400000);
        return { ...entry, cls:"RED", badge:`Active. Came into force ${days} day${days!==1?"s":""} after your purchase.` };
    });

    classified.sort((a,b) => ({ RED:0, YELLOW:1, GREEN:2 }[a.cls]||3) - ({ RED:0, YELLOW:1, GREEN:2 }[b.cls]||3));

    const greens  = classified.filter(c => c.cls==="GREEN");
    const yellows = classified.filter(c => c.cls==="YELLOW");
    const reds    = classified.filter(c => c.cls==="RED");
    const hasExposure = reds.length > 0 || yellows.length > 0;

    const clsCol = { GREEN:"#10b981", YELLOW:"#eab308", RED:"#ef4444" };
    const clsBg  = { GREEN:"rgba(16,185,129,.05)", YELLOW:"rgba(234,179,8,.05)", RED:"rgba(239,68,68,.05)" };
    const clsBrd = { GREEN:"rgba(16,185,129,.25)", YELLOW:"rgba(234,179,8,.25)", RED:"rgba(239,68,68,.3)" };
    const clsIcon= { GREEN:"✓", YELLOW:"⚡", RED:"🚨" };

    const renderCards = items => items.map(e => `
    <div style="background:${clsBg[e.cls]};border:1px solid ${clsBrd[e.cls]};border-left:3px solid ${clsCol[e.cls]};padding:14px;margin-bottom:8px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;">
            <div style="flex:1;">
                <div style="font-size:12px;font-weight:700;color:#EAE8E3;margin-bottom:4px;">${esc(e.title)}</div>
                <div style="font-size:10px;color:rgba(234,232,227,.5);margin-bottom:6px;">${esc(e.jurisdiction||"—")} · ${e.effectiveDate?"Effective: "+esc(e.effectiveDate):"No date set"}</div>
                ${e.description?`<div style="font-size:11px;color:rgba(234,232,227,.65);line-height:1.4;">${esc(e.description)}</div>`:""}
            </div>
            <div style="text-align:right;flex-shrink:0;">
                <div style="font-size:16px;color:${clsCol[e.cls]};margin-bottom:4px;">${clsIcon[e.cls]}</div>
                <div style="font-size:9px;font-weight:700;color:${clsCol[e.cls]};text-transform:uppercase;letter-spacing:.08em;white-space:nowrap;max-width:160px;">${esc(e.badge)}</div>
            </div>
        </div>
    </div>`).join("");

    const total  = classified.length;
    const covPct = total > 0 ? Math.round((greens.length / total) * 100) : 100;
    const covCol = covPct >= 80 ? "#10b981" : covPct >= 50 ? "#eab308" : "#ef4444";

    let upsellBlock = "";
    if (hasExposure) {
        upsellBlock = data.maintenanceActive
            ? `<div style="background:rgba(16,185,129,.08);border:1px solid rgba(16,185,129,.3);padding:16px;margin-bottom:24px;display:flex;align-items:center;gap:12px;">
                <span style="font-size:22px;">🛡️</span>
                <div>
                    <div style="font-size:11px;font-weight:700;color:#10b981;text-transform:uppercase;letter-spacing:.1em;margin-bottom:3px;">Liability Maintenance Active</div>
                    <div style="font-size:11px;color:rgba(234,232,227,.6);">Patch updates for the threat vectors below are in development and will deploy to your Vault automatically.</div>
                </div>
               </div>`
            : `<div style="background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.35);padding:20px;margin-bottom:24px;">
                <div style="display:flex;align-items:flex-start;gap:14px;flex-wrap:wrap;">
                    <span style="font-size:24px;margin-top:2px;">⚠️</span>
                    <div style="flex:1;">
                        <div style="font-size:12px;font-weight:700;color:#ef4444;text-transform:uppercase;letter-spacing:.1em;margin-bottom:6px;">Coverage Gap Detected</div>
                        <div style="font-size:11px;color:rgba(234,232,227,.7);line-height:1.5;margin-bottom:14px;">
                            ${reds.length>0?`${reds.length} regulation${reds.length>1?"s have":" has"} come into force since your purchase. `:""}
                            ${yellows.length>0?`${yellows.length} regulation${yellows.length>1?"s are":" is"} activating soon. `:""}
                            Liability Maintenance pushes patch updates directly to your Vault.
                        </div>
                        <a href="${PAYPAL.maintenance}" target="_blank" style="display:inline-block;background:#C5A059;color:#050505;padding:12px 24px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.15em;text-decoration:none;">Activate Maintenance — $297/mo →</a>
                    </div>
                </div>
               </div>`;
    }

    el.innerHTML = `<div class="fade-in" style="padding-bottom:40px;">
        <div style="background:#080808;border:1px solid #252525;padding:20px;margin-bottom:24px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:10px;">
                <div style="font-family:'Cormorant Garamond',serif;font-size:22px;color:#EAE8E3;">Regulatory Coverage Score</div>
                <div style="font-family:'Cormorant Garamond',serif;font-size:36px;color:${covCol};">${covPct}%</div>
            </div>
            <div style="height:6px;background:#1A1A1A;border-radius:3px;overflow:hidden;margin-bottom:10px;">
                <div style="height:100%;background:${covCol};width:${covPct}%;transition:width 1s ease;border-radius:3px;"></div>
            </div>
            <div style="display:flex;gap:20px;flex-wrap:wrap;">
                <span style="font-size:10px;color:#10b981;">✓ ${greens.length} Covered</span>
                <span style="font-size:10px;color:#eab308;">⚡ ${yellows.length} Upcoming</span>
                <span style="font-size:10px;color:#ef4444;">🚨 ${reds.length} Exposed</span>
            </div>
        </div>

        ${upsellBlock}

        ${reds.length>0?`<div style="font-size:9px;font-weight:700;color:#ef4444;text-transform:uppercase;letter-spacing:.15em;padding:8px 0;border-bottom:1px solid rgba(239,68,68,.2);margin-bottom:12px;">🚨 EXPOSED — Action Required</div>${renderCards(reds)}`:""}
        ${yellows.length>0?`<div style="font-size:9px;font-weight:700;color:#eab308;text-transform:uppercase;letter-spacing:.15em;padding:8px 0;border-bottom:1px solid rgba(234,179,8,.2);margin-bottom:12px;margin-top:${reds.length>0?"20px":"0"};">⚡ UPCOMING — Maintenance Covers These</div>${renderCards(yellows)}`:""}
        ${greens.length>0?`<details style="margin-top:${(reds.length>0||yellows.length>0)?"20px":"0"};">
            <summary style="font-size:9px;font-weight:700;color:#10b981;text-transform:uppercase;letter-spacing:.15em;cursor:pointer;padding:8px 0;border-bottom:1px solid rgba(16,185,129,.2);list-style:none;display:flex;align-items:center;gap:8px;">✓ ${greens.length} COVERED BY YOUR ARCHITECTURE <span style="opacity:.5;font-weight:400;">(click to expand)</span></summary>
            <div style="margin-top:12px;">${renderCards(greens)}</div>
        </details>`:""}
        ${classified.length===0?`<div style="padding:40px;text-align:center;font-size:11px;color:rgba(234,232,227,.3);font-style:italic;">No applicable regulations detected for your architecture footprint.</div>`:""}
    </div>`;
}

function clientMatchesEntry(data, entry) {
    const b = data.baseline||{}, a = data.architecture||{}, scope = data.action_scopes||{};
    const jur      = (data.registrationJurisdiction || b.hq || "").toLowerCase();
    const entryJur = (entry.jurisdiction || "").toLowerCase();
    const jurMatch =
        entryJur.includes("global") ||
        entryJur === "us-all" || entryJur.includes("us (federal") ||
        ((entryJur.includes("eu")||entryJur.includes("european")) && b.eu_users) ||
        ((entryJur.includes("ca")||entryJur.includes("california")) && b.ca_users) ||
        (entryJur.includes("uk") && b.eu_users) ||
        (jur && jur.length >= 2 && entryJur.includes(jur.substring(0,3)));
    if (!jurMatch) return false;
    if (entry.target_all) return true;
    const te = entry.target_ext||[], ti = entry.target_int||[];
    if (te.includes("eu_users")       && b.eu_users)               return true;
    if (te.includes("ca_users")       && b.ca_users)               return true;
    if (te.includes("processes_pii")  && a.processes_pii)          return true;
    if (te.includes("sensitive_data") && (a.sensitive_health||a.sensitive_bio||a.sensitive_fin)) return true;
    if (te.includes("finetuning")     && a.memory==="finetuning")  return true;
    if (te.includes("selfhosted")     && a.models==="selfhosted")  return true;
    if (ti.includes("is_doer")        && scope.is_doer)            return true;
    if (ti.includes("is_judge_hr")    && scope.is_judge_hr)        return true;
    if (ti.includes("is_judge_fin")   && scope.is_judge_fin)       return true;
    if (ti.includes("is_judge_legal") && scope.is_judge_legal)     return true;
    if (ti.includes("is_companion")   && scope.is_companion)       return true;
    if (ti.includes("is_orchestrator")&& scope.is_orchestrator)    return true;
    return false;
}

// ════════════════════════════════════════════════════════════════════════
// ═════════ TAB 2: THE VAULT ══════════════════════════════════════════════
// ════════════════════════════════════════════════════════════════════════
function buildTab2Vault(data, state) {
    const el = $("tab-vault");
    if (!el) return;

    if (state === 1) {
        el.innerHTML = `<div id="vault-form-container" class="fade-in"></div>`;
        if (typeof window.initVaultForm === "function") window.initVaultForm();
        return;
    }

    const b = data.baseline||{}, a = data.architecture||{}, scope = data.action_scopes||{}, comm = data.commercials||{};
    const row = (lbl, val) => `
    <div style="display:flex;justify-content:space-between;align-items:baseline;padding:7px 0;border-bottom:1px solid rgba(197,160,89,.06);">
        <span style="font-size:11px;color:rgba(234,232,227,.45);flex:1;">${lbl}</span>
        <span style="font-size:11px;color:#EAE8E3;font-weight:600;text-align:right;max-width:55%;">${val}</span>
    </div>`;
    const yn  = v => v
        ? `<span style="color:#10b981;font-weight:700;">Yes</span>`
        : `<span style="color:rgba(234,232,227,.3);">No</span>`;
    const sec = (title, rows) => `
    <div style="background:#080808;border:1px solid #252525;padding:20px;margin-bottom:12px;">
        <div style="font-size:9px;color:#C5A059;text-transform:uppercase;letter-spacing:.15em;font-weight:700;margin-bottom:14px;padding-bottom:8px;border-bottom:1px solid rgba(197,160,89,.15);">${title}</div>
        ${rows}
    </div>`;

    el.innerHTML = `<div class="fade-in" style="max-width:700px;padding-bottom:40px;">
        <div style="margin-bottom:20px;">
            <h2 style="font-family:'Cormorant Garamond',serif;font-size:24px;color:#EAE8E3;margin-bottom:4px;">Your Architecture Brief</h2>
            <p style="font-size:10px;color:rgba(234,232,227,.4);text-transform:uppercase;letter-spacing:.1em;">Submitted ${data.submittedAt ? fmtDate(data.submittedAt) : "—"} · Read-only. Contact support to request amendments.</p>
        </div>
        ${sec("Phase 1: The Baseline",
            row("Company Legal Name", esc(b.company||"—")) +
            row("HQ Location",        esc(b.hq||"—")) +
            row("EU/UK Users",        yn(b.eu_users)) +
            row("California Users",   yn(b.ca_users))
        )}
        ${sec("Phase 2: Data Architecture",
            row("Processes Personal Data",  yn(a.processes_pii)) +
            row("Health / Medical Data",    yn(a.sensitive_health)) +
            row("Biometrics / Voice Data",  yn(a.sensitive_bio)) +
            row("Financial / Trading Data", yn(a.sensitive_fin)) +
            row("AI Memory Architecture",
                a.memory==="rag"        ? "RAG (Recommended)" :
                a.memory==="finetuning" ? `<span style="color:#ef4444;font-weight:700;">⚠ Fine-Tuning (High Risk)</span>` :
                esc(a.memory||"—")) +
            row("Model Infrastructure",
                a.models==="thirdparty" ? "3rd-Party APIs (OpenAI / Anthropic)" :
                a.models==="selfhosted" ? "Self-Hosted / Open Source" :
                esc(a.models||"—"))
        )}
        ${sec("Phase 3: Action Scopes",
            row("The Doer (Autonomous)",     yn(scope.is_doer)) +
            (scope.is_doer ? row("Session Spend Limit", esc(scope.spend_limit||"—")) + row("Rate Limit / min", esc(scope.rate_limit||"—")) : "") +
            row("The Judge (HR)",             yn(scope.is_judge_hr)) +
            row("The Judge (Legal)",          yn(scope.is_judge_legal)) +
            row("The Judge (Financial)",      yn(scope.is_judge_fin)) +
            row("The Companion",              yn(scope.is_companion)) +
            row("The Orchestrator",           yn(scope.is_orchestrator))
        )}
        ${sec("Phase 4: Service Levels",
            row("Guaranteed Uptime",  comm.uptime==="none"?"No Guarantee":(comm.uptime?comm.uptime+"%":"—")) +
            row("TTFT Target",        comm.ttft==="none"  ?"No Guarantee":(comm.ttft||"—"))
        )}
    </div>`;
}

// ════════════════════════════════════════════════════════════════════════
// ═════════ TAB 3: THE SHIELDS ════════════════════════════════════════════
// ════════════════════════════════════════════════════════════════════════
function buildTab3Shields(data, state) {
    const el = $("tab-shields");
    if (!el) return;

    if (state === 1) {
        el.innerHTML = `<div class="fade-in" style="text-align:center;padding:80px 20px;">
            <div style="font-size:48px;margin-bottom:20px;">🔒</div>
            <h3 style="font-family:'Cormorant Garamond',serif;font-size:28px;color:#EAE8E3;margin-bottom:10px;">Vault Submission Required</h3>
            <p style="font-size:11px;color:rgba(234,232,227,.5);max-width:400px;margin:0 auto 24px;">Your document architecture cannot be built until you submit your technical configuration.</p>
            <button onclick="window.activateTab('vault')" style="background:#C5A059;color:#050505;padding:12px 24px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.15em;border:none;cursor:pointer;">Submit Your Vault →</button>
        </div>`;
        return;
    }

    const docs        = getDocsForPlan(data);
    const upsell      = getUpsellLane(data);
    const isDelivered = state === 3;
    const debriefDone = !!data.debrief;
    const files       = data.files || {};

    const shieldsHtml = shields => shields.map(s =>
        `<span style="font-size:8px;background:rgba(197,160,89,.1);border:1px solid rgba(197,160,89,.2);color:#C5A059;padding:2px 6px;display:inline-block;margin:2px 2px 0 0;">${s}</span>`
    ).join("");

    const docCard = d => {
        const url = files[d.id];
        if (!isDelivered || !debriefDone) {
            return `<div style="background:#080808;border:1px solid #252525;padding:20px;display:flex;flex-direction:column;min-height:180px;">
                <div style="font-size:24px;margin-bottom:10px;opacity:.4;">📄</div>
                <div style="font-family:'Cormorant Garamond',serif;font-size:15px;color:#C5A059;margin-bottom:4px;">${d.id}</div>
                <div style="font-size:12px;font-weight:600;color:#EAE8E3;margin-bottom:8px;">${d.name}</div>
                <div style="margin-bottom:12px;">${shieldsHtml(d.shields)}</div>
                <div style="margin-top:auto;">
                    ${!isDelivered
                        ? `<div style="display:flex;align-items:center;gap:8px;font-size:10px;color:rgba(234,232,227,.4);">
                            <div style="width:6px;height:6px;border-radius:50%;background:#C5A059;animation:pulse 1.5s infinite;"></div>Architecting...
                           </div>`
                        : `<div style="font-size:10px;color:rgba(234,232,227,.4);">Complete Post-Mortem to unlock downloads.</div>`
                    }
                </div>
            </div>`;
        }
        return `<div style="background:#080808;border:1px solid rgba(197,160,89,.3);padding:20px;display:flex;flex-direction:column;min-height:180px;transition:border-color .2s;"
            onmouseover="this.style.borderColor='#C5A059'" onmouseout="this.style.borderColor='rgba(197,160,89,.3)'">
            <div style="font-size:24px;margin-bottom:10px;">📄</div>
            <div style="font-family:'Cormorant Garamond',serif;font-size:15px;color:#C5A059;margin-bottom:4px;">${d.id}</div>
            <div style="font-size:12px;font-weight:600;color:#EAE8E3;margin-bottom:8px;">${d.name}</div>
            <div style="margin-bottom:14px;">${shieldsHtml(d.shields)}</div>
            <div style="margin-top:auto;">
                ${url
                    ? `<a href="${esc(url)}" target="_blank" style="font-size:9px;text-transform:uppercase;letter-spacing:.1em;color:#C5A059;border-bottom:1px solid #C5A059;text-decoration:none;padding-bottom:1px;">Download PDF →</a>`
                    : `<span style="font-size:9px;color:rgba(234,232,227,.3);">Link pending</span>`
                }
            </div>
        </div>`;
    };

    let upsellSection = "";
    if (upsell) {
        const blurred = upsell.docs.slice(0,3).map(d => `
        <div style="background:#080808;border:1px solid #252525;padding:20px;filter:blur(4px);pointer-events:none;min-height:130px;">
            <div style="font-size:24px;margin-bottom:10px;opacity:.4;">📄</div>
            <div style="font-family:'Cormorant Garamond',serif;font-size:15px;color:#C5A059;margin-bottom:4px;">${d.id}</div>
            <div style="font-size:12px;font-weight:600;color:#EAE8E3;">${d.name}</div>
        </div>`).join("") +
        `<div style="background:#080808;border:1px solid #252525;padding:20px;filter:blur(4px);pointer-events:none;min-height:130px;display:flex;align-items:center;justify-content:center;">
            <div style="font-size:22px;color:rgba(234,232,227,.2);">+${upsell.docs.length-3} more</div>
        </div>`;

        upsellSection = `<div style="margin-top:40px;padding-top:32px;border-top:1px dashed rgba(197,160,89,.2);">
            <div style="margin-bottom:16px;">
                <div style="font-size:9px;color:rgba(234,232,227,.4);text-transform:uppercase;letter-spacing:.15em;margin-bottom:6px;">LOCKED — ${upsell.label}</div>
                <div style="font-family:'Cormorant Garamond',serif;font-size:20px;color:#EAE8E3;">"Your product is secure. Your ${data.plan==="agentic_shield"?"workplace":"external architecture"} is not."</div>
            </div>
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px;margin-bottom:20px;user-select:none;">${blurred}</div>
            <div style="background:rgba(197,160,89,.06);border:1px solid rgba(197,160,89,.25);padding:20px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px;">
                <div>
                    <div style="font-size:13px;font-weight:700;color:#EAE8E3;margin-bottom:4px;">${upsell.label} — ${upsell.docs.length} documents</div>
                    <div style="font-size:11px;color:rgba(234,232,227,.5);">Founding client rate · 48-hour delivery · Full architecture coverage.</div>
                </div>
                <a href="${upsell.paypal}" target="_blank" style="background:#C5A059;color:#050505;padding:12px 24px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.15em;text-decoration:none;white-space:nowrap;">Unlock — $${upsell.price} →</a>
            </div>
        </div>`;
    }

    const videoBlock = isDelivered && debriefDone && data.walkthroughUrl ? `
    <div style="background:#080808;border:1px solid #252525;padding:24px;margin-bottom:28px;">
        <div style="font-family:'Cormorant Garamond',serif;font-size:20px;color:#C5A059;margin-bottom:6px;">The Architect's Walkthrough</div>
        <p style="font-size:11px;color:rgba(234,232,227,.5);margin-bottom:16px;">A personalized breakdown of your engineered clauses.</p>
        <div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;background:#050505;border:1px solid #1A1A1A;">
            <iframe src="${esc(data.walkthroughUrl)}" style="position:absolute;top:0;left:0;width:100%;height:100%;border:none;" allowfullscreen></iframe>
        </div>
    </div>` : "";

    el.innerHTML = `<div class="fade-in" style="padding-bottom:40px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:24px;flex-wrap:wrap;gap:12px;">
            <div>
                <h2 style="font-family:'Cormorant Garamond',serif;font-size:28px;color:#EAE8E3;margin-bottom:4px;">Your Architecture.</h2>
                <p style="font-size:10px;color:rgba(234,232,227,.4);text-transform:uppercase;letter-spacing:.1em;">Review-Ready Drafts · Local Counsel Review Required Before Execution</p>
            </div>
        </div>
        ${videoBlock}
        ${!isDelivered?`<div style="background:rgba(197,160,89,.05);border:1px solid rgba(197,160,89,.2);padding:12px 16px;margin-bottom:20px;display:flex;align-items:center;gap:10px;">
            <div style="width:8px;height:8px;border-radius:50%;background:#C5A059;animation:pulse 2s infinite;flex-shrink:0;"></div>
            <div style="font-size:10px;color:rgba(234,232,227,.6);">Your shields are being drafted. Each clause is being calibrated to your specific Vault configuration.</div>
        </div>`:""}
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;margin-bottom:28px;">${docs.map(docCard).join("")}</div>
        <div style="background:#080808;border:1px solid #252525;padding:14px 16px;font-size:10px;color:rgba(234,232,227,.35);line-height:1.5;">
            ⚠ All documents are delivered as Review-Ready Drafts. Not final legal instruments. Requires independent review by qualified counsel in your operating jurisdiction before execution.
        </div>
        ${upsellSection}
    </div>`;
}

// ════════════════════════════════════════════════════════════════════════
// ═════════ TAB 4: THE EXECUTION CHECKLIST ════════════════════════════════
// ════════════════════════════════════════════════════════════════════════
function buildTab4Checklist(data, state) {
    const el = $("tab-checklist");
    if (!el) return;

    if (state < 3) {
        el.innerHTML = `<div class="fade-in" style="text-align:center;padding:80px 20px;">
            <div style="font-size:48px;margin-bottom:20px;">⚙️</div>
            <h3 style="font-family:'Cormorant Garamond',serif;font-size:28px;color:#EAE8E3;margin-bottom:10px;">Engineering Handoffs Locked</h3>
            <p style="font-size:11px;color:rgba(234,232,227,.5);max-width:400px;margin:0 auto;">Your CTO's implementation checklist generates from your delivered architecture. Available once delivery is confirmed.</p>
        </div>`;
        return;
    }

    const a = data.architecture||{}, scope = data.action_scopes||{};
    const saved = data.checklistState||{};
    const items = [];

    items.push({ cat:"UNIVERSAL",              text:"Deploy the HITL Disclaimer UI — a visible label warning users to verify AI outputs before relying on them (DOC_TOS §5.1 compliance)." });
    items.push({ cat:"UNIVERSAL",              text:"Confirm all AI-generated content is labeled as AI-generated in user-facing interfaces (EU AI Act Art.50 / DOC_AUP §3)." });
    items.push({ cat:"UNIVERSAL",              text:"Verify your terms-of-service clickwrap cannot be bypassed — mandatory acceptance must gate first AI interaction (DOC_TOS §2)." });
    items.push({ cat:"UNIVERSAL",              text:"Confirm all foundation model API calls run through zero-data-retention enterprise endpoints — not default consumer tiers (DOC_DPA §4)." });

    if (a.processes_pii || a.memory === "rag") {
        items.push({ cat:"DATA ARCHITECTURE",  text:"Build vector deletion protocol — ability to isolate and permanently delete a specific user's embeddings from the vector store without destroying model weights (DOC_DPA §7.2)." });
        items.push({ cat:"DATA ARCHITECTURE",  text:"Implement context window isolation — verify API calls are strictly scoped by user_id to prevent cross-tenant data leakage (DOC_DPA §8.1)." });
    }
    if (a.memory === "finetuning") {
        items.push({ cat:"DATA ARCHITECTURE",  text:"🔴 CRITICAL — Implement data provenance logging. Every training data point must be traceable to its source to fulfill deletion requests without model rebuild (DOC_DPA §9)." });
    }
    if (scope.is_doer) {
        items.push({ cat:"AGENTIC CONTROLS",   text:`Hardcode circuit breaker at ${scope.spend_limit||"[declared session limit]"} — must be a hard break in code, not a Slack alert or dashboard notification (DOC_AGT §4.1).` });
        items.push({ cat:"AGENTIC CONTROLS",   text:"Implement Kill Switch — a functional /terminate endpoint that instantly revokes all agent API keys and halts active loops within < 500ms (DOC_AGT §5.1)." });
        items.push({ cat:"AGENTIC CONTROLS",   text:"Implement idempotency keys on all agent-initiated financial transactions to prevent duplicate execution on retry storms (DOC_AGT §6)." });
    }
    if (scope.is_judge_hr || scope.is_judge_fin || scope.is_judge_legal) {
        items.push({ cat:"DECISIONING",        text:"Implement HITL Review Gate — before any AI scoring output is acted upon, a human reviewer must mark it reviewed. Log every review with timestamp and reviewer ID (DOC_TOS §8)." });
        items.push({ cat:"DECISIONING",        text:"Deploy bias audit framework — quarterly disparate impact testing across protected categories. Retain results minimum 3 years (NYC Local Law 144 / EU AI Act compliance)." });
    }
    if (scope.is_companion) {
        items.push({ cat:"COMPANION",          text:"Implement crisis interruption logic — if user messages match predefined distress patterns, the AI must surface crisis resources and break the conversational loop (DOC_AUP §9)." });
    }
    if (a.sensitive_bio) {
        items.push({ cat:"BIOMETRICS",         text:"Implement biometric consent gate — written consent must be obtained BEFORE any voice or facial processing begins. Log consent with timestamp, IP, and user_id (DOC_PP §12 / BIPA compliance)." });
    }
    if (a.sensitive_health) {
        items.push({ cat:"HEALTH DATA",        text:"Confirm HIPAA Business Associate Agreement (BAA) is in place with all model providers that process health data. DOC_DPA §11 requires explicit BAA coverage." });
    }

    const cats     = [...new Set(items.map(i => i.cat))];
    const doneCnt  = items.filter((_, i) => !!saved[i]).length;
    const pct      = items.length > 0 ? Math.round((doneCnt / items.length) * 100) : 0;
    const pctCol   = pct === 100 ? "#10b981" : "#C5A059";

    let html = ""; let idx = 0;
    cats.forEach(cat => {
        const catItems = items.filter(i => i.cat === cat);
        html += `<div style="font-size:9px;color:${cat==="UNIVERSAL"?"#C5A059":"#EAE8E3"};text-transform:uppercase;letter-spacing:.15em;font-weight:700;margin:20px 0 10px;padding-bottom:6px;border-bottom:1px solid rgba(197,160,89,.1);">${cat}</div>`;
        catItems.forEach(item => {
            const i = idx, isDone = !!saved[i];
            html += `<div style="display:flex;align-items:flex-start;gap:12px;padding:10px 0;border-bottom:1px solid rgba(197,160,89,.04);cursor:pointer;" onclick="window.toggleChk(${i})">
                <div id="chkb-${i}" style="width:18px;height:18px;border:1px solid ${isDone?"#C5A059":"rgba(197,160,89,.25)"};background:${isDone?"rgba(197,160,89,.15)":"transparent"};display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:2px;transition:all .15s;">
                    ${isDone?`<span style="color:#C5A059;font-size:11px;font-weight:700;">✓</span>`:""}
                </div>
                <span id="chkl-${i}" style="font-size:11px;line-height:1.5;${isDone?"color:rgba(234,232,227,.3);text-decoration:line-through;":"color:#EAE8E3;"}">${esc(item.text)}</span>
            </div>`;
            idx++;
        });
    });

    el.innerHTML = `<div class="fade-in" style="padding-bottom:40px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:20px;flex-wrap:wrap;gap:12px;">
            <div>
                <h2 style="font-family:'Cormorant Garamond',serif;font-size:28px;color:#EAE8E3;margin-bottom:4px;">Product Safeguards</h2>
                <p style="font-size:10px;color:rgba(234,232,227,.4);text-transform:uppercase;letter-spacing:.1em;">CTO Implementation Checklist · Generated from your architecture</p>
            </div>
            <div style="text-align:right;">
                <div style="font-family:'Cormorant Garamond',serif;font-size:28px;color:${pctCol};">${pct}%</div>
                <div style="font-size:9px;color:rgba(234,232,227,.4);">${doneCnt}/${items.length} implemented</div>
            </div>
        </div>
        <div style="height:4px;background:#1A1A1A;border-radius:2px;overflow:hidden;margin-bottom:24px;">
            <div id="chk-progress" style="height:100%;background:${pctCol};width:${pct}%;transition:width .5s;border-radius:2px;"></div>
        </div>
        ${html}
        <div style="margin-top:24px;background:#080808;border:1px solid #252525;padding:14px 16px;font-size:10px;color:rgba(234,232,227,.35);line-height:1.5;">
            ⚠ These are implementation recommendations derived from your legal architecture. They do not constitute engineering or legal advice.
        </div>
    </div>`;

    const totalItems = items.length;
    window.toggleChk = function(i) {
        const box = $(`chkb-${i}`); const lbl = $(`chkl-${i}`);
        if (!box || !lbl) return;
        const ns = { ...(window.clientData.checklistState||{}) };
        ns[i] = !ns[i];
        const done = ns[i];
        box.style.border    = `1px solid ${done?"#C5A059":"rgba(197,160,89,.25)"}`;
        box.style.background = done ? "rgba(197,160,89,.15)" : "transparent";
        box.innerHTML       = done ? `<span style="color:#C5A059;font-size:11px;font-weight:700;">✓</span>` : "";
        lbl.style.color          = done ? "rgba(234,232,227,.3)" : "#EAE8E3";
        lbl.style.textDecoration = done ? "line-through" : "none";
        window.clientData.checklistState = ns;
        const dc  = Object.values(ns).filter(Boolean).length;
        const np  = totalItems > 0 ? Math.round((dc/totalItems)*100) : 0;
        const bar = $("chk-progress");
        if (bar) { bar.style.width = np+"%"; bar.style.background = np===100?"#10b981":"#C5A059"; }
        const user = window.firebaseAuth?.currentUser;
        if (user) updateDoc(doc(window.firebaseDb,"clients",user.email),{checklistState:ns}).catch(()=>{});
    };
}

// ════════════════════════════════════════════════════════════════════════
// ═════════ TAB 5: THE SYNDICATE ══════════════════════════════════════════
// ════════════════════════════════════════════════════════════════════════
function buildTab5Syndicate(data) {
    const el = $("tab-syndicate");
    if (!el) return;

    const refs   = data.referrals || [];
    const reward = data.maintenanceActive ? "Free Strategy Session" : "3 Months Free Maintenance";

    const refListHtml = refs.length === 0
        ? `<p style="font-size:11px;color:rgba(234,232,227,.3);font-style:italic;padding:20px 0;">No targets registered yet.</p>`
        : refs.map(r => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid rgba(197,160,89,.06);flex-wrap:wrap;gap:8px;">
            <div>
                <div style="font-size:12px;font-weight:600;color:#EAE8E3;">${esc(r.company||r.name||"—")}</div>
                <div style="font-size:10px;color:rgba(234,232,227,.4);">${esc(r.email||"—")} · ${r.date?fmtDate(r.date):"—"}</div>
            </div>
            <span style="font-size:9px;text-transform:uppercase;letter-spacing:.1em;padding:3px 8px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);color:rgba(234,232,227,.4);">${r.credited?"✓ Credited":r.status||"Pending"}</span>
        </div>`).join("");

    const iStyle = `width:100%;background:#050505;border:1px solid #1A1A1A;color:#EAE8E3;padding:10px 12px;font-size:12px;font-family:'Inter',sans-serif;outline:none;box-sizing:border-box;`;

    el.innerHTML = `<div class="fade-in" style="padding-bottom:40px;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:40px;flex-wrap:wrap;">
            <div>
                <h2 style="font-family:'Cormorant Garamond',serif;font-size:28px;color:#C5A059;margin-bottom:8px;">The Syndicate</h2>
                <p style="font-size:11px;color:rgba(234,232,227,.55);line-height:1.6;margin-bottom:24px;border-bottom:1px solid #1A1A1A;padding-bottom:20px;">Register a target founder building an AI product. If they engage Lex Nova HQ, your operation is credited immediately.</p>
                <div style="background:#080808;border:1px solid #252525;padding:24px;">
                    <div style="font-size:10px;text-transform:uppercase;letter-spacing:.15em;color:#C5A059;font-weight:600;margin-bottom:20px;display:flex;align-items:center;gap:8px;">
                        <span style="width:8px;height:8px;border-radius:50%;background:#C5A059;display:inline-block;"></span>
                        Reward: ${reward}
                    </div>
                    <div style="margin-bottom:14px;"><label style="display:block;font-size:9px;text-transform:uppercase;letter-spacing:.18em;color:rgba(234,232,227,.4);margin-bottom:6px;">Target Name</label>
                        <input type="text" id="syn-name" style="${iStyle}" onfocus="this.style.borderColor='#C5A059'" onblur="this.style.borderColor='#1A1A1A'"></div>
                    <div style="margin-bottom:14px;"><label style="display:block;font-size:9px;text-transform:uppercase;letter-spacing:.18em;color:rgba(234,232,227,.4);margin-bottom:6px;">Target Company</label>
                        <input type="text" id="syn-company" style="${iStyle}" onfocus="this.style.borderColor='#C5A059'" onblur="this.style.borderColor='#1A1A1A'"></div>
                    <div style="margin-bottom:20px;"><label style="display:block;font-size:9px;text-transform:uppercase;letter-spacing:.18em;color:rgba(234,232,227,.4);margin-bottom:6px;">Target Work Email</label>
                        <input type="email" id="syn-email" style="${iStyle}" onfocus="this.style.borderColor='#C5A059'" onblur="this.style.borderColor='#1A1A1A'"></div>
                    <button onclick="window.submitRef()" style="background:#C5A059;color:#050505;width:100%;padding:14px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.18em;border:none;cursor:pointer;font-family:'Inter',sans-serif;">Register Target</button>
                    <div id="syn-msg" style="display:none;font-size:11px;text-align:center;margin-top:12px;padding:8px;"></div>
                </div>
            </div>
            <div>
                <h3 style="font-size:10px;text-transform:uppercase;letter-spacing:.18em;color:rgba(234,232,227,.4);margin-bottom:20px;">Registered Targets</h3>
                <div id="syn-list">${refListHtml}</div>
            </div>
        </div>
    </div>`;

    window.submitRef = async function() {
        const name    = ($("syn-name")?.value||"").trim();
        const company = ($("syn-company")?.value||"").trim();
        const email   = ($("syn-email")?.value||"").trim();
        const msg     = $("syn-msg");
        if (!name || !email) {
            if (msg) { msg.style.display="block"; msg.style.color="#ef4444"; msg.textContent="Name and email required."; }
            return;
        }
        const user = window.firebaseAuth?.currentUser;
        if (!user) return;
        const entry = { name, company, email, status:"Pending", date:new Date().toISOString(), credited:false };
        const all   = [...(window.clientData.referrals||[]), entry];
        try {
            await setDoc(doc(window.firebaseDb,"clients",user.email),{referrals:all},{merge:true});
            window.clientData.referrals = all;
            ["syn-name","syn-company","syn-email"].forEach(id => { const el=$( id); if(el) el.value=""; });
            if (msg) { msg.style.display="block"; msg.style.color="#10b981"; msg.textContent="Target registered."; }
            const listEl = $("syn-list");
            if (listEl) listEl.innerHTML = all.map(r =>
                `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid rgba(197,160,89,.06);flex-wrap:wrap;gap:8px;">
                    <div><div style="font-size:12px;font-weight:600;color:#EAE8E3;">${esc(r.company||r.name||"—")}</div>
                    <div style="font-size:10px;color:rgba(234,232,227,.4);">${esc(r.email||"—")} · ${r.date?fmtDate(r.date):"—"}</div></div>
                    <span style="font-size:9px;text-transform:uppercase;letter-spacing:.1em;padding:3px 8px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);color:rgba(234,232,227,.4);">${r.credited?"✓ Credited":r.status||"Pending"}</span>
                </div>`).join("");
        } catch(e) {
            console.error(e);
            if (msg) { msg.style.display="block"; msg.style.color="#ef4444"; msg.textContent="Submission failed. Retry."; }
        }
    };
}

// ════════════════════════════════════════════════════════════════════════
// ═════════ DEBRIEF MODAL ═════════════════════════════════════════════════
// ════════════════════════════════════════════════════════════════════════
const btnDebrief = $("btn-submit-debrief");
if (btnDebrief) {
    btnDebrief.addEventListener("click", async () => {
        const catalyst = ($("db-catalyst")?.value||"").trim();
        const result   = ($("db-result")?.value||"").trim();
        const msg      = $("db-msg");
        if (!catalyst || !result) {
            if (msg) { msg.style.display="block"; msg.textContent="Please complete all fields before unlocking."; }
            return;
        }
        btnDebrief.textContent = "Encrypting..."; btnDebrief.disabled = true;
        const payload = {
            rating:      $("db-rating")?.value || "5",
            catalyst,
            portal:      ($("db-portal")?.value||"").trim(),
            result,
            consent:     $("db-consent")?.checked || false,
            submittedAt: new Date().toISOString()
        };
        try {
            const user = window.firebaseAuth?.currentUser;
            if (!user) throw new Error("Auth lost");
            await setDoc(doc(window.firebaseDb,"clients",user.email),{debrief:payload},{merge:true});
            window.clientData.debrief = payload;
            const modal = $("modal-debrief");
            if (modal) modal.classList.add("hidden");
            document.body.style.overflow = "auto";
            buildTab3Shields(window.clientData, 3);
        } catch(e) {
            console.error("Debrief Error:", e);
            btnDebrief.textContent = "Error. Retry."; btnDebrief.disabled = false;
        }
    });
}
