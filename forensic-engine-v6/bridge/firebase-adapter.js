/**
 * LEX NOVA HQ — FORENSIC ENGINE v6.0
 * /bridge/firebase-adapter.js - The Integration Hub & Telemetry Radar
 *
 * SCHEMA v2.0: Added saveConfessedGaps() for registry-enriched quiz gap persistence.
 * All existing function signatures preserved.
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
// 2. GLOBAL STATE
// ============================================================================
let activeProspectId = null;
let isWarmLead = false;

// ============================================================================
// 3. CORE EXECUTIONS
// ============================================================================

/**
 * Initializes DB and checks for ?pid= warm bypass.
 * Returns routing instruction for the State Machine.
 */
export async function initFirebase() {
    console.log("> Checking Identity Capture vectors...");

    const urlParams = new URLSearchParams(window.location.search);
    const pid = urlParams.get('pid');

    if (pid) {
        const docRef = doc(db, "prospects", pid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            activeProspectId = pid;
            isWarmLead = true;
            const prospectData = docSnap.data();

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
            console.warn(`> Invalid PID: ${pid}. Reverting to Cold Gate.`);
        }
    }

    console.log("> Organic traffic detected. Routing to Cold Gate.");
    return { path: 'COLD' };
}

/**
 * Creates a new document for cold traffic.
 */
export async function captureColdLead(email, companyName) {
    if (!email || !companyName) throw new Error("Missing email or company name.");

    const newId = `LN-ORG-${Date.now()}`;
    const docRef = doc(db, "prospects", newId);

    await setDoc(docRef, {
        email: email,
        company: companyName,
        source: "organic_scanner_v6",
        status: "COLD_LEAD",
        addedAt: serverTimestamp()
    });

    activeProspectId = newId;
    isWarmLead = false;
    console.log(`> Cold lead captured: ${newId}`);
    return newId;
}

/**
 * Saves quiz payload at quiz completion.
 * vaultInputs: full Q&A log with threatId per entry.
 * activeGaps: [{threatId, penalty}] objects.
 */
export async function saveForensicPayload(vaultInputs, activeGaps) {
    if (!activeProspectId) throw new Error("Cannot save payload: No active Prospect ID.");

    const docRef = doc(db, "prospects", activeProspectId);

    await updateDoc(docRef, {
        vaultInputs: vaultInputs,
        activeGaps: activeGaps,
        scannerCompleted: true,
        scannerStepAt: serverTimestamp(),
        status: "FORENSIC_COMPLETE"
    });

    console.log(`> Forensic payload saved for PID: ${activeProspectId}`);
    return true;
}

/**
 * Saves registry-enriched gap objects built from quiz confessions.
 * These are full true_gaps-format objects, persisted for external consumption
 * (admin panel, Architect, Copywriter pipeline).
 *
 * confessedGaps: Array of full gap objects in true_gaps schema,
 * built by buildConfessedGaps() in main.js after registry is loaded.
 */
export async function saveConfessedGaps(confessedGaps) {
    if (!activeProspectId) {
        console.warn("> saveConfessedGaps: No active PID. Skipping.");
        return false;
    }
    if (!confessedGaps || confessedGaps.length === 0) return false;

    const docRef = doc(db, "prospects", activeProspectId);

    await updateDoc(docRef, {
        confessedGaps: confessedGaps,
        confessedGapsSavedAt: serverTimestamp()
    });

    console.log(`> ${confessedGaps.length} confessedGaps saved for PID: ${activeProspectId}`);
    return true;
}

/**
 * Utility getter — used by checkout bridge.
 */
export function getActiveProspectId() {
    return activeProspectId;
}

// ============================================================================
// 4. TELEMETRY RADAR
// ============================================================================

export const Telemetry = {
    logState: async (stepName) => {
        if (!activeProspectId) return;
        try {
            await updateDoc(doc(db, "prospects", activeProspectId), {
                scannerStep: stepName,
                scannerStepAt: serverTimestamp(),
                lastActive: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            console.log(`> TELEMETRY: State → [${stepName}]`);
        } catch (e) {
            console.warn("> TELEMETRY: Failed to log state", e);
        }
    },

    logQuestionView: async (questionIndex) => {
        if (!activeProspectId) return;
        try {
            await updateDoc(doc(db, "prospects", activeProspectId), {
                lastQuestionSeen: questionIndex,
                scannerStep: `quiz_viewing_q${questionIndex}`,
                scannerStepAt: serverTimestamp(),
                lastActive: serverTimestamp()
            });
        } catch (e) {}
    },

    logAnswer: async (questionIndex, questionText, answerText, penaltyScore) => {
        if (!activeProspectId) return;
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
        } catch (e) {}
    }
};
