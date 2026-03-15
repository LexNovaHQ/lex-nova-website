/**
 * LEX NOVA HQ — VAULT MODULE (vault.js) — FULL REBUILD
 * Annexure B compliant — REFERENCE_AI_v2 (Modules 1–4 complete)
 *
 * Entry point: window.initVaultForm()
 * Called by dashboard.js when portalState === 1.
 * Renders the 4-module intake wizard into #tab-vault.
 * On submit: writes to clients/{email} + fires Make.com webhook + reloads.
 *
 * FUNCTIONAL WIRING UNCHANGED: Firebase setDoc, webhook URL, navigation, shell HTML,
 *   scroll behavior, error div, window.location.reload() on success.
 * CORE CONTENT REBUILT: All 4 modules, 23+ questions, help text, engine mappings
 *   per Annexure B (REFERENCE_AI_v2). Radio groups replace old select dropdowns
 *   for memory architecture, upstream models, market exposure, output ownership,
 *   SLA diagnostic, and PII gateway — matching Annexure B UI spec exactly.
 *
 * DEPENDENCIES: window.firebaseAuth, window.firebaseDb (from index.html)
 */

import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ── WEBHOOK (UNCHANGED) ────────────────────────────────────────────────
const INTAKE_WEBHOOK = "https://hook.eu1.make.com/q7nnd3klwdmlmtesq5no4yfsmk3v8ua7";

// ── PHASE TRACKER (UNCHANGED) ──────────────────────────────────────────
let currentPhase = 1;
const TOTAL_PHASES = 4;

// ── PRODUCT LIST (Module 1 Q2 — dynamic multi-product) ────────────────
let productList = [{ name: "", desc: "" }];

// ── IN-MEMORY VALUE STORE ─────────────────────────────────────────────
const vaultStore = {};

// ── ENTRY POINT (UNCHANGED) ────────────────────────────────────────────
window.initVaultForm = function () {
    const container = document.getElementById("tab-vault");
    if (!container) return;
    container.innerHTML = buildVaultShell();
    productList = [{ name: "", desc: "" }];
    currentPhase = 1;
    showPhase(1);
    attachListeners();
};

// ── SHELL HTML (UNCHANGED STRUCTURE) ──────────────────────────────────
function buildVaultShell() {
    return `
    <div id="vault-wrap" class="fade-in max-w-2xl mx-auto pb-16">
        <div class="mb-10">
            <div class="inline-block border border-gold border-opacity-30 bg-gold bg-opacity-5 px-4 py-1 mb-5">
                <span class="font-sans text-[9px] tracking-[.25em] uppercase text-gold">Architecture Intake — Module <span id="vault-phase-indicator">1</span> of ${TOTAL_PHASES}</span>
            </div>
            <h2 id="vault-phase-title" class="font-serif text-3xl md:text-4xl text-marble mb-2">The Baseline &amp; Commercials</h2>
            <p id="vault-phase-sub" class="font-sans text-[10px] text-marble opacity-40 tracking-wide leading-relaxed">Your responses directly determine which legal clauses are injected into your documents. Answer accurately.</p>
        </div>
        <div class="w-full h-0.5 bg-shadow mb-10 relative">
            <div id="vault-progress" class="absolute top-0 left-0 h-full bg-gold transition-all duration-500" style="width:25%"></div>
        </div>
        <div id="vault-phase-1" class="vault-phase"></div>
        <div id="vault-phase-2" class="vault-phase" style="display:none"></div>
        <div id="vault-phase-3" class="vault-phase" style="display:none"></div>
        <div id="vault-phase-4" class="vault-phase" style="display:none"></div>
        <div id="vault-error" style="display:none;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.25);padding:12px 16px;font-size:11px;color:#ef4444;margin-top:16px;"></div>
    </div>`;
}

