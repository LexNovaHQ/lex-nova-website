/**
 * LEX NOVA HQ — FORENSIC ENGINE v6.0
 * /bridge/engagement-logic.js - The Closer
 * * THE SUPREME COMMAND: Powers the standalone engagement.html portal.
 * Reads the URL, injects the contract, forces the read, and collects the money.
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";
import { FIREBASE_CONFIG } from '../config/governance.js'; // Assuming you centralized config, otherwise paste config here

// ============================================================================
// 1. CONSTANTS & CONFIGURATION
// ============================================================================
const app = initializeApp(FIREBASE_CONFIG);
const db = getFirestore(app);

const CHECKOUT_WEBHOOK = "https://hook.eu1.make.com/r77qw3emv27csjq2eag7ibqku1juve4t"; // Your Make Webhook

const PAYMENT_LINKS = {
    agentic_shield:   "https://www.paypal.com/ncp/payment/WNH78KQCXDBL6",
    workplace_shield: "https://www.paypal.com/ncp/payment/7DUHPJJ4XVUVJ",
    complete_stack:   "https://www.paypal.com/ncp/payment/X3PJ47FEDUSPW"
};

const PLAN_DATA = {
    agentic_shield:   { name: "The Agentic Shield",   price: 1500, tier: "Kit",    delivery: "48 hours from Vault activation" },
    workplace_shield: { name: "The Workplace Shield", price: 1500, tier: "Kit",    delivery: "48 hours from Vault activation" },
    complete_stack:   { name: "The Complete Stack",   price: 2500, tier: "Bundle", delivery: "72 hours from Vault activation" }
};

// State
let prospectData = null;
let activePlanId = null;
let prospectId = null;

// ============================================================================
// 2. INITIALIZATION (The Sniff)
// ============================================================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log("> CLOSER: Engagement Portal Initialized.");

    const urlParams = new URLSearchParams(window.location.search);
    prospectId = urlParams.get('pid');
    activePlanId = urlParams.get('plan') || 'complete_stack';

    if (!prospectId || !PLAN_DATA[activePlanId]) {
        alert("Invalid engagement link. Please contact Lex Nova.");
        return;
    }

    try {
        // Fetch the VIP data
        const snap = await getDoc(doc(db, "prospects", prospectId));
        if (snap.exists()) {
            prospectData = snap.data();
            injectContractData();
            wireFrictionLock();
        } else {
            console.error("> CLOSER: Prospect not found in database.");
            alert("Record not found. Please contact Lex Nova.");
        }
    } catch (error) {
        console.error("> CLOSER: Database connection failed.", error);
    }
});

// ============================================================================
// 3. THE INJECTOR (Paints the Contract)
// ============================================================================
function injectContractData() {
    const pd = PLAN_DATA[activePlanId];
    const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
    
    const company = prospectData.company || "[Client Company]";
    const founderName = prospectData.founderName || prospectData.name || "[Founder Name]";
    const email = prospectData.email || "[Client Email]";
    const refCode = `LN-2026-${prospectId.toUpperCase()}`;

    // Inject Dates
    document.getElementById('el-date').innerText = today;
    document.querySelectorAll('.el-date-footer').forEach(el => el.innerText = today);
    
    // Inject Names
    document.getElementById('el-client-name').innerText = company;
    document.getElementById('el-contact').innerText = founderName;
    document.getElementById('el-client-email').innerText = email;
    document.getElementById('el-dear').innerText = founderName.split(' ')[0] || "Founder";
    document.getElementById('el-client-body').innerText = company;
    
    // Inject Plan Details
    document.querySelectorAll('.el-ref-number').forEach(el => el.innerText = refCode);
    document.getElementById('el-sa-client').innerText = company;
    document.getElementById('el-sa-date').innerText = today;
    document.getElementById('el-sa-tier').innerText = pd.tier;
    document.getElementById('el-sa-product').innerText = pd.name;
    document.getElementById('el-sa-fee').innerText = `$${pd.price} USD`;
    document.getElementById('el-sa-delivery').innerText = pd.delivery;
    
    document.querySelectorAll('.el-client-footer').forEach(el => el.innerText = company);
    
    console.log("> CLOSER: Contract Injection Complete.");
}

// ============================================================================
// 4. THE FRICTION LOCK (Scroll to Accept)
// ============================================================================
function wireFrictionLock() {
    const elScrollContainer = document.getElementById('engagement-scroll-container');
    const acceptBtn = document.getElementById('accept-pay-btn');
    const scrollInstruction = document.getElementById('scroll-instruction');

    // Default state: Disabled
    acceptBtn.disabled = true;
    acceptBtn.classList.add('opacity-50', 'cursor-not-allowed', 'bg-shadow', 'text-marble/30');
    acceptBtn.classList.remove('bg-gold', 'text-void', 'hover:bg-marble');

    const checkScrollBottom = () => {
        // Allow a 20px buffer for zoom/rendering differences
        if (elScrollContainer.scrollHeight - elScrollContainer.scrollTop <= elScrollContainer.clientHeight + 20) {
            // Unlock!
            acceptBtn.disabled = false;
            acceptBtn.classList.remove('opacity-50', 'cursor-not-allowed', 'bg-shadow', 'text-marble/30');
            acceptBtn.classList.add('bg-gold', 'text-void', 'hover:bg-marble');
            
            if (scrollInstruction) scrollInstruction.classList.add('hidden-state');
            
            // Remove listener so it stays unlocked
            elScrollContainer.removeEventListener('scroll', checkScrollBottom);
        }
    };

    elScrollContainer.addEventListener('scroll', checkScrollBottom);
    
    // Wire the final submit click
    acceptBtn.addEventListener('click', executeTransaction);
}

// ============================================================================
// 5. THE CLOSER (Transaction Sequence)
// ============================================================================
async function executeTransaction() {
    const btn = document.getElementById('accept-pay-btn');
    btn.disabled = true;
    btn.innerText = "SECURING ARCHITECTURE...";
    btn.classList.add('opacity-50', 'cursor-not-allowed');

    const pd = PLAN_DATA[activePlanId];
    
    const leadData = {
        email: prospectData.email,
        company: prospectData.company,
        plan: activePlanId,
        price: pd.price,
        status: "hot_payment_pending",
        elAccepted: true,
        elAcceptedAt: new Date().toISOString(),
        elAcceptedForPlan: activePlanId,
        engagementReference: `LN-2026-${prospectId.toUpperCase()}`
    };

    try {
        console.log("> CLOSER: Executing Final Writes...");
        
        // 1. Update Firebase Lead/Prospect Status
        const safeEmailId = prospectData.email ? prospectData.email.replace(/[^a-zA-Z0-9@._-]/g, '').toLowerCase() : prospectId;
        await setDoc(doc(db, "leads", safeEmailId), leadData, { merge: true });
        await setDoc(doc(db, "prospects", prospectId), { status: "hot_payment_pending", elAccepted: true }, { merge: true });

        // 2. Fire the Webhook to Slack/Make
        await fetch(CHECKOUT_WEBHOOK, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...leadData, timestamp: new Date().toISOString(), trigger: "Async Checkout Module" })
        });

    } catch (err) {
        console.error("> CLOSER: Transaction Logging Failed (Proceeding to payment anyway)", err);
    }

    // 3. The Redirect
    console.log("> CLOSER: Routing to Payment Processor.");
    window.location.href = PAYMENT_LINKS[activePlanId];
}
