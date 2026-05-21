/**
 * Issue Refinery — dev-only prompt-cache HUD (R-13).
 *
 * Floating bottom-right panel showing the last 3 stage calls'
 * `cached_tokens` counts. Renders nothing in production builds.
 *
 * v1 caveat: `aiClient.callAI` does not yet expose
 * `data.usage.prompt_tokens_details.cached_tokens` (see review C3 in
 * docs/reviews/2026-05-21-issue-refinery-phase-A-review.md). Until that
 * extension lands, the store's `lastCachedTokens` field stays empty and
 * this HUD shows a "no data yet" notice. The component shape is shipped
 * now so the wiring is in place when aiClient is extended.
 */

import React from 'react';
import { useIssueRefineryStore } from '@/stores/issueRefineryStore';

function isDev(): boolean {
  // Vite injects this constant; the typeof guard keeps the bundler from tripping
  // in jsdom test environments where `import.meta.env` may be undefined.
  try {
    return typeof import.meta !== 'undefined' && Boolean(import.meta.env?.DEV);
  } catch {
    return false;
  }
}

export interface PromptCacheHUDProps {
  /** Force-render for unit tests without touching `import.meta.env`. */
  forceVisible?: boolean;
}

export const PromptCacheHUD: React.FC<PromptCacheHUDProps> = ({ forceVisible }) => {
  const tokens = useIssueRefineryStore((s) => s.lastCachedTokens);
  if (!forceVisible && !isDev()) return null;

  return (
    <aside className="ir-cache-hud" data-testid="cache-hud" aria-label="Prompt cache debug HUD">
      <h6 className="ir-cache-hud__title">Cache HUD</h6>
      {tokens.length === 0 ? (
        <p className="ir-cache-hud__empty">No data yet — aiClient pending extension.</p>
      ) : (
        <ol className="ir-cache-hud__list">
          {tokens.map((n, i) => (
            <li key={i} className={`ir-cache-hud__item${n > 0 ? ' ir-cache-hud__item--hit' : ' ir-cache-hud__item--miss'}`}>
              <span className="ir-cache-hud__stage">stage {i + 1}</span>
              <span className="ir-cache-hud__count">{n.toLocaleString()} cached</span>
            </li>
          ))}
        </ol>
      )}
    </aside>
  );
};
