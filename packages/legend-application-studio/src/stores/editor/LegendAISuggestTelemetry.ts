/**
 * Copyright (c) 2026-present, Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { NetworkClientError, uuid } from '@finos/legend-shared';
import { EntityChangeType, type EntityChange } from '@finos/legend-server-sdlc';
import type { TelemetryService } from '@finos/legend-application';
import type { LegendSourceInfo } from '@finos/legend-storage';
import {
  LEGENDAI_SUGGEST_ABANDON_PHASE,
  LEGENDAI_SUGGEST_ERROR_KIND,
  LEGENDAI_SUGGEST_RETENTION,
  LEGENDAI_SUGGEST_STAGE,
  LEGENDAI_SUGGEST_SURFACE,
  LegendStudioTelemetryHelper,
  type LegendAISuggestDataProductApplyData,
  type LegendAISuggestIdentity,
  type LegendAISuggestTarget,
} from '../../__lib__/LegendStudioTelemetryHelper.js';
import type { EditorStore } from './EditorStore.js';

/**
 * Edit ratios are computed with a full Levenshtein pass; skip it for texts
 * longer than this so a push never pays for a quadratic diff on huge docs.
 */
const MAX_EDIT_RATIO_TEXT_LENGTH = 2000;

const isNonEmptyText = (text: string | undefined): text is string =>
  Boolean(text?.trim());

/**
 * Normalized Levenshtein distance between two strings (0 = identical,
 * 1 = completely different). Returns `undefined` when either string is too
 * long to diff cheaply.
 */
export const computeLegendAISuggestEditRatio = (
  before: string,
  after: string,
): number | undefined => {
  if (
    before.length > MAX_EDIT_RATIO_TEXT_LENGTH ||
    after.length > MAX_EDIT_RATIO_TEXT_LENGTH
  ) {
    return undefined;
  }
  const maxLength = Math.max(before.length, after.length);
  if (maxLength === 0) {
    return 0;
  }
  let previousRow = Array.from({ length: after.length + 1 }, (_, i) => i);
  for (let i = 1; i <= before.length; i++) {
    const currentRow = [i];
    for (let j = 1; j <= after.length; j++) {
      const substitutionCost = before[i - 1] === after[j - 1] ? 0 : 1;
      currentRow[j] = Math.min(
        (previousRow[j] as number) + 1,
        (currentRow[j - 1] as number) + 1,
        (previousRow[j - 1] as number) + substitutionCost,
      );
    }
    previousRow = currentRow;
  }
  return (previousRow[after.length] as number) / maxLength;
};

export const classifyLegendAISuggestError = (
  error: Error,
  stage: LEGENDAI_SUGGEST_STAGE,
): { errorKind: LEGENDAI_SUGGEST_ERROR_KIND; httpStatus?: number } => {
  if (stage === LEGENDAI_SUGGEST_STAGE.SERIALIZE) {
    return { errorKind: LEGENDAI_SUGGEST_ERROR_KIND.SERIALIZATION };
  }
  if (error instanceof NetworkClientError) {
    const httpStatus = error.response.status;
    if (httpStatus === 401 || httpStatus === 403) {
      return { errorKind: LEGENDAI_SUGGEST_ERROR_KIND.ENTITLEMENT, httpStatus };
    }
    if (httpStatus >= 500) {
      return { errorKind: LEGENDAI_SUGGEST_ERROR_KIND.SERVER, httpStatus };
    }
    if (httpStatus >= 400) {
      return { errorKind: LEGENDAI_SUGGEST_ERROR_KIND.CLIENT, httpStatus };
    }
    return { errorKind: LEGENDAI_SUGGEST_ERROR_KIND.OTHER, httpStatus };
  }
  return { errorKind: LEGENDAI_SUGGEST_ERROR_KIND.OTHER };
};

/**
 * Reads the current value of the text an applied suggestion wrote, looking the
 * element up by path in the current graph (element instances do not survive
 * graph rebuilds, so readers must not close over them). Returns
 * `{ found: false }` when the target no longer exists.
 */
export type LegendAIAppliedTextReader = (
  editorStore: EditorStore,
) => { found: false } | { found: true; text: string | undefined };

type LegendAIAppliedSuggestion = {
  identity: LegendAISuggestIdentity;
  appliedText: string;
  appliedAt: number;
  readCurrentText: LegendAIAppliedTextReader;
  supersededApplyCount: number;
};

const getTargetKey = (target: LegendAISuggestTarget): string =>
  [target.surface, target.elementPath, target.accessPointGroupId ?? ''].join(
    '\u0000',
  );

