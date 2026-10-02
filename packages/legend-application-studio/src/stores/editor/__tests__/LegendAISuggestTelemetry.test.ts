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

import { afterEach, describe, expect, jest, test } from '@jest/globals';
import { NetworkClientError } from '@finos/legend-shared';
import { unitTest } from '@finos/legend-shared/test';
import { EntityChange, EntityChangeType } from '@finos/legend-server-sdlc';
import { TEST__getTestEditorStore } from '../__test-utils__/EditorStoreTestUtils.js';
import type { EditorStore } from '../EditorStore.js';
import {
  LegendAISuggestTelemetryTracker,
  classifyLegendAISuggestError,
  computeLegendAISuggestEditRatio,
  type LegendAIAppliedTextReader,
} from '../LegendAISuggestTelemetry.js';
import {
  LEGENDAI_SUGGEST_ABANDON_PHASE,
  LEGENDAI_SUGGEST_ERROR_KIND,
  LEGENDAI_SUGGEST_MATCH_STRATEGY,
  LEGENDAI_SUGGEST_RETENTION,
  LEGENDAI_SUGGEST_STAGE,
  LEGENDAI_SUGGEST_SURFACE,
} from '../../../__lib__/LegendStudioTelemetryHelper.js';
import { LEGEND_STUDIO_APP_EVENT } from '../../../__lib__/LegendStudioEvent.js';

type LoggedEvent = { event: string; data: Record<string, unknown> };

const SERVICE_PATH = 'model::MyService';

const setup = (
  surface = LEGENDAI_SUGGEST_SURFACE.SERVICE,
): {
  editorStore: EditorStore;
  tracker: LegendAISuggestTelemetryTracker;
  events: LoggedEvent[];
  eventsOf: (event: string) => Record<string, unknown>[];
} => {
  const editorStore = TEST__getTestEditorStore();
  const events: LoggedEvent[] = [];
  jest
    .spyOn(editorStore.applicationStore.telemetryService, 'logEvent')
    .mockImplementation((event: string, data: unknown) => {
      events.push({ event, data: data as Record<string, unknown> });
    });
  const tracker = new LegendAISuggestTelemetryTracker(editorStore, {
    surface,
    elementPath: SERVICE_PATH,
  });
  return {
    editorStore,
    tracker,
    events,
    eventsOf: (event) =>
      events.filter((e) => e.event === event).map((e) => e.data),
  };
};

const buildNetworkError = (status: number): NetworkClientError =>
  new NetworkClientError(
    {
      status,
      statusText: 'error',
      url: 'https://legend-ai.example.test',
    } as unknown as Response,
    undefined,
  );

const readerReturning =
  (
    result: { found: false } | { found: true; text: string | undefined },
  ): LegendAIAppliedTextReader =>
  () =>
    result;

const pushed = (path: string, type = EntityChangeType.MODIFY): EntityChange =>
  Object.assign(new EntityChange(), { entityPath: path, type });

afterEach(() => {
  jest.restoreAllMocks();
});

