/**
 * LEX NOVA HQ — FORENSIC ENGINE v6.0
 * /ui/dom-manager.js - The Painter
 * * THE SUPREME COMMAND: This module handles all DOM manipulation for the front 
 * half of the funnel (Welcome, Gate, Config, Quiz). It does no math.
 */

import { advanceToConfig, advanceToQuiz, advanceToDashboard } from '../core/state-machine.js';
import { buildInterrogationRoute, getNextQuestion, submitAnswer } from '../engine/question-router.js';

// ============================================================================
// 1. STATE (UI Memory)
// ============================================================================
let uiState = {
    email: '',
    company: '',
    selectedLanes: [],
    selectedArchs: []
};

// ============================================================================
// 2. THE VIP CANVAS (ABM Welcome Screen)
// ============================================================================

/**
 * Called by the State Machine when a WARM lead arrives.
 * Paints the personalized data from Firebase directly onto the screen.
 */
export function renderWelcomeScreen(prospectData) {
    console.log("> PAINTER: Rendering VIP Lounge...");

    const founderFirst = (prospectData.founderName || prospectData.name || '').split(' ')[0] || 'there';
    const compName = prospectData.company || 'your company';
    const gapCount = (prospectData.forensicGaps || []).length;

    // Paint the text
    document.getElementById('pid-greeting').innerText = `Hi ${founderFirst},`;
    document.getElementById('pid-headline').innerText = `${compName}'s AI Architecture Audit`;

    // Paint the Threat Badges if the Hunter found external gaps
    if (gapCount > 0) {
        let nuc = 0, crit = 0, high = 0;
        prospectData.forensicGaps.forEach(g => {
            const s = (g.severity || '').toUpperCase();
            if (s === 'NUCLEAR' || s === 'T1' || s === 'T2') nuc++;
            else if (s === 'CRITICAL' || s === 'T3') crit++;
            else high++;
        });

        document.getElementById('pid-body').innerText = `We reviewed ${compName}'s public legal architecture and mapped ${gapCount} structural gaps across your setup. This scanner confirms which ones are active inside your actual operations.`;

        let badgeHTML = '';
        if (nuc) badgeHTML += `<span class="bg-danger/10 border border-danger/20 px-3 py-1 text-[9px] text-danger font-bold tracking-widest">${nuc} CRITICAL/EXTINCTION</span>`;
        if (crit) badgeHTML += `<span class="bg-orange-500/10 border border-orange-500/20 px-3 py-1 text-[9px] text-orange-500 font-bold tracking-widest">${crit} HIGH</span>`;
        
        document.getElementById('pid-badges').innerHTML = badgeHTML;
        document.getElementById('pid-intel').classList.remove('hidden-state');
    }

    // Wire the VIP Start Button (Bypasses Config completely)
    const startBtn = document.getElementById('pid-start-btn');
    if (startBtn) {
        startBtn.onclick = () => {
            // Assume archetypes based on their data, default to "creates"
            const archs = prospectData.primaryArchetype || ['creates'];
            const lanes = prospectData.intendedPlan === 'complete_stack' ? ['commercial', 'operational'] : ['commercial'];
            
            buildInterrogationRoute(lanes, archs);
            advanceToQuiz();
            paintNextQuestion();
        };
    }
}

// ============================================================================
// 3. THE COLD CANVAS (Email Gate & Config)
// ============================================================================

/**
 * Wires up the cold traffic email capture form.
 */
export function initializeGate() {
    const form = document.getElementById('entry-form');
    if (!form) return;

    form.onsubmit = (e) => {
        e.preventDefault();
        
        // Grab data and store it
        uiState.email = document.getElementById('entry-email').value.trim().toLowerCase();
        uiState.company = document.getElementById('entry-company').value.trim();
        
        localStorage.setItem('ln_email', uiState.email);
        localStorage.setItem('ln_company', uiState.company);

        // Tell the Head of Security to move them to the next room
        advanceToConfig();
    };
}

/**
 * Wires up the Lane and Archetype selection buttons for cold traffic.
 */
export function initializeConfig() {
    const startBtn = document.getElementById('btn-start');

    const checkReady = () => {
        const isReady = uiState.selectedLanes.length > 0 && uiState.selectedArchs.length > 0;
        startBtn.disabled = !isReady;
        startBtn.classList.toggle('opacity-30', !isReady);
        startBtn.classList.toggle('cursor-not-allowed', !isReady);
    };

    // Lane Toggles
    document.querySelectorAll('.lane-toggle').forEach(btn => {
        btn.onclick = (e) => {
            const val = e.currentTarget.getAttribute('data-lane');
            e.currentTarget.classList.toggle('border-gold');
            e.currentTarget.classList.toggle('bg-gold/5');
            
            if (uiState.selectedLanes.includes(val)) {
                uiState.selectedLanes = uiState.selectedLanes.filter(l => l !== val);
            } else {
                uiState.selectedLanes.push(val);
            }
            checkReady();
        };
    });

    // Arch Toggles
    document.querySelectorAll('.arch-toggle').forEach(btn => {
        btn.onclick = (e) => {
            const val = e.currentTarget.getAttribute('data-arch');
            e.currentTarget.classList.toggle('border-gold');
            e.currentTarget.classList.toggle('bg-gold/5');
            
            if (uiState.selectedArchs.includes(val)) {
                uiState.selectedArchs = uiState.selectedArchs.filter(a => a !== val);
            } else {
                uiState.selectedArchs.push(val);
            }
            checkReady();
        };
    });

    // Wire the Start Quiz Button
    if (startBtn) {
        startBtn.onclick = () => {
            buildInterrogationRoute(uiState.selectedLanes, uiState.selectedArchs);
            advanceToQuiz();
            paintNextQuestion();
        };
    }
}

// ============================================================================
// 4. THE INTERROGATION CANVAS (The Quiz UI)
// ============================================================================

/**
 * Asks the Engine for the next question and paints it.
 */
function paintNextQuestion() {
    const questionData = getNextQuestion();

    // If the Engine returns null, the interrogation is over.
    if (!questionData) {
        console.log("> PAINTER: Interrogation complete. Requesting Dashboard transition.");
        advanceToDashboard();
        
        // Fire an event so Module 10 (Dashboard Renderer) knows to wake up and paint the math
        document.dispatchEvent(new CustomEvent('LnDiagnosticComplete', { 
            detail: { lanes: uiState.selectedLanes, archs: uiState.selectedArchs } 
        }));
        return;
    }

    // 1. Paint the Progress Bar
    document.getElementById('progress-text').innerText = `Step ${questionData.stepCurrent} of ${questionData.stepTotal}`;
    document.getElementById('progress-bar').style.width = `${(questionData.stepCurrent / questionData.stepTotal) * 100}%`;

    // 2. Paint the Question Text
    document.getElementById('question-text').innerText = questionData.questionText;

    // 3. Paint the Options
    const container = document.getElementById('options-container');
    container.innerHTML = ''; // Clear previous buttons

    questionData.options.forEach((opt, index) => {
        const btn = document.createElement('button');
        btn.className = "w-full text-left bg-[#080808] border border-shadow p-5 text-marble font-sans text-sm hover:border-gold hover:text-gold transition-all duration-300";
        btn.innerText = opt.t;
        
        btn.onclick = () => {
            // Tell the Engine what they clicked
            submitAnswer(index);
            // Recursively paint the next one
            paintNextQuestion();
        };
        
        container.appendChild(btn);
    });
}
