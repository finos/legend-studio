/**
 * Copyright (c) 2020-present, Goldman Sachs
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

import type { TelemetryService } from '@finos/legend-application';
import type { TelemetryErrorFields, TimingsRecord } from '@finos/legend-shared';
import { LEGEND_QUERY_APP_EVENT } from './LegendQueryEvent.js';
import type { QueryableSourceInfo } from '@finos/legend-storage';
import type { QueryBuilderTelemetryContext } from '@finos/legend-query-builder';
import {
  type GraphManagerOperationReport,
  GRAPH_MANAGER_EVENT,
  type GraphInitializationReport,
} from '@finos/legend-graph';

export type Query_TelemetryData = {
  query: {
    name: string;
    id: string;
    versionId: string;
    groupId: string;
    artifactId: string;
  };
} & Record<string, unknown>;

type QueryGraphInitialization_TelemetryData = Query_TelemetryData & {
  graph: GraphInitializationReport;
};

type ViewQuery_TelemetryData = Query_TelemetryData &
  GraphManagerOperationReport & {
    dependenciesCount: number;
  };

type IntializeQueryState_TelemetryData = Query_TelemetryData &
  GraphManagerOperationReport & {
    dependenciesCount: number;
  };

/**
 * Where the query creator was started from, returned by each creator store's
 * `getInitializeTelemetrySource()`.
 *
 * The entry point the query creator was started from ({@link
 * LegendQuerySourceInfo}) is spread FLAT into this payload, matching how
 * `sourceInfo` is reported on every other query telemetry event.
 *
 * The index signature is what allows those flat keys — they vary by entry point
 * and `LegendQuerySourceInfo` is a union, so they cannot be enumerated here.
 * The union stays strictly typed where it is built, in each creator store's
 * `getSourceInfo()` override.
 */
export type InitializeTelemetrySource = Record<PropertyKey, unknown> & {
  /**
   * Whether the most recently visited source was reopened, rather than the
   * source being specified by the route
   */
  restoredFromRecent: boolean;
};

/**
 * Base payload for the query creator failure event.
 *
 * There is no success counterpart: a successful load is reported by
 * `query-builder.opened` from `legend-query-builder`, which fires for every
 * route rather than creators only. This one survives because when a load fails
 * there is no query builder to emit from, so it is the only record that an
 * attempt happened.
 */
export type InitializeQueryCreator_TelemetryData = InitializeTelemetrySource & {
  timings: TimingsRecord;
};

export type InitializeQueryCreatorFailure_TelemetryData =
  InitializeQueryCreator_TelemetryData & TelemetryErrorFields;

/**
 * The query a lifecycle event acted on. `id` is always known for update, rename
 * and delete — they act on a query that already exists. Identity beyond the id
 * is partial: a delete resolves the entry from the loaded list, which may not
 * contain it.
 */
export type PartialQuery_TelemetryData = {
  query: {
    id: string;
    name?: string | undefined;
    versionId?: string | undefined;
    groupId?: string | undefined;
    artifactId?: string | undefined;
  };
};

/**
 * Payload for a failed *create*.
 *
 * Deliberately has no `query` block: the server assigns the id, and a failed
 * create never got that far, so no query exists to identify. The name the user
 * chose is the only identity there is. Keeping this a separate type from
 * {@link QueryLifecycleFailure_TelemetryData} means the three events that *do*
 * always have an id cannot accidentally omit it.
 */
export type QueryCreateFailure_TelemetryData = {
  queryName: string;
} & TelemetryErrorFields;

/**
 * Payload for a failed update, rename or delete — actions on a query that
 * already exists, so `query.id` is always present.
 */
export type QueryLifecycleFailure_TelemetryData = PartialQuery_TelemetryData &
  TelemetryErrorFields;

/**
 * Payload for a failure during the existing-query load flow (graph build,
 * query state init, viewer load).
 *
 * The query being loaded is identified by its route id — the full identity
 * (`name`, `groupId`, ...) is only known once the query resolves, which by
 * definition may not have happened when these failures fire. `queryId` is
 * therefore the only guaranteed field; anything else that happens to be
 * resolved is merged in via {@link PartialQuery_TelemetryData}.
 */
export type QueryLoadFailure_TelemetryData = {
  queryId: string;
} & Partial<PartialQuery_TelemetryData> &
  TelemetryErrorFields;

/**
 * Payload for an in-session data-space or data-product switch made from the
 * query-builder setup panel.
 *
 * `sourceInfo` (the query builder's source info at the moment the switch is
 * made — i.e. what the user is switching *from*) is spread FLAT into the
 * payload, matching how every other query telemetry event reports
 * `sourceInfo`. It is typed as {@link QueryableSourceInfo} rather than
 * `LegendQuerySourceInfo` because it comes off the query builder state
 * (which types it generically) even though at runtime it is always a
 * `LegendQuerySourceInfo` produced by an editor store's `getSourceInfo()`.
 *
 * `to` is the GAV + element path of the target selection: the group,
 * artifact and version the data space / data product lives in, and its
 * element path. A missing GAV (rare, but the `origin` field on
 * `DepotEntityWithOrigin` is optional) is reported as `undefined` rather than
 * omitted, so dashboards can distinguish "no origin" from "field absent".
 */
