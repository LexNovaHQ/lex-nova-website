/**
 * LEX NOVA HQ — FORENSIC ENGINE v6.0
 * /bridge/engagement-logic.js - The Closer
 *
 * FIXES v2.0:
 * - Firebase config inlined (removed broken import from governance.js)
 * - All duplicate IDs use querySelectorAll + forEach (not getElementById)
 * - founderName fallback hardened
 * - Script is now fully self-contained — no external imports required
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

// ============================================================================
// 1. FIREBASE CONFIG (inlined — do not import from governance.js)
// ============================================================================
const FIREBASE_CONFIG = {
    apiKey: "AIzaSyDO4s_W8_87XnsLnuAfyUqgsF8BgaHRYWA",
    authDomain: "lexnova-hq.firebaseapp.com",
    projectId: "lexnova-hq",
    storageBucket: "lexnova-hq.firebasestorage.app",
    messagingSenderId: "539475214055",
    appId: "1:539475214055:web:c01a99ec94ff073a9b6c42"
};

const app = initializeApp(FIREBASE_CONFIG);
const db = getFirestore(app);

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

// ============================================================================
// 3. STATE
// ============================================================================
let prospectData = null;
let activePlanId = null;
let prospectId   = null;

// ============================================================================
// 4. HELPERS — safe DOM writers
// ============================================================================

/**
 * Sets innerText on a single element by ID.
 * Safe no-op if element doesn't exist.
 */
function setById(id, value) {
    const el = document.getElementById(id);
    if (el) el.innerText = value;
}

/**
 * Sets innerText on ALL elements matching a selector.
 * Handles duplicate IDs and class-based selectors.
 */
function setAll(selector, value) {
    document.querySelectorAll(selector).forEach(el => { el.innerText = value; });
}

// ============================================================================
// 5. INITIALIZATION
// ============================================================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log("> CLOSER: Engagement Portal Initialized.");

    const urlParams  = new URLSearchParams(window.location.search);
    prospectId   = urlParams.get('pid');
    activePlanId = urlParams.get('plan') || 'complete_stack';

    if (!prospectId || !PLAN_DATA[activePlanId]) {
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
        console.error("> CLOSER: Database connection failed.", err);
        alert("Connection error. Please try again or contact Lex Nova.");
    }
});

// ============================================================================
// 6. THE INJECTOR
// ============================================================================
function injectContractData() {
    const pd = PLAN_DATA[activePlanId];

    const today = new Date().toLocaleDateString('en-GB', {
        day:   '2-digit',
        month: 'long',
        year:  'numeric'
    });

    const company     = prospectData.company     || "[Client Company]";
    const founderName = prospectData.founderName  || prospectData.name || "Founder";
    const firstName   = founderName.split(' ')[0] || "Founder";
    const email       = prospectData.email        || "[Client Email]";
    const refCode     = `LN-2026-${prospectId.toUpperCase()}`;

    // ── Dates ──────────────────────────────────────────────────────────
    // el-date appears TWICE in the HTML — use querySelectorAll
    setAll('#el-date', today);
    setAll('.el-date-footer', today);

    // ── Names (single IDs — safe to use getElementById via setById) ────
    setById('el-client-name',  company);
    setById('el-contact',      founderName);
    setById('el-client-email', email);
    setById('el-dear',         firstName);

    // ── el-client-body appears TWICE ──────────────────────────────────
    setAll('#el-client-body', company);

    // ── el-ref-number appears THREE TIMES ─────────────────────────────
    setAll('.el-ref-number', refCode);

    // ── Plan details ──────────────────────────────────────────────────
    setById('el-sa-client',   company);
    setById('el-sa-date',     today);
    setById('el-sa-tier',     pd.tier);
    setById('el-sa-product',  pd.name);
    setById('el-sa-fee',      `$${pd.price.toLocaleString()} USD`);
    setById('el-sa-delivery', pd.delivery);

    // ── Footer client name (class-based — multiple elements) ──────────
    setAll('.el-client-footer', company);

    // ── Page-level reference number ───────────────────────────────────
    // This is the one in the page header (outside the scrollable contract)
    // Already handled by .el-ref-number selector above

    console.log(`> CLOSER: Contract injected for [${company}] | Plan: [${pd.name}] | Ref: [${refCode}]`);
}

