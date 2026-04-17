/**
 * LEX NOVA HQ — FORENSIC ENGINE v6.0
 * /engine/hostage-rule.js — The Psychological Squeeze
 *
 * Source-aware Hostage Rule v2.0.
 * Exported separately so both scoring-processor and dashboard-renderer import it.
 *
 * RULES (locked):
 *
 * TIER 1 — FULLY VISIBLE (earned, no cap):
 *   - ALL dual-verified threats (public scrape + founder confession)
 *   - ALL quiz_confession threats (founder told us, scrape missed it)
 *   These are never blurred or locked regardless of position in sort.
 *
 * TIER 2 — FULLY VISIBLE (gifted, hard cap: 2):
 *   - Top 2 scrape-only T1 threats
 *   Establishes extinction-level framing even with zero confessions.
 *
 * TIER 3 — PARTIALLY VISIBLE (next 2–3 after fully visible set):
 *   Show: evidence block + source badge + tier badge + blast radius (FP_Impact) + Lex Nova Fix™
 *   Blur: threat name + mechanism (FP_Mechanism) + legal precedent (Legal_Pain)
 *   Note: quiz_confession threats are NEVER in this tier (promoted to fully visible above).
 *
 * TIER 4 — LOCKED:
 *   All remaining threats. Single collapsed card with count + CTA.
 *
 * PARTIAL COUNT RULE:
 *   After the fully-visible set is determined, partial = min(3, remaining).
 *   If remaining after fully-visible is ≤ 3, all go partial (none locked).
 *   If remaining is > 3, partial = 3, rest locked.
 */

export function applyHostageRule(sortedThreats) {
    const total = sortedThreats.length;
    if (total === 0) {
        return { clearGaps: [], blurredGaps: [], lockedGaps: [], hostageIds: [] };
    }

    const clearGaps   = [];
    const blurredGaps = [];
    const lockedGaps  = [];

    // ── STEP 1: Collect earned-visible threats ──────────────────────────
    // dual-verified and quiz_confession are always fully shown
    const earnedIds = new Set();

    sortedThreats.forEach(t => {
        if (t.source === 'dual-verified' || t.source === 'quiz_confession') {
            clearGaps.push(t);
            earnedIds.add(t.threatId);
        }
    });

    // ── STEP 2: Gifted visibility — top 2 scrape-only T1 ────────────────
    let giftedT1Count = 0;
    sortedThreats.forEach(t => {
        if (earnedIds.has(t.threatId)) return; // already added
        if (t.source === 'scrape' && t.calculatedSeverity === 'T1' && giftedT1Count < 2) {
            clearGaps.push(t);
            earnedIds.add(t.threatId);
            giftedT1Count++;
        }
    });

    // ── STEP 3: Remaining threats for partial/locked assignment ──────────
    const remaining = sortedThreats.filter(t => !earnedIds.has(t.threatId));

    const PARTIAL_COUNT = Math.min(3, remaining.length);

    remaining.forEach((t, i) => {
        if (i < PARTIAL_COUNT) {
            blurredGaps.push(t);
        } else {
            lockedGaps.push(t);
        }
    });

    const hostageIds = [...blurredGaps, ...lockedGaps].map(t => t.threatId);

    console.log(
        `> HOSTAGE RULE: ${clearGaps.length} clear | ${blurredGaps.length} partial | ${lockedGaps.length} locked`
    );

    return { clearGaps, blurredGaps, lockedGaps, hostageIds };
}
