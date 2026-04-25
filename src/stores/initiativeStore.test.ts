// src/stores/initiativeStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useInitiativeStore } from './initiativeStore';

const store = () => useInitiativeStore.getState();

beforeEach(() => store().reset());

describe('initiativeStore', () => {
  describe('streams', () => {
    it('creates a stream with id and name', () => {
      const s = store().createStream('Wealth Onboarding', 'desc');
      expect(s.name).toBe('Wealth Onboarding');
      expect(s.id).toBeTruthy();
      expect(store().streams).toHaveLength(1);
    });

    it('selects a stream', () => {
      const s = store().createStream('S1');
      store().selectStream(s.id);
      expect(store().selectedStreamId).toBe(s.id);
    });
  });

  describe('crews', () => {
    it('adds a crew', () => {
      const c = store().addCrew('Alpha');
      expect(c.name).toBe('Alpha');
      expect(c.refineStatus).toBe('pending');
      expect(store().crews).toHaveLength(1);
    });

    it('removes a crew and unassigns its headers', () => {
      const c = store().addCrew('Alpha');
      store().setStreamEpic('## Header One\nContent');
      store().parseHeadersFromEpic();
      store().assignHeaderToCrew(store().headers[0]!.id, c.id);
      store().removeCrew(c.id);
      expect(store().crews).toHaveLength(0);
      expect(store().headers[0]!.assignedCrewIds).toEqual([]);
    });

    it('renames a crew', () => {
      const c = store().addCrew('Alpha');
      store().renameCrew(c.id, 'Beta');
      expect(store().crews[0]!.name).toBe('Beta');
    });
  });

  describe('headers + assignment', () => {
    it('parses H2 and H3 headers from markdown', () => {
      store().setStreamEpic('## Risk Assessment\nText\n### Sub-risk\nMore\n## Compliance\nText');
      store().parseHeadersFromEpic();
      expect(store().headers).toHaveLength(3);
      expect(store().headers[0]!.text).toBe('Risk Assessment');
      expect(store().headers[0]!.level).toBe(2);
      expect(store().headers[1]!.text).toBe('Sub-risk');
      expect(store().headers[1]!.level).toBe(3);
    });

    it('assigns a header to a crew (many-to-many)', () => {
      store().setStreamEpic('## H1\n## H2');
      store().parseHeadersFromEpic();
      const c1 = store().addCrew('A');
      const c2 = store().addCrew('B');
      const hId = store().headers[0]!.id;
      store().assignHeaderToCrew(hId, c1.id);
      store().assignHeaderToCrew(hId, c2.id);
      expect(store().headers[0]!.assignedCrewIds).toEqual([c1.id, c2.id]);
    });

    it('unassigns a header from a crew', () => {
      store().setStreamEpic('## H1');
      store().parseHeadersFromEpic();
      const c = store().addCrew('A');
      const hId = store().headers[0]!.id;
      store().assignHeaderToCrew(hId, c.id);
      store().unassignHeaderFromCrew(hId, c.id);
      expect(store().headers[0]!.assignedCrewIds).toEqual([]);
    });

    it('applies AI proposal', () => {
      store().setStreamEpic('## H1\n## H2');
      store().parseHeadersFromEpic();
      const c1 = store().addCrew('A');
      const c2 = store().addCrew('B');
      const [h1, h2] = store().headers;
      store().applyAiProposal({ [h1!.id]: [c1.id], [h2!.id]: [c1.id, c2.id] });
      expect(store().headers[0]!.assignedCrewIds).toEqual([c1.id]);
      expect(store().headers[1]!.assignedCrewIds).toEqual([c1.id, c2.id]);
      expect(store().headers[1]!.aiAssigned).toBe(true);
    });
  });

  describe('wizard step', () => {
    it('defaults to init', () => {
      expect(store().currentStep).toBe('init');
    });

    it('sets step', () => {
      store().setStep('splitCrews');
      expect(store().currentStep).toBe('splitCrews');
    });
  });

  describe('reset', () => {
    it('clears all state', () => {
      store().createStream('S');
      store().addCrew('C');
      store().setTitle('T');
      store().reset();
      expect(store().streams).toHaveLength(0);
      expect(store().crews).toHaveLength(0);
      expect(store().title).toBe('');
    });
  });
});
