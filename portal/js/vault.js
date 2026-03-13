// ════════════════════════════════════════════════════════════════════════
// ═════════ LEX NOVA HQ: VAULT MODULE (vault.js) ═════════════════════════
// ════════════════════════════════════════════════════════════════════════
// Description: Multi-phase architecture intake wizard and payload compiler.
// Dependencies: window.firebaseAuth, window.firebaseDb (from index.html)
// ════════════════════════════════════════════════════════════════════════

import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ─── 1. PHASE NAVIGATION ENGINE ─────────────────────────────────────────
function goToVaultPhase(step) {
    // Hide all phases
    document.querySelectorAll('.vault-phase').forEach(el => {
        el.classList.remove('block', 'fade-in');
        el.classList.add('hidden');
    });
    
    // Show target phase
    const target = document.getElementById(`vault-phase-${step}`);
    if (target) {
        target.classList.remove('hidden');
        target.classList.add('block', 'fade-in');
        
        // Update Step Indicator
        const indicator = document.getElementById('vault-step-indicator');
        if (indicator) indicator.innerText = step;
        
        // Scroll to top of vault form for clean UX
        document.getElementById('screen-vault').scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// Attach Navigation Event Listeners
const navButtons = [
    { id: 'btn-vault-next-1', target: 2 },
    { id: 'btn-vault-back-2', target: 1 },
    { id: 'btn-vault-next-2', target: 3 },
    { id: 'btn-vault-back-3', target: 2 },
    { id: 'btn-vault-next-3', target: 4 },
    { id: 'btn-vault-back-4', target: 3 }
];

navButtons.forEach(btnInfo => {
    const btn = document.getElementById(btnInfo.id);
    if (btn) {
        btn.addEventListener('click', () => goToVaultPhase(btnInfo.target));
    }
});


// ─── 2. DYNAMIC FIELD LOGIC (THE DOER) ──────────────────────────────────
const doerCheckbox = document.getElementById('v-doer');
const agentFields = document.getElementById('v-agent-fields');

if (doerCheckbox && agentFields) {
    doerCheckbox.addEventListener('change', (e) => {
        if (e.target.checked) {
            agentFields.classList.remove('hidden');
            agentFields.classList.add('fade-in');
        } else {
            agentFields.classList.add('hidden');
            agentFields.classList.remove('fade-in');
            
            // Clear inputs if they uncheck it
            document.getElementById('v-spend-session').value = '';
            document.getElementById('v-rate-limit').value = '';
        }
    });
}


// ─── 3. PAYLOAD ENCRYPTION & SUBMISSION ─────────────────────────────────
const btnSubmitVault = document.getElementById('btn-submit-vault');

if (btnSubmitVault) {
    btnSubmitVault.addEventListener('click', async () => {
        
        // A. Basic Validation (Ensure critical dropdowns are selected)
        const memorySelect = document.getElementById('v-memory').value;
        const modelsSelect = document.getElementById('v-models').value;
        
        if (!memorySelect || !modelsSelect) {
            alert("Mission Abort: Please select your AI Memory architecture and Model Infrastructure in Phase 2 before submitting.");
            goToVaultPhase(2);
            return;
        }

        // B. Lock UI
        btnSubmitVault.textContent = "Encrypting Payload..."; 
        btnSubmitVault.disabled = true;

        // C. Compile the Architect's Brief (JSON Payload)
        const payload = {
            baseline: {
                company:  document.getElementById('v-company').value.trim() || "Undisclosed Entity",
                hq:       document.getElementById('v-hq').value.trim() || "Undisclosed",
                eu_users: document.getElementById('v-eu').checked,
                ca_users: document.getElementById('v-ca').checked
            },
            architecture: {
                processes_pii:    document.getElementById('v-pii').checked,
                sensitive_health: document.getElementById('v-sens-health').checked,
                sensitive_bio:    document.getElementById('v-sens-bio').checked,
                sensitive_fin:    document.getElementById('v-sens-fin').checked,
                memory:           memorySelect,
                models:           modelsSelect
            },
            action_scopes: {
                is_doer:         document.getElementById('v-doer').checked,
                spend_limit:     document.getElementById('v-spend-session').value.trim(),
                rate_limit:      document.getElementById('v-rate-limit').value.trim(),
                is_judge_hr:     document.getElementById('v-judge-hr').checked,
                is_judge_legal:  document.getElementById('v-judge-legal').checked,
                is_judge_fin:    document.getElementById('v-judge-fin').checked,
                is_companion:    document.getElementById('v-companion').checked,
                is_orchestrator: document.getElementById('v-orchestrator').checked
            },
            commercials: {
                uptime: document.getElementById('v-uptime').value,
                ttft:   document.getElementById('v-ttft').value
            },
            
            // System Flags
            status: 'intake_received',
            submittedAt: new Date().toISOString()
        };

        // D. Database Transmission
        try {
            const user = window.firebaseAuth.currentUser;
            if (!user) throw new Error("Authentication lost. Please sign in again.");

            // Push to Firebase (Merge ensures we don't overwrite referrals/maintenance flags)
            await setDoc(doc(window.firebaseDb, "clients", user.email), payload, { merge: true });
            
            // E. Handoff to Dashboard Router
            // A hard reload cleanly clears the SPA state, forcing dashboard.js to pull the fresh data
            // and route the user directly into the Threat Intel Heatmap.
            window.location.reload();

        } catch (err) {
            console.error("Vault Transmission Error:", err);
            btnSubmitVault.textContent = "Transmission Failed. Retry."; 
            btnSubmitVault.disabled = false;
        }
    });
}
