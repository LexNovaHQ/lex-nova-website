// ════════════════════════════════════════════════════════════════════════
// ═════════ LEX NOVA HQ: DASHBOARD MODULE (dashboard.js) ═════════════════
// ════════════════════════════════════════════════════════════════════════
// Description: Core SPA Router, Data Fetching, UI Building, and Monetization.
// Dependencies: window.firebaseAuth, window.firebaseDb (from index.html)
// ════════════════════════════════════════════════════════════════════════

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { doc, getDoc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Global State
window.clientData = null;

// ─── 1. CORE ROUTER (AUTH OBSERVER) ─────────────────────────────────────
onAuthStateChanged(window.firebaseAuth, async (user) => {
    const navControls   = document.getElementById('nav-controls');
    const navRef        = document.getElementById('nav-ref');
    const screenLogin   = document.getElementById('screen-login');
    const screenVault   = document.getElementById('screen-vault');
    const screenDash    = document.getElementById('screen-dashboard');

    if (user) {
        // User is authenticated
        navControls.classList.remove('hidden');
        navRef.textContent = user.email;
        screenLogin.classList.add('fade-out');
        
        setTimeout(() => screenLogin.classList.add('hidden'), 500); // Wait for fade

        try {
            const clientRef = doc(window.firebaseDb, "clients", user.email);
            const snap = await getDoc(clientRef);
            
            if (snap.exists() && snap.data().status && snap.data().status !== 'pending') {
                // Phase 3/4: User has completed Intake
                window.clientData = snap.data();
                
                // Paper Trail: Log their entry time
                updateDoc(clientRef, { lastLogin: new Date().toISOString() });
                
                // Build the UI
                buildDashboard(window.clientData);
                
                screenVault.classList.add('hidden');
                screenDash.classList.remove('hidden');
                screenDash.classList.add('fade-in');
            } else {
                // Phase 2: User needs to complete Intake (The Vault)
                screenDash.classList.add('hidden');
                screenVault.classList.remove('hidden');
                screenVault.classList.add('fade-in');
                
                // Ensure minimal db record exists
                setDoc(clientRef, { 
                    email: user.email, 
                    status: 'pending', 
                    createdAt: new Date().toISOString() 
                }, { merge: true });
            }
        } catch(e) {
            console.error("Router Database Error:", e);
        }
    } else {
        // User is Logged Out
        navControls.classList.add('hidden');
        screenVault.classList.add('hidden');
        screenDash.classList.add('hidden');
        
        screenLogin.classList.remove('hidden', 'fade-out');
        document.getElementById('state-input').classList.replace('hidden', 'block');
        document.getElementById('state-verifying').classList.add('hidden');
        document.getElementById('state-sent').classList.add('hidden');
    }
});


// ─── 2. TAB NAVIGATION SYSTEM ───────────────────────────────────────────
const tabs = ['heatmap', 'docs', 'engineering', 'network'];

tabs.forEach(tab => {
    const btn = document.getElementById(`tab-btn-${tab}`);
    if (btn) {
        btn.addEventListener('click', () => {
            tabs.forEach(t => {
                document.getElementById(`tab-${t}`).classList.add('hidden');
                document.getElementById(`tab-btn-${t}`).classList.remove('tab-active', 'text-gold');
            });
            document.getElementById(`tab-${tab}`).classList.remove('hidden');
            document.getElementById(`tab-${tab}`).classList.add('fade-in');
            document.getElementById(`tab-btn-${tab}`).classList.add('tab-active');
            
            // Special styling for Syndicate tab
            if(tab === 'network') document.getElementById(`tab-btn-${tab}`).classList.add('text-gold');
        });
    }
});


// ─── 3. DASHBOARD ORCHESTRATOR ──────────────────────────────────────────
function buildDashboard(data) {
    // A. Header Information
    const nameEl = document.getElementById('dash-client-name');
    const planEl = document.getElementById('dash-plan-name');
    const badgeEl = document.getElementById('maintenance-badge');
    
    if(nameEl) nameEl.textContent = data.baseline?.company || "Founder";
    if(planEl) planEl.textContent = data.plan || "Legal Architecture Kit";
    
    if(data.maintenanceActive && badgeEl) {
        badgeEl.classList.remove('hidden');
    }

    // B. Progress Bar Engine
    const statusMap = { 'intake_received': 1, 'under_review': 2, 'in_production': 3, 'delivered': 4 };
    const level = statusMap[data.status] || 1;
    
    if(level >= 2) { 
        document.getElementById('node-2').classList.replace('bg-shadow','bg-gold'); 
        document.getElementById('label-2').classList.replace('opacity-30','text-gold'); 
    }
    if(level >= 3) { 
        document.getElementById('node-3').classList.replace('bg-shadow','bg-gold'); 
        document.getElementById('label-3').classList.replace('opacity-30','text-gold'); 
    }
    if(level >= 4) { 
        document.getElementById('node-4').classList.replace('bg-shadow','bg-gold'); 
        document.getElementById('label-4').classList.replace('opacity-30','text-gold'); 
        document.getElementById('status-bar-fill').style.width = '100%';
    } else {
        document.getElementById('status-bar-fill').style.width = ((level - 1) * 33.33) + '%';
    }

    // C. Execute Sub-Builders
    buildHeatmap(data);
    loadRadar(data);
    buildDocs(data, level);
    buildEngineering(data);
    buildSyndicate(data);
}


// ─── 4. THREAT INTEL: CURRENT HEATMAP ───────────────────────────────────
function buildHeatmap(data) {
    const list = document.getElementById('heatmap-list');
    if (!list) return;
    list.innerHTML = '';
    
    const addHeat = (title, level, desc) => {
        let col = level === 'CRITICAL' ? 'text-danger' : 
                  level === 'HIGH' ? 'text-orange-400' : 
                  level === 'MEDIUM' ? 'text-yellow-400' : 'text-safe';
        list.innerHTML += `
            <div class="flex items-start gap-4 p-5 border border-shadow bg-[#0a0a0a]">
                <div class="mt-1 ${col} text-lg">■</div>
                <div>
                    <span class="block text-sm font-bold text-marble tracking-wide">${title}</span>
                    <span class="block text-[11px] mt-2 text-marble opacity-70 leading-relaxed">${desc}</span>
                </div>
            </div>`;
    };

    // Evaluate Vault Logic Matrix
    let riskDetected = false;

    if (data.architecture?.processes_pii) {
        addHeat('PII Processing', 'HIGH', 'Triggers GDPR/CCPA. DOC_DPA injected to shield liability.');
        riskDetected = true;
    }
    if (data.architecture?.memory === 'finetuning') {
        addHeat('Model Fine-Tuning', 'CRITICAL', 'Algorithmic disgorgement risk detected. RAG mandate overridden.');
        riskDetected = true;
    }
    if (data.action_scopes?.is_doer) {
        addHeat('Autonomous Actions', 'CRITICAL', 'UETA §14 agency liability activated. DOC_AGT circuit breakers injected.');
        riskDetected = true;
    }
    if (data.action_scopes?.is_judge_hr || data.action_scopes?.is_judge_fin) {
        addHeat('High-Stakes Decisioning', 'HIGH', 'Automated bias risk. Hit-In-The-Loop mandates injected.');
        riskDetected = true;
    }
    
    if (!riskDetected) {
        addHeat('Baseline SaaS', 'LOW', 'Standard operational footprint. Core legal kit provides total coverage.');
    }
}


// ─── 5. THREAT INTEL: REGULATORY RADAR ──────────────────────────────────
async function loadRadar(data) {
    const list = document.getElementById('radar-list');
    if (!list) return;
    
    try {
        const snap = await getDoc(doc(window.firebaseDb, "settings", "regulatory_radar"));
        if (snap.exists()) {
            const laws = snap.data().laws || [];
            list.innerHTML = '';
            let gapDetected = false;

            laws.forEach(law => {
                let isMatch = false;
                if (law.jurisdiction === 'EU' && data.baseline?.eu_users) isMatch = true;
                if (law.jurisdiction === 'CA' && data.baseline?.ca_users) isMatch = true;
                if (law.jurisdiction === 'ALL') isMatch = true;

                if (isMatch) {
                    gapDetected = true;
                    list.innerHTML += `
                        <div class="p-5 border border-shadow bg-[#0a0a0a]">
                            <div class="flex justify-between items-center mb-3">
                                <span class="text-sm font-bold text-gold">${law.name}</span>
                                <span class="text-[9px] uppercase tracking-widest opacity-50 bg-shadow px-2 py-1">${law.effective}</span>
                            </div>
                            <p class="text-[11px] opacity-70 leading-relaxed">${law.desc}</p>
                        </div>`;
                }
            });

            // Monetization Logic Trigger
            if (gapDetected) {
                if (data.maintenanceActive) {
                    document.getElementById('radar-safe-box').classList.remove('hidden');
                } else {
                    document.getElementById('radar-upsell-box').classList.remove('hidden');
                }
            } else {
                list.innerHTML = `<p class="text-[11px] italic opacity-30 mt-4">No upcoming regulations currently threaten your declared footprint.</p>`;
            }
        }
    } catch(e) { 
        console.error("Radar Sync Error:", e); 
    }
}


// ─── 6. DOCUMENT VAULT & DEPLOYMENT ─────────────────────────────────────
function buildDocs(data, level) {
    const docsGrid = document.getElementById('docs-grid');
    const lockedNotice = document.getElementById('docs-locked-notice');
    const handoffContainer = document.getElementById('counsel-handoff-container');
    const videoContainer = document.getElementById('video-container');
    if(!docsGrid) return;

    const coreDocs = ['DOC_TOS', 'DOC_AUP', 'DOC_AGT', 'DOC_DPA', 'DOC_SLA', 'DOC_PP'];
    docsGrid.innerHTML = '';

    if (level < 4) {
        // Vault Locked (In Production)
        coreDocs.forEach(docName => {
            docsGrid.innerHTML += `
                <div class="p-6 border border-shadow bg-[#0a0a0a] opacity-50 flex flex-col items-center justify-center text-center">
                    <span class="text-2xl mb-3 block">🔒</span>
                    <h4 class="text-gold font-bold text-sm mb-2">${docName}</h4>
                    <p class="text-[9px] uppercase tracking-widest text-marble opacity-50">Drafting...</p>
                </div>`;
        });
    } else {
        // Vault Unlocked (Delivered)
        lockedNotice.classList.add('hidden');
        handoffContainer.classList.remove('hidden');
        videoContainer.classList.remove('hidden');

        // Render Downloadable Cards
        coreDocs.forEach(docName => {
            const dlLink = data.files ? data.files[docName] : '#';
            docsGrid.innerHTML += `
                <div class="p-6 border border-gold bg-[#0a0a0a] hover:bg-[#111] transition-colors group">
                    <span class="text-2xl mb-3 block text-gold group-hover:scale-110 transition-transform">📄</span>
                    <h4 class="text-marble font-bold text-sm mb-4">${docName}</h4>
                    <a href="${dlLink}" target="_blank" class="text-[10px] uppercase tracking-widest text-gold border-b border-gold pb-1 hover:text-marble hover:border-marble transition-colors">Download PDF &rarr;</a>
                </div>`;
        });

        // Check for Post-Mortem Requirement
        if (!data.debrief) {
            document.getElementById('modal-debrief').classList.remove('hidden');
        }
    }
}


// ─── 7. ENGINEERING HANDOFF CHECKLIST ───────────────────────────────────
function buildEngineering(data) {
    const checklist = document.getElementById('eng-checklist');
    if (!checklist) return;
    checklist.innerHTML = '';

    const addItem = (title, desc) => {
        checklist.innerHTML += `
            <label class="flex items-start gap-4 cursor-pointer p-4 bg-[#0a0a0a] border border-shadow hover:border-gold transition-colors group">
                <input type="checkbox" class="mt-1 accent-gold w-4 h-4 cursor-pointer">
                <div>
                    <span class="block text-sm text-marble font-bold group-hover:text-gold transition-colors">${title}</span>
                    <span class="block text-[11px] text-marble opacity-60 mt-2 leading-relaxed">${desc}</span>
                </div>
            </label>`;
    };

    // Dynamic Logic
    addItem('The HITL Disclaimer UI', 'Is there a visible label warning users to verify AI output? (Required by DOC_TOS §5.1)');
    
    if (data.architecture?.processes_pii) {
        addItem('Vector Deletion Protocol', 'Can you isolate and delete a specific user\'s embeddings from the Vector Store without destroying the model weights? (Required by DOC_DPA §7.2)');
        addItem('Context Window Isolation', 'Are API calls strictly scoped by user_id to prevent cross-leakage? (Required by DOC_DPA §8.1)');
    }
    if (data.action_scopes?.is_doer) {
        addItem('The Circuit Breaker', `Are max API spend limits (${data.action_scopes.spend_limit || 'Session Limits'}) hardcoded into the agent loop? (Required by DOC_AGT §4.1)`);
        addItem('The Kill Switch', 'Is there a functional /terminate endpoint that instantly revokes agent API keys? (Required by DOC_AGT §5.1)');
    }
}


// ─── 8. THE SYNDICATE (REFERRAL ENGINE) ─────────────────────────────────
function buildSyndicate(data) {
    const rewardText = document.getElementById('syndicate-reward');
    if (data.maintenanceActive && rewardText) {
        rewardText.innerHTML = '<span class="w-2 h-2 rounded-full bg-gold animate-pulse"></span> Reward: Free Strategy Session';
    }
    renderReferrals(data.referrals || []);
}

function renderReferrals(refs) {
    const list = document.getElementById('ref-list');
    if (!list) return;
    
    if (refs.length === 0) {
        list.innerHTML = '<p class="text-[11px] text-marble opacity-30 italic">No targets registered.</p>';
        return;
    }
    
    list.innerHTML = '';
    refs.forEach(r => {
        list.innerHTML += `
            <div class="flex justify-between items-center border-b border-shadow pb-3">
                <span class="font-sans text-xs text-marble font-bold tracking-wide">${r.company || r.name}</span>
                <span class="font-sans text-[9px] tracking-[0.2em] uppercase text-marble opacity-40 bg-shadow px-2 py-1">${r.status}</span>
            </div>`;
    });
}

const btnReferral = document.getElementById('btn-submit-referral');
if (btnReferral) {
    btnReferral.addEventListener('click', async () => {
        const name = document.getElementById('ref-name').value;
        const company = document.getElementById('ref-company').value;
        const email = document.getElementById('ref-email').value;
        const msg = document.getElementById('ref-msg');

        if (!name || !email) { 
            msg.textContent = "Target Name and Email required."; 
            msg.classList.remove('hidden', 'text-safe'); 
            msg.classList.add('text-danger'); 
            return; 
        }

        const btn = document.getElementById('btn-submit-referral');
        btn.textContent = "Registering..."; btn.disabled = true;

        const user = window.firebaseAuth.currentUser;
        const refObj = { name, company, email, status: 'Pending', date: new Date().toISOString() };
        
        const existingRefs = window.clientData.referrals || [];
        existingRefs.push(refObj);

        try {
            await setDoc(doc(window.firebaseDb, "clients", user.email), { referrals: existingRefs }, { merge: true });
            
            // Clean UI
            document.getElementById('ref-name').value = '';
            document.getElementById('ref-company').value = '';
            document.getElementById('ref-email').value = '';
            
            msg.textContent = "Target Registered Successfully."; 
            msg.classList.remove('hidden', 'text-danger'); 
            msg.classList.add('text-safe');
            
            renderReferrals(existingRefs);
        } catch(e) {
            console.error(e);
            msg.textContent = "Database Error.";
            msg.classList.remove('hidden');
        } finally {
            btn.textContent = "Register Target"; btn.disabled = false;
        }
    });
}


// ─── 9. MISSION POST-MORTEM LOGIC ───────────────────────────────────────
const btnDebrief = document.getElementById('btn-submit-debrief');
if (btnDebrief) {
    btnDebrief.addEventListener('click', async () => {
        const payload = {
            rating: document.getElementById('db-rating').value,
            catalyst: document.getElementById('db-catalyst').value,
            portal: document.getElementById('db-portal').value,
            result: document.getElementById('db-result').value,
            consent: document.getElementById('db-consent').checked,
            submittedAt: new Date().toISOString()
        };
        
        btnDebrief.textContent = "Encrypting..."; btnDebrief.disabled = true;

        try {
            const user = window.firebaseAuth.currentUser;
            await setDoc(doc(window.firebaseDb, "clients", user.email), { debrief: payload }, { merge: true });
            document.getElementById('modal-debrief').classList.add('hidden');
            window.clientData.debrief = payload; // Update local state
        } catch(e) {
            console.error("Debrief Error:", e);
            btnDebrief.textContent = "Error. Try Again."; btnDebrief.disabled = false;
        }
    });
}
