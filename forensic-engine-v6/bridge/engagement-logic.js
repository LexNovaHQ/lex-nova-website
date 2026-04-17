/**
 * LEX NOVA HQ — FORENSIC ENGINE v6.0
 * /bridge/engagement-logic.js - The Closer
 *
 * FIXED v2.1:
 * 1. Firebase config inlined — removed broken governance.js import
 * 2. Scroll detection uses Math.ceil() — fixes float precision bug that kept button locked
 * 3. Auto-unlocks if content is too short to scroll (scrollHeight <= clientHeight)
 * 4. Uses classList.add('hidden') not 'hidden-state' — correct for engagement.html
 * 5. All duplicate IDs use querySelectorAll, not getElementById
 */

import { initializeApp }                                       from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

// ============================================================================
// 1. FIREBASE CONFIG — inlined, do NOT import from governance.js
// ============================================================================
const FIREBASE_CONFIG = {
    apiKey:            "AIzaSyDO4s_W8_87XnsLnuAfyUqgsF8BgaHRYWA",
    authDomain:        "lexnova-hq.firebaseapp.com",
    projectId:         "lexnova-hq",
    storageBucket:     "lexnova-hq.firebasestorage.app",
    messagingSenderId: "539475214055",
    appId:             "1:539475214055:web:c01a99ec94ff073a9b6c42"
};

const app = initializeApp(FIREBASE_CONFIG);
const db  = getFirestore(app);

// ============================================================================
// 2. CONSTANTS
// ============================================================================
const CHECKOUT_WEBHOOK = "https://hook.eu1.make.com/r77qw3emv27csjq2eag7ibqku1juve4t";

const PAYMENT_LINKS = {
    agentic_shield:   "https://www.paypal.com/ncp/payment/WNH78KQCXDBL6",
    workplace_shield: "https://www.paypal.com/ncp/payment/7DUHPJJ4XVUVJ",
    complete_stack:   "https://www.paypal.com/ncp/payment/X3PJ47FEDUSPW"
};

const PLAN_DATA = {
    agentic_shield:   { name: "The Agentic Shield",  price: 1500, tier: "Kit",    delivery: "48 hours from Vault activation" },
    workplace_shield: { name: "The Workplace Shield", price: 1500, tier: "Kit",    delivery: "48 hours from Vault activation" },
    complete_stack:   { name: "The Complete Stack",   price: 2500, tier: "Bundle", delivery: "72 hours from Vault activation" }
};
const KITS = {
    agentic_shield:   ['DOC_TOS','DOC_AGT','DOC_AUP','DOC_DPA','DOC_SLA','DOC_PP','DOC_PBK'],
    workplace_shield: ['DOC_HND','DOC_IP','DOC_SOP','DOC_DPIA','DOC_SCAN','DOC_PBK'],
    complete_stack:   ['DOC_TOS','DOC_AGT','DOC_AUP','DOC_DPA','DOC_SLA','DOC_PP','DOC_HND','DOC_IP','DOC_DPIA','DOC_PBK']
};
// ============================================================================
// 3. STATE
// ============================================================================
let prospectData = null;
let activePlanId = null;
let prospectId   = null;

// ============================================================================
// 4. DOM HELPERS
// ============================================================================

/** Sets innerText on one element by ID. Safe no-op if missing. */
function setById(id, value) {
    const el = document.getElementById(id);
    if (el) el.innerText = value;
}

/** Sets innerText on ALL elements matching selector (handles duplicate IDs). */
function setAll(selector, value) {
    document.querySelectorAll(selector).forEach(el => { el.innerText = value; });
}

// ============================================================================
// 5. INIT
// ============================================================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log("> CLOSER: Engagement Portal v2.1 initialized.");

    const urlParams  = new URLSearchParams(window.location.search);
    prospectId   = urlParams.get('pid');
    activePlanId = urlParams.get('plan') || 'complete_stack';

    if (!prospectId || !PLAN_DATA[activePlanId]) {
        console.error("> CLOSER: Missing pid or plan in URL.");
        alert("Invalid engagement link. Please contact Lex Nova at shwetabh.singh@lexnovahq.com");
        return;
    }

    try {
        const snap = await getDoc(doc(db, "prospects", prospectId));
        if (snap.exists()) {
            prospectData = snap.data();
            injectContractData();
            wireFrictionLock();
        } else {
            console.error("> CLOSER: Prospect not found:", prospectId);
            alert("Engagement record not found. Please contact Lex Nova.");
        }
    } catch (err) {
        console.error("> CLOSER: Database error:", err);
        alert("Connection error. Please refresh or contact Lex Nova.");
    }
});