// ── HELPER ─────────────────────────────────────────────────────────────
function escH(s) {
    return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ── MODULE 1 Q2 — Dynamic Product List ───────────────────────────────
function buildProductEntries() {
    return productList.map((p, i) => `
        <div id="product-entry-${i}" style="background:#050505;border:1px solid #1A1A1A;padding:14px;margin-bottom:10px;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
                <span style="font-size:10px;color:rgba(234,232,227,.35);text-transform:uppercase;letter-spacing:.12em;">Product ${i + 1}</span>
                ${i > 0 ? `<button onclick="window.vaultRemoveProduct(${i})" style="font-size:10px;color:rgba(239,68,68,.55);background:none;border:none;cursor:pointer;padding:0;">Remove</button>` : ""}
            </div>
            <div style="margin-bottom:10px;">
                <label class="vault-label">Product / Platform Name</label>
                <input type="text" id="v-product-name-${i}" class="vault-input" placeholder="e.g. NexusAI, DataPilot" value="${escH(p.name)}">
            </div>
            <div>
                <label class="vault-label">Core functionality — one sentence, max 250 characters</label>
                <textarea id="v-product-desc-${i}" class="vault-input" rows="2" maxlength="250" placeholder="e.g. An AI-powered SaaS platform that automates email drafting and CRM data entry." style="resize:none;">${escH(p.desc)}</textarea>
            </div>
        </div>
    `).join("");
}

window.vaultAddProduct = function () {
    syncProductList();
    productList.push({ name: "", desc: "" });
    const el = document.getElementById("v-product-list");
    if (el) el.innerHTML = buildProductEntries();
};

window.vaultRemoveProduct = function (idx) {
    syncProductList();
    if (productList.length > 1) {
        productList.splice(idx, 1);
        const el = document.getElementById("v-product-list");
        if (el) el.innerHTML = buildProductEntries();
    }
};

function syncProductList() {
    productList = productList.map((_, i) => ({
        name: (document.getElementById(`v-product-name-${i}`)?.value || "").trim(),
        desc: (document.getElementById(`v-product-desc-${i}`)?.value || "").trim()
    }));
}

// ── PHASES CONTENT — ANNEXURE B COMPLIANT ─────────────────────────────

const PHASES = {

    // ─────────────────────────────────────────────────────────────────
    // MODULE 1: THE BASELINE & COMMERCIALS (Q1–Q10)
    // Engine: Populates preamble, Schedule A, jurisdiction, liability floor,
    //         output license, SLA injection, integration disclaimers, reliance cap.
    // ─────────────────────────────────────────────────────────────────
    1: {
        title: "The Baseline & Commercials",
        sub:   "Establishes your legal identity, commercial bedrock, API shields, and product inventory.",
        html: `
<div class="vault-section">
    <div class="vault-section-title">Q1 — Legal Identity &amp; Notice Routing</div>
    <div style="margin-bottom:14px;">
        <label class="vault-label">Company Legal Name *</label>
        <input type="text" id="v-company" class="vault-input" placeholder="e.g. Acme AI, Inc.">
    </div>
    <div style="margin-bottom:14px;">
        <label class="vault-label">Entity Type *</label>
        <div style="position:relative;">
            <select id="v-entity-type" class="vault-input" style="padding-right:32px;">
                <option value="" disabled selected>Select entity type…</option>
                <option value="LLC">LLC</option>
                <option value="C-Corp">C-Corp</option>
                <option value="B-Corp">B-Corp</option>
                <option value="Ltd">Ltd (UK / Commonwealth)</option>
                <option value="GmbH">GmbH (Germany / Austria)</option>
                <option value="SAS">SAS (France)</option>
                <option value="Sole Proprietor">Sole Proprietor</option>
                <option value="Other">Other</option>
            </select>
            <span style="position:absolute;right:12px;top:50%;transform:translateY(-50%);color:rgba(234,232,227,.3);pointer-events:none;">▾</span>
        </div>
    </div>
    <div style="margin-bottom:14px;">
        <label class="vault-label">Principal Place of Business (Full Address)</label>
        <input type="text" id="v-address" class="vault-input" placeholder="e.g. 1234 Main St, Wilmington, DE 19801, USA">
    </div>
    <div style="margin-bottom:14px;">
        <label class="vault-label">Designated Legal Notice Email *</label>
        <input type="email" id="v-legal-email" class="vault-input" placeholder="e.g. legal@yourcompany.com">
    </div>
    <div>
        <label class="vault-label">Privacy / Data Protection Contact Email *</label>
        <input type="email" id="v-privacy-email" class="vault-input" placeholder="e.g. privacy@yourcompany.com">
    </div>
    <p class="vault-why">We use this exact text to build the binding signature blocks and preamble of every document. Use your formal corporate name, not your 'doing business as' (DBA) name. The emails provided will be contractually bound to receive legal and data deletion requests.</p>
</div>

<div class="vault-section">
    <div class="vault-section-title">Q2 — Product Identity</div>
    <div id="v-product-list"></div>
    <button onclick="window.vaultAddProduct()" style="font-size:10px;color:#C5A059;background:none;border:1px solid rgba(197,160,89,.3);padding:8px 16px;cursor:pointer;letter-spacing:.08em;text-transform:uppercase;margin-top:4px;">+ Add Another Product</button>
    <p class="vault-why">List ALL current products you intend to govern under these terms. Keep descriptions brief and literal — we use this exact sentence to legally define the 'Service' in Schedule A of your Terms of Service. Do not use marketing jargon. <strong>Warning:</strong> If you launch a new product later that is not described here, this contract will not legally cover it, and you will be exposed.</p>
</div>

<div class="vault-section">
    <div class="vault-section-title">Q3 — Jurisdiction Anchor</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div>
            <label class="vault-label">Country *</label>
            <input type="text" id="v-jurisdiction-country" class="vault-input" placeholder="e.g. United States">
        </div>
        <div>
            <label class="vault-label">State / Province</label>
            <input type="text" id="v-jurisdiction-state" class="vault-input" placeholder="e.g. Delaware">
        </div>
    </div>
    <p class="vault-why">This determines whose laws apply if you get sued, and where arbitration takes place. Usually, this is the state or country where your business is officially registered.</p>
</div>

<div class="vault-section">
    <div class="vault-section-title">Q4 — Market Exposure (B2B vs. B2C)</div>
    <div style="display:flex;flex-direction:column;gap:10px;">
        <label style="display:flex;align-items:flex-start;gap:12px;cursor:pointer;padding:12px;border:1px solid #1A1A1A;background:#050505;">
            <input type="radio" name="v-market" id="v-market-b2b" value="b2b" style="width:16px;height:16px;accent-color:#C5A059;flex-shrink:0;margin-top:2px;">
            <div><span style="font-size:12px;color:#EAE8E3;font-weight:600;">Strictly B2B</span><p style="font-size:11px;color:rgba(234,232,227,.45);margin-top:2px;">We only sell to other registered businesses.</p></div>
        </label>
        <label style="display:flex;align-items:flex-start;gap:12px;cursor:pointer;padding:12px;border:1px solid #1A1A1A;background:#050505;">
            <input type="radio" name="v-market" id="v-market-b2c" value="b2c" style="width:16px;height:16px;accent-color:#C5A059;flex-shrink:0;margin-top:2px;">
            <div><span style="font-size:12px;color:#EAE8E3;font-weight:600;">Strictly B2C</span><p style="font-size:11px;color:rgba(234,232,227,.45);margin-top:2px;">We sell directly to everyday consumers.</p></div>
        </label>
        <label style="display:flex;align-items:flex-start;gap:12px;cursor:pointer;padding:12px;border:1px solid #1A1A1A;background:#050505;">
            <input type="radio" name="v-market" id="v-market-hybrid" value="hybrid" style="width:16px;height:16px;accent-color:#C5A059;flex-shrink:0;margin-top:2px;">
            <div><span style="font-size:12px;color:#EAE8E3;font-weight:600;">Hybrid (B2B &amp; B2C)</span><p style="font-size:11px;color:rgba(234,232,227,.45);margin-top:2px;">We serve both businesses and everyday consumers.</p></div>
        </label>
    </div>
    <p class="vault-why">Selling to consumers (B2C) triggers strict consumer protection laws and arbitration carve-outs. Selling to businesses (B2B) allows for much stronger, mutually negotiated liability caps. Select 'Hybrid' if anyone can sign up with a personal email.</p>
</div>

<div class="vault-section">
    <div class="vault-section-title">Q5 — Delivery Mechanism</div>
    <div style="display:flex;flex-direction:column;gap:10px;">
        <label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-size:12px;color:rgba(234,232,227,.8);">
            <input type="checkbox" id="v-delivery-app" style="width:16px;height:16px;accent-color:#C5A059;">
            Direct-to-User App (Web, Mobile, or Desktop GUI)
        </label>
        <label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-size:12px;color:rgba(234,232,227,.8);">
            <input type="checkbox" id="v-delivery-api" style="width:16px;height:16px;accent-color:#C5A059;">
            Developer API, On-Premise, or White-Label Embed
        </label>
    </div>
    <p class="vault-why">If you sell an API, you are exposed to 'downstream' liability if your client's app breaks or goes viral. We use this to inject specific API key disclaimers and force your clients to legally pass your Acceptable Use Policy down to their end-users.</p>
</div>

<div class="vault-section">
    <div class="vault-section-title">Q6 — Liability Floor &amp; Beta Shield</div>
    <div style="margin-bottom:14px;">
        <label class="vault-label">Primary Revenue Model *</label>
        <div style="position:relative;">
            <select id="v-revenue-model" class="vault-input" style="padding-right:32px;">
                <option value="" disabled selected>Select revenue model…</option>
                <option value="monthly_saas">Monthly SaaS Subscription</option>
                <option value="enterprise_contracts">Enterprise Contracts (Annual)</option>
                <option value="token_usage">Token / Usage-Based</option>
            </select>
            <span style="position:absolute;right:12px;top:50%;transform:translateY(-50%);color:rgba(234,232,227,.3);pointer-events:none;">▾</span>
        </div>
    </div>
    <div style="margin-bottom:14px;">
        <label class="vault-label">Max Annual Contract Value (ACV) — in USD</label>
        <input type="number" id="v-acv" class="vault-input" placeholder="e.g. 1200" min="0">
    </div>
    <label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-size:12px;color:rgba(234,232,227,.8);padding:12px;border:1px solid #1A1A1A;background:#050505;">
        <input type="checkbox" id="v-beta" style="width:16px;height:16px;accent-color:#C5A059;">
        We offer a Free Tier, or label certain features as 'Beta'
    </label>
    <p class="vault-why">Your ACV calculates your maximum financial liability if you are sued. (Market Standard: $1,200 for standard B2B SaaS; $10,000+ for mid-market Enterprise). Checking the box populates Free/Beta rules into Schedule B. Note: Base Beta waiver in DOC_TOS §2.6 remains Universal.</p>
</div>

<div class="vault-section">
    <div class="vault-section-title">Q7 — Output Ownership (The IP Dilemma)</div>
    <div style="display:flex;flex-direction:column;gap:10px;">
        <label style="display:flex;align-items:flex-start;gap:12px;cursor:pointer;padding:12px;border:1px solid #1A1A1A;background:#050505;">
            <input type="radio" name="v-output-ownership" id="v-output-full" value="full" style="width:16px;height:16px;accent-color:#C5A059;flex-shrink:0;margin-top:2px;">
            <div><span style="font-size:12px;color:#EAE8E3;font-weight:600;">Full Commercial Rights</span><p style="font-size:11px;color:rgba(234,232,227,.45);margin-top:2px;">We assign all rights and title to the user.</p></div>
        </label>
        <label style="display:flex;align-items:flex-start;gap:12px;cursor:pointer;padding:12px;border:1px solid #1A1A1A;background:#050505;">
            <input type="radio" name="v-output-ownership" id="v-output-limited" value="limited" style="width:16px;height:16px;accent-color:#C5A059;flex-shrink:0;margin-top:2px;">
            <div><span style="font-size:12px;color:#EAE8E3;font-weight:600;">Limited License</span><p style="font-size:11px;color:rgba(234,232,227,.45);margin-top:2px;">We retain ownership of the Output; the user receives a license to use it.</p></div>
        </label>
        <label style="display:flex;align-items:flex-start;gap:12px;cursor:pointer;padding:12px;border:1px solid #1A1A1A;background:#050505;">
            <input type="radio" name="v-output-ownership" id="v-output-none" value="none" style="width:16px;height:16px;accent-color:#C5A059;flex-shrink:0;margin-top:2px;">
            <div><span style="font-size:12px;color:#EAE8E3;font-weight:600;">No Tangible Output (Service / Analytics Only)</span><p style="font-size:11px;color:rgba(234,232,227,.45);margin-top:2px;">The AI analyzes data or routes traffic, but does not generate novel media, text, or code requiring a copyright license.</p></div>
        </label>
    </div>
    <p class="vault-why">Enterprise clients usually demand 'Full Commercial Rights'. Standard SaaS tools usually grant a 'Limited License'. If your AI is a backend router, optimizer, or analyzer that doesn't 'create' anything, select the third option to avoid injecting irrelevant copyright terms.</p>
</div>

<div class="vault-section">
    <div class="vault-section-title">Q8 — Enterprise SLA Diagnostic</div>
    <div style="display:flex;flex-direction:column;gap:10px;">
        <label style="display:flex;align-items:flex-start;gap:12px;cursor:pointer;padding:12px;border:1px solid #1A1A1A;background:#050505;">
            <input type="radio" name="v-sla-type" id="v-sla-no" value="no" style="width:16px;height:16px;accent-color:#C5A059;flex-shrink:0;margin-top:2px;">
            <div><span style="font-size:12px;color:#EAE8E3;font-weight:600;">No (The "As-Is" Shield)</span><p style="font-size:11px;color:rgba(234,232,227,.45);margin-top:2px;">We cannot afford to pay penalties for downtime.</p></div>
        </label>
        <label style="display:flex;align-items:flex-start;gap:12px;cursor:pointer;padding:12px;border:1px solid #1A1A1A;background:#050505;">
            <input type="radio" name="v-sla-type" id="v-sla-standard" value="standard" style="width:16px;height:16px;accent-color:#C5A059;flex-shrink:0;margin-top:2px;">
            <div><span style="font-size:12px;color:#EAE8E3;font-weight:600;">Yes — Standard Enterprise SLA</span><p style="font-size:11px;color:rgba(234,232,227,.45);margin-top:2px;">We need the industry-standard AI SLA to close deals (99.9% Uptime / &lt;3s Time-to-First-Token).</p></div>
        </label>
        <label style="display:flex;align-items:flex-start;gap:12px;cursor:pointer;padding:12px;border:1px solid #1A1A1A;background:#050505;">
            <input type="radio" name="v-sla-type" id="v-sla-custom" value="custom" style="width:16px;height:16px;accent-color:#C5A059;flex-shrink:0;margin-top:2px;">
            <div><span style="font-size:12px;color:#EAE8E3;font-weight:600;">Yes — Custom / Negotiated</span><p style="font-size:11px;color:rgba(234,232,227,.45);margin-top:2px;">We negotiate specific uptime percentages manually.</p></div>
        </label>
    </div>
    <p class="vault-why"><strong>Warning:</strong> Never offer an SLA unless your enterprise buyers force you to. An SLA makes you financially liable for downtime. If you select 'No', we will aggressively disclaim all uptime warranties to protect your revenue.</p>
</div>

<div class="vault-section">
    <div class="vault-section-title">Q9 — Third-Party API Integrations</div>
    <div style="display:flex;flex-direction:column;gap:10px;">
        <label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-size:12px;color:rgba(234,232,227,.8);"><input type="checkbox" id="v-int-slack" class="v-int-check" style="width:16px;height:16px;accent-color:#C5A059;"> Slack / Microsoft Teams</label>
        <label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-size:12px;color:rgba(234,232,227,.8);"><input type="checkbox" id="v-int-crm" class="v-int-check" style="width:16px;height:16px;accent-color:#C5A059;"> Salesforce / HubSpot (CRMs)</label>
        <label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-size:12px;color:rgba(234,232,227,.8);"><input type="checkbox" id="v-int-stripe" class="v-int-check" style="width:16px;height:16px;accent-color:#C5A059;"> Stripe / Payment Gateways</label>
        <label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-size:12px;color:rgba(234,232,227,.8);"><input type="checkbox" id="v-int-github" class="v-int-check" style="width:16px;height:16px;accent-color:#C5A059;"> GitHub / GitLab</label>
        <label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-size:12px;color:rgba(234,232,227,.8);"><input type="checkbox" id="v-int-webhooks" class="v-int-check" style="width:16px;height:16px;accent-color:#C5A059;"> Custom Webhooks / APIs</label>
        <label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-size:12px;color:#C5A059;"><input type="checkbox" id="v-int-none" style="width:16px;height:16px;accent-color:#C5A059;"> None — Our AI operates entirely within our own app</label>
    </div>
    <p class="vault-why">If your AI hallucinates and deletes a client's Salesforce database, this ensures we legally disclaim liability for that third-party system. Select all external platforms your AI currently touches.</p>
</div>

<div class="vault-section">
    <div class="vault-section-title">Q10 — High-Stakes Reliance Threshold</div>
    <label class="vault-label">At what financial value should a user be strictly prohibited from relying solely on your AI without human verification?</label>
    <div style="position:relative;max-width:200px;">
        <span style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:rgba(234,232,227,.4);font-size:13px;">$</span>
        <input type="number" id="v-reliance-threshold" class="vault-input" placeholder="1000" min="0" style="padding-left:24px;">
    </div>
    <p class="vault-why">This protects you if a user blindly trusts your AI for a massive financial decision and loses money. We use this to cap the 'Prohibited Reliance' clause in your Terms of Service. Market Standard: $1,000 to $5,000 is a common threshold for 'material financial impact'.</p>
</div>

<div style="display:flex;justify-content:flex-end;margin-top:24px;">
    <button class="vault-nav-btn vault-btn-primary" onclick="window.vaultNext()">Next: Tech Stack &amp; AI Memory →</button>
</div>`
    },

    // ─────────────────────────────────────────────────────────────────
    // MODULE 2: THE TECH STACK & AI MEMORY (Q1–Q4)
    // Engine: processing_architecture flag, sub-processor transparency,
    //         DPA §4 RAG mandate, DPA §12.2, Schedule C population.
    // ─────────────────────────────────────────────────────────────────
    2: {
        title: "Tech Stack & AI Memory",
        sub:   "Maps your physical data flows to determine copyright liability, disgorgement risk, and sub-processor transparency.",
        html: `
<div class="vault-section">
    <div class="vault-section-title">Q1 — AI Memory Architecture (The Disgorgement Trap)</div>
    <div style="display:flex;flex-direction:column;gap:10px;">
        <label style="display:flex;align-items:flex-start;gap:12px;cursor:pointer;padding:12px;border:1px solid #1A1A1A;background:#050505;">
            <input type="radio" name="v-memory" id="v-memory-rag" value="rag" style="width:16px;height:16px;accent-color:#C5A059;flex-shrink:0;margin-top:2px;">
            <div><span style="font-size:12px;color:#EAE8E3;font-weight:600;">Strictly RAG (Retrieval-Augmented Generation)</span><p style="font-size:11px;color:rgba(234,232,227,.45);margin-top:2px;">The AI model's weights never change or learn from user data.</p></div>
        </label>
        <label style="display:flex;align-items:flex-start;gap:12px;cursor:pointer;padding:12px;border:1px solid #1A1A1A;background:#050505;">
            <input type="radio" name="v-memory" id="v-memory-stateless" value="stateless" style="width:16px;height:16px;accent-color:#C5A059;flex-shrink:0;margin-top:2px;">
            <div><span style="font-size:12px;color:#EAE8E3;font-weight:600;">Stateless / Pass-Through</span><p style="font-size:11px;color:rgba(234,232,227,.45);margin-top:2px;">We don't store user vectors or train models; data just passes through the API.</p></div>
        </label>
        <label style="display:flex;align-items:flex-start;gap:12px;cursor:pointer;padding:12px;border:1px solid rgba(239,68,68,.2);background:#050505;">
            <input type="radio" name="v-memory" id="v-memory-finetuning" value="finetuning" style="width:16px;height:16px;accent-color:#C5A059;flex-shrink:0;margin-top:2px;">
            <div><span style="font-size:12px;color:#EAE8E3;font-weight:600;">Fine-Tuning (Model Training) ⚠️</span><p style="font-size:11px;color:rgba(234,232,227,.45);margin-top:2px;">We actively use customer data to train or adjust the neural weights of the AI model.</p></div>
        </label>
    </div>
    <p class="vault-why"><strong>Warning:</strong> If you select Fine-Tuning, you cannot mathematically delete a user's data from the model if they request it under GDPR or CCPA. If you select RAG or Stateless, we will inject the 'RAG-Only Mandate' to give you the ultimate compliance shield against FTC algorithmic disgorgement.</p>
</div>

<div class="vault-section">
    <div class="vault-section-title">Q2 — Upstream Model Infrastructure</div>
    <div style="display:flex;flex-direction:column;gap:10px;">
        <label style="display:flex;align-items:flex-start;gap:12px;cursor:pointer;padding:12px;border:1px solid #1A1A1A;background:#050505;">
            <input type="radio" name="v-models" id="v-models-thirdparty" value="thirdparty" style="width:16px;height:16px;accent-color:#C5A059;flex-shrink:0;margin-top:2px;">
            <div><span style="font-size:12px;color:#EAE8E3;font-weight:600;">Third-Party APIs Only</span><p style="font-size:11px;color:rgba(234,232,227,.45);margin-top:2px;">We route data to external providers (e.g. OpenAI, Anthropic, Google).</p></div>
        </label>
        <label style="display:flex;align-items:flex-start;gap:12px;cursor:pointer;padding:12px;border:1px solid #1A1A1A;background:#050505;">
            <input type="radio" name="v-models" id="v-models-selfhosted" value="selfhosted" style="width:16px;height:16px;accent-color:#C5A059;flex-shrink:0;margin-top:2px;">
            <div><span style="font-size:12px;color:#EAE8E3;font-weight:600;">Strictly Self-Hosted / Open Source</span><p style="font-size:11px;color:rgba(234,232,227,.45);margin-top:2px;">We host the models entirely on our own cloud infrastructure.</p></div>
        </label>
        <label style="display:flex;align-items:flex-start;gap:12px;cursor:pointer;padding:12px;border:1px solid #1A1A1A;background:#050505;">
            <input type="radio" name="v-models" id="v-models-hybrid" value="hybrid" style="width:16px;height:16px;accent-color:#C5A059;flex-shrink:0;margin-top:2px;">
            <div><span style="font-size:12px;color:#EAE8E3;font-weight:600;">Hybrid</span><p style="font-size:11px;color:rgba(234,232,227,.45);margin-top:2px;">We use both APIs and self-hosted models.</p></div>
        </label>
    </div>
    <p class="vault-why">If you use Third-Party APIs, we will inject clauses that deflect liability for model bias, copyright infringement, and outages directly onto OpenAI/Anthropic. If you self-host, you must legally own those risks yourself.</p>
</div>

<div class="vault-section">
    <div class="vault-section-title">Q3 — AI Sub-Processors</div>
    <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:12px;">
        <label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-size:12px;color:rgba(234,232,227,.8);"><input type="checkbox" id="v-sub-openai" style="width:16px;height:16px;accent-color:#C5A059;"> OpenAI</label>
        <label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-size:12px;color:rgba(234,232,227,.8);"><input type="checkbox" id="v-sub-anthropic" style="width:16px;height:16px;accent-color:#C5A059;"> Anthropic</label>
        <label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-size:12px;color:rgba(234,232,227,.8);"><input type="checkbox" id="v-sub-google" style="width:16px;height:16px;accent-color:#C5A059;"> Google (Gemini / Vertex)</label>
        <label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-size:12px;color:rgba(234,232,227,.8);"><input type="checkbox" id="v-sub-cohere" style="width:16px;height:16px;accent-color:#C5A059;"> Cohere</label>
        <label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-size:12px;color:rgba(234,232,227,.8);"><input type="checkbox" id="v-sub-mistral" style="width:16px;height:16px;accent-color:#C5A059;"> Mistral AI</label>
    </div>
    <div style="margin-bottom:12px;">
        <label class="vault-label">Other provider (if any)</label>
        <input type="text" id="v-sub-other" class="vault-input" placeholder="e.g. Meta Llama API, Cohere Enterprise">
    </div>
    <div>
        <label class="vault-label">Sub-Processor List URL (if published)</label>
        <input type="url" id="v-sub-url" class="vault-input" placeholder="e.g. https://yourcompany.com/subprocessors">
    </div>
    <p class="vault-why">Privacy laws require you to list exactly who processes user data. We will inject these selections into your Privacy Policy and Data Processing Agreement.</p>
</div>

<div class="vault-section">
    <div class="vault-section-title">Q4 — Cloud &amp; Memory Sub-Processors</div>
    <div style="margin-bottom:14px;">
        <label class="vault-label">Cloud Hosting Provider</label>
        <input type="text" id="v-cloud-host" class="vault-input" placeholder="e.g. AWS, Google Cloud Platform, Azure">
    </div>
    <div>
        <label class="vault-label">Vector Database Provider</label>
        <input type="text" id="v-vector-db" class="vault-input" placeholder="e.g. Pinecone, Weaviate, Chroma, Qdrant">
    </div>
    <p class="vault-why">This satisfies your GDPR and CCPA transparency requirements. List your core hosting and database providers so we can populate your Approved Sub-Processors list.</p>
</div>

<div style="display:flex;justify-content:space-between;margin-top:24px;gap:12px;flex-wrap:wrap;">
    <button class="vault-nav-btn vault-btn-secondary" onclick="window.vaultBack()">← Back</button>
    <button class="vault-nav-btn vault-btn-primary" onclick="window.vaultNext()">Next: The AI Archetypes →</button>
</div>`
    },

    // ─────────────────────────────────────────────────────────────────
    // MODULE 3: THE AI ARCHETYPES (Q1a, Q1b conditional, Q2–Q5)
    // Engine: is_doer, is_orchestrator, agent_limits, is_creator,
    //         is_reader, conversational_ui, sens_bio, is_judge,
    //         is_optimizer, is_shield, is_mover, is_generalist flags.
    // ─────────────────────────────────────────────────────────────────
    3: {
        title: "The AI Archetypes",
        sub:   "Maps your AI capabilities to precise statutory triggers and liability shields.",
        html: `
<div style="background:rgba(197,160,89,.04);border:1px solid rgba(197,160,89,.2);padding:12px 16px;margin-bottom:20px;">
    <p style="font-size:11px;color:rgba(234,232,227,.7);line-height:1.7;">AI use cases evolve daily. To ensure your contract generates the absolute maximum legal armor, select ALL capabilities that remotely apply to your system today — or that you plan to launch in the next 3 months. <strong style="color:#C5A059;">When in doubt, check the box.</strong></p>
</div>

<div class="vault-section">
    <div class="vault-section-title">Q1a — Autonomous &amp; Agentic Capabilities</div>
    <p style="font-size:11px;color:rgba(234,232,227,.5);margin-bottom:12px;">Can your AI take actions on its own without a human clicking 'Approve' every single time?</p>
    <div style="display:flex;flex-direction:column;gap:10px;">
        <label style="display:flex;align-items:flex-start;gap:12px;cursor:pointer;padding:12px;border:1px solid rgba(197,160,89,.25);border-left:3px solid #C5A059;background:#050505;">
            <input type="checkbox" id="v-doer" style="width:16px;height:16px;accent-color:#C5A059;flex-shrink:0;margin-top:2px;">
            <div><span style="font-size:12px;color:#C5A059;font-weight:700;">Takes Action (The Doer)</span><p style="font-size:11px;color:rgba(234,232,227,.45);margin-top:2px;">Executes tasks, triggers webhooks, spends money.</p></div>
        </label>
        <label style="display:flex;align-items:flex-start;gap:12px;cursor:pointer;padding:12px;border:1px solid rgba(197,160,89,.25);border-left:3px solid #C5A059;background:#050505;">
            <input type="checkbox" id="v-orchestrator" style="width:16px;height:16px;accent-color:#C5A059;flex-shrink:0;margin-top:2px;">
            <div><span style="font-size:12px;color:#C5A059;font-weight:700;">Manages Agents (The Orchestrator)</span><p style="font-size:11px;color:rgba(234,232,227,.45);margin-top:2px;">Deploys / manages other agents.</p></div>
        </label>
    </div>
    <p class="vault-why">If your AI can act on its own, you are legally exposed to 'rogue bot' liability. Checking these boxes attaches the Agentic Addendum to shift the liability of infinite loops and unauthorized spend back to the user.</p>
</div>

<div id="v-agent-fields" class="vault-agent-fields" style="display:none;">
    <div class="vault-section" style="border-color:rgba(197,160,89,.2);">
        <div class="vault-section-title" style="color:#C5A059;">Q1b — Agent Guardrails &amp; Circuit-Breaker Limits</div>
        <p style="font-size:11px;color:rgba(234,232,227,.5);margin-bottom:14px;">Because your AI can take autonomous actions, we must establish hard circuit-breaker limits to protect you from runaway agent liability. What are your defaults?</p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div>
                <label class="vault-label">Max Per-Session Spend Limit</label>
                <div style="position:relative;"><span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:rgba(234,232,227,.35);font-size:12px;">$</span><input type="text" id="v-spend-session" class="vault-input" placeholder="e.g. 50" style="padding-left:22px;"></div>
            </div>
            <div>
                <label class="vault-label">Max Per-Period Spend (Monthly)</label>
                <div style="position:relative;"><span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:rgba(234,232,227,.35);font-size:12px;">$</span><input type="text" id="v-spend-period" class="vault-input" placeholder="e.g. 500" style="padding-left:22px;"></div>
            </div>
            <div>
                <label class="vault-label">Max API Retry Limit</label>
                <input type="text" id="v-retry-limit" class="vault-input" placeholder="e.g. 3">
            </div>
            <div>
                <label class="vault-label">Infinite Loop Auto-Pause Threshold</label>
                <input type="text" id="v-loop-threshold" class="vault-input" placeholder="e.g. 5 identical cycles">
            </div>
        </div>
        <p class="vault-why">If your agent malfunctions and spends $10,000 on a third-party API, you are liable unless you have these strict limits contractually enforced. Enter your baseline default limits. Market Standards: $50 per session, $500 per month, 3 max retries, 5 identical loop cycles.</p>
    </div>
</div>

<div class="vault-section">
    <div class="vault-section-title">Q2 — Content &amp; IP Capabilities</div>
    <p style="font-size:11px;color:rgba(234,232,227,.5);margin-bottom:12px;">Does your AI generate novel media, write code, or ingest massive amounts of external web data?</p>
    <div style="display:flex;flex-direction:column;gap:10px;">
        <label style="display:flex;align-items:flex-start;gap:12px;cursor:pointer;padding:12px;border:1px solid #1A1A1A;background:#050505;">
            <input type="checkbox" id="v-creator" style="width:16px;height:16px;accent-color:#C5A059;flex-shrink:0;margin-top:2px;">
            <div><span style="font-size:12px;color:#EAE8E3;font-weight:600;">Generates Media (The Creator)</span><p style="font-size:11px;color:rgba(234,232,227,.45);margin-top:2px;">Generates images, video, audio, or code.</p></div>
        </label>
        <label style="display:flex;align-items:flex-start;gap:12px;cursor:pointer;padding:12px;border:1px solid #1A1A1A;background:#050505;">
            <input type="checkbox" id="v-reader" style="width:16px;height:16px;accent-color:#C5A059;flex-shrink:0;margin-top:2px;">
            <div><span style="font-size:12px;color:#EAE8E3;font-weight:600;">Ingests External Data (The Reader)</span><p style="font-size:11px;color:rgba(234,232,227,.45);margin-top:2px;">Scrapes websites or reads external URLs for RAG pipelines.</p></div>
        </label>
    </div>
    <p class="vault-why">This triggers your Intellectual Property shields. If you generate media, we must void copyright guarantees. If you scrape, we must force the user to guarantee they own the rights to the links they provide.</p>
</div>

<div class="vault-section">
    <div class="vault-section-title">Q3 — Interaction &amp; Analysis</div>
    <p style="font-size:11px;color:rgba(234,232,227,.5);margin-bottom:12px;">How does your AI communicate with users, and does it analyze their physical traits?</p>
    <div style="display:flex;flex-direction:column;gap:10px;">
        <label style="display:flex;align-items:flex-start;gap:12px;cursor:pointer;padding:12px;border:1px solid #1A1A1A;background:#050505;">
            <input type="checkbox" id="v-companion" style="width:16px;height:16px;accent-color:#C5A059;flex-shrink:0;margin-top:2px;">
            <div><span style="font-size:12px;color:#EAE8E3;font-weight:600;">Conversational (The Companion)</span><p style="font-size:11px;color:rgba(234,232,227,.45);margin-top:2px;">Uses a chatbot or voicebot interface; builds ongoing relationships.</p></div>
        </label>
        <label style="display:flex;align-items:flex-start;gap:12px;cursor:pointer;padding:12px;border:1px solid #1A1A1A;background:#050505;">
            <input type="checkbox" id="v-biometrics" style="width:16px;height:16px;accent-color:#C5A059;flex-shrink:0;margin-top:2px;">
            <div><span style="font-size:12px;color:#EAE8E3;font-weight:600;">Processes Biometrics (The Translator)</span><p style="font-size:11px;color:rgba(234,232,227,.45);margin-top:2px;">Processes voice audio for diarization / voiceprints, or facial geometry scans.</p></div>
        </label>
    </div>
    <p class="vault-why">Conversational interfaces trigger the EU AI Act's transparency mandate and California's SB 243 minor protection rules. Biometrics trigger strict BIPA compliance ($1,000–$5,000 per violation, per person). Check these to inject the required legal disclosures.</p>
</div>

<div class="vault-section">
    <div class="vault-section-title">Q4 — High-Stakes Decision Making</div>
    <p style="font-size:11px;color:rgba(234,232,227,.5);margin-bottom:12px;">Does your AI evaluate humans, provide professional advice, or optimize high-stakes systems?</p>
    <div style="display:flex;flex-direction:column;gap:10px;">
        <label style="display:flex;align-items:flex-start;gap:12px;cursor:pointer;padding:12px;border:1px solid rgba(239,68,68,.2);background:#050505;">
            <input type="checkbox" id="v-judge" style="width:16px;height:16px;accent-color:#C5A059;flex-shrink:0;margin-top:2px;">
            <div><span style="font-size:12px;color:#EAE8E3;font-weight:600;">Evaluates Humans / Risk (The Judge)</span><p style="font-size:11px;color:rgba(234,232,227,.45);margin-top:2px;">Scores performance, drafts legal contracts, approves credit or housing decisions.</p></div>
        </label>
        <label style="display:flex;align-items:flex-start;gap:12px;cursor:pointer;padding:12px;border:1px solid rgba(239,68,68,.2);background:#050505;">
            <input type="checkbox" id="v-optimizer" style="width:16px;height:16px;accent-color:#C5A059;flex-shrink:0;margin-top:2px;">
            <div><span style="font-size:12px;color:#EAE8E3;font-weight:600;">Optimizes Systems (The Optimizer)</span><p style="font-size:11px;color:rgba(234,232,227,.45);margin-top:2px;">Suggests financial trades, manages grid traffic, or controls critical infrastructure.</p></div>
        </label>
    </div>
    <p class="vault-why"><strong>Warning:</strong> These are classified as 'High-Risk' under the EU AI Act and US State Laws. Selecting these injects mandatory human-in-the-loop (HITL) disclaimers and Acceptable Use Policy restrictions to keep you out of court.</p>
</div>

<div class="vault-section">
    <div class="vault-section-title">Q5 — Physical &amp; Security Layer</div>
    <p style="font-size:11px;color:rgba(234,232,227,.5);margin-bottom:12px;">Does your AI interact with cybersecurity systems or physical hardware?</p>
    <div style="display:flex;flex-direction:column;gap:10px;">
        <label style="display:flex;align-items:flex-start;gap:12px;cursor:pointer;padding:12px;border:1px solid #1A1A1A;background:#050505;">
            <input type="checkbox" id="v-shield" style="width:16px;height:16px;accent-color:#C5A059;flex-shrink:0;margin-top:2px;">
            <div><span style="font-size:12px;color:#EAE8E3;font-weight:600;">Cybersecurity / Moderation (The Shield)</span><p style="font-size:11px;color:rgba(234,232,227,.45);margin-top:2px;">Moderates content, detects malware, or audits enterprise environments.</p></div>
        </label>
        <label style="display:flex;align-items:flex-start;gap:12px;cursor:pointer;padding:12px;border:1px solid #1A1A1A;background:#050505;">
            <input type="checkbox" id="v-mover" style="width:16px;height:16px;accent-color:#C5A059;flex-shrink:0;margin-top:2px;">
            <div><span style="font-size:12px;color:#EAE8E3;font-weight:600;">Hardware Control (The Mover)</span><p style="font-size:11px;color:rgba(234,232,227,.45);margin-top:2px;">Pilots drones, controls IoT hardware, or navigates physical spaces.</p></div>
        </label>
        <label style="display:flex;align-items:flex-start;gap:12px;cursor:pointer;padding:12px;border:1px solid #1A1A1A;background:#050505;">
            <input type="checkbox" id="v-generalist" style="width:16px;height:16px;accent-color:#C5A059;flex-shrink:0;margin-top:2px;">
            <div><span style="font-size:12px;color:#EAE8E3;font-weight:600;">Universal Catch-All (The Generalist)</span><p style="font-size:11px;color:rgba(234,232,227,.45);margin-top:2px;">General text / data processing that does not fit the above categories.</p></div>
        </label>
    </div>
    <p class="vault-why">If your AI touches security or hardware, a failure can cause catastrophic damage. Checking these injects our 'False Negative' and 'Strict Product Liability' caps to protect you from bodily injury or hacking lawsuits.</p>
</div>

<div style="display:flex;justify-content:space-between;margin-top:24px;gap:12px;flex-wrap:wrap;">
    <button class="vault-nav-btn vault-btn-secondary" onclick="window.vaultBack()">← Back</button>
    <button class="vault-nav-btn vault-btn-primary" onclick="window.vaultNext()">Next: Compliance Exposures →</button>
</div>`
    },

    // ─────────────────────────────────────────────────────────────────
    // MODULE 4: THE COMPLIANCE EXPOSURES (Q1–Q4)
    // Engine: eu_users / ca_users SCC injection, DPA activation,
    //         Tier 2 AUP blocks, COPPA / crisis escalation mandates.
    // ─────────────────────────────────────────────────────────────────
    4: {
        title: "Compliance Exposures",
        sub:   "Maps your regulatory blast radius across privacy, sensitive data, and vulnerable populations.",
        html: `
<div class="vault-section">
    <div class="vault-section-title">Q1 — Privacy Gateway (The PII Trigger)</div>
    <div style="display:flex;flex-direction:column;gap:10px;">
        <label style="display:flex;align-items:flex-start;gap:12px;cursor:pointer;padding:12px;border:1px solid #1A1A1A;background:#050505;">
            <input type="radio" name="v-pii" id="v-pii-yes" value="yes" style="width:16px;height:16px;accent-color:#C5A059;flex-shrink:0;margin-top:2px;">
            <div><span style="font-size:12px;color:#EAE8E3;font-weight:600;">Yes — We process PII</span><p style="font-size:11px;color:rgba(234,232,227,.45);margin-top:2px;">We process names, emails, IPs, or user-generated text containing personal data.</p></div>
        </label>
        <label style="display:flex;align-items:flex-start;gap:12px;cursor:pointer;padding:12px;border:1px solid #1A1A1A;background:#050505;">
            <input type="radio" name="v-pii" id="v-pii-no" value="no" style="width:16px;height:16px;accent-color:#C5A059;flex-shrink:0;margin-top:2px;">
            <div><span style="font-size:12px;color:#EAE8E3;font-weight:600;">No — Entirely Anonymous</span><p style="font-size:11px;color:rgba(234,232,227,.45);margin-top:2px;">Our service is entirely anonymous or only processes machine data.</p></div>
        </label>
    </div>
    <p class="vault-why">If you require users to create an account with an email address, you process personal data. Checking 'Yes' automatically builds your GDPR and CCPA-compliant Privacy Policy and Data Processing Agreement.</p>
</div>

<div class="vault-section">
    <div class="vault-section-title">Q2 — Jurisdictional Blast Radius</div>
    <p style="font-size:11px;color:rgba(234,232,227,.5);margin-bottom:12px;">Where do your end-users (or your clients' end-users) reside?</p>
    <div style="display:flex;flex-direction:column;gap:10px;">
        <label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-size:12px;color:rgba(234,232,227,.8);"><input type="checkbox" id="v-eu" style="width:16px;height:16px;accent-color:#C5A059;"> Europe (EEA / UK / Switzerland)</label>
        <label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-size:12px;color:rgba(234,232,227,.8);"><input type="checkbox" id="v-ca" style="width:16px;height:16px;accent-color:#C5A059;"> California</label>
        <label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-size:12px;color:rgba(234,232,227,.8);"><input type="checkbox" id="v-other-regions" style="width:16px;height:16px;accent-color:#C5A059;"> Other US States / Rest of World</label>
    </div>
    <p class="vault-why">Don't guess. If your app is available on the global internet and you don't actively geo-block Europe or California, check the boxes so we can build your international data transfer mechanisms (SCCs).</p>
</div>

<div class="vault-section">
    <div class="vault-section-title">Q3 — Sensitive &amp; Regulated Data</div>
    <p style="font-size:11px;color:rgba(234,232,227,.5);margin-bottom:12px;">Does your AI process any of the following highly regulated data types?</p>
    <div style="display:flex;flex-direction:column;gap:10px;">
        <label style="display:flex;align-items:flex-start;gap:10px;cursor:pointer;padding:12px;border:1px solid rgba(239,68,68,.15);background:#050505;">
            <input type="checkbox" id="v-sens-health" class="v-sens-check" style="width:16px;height:16px;accent-color:#C5A059;flex-shrink:0;margin-top:2px;">
            <div><span style="font-size:12px;color:#EAE8E3;font-weight:600;">Medical &amp; Biometric</span><p style="font-size:11px;color:rgba(234,232,227,.45);margin-top:2px;">PHI (HIPAA), medical histories, biometric scans.</p></div>
        </label>
        <label style="display:flex;align-items:flex-start;gap:10px;cursor:pointer;padding:12px;border:1px solid rgba(239,68,68,.15);background:#050505;">
            <input type="checkbox" id="v-sens-fin" class="v-sens-check" style="width:16px;height:16px;accent-color:#C5A059;flex-shrink:0;margin-top:2px;">
            <div><span style="font-size:12px;color:#EAE8E3;font-weight:600;">Financial</span><p style="font-size:11px;color:rgba(234,232,227,.45);margin-top:2px;">Bank details, credit histories, non-public trading data.</p></div>
        </label>
        <label style="display:flex;align-items:flex-start;gap:10px;cursor:pointer;padding:12px;border:1px solid rgba(239,68,68,.15);background:#050505;">
            <input type="checkbox" id="v-sens-employment" class="v-sens-check" style="width:16px;height:16px;accent-color:#C5A059;flex-shrink:0;margin-top:2px;">
            <div><span style="font-size:12px;color:#EAE8E3;font-weight:600;">Employment / HR</span><p style="font-size:11px;color:rgba(234,232,227,.45);margin-top:2px;">Resumes, performance evaluations, employee monitoring.</p></div>
        </label>
        <label style="display:flex;align-items:flex-start;gap:10px;cursor:pointer;padding:12px;border:1px solid #1A1A1A;background:#050505;">
            <input type="checkbox" id="v-sens-none" style="width:16px;height:16px;accent-color:#C5A059;flex-shrink:0;margin-top:2px;">
            <div><span style="font-size:12px;color:rgba(234,232,227,.5);">None of the Above</span></div>
        </label>
    </div>
    <p class="vault-why">Processing this data places your AI in a 'High-Risk' regulatory category. We will inject mandatory Acceptable Use Policy blocks forcing your users to comply with specific laws (like HIPAA or strict financial regulations).</p>
</div>

<div class="vault-section">
    <div class="vault-section-title">Q4 — Vulnerable Populations &amp; Safety Shields</div>
    <p style="font-size:11px;color:rgba(234,232,227,.5);margin-bottom:12px;">Does your AI interact directly with minors, or is it designed for users in crisis?</p>
    <div style="display:flex;flex-direction:column;gap:10px;">
        <label style="display:flex;align-items:flex-start;gap:10px;cursor:pointer;padding:12px;border:1px solid rgba(239,68,68,.15);background:#050505;">
            <input type="checkbox" id="v-minors" class="v-vuln-check" style="width:16px;height:16px;accent-color:#C5A059;flex-shrink:0;margin-top:2px;">
            <div><span style="font-size:12px;color:#EAE8E3;font-weight:600;">Minors</span><p style="font-size:11px;color:rgba(234,232,227,.45);margin-top:2px;">Directed at, or reasonably likely to be used by, children under 18.</p></div>
        </label>
        <label style="display:flex;align-items:flex-start;gap:10px;cursor:pointer;padding:12px;border:1px solid rgba(239,68,68,.15);background:#050505;">
            <input type="checkbox" id="v-distress" class="v-vuln-check" style="width:16px;height:16px;accent-color:#C5A059;flex-shrink:0;margin-top:2px;">
            <div><span style="font-size:12px;color:#EAE8E3;font-weight:600;">Consumers in Distress</span><p style="font-size:11px;color:rgba(234,232,227,.45);margin-top:2px;">Mental health companion, addiction counselor, financial crisis support.</p></div>
        </label>
        <label style="display:flex;align-items:flex-start;gap:10px;cursor:pointer;padding:12px;border:1px solid #1A1A1A;background:#050505;">
            <input type="checkbox" id="v-standard-adults" style="width:16px;height:16px;accent-color:#C5A059;flex-shrink:0;margin-top:2px;">
            <div><span style="font-size:12px;color:rgba(234,232,227,.5);">Standard Adults Only</span><p style="font-size:11px;color:rgba(234,232,227,.35);margin-top:2px;">Our service is exclusively for adults with no vulnerability exposure.</p></div>
        </label>
    </div>
    <p class="vault-why">Interacting with minors or distressed users triggers strict safety laws like COPPA. Checking these injects legal pathways shifting the compliance burden to the deployer and mandating crisis escalation protocols.</p>
</div>

<div class="vault-section" style="background:rgba(197,160,89,.04);border-color:rgba(197,160,89,.2);">
    <div style="font-size:10px;color:#C5A059;text-transform:uppercase;letter-spacing:.12em;font-weight:700;margin-bottom:12px;">What happens next</div>
    <div style="font-size:11px;color:rgba(234,232,227,.6);line-height:1.8;">
        <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:8px;"><span style="color:#C5A059;font-weight:700;flex-shrink:0;">01</span><span>Your Vault is sealed and transmitted to the Architect.</span></div>
        <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:8px;"><span style="color:#C5A059;font-weight:700;flex-shrink:0;">02</span><span>Your 48-hour SLA clock starts immediately.</span></div>
        <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:8px;"><span style="color:#C5A059;font-weight:700;flex-shrink:0;">03</span><span>Each clause is calibrated to your specific configuration.</span></div>
        <div style="display:flex;align-items:flex-start;gap:10px;"><span style="color:#C5A059;font-weight:700;flex-shrink:0;">04</span><span>You receive a notification when your Shields are ready.</span></div>
    </div>
</div>

<div style="display:flex;justify-content:space-between;align-items:center;margin-top:28px;padding-top:20px;border-top:1px solid #1A1A1A;gap:12px;flex-wrap:wrap;">
    <button class="vault-nav-btn vault-btn-secondary" onclick="window.vaultBack()">← Back</button>
    <button id="btn-submit-vault" class="vault-nav-btn vault-btn-primary" onclick="window.vaultSubmit()"
        style="padding:16px 32px;font-size:11px;box-shadow:0 0 24px rgba(197,160,89,.2);">
        Submit to The Architect →
    </button>
</div>
<p style="font-size:9px;color:rgba(234,232,227,.2);text-align:center;margin-top:16px;line-height:1.5;">
    Submission is binding. Your 48-hour SLA clock begins upon receipt.<br>
    All documents are Review-Ready Drafts requiring local counsel validation.
</p>`
    }
};

// ── PHASE FIELDS (non-radio fields only — radios handled separately) ───
const PHASE_FIELDS = {
    1: [
        "v-company","v-entity-type","v-address","v-legal-email","v-privacy-email",
        "v-jurisdiction-country","v-jurisdiction-state",
        "v-delivery-app","v-delivery-api",
        "v-revenue-model","v-acv","v-beta",
        "v-int-slack","v-int-crm","v-int-stripe","v-int-github","v-int-webhooks","v-int-none",
        "v-reliance-threshold"
    ],
    2: [
        "v-sub-openai","v-sub-anthropic","v-sub-google","v-sub-cohere","v-sub-mistral",
        "v-sub-other","v-sub-url","v-cloud-host","v-vector-db"
    ],
    3: [
        "v-doer","v-orchestrator",
        "v-spend-session","v-spend-period","v-retry-limit","v-loop-threshold",
        "v-creator","v-reader","v-companion","v-biometrics",
        "v-judge","v-optimizer","v-shield","v-mover","v-generalist"
    ],
    4: [
        "v-eu","v-ca","v-other-regions",
        "v-sens-health","v-sens-fin","v-sens-employment","v-sens-none",
        "v-minors","v-distress","v-standard-adults"
    ]
};

// Radio group names keyed by phase
const RADIO_GROUPS_BY_PHASE = {
    1: ["v-market","v-output-ownership","v-sla-type"],
    2: ["v-memory","v-models"],
    3: [],
    4: ["v-pii"]
};

// ── RENDER PHASE ──────────────────────────────────────────────────────
function showPhase(n) {
    for (let i = 1; i <= TOTAL_PHASES; i++) {
        const el = document.getElementById(`vault-phase-${i}`);
        if (el) el.style.display = i === n ? "block" : "none";
    }
    const phase = PHASES[n];
    if (!phase) return;

    const phaseEl = document.getElementById(`vault-phase-${n}`);
    if (phaseEl) phaseEl.innerHTML = phase.html;

    const titleEl = document.getElementById("vault-phase-title");
    const subEl   = document.getElementById("vault-phase-sub");
    const indEl   = document.getElementById("vault-phase-indicator");
    const progEl  = document.getElementById("vault-progress");

    if (titleEl) titleEl.textContent = phase.title;
    if (subEl)   subEl.textContent   = phase.sub;
    if (indEl)   indEl.textContent   = n;
    if (progEl)  progEl.style.width  = (n / TOTAL_PHASES * 100) + "%";

    // Phase-specific post-render hooks
    if (n === 1) {
        const pl = document.getElementById("v-product-list");
        if (pl) pl.innerHTML = buildProductEntries();
        attachIntegrationExclusive();
    }
    if (n === 3) attachDoerToggle();
    if (n === 4) { attachSensDataExclusive(); attachVulnExclusive(); }

    restoreValues(n);

    const wrap = document.getElementById("vault-wrap");
    if (wrap) wrap.scrollIntoView({ behavior: "smooth", block: "start" });

    hideError();
    currentPhase = n;
}

// ── NAVIGATION ────────────────────────────────────────────────────────
window.vaultNext = function () {
    if (!validatePhase(currentPhase)) return;
    saveValues(currentPhase);
    if (currentPhase < TOTAL_PHASES) showPhase(currentPhase + 1);
};

window.vaultBack = function () {
    saveValues(currentPhase);
    if (currentPhase > 1) showPhase(currentPhase - 1);
};

// ── SAVE / RESTORE ────────────────────────────────────────────────────
function saveValues(phase) {
    (PHASE_FIELDS[phase] || []).forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        vaultStore[id] = el.type === "checkbox" ? el.checked : el.value;
    });
    (RADIO_GROUPS_BY_PHASE[phase] || []).forEach(name => {
        const chk = document.querySelector(`input[name="${name}"]:checked`);
        if (chk) vaultStore[`radio_${name}`] = chk.value;
    });
    if (phase === 1) syncProductList();
}

