/**
 * LEX NOVA HQ — FORENSIC ENGINE v6.0
 * /core/state-machine.js - The Central Nervous System (Head of Security)
 * * THE SUPREME COMMAND: This file strictly controls DOM visibility. 
 * It prevents users from walking backwards or bypassing legal constraints.
 */

// ============================================================================
// 0. DEPENDENCIES (Hooks into future UI modules)
// ============================================================================
import { renderWelcomeScreen } from '../ui/dom-manager.js';
import { getActiveProspectId } from '../bridge/firebase-adapter.js';

// ============================================================================
// 1. THE BLUEPRINT (Master Room List)
// ============================================================================
// Every major section in scanner.html. Only one can be active at a time.
const VIEWS = [
    'view-loader', 
    'state-gate', 
    'view-welcome', // Added for the VIP ABM bypass
    'view-config', 
    'state-quiz', 
    'state-dashboard', 
    'view-checkout'
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
export function startStateMachine(routingInstruction) {
    console.log("> STATE MACHINE: Processing entry credentials...");

    // ADDED: Small delay to let the initial "Loader" pulse run for psychological weight
    setTimeout(() => {
        if (routingInstruction && routingInstruction.path === 'WARM') {
            // THE VIP PATH
            // 1. Call the UI Painter to populate the badges & threat data using their ID
            renderWelcomeScreen(routingInstruction.pid);
            // 2. Open the VIP Lounge
            switchView('view-welcome');
        } else {
            // THE STREET PATH
            // Send them to the email capture gate
            switchView('state-gate');
        }
    }, 1500); 
}

// ============================================================================
// 3. THE USHER (Funnel Transitions)
// ============================================================================

/**
 * Triggered by dom-manager when a COLD lead submits their email.
 */
export function advanceToConfig() {
    switchView('view-config');
}

/**
 * Triggered by dom-manager when:
 * A) A COLD lead selects their Archetypes on the Config screen.
 * B) A WARM lead clicks "Initiate Diagnostic" from the VIP Welcome screen.
 */
export function advanceToQuiz() {
    // Scroll to top of window to ensure they see the first question
    window.scrollTo({ top: 0, behavior: 'smooth' });
    switchView('state-quiz');
}

/**
 * Triggered by scoring-processor when the 10th question is answered.
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
 * physically blocks checkout if the user has not accepted the Terms.
 */
export function advanceToCheckout() {
    console.log("> STATE MACHINE: Checking Legal Firewall status...");

    if (isEngagementAccepted()) {
        // The user has already scrolled and accepted. Open the checkout room.
        console.log("> Firewall cleared. Opening Checkout.");
        window.scrollTo({ top: 0, behavior: 'smooth' });
        switchView('view-checkout');
    } else {
        // The user has NOT accepted. Block the transition and force the Modal.
        console.warn("> Firewall triggered. Forcing Engagement Letter Modal.");
        triggerEngagementModal();
    }
}