describe(unitTest('LegendAISuggestTelemetryTracker lifecycle'), () => {
  test('launch → success → apply emits the unified lifecycle with one suggestionId, plus legacy events', () => {
    const { tracker, editorStore, eventsOf } = setup();

    const request = tracker.launch({ existingText: '' });
    const shown = tracker.succeed(request, {
      suggestionText: 'AI docs',
      definitionsLength: 120,
      currentText: '',
    });
    tracker.apply({
      existingText: '',
      appliedText: 'AI docs',
      readCurrentText: readerReturning({ found: true, text: 'AI docs' }),
    });

    expect(shown).toBe(true);
    const [launch] = eventsOf(LEGEND_STUDIO_APP_EVENT.LEGENDAI_SUGGEST__LAUNCH);
    const [success] = eventsOf(
      LEGEND_STUDIO_APP_EVENT.LEGENDAI_SUGGEST__SUCCESS,
    );
    const [apply] = eventsOf(LEGEND_STUDIO_APP_EVENT.LEGENDAI_SUGGEST__APPLY);
    expect(launch).toMatchObject({
      surface: LEGENDAI_SUGGEST_SURFACE.SERVICE,
      elementPath: SERVICE_PATH,
      suggestionId: request.suggestionId,
      attempt: 1,
      hadExistingText: false,
      existingLength: 0,
    });
    expect(success).toMatchObject({
      suggestionId: request.suggestionId,
      definitionsLength: 120,
      suggestionLength: 7,
      editedWhilePending: false,
    });
    expect(apply).toMatchObject({
      suggestionId: request.suggestionId,
      hadExistingText: false,
      suggestionLength: 7,
    });
    expect(typeof apply?.timeToDecisionMs).toBe('number');
    // legacy per-surface events keep firing
    expect(
      eventsOf(LEGEND_STUDIO_APP_EVENT.SERVICE_LEGENDAI_SUGGEST__LAUNCH),
    ).toEqual([expect.objectContaining({ servicePath: SERVICE_PATH })]);
    expect(
      eventsOf(LEGEND_STUDIO_APP_EVENT.SERVICE_LEGENDAI_SUGGEST__APPLY),
    ).toHaveLength(1);
    expect(editorStore.legendAIAppliedSuggestionRegistry.size).toBe(1);
  });

  test('flags edits made while the request was pending and counts attempts', () => {
    const { tracker, eventsOf } = setup();

    tracker.launch({ existingText: 'old' });
    tracker.discard();
    const second = tracker.launch({ existingText: 'old' });
    tracker.succeed(second, {
      suggestionText: 'new',
      definitionsLength: 1,
      currentText: 'old, edited',
    });

    expect(
      eventsOf(LEGEND_STUDIO_APP_EVENT.LEGENDAI_SUGGEST__LAUNCH).map(
        (e) => e.attempt,
      ),
    ).toEqual([1, 2]);
    expect(
      eventsOf(LEGEND_STUDIO_APP_EVENT.LEGENDAI_SUGGEST__SUCCESS)[0],
    ).toMatchObject({ attempt: 2, editedWhilePending: true });
  });

  test('an empty suggestion is reported as an empty-response failure and not shown', () => {
    const { tracker, eventsOf } = setup();

    const request = tracker.launch({ existingText: undefined });
    const shown = tracker.succeed(request, {
      suggestionText: '   ',
      definitionsLength: 10,
      currentText: undefined,
    });

    expect(shown).toBe(false);
    expect(
      eventsOf(LEGEND_STUDIO_APP_EVENT.LEGENDAI_SUGGEST__SUCCESS),
    ).toHaveLength(0);
    expect(
      eventsOf(LEGEND_STUDIO_APP_EVENT.LEGENDAI_SUGGEST__FAILURE)[0],
    ).toMatchObject({
      errorKind: LEGENDAI_SUGGEST_ERROR_KIND.EMPTY_RESPONSE,
      stage: LEGENDAI_SUGGEST_STAGE.REQUEST,
    });
    // legacy failure only ever fired for thrown errors
    expect(
      eventsOf(LEGEND_STUDIO_APP_EVENT.SERVICE_LEGENDAI_SUGGEST__FAILURE),
    ).toHaveLength(0);
  });

  test('failures carry stage, errorKind and httpStatus, plus the legacy failure', () => {
    const { tracker, eventsOf } = setup();

    tracker.fail(
      tracker.launch({ existingText: undefined }),
      buildNetworkError(403),
      LEGENDAI_SUGGEST_STAGE.REQUEST,
    );

    expect(
      eventsOf(LEGEND_STUDIO_APP_EVENT.LEGENDAI_SUGGEST__FAILURE)[0],
    ).toMatchObject({
      stage: LEGENDAI_SUGGEST_STAGE.REQUEST,
      errorKind: LEGENDAI_SUGGEST_ERROR_KIND.ENTITLEMENT,
      httpStatus: 403,
    });
    expect(
      eventsOf(LEGEND_STUDIO_APP_EVENT.SERVICE_LEGENDAI_SUGGEST__FAILURE),
    ).toHaveLength(1);
  });

  test('unmounting while pending reports abandon; a late response still reports success but cannot be applied', () => {
    const { tracker, eventsOf } = setup();

    const request = tracker.launch({ existingText: undefined });
    tracker.dispose();
    tracker.succeed(request, {
      suggestionText: 'late',
      definitionsLength: 1,
      currentText: undefined,
    });
    tracker.apply({
      existingText: undefined,
      appliedText: 'late',
      readCurrentText: readerReturning({ found: true, text: 'late' }),
    });

    expect(eventsOf(LEGEND_STUDIO_APP_EVENT.LEGENDAI_SUGGEST__ABANDON)).toEqual(
      [
        expect.objectContaining({
          suggestionId: request.suggestionId,
          phase: LEGENDAI_SUGGEST_ABANDON_PHASE.PENDING,
        }),
      ],
    );
    expect(
      eventsOf(LEGEND_STUDIO_APP_EVENT.LEGENDAI_SUGGEST__SUCCESS),
    ).toHaveLength(1);
    expect(
      eventsOf(LEGEND_STUDIO_APP_EVENT.LEGENDAI_SUGGEST__APPLY),
    ).toHaveLength(0);
  });

  test('unmounting with a suggestion on screen reports a shown abandon; after a decision nothing is reported', () => {
    const { tracker, eventsOf } = setup();

    const first = tracker.launch({ existingText: undefined });
    tracker.succeed(first, {
      suggestionText: 'shown',
      definitionsLength: 1,
      currentText: undefined,
    });
    tracker.dispose();
    const second = tracker.launch({ existingText: undefined });
    tracker.succeed(second, {
      suggestionText: 'shown',
      definitionsLength: 1,
      currentText: undefined,
    });
    tracker.discard();
    tracker.dispose();

    expect(eventsOf(LEGEND_STUDIO_APP_EVENT.LEGENDAI_SUGGEST__ABANDON)).toEqual(
      [
        expect.objectContaining({
          suggestionId: first.suggestionId,
          phase: LEGENDAI_SUGGEST_ABANDON_PHASE.SHOWN,
        }),
      ],
    );
    expect(eventsOf(LEGEND_STUDIO_APP_EVENT.LEGENDAI_SUGGEST__DISCARD)).toEqual(
      [expect.objectContaining({ suggestionId: second.suggestionId })],
    );
  });

  test('data product applies carry the group target and apply breakdown', () => {
    const { editorStore, events, eventsOf } = setup(
      LEGENDAI_SUGGEST_SURFACE.DATA_PRODUCT,
    );
    const tracker = new LegendAISuggestTelemetryTracker(editorStore, {
      surface: LEGENDAI_SUGGEST_SURFACE.DATA_PRODUCT,
      elementPath: 'model::MyProduct',
      accessPointGroupId: 'GROUP_A',
    });
    events.length = 0;

    const request = tracker.launch({
      existingText: 'desc',
      accessPointCount: 3,
    });
    tracker.succeed(request, {
      suggestionText: 'title\ndesc',
      definitionsLength: 1,
      currentText: 'desc',
      confidence: 0.8,
      accessPointSuggestionCount: 2,
    });
    tracker.apply({
      existingText: 'desc',
      appliedText: 'title\ndesc',
      readCurrentText: readerReturning({ found: true, text: 'title\ndesc' }),
      dataProduct: {
        matchStrategy: LEGENDAI_SUGGEST_MATCH_STRATEGY.INDEX,
        accessPointsUpdated: 2,
        accessPointsRenamed: 1,
        namesSanitized: 1,
        accessPointCountMismatch: true,
      },
    });

    expect(
      eventsOf(LEGEND_STUDIO_APP_EVENT.LEGENDAI_SUGGEST__SUCCESS)[0],
    ).toMatchObject({
      accessPointGroupId: 'GROUP_A',
      confidence: 0.8,
      accessPointSuggestionCount: 2,
    });
    expect(
      eventsOf(LEGEND_STUDIO_APP_EVENT.LEGENDAI_SUGGEST__APPLY)[0],
    ).toMatchObject({
      surface: LEGENDAI_SUGGEST_SURFACE.DATA_PRODUCT,
      elementPath: 'model::MyProduct',
      accessPointGroupId: 'GROUP_A',
      matchStrategy: LEGENDAI_SUGGEST_MATCH_STRATEGY.INDEX,
      accessPointsUpdated: 2,
      accessPointsRenamed: 1,
      namesSanitized: 1,
      accessPointCountMismatch: true,
    });
    expect(
      eventsOf(LEGEND_STUDIO_APP_EVENT.DATA_PRODUCT_LEGENDAI_SUGGEST__APPLY),
    ).toHaveLength(1);
  });
});

