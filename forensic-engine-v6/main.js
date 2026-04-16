/**
 * LEX NOVA HQ — FORENSIC ENGINE v6.0
 * /main.js - Application Bootstrapper
 * * THE SUPREME COMMAND: This is the single entry point. It contains NO UI logic.
 * It enforces the Magna Carta, connects the integration hub, and starts the funnel.
 */

// Strict ES6 Imports from the isolated subdirectories
import { validateGovernance } from './config/governance.js';
import { initFirebase } from './bridge/firebase-adapter.js';
import { startStateMachine } from './core/state-machine.js';

document.addEventListener('DOMContentLoaded', async () => {
    console.log("> LEX NOVA FORENSIC ENGINE v6.0 INITIALIZING...");

    try {
        // ====================================================================
        // STEP 1: THE KILL SWITCH
        // ====================================================================
        // Verify the Magna Carta constraints (Pricing, Rates). 
        // If this throws an error, the system physically refuses to load the Gate.
        validateGovernance();
        console.log("> Governance verified. Margins protected.");

        // ====================================================================
        // STEP 2: IDENTITY CAPTURE & INTEGRATION
        // ====================================================================
        // Boot Firebase & check for Prospect ID (?pid=) bypass in the URL.
        // This sets the global state determining if they hit the Cold Gate or Config.
        await initFirebase();
        console.log("> Integration Hub connected.");

        // ====================================================================
        // STEP 3: FUNNEL HANDOFF
        // ====================================================================
        // Hand control to the Central Nervous System to render the UI.
        startStateMachine();

    } catch (error) {
        console.error("> CRITICAL ENGINE FAILURE:", error);
        
        // ====================================================================
        // PHYSICAL HALT
        // ====================================================================
        // Protects against broken states, API outages, or hacked pricing.
        const loader = document.getElementById('view-loader');
        if(loader) {
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