/**
 * Remembers suggestions applied in this editor session until the element they
 * touched is pushed, then reports whether the applied text survived
 * (`editor.legendai-suggest.persisted`). Only the latest apply per target is
 * kept; earlier ones are counted in `supersededApplyCount`.
 *
 * NOTE: tracking is keyed by element path, so an element renamed after the
 * apply is not reported.
 */
export class LegendAIAppliedSuggestionRegistry {
  private readonly appliedSuggestions = new Map<
    string,
    LegendAIAppliedSuggestion
  >();

  get size(): number {
    return this.appliedSuggestions.size;
  }

  register(
    suggestion: Omit<LegendAIAppliedSuggestion, 'supersededApplyCount'>,
  ): void {
    const key = getTargetKey(suggestion.identity);
    const previous = this.appliedSuggestions.get(key);
    this.appliedSuggestions.set(key, {
      ...suggestion,
      supersededApplyCount: previous ? previous.supersededApplyCount + 1 : 0,
    });
  }

  reportPushedChanges(
    editorStore: EditorStore,
    pushedChanges: EntityChange[],
  ): void {
    if (!this.appliedSuggestions.size) {
      return;
    }
    const changeTypeByPath = new Map(
      pushedChanges.map((change) => [change.entityPath, change.type]),
    );
    const now = Date.now();
    Array.from(this.appliedSuggestions.entries()).forEach(
      ([key, suggestion]) => {
        const changeType = changeTypeByPath.get(
          suggestion.identity.elementPath,
        );
        if (changeType === undefined) {
          // not part of this push, keep waiting
          return;
        }
        this.appliedSuggestions.delete(key);
        let retention: LEGENDAI_SUGGEST_RETENTION;
        let editRatio: number | undefined;
        const current =
          changeType === EntityChangeType.DELETE
            ? ({ found: false } as const)
            : suggestion.readCurrentText(editorStore);
        if (!current.found) {
          retention = LEGENDAI_SUGGEST_RETENTION.ELEMENT_REMOVED;
        } else if (!isNonEmptyText(current.text)) {
          retention = LEGENDAI_SUGGEST_RETENTION.CLEARED;
        } else if (current.text === suggestion.appliedText) {
          retention = LEGENDAI_SUGGEST_RETENTION.UNCHANGED;
        } else {
          retention = LEGENDAI_SUGGEST_RETENTION.EDITED;
          editRatio = computeLegendAISuggestEditRatio(
            suggestion.appliedText,
            current.text,
          );
        }
        LegendStudioTelemetryHelper.logEvent_LegendAISuggestPersisted(
          editorStore.applicationStore.telemetryService,
          editorStore.editorMode.getSourceInfo(),
          {
            ...suggestion.identity,
            retention,
            editRatio,
            msSinceApply: now - suggestion.appliedAt,
            supersededApplyCount: suggestion.supersededApplyCount,
          },
        );
      },
    );
  }
}

/**
 * A single suggestion request, returned by
 * {@link LegendAISuggestTelemetryTracker.launch} and passed back when the
 * request settles so late responses are still attributed correctly.
 */
export type LegendAISuggestRequest = {
  readonly suggestionId: string;
  readonly attempt: number;
  readonly launchedAt: number;
  readonly textAtLaunch: string | undefined;
};

type ShownSuggestion = {
  request: LegendAISuggestRequest;
  shownAt: number;
};

/**
 * Drives the `editor.legendai-suggest.*` lifecycle for one editor instance
 * (one service editor, one dataspace home tab, one data product access point
 * group) and keeps the legacy per-surface events firing alongside it.
 *
 * Lifecycle: `launch` → `succeed` | `fail` → `apply` | `discard`, with
 * `dispose` reporting an `abandon` when the editor goes away while a request
 * is pending or a suggestion is on screen.
 */
export class LegendAISuggestTelemetryTracker {
  private readonly editorStore: EditorStore;
  private target: LegendAISuggestTarget;
  private attemptCount = 0;
  private pending: LegendAISuggestRequest | undefined;
  private shown: ShownSuggestion | undefined;

  constructor(editorStore: EditorStore, target: LegendAISuggestTarget) {
    this.editorStore = editorStore;
    this.target = target;
  }

  /**
   * Keeps the target fresh (e.g. after an element or group rename) without
   * resetting the attempt count.
   */
  setTarget(target: LegendAISuggestTarget): void {
    this.target = target;
  }

  private get telemetryService(): TelemetryService {
    return this.editorStore.applicationStore.telemetryService;
  }

  private get sourceInfo(): LegendSourceInfo | undefined {
    return this.editorStore.editorMode.getSourceInfo();
  }

  private identity(request: LegendAISuggestRequest): LegendAISuggestIdentity {
    return {
      ...this.target,
      suggestionId: request.suggestionId,
      attempt: request.attempt,
    };
  }

