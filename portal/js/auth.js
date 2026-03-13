// ════════════════════════════════════════════════════════════════════════
// ═════════ LEX NOVA HQ: AUTHENTICATION MODULE (auth.js) ═════════════════
// ════════════════════════════════════════════════════════════════════════
// Description: Handles Firebase Passwordless Magic Links and Session states.
// Dependencies: window.firebaseAuth (Initialized in index.html)
// ════════════════════════════════════════════════════════════════════════

import { 
    sendSignInLinkToEmail, 
    isSignInWithEmailLink, 
    signInWithEmailLink, 
    signOut 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// Ensure we strip any existing query parameters for the clean return URL
const PORTAL_URL = window.location.href.split('?')[0]; 

// ─── 1. DOM ELEMENT REFERENCES ──────────────────────────────────────────
const dom = {
    stateInput:     document.getElementById('state-input'),
    stateSent:      document.getElementById('state-sent'),
    stateVerifying: document.getElementById('state-verifying'),
    stateError:     document.getElementById('state-error'),
    emailInput:     document.getElementById('email-input'),
    btnSendLink:    document.getElementById('btn-send-link'),
    btnSignout:     document.getElementById('btn-signout'),
    btnReturnLogin: document.getElementById('btn-return-login'),
    loginError:     document.getElementById('login-error')
};

// ─── 2. CORE FUNCTION: TRANSMIT MAGIC LINK ──────────────────────────────
window.sendMagicLink = function() {
    const email = dom.emailInput.value.trim();
    
    // Basic validation
    if (!email || !email.includes('@')) { 
        dom.loginError.textContent = "Please enter a valid work email."; 
        dom.loginError.classList.remove('hidden'); 
        return; 
    }
    
    // UI Loading State
    dom.loginError.classList.add('hidden');
    dom.btnSendLink.textContent = "Transmitting..."; 
    dom.btnSendLink.disabled = true;

    // Firebase Link Configuration
    const actionCodeSettings = {
        url: PORTAL_URL,
        handleCodeInApp: true
    };

    // Execute Transmission
    sendSignInLinkToEmail(window.firebaseAuth, email, actionCodeSettings)
        .then(() => {
            // Save email locally to avoid prompting user on the same device
            window.localStorage.setItem('emailForSignIn', email);
            
            // Transition UI to "Signal Sent"
            dom.stateInput.classList.replace('block', 'hidden');
            dom.stateSent.classList.replace('hidden', 'block');
        })
        .catch((err) => {
            console.error("Auth Transmission Error:", err);
            dom.loginError.textContent = "Transmission failed. Network or server error.";
            dom.loginError.classList.remove('hidden');
            
            // Reset Button
            dom.btnSendLink.textContent = "Send Access Link →"; 
            dom.btnSendLink.disabled = false;
        });
};

// ─── 3. EVENT LISTENERS ─────────────────────────────────────────────────

// Trigger Magic Link on Button Click
if (dom.btnSendLink) {
    dom.btnSendLink.addEventListener('click', window.sendMagicLink);
}

// Trigger Magic Link on 'Enter' Key Press
if (dom.emailInput) {
    dom.emailInput.addEventListener('keydown', (e) => { 
        if (e.key === 'Enter') {
            e.preventDefault();
            window.sendMagicLink(); 
        }
    });
}

// Handle Sign Out
if (dom.btnSignout) {
    dom.btnSignout.addEventListener('click', () => { 
        signOut(window.firebaseAuth).then(() => {
            // Hard reload to clear SPA state and return to login screen
            window.location.reload();
        }).catch((err) => {
            console.error("Sign Out Error:", err);
        });
    });
}

// Handle Return to Gate (Error Screen Retry)
if (dom.btnReturnLogin) {
    dom.btnReturnLogin.addEventListener('click', () => {
        // Strip the invalid token from URL and reload cleanly
        window.history.replaceState({}, document.title, PORTAL_URL);
        window.location.reload();
    });
}


// ─── 4. INCOMING MAGIC LINK VERIFICATION ────────────────────────────────
// When the user clicks the link in their email, they return here.

if (isSignInWithEmailLink(window.firebaseAuth, window.location.href)) {
    
    // Immediately show verifying cinematic
    dom.stateInput.classList.replace('block', 'hidden');
    dom.stateVerifying.classList.replace('hidden', 'block');
    
    // Retrieve email from localStorage (if same device)
    let email = window.localStorage.getItem('emailForSignIn');
    
    // If different device or cleared storage, we must ask for it
    if (!email) {
        email = window.prompt("Security Check: Please confirm your work email address to authenticate.");
    }
    
    // Final Authentication Execution
    if (email) {
        signInWithEmailLink(window.firebaseAuth, email, window.location.href)
            .then((result) => {
                // Success: Clear local storage to prevent old data caching
                window.localStorage.removeItem('emailForSignIn');
                
                // Note: We DO NOT transition the UI or route the user here.
                // The global onAuthStateChanged observer in dashboard.js 
                // will detect the successful login and securely route them to the Vault or Dashboard.
            })
            .catch((err) => {
                console.error("Link Verification Error:", err);
                // Fail: Show Error Screen
                dom.stateVerifying.classList.replace('block', 'hidden');
                dom.stateError.classList.replace('hidden', 'block');
            });
    } else {
        // User cancelled the prompt
        dom.stateVerifying.classList.replace('block', 'hidden');
        dom.stateError.classList.replace('hidden', 'block');
    }
}