export type ChangeDataSpaceOrProduct_TelemetryData = {
  sourceInfo?: QueryableSourceInfo | undefined;
  to: {
    groupId: string | undefined;
    artifactId: string | undefined;
    versionId: string | undefined;
    path: string;
  };
};

const flattenChangeDataSpaceOrProductSourceInfo = (
  data: ChangeDataSpaceOrProduct_TelemetryData,
): Record<string, unknown> => {
  const { sourceInfo, ...rest } = data;
  return { ...rest, ...(sourceInfo ?? {}) };
};

export class LegendQueryTelemetryHelper {
  static logEvent_ViewQuerySucceeded(
    service: TelemetryService,
    data: ViewQuery_TelemetryData,
  ): void {
    service.logEvent(LEGEND_QUERY_APP_EVENT.VIEW_QUERY__SUCCESS, data);
  }

  static logEvent_InitializeQueryStateSucceeded(
    service: TelemetryService,
    data: IntializeQueryState_TelemetryData,
  ): void {
    service.logEvent(
      LEGEND_QUERY_APP_EVENT.INITIALIZE_QUERY_STATE__SUCCESS,
      data,
    );
  }

  static logEvent_InitializeQueryCreatorFailed(
    service: TelemetryService,
    data: InitializeQueryCreatorFailure_TelemetryData,
  ): void {
    service.logEvent(
      LEGEND_QUERY_APP_EVENT.INITIALIZE_QUERY_CREATOR__FAILURE,
      data,
    );
  }

  static logEvent_CreateQuerySucceeded(
    service: TelemetryService,
    data: Query_TelemetryData,
  ): void {
    service.logEvent(LEGEND_QUERY_APP_EVENT.CREATE_QUERY__SUCCESS, data);
  }

  static logEvent_HostedDataCubeLaunched(
    service: TelemetryService,
    data: Query_TelemetryData,
  ): void {
    service.logEvent(LEGEND_QUERY_APP_EVENT.HOSTED_DATA_CUBE__LAUNCH, data);
  }

  static logEvent_UpdateQuerySucceeded(
    service: TelemetryService,
    data: Query_TelemetryData,
  ): void {
    service.logEvent(LEGEND_QUERY_APP_EVENT.UPDATE_QUERY__SUCCESS, data);
  }

  static logEvent_QueryViewProjectLaunched(service: TelemetryService): void {
    service.logEvent(LEGEND_QUERY_APP_EVENT.VIEW_PROJECT__LAUNCH, {});
  }

  static logEvent_QueryViewSdlcProjectLaunched(
    service: TelemetryService,
  ): void {
    service.logEvent(LEGEND_QUERY_APP_EVENT.VIEW_SDLC_PROJECT__LAUNCH, {});
  }

  // ── Query builder Help-menu items injected by Legend Query ───────────────
  //
  // Each takes the shared query builder telemetry envelope (source info flat +
  // `state` nested), pulled from `queryBuilderState.safeGetTelemetryContext()`
  // at the callsite.

  static logEvent_AboutQueryInfoLaunched(
    service: TelemetryService,
    data: QueryBuilderTelemetryContext,
  ): void {
    service.logEvent(LEGEND_QUERY_APP_EVENT.ABOUT_QUERY_INFO__LAUNCH, data);
  }

  static logEvent_QueryVersionHistoryLaunched(
    service: TelemetryService,
    data: QueryBuilderTelemetryContext,
  ): void {
    service.logEvent(
      LEGEND_QUERY_APP_EVENT.QUERY_VERSION_HISTORY__LAUNCH,
      data,
    );
  }

  static logEvent_AboutLegendQueryLaunched(
    service: TelemetryService,
    data: QueryBuilderTelemetryContext,
  ): void {
    service.logEvent(LEGEND_QUERY_APP_EVENT.ABOUT_LEGEND_QUERY__LAUNCH, data);
  }

  static logEvent_AboutDataSpaceLaunched(
    service: TelemetryService,
    data: QueryBuilderTelemetryContext,
  ): void {
    service.logEvent(LEGEND_QUERY_APP_EVENT.ABOUT_DATA_SPACE__LAUNCH, data);
  }

  static logEvent_AboutDataProductLaunched(
    service: TelemetryService,
    data: QueryBuilderTelemetryContext,
  ): void {
    service.logEvent(LEGEND_QUERY_APP_EVENT.ABOUT_DATA_PRODUCT__LAUNCH, data);
  }

  static logEvent_AboutIngestLaunched(
    service: TelemetryService,
    data: QueryBuilderTelemetryContext,
  ): void {
    service.logEvent(LEGEND_QUERY_APP_EVENT.ABOUT_INGEST__LAUNCH, data);
  }

