/**
 * LEX NOVA HQ — FORENSIC ENGINE v6.0
 * /core/state-machine.js - The Central Nervous System (Head of Security)
 * * THE SUPREME COMMAND: This file strictly controls DOM visibility. 
 * It prevents users from walking backwards or bypassing legal constraints.
 */

// ============================================================================
// 0. DEPENDENCIES
// ============================================================================
import { renderWelcomeScreen } from '../ui/dom-manager.js';
import { getActiveProspectId } from '../bridge/firebase-adapter.js';

// ============================================================================
// 1. THE BLUEPRINT (Master Room List)
// ============================================================================
// Every major section in scanner.html. Only one can be active at a time.
const VIEWS = [
    'state-loader', 
    'state-gate', 
    'state-vip', 
    'state-quiz', 
    'state-dashboard'
];

/**
 * The Master Utility: Hides all rooms, then turns on the lights for the target.
 */
function switchView(targetId) {
    VIEWS.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.classList.add('hidden-state');
            el.classList.remove('fade-enter');
        }
    });

    const targetEl = document.getElementById(targetId);
    if (targetEl) {
        targetEl.classList.remove('hidden-state');
        // Force DOM reflow to restart CSS animations
        void targetEl.offsetWidth; 
        targetEl.classList.add('fade-enter');
        console.log(`> STATE MACHINE: Escorted user to [${targetId}]`);
    } else {
        console.error(`> STATE MACHINE ERROR: Room [${targetId}] does not exist in DOM.`);
    }
}

// ============================================================================
// 2. THE FRONT DOOR (Traffic Routing)
// ============================================================================

/**
 * Called by main.js after Firebase connects.
 * Evaluates the routing instruction and opens the correct funnel door.
 */
export function initStateMachine(routingInstruction) {
    console.log("> STATE MACHINE: Processing entry credentials...");

    // Small delay to let the initial "Loader" pulse run for psychological weight
    setTimeout(() => {
        if (routingInstruction && routingInstruction.path === 'WARM') {
            // THE VIP PATH
            // THE BRIEFCASE HANDOFF: Passing the full data object to the painter
            renderWelcomeScreen(routingInstruction.data); 
            switchView('state-vip');
        } else {
            // THE STREET PATH
            switchView('state-gate');
        }
    }, 1500); 
}

// ============================================================================
// 3. THE USHER (Funnel Transitions)
// ============================================================================

/**
 * Triggered by dom-manager when a COLD lead submits their email.
 * (Note: Config logic is now merged directly into the start of the quiz flow)
 */
export function advanceToConfig() {
    console.log("> STATE MACHINE: Config bypassed in v6.0. Escorting to Quiz.");
    advanceToQuiz();
}

/**
 * Triggered when users are ready to begin the diagnostic.
 */
export function advanceToQuiz() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    switchView('state-quiz');
}

/**
 * Triggered by the scoring processor when the final question is answered.
 */
export function advanceToDashboard() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    switchView('state-dashboard');
}

// ============================================================================
// 4. THE BOUNCER (Legal Firewall Enforcer)
// ============================================================================

/**
 * Triggered when the user clicks "Secure Architecture" on the Dashboard.
 * physically routes the user out of the scanner and into the secure Engagement Portal.
 */
export function advanceToCheckout(pid, plan) {
    console.log("> STATE MACHINE: Checking Legal Firewall routing...");

    if (!pid || !plan) {
        console.error("> BOUNCER ERROR: Missing transaction credentials. Blocked.");
        return;
    }

    // The user is securely redirected to the v6.0 Engagement Portal
    console.log(`> Bouncer cleared. Escorting PID [${pid}] to checkout for [${plan}].`);
    window.location.href = `./engagement.html?pid=${pid}&plan=${plan}`;
}
