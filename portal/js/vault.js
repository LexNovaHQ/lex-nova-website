/**
 * LEX NOVA HQ — VAULT MODULE (vault.js) — FULL REBUILD
 *
 * Entry point: window.initVaultForm()
 * Called by dashboard.js when portalState === 1.
 * Renders the 4-phase intake wizard into #tab-vault.
 * On submit: writes to clients/{email} + fires Make.com webhook + reloads.
 *
 * DEPENDENCIES: window.firebaseAuth, window.firebaseDb (from index.html)
 */

import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ── WEBHOOK ────────────────────────────────────────────────────────────
const INTAKE_WEBHOOK = "https://hook.eu1.make.com/q7nnd3klwdmlmtesq5no4yfsmk3v8ua7";

// ── PHASE TRACKER ──────────────────────────────────────────────────────
let currentPhase = 1;
const TOTAL_PHASES = 4;

// ── ENTRY POINT ────────────────────────────────────────────────────────
window.initVaultForm = function () {
    const container = document.getElementById("tab-vault");
    if (!container) return;
    container.innerHTML = buildVaultShell();
    currentPhase = 1;
    showPhase(1);
    attachListeners();
};

// ── SHELL HTML ─────────────────────────────────────────────────────────
function buildVaultShell() {
    return `
    <div id="vault-wrap" class="fade-in max-w-2xl mx-auto pb-16">

        <!-- Header -->
        <div class="mb-10">
            <div class="inline-block border border-gold border-opacity-30 bg-gold bg-opacity-5 px-4 py-1 mb-5">
                <span class="font-sans text-[9px] tracking-[.25em] uppercase text-gold">Architecture Intake — Phase <span id="vault-phase-indicator">1</span> of ${TOTAL_PHASES}</span>
            </div>
            <h2 id="vault-phase-title" class="font-serif text-3xl md:text-4xl text-marble mb-2">The Baseline</h2>
            <p id="vault-phase-sub" class="font-sans text-[10px] text-marble opacity-40 tracking-wide leading-relaxed">Your responses directly determine which legal clauses are injected into your documents. Answer accurately.</p>
        </div>

        <!-- Phase progress bar -->
        <div class="w-full h-0.5 bg-shadow mb-10 relative">
            <div id="vault-progress" class="absolute top-0 left-0 h-full bg-gold transition-all duration-500" style="width:25%"></div>
        </div>

        <!-- Phase containers -->
        <div id="vault-phase-1" class="vault-phase"></div>
        <div id="vault-phase-2" class="vault-phase" style="display:none"></div>
        <div id="vault-phase-3" class="vault-phase" style="display:none"></div>
        <div id="vault-phase-4" class="vault-phase" style="display:none"></div>

        <!-- Error message -->
        <div id="vault-error" style="display:none;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.25);padding:12px 16px;font-size:11px;color:#ef4444;margin-top:16px;"></div>

    </div>`;
}