// ============================================================================
// 7. FRICTION LOCK (Scroll to Accept)
// ============================================================================
function wireFrictionLock() {
    const scrollContainer  = document.getElementById('engagement-scroll-container');
    const acceptBtn        = document.getElementById('accept-pay-btn');
    const scrollInstruction = document.getElementById('scroll-instruction');

    if (!scrollContainer || !acceptBtn) {
        console.error("> CLOSER: DOM elements missing for friction lock.");
        return;
    }

    // Locked state
    acceptBtn.disabled = true;
    acceptBtn.classList.add('opacity-50', 'cursor-not-allowed', 'bg-shadow', 'text-marble/30');
    acceptBtn.classList.remove('bg-gold', 'text-void', 'hover:bg-marble', 'cursor-pointer');

    const unlock = () => {
        // 20px buffer for zoom/rendering variance
        const atBottom = scrollContainer.scrollHeight - scrollContainer.scrollTop
            <= scrollContainer.clientHeight + 20;

        if (atBottom) {
            acceptBtn.disabled = false;
            acceptBtn.classList.remove('opacity-50', 'cursor-not-allowed', 'bg-shadow', 'text-marble/30');
            acceptBtn.classList.add('bg-gold', 'text-void', 'hover:bg-marble', 'cursor-pointer');

            if (scrollInstruction) scrollInstruction.classList.add('hidden');
            scrollContainer.removeEventListener('scroll', unlock);

            console.log("> CLOSER: Document read confirmed. Pay button unlocked.");
        }
    };

    scrollContainer.addEventListener('scroll', unlock);
    acceptBtn.addEventListener('click', executeTransaction);
}

// ============================================================================
// 8. THE CLOSER (Transaction Execution)
// ============================================================================
async function executeTransaction() {
    const btn = document.getElementById('accept-pay-btn');
    if (!btn || btn.disabled) return;

    btn.disabled   = true;
    btn.innerText  = "SECURING ARCHITECTURE...";
    btn.classList.add('opacity-50', 'cursor-not-allowed');

    const pd      = PLAN_DATA[activePlanId];
    const refCode = `LN-2026-${prospectId.toUpperCase()}`;

    const transactionPayload = {
        email:                 prospectData.email,
        company:               prospectData.company,
        founderName:           prospectData.founderName || prospectData.name || "Unknown",
        plan:                  activePlanId,
        planName:              pd.name,
        price:                 pd.price,
        status:                "hot_payment_pending",
        elAccepted:            true,
        elAcceptedAt:          new Date().toISOString(),
        elAcceptedForPlan:     activePlanId,
        engagementReference:   refCode,
        lastUpdated:           new Date().toISOString()
    };

    try {
        console.log("> CLOSER: Writing transaction to Firebase...");

        // Update prospect record
        await setDoc(doc(db, "prospects", prospectId), {
            status:            "hot_payment_pending",
            elAccepted:        true,
            elAcceptedAt:      new Date().toISOString(),
            elAcceptedForPlan: activePlanId,
            engagementRef:     refCode
        }, { merge: true });

        // Write/update leads record
        const safeEmailId = prospectData.email
            ? prospectData.email.replace(/[^a-zA-Z0-9@._-]/g, '').toLowerCase()
            : prospectId;

        await setDoc(doc(db, "leads", safeEmailId), transactionPayload, { merge: true });

        // Fire Make.com webhook
        await fetch(CHECKOUT_WEBHOOK, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({
                ...transactionPayload,
                timestamp: new Date().toISOString(),
                trigger:   "Engagement Letter Accepted"
            })
        });

        console.log("> CLOSER: Firebase + Webhook complete. Routing to payment.");

    } catch (err) {
        // Non-blocking — proceed to payment even if logging fails
        console.error("> CLOSER: Transaction logging failed (proceeding to payment):", err);
    }

    // Redirect to payment processor
    window.location.href = PAYMENT_LINKS[activePlanId];
}