describe(
  unitTest('LegendAIAppliedSuggestionRegistry persisted reporting'),
  () => {
    const applySuggestion = (
      tracker: LegendAISuggestTelemetryTracker,
      appliedText: string,
      reader: LegendAIAppliedTextReader,
    ): void => {
      const request = tracker.launch({ existingText: undefined });
      tracker.succeed(request, {
        suggestionText: appliedText,
        definitionsLength: 1,
        currentText: undefined,
      });
      tracker.apply({
        existingText: undefined,
        appliedText,
        readCurrentText: reader,
      });
    };

    test.each([
      [
        'unchanged',
        { found: true, text: 'applied docs' } as const,
        EntityChangeType.MODIFY,
        LEGENDAI_SUGGEST_RETENTION.UNCHANGED,
      ],
      [
        'edited',
        { found: true, text: 'applied docs, tweaked' } as const,
        EntityChangeType.MODIFY,
        LEGENDAI_SUGGEST_RETENTION.EDITED,
      ],
      [
        'cleared',
        { found: true, text: '' } as const,
        EntityChangeType.MODIFY,
        LEGENDAI_SUGGEST_RETENTION.CLEARED,
      ],
      [
        'removed',
        { found: true, text: 'applied docs' } as const,
        EntityChangeType.DELETE,
        LEGENDAI_SUGGEST_RETENTION.ELEMENT_REMOVED,
      ],
    ])(
      'reports %s text once the element is pushed',
      (_label, current, changeType, expectedRetention) => {
        const { editorStore, tracker, eventsOf } = setup();
        applySuggestion(tracker, 'applied docs', readerReturning(current));

        editorStore.legendAIAppliedSuggestionRegistry.reportPushedChanges(
          editorStore,
          [pushed(SERVICE_PATH, changeType)],
        );

        const persisted = eventsOf(
          LEGEND_STUDIO_APP_EVENT.LEGENDAI_SUGGEST__PERSISTED,
        );
        expect(persisted).toHaveLength(1);
        expect(persisted[0]).toMatchObject({
          elementPath: SERVICE_PATH,
          retention: expectedRetention,
          supersededApplyCount: 0,
        });
        if (expectedRetention === LEGENDAI_SUGGEST_RETENTION.EDITED) {
          expect(persisted[0]?.editRatio).toBeGreaterThan(0);
          expect(persisted[0]?.editRatio).toBeLessThan(1);
        } else {
          expect(persisted[0]?.editRatio).toBeUndefined();
        }
        expect(editorStore.legendAIAppliedSuggestionRegistry.size).toBe(0);
      },
    );

    test('waits for a push that includes the element and only keeps the latest apply per target', () => {
      const { editorStore, tracker, eventsOf } = setup();
      applySuggestion(
        tracker,
        'first',
        readerReturning({ found: true, text: 'second' }),
      );
      applySuggestion(
        tracker,
        'second',
        readerReturning({ found: true, text: 'second' }),
      );

      editorStore.legendAIAppliedSuggestionRegistry.reportPushedChanges(
        editorStore,
        [pushed('model::SomethingElse')],
      );
      expect(
        eventsOf(LEGEND_STUDIO_APP_EVENT.LEGENDAI_SUGGEST__PERSISTED),
      ).toHaveLength(0);

      editorStore.legendAIAppliedSuggestionRegistry.reportPushedChanges(
        editorStore,
        [pushed(SERVICE_PATH)],
      );
      expect(
        eventsOf(LEGEND_STUDIO_APP_EVENT.LEGENDAI_SUGGEST__PERSISTED),
      ).toEqual([
        expect.objectContaining({
          attempt: 2,
          retention: LEGENDAI_SUGGEST_RETENTION.UNCHANGED,
          supersededApplyCount: 1,
        }),
      ]);
    });
  },
);

