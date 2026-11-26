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

import type { V1_EngineServerClient, V1_Lambda } from '@finos/legend-graph';
import { IllegalStateError, type PlainObject } from '@finos/legend-shared';

/**
 * The client a query planner generates plans with: an engine server client (or a subclass of one,
 * e.g. one which answers in the browser instead of over the network), which DataCube asks exactly
 * as it asks the engine server, through `generatePlan()`.
 */
export type LegendDataCubeQueryPlannerClient = V1_EngineServerClient & {
  /** Releases what the client holds (e.g. a worker); called when DataCube's engine is disposed */
  dispose?: () => void;
};

/**
 * A planner other than the engine server, for queries on DuckDB-backed sources (i.e. cached sources,
 * local files and cached Iceberg tables): for those, DataCube asks for an execution plan only to take
 * the generated SQL out of it, and runs that SQL itself, on its own DuckDB. So, for those sources, any
 * planner which answers `generatePlan()` with a plan holding DuckDB SQL can take the engine server's
 * place.
 *
 * Contributed by a plugin, see `LegendDataCubeApplicationPlugin.getExtraDuckDBQueryPlanners()`. Each
 * contributed planner adds one setting, off by default, to use the planner instead of the engine server.
 */
export interface LegendDataCubeDuckDBQueryPlanner {
  /** Identifies the planner, in the key of its setting; unique among planners */
  key: string;
  /** Names the planner to the user, in the title of its setting and in its error messages */
  label: string;
  /**
   * Creates the client the planner generates plans with. Called at most once, when the planner is
   * first needed, so that nothing of it is loaded unless it is used.
   */
  createEngineServerClient(): LegendDataCubeQueryPlannerClient;
  /**
   * Whether the planner is asked for this query (the protocol JSON of its lambda); a query it is not
   * asked for goes to the engine server. When absent, it is asked for every query.
   *
   * NOTE: this must be a fixed rule by the shape of the query, decided before anything is asked. It is
   * not a fallback: a query sent to the planner which the planner fails on is NOT retried on the engine
   * server.
   */
  isQuerySupported?(query: PlainObject<V1_Lambda>): boolean;
}

/** The key of a planner's setting, see `LegendDataCubeDuckDBQueryPlanner`. */
export const getPlannerSettingKey = (planner: { key: string }): string =>
  `debugger.planner.${planner.key}.enabled`;

/**
 * Checks the planners the plugins contribute: each must have a key of its own, since the key names its
 * setting.
 */
export const validateDuckDBQueryPlanners = (
  planners: LegendDataCubeDuckDBQueryPlanner[],
): LegendDataCubeDuckDBQueryPlanner[] => {
  const keys = new Set<string>();
  planners.forEach((planner) => {
    if (!planner.key) {
      throw new IllegalStateError(
        `Can't register DuckDB query planner '${planner.label}': its key is empty`,
      );
    }
    if (keys.has(planner.key)) {
      throw new IllegalStateError(
        `Can't register DuckDB query planner '${planner.label}': another planner has the key '${planner.key}'`,
      );
    }
    keys.add(planner.key);
  });
  return planners;
};

/**
 * The planner the settings put in use, if any: the first (in the order the plugins contribute them)
 * whose setting is on. With none, every plan is the engine server's; with no planner contributed, that
 * holds whatever is stored in the settings.
 */
export const resolvePlannerInUse = (
  planners: LegendDataCubeDuckDBQueryPlanner[],
  isEnabled: (settingKey: string) => boolean,
): LegendDataCubeDuckDBQueryPlanner | undefined =>
  planners.find((planner) => isEnabled(getPlannerSettingKey(planner)));

/**
 * Chooses the planner which generates the plan of a query on a DuckDB-backed source: `undefined` means
 * the engine server. See `LegendDataCubeDuckDBQueryPlanner.isQuerySupported()`.
 */
export const chooseDuckDBQueryPlanner = (
  plannerInUse: LegendDataCubeDuckDBQueryPlanner | undefined,
  query: PlainObject<V1_Lambda>,
): LegendDataCubeDuckDBQueryPlanner | undefined =>
  plannerInUse && (plannerInUse.isQuerySupported?.(query) ?? true)
    ? plannerInUse
    : undefined;
