/**
 * LEX NOVA HQ — FORENSIC ENGINE v6.0
 * main.js - Application Bootstrapper
 */

// We import as ES6 Modules. These files must exist in the exact subdirectories.
import { validateGovernance } from './config/governance.js';
import { initFirebase } from './bridge/firebase-adapter.js';
import { startStateMachine } from './core/state-machine.js';

document.addEventListener('DOMContentLoaded', async () => {
    console.log("> LEX NOVA FORENSIC ENGINE v6.0 INITIALIZING...");

    try {
        // 1. Verify the Magna Carta constraints (Pricing, Rates, Active Mode)
        // If this fails, the system refuses to load the Gate.
        validateGovernance();
        console.log("> Governance verified. Margins protected.");

        // 2. Boot Firebase & check for Prospect ID (?pid=) bypass
        await initFirebase();
        console.log("> Integration Hub connected.");

        // 3. Hand control to the Core to render the UI
        startStateMachine();

    } catch (error) {
        console.error("> CRITICAL ENGINE FAILURE:", error);
        
        // Physical halt. Protects against broken states or hacked pricing.
        const loader = document.getElementById('view-loader');
        if(loader) {
            loader.innerHTML = `
                <div class="border border-danger/30 bg-danger/10 p-6 rounded-md max-w-md mx-auto mt-10">
                    <h3 class="text-danger font-serif tracking-widest uppercase mb-2">System Halt</h3>
                    <p class="text-marble/70 font-mono text-xs">Governance or Integration failure. System locked to prevent margin bleed. Check console logs.</p>
                </div>
            `;
        }
    }
});