// ============================================================================
// 6. CONTRACT INJECTION
// ============================================================================
function injectContractData() {
    const pd = PLAN_DATA[activePlanId];

    const today = new Date().toLocaleDateString('en-GB', {
        day: '2-digit', month: 'long', year: 'numeric'
    });

    const company     = prospectData.company     || "[Client Company]";
    const founderName = prospectData.founderName  || prospectData.name || "Founder";
    const firstName   = founderName.split(' ')[0] || "Founder";
    const email       = prospectData.email        || "[Client Email]";
    const refCode     = `LN-2026-${prospectId.toUpperCase()}`;

    // Dates — el-date appears TWICE, use querySelectorAll
    setAll('#el-date',        today);
    setAll('.el-date-footer', today);

    // Single IDs
    setById('el-client-name',  company);
    setById('el-contact',      founderName);
    setById('el-client-email', email);
    setById('el-dear',         firstName);

    // Duplicate IDs — use querySelectorAll
    setAll('#el-client-body', company);       // appears twice
    setAll('.el-ref-number',  refCode);       // appears three times (also class-based)
    setAll('.el-client-footer', company);

    // Schedule A fields
    setById('el-sa-client',   company);
    setById('el-sa-date',     today);
    setById('el-sa-tier',     pd.tier);
    setById('el-sa-product',  pd.name);
    setById('el-sa-fee',      `$${pd.price.toLocaleString()} USD`);
    setById('el-sa-delivery', pd.delivery);
    // ADDRESS → jurisdiction from DB
    setById('el-client-address',
        prospectData.jurisdiction_hq || prospectData.jurisdiction || '[Jurisdiction]'
    );

    // SCHEDULE A — DELIVERABLES TABLE (auto-generated from kit)
    const DOC_NAMES = {
        DOC_TOS:  'AI Terms of Service',
        DOC_AGT:  'Agentic Addendum',
        DOC_AUP:  'Acceptable Use Policy',
        DOC_DPA:  'Data Processing Agreement',
        DOC_SLA:  'AI-Specific SLA',
        DOC_PP:   'Privacy Policy',
        DOC_PBK:  'Negotiation Playbook',
        DOC_HND:  'AI Employee Handbook',
        DOC_IP:   'IP Assignment Deed',
        DOC_SOP:  'HITL Protocol',
        DOC_DPIA: 'Impact Assessment',
        DOC_SCAN: 'Shadow AI Scanner'
    };
    const DOC_DESC = {
        DOC_TOS:  'Defines service terms, liability caps, and AI-specific disclaimers.',
        DOC_AGT:  'Governs autonomous agent liability and kill-switch requirements.',
        DOC_AUP:  'Defines permitted and prohibited uses of the AI product.',
        DOC_DPA:  'Governs data processing obligations for GDPR and enterprise compliance.',
        DOC_SLA:  'AI-specific uptime definitions and service credit limitations.',
        DOC_PP:   'Jurisdiction-aware privacy policy covering AI data flows and user rights.',
        DOC_PBK:  'Enterprise negotiation counter-scripts and objection handling.',
        DOC_HND:  'AI usage policy for employees — the Traffic Light framework.',
        DOC_IP:   'IP assignment ensuring company ownership of all AI-generated work.',
        DOC_SOP:  'Human-in-the-loop workflow establishing authorship and review standards.',
        DOC_DPIA: 'EU AI Act risk assessment mapping high-risk use cases.',
        DOC_SCAN: 'Anonymous survey to surface unauthorized AI tool usage.'
    };
    const kitDocs = PLAN_DATA[activePlanId]?.docs || KITS[activePlanId] || [];
    const tableEl = document.getElementById('el-sa-deliverables');
    if (tableEl && kitDocs.length) {
        tableEl.innerHTML = kitDocs.map((docId, i) =>
            `<p class="mb-2 text-sm leading-relaxed text-marble/80">
                ${i + 1}&nbsp;&nbsp;&nbsp;&nbsp;
                <strong>${docId}</strong>&nbsp;&nbsp;&nbsp;&nbsp;
                ${DOC_NAMES[docId] || docId}&nbsp;&nbsp;&nbsp;&nbsp;
                <span style="opacity:0.6">${DOC_DESC[docId] || ''}</span>
            </p>`
        ).join('');
    }
    console.log(`> CLOSER: Injected — Company: [${company}] | Plan: [${pd.name}] | Ref: [${refCode}]`);
}

