import type { GitLabConfig } from '@/domain/configTypes';
import { fetchGroupMetadata, fetchGitLabSubgroups, createGitLabEpic, updateGitLabEpic } from './gitlabClient';

export interface StreamGroup {
  id: number;
  name: string;
  fullPath: string;
}

export interface GroupNode {
  id: number;
  name: string;
  fullPath: string;
  children: GroupNode[];
}

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

export async function fetchStreamTree(
  config: GitLabConfig,
  streamGroupId: string,
): Promise<Result<{ stream: StreamGroup; crews: StreamGroup[]; tree: GroupNode }>> {
  const metaResult = await fetchGroupMetadata(config, streamGroupId);
  if (!metaResult.success) return { ok: false, error: metaResult.error ?? 'Failed to fetch stream group' };

  const meta = metaResult.data!;
  const stream: StreamGroup = { id: meta.id, name: meta.name, fullPath: meta.full_path };

  const subResult = await fetchGitLabSubgroups(config, streamGroupId);
  if (!subResult.success) return { ok: false, error: subResult.error ?? 'Failed to fetch crew subgroups' };

  const crews: StreamGroup[] = (subResult.data ?? []).map((sg) => ({
    id: typeof sg.id === 'string' ? parseInt(sg.id, 10) : (sg.id as number),
    name: sg.name,
    fullPath: sg.full_path,
  }));

  const tree: GroupNode = {
    id: stream.id, name: stream.name, fullPath: stream.fullPath,
    children: crews.map((c) => ({ id: c.id, name: c.name, fullPath: c.fullPath, children: [] })),
  };

  return { ok: true, data: { stream, crews, tree } };
}

// ─── Publish Initiative Epics ──────────────────────────────

export interface PublishInput {
  streamGroupId: number;
  streamTitle: string;
  streamEpicMarkdown: string;
  crews: Array<{ gitlabGroupId: number; name: string; refinedEpic: string; localId: string }>;
}

export interface PublishOutput {
  streamEpicId: number;
  streamEpicIid: number;
  crewEpics: Array<{ crewName: string; epicId: number; epicIid: number; localId: string }>;
}

export async function publishInitiativeEpics(
  config: GitLabConfig,
  input: PublishInput,
): Promise<Result<PublishOutput>> {
  // Step A: Create Stream Epic in the stream group
  const streamResult = await createGitLabEpic(config, {
    title: input.streamTitle,
    description: input.streamEpicMarkdown,
    group_id: String(input.streamGroupId),
  });
  if (!streamResult.success || !streamResult.data) {
    return { ok: false, error: streamResult.error ?? 'Failed to create stream epic' };
  }
  const streamEpic = streamResult.data;

  // Step B: For each crew, create epic in crew's subgroup + link to parent
  const crewEpics: PublishOutput['crewEpics'] = [];
  const errors: string[] = [];

  for (const crew of input.crews) {
    const crewResult = await createGitLabEpic(config, {
      title: crew.name,
      description: crew.refinedEpic,
      group_id: String(crew.gitlabGroupId),
    });
    if (!crewResult.success || !crewResult.data) {
      errors.push(crew.name + ': ' + (crewResult.error ?? 'creation failed'));
      continue;
    }
    const crewEpic = crewResult.data;

    // Link to parent — parent_id is GLOBAL streamEpic.id (NOT iid!)
    const linkResult = await updateGitLabEpic(
      config,
      String(crew.gitlabGroupId),
      crewEpic.iid,
      { parent_id: streamEpic.id },
    );
    if (!linkResult.success) {
      errors.push(crew.name + ': parent linking failed — ' + (linkResult.error ?? ''));
    }

    crewEpics.push({
      crewName: crew.name, epicId: crewEpic.id, epicIid: crewEpic.iid, localId: crew.localId,
    });
  }

  if (errors.length > 0) {
    return { ok: false, error: 'Partial failure: ' + errors.join('; ') };
  }
  return { ok: true, data: { streamEpicId: streamEpic.id, streamEpicIid: streamEpic.iid, crewEpics } };
}