  reportExposure(data: { available: boolean; isReadOnly: boolean }): void {
    LegendStudioTelemetryHelper.logEvent_LegendAISuggestExposure(
      this.telemetryService,
      this.sourceInfo,
      { ...this.target, ...data },
    );
  }

  launch(data: {
    existingText: string | undefined;
    accessPointCount?: number | undefined;
  }): LegendAISuggestRequest {
    this.attemptCount += 1;
    const request: LegendAISuggestRequest = {
      suggestionId: uuid(),
      attempt: this.attemptCount,
      launchedAt: Date.now(),
      textAtLaunch: data.existingText,
    };
    this.pending = request;
    this.shown = undefined;
    LegendStudioTelemetryHelper.logEvent_LegendAISuggestLaunched(
      this.telemetryService,
      this.sourceInfo,
      {
        ...this.identity(request),
        hadExistingText: isNonEmptyText(data.existingText),
        existingLength: data.existingText?.length ?? 0,
        accessPointCount: data.accessPointCount,
      },
    );
    this.logLegacyEvent('launch');
    return request;
  }

  /**
   * Records a LegendAI response. An empty suggestion is reported as a
   * `failure` with `errorKind: empty-response` since nothing is shown.
   *
   * @returns whether the suggestion is non-empty and should be shown
   */
  succeed(
    request: LegendAISuggestRequest,
    data: {
      suggestionText: string | undefined;
      definitionsLength: number;
      currentText: string | undefined;
      confidence?: number | undefined;
      accessPointSuggestionCount?: number | undefined;
    },
  ): boolean {
    const isCurrent = this.pending === request;
    if (isCurrent) {
      this.pending = undefined;
    }
    const durationMs = Date.now() - request.launchedAt;
    if (!isNonEmptyText(data.suggestionText)) {
      LegendStudioTelemetryHelper.logEvent_LegendAISuggestFailure(
        this.telemetryService,
        this.sourceInfo,
        {
          ...this.identity(request),
          durationMs,
          stage: LEGENDAI_SUGGEST_STAGE.REQUEST,
          errorKind: LEGENDAI_SUGGEST_ERROR_KIND.EMPTY_RESPONSE,
          errorMessage: 'LegendAI returned an empty suggestion',
        },
      );
      return false;
    }
    LegendStudioTelemetryHelper.logEvent_LegendAISuggestSucceeded(
      this.telemetryService,
      this.sourceInfo,
      {
        ...this.identity(request),
        durationMs,
        definitionsLength: data.definitionsLength,
        suggestionLength: data.suggestionText.length,
        confidence: data.confidence,
        editedWhilePending: data.currentText !== request.textAtLaunch,
        accessPointSuggestionCount: data.accessPointSuggestionCount,
      },
    );
    if (isCurrent) {
      this.shown = { request, shownAt: Date.now() };
    }
    return true;
  }

  /**
   * Must be called before the caller decorates `error.message` (e.g. with the
   * entitlement documentation link) so the raw server message is reported.
   */
  fail(
    request: LegendAISuggestRequest,
    error: Error,
    stage: LEGENDAI_SUGGEST_STAGE,
  ): void {
    if (this.pending === request) {
      this.pending = undefined;
    }
    LegendStudioTelemetryHelper.logEvent_LegendAISuggestFailure(
      this.telemetryService,
      this.sourceInfo,
      {
        ...this.identity(request),
        durationMs: Date.now() - request.launchedAt,
        stage,
        ...classifyLegendAISuggestError(error, stage),
        errorMessage: error.message,
      },
    );
    this.logLegacyEvent('failure', error.message);
  }

  apply(data: {
    existingText: string | undefined;
    appliedText: string;
    readCurrentText: LegendAIAppliedTextReader;
    dataProduct?: LegendAISuggestDataProductApplyData | undefined;
  }): void {
    const shown = this.shown;
    this.shown = undefined;
    this.logLegacyEvent('apply');
    if (!shown) {
      return;
    }
    const identity = this.identity(shown.request);
    LegendStudioTelemetryHelper.logEvent_LegendAISuggestApplied(
      this.telemetryService,
      this.sourceInfo,
      {
        ...identity,
        ...data.dataProduct,
        timeToDecisionMs: Date.now() - shown.shownAt,
        hadExistingText: isNonEmptyText(data.existingText),
        existingLength: data.existingText?.length ?? 0,
        suggestionLength: data.appliedText.length,
      },
    );
    if (!data.appliedText) {
      // nothing was actually written, so there is nothing to follow to push
      return;
    }
    this.editorStore.legendAIAppliedSuggestionRegistry.register({
      identity,
      appliedText: data.appliedText,
      appliedAt: Date.now(),
      readCurrentText: data.readCurrentText,
    });
  }

