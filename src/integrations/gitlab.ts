// ─── CGRF Header ──────────────────────────────
// File:        src/integrations/gitlab.ts
// Stage:       07_BUILD
// SRS:         SRS-CN-WRITERS-LIVINGWORLD-001
// CAPS:        pending
// CK:          pending
// Dispatch:    DISP-LIVINGWORLD-writers
// Seat:        BITS-CODEGEN
// Owner:       Citadel Nexus Inc.
// Created:     2026-09-25
// Depends:     src/integrations/sources.ts
// EnumType:    Adapter
// EnumEdges:   PRODUCES src/integrations/sources.ts
// DAG Node:    writers.integration.gitlab
// Intent:      Convert read-only private GitLab metadata into opaque quest and aggregate activity signals.
// ────────────────────────────────────────────────

import { createHmac } from 'node:crypto';

import {
  quietSnapshot,
  type LivingWorldSource,
  type SanitizedSourceSnapshot,
} from './sources.js';

type FetchLike = typeof fetch;

interface GitLabConfiguration {
  baseUrl: string;
  projectId: string;
  readToken: string;
  lorePath: string;
  idHmacKey: string;
  activityWindowMinutes: number;
  activityCap: number;
}

interface GitLabPipeline {
  status?: unknown;
  updated_at?: unknown;
}

interface GitLabMergeRequest {
  iid?: unknown;
  state?: unknown;
  updated_at?: unknown;
}

interface GitLabCommit {
  committed_date?: unknown;
}

export class GitLabLoreBridge implements LivingWorldSource {
  readonly configured = true;

  constructor(
    private readonly configuration: GitLabConfiguration,
    private readonly fetchImplementation: FetchLike = fetch,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async snapshot(): Promise<SanitizedSourceSnapshot> {
    try {
      const project = encodeURIComponent(this.configuration.projectId);
      const lorePath = encodeURIComponent(this.configuration.lorePath);
      const [pipelines, mergeRequests, loreCommits] = await Promise.all([
        this.get<GitLabPipeline[]>(
          `/api/v4/projects/${project}/pipelines?per_page=20&order_by=updated_at&sort=desc`,
        ),
        this.get<GitLabMergeRequest[]>(
          `/api/v4/projects/${project}/merge_requests?scope=all&state=all&per_page=20&order_by=updated_at&sort=desc`,
        ),
        this.get<GitLabCommit[]>(
          `/api/v4/projects/${project}/repository/commits?path=${lorePath}&per_page=20`,
        ),
      ]);
      const cutoff = this.now().getTime() - this.configuration.activityWindowMinutes * 60_000;
      const activePipelines = pipelines.filter(
        (pipeline) =>
          ['running', 'pending'].includes(String(pipeline.status)) &&
          this.isRecent(pipeline.updated_at, cutoff),
      ).length;
      const recentMergeRequests = mergeRequests.filter((request) =>
        this.isRecent(request.updated_at, cutoff),
      );
      const recentLoreChanges = loreCommits.filter((commit) =>
        this.isRecent(commit.committed_date, cutoff),
      ).length;
      const activityLevel = Math.min(
        1,
        (activePipelines + recentMergeRequests.length + recentLoreChanges) /
          this.configuration.activityCap,
      );
      const quests = recentMergeRequests.flatMap((request) => {
        if (typeof request.iid !== 'number') {
          return [];
        }
        const state = String(request.state);
        if (!['opened', 'closed', 'merged'].includes(state)) {
          return [];
        }
        return [
          {
            id: this.opaqueId(`merge-request:${request.iid}`),
            title: 'Editorial merge request',
            state: state === 'opened' ? ('open' as const) : ('closed' as const),
          },
        ];
      });

      return {
        source: 'gitlab',
        activityLevel,
        quests,
        progression: {
          questsCompleted: recentMergeRequests.filter((request) =>
            ['closed', 'merged'].includes(String(request.state)),
          ).length,
        },
        observedAt: this.now().toISOString(),
      };
    } catch (error: unknown) {
      console.warn('writers_gitlab_unavailable', {
        error_name: error instanceof Error ? error.name : 'UnknownError',
      });
      return quietSnapshot('gitlab', this.now);
    }
  }

  private async get<T>(path: string): Promise<T> {
    const response = await this.fetchImplementation(`${this.configuration.baseUrl}${path}`, {
      method: 'GET',
      headers: { 'PRIVATE-TOKEN': this.configuration.readToken },
    });
    if (!response.ok) {
      throw new Error('GitLabReadFailed');
    }
    return (await response.json()) as T;
  }

  private isRecent(value: unknown, cutoff: number): boolean {
    if (typeof value !== 'string') {
      return false;
    }
    const timestamp = Date.parse(value);
    return Number.isFinite(timestamp) && timestamp >= cutoff;
  }

  private opaqueId(value: string): string {
    return `gl-${createHmac('sha256', this.configuration.idHmacKey)
      .update(value)
      .digest('hex')
      .slice(0, 24)}`;
  }
}

export class NoopGitLabBridge implements LivingWorldSource {
  readonly configured = false;
  constructor(private readonly now: () => Date = () => new Date()) {}
  async snapshot(): Promise<SanitizedSourceSnapshot> {
    return quietSnapshot('gitlab', this.now);
  }
}

function positiveNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/** Create a read-only bridge only when every private runtime value is configured. */
export function createGitLabLoreBridge(
  environment: NodeJS.ProcessEnv = process.env,
  fetchImplementation: FetchLike = fetch,
): GitLabLoreBridge | NoopGitLabBridge {
  const baseUrl = environment.GITLAB_BASE_URL?.trim().replace(/\/$/, '');
  const projectId = environment.GITLAB_PROJECT_ID?.trim();
  const readToken = environment.GITLAB_READ_TOKEN?.trim();
  const lorePath = environment.GITLAB_LORE_PATH?.trim();
  const idHmacKey = environment.SOURCE_ID_HMAC_KEY?.trim();
  if (!baseUrl || !projectId || !readToken || !lorePath || !idHmacKey) {
    return new NoopGitLabBridge();
  }

  return new GitLabLoreBridge(
    {
      baseUrl,
      projectId,
      readToken,
      lorePath,
      idHmacKey,
      activityWindowMinutes: positiveNumber(environment.SOURCE_ACTIVITY_WINDOW_MINUTES, 15),
      activityCap: positiveNumber(environment.SOURCE_ACTIVITY_CAP, 10),
    },
    fetchImplementation,
  );
}