function restoreValues(phase) {
    (PHASE_FIELDS[phase] || []).forEach(id => {
        const el = document.getElementById(id);
        if (!el || vaultStore[id] === undefined) return;
        if (el.type === "checkbox") el.checked = vaultStore[id];
        else el.value = vaultStore[id];
    });
    (RADIO_GROUPS_BY_PHASE[phase] || []).forEach(name => {
        const saved = vaultStore[`radio_${name}`];
        if (!saved) return;
        const el = document.querySelector(`input[name="${name}"][value="${saved}"]`);
        if (el) el.checked = true;
    });
    if (phase === 3) {
        const doerChk = document.getElementById("v-doer");
        if (doerChk && doerChk.checked) {
            const af = document.getElementById("v-agent-fields");
            if (af) af.style.display = "block";
        }
    }
}

// ── EXCLUSIVE CHECKBOX HANDLERS ───────────────────────────────────────
function attachIntegrationExclusive() {
    const noneEl = document.getElementById("v-int-none");
    if (!noneEl) return;
    noneEl.addEventListener("change", () => {
        if (noneEl.checked) {
            document.querySelectorAll(".v-int-check").forEach(el => { el.checked = false; });
        }
    });
    document.querySelectorAll(".v-int-check").forEach(el => {
        el.addEventListener("change", () => { if (el.checked && noneEl) noneEl.checked = false; });
    });
}