  discard(): void {
    const shown = this.shown;
    this.shown = undefined;
    this.logLegacyEvent('discard');
    if (!shown) {
      return;
    }
    LegendStudioTelemetryHelper.logEvent_LegendAISuggestDiscarded(
      this.telemetryService,
      this.sourceInfo,
      {
        ...this.identity(shown.request),
        timeToDecisionMs: Date.now() - shown.shownAt,
      },
    );
  }

  /**
   * Call when the hosting editor unmounts. A request that settles afterwards
   * still reports its `success` / `failure`, but is no longer shown.
   */
  dispose(): void {
    const now = Date.now();
    if (this.pending) {
      LegendStudioTelemetryHelper.logEvent_LegendAISuggestAbandoned(
        this.telemetryService,
        this.sourceInfo,
        {
          ...this.identity(this.pending),
          phase: LEGENDAI_SUGGEST_ABANDON_PHASE.PENDING,
          elapsedMs: now - this.pending.launchedAt,
        },
      );
    } else if (this.shown) {
      LegendStudioTelemetryHelper.logEvent_LegendAISuggestAbandoned(
        this.telemetryService,
        this.sourceInfo,
        {
          ...this.identity(this.shown.request),
          phase: LEGENDAI_SUGGEST_ABANDON_PHASE.SHOWN,
          elapsedMs: now - this.shown.shownAt,
        },
      );
    }
    this.pending = undefined;
    this.shown = undefined;
  }

  /**
   * Per-surface events kept for backward compatibility with existing
   * dashboards (`editor.<surface>.legendai-suggest.*`).
   */
  private logLegacyEvent(
    action: 'launch' | 'apply' | 'discard' | 'failure',
    errorMessage?: string,
  ): void {
    const { telemetryService, sourceInfo } = this;
    const path = this.target.elementPath;
    switch (this.target.surface) {
      case LEGENDAI_SUGGEST_SURFACE.SERVICE: {
        switch (action) {
          case 'launch':
            LegendStudioTelemetryHelper.logEvent_ServiceLegendAISuggestLaunched(
              telemetryService,
              path,
              sourceInfo,
            );
            return;
          case 'apply':
            LegendStudioTelemetryHelper.logEvent_ServiceLegendAISuggestApplied(
              telemetryService,
              path,
              sourceInfo,
            );
            return;
          case 'discard':
            LegendStudioTelemetryHelper.logEvent_ServiceLegendAISuggestDiscarded(
              telemetryService,
              path,
              sourceInfo,
            );
            return;
          case 'failure':
            LegendStudioTelemetryHelper.logEvent_ServiceLegendAISuggestFailure(
              telemetryService,
              path,
              errorMessage ?? '',
              sourceInfo,
            );
            return;
          default:
            return;
        }
      }
      case LEGENDAI_SUGGEST_SURFACE.DATASPACE: {
        switch (action) {
          case 'launch':
            LegendStudioTelemetryHelper.logEvent_DataSpaceLegendAISuggestLaunched(
              telemetryService,
              path,
              sourceInfo,
            );
            return;
          case 'apply':
            LegendStudioTelemetryHelper.logEvent_DataSpaceLegendAISuggestApplied(
              telemetryService,
              path,
              sourceInfo,
            );
            return;
          case 'discard':
            LegendStudioTelemetryHelper.logEvent_DataSpaceLegendAISuggestDiscarded(
              telemetryService,
              path,
              sourceInfo,
            );
            return;
          case 'failure':
            LegendStudioTelemetryHelper.logEvent_DataSpaceLegendAISuggestFailure(
              telemetryService,
              path,
              errorMessage ?? '',
              sourceInfo,
            );
            return;
          default:
            return;
        }
      }
      case LEGENDAI_SUGGEST_SURFACE.DATA_PRODUCT: {
        switch (action) {
          case 'launch':
            LegendStudioTelemetryHelper.logEvent_DataProductLegendAISuggestLaunched(
              telemetryService,
              path,
              sourceInfo,
            );
            return;
          case 'apply':
            LegendStudioTelemetryHelper.logEvent_DataProductLegendAISuggestApplied(
              telemetryService,
              path,
              sourceInfo,
            );
            return;
          case 'discard':
            LegendStudioTelemetryHelper.logEvent_DataProductLegendAISuggestDiscarded(
              telemetryService,
              path,
              sourceInfo,
            );
            return;
          case 'failure':
            LegendStudioTelemetryHelper.logEvent_DataProductLegendAISuggestFailure(
              telemetryService,
              path,
              errorMessage ?? '',
              sourceInfo,
            );
            return;
          default:
            return;
        }
      }
      default:
        return;
    }
  }
}
