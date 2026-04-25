import { describe, it, expect, beforeEach } from 'vitest';
import { useInitiativeStore } from '@/stores/initiativeStore';

const store = () => useInitiativeStore.getState();

beforeEach(() => store().reset());

describe('initiative wizard flow', () => {
  it('completes full init → streamEpic → splitCrews → refineCrews cycle', () => {
    // Step 1: Init
    const stream = store().createStream('Wealth Onboarding');
    store().selectStream(stream.id);
    store().setTitle('Wealth Initiative 2026');
    store().setDescription('Modernize onboarding');
    const c1 = store().addCrew('Alpha');
    const c2 = store().addCrew('Beta');
    store().setStep('streamEpic');

    // Step 2: Stream Epic
    store().setStreamEpic('## Risk Assessment\nContent\n## Compliance\nMore\n### Sub-compliance\nDetails\n## KYC\nDetails');
    store().parseHeadersFromEpic();
    expect(store().headers).toHaveLength(4); // 3 H2 + 1 H3
    expect(store().headers[2]!.level).toBe(3); // Sub-compliance is H3
    store().setStep('splitCrews');

    // Step 3: Split Crews (many-to-many)
    const headers = store().headers;
    store().applyAiProposal({
      [headers[0]!.id]: [c1.id],           // Risk → Alpha only
      [headers[1]!.id]: [c1.id, c2.id],    // Compliance → shared
      [headers[2]!.id]: [c2.id],           // Sub-compliance → Beta
      [headers[3]!.id]: [c2.id],           // KYC → Beta
    });

    // Verify many-to-many
    expect(store().headers[1]!.assignedCrewIds).toHaveLength(2);
    expect(store().headers[1]!.aiAssigned).toBe(true);

    // Verify crew composition (derived)
    const alphaHeaders = store().headers.filter(h => h.assignedCrewIds.includes(c1.id));
    const betaHeaders = store().headers.filter(h => h.assignedCrewIds.includes(c2.id));
    expect(alphaHeaders).toHaveLength(2); // Risk + Compliance
    expect(betaHeaders).toHaveLength(3);  // Compliance + Sub-compliance + KYC

    store().setStep('refineCrews');

    // Step 4: Refine
    store().setCrewRefineStatus(c1.id, 'refining');
    store().setCrewRefineStatus(c1.id, 'done');
    store().setCrewRefinedEpic(c1.id, '# Alpha Epic\n## Risk Assessment\nRefined content.\n## Compliance\nShared section.');

    store().setCrewRefineStatus(c2.id, 'refining');
    store().setCrewRefineStatus(c2.id, 'done');
    store().setCrewRefinedEpic(c2.id, '# Beta Epic\n## Compliance\n## Sub-compliance\n## KYC');

    // All done
    expect(store().crews.every(c => c.refineStatus === 'done')).toBe(true);
    expect(store().crews[0]!.refinedEpic).toContain('Risk Assessment');
    expect(store().crews[1]!.refinedEpic).toContain('KYC');
  });

  it('handles crew removal mid-assignment', () => {
    store().setStreamEpic('## H1\n## H2');
    store().parseHeadersFromEpic();
    const c1 = store().addCrew('Alpha');
    const c2 = store().addCrew('Beta');
    store().assignHeaderToCrew(store().headers[0]!.id, c1.id);
    store().assignHeaderToCrew(store().headers[0]!.id, c2.id);
    store().assignHeaderToCrew(store().headers[1]!.id, c2.id);

    // Remove Alpha — should unassign from all headers
    store().removeCrew(c1.id);
    expect(store().headers[0]!.assignedCrewIds).toEqual([c2.id]);
    expect(store().crews).toHaveLength(1);
  });

  it('re-applying AI proposal replaces previous assignments', () => {
    store().setStreamEpic('## H1\n## H2');
    store().parseHeadersFromEpic();
    const c1 = store().addCrew('A');
    const c2 = store().addCrew('B');
    const [h1, h2] = store().headers;

    // First proposal
    store().applyAiProposal({ [h1!.id]: [c1.id], [h2!.id]: [c2.id] });
    expect(store().headers[0]!.assignedCrewIds).toEqual([c1.id]);

    // Second proposal — replaces
    store().applyAiProposal({ [h1!.id]: [c2.id], [h2!.id]: [c1.id, c2.id] });
    expect(store().headers[0]!.assignedCrewIds).toEqual([c2.id]);
    expect(store().headers[1]!.assignedCrewIds).toEqual([c1.id, c2.id]);
  });
});
