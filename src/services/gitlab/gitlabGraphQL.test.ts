import { describe, it, expect } from 'vitest';
import { namespacePathFromWebUrl } from './gitlabGraphQL';

describe('namespacePathFromWebUrl', () => {
  it('extracts the project path from an issue URL', () => {
    expect(namespacePathFromWebUrl('https://gitlab.com/dave-group7025824/pod-a2/commons/home/-/issues/3'))
      .toBe('dave-group7025824/pod-a2/commons/home');
  });
  it('extracts the project path from a work-item URL', () => {
    expect(namespacePathFromWebUrl('https://gitlab.com/g/sub/home/-/work_items/11'))
      .toBe('g/sub/home');
  });
  it('returns null for an unrecognized URL', () => {
    expect(namespacePathFromWebUrl('https://example.com/nope')).toBeNull();
  });
});