  static logEvent_GraphInitializationSucceeded(
    service: TelemetryService,
    data: QueryGraphInitialization_TelemetryData | GraphInitializationReport,
  ): void {
    service.logEvent(GRAPH_MANAGER_EVENT.INITIALIZE_GRAPH__SUCCESS, data);
  }

  static logEvent_RenameQuerySucceeded(
    service: TelemetryService,
    data: Query_TelemetryData,
  ): void {
    service.logEvent(LEGEND_QUERY_APP_EVENT.RENAME_QUERY__SUCCESS, data);
  }

  static logEvent_DeleteQuerySucceeded(
    service: TelemetryService,
    data: PartialQuery_TelemetryData,
  ): void {
    service.logEvent(LEGEND_QUERY_APP_EVENT.DELETE_QUERY__SUCCESS, data);
  }

  static logEvent_CreateQueryFailed(
    service: TelemetryService,
    data: QueryCreateFailure_TelemetryData,
  ): void {
    service.logEvent(LEGEND_QUERY_APP_EVENT.CREATE_QUERY__FAILURE, data);
  }

  static logEvent_UpdateQueryFailed(
    service: TelemetryService,
    data: QueryLifecycleFailure_TelemetryData,
  ): void {
    service.logEvent(LEGEND_QUERY_APP_EVENT.UPDATE_QUERY__FAILURE, data);
  }

  static logEvent_RenameQueryFailed(
    service: TelemetryService,
    data: QueryLifecycleFailure_TelemetryData,
  ): void {
    service.logEvent(LEGEND_QUERY_APP_EVENT.RENAME_QUERY__FAILURE, data);
  }

  static logEvent_DeleteQueryFailed(
    service: TelemetryService,
    data: QueryLifecycleFailure_TelemetryData,
  ): void {
    service.logEvent(LEGEND_QUERY_APP_EVENT.DELETE_QUERY__FAILURE, data);
  }

  static logEvent_ViewQueryFailed(
    service: TelemetryService,
    data: QueryLoadFailure_TelemetryData,
  ): void {
    service.logEvent(LEGEND_QUERY_APP_EVENT.VIEW_QUERY__FAILURE, data);
  }

  static logEvent_InitializeQueryStateFailed(
    service: TelemetryService,
    data: QueryLoadFailure_TelemetryData,
  ): void {
    service.logEvent(
      LEGEND_QUERY_APP_EVENT.INITIALIZE_QUERY_STATE__FAILURE,
      data,
    );
  }

  static logEvent_GraphInitializationFailed(
    service: TelemetryService,
    data: TelemetryErrorFields & Partial<PartialQuery_TelemetryData>,
  ): void {
    service.logEvent(
      LEGEND_QUERY_APP_EVENT.GRAPH_INITIALIZATION__FAILURE,
      data,
    );
  }

  static logEvent_ProductionizeQueryLaunched(
    service: TelemetryService,
    data: PartialQuery_TelemetryData,
  ): void {
    service.logEvent(LEGEND_QUERY_APP_EVENT.PRODUCTIONIZE_QUERY__LAUNCH, data);
  }

  static logEvent_QueryAISuggestLaunched(service: TelemetryService): void {
    service.logEvent(LEGEND_QUERY_APP_EVENT.LEGENDAI_QUERY_SUGGEST__LAUNCH, {});
  }

  static logEvent_QueryAISuggestApplied(service: TelemetryService): void {
    service.logEvent(LEGEND_QUERY_APP_EVENT.LEGENDAI_QUERY_SUGGEST__APPLY, {});
  }

  static logEvent_QueryAISuggestDiscarded(service: TelemetryService): void {
    service.logEvent(
      LEGEND_QUERY_APP_EVENT.LEGENDAI_QUERY_SUGGEST__DISCARD,
      {},
    );
  }

  static logEvent_QueryAISuggestFailure(
    service: TelemetryService,
    errorMessage: string,
  ): void {
    service.logEvent(LEGEND_QUERY_APP_EVENT.LEGENDAI_QUERY_SUGGEST__FAILURE, {
      errorMessage,
    });
  }

  static logEvent_ChangeDataSpace(
    service: TelemetryService,
    data: ChangeDataSpaceOrProduct_TelemetryData,
  ): void {
    service.logEvent(
      LEGEND_QUERY_APP_EVENT.CHANGE_DATA_SPACE,
      flattenChangeDataSpaceOrProductSourceInfo(data),
    );
  }

  static logEvent_ChangeDataProduct(
    service: TelemetryService,
    data: ChangeDataSpaceOrProduct_TelemetryData,
  ): void {
    service.logEvent(
      LEGEND_QUERY_APP_EVENT.CHANGE_DATA_PRODUCT,
      flattenChangeDataSpaceOrProductSourceInfo(data),
    );
  }
}