function attachSensDataExclusive() {
    const noneEl = document.getElementById("v-sens-none");
    if (!noneEl) return;
    noneEl.addEventListener("change", () => {
        if (noneEl.checked) document.querySelectorAll(".v-sens-check").forEach(el => { el.checked = false; });
    });
    document.querySelectorAll(".v-sens-check").forEach(el => {
        el.addEventListener("change", () => { if (el.checked && noneEl) noneEl.checked = false; });
    });
}

function attachVulnExclusive() {
    const stdEl = document.getElementById("v-standard-adults");
    if (!stdEl) return;
    stdEl.addEventListener("change", () => {
        if (stdEl.checked) document.querySelectorAll(".v-vuln-check").forEach(el => { el.checked = false; });
    });
    document.querySelectorAll(".v-vuln-check").forEach(el => {
        el.addEventListener("change", () => { if (el.checked && stdEl) stdEl.checked = false; });
    });
}

function attachDoerToggle() {
    const doerChk = document.getElementById("v-doer");
    if (!doerChk) return;
    doerChk.addEventListener("change", () => {
        const af = document.getElementById("v-agent-fields");
        if (af) {
            af.style.display = doerChk.checked ? "block" : "none";
            if (!doerChk.checked) {
                ["v-spend-session","v-spend-period","v-retry-limit","v-loop-threshold"].forEach(id => {
                    const el = document.getElementById(id);
                    if (el) el.value = "";
                });
            }
        }
    });
}

