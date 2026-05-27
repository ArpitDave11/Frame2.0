/**
 * DuplicateDetector — AI seam for "find epics that look like duplicates
 * within a pod" (B-34).
 *
 * The simulator uses Jaccard similarity over tokenized titles. Pairs
 * scoring above `DUPLICATE_THRESHOLD` are grouped (transitively — if
 * A~B and B~C, all three end up in one group). The Azure implementation
 * in B-37 can use embeddings/cosine similarity for better recall but
 * the contract — returning DuplicateGroup[] — is stable.
 */

import type { Epic } from '@/domain/brp';

export const DUPLICATE_THRESHOLD = 0.6;
const STOP_WORDS = new Set([
  'a', 'an', 'and', 'as', 'at', 'be', 'by', 'for', 'from', 'in', 'into',
  'is', 'it', 'of', 'on', 'or', 'the', 'to', 'with',
]);

export interface DuplicateGroup {
  /** Epic ids in this group. Always 2+. */
  epicIds: string[];
  /** Highest pairwise similarity inside the group. Range [0, 1]. */
  topSimilarity: number;
}

export interface DuplicateDetector {
  /**
   * Find duplicate groups among the given epics. Returns an empty list
   * when there are < 2 epics or no pair meets the threshold.
   */
  findDuplicates(epics: readonly Epic[]): Promise<DuplicateGroup[]>;
}

function tokenize(title: string): Set<string> {
  return new Set(
    title
      .toLowerCase()
      .split(/[^a-z0-9]+/g)
      .filter((t) => t.length > 1 && !STOP_WORDS.has(t)),
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let intersection = 0;
  for (const t of a) if (b.has(t)) intersection++;
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export const simulatedDuplicateDetector: DuplicateDetector = {
  async findDuplicates(epics) {
    if (epics.length < 2) return [];

    const tokens = epics.map((e) => tokenize(e.title));
    // Union-find over epic indices for the transitive grouping.
    const parent = epics.map((_, i) => i);
    const findRoot = (i: number): number => {
      let r = i;
      while (parent[r] !== r) r = parent[r] as number;
      while (parent[i] !== r) {
        const next = parent[i] as number;
        parent[i] = r;
        i = next;
      }
      return r;
    };
    const union = (a: number, b: number): void => {
      const ra = findRoot(a);
      const rb = findRoot(b);
      if (ra !== rb) parent[ra] = rb;
    };

    // Track the top similarity inside each component as we go.
    const componentTopSim = new Map<number, number>();

    for (let i = 0; i < epics.length; i++) {
      for (let j = i + 1; j < epics.length; j++) {
        const sim = jaccard(tokens[i] as Set<string>, tokens[j] as Set<string>);
        if (sim >= DUPLICATE_THRESHOLD) {
          union(i, j);
        }
        // After union, the new root tracks the top similarity seen.
        if (sim >= DUPLICATE_THRESHOLD) {
          const root = findRoot(i);
          const prev = componentTopSim.get(root) ?? 0;
          if (sim > prev) componentTopSim.set(root, sim);
        }
      }
    }

    // Bucket epics by component root.
    const buckets = new Map<number, number[]>();
    for (let i = 0; i < epics.length; i++) {
      const root = findRoot(i);
      const list = buckets.get(root) ?? [];
      list.push(i);
      buckets.set(root, list);
    }

    // Re-resolve componentTopSim under the final canonical roots.
    const finalTopSim = new Map<number, number>();
    for (const [oldRoot, sim] of componentTopSim) {
      const canonical = findRoot(oldRoot);
      const prev = finalTopSim.get(canonical) ?? 0;
      if (sim > prev) finalTopSim.set(canonical, sim);
    }

    const groups: DuplicateGroup[] = [];
    for (const [root, members] of buckets) {
      if (members.length < 2) continue;
      groups.push({
        epicIds: members.map((idx) => (epics[idx] as Epic).id),
        topSimilarity: finalTopSim.get(root) ?? 0,
      });
    }
    return groups;
  },
};

export function getDuplicateDetector(): DuplicateDetector {
  return simulatedDuplicateDetector;
}