describe(unitTest('LegendAI suggest telemetry utilities'), () => {
  test('classifyLegendAISuggestError maps stages and HTTP statuses', () => {
    const request = LEGENDAI_SUGGEST_STAGE.REQUEST;
    expect(
      classifyLegendAISuggestError(
        new Error('x'),
        LEGENDAI_SUGGEST_STAGE.SERIALIZE,
      ),
    ).toEqual({ errorKind: LEGENDAI_SUGGEST_ERROR_KIND.SERIALIZATION });
    expect(
      classifyLegendAISuggestError(buildNetworkError(401), request),
    ).toEqual({
      errorKind: LEGENDAI_SUGGEST_ERROR_KIND.ENTITLEMENT,
      httpStatus: 401,
    });
    expect(
      classifyLegendAISuggestError(buildNetworkError(404), request),
    ).toEqual({
      errorKind: LEGENDAI_SUGGEST_ERROR_KIND.CLIENT,
      httpStatus: 404,
    });
    expect(
      classifyLegendAISuggestError(buildNetworkError(502), request),
    ).toEqual({
      errorKind: LEGENDAI_SUGGEST_ERROR_KIND.SERVER,
      httpStatus: 502,
    });
    expect(classifyLegendAISuggestError(new Error('x'), request)).toEqual({
      errorKind: LEGENDAI_SUGGEST_ERROR_KIND.OTHER,
    });
  });

  test('computeLegendAISuggestEditRatio is normalized and skips very long texts', () => {
    expect(computeLegendAISuggestEditRatio('same', 'same')).toBe(0);
    expect(computeLegendAISuggestEditRatio('abc', 'xyz')).toBe(1);
    expect(computeLegendAISuggestEditRatio('kitten', 'sitting')).toBeCloseTo(
      3 / 7,
    );
    expect(
      computeLegendAISuggestEditRatio('a'.repeat(2001), 'b'),
    ).toBeUndefined();
  });
});