// ── VALIDATION ────────────────────────────────────────────────────────
function validatePhase(phase) {
    if (phase === 1) {
        const co = document.getElementById("v-company")?.value?.trim();
        if (!co)  { showError("Company Legal Name is required (Q1)."); return false; }
        const le = document.getElementById("v-legal-email")?.value?.trim();
        if (!le)  { showError("Designated Legal Notice Email is required (Q1)."); return false; }
        const pe = document.getElementById("v-privacy-email")?.value?.trim();
        if (!pe)  { showError("Privacy / Data Protection Contact Email is required (Q1)."); return false; }
        syncProductList();
        if (!productList[0]?.name) { showError("At least one Product Name is required (Q2)."); return false; }
        const jc = document.getElementById("v-jurisdiction-country")?.value?.trim();
        if (!jc)  { showError("Jurisdiction Country is required (Q3)."); return false; }
        if (!document.querySelector('input[name="v-market"]:checked')) {
            showError("Please select your Market Exposure — B2B, B2C, or Hybrid (Q4)."); return false;
        }
        const da = document.getElementById("v-delivery-app")?.checked;
        const dapi = document.getElementById("v-delivery-api")?.checked;
        if (!da && !dapi) { showError("Please select at least one Delivery Mechanism (Q5)."); return false; }
        if (!document.getElementById("v-revenue-model")?.value) {
            showError("Please select your Primary Revenue Model (Q6)."); return false;
        }
        if (!document.querySelector('input[name="v-output-ownership"]:checked')) {
            showError("Please select Output Ownership rights (Q7)."); return false;
        }
        if (!document.querySelector('input[name="v-sla-type"]:checked')) {
            showError("Please select your SLA posture (Q8)."); return false;
        }
    }
    if (phase === 2) {
        if (!document.querySelector('input[name="v-memory"]:checked')) {
            showError("Please select your AI Memory Architecture (Q1)."); return false;
        }
        if (!document.querySelector('input[name="v-models"]:checked')) {
            showError("Please select your Upstream Model Infrastructure (Q2)."); return false;
        }
    }
    if (phase === 4) {
        if (!document.querySelector('input[name="v-pii"]:checked')) {
            showError("Please answer the Privacy Gateway question (Q1)."); return false;
        }
    }
    return true;
}

