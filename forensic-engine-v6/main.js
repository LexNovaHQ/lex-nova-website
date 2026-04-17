/**
 * LEX NOVA HQ — FORENSIC ENGINE v6.0
 * /main.js - Application Bootstrapper (The Ignition Switch)
 * * THE SUPREME COMMAND: This is the single entry point. It contains NO UI logic.
 * It enforces the Magna Carta, connects the integration hub, tracks telemetry, and starts the funnel.
 */

// Strict ES6 Imports from the isolated subdirectories
import { validateGovernance } from './config/governance.js';
import { initFirebase, Telemetry } from './bridge/firebase-adapter.js';
import { initStateMachine } from './core/state-machine.js'; 
import { generateFinalReport } from './engine/scoring-processor.js';
import { renderDashboard } from './ui/dashboard-renderer.js';
import { getInterrogationPayload } from './engine/question-router.js'; 

document.addEventListener('DOMContentLoaded', async () => {
    console.log("> LEX NOVA FORENSIC ENGINE v6.0 INITIALIZING...");

    // Target the correct container from the new v6.0 scanner.html
    const loader = document.getElementById('state-loader');

    try {
        // ====================================================================
        // STEP 1: THE KILL SWITCH
        // ====================================================================
        if (typeof validateGovernance === 'function') {
            validateGovernance();
            console.log("> Governance verified. Margins protected.");
        }

        // ====================================================================
        // STEP 2: IDENTITY CAPTURE, INTEGRATION & TELEMETRY
        // ====================================================================
        const identity = await initFirebase();
        console.log(`> Integration Hub connected. Routing Path: [${identity.path}]`);

        // Fire initial Telemetry Ping
        if (identity.pid) {
            Telemetry.logState("page_loaded_warm_lead");
        } else {
            Telemetry.logState("page_loaded_cold_traffic");
        }

        // ====================================================================
        // STEP 3: FUNNEL HANDOFF
        // ====================================================================
        // FIXED: Execute the correct function name
        initStateMachine(identity);

        // Kill the loading screen once the routing is complete
        if (loader) {
            loader.classList.add('hidden-state');
        }

    console.log("> IGNITION: Handoff complete. Engine is live.");

        // ====================================================================
        // STEP 4: ORCHESTRATE THE DASHBOARD
        // ====================================================================
        document.addEventListener('LnDiagnosticComplete', async (e) => {
            console.log("> MAIN: Diagnostic Complete caught. Waking up Actuary...");
            
            try {
                // 1. Get the payload and lanes
                const lanes = e.detail.lanes || ['commercial'];
                const payload = getInterrogationPayload();
                
                // 2. Fetch the Threat Registry (The Intelligence Database)
                const registryReq = await fetch('./data/registry.json');
                const registryData = await registryReq.json();
                
                // 3. Extract jurisdictional surfaces (Default to B2B Enterprise if null)
                const surfaces = identity?.data?.jurisdictional_surface || ['EXT.09']; 
                
                // 4. Run the Actuarial Math
                const finalReport = generateFinalReport(payload, lanes, surfaces, registryData, identity?.data || {});
                
                // 5. Paint the final UI Canvas
                renderDashboard(finalReport, identity?.data || {});
                
            } catch (err) {
                console.error("> MAIN: Dashboard Orchestration Failed", err);
            }
        });
        
    } catch (error) {
        console.error("> CRITICAL ENGINE FAILURE:", error);
        
        // ====================================================================
        // PHYSICAL HALT
        // ====================================================================
        if (loader) {
            loader.classList.remove('hidden-state');
            loader.innerHTML = `
                <div class="border border-danger/30 bg-danger/10 p-6 rounded-md max-w-md mx-auto mt-10 text-left">
                    <h3 class="text-danger font-serif tracking-widest uppercase mb-2">System Halt</h3>
                    <p class="text-marble/70 font-mono text-xs mb-4">Governance or Integration failure. System locked to prevent margin bleed.</p>
                    <p class="text-danger/80 font-mono text-[10px] uppercase">Error: ${error.message}</p>
                </div>
            `;
        }
    }
});
