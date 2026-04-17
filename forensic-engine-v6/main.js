/**
 * LEX NOVA HQ — FORENSIC ENGINE v6.0
 * /main.js - Application Bootstrapper
 *
 * SCHEMA v2.0:
 * - After quiz completion, builds registry-enriched confessedGaps and saves to Firestore
 * - All existing routing logic preserved
 */

import { validateGovernance } from './config/governance.js';
import { initFirebase, Telemetry, saveConfessedGaps } from './bridge/firebase-adapter.js';
import { initStateMachine } from './core/state-machine.js';
import { generateFinalReport, buildConfessedGaps } from './engine/scoring-processor.js';
import { renderDashboard } from './ui/dashboard-renderer.js';
import { getInterrogationPayload } from './engine/question-router.js';

document.addEventListener('DOMContentLoaded', async () => {
    console.log("> LEX NOVA FORENSIC ENGINE v6.0 INITIALIZING...");

    const loader = document.getElementById('state-loader');

    try {
        // ── STEP 1: GOVERNANCE CHECK ──────────────────────────────────────
        if (typeof validateGovernance === 'function') {
            validateGovernance();
            console.log("> Governance verified.");
        }

        // ── STEP 2: IDENTITY & FIREBASE ───────────────────────────────────
        const identity = await initFirebase();
        console.log(`> Integration Hub connected. Path: [${identity.path}]`);

        // Telemetry ping
        if (identity.pid) {
            Telemetry.logState("page_loaded_warm_lead");
        } else {
            Telemetry.logState("page_loaded_cold_traffic");
        }

        // ── STEP 3: FUNNEL HANDOFF ────────────────────────────────────────
        initStateMachine(identity);

        if (loader) loader.classList.add('hidden-state');

        console.log("> IGNITION: Handoff complete. Engine live.");

        // ── STEP 4: DASHBOARD ORCHESTRATION ──────────────────────────────
        document.addEventListener('LnDiagnosticComplete', async (e) => {
            console.log("> MAIN: Diagnostic Complete. Orchestrating dashboard...");

            try {
                const lanes = e.detail.lanes || ['commercial'];
                const payload = getInterrogationPayload();

                // Fetch the threat registry
                const registryReq = await fetch('./data/registry.json');
                const registryData = await registryReq.json();

                // Build registry-enriched confessedGaps from quiz answers
                const confessedGaps = buildConfessedGaps(payload.activeGaps, registryData);

                // Persist confessedGaps to Firestore (async, non-blocking)
                saveConfessedGaps(confessedGaps).catch(err => {
                    console.warn("> MAIN: confessedGaps save failed (non-fatal):", err);
                });

                // Jurisdictional surfaces
                const surfaces = identity?.data?.jurisdictional_surface || ['EXT.09'];

                // Run actuarial math and build final report
                const finalReport = generateFinalReport(
                    payload,
                    lanes,
                    surfaces,
                    registryData,
                    identity?.data || {}
                );

                // Render the dashboard
                renderDashboard(finalReport, identity?.data || {});

            } catch (err) {
                console.error("> MAIN: Dashboard orchestration failed:", err);
            }
        });

    } catch (error) {
        console.error("> CRITICAL ENGINE FAILURE:", error);

        if (loader) {
            loader.classList.remove('hidden-state');
            loader.innerHTML = `
            <div class="border border-danger/30 bg-danger/10 p-6 max-w-md mx-auto mt-10 text-left">
                <h3 class="text-danger font-serif tracking-widest uppercase mb-2">System Halt</h3>
                <p class="text-marble/60 font-mono text-xs mb-4">
                    Governance or Integration failure. System locked to prevent margin bleed.
                </p>
                <p class="text-danger/70 font-mono text-[10px] uppercase">Error: ${error.message}</p>
            </div>`;
        }
    }
});