function showError(msg) {
    const el = document.getElementById("vault-error");
    if (el) { el.style.display = "block"; el.textContent = msg; }
}
function hideError() {
    const el = document.getElementById("vault-error");
    if (el) el.style.display = "none";
}

// ── SUBMISSION ─────────────────────────────────────────────────────────
window.vaultSubmit = async function () {
    saveValues(4);

    const btn = document.getElementById("btn-submit-vault");
    if (btn) { btn.textContent = "Encrypting Payload…"; btn.disabled = true; }
    hideError();

    if (!validatePhase(4)) {
        if (btn) { btn.textContent = "Submit to The Architect →"; btn.disabled = false; }
        return;
    }

    syncProductList();

    const g = id => vaultStore[id];
    const r = name => vaultStore[`radio_${name}`];

    const payload = {
        // ── MODULE 1: BASELINE & COMMERCIALS ──────────────────────────
        baseline: {
            company:          (g("v-company") || "").trim() || "Undisclosed Entity",
            entity_type:      g("v-entity-type") || "",
            address:          (g("v-address") || "").trim(),
            legal_email:      (g("v-legal-email") || "").trim(),
            privacy_email:    (g("v-privacy-email") || "").trim(),
            products:         productList,                              // populate(Service_Name_Description) → TOS §1.14, Schedule A
            jurisdiction: {
                country:      (g("v-jurisdiction-country") || "").trim(), // populate(HQ_Location_and_Local_Law) → TOS §7.5
                state:        (g("v-jurisdiction-state") || "").trim()    // populate(Jurisdiction) → TOS §14
            },
            market:           r("v-market") || "",                     // b2b|b2c|hybrid → EXT.08/09 consumer protections
            delivery: {
                app:          !!g("v-delivery-app"),                   // direct GUI
                api:          !!g("v-delivery-api")                    // api → TOS §2.5, AGT §8.5
            },
            revenue_model:    g("v-revenue-model") || "",
            acv:              parseFloat(g("v-acv")) || 0,             // populate(Liability_Floor_Amount) → TOS §9.1
            has_beta:         !!g("v-beta"),                           // inject Free/Beta waiver → TOS §2.6, Schedule B
            output_ownership: r("v-output-ownership") || "",           // full|limited|none → populate(License_Scope) → TOS §6.2
            sla_type:         r("v-sla-type") || "no",                 // no→omit DOC_SLA; standard→inject SLA; custom→inject blank SLA
            integrations: {
                slack:        !!g("v-int-slack"),
                crm:          !!g("v-int-crm"),
                stripe:       !!g("v-int-stripe"),
                github:       !!g("v-int-github"),
                webhooks:     !!g("v-int-webhooks"),
                none:         !!g("v-int-none")                        // → Schedule A integrations, AGT §8.5 reinforcement
            },
            reliance_threshold: parseFloat(g("v-reliance-threshold")) || 1000  // populate(Financial_Threshold) → TOS §5.4
        },

        // ── MODULE 2: TECH STACK & AI MEMORY ──────────────────────────
        architecture: {
            memory:           r("v-memory") || "rag",                  // rag|stateless → inject DPA §4 RAG mandate; finetuning → omit DPA §4, inject opt-in clause TOS §6.1(c)
            models:           r("v-models") || "thirdparty",           // selfhosted → replace_with(selfhosted_def) TOS §1.2, omit TOS §8.5/§8.7
            sub_processors: {
                openai:       !!g("v-sub-openai"),
                anthropic:    !!g("v-sub-anthropic"),
                google:       !!g("v-sub-google"),
                cohere:       !!g("v-sub-cohere"),
                mistral:      !!g("v-sub-mistral"),
                other:        (g("v-sub-other") || "").trim(),
                url:          (g("v-sub-url") || "").trim()            // populate(SubProcessor_Live_URL) → DPA §5.2
            },
            cloud_host:       (g("v-cloud-host") || "").trim(),        // populate(SchedC_Cloud_Hosts) → DPA Schedule C
            vector_db:        (g("v-vector-db") || "").trim()          // populate(SchedC_Vector_DB) → DPA Schedule C
        },

        // ── MODULE 3: ARCHETYPES (engine flag map) ──────────────────
        archetypes: {
            // Q1a — Autonomous & Agentic
            is_doer:           !!g("v-doer"),           // inject TOS §2.7 + entire DOC_AGT
            is_orchestrator:   !!g("v-orchestrator"),   // inject AGT §3.5
            // Q1b — Agent guardrails (conditional)
            agent_limits: {
                session_cap:    (g("v-spend-session") || "").trim(),    // populate(Session_Cap) → AGT §4.1
                period_cap:     (g("v-spend-period") || "").trim(),     // populate(Period_Cap) → AGT §4.2
                retry_limit:    (g("v-retry-limit") || "").trim(),      // populate(Retry_Limit) → AGT §6.2
                loop_threshold: (g("v-loop-threshold") || "").trim()    // populate(Loop_Threshold) → AGT §6.3, Schedule C
            },
            // Q2 — Content & IP
            is_creator:        !!g("v-creator"),        // → TOS §4.1, TOS §6.2 output license
            is_reader:         !!g("v-reader"),         // → TOS §4.1(e) unauthorized scraping waiver
            // Q3 — Interaction & Analysis
            conversational_ui: !!g("v-companion"),      // sets conversational_ui=true → TOS §3.4; is_companion=true → AUP §3.5
            sens_bio:          !!g("v-biometrics"),     // sets sens_bio=true → AUP §3.6 biometric pass-through prohibition
            // Q4 — High-Stakes (Judge maps to HR + Legal; Optimizer maps to sens_fin)
            is_judge:          !!g("v-judge"),          // sets is_judge=true → TOS §5.6
            is_judge_hr:       !!g("v-judge"),          // → AUP §3.4 mandatory bias audit shift
            is_judge_legal:    !!g("v-judge"),          // → AUP §3.3 professional reliance disclaimer
            is_optimizer:      !!g("v-optimizer"),      // → AUP §3.2
            sens_fin:          !!g("v-optimizer"),      // → AUP §3.2 financial surface
            // Q5 — Physical & Security
            is_shield:         !!g("v-shield"),         // → False Negative liability cap, AGT §7.1 immutable logs
            is_mover:          !!g("v-mover"),          // → Strict product liability waiver, TOS §2.4
            is_generalist:     !!g("v-generalist")      // → baseline hallucination waivers
        },

        // ── MODULE 4: COMPLIANCE ───────────────────────────────────
        compliance: {
            processes_pii:    r("v-pii") === "yes",     // yes → activate DOC_DPA + standard DOC_PP; no → stripped PP
            eu_users:         !!g("v-eu"),              // → inject DPA §6.2/6.3/6.4, Schedule D (SCCs)
            ca_users:         !!g("v-ca"),              // → inject DPA §13.x CCPA Service Provider
            other_regions:    !!g("v-other-regions"),
            sens_health:      !!g("v-sens-health"),     // flips sens_health=true → AUP §3.1
            sens_fin:         !!g("v-sens-fin"),        // → AUP §3.2
            sens_employment:  !!g("v-sens-employment"), // → AUP §3.4
            minors:           !!g("v-minors"),          // triggers AUP §3.5 if companion==true || ca_users==true
            distress:         !!g("v-distress"),        // sets vulnerable_users=true → TOS §5.5
            standard_adults:  !!g("v-standard-adults")
        },

        status:      "intake_received",
        submittedAt: new Date().toISOString()
    };

    try {
        const user = window.firebaseAuth?.currentUser;
        if (!user) throw new Error("Session lost. Please sign in again.");

        // Write to Firestore (UNCHANGED)
        await setDoc(
            doc(window.firebaseDb, "clients", user.email),
            { ...payload, email: user.email },
            { merge: true }
        );

        // Fire webhook (non-blocking — UNCHANGED)
        fetch(INTAKE_WEBHOOK, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ ...payload, email: user.email, timestamp: new Date().toISOString() })
        }).catch(e => console.warn("Webhook fire failed (non-critical):", e));

        // Hard reload — dashboard.js re-routes to State 2 (UNCHANGED)
        window.location.reload();

    } catch (err) {
        console.error("Vault Submission Error:", err);
        showError("Transmission failed: " + err.message + ". Please retry.");
        if (btn) { btn.textContent = "Submit to The Architect →"; btn.disabled = false; }
    }
};

// ── ATTACH TOP-LEVEL LISTENERS (extension point — UNCHANGED) ──────────
function attachListeners() {
    // All handlers attached in showPhase() hooks or via inline onclick.
    // Extension point for future additions.
}
