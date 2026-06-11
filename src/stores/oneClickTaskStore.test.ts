import { describe, it, expect, beforeEach } from 'vitest';
import { useOneClickTaskStore } from './oneClickTaskStore';
import { composeTaskBody } from '@/actions/oneClickTaskAction';

const PARENT = { iid: 3, projectId: 1, webUrl: 'https://gitlab.com/g/home/-/issues/3', title: 'US-001', body: 'do math' };
const GEN = { title: 'Write tests', description: 'A test suite.', acceptanceCriteria: ['covers ops'], suggestedWeight: 3 };

beforeEach(() => useOneClickTaskStore.getState().reset());

describe('oneClickTaskStore', () => {
  it('openModal stores the parent and resets state', () => {
    useOneClickTaskStore.getState().setPrompt('stale');
    useOneClickTaskStore.getState().openModal(PARENT);
    const s = useOneClickTaskStore.getState();
    expect(s.open).toBe(true);
    expect(s.parent?.iid).toBe(3);
    expect(s.prompt).toBe('');
    expect(s.phase).toBe('configure');
  });

  it('builds an editable draft from the generated task', () => {
    useOneClickTaskStore.getState().setDraftFromGenerated(GEN);
    const d = useOneClickTaskStore.getState().draft!;
    expect(d.title).toBe('Write tests');
    expect(d.weight).toBe(3);
    expect(d.acceptanceCriteria).toEqual(['covers ops']);
  });

  it('setCreated moves to published', () => {
    useOneClickTaskStore.getState().setCreated({ iid: 11, webUrl: 'x' });
    expect(useOneClickTaskStore.getState().phase).toBe('published');
  });
});

describe('composeTaskBody', () => {
  it('renders description + acceptance task list', () => {
    const body = composeTaskBody({ title: 'T', description: 'A suite.', acceptanceCriteria: ['a', 'b'], weight: 3 });
    expect(body).toContain('A suite.');
    expect(body).toContain('## Acceptance Criteria');
    expect(body).toContain('- [ ] a');
    expect(body).toContain('- [ ] b');
  });
  it('omits the criteria section when empty', () => {
    expect(composeTaskBody({ title: 'T', description: 'x', acceptanceCriteria: [], weight: null })).not.toContain('Acceptance');
  });
});
