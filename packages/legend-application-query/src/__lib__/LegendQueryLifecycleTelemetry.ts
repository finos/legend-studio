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

import type { LightQuery } from '@finos/legend-graph';
import { buildTelemetryErrorFields } from '@finos/legend-shared';
import type { GenericLegendApplicationStore } from '@finos/legend-application';
import type { CompleteQueryLoaderLifecycleHandlers } from '@finos/legend-query-builder';
import {
  type PartialQuery_TelemetryData,
  type QueryCreateFailure_TelemetryData,
  type QueryLifecycleFailure_TelemetryData,
  type Query_TelemetryData,
  LegendQueryTelemetryHelper,
} from './LegendQueryTelemetryHelper.js';

/**
 * Builds the error half of a saved-query lifecycle failure payload, applying the
 * same message cap and `errorMessageTruncated` flag as every other failure event.
 */
export const buildQueryLifecycleFailureData = (
  queryId: string,
  error: Error,
): QueryLifecycleFailure_TelemetryData => ({
  // NOTE: only the id is available on these paths — the loader reports a
  // failure by id, and the query it refers to was never resolved
  query: { id: queryId },
  ...buildTelemetryErrorFields(error),
});

/**
 * Maps a query to the identity block every lifecycle event carries.
 */
export const buildQueryIdentity = (query: LightQuery): Query_TelemetryData => ({
  query: {
    id: query.id,
    name: query.name,
    groupId: query.groupId,
    artifactId: query.artifactId,
    versionId: query.versionId,
  },
});

/**
 * Builds the payload for a failed *create*.
 *
 * Separate from {@link buildQueryLifecycleFailureData} because a failed create
 * has no query to identify — the server assigns the id and the request never got
 * that far. Reporting the chosen name instead of a placeholder id keeps "never
 * persisted" distinguishable from a real value.
 */
export const buildQueryCreateFailureData = (
  queryName: string,
  error: Error,
): QueryCreateFailure_TelemetryData => ({
  queryName,
  ...buildTelemetryErrorFields(error),
});

/**
 * The saved-query lifecycle handlers every `QueryLoaderState` host wires in.
 *
 * Rename and delete happen inside the shared query loader, which reports them
 * back through callbacks — so without this the same emit would be duplicated at
 * each of the three hosts that build a loader (and before this existed, the
 * rename emit was in fact triplicated while delete was reported nowhere).
 *
 * NOTE: these events deliberately carry no source info. They fire from the query
 * *picker*, where the user may rename or delete one query while editing another
 * — attaching the loaded query builder's source info would silently mislabel the
 * row as belonging to the wrong query.
 */
export const buildQueryLoaderLifecycleTelemetryHandlers = (
  applicationStore: GenericLegendApplicationStore,
  sideEffects?:
    | {
        /**
         * Runs alongside the delete telemetry — hosts use this to prune their
         * recently-viewed list.
         */
        onQueryDeleted?: ((queryId: string) => void) | undefined;
      }
    | undefined,
): CompleteQueryLoaderLifecycleHandlers => {
  const { telemetryService } = applicationStore;
  return {
    onQueryRenamed: (query): void => {
      LegendQueryTelemetryHelper.logEvent_RenameQuerySucceeded(
        telemetryService,
        buildQueryIdentity(query),
      );
    },
    onQueryDeleted: (queryId, deletedQuery): void => {
      sideEffects?.onQueryDeleted?.(queryId);
      // the entry may not have been in the loaded list, in which case only the
      // id is known
      const identity: PartialQuery_TelemetryData = deletedQuery
        ? buildQueryIdentity(deletedQuery)
        : { query: { id: queryId } };
      LegendQueryTelemetryHelper.logEvent_DeleteQuerySucceeded(
        telemetryService,
        identity,
      );
    },
    onQueryRenameFailed: (queryId, error): void => {
      // the rename failed, so the loader never resolved the renamed query —
      // only its id and the error are known
      LegendQueryTelemetryHelper.logEvent_RenameQueryFailed(
        telemetryService,
        buildQueryLifecycleFailureData(queryId, error),
      );
    },
    onQueryDeleteFailed: (queryId, error): void => {
      LegendQueryTelemetryHelper.logEvent_DeleteQueryFailed(
        telemetryService,
        buildQueryLifecycleFailureData(queryId, error),
      );
    },
  };
};
