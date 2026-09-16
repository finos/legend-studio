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

import { describe, test, expect, jest } from '@jest/globals';
import { unitTest } from '@finos/legend-shared/test';
import {
  DEFAULT_TELEMETRY_MESSAGE_LENGTH_LIMIT,
  NetworkClientError,
} from '@finos/legend-shared';
import type { LightQuery } from '@finos/legend-graph';
import { LEGEND_QUERY_APP_EVENT } from '../LegendQueryEvent.js';
import {
  buildQueryCreateFailureData,
  buildQueryLifecycleFailureData,
  buildQueryLoaderLifecycleTelemetryHandlers,
} from '../LegendQueryLifecycleTelemetry.js';

const LIGHT_QUERY = {
  id: 'abc-123',
  name: 'My Saved Query',
  groupId: 'com.company.demo',
  artifactId: 'demo-model',
  versionId: '1.4.0',
} as LightQuery;

const buildStore = (): {
  applicationStore: never;
  calls: { event: string; data: Record<string, unknown> }[];
} => {
  const calls: { event: string; data: Record<string, unknown> }[] = [];
  const applicationStore = {
    telemetryService: {
      logEvent: (event: string, data: Record<string, unknown>): void => {
        calls.push({ event, data });
      },
    },
  } as never;
  return { applicationStore, calls };
};

describe(unitTest('Saved query lifecycle telemetry'), () => {
  test(unitTest('reports a delete with the resolved query identity'), () => {
    const { applicationStore, calls } = buildStore();
    buildQueryLoaderLifecycleTelemetryHandlers(applicationStore).onQueryDeleted(
      'abc-123',
      LIGHT_QUERY,
    );
    expect(calls[0]?.event).toBe(LEGEND_QUERY_APP_EVENT.DELETE_QUERY__SUCCESS);
    expect(calls[0]?.data).toEqual({
      query: {
        id: 'abc-123',
        name: 'My Saved Query',
        groupId: 'com.company.demo',
        artifactId: 'demo-model',
        versionId: '1.4.0',
      },
    });
  });

  test(
    unitTest('reports a delete with only the id when the query is unresolved'),
    () => {
      // the loaded list may not contain the entry being deleted
      const { applicationStore, calls } = buildStore();
      buildQueryLoaderLifecycleTelemetryHandlers(
        applicationStore,
      ).onQueryDeleted('abc-123', undefined);
      expect(
        (calls[0]?.data as { query: { id: string; name?: string } }).query,
      ).toEqual({
        id: 'abc-123',
        name: undefined,
        groupId: undefined,
        artifactId: undefined,
        versionId: undefined,
      });
    },
  );

  test(
    unitTest('runs the host side effect alongside the delete telemetry'),
    () => {
      const { applicationStore, calls } = buildStore();
      const pruneRecentlyViewed = jest.fn();
      buildQueryLoaderLifecycleTelemetryHandlers(applicationStore, {
        onQueryDeleted: pruneRecentlyViewed,
      }).onQueryDeleted('abc-123', LIGHT_QUERY);
      expect(pruneRecentlyViewed).toHaveBeenCalledWith('abc-123');
      expect(calls).toHaveLength(1);
    },
  );

  test(unitTest('reports a rename failure against the target query'), () => {
    const { applicationStore, calls } = buildStore();
    buildQueryLoaderLifecycleTelemetryHandlers(
      applicationStore,
    ).onQueryRenameFailed('abc-123', new Error('name already taken'));
    expect(calls[0]?.event).toBe(LEGEND_QUERY_APP_EVENT.RENAME_QUERY__FAILURE);
    expect(calls[0]?.data).toEqual(
      expect.objectContaining({
        errorMessage: 'name already taken',
        errorName: 'Error',
      }),
    );
  });

  test(unitTest('reports a delete failure with the response status'), () => {
    const { applicationStore, calls } = buildStore();
    buildQueryLoaderLifecycleTelemetryHandlers(
      applicationStore,
    ).onQueryDeleteFailed(
      'abc-123',
      new NetworkClientError({ status: 403 } as Response, 'Forbidden'),
    );
    expect(calls[0]?.event).toBe(LEGEND_QUERY_APP_EVENT.DELETE_QUERY__FAILURE);
    expect(calls[0]?.data).toEqual(
      expect.objectContaining({
        httpStatus: 403,
        errorName: 'Network Client Error',
      }),
    );
  });

  test(
    unitTest('caps an oversized lifecycle failure message and flags it'),
    () => {
      const data = buildQueryLifecycleFailureData(
        'abc-123',
        new Error('z'.repeat(DEFAULT_TELEMETRY_MESSAGE_LENGTH_LIMIT + 500)),
      );
      expect(data.errorMessage.length).toBe(
        DEFAULT_TELEMETRY_MESSAGE_LENGTH_LIMIT,
      );
      expect(data.errorMessageTruncated).toBe(true);
    },
  );

  test(
    unitTest('reports a failed create by name, with no query identity at all'),
    () => {
      // the server assigns the id and a failed create never got that far, so
      // there is no query to identify — reported by name rather than with a
      // placeholder id that would group as a real value in a warehouse
      const data = buildQueryCreateFailureData('My Query', new Error('boom'));
      expect(data.queryName).toBe('My Query');
      expect(Object.keys(data)).not.toContain('query');
      expect(JSON.parse(JSON.stringify(data))).toEqual({
        queryName: 'My Query',
        errorMessage: 'boom',
        errorName: 'Error',
      });
    },
  );

  test(
    unitTest('leaves a normal-length lifecycle failure message unflagged'),
    () => {
      const data = buildQueryLifecycleFailureData('abc-123', new Error('boom'));
      expect(data.errorMessage).toBe('boom');
      expect(data.errorMessageTruncated).toBeUndefined();
      // reported as `undefined` rather than omitted, for consistency with
      // `httpStatus` — the serialized payload is identical either way
      expect(JSON.parse(JSON.stringify(data))).not.toHaveProperty(
        'errorMessageTruncated',
      );
    },
  );
});