// ============================================================================
// 7. FRICTION LOCK — Float-safe scroll detection
// ============================================================================
function wireFrictionLock() {
    const scrollEl   = document.getElementById('engagement-scroll-container');
    const checkbox   = document.getElementById('consent-checkbox');
    const label      = document.getElementById('consent-label');
    const btn        = document.getElementById('accept-pay-btn');
    const scrollMsg  = document.getElementById('scroll-instruction');

    if (!scrollEl || !checkbox || !btn) {
        console.error("> CLOSER: Friction lock elements missing.");
        return;
    }

    // Everything starts locked
    setLocked(btn, true);
    checkbox.disabled = true;
    if (label) label.classList.add('opacity-40', 'cursor-not-allowed');

    const isAtBottom = () => {
        const scrolledTo  = Math.ceil(scrollEl.scrollTop + scrollEl.clientHeight);
        const totalHeight = scrollEl.scrollHeight;
        if (totalHeight <= scrollEl.clientHeight + 5) return true;
        return scrolledTo >= totalHeight - 50;
    };

    const activateCheckbox = () => {
        checkbox.disabled = false;
        if (label) {
            label.classList.remove('opacity-40', 'cursor-not-allowed');
            label.classList.add('cursor-pointer');
        }
        if (scrollMsg) scrollMsg.classList.add('hidden');
        console.log("> CLOSER: Scroll complete. Checkbox activated.");
    };

    // Check immediately (handles short content)
    if (isAtBottom()) {
        activateCheckbox();
    } else {
        const onScroll = () => {
            if (isAtBottom()) {
                activateCheckbox();
                scrollEl.removeEventListener('scroll', onScroll);
            }
        };
        scrollEl.addEventListener('scroll', onScroll);
    }

    // Checkbox activates the button
    checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
            setLocked(btn, false);
            console.log("> CLOSER: Consent confirmed. Pay button live.");
        } else {
            setLocked(btn, true);
        }
    });

    btn.addEventListener('click', executeTransaction);
}

function setLocked(btn, locked) {
    btn.disabled = locked;
    if (locked) {
        btn.classList.add('opacity-50', 'cursor-not-allowed');
        btn.classList.remove('bg-gold', 'text-void', 'hover:bg-marble', 'cursor-pointer');
        btn.classList.add('bg-shadow', 'text-marble/30');
    } else {
        btn.classList.remove('opacity-50', 'cursor-not-allowed', 'bg-shadow', 'text-marble/30');
        btn.classList.add('bg-gold', 'text-void', 'hover:bg-marble', 'cursor-pointer');
    }
}

function unlock(btn, scrollMsg) {
    setLocked(btn, false);
    // Use 'hidden' — engagement.html does not have .hidden-state CSS rule
    if (scrollMsg) scrollMsg.classList.add('hidden');
    console.log("> CLOSER: Document read confirmed. Payment button unlocked.");
}

// ============================================================================
// 8. TRANSACTION EXECUTION
// ============================================================================
async function executeTransaction() {
    const btn = document.getElementById('accept-pay-btn');
    if (!btn || btn.disabled) return;

    btn.disabled  = true;
    btn.innerText = "SECURING ARCHITECTURE...";
    btn.classList.add('opacity-75', 'cursor-not-allowed');

    const kitDocs = KITS[activePlanId] || KITS['agentic_shield'];
    const KITS = {
    agentic_shield:   ['DOC_TOS','DOC_AGT','DOC_AUP','DOC_DPA','DOC_SLA','DOC_PP','DOC_PBK'],
    workplace_shield: ['DOC_HND','DOC_IP','DOC_SOP','DOC_DPIA','DOC_SCAN','DOC_PBK'],
    complete_stack:   ['DOC_TOS','DOC_AGT','DOC_AUP','DOC_DPA','DOC_SLA','DOC_PP','DOC_HND','DOC_IP','DOC_DPIA','DOC_PBK']
};
    const refCode = `LN-2026-${prospectId.toUpperCase()}`;

    const payload = {
        email:               prospectData.email,
        company:             prospectData.company,
        founderName:         prospectData.founderName || prospectData.name || "Unknown",
        plan:                activePlanId,
        planName:            pd.name,
        price:               pd.price,
        status:              "hot_payment_pending",
        elAccepted:          true,
        elAcceptedAt:        new Date().toISOString(),
        elAcceptedForPlan:   activePlanId,
        engagementReference: refCode
    };

    try {
        console.log("> CLOSER: Writing to Firebase...");

        await setDoc(doc(db, "prospects", prospectId), {
            status:            "hot_payment_pending",
            elAccepted:        true,
            elAcceptedAt:      new Date().toISOString(),
            elAcceptedForPlan: activePlanId,
            engagementRef:     refCode
        }, { merge: true });

        const safeId = (prospectData.email || prospectId)
            .replace(/[^a-zA-Z0-9@._-]/g, '')
            .toLowerCase();

        await setDoc(doc(db, "leads", safeId), payload, { merge: true });

        await fetch(CHECKOUT_WEBHOOK, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ ...payload, trigger: "EL Accepted", timestamp: new Date().toISOString() })
        });

        console.log("> CLOSER: Firebase + Webhook complete.");

    } catch (err) {
        // Non-blocking — proceed to payment even if logging fails
        console.error("> CLOSER: Logging error (proceeding anyway):", err);
    }

    console.log("> CLOSER: Routing to payment processor.");
    window.location.href = PAYMENT_LINKS[activePlanId];
}