// ── PHASE CONTENT ──────────────────────────────────────────────────────
const PHASES = {

    1: {
        title: "The Baseline",
        sub:   "Your legal entity and jurisdictional footprint.",
        html: `
        <div class="vault-section">
            <div class="vault-section-title">Company Identity</div>

            <div style="margin-bottom:16px;">
                <label class="vault-label">1. Company Legal Name *</label>
                <input type="text" id="v-company" class="vault-input" placeholder="e.g. Acme AI, Inc.">
            </div>

            <div style="margin-bottom:16px;">
                <label class="vault-label">2. HQ Location (State or Country)</label>
                <input type="text" id="v-hq" class="vault-input" placeholder="e.g. Delaware, USA">
            </div>
        </div>

        <div class="vault-section">
            <div class="vault-section-title">User Geography</div>

            <div style="background:#050505;border:1px solid #1A1A1A;padding:16px;margin-bottom:12px;">
                <div class="vault-check-row">
                    <span style="font-size:13px;color:#EAE8E3;line-height:1.4;">3. Do you have (or plan to have) EU / UK users?</span>
                    <input type="checkbox" id="v-eu" style="width:20px;height:20px;accent-color:#C5A059;flex-shrink:0;cursor:pointer;">
                </div>
                <p class="vault-why">🌍 <strong>Why we ask:</strong> If you have EU users, GDPR and the EU AI Act apply extraterritorially. Checking this injects Standard Contractual Clauses and EU-specific liability shields into your DPA and Privacy Policy.</p>
            </div>

            <div style="background:#050505;border:1px solid #1A1A1A;padding:16px;">
                <div class="vault-check-row">
                    <span style="font-size:13px;color:#EAE8E3;line-height:1.4;">4. Do you have (or plan to have) California users?</span>
                    <input type="checkbox" id="v-ca" style="width:20px;height:20px;accent-color:#C5A059;flex-shrink:0;cursor:pointer;">
                </div>
                <p class="vault-why">🐻 <strong>Why we ask:</strong> California has the strictest US privacy laws (CCPA). This injects a 'Service Provider' shield into your Privacy Policy and DPA to prevent personal data sale liability.</p>
            </div>
        </div>

        <div style="display:flex;justify-content:flex-end;margin-top:24px;">
            <button class="vault-nav-btn vault-btn-primary" onclick="window.vaultNext()">Next: Data Architecture →</button>
        </div>`
    },

    2: {
        title: "Data Architecture",
        sub:   "How your product handles data determines your largest legal exposure surface.",
        html: `
        <div class="vault-section">
            <div class="vault-section-title">Data Processing</div>

            <div style="background:#050505;border:1px solid #1A1A1A;padding:16px;margin-bottom:12px;">
                <div class="vault-check-row">
                    <div>
                        <span style="font-size:13px;font-weight:600;color:#EAE8E3;">5. Does your service process personal data?</span>
                        <p style="font-size:11px;color:rgba(234,232,227,.45);margin-top:4px;">Even just emails, user-uploaded docs, or names.</p>
                    </div>
                    <input type="checkbox" id="v-pii" style="width:20px;height:20px;accent-color:#C5A059;flex-shrink:0;cursor:pointer;">
                </div>
                <p class="vault-why">Activates the core Data Processing Agreement (DOC_DPA) with RAG-Only mandate and machine unlearning rights.</p>
            </div>

            <div style="background:#050505;border:1px solid #1A1A1A;padding:16px;">
                <label style="display:block;font-size:13px;font-weight:600;color:#EAE8E3;margin-bottom:12px;">6. Does your service process highly sensitive data?</label>
                <div style="display:flex;flex-direction:column;gap:10px;">
                    <label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-size:12px;color:rgba(234,232,227,.8);">
                        <input type="checkbox" id="v-sens-health" style="width:16px;height:16px;accent-color:#C5A059;">
                        Health / Medical Data
                    </label>
                    <label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-size:12px;color:rgba(234,232,227,.8);">
                        <input type="checkbox" id="v-sens-bio" style="width:16px;height:16px;accent-color:#C5A059;">
                        Voice / Facial Biometrics
                    </label>
                    <label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-size:12px;color:rgba(234,232,227,.8);">
                        <input type="checkbox" id="v-sens-fin" style="width:16px;height:16px;accent-color:#C5A059;">
                        Financial / Trading Data
                    </label>
                </div>
            </div>
        </div>

        <div class="vault-section">
            <div class="vault-section-title">Memory & Infrastructure</div>

            <div style="margin-bottom:16px;">
                <label class="vault-label">7. How do you process AI memory? *</label>
                <div style="position:relative;">
                    <select id="v-memory" class="vault-input" style="padding-right:32px;">
                        <option value="" disabled selected>Select architecture...</option>
                        <option value="rag">RAG — External Vector Database (Recommended)</option>
                        <option value="finetuning">Fine-Tuning — Modifying Model Weights ⚠</option>
                    </select>
                    <span style="position:absolute;right:12px;top:50%;transform:translateY(-50%);color:rgba(234,232,227,.3);pointer-events:none;">▾</span>
                </div>
                <p class="vault-why">🧠 <strong>Critical:</strong> Fine-Tuning bakes customer data into the model weights — you cannot delete it without destroying the model. This is the single largest legal liability in AI. RAG keeps data in an external, deletable vector store.</p>
            </div>

            <div>
                <label class="vault-label">8. Model infrastructure *</label>
                <div style="position:relative;">
                    <select id="v-models" class="vault-input" style="padding-right:32px;">
                        <option value="" disabled selected>Select provider...</option>
                        <option value="thirdparty">3rd-Party APIs (OpenAI, Anthropic, Google, etc.)</option>
                        <option value="selfhosted">Self-Hosted / Open Source</option>
                    </select>
                    <span style="position:absolute;right:12px;top:50%;transform:translateY(-50%);color:rgba(234,232,227,.3);pointer-events:none;">▾</span>
                </div>
                <p class="vault-why">🔥 If using 3rd-party APIs, we inject a firewall clause that shifts copyright and training-data liability back to the model provider (Bartz doctrine).</p>
            </div>
        </div>

        <div style="display:flex;justify-content:space-between;margin-top:24px;gap:12px;flex-wrap:wrap;">
            <button class="vault-nav-btn vault-btn-secondary" onclick="window.vaultBack()">← Back</button>
            <button class="vault-nav-btn vault-btn-primary" onclick="window.vaultNext()">Next: Action Scopes →</button>
        </div>`
    },

    3: {
        title: "Action Scopes",
        sub:   "What your AI does determines your liability profile. Be precise.",
        html: `
        <div class="vault-section">
            <div class="vault-section-title">The INT. 10 Classification</div>

            <!-- THE DOER -->
            <div style="background:#050505;border:1px solid rgba(197,160,89,.25);border-left:3px solid #C5A059;padding:16px;margin-bottom:12px;">
                <div class="vault-check-row">
                    <div>
                        <span style="font-size:13px;font-weight:700;color:#C5A059;">9. The Doer — Autonomous Actions</span>
                        <p style="font-size:11px;color:rgba(234,232,227,.5);margin-top:4px;">Can your AI execute workflows, book things, route API calls, or spend money autonomously?</p>
                    </div>
                    <input type="checkbox" id="v-doer" style="width:20px;height:20px;accent-color:#C5A059;flex-shrink:0;cursor:pointer;" onchange="document.getElementById('v-agent-fields').style.display=this.checked?'block':'none'">
                </div>
                <p class="vault-why">🤖 Under UETA §14, every action your autonomous agent takes is legally binding on your company. This triggers the Agentic Addendum (DOC_AGT) with Circuit Breakers and Kill Switch requirements.</p>

                <div id="v-agent-fields" class="vault-agent-fields">
                    <div style="margin-bottom:12px;">
                        <label class="vault-label">Max spend per session (Circuit Breaker)</label>
                        <input type="text" id="v-spend-session" class="vault-input" placeholder="e.g. $50">
                    </div>
                    <div>
                        <label class="vault-label">Max API requests per minute (Rate Limit)</label>
                        <input type="text" id="v-rate-limit" class="vault-input" placeholder="e.g. 100 req/min">
                    </div>
                </div>
            </div>

            <!-- THE JUDGE -->
            <div style="background:#050505;border:1px solid #1A1A1A;padding:16px;margin-bottom:12px;">
                <label style="display:block;font-size:13px;font-weight:700;color:#C5A059;margin-bottom:6px;">10. The Judge — High-Stakes Decisioning</label>
                <p style="font-size:11px;color:rgba(234,232,227,.5);margin-bottom:12px;">Does your AI output directly affect these decisions?</p>
                <div style="display:flex;flex-direction:column;gap:10px;">
                    <label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-size:12px;color:rgba(234,232,227,.8);">
                        <input type="checkbox" id="v-judge-hr" style="width:16px;height:16px;accent-color:#C5A059;">
                        Employment / HR Screening
                    </label>
                    <label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-size:12px;color:rgba(234,232,227,.8);">
                        <input type="checkbox" id="v-judge-legal" style="width:16px;height:16px;accent-color:#C5A059;">
                        Legal / Contract Drafting
                    </label>
                    <label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-size:12px;color:rgba(234,232,227,.8);">
                        <input type="checkbox" id="v-judge-fin" style="width:16px;height:16px;accent-color:#C5A059;">
                        Credit / Housing / Financial Approvals
                    </label>
                </div>
                <p class="vault-why">⚖️ These are 'High-Risk' categories under EU AI Act and NYC Local Law 144. Forces mandatory Human-in-the-Loop disclaimers into your ToS.</p>
            </div>

            <!-- THE COMPANION -->
            <div style="background:#050505;border:1px solid #1A1A1A;padding:16px;margin-bottom:12px;">
                <div class="vault-check-row">
                    <div>
                        <span style="font-size:13px;font-weight:700;color:#C5A059;">11. The Companion — Conversational AI</span>
                        <p style="font-size:11px;color:rgba(234,232,227,.5);margin-top:4px;">Does your AI build ongoing relationships, remember users, or act as a personal assistant?</p>
                    </div>
                    <input type="checkbox" id="v-companion" style="width:20px;height:20px;accent-color:#C5A059;flex-shrink:0;cursor:pointer;">
                </div>
                <p class="vault-why">Triggers Gavalas emotional reliance provisions — crisis break clauses and reality grounding mandates injected into DOC_AUP.</p>
            </div>

            <!-- THE ORCHESTRATOR -->
            <div style="background:#050505;border:1px solid #1A1A1A;padding:16px;">
                <div class="vault-check-row">
                    <div>
                        <span style="font-size:13px;font-weight:700;color:#C5A059;">12. The Orchestrator — Multi-Agent Swarms</span>
                        <p style="font-size:11px;color:rgba(234,232,227,.5);margin-top:4px;">Do you use multiple AI agents that coordinate or pass instructions to each other?</p>
                    </div>
                    <input type="checkbox" id="v-orchestrator" style="width:20px;height:20px;accent-color:#C5A059;flex-shrink:0;cursor:pointer;">
                </div>
                <p class="vault-why">Activates dynamic sub-processing liability chain provisions. Forces sub-processor identification and liability controls in DOC_DPA.</p>
            </div>
        </div>

        <div style="display:flex;justify-content:space-between;margin-top:24px;gap:12px;flex-wrap:wrap;">
            <button class="vault-nav-btn vault-btn-secondary" onclick="window.vaultBack()">← Back</button>
            <button class="vault-nav-btn vault-btn-primary" onclick="window.vaultNext()">Next: Service Levels →</button>
        </div>`
    },

    4: {
        title: "Service Level Commitments",
        sub:   "What you promise your users determines your breach exposure.",
        html: `
        <div class="vault-section">
            <div class="vault-section-title">Performance Guarantees</div>

            <div style="margin-bottom:20px;">
                <label class="vault-label">13a. Guaranteed Uptime *</label>
                <div style="position:relative;">
                    <select id="v-uptime" class="vault-input" style="padding-right:32px;">
                        <option value="99.9">99.9% — Standard SaaS (8.7 hours downtime/year)</option>
                        <option value="99.99">99.99% — Enterprise Grade (52 mins downtime/year)</option>
                        <option value="none">No Uptime Guarantee</option>
                    </select>
                    <span style="position:absolute;right:12px;top:50%;transform:translateY(-50%);color:rgba(234,232,227,.3);pointer-events:none;">▾</span>
                </div>
            </div>

            <div>
                <label class="vault-label">13b. Time-to-First-Token (TTFT) Target *</label>
                <div style="position:relative;">
                    <select id="v-ttft" class="vault-input" style="padding-right:32px;">
                        <option value="3s">&lt; 3 Seconds — Standard</option>
                        <option value="2s">&lt; 2 Seconds — Fast</option>
                        <option value="none">No TTFT Guarantee</option>
                    </select>
                    <span style="position:absolute;right:12px;top:50%;transform:translateY(-50%);color:rgba(234,232,227,.3);pointer-events:none;">▾</span>
                </div>
                <p class="vault-why">⏱️ <strong>Critical:</strong> Never promise a Total Completion Time for an AI prompt — a 5-word answer takes 1s, a 5,000-word essay takes 30s. We write your SLA to only guarantee Time-to-First-Token, preventing refund demands and breach claims.</p>
            </div>
        </div>

        <div class="vault-section" style="background:rgba(197,160,89,.04);border-color:rgba(197,160,89,.2);">
            <div style="font-size:10px;color:#C5A059;text-transform:uppercase;letter-spacing:.12em;font-weight:700;margin-bottom:12px;">What happens next</div>
            <div style="font-size:11px;color:rgba(234,232,227,.6);line-height:1.8;">
                <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:8px;">
                    <span style="color:#C5A059;font-weight:700;flex-shrink:0;">01</span>
                    <span>Your Vault is sealed and transmitted to the Architect.</span>
                </div>
                <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:8px;">
                    <span style="color:#C5A059;font-weight:700;flex-shrink:0;">02</span>
                    <span>Your 48-hour SLA clock starts immediately.</span>
                </div>
                <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:8px;">
                    <span style="color:#C5A059;font-weight:700;flex-shrink:0;">03</span>
                    <span>Each clause is calibrated to your specific configuration.</span>
                </div>
                <div style="display:flex;align-items:flex-start;gap:10px;">
                    <span style="color:#C5A059;font-weight:700;flex-shrink:0;">04</span>
                    <span>You receive a notification when your Shields are ready.</span>
                </div>
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

    // Re-attach agent toggle if phase 3
    if (n === 3) {
        const doerChk = document.getElementById("v-doer");
        if (doerChk) {
            doerChk.addEventListener("change", () => {
                const fields = document.getElementById("v-agent-fields");
                if (fields) {
                    fields.style.display = doerChk.checked ? "block" : "none";
                    if (!doerChk.checked) {
                        ["v-spend-session","v-rate-limit"].forEach(id => {
                            const el = document.getElementById(id);
                            if (el) el.value = "";
                        });
                    }
                }
            });
        }
    }

    // Restore saved values if coming back
    restoreValues(n);

    // Scroll to top of vault
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

// ── IN-MEMORY VALUE STORE (persist across phase navigation) ─────────
const vaultStore = {};

const PHASE_FIELDS = {
    1: ["v-company","v-hq","v-eu","v-ca"],
    2: ["v-pii","v-sens-health","v-sens-bio","v-sens-fin","v-memory","v-models"],
    3: ["v-doer","v-spend-session","v-rate-limit","v-judge-hr","v-judge-legal","v-judge-fin","v-companion","v-orchestrator"],
    4: ["v-uptime","v-ttft"]
};

function saveValues(phase) {
    (PHASE_FIELDS[phase] || []).forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        vaultStore[id] = el.type === "checkbox" ? el.checked : el.value;
    });
}

function restoreValues(phase) {
    (PHASE_FIELDS[phase] || []).forEach(id => {
        const el = document.getElementById(id);
        if (!el || vaultStore[id] === undefined) return;
        if (el.type === "checkbox") el.checked = vaultStore[id];
        else el.value = vaultStore[id];
        // Re-show agent fields if is_doer was checked
        if (id === "v-doer" && el.checked) {
            const af = document.getElementById("v-agent-fields");
            if (af) af.style.display = "block";
        }
    });
}

// ── VALIDATION ────────────────────────────────────────────────────────
function validatePhase(phase) {
    if (phase === 1) {
        const company = document.getElementById("v-company")?.value?.trim();
        if (!company) { showError("Company Legal Name is required."); return false; }
    }
    if (phase === 2) {
        const memory = document.getElementById("v-memory")?.value;
        const models = document.getElementById("v-models")?.value;
        if (!memory) { showError("Please select your AI Memory Architecture (Question 7)."); return false; }
        if (!models) { showError("Please select your Model Infrastructure (Question 8)."); return false; }
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

// ── SUBMISSION ────────────────────────────────────────────────────────
window.vaultSubmit = async function () {
    // Save current phase values first
    saveValues(4);

    const btn = document.getElementById("btn-submit-vault");
    if (btn) { btn.textContent = "Encrypting Payload..."; btn.disabled = true; }
    hideError();

    // Compile payload from store
    const payload = {
        baseline: {
            company:  (vaultStore["v-company"] || "").trim() || "Undisclosed Entity",
            hq:       (vaultStore["v-hq"]      || "").trim() || "Undisclosed",
            eu_users: !!vaultStore["v-eu"],
            ca_users: !!vaultStore["v-ca"]
        },
        architecture: {
            processes_pii:    !!vaultStore["v-pii"],
            sensitive_health: !!vaultStore["v-sens-health"],
            sensitive_bio:    !!vaultStore["v-sens-bio"],
            sensitive_fin:    !!vaultStore["v-sens-fin"],
            memory:           vaultStore["v-memory"]  || "rag",
            models:           vaultStore["v-models"]  || "thirdparty"
        },
        action_scopes: {
            is_doer:         !!vaultStore["v-doer"],
            spend_limit:     (vaultStore["v-spend-session"] || "").trim(),
            rate_limit:      (vaultStore["v-rate-limit"]    || "").trim(),
            is_judge_hr:     !!vaultStore["v-judge-hr"],
            is_judge_legal:  !!vaultStore["v-judge-legal"],
            is_judge_fin:    !!vaultStore["v-judge-fin"],
            is_companion:    !!vaultStore["v-companion"],
            is_orchestrator: !!vaultStore["v-orchestrator"]
        },
        commercials: {
            uptime: vaultStore["v-uptime"] || "99.9",
            ttft:   vaultStore["v-ttft"]   || "3s"
        },
        status:      "intake_received",
        submittedAt: new Date().toISOString()
    };

    try {
        const user = window.firebaseAuth?.currentUser;
        if (!user) throw new Error("Session lost. Please sign in again.");

        // Write to Firestore
        await setDoc(
            doc(window.firebaseDb, "clients", user.email),
            { ...payload, email: user.email },
            { merge: true }
        );

        // Fire webhook (non-blocking — don't fail submission if webhook is down)
        fetch(INTAKE_WEBHOOK, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({
                ...payload,
                email:     user.email,
                timestamp: new Date().toISOString()
            })
        }).catch(e => console.warn("Webhook fire failed (non-critical):", e));

        // Hard reload — dashboard.js will re-route to State 2
        window.location.reload();

    } catch (err) {
        console.error("Vault Submission Error:", err);
        showError("Transmission failed: " + err.message + ". Please retry.");
        if (btn) { btn.textContent = "Submit to The Architect →"; btn.disabled = false; }
    }
};

// ── ATTACH TOP-LEVEL LISTENERS ─────────────────────────────────────────
function attachListeners() {
    // Nothing needed at top level — all handlers are inline or attached in showPhase()
    // This function exists as an extension point for future additions
}
