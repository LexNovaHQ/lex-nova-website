/**
 * LEX NOVA HQ — FORENSIC ENGINE v6.0
 * /bridge/firebase-adapter.js - The Integration Hub & Telemetry Radar
 * * THE SUPREME COMMAND: This is the ONLY file authorized to touch the database.
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

// ============================================================================
// 1. CONFIGURATION & BOOT
// ============================================================================
const firebaseConfig = {
    apiKey: "AIzaSyDO4s_W8_87XnsLnuAfyUqgsF8BgaHRYWA",
    authDomain: "lexnova-hq.firebaseapp.com",
    projectId: "lexnova-hq",
    storageBucket: "lexnova-hq.firebasestorage.app",
    messagingSenderId: "539475214055",
    appId: "1:539475214055:web:c01a99ec94ff073a9b6c42"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ============================================================================
// 2. GLOBAL STATE (In-Memory Security)
// ============================================================================
let activeProspectId = null;
let isWarmLead = false;

// ============================================================================
// 3. CORE EXECUTIONS
// ============================================================================

/**
 * Initializes the DB and checks for the ?pid= bypass.
 * Returns the path routing instruction for the State Machine.
 */
export async function initFirebase() {
    console.log("> Checking Identity Capture vectors...");
    
    const urlParams = new URLSearchParams(window.location.search);
    const pid = urlParams.get('pid');

    if (pid) {
        // Attempt the Warm Bypass
        const docRef = doc(db, "prospects", pid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            activeProspectId = pid;
            isWarmLead = true;
            const prospectData = docSnap.data();

            // PID CLICK TRACKING: Immediate update to Firestore
            await updateDoc(docRef, {
                scannerClicked: true,
                scannerStep: 'page_loaded',
                scannerStepAt: serverTimestamp(),
                status: 'ENGAGED',
                lastActive: serverTimestamp()
            });

            console.log(`> Warm lead confirmed & tracked: ${pid}.`);
            return { path: 'WARM', prospectId: activeProspectId, data: prospectData };
        } else {
            console.warn(`> Invalid PID provided: ${pid}. Reverting to Cold Gate.`);
        }
    }

    console.log("> Organic traffic detected. Routing to Cold Gate.");
    return { path: 'COLD' };
}

/**
 * Fires when a cold lead submits the Gate form.
 * Creates a new document in the "prospects" collection.
 */
export async function captureColdLead(email, companyName) {
    if (!email || !companyName) throw new Error("Missing email or company name.");

    // Generate a new ID for the organic lead
    const newId = `LN-ORG-${Date.now()}`;
    
    const docRef = doc(db, "prospects", newId);
    await setDoc(docRef, {
        email: email,
        company: companyName, // Key: company
        source: "organic_scanner_v6",
        status: "COLD_LEAD",
        addedAt: serverTimestamp() // Key: addedAt
    });

    activeProspectId = newId;
    isWarmLead = false;
    console.log(`> Cold lead captured: ${newId}`);
    return newId;
}

/**
 * Fires at the end of the Quiz. 
 * Saves the raw inputs and the calculated Threat_IDs.
 */
export async function saveForensicPayload(vaultInputs, activeGaps) {
    if (!activeProspectId) throw new Error("Cannot save payload: No active Prospect ID.");

    const docRef = doc(db, "prospects", activeProspectId);
    
    await updateDoc(docRef, {
        vaultInputs: vaultInputs,
        activeGaps: activeGaps,
        scannerCompleted: true, // Key: scannerCompleted
        scannerStepAt: serverTimestamp(), // Key: scannerStepAt
        status: "FORENSIC_COMPLETE"
    });

    console.log(`> Forensic payload locked to DB for PID: ${activeProspectId}`);
    return true;
}

/**
 * Utility getter for the Checkout Bridge to pass the PID to the Make webhook
 */
export function getActiveProspectId() {
    return activeProspectId;
}

// ============================================================================
// 4. TELEMETRY RADAR (Micro & Macro Tracking)
// ============================================================================

export const Telemetry = {
    /**
     * MACRO TRACKING: page_loaded, dashboard_viewed, checkout_initiated
     */
    logState: async (stepName) => {
        if (!activeProspectId) return; // Automatically uses the ID captured in Section 2
        
        try {
            await updateDoc(doc(db, "prospects", activeProspectId), {
                scannerStep: stepName,
                scannerStepAt: serverTimestamp(), // Key: scannerStepAt
                lastActive: serverTimestamp(),
                updatedAt: serverTimestamp() // Key: updatedAt
            });
            console.log(`> TELEMETRY: State updated to [${stepName}]`);
        } catch (e) {
            console.warn("> TELEMETRY: Failed to log macro state", e);
        }
    },

    /**
     * MICRO TRACKING: Exact question drop-off (e.g., lastQuestionSeen: 4)
     */
    logQuestionView: async (questionIndex) => {
        if (!activeProspectId) return;
        
        try {
            await updateDoc(doc(db, "prospects", activeProspectId), {
                lastQuestionSeen: questionIndex,
                scannerStep: `quiz_viewing_q${questionIndex}`,
                scannerStepAt: serverTimestamp(), // Key: scannerStepAt
                lastActive: serverTimestamp()
            });
        } catch (e) {}
    },

    /**
     * MICRO TRACKING: Live Answers (Records what they clicked before they finish)
     */
    logAnswer: async (questionIndex, questionText, answerText, penaltyScore) => {
        if (!activeProspectId) return;

        // We use dot notation to build a live map of answers in Firebase.
        const answerPayload = {
            [`liveAnswers.q${questionIndex}`]: {
                question: questionText,
                answer: answerText,
                penalty: penaltyScore,
                answeredAt: new Date().toISOString()
            },
            lastActive: serverTimestamp()
        };

        try {
            await updateDoc(doc(db, "prospects", activeProspectId), answerPayload);
            console.log(`> TELEMETRY: Logged Answer for Q${questionIndex}`);
        } catch (e) {}
    }
};
