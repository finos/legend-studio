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

import { isNonNullable, type TimingsRecord } from '@finos/legend-shared';
import type { PureModel } from '../graph/PureModel.js';
import { GRAPH_MANAGER_EVENT } from '../__lib__/GraphManagerEvent.js';

export type GraphManagerOperationReport = {
  timings: TimingsRecord;
  elementCount: {
    total: number | undefined;
    [key: string]: number | undefined;
  };
};

export type GraphInitializationReport = {
  timings: TimingsRecord;
  dependencies: GraphManagerOperationReport;
  dependenciesCount: number;
  graph: GraphManagerOperationReport;
  generations?: GraphManagerOperationReport;
  generationCount?: number;
  isLightGraphEnabled?: boolean;
};

export const createGraphManagerOperationReport =
  (): GraphManagerOperationReport => ({
    timings: { total: 0 },
    elementCount: { total: undefined },
  });

export const createGraphBuilderReport = (): GraphManagerOperationReport => ({
  timings: {
    total: 0,
    [GRAPH_MANAGER_EVENT.GRAPH_BUILDER_BUILD_GRAPH__SUCCESS]: 0,
  },
  elementCount: { total: undefined },
});

export const reportGraphAnalytics = (
  graph: PureModel,
): GraphManagerOperationReport & {
  dependenciesCount: number;
} => {
  const report = createGraphManagerOperationReport();

  report.elementCount.sectionIndex =
    (report.elementCount.sectionIndex ?? 0) + graph.sectionIndices.length;

  report.elementCount.association =
    (report.elementCount.association ?? 0) + graph.associations.length;
  report.elementCount.class =
    (report.elementCount.class ?? 0) + graph.classes.length;
  report.elementCount.enumeration =
    (report.elementCount.enumeration ?? 0) + graph.enumerations.length;
  report.elementCount.function =
    (report.elementCount.function ?? 0) + graph.functions.length;
  report.elementCount.profile =
    (report.elementCount.profile ?? 0) + graph.profiles.length;
  report.elementCount.measure =
    (report.elementCount.measure ?? 0) + graph.measures.length;

  report.elementCount.store =
    (report.elementCount.store ?? 0) + graph.stores.length;
  report.elementCount.mapping =
    (report.elementCount.mapping ?? 0) + graph.mappings.length;
  report.elementCount.connection =
    (report.elementCount.connection ?? 0) + graph.connections.length;
  report.elementCount.runtime =
    (report.elementCount.runtime ?? 0) + graph.runtimes.length;

  report.elementCount.service =
    (report.elementCount.service ?? 0) + graph.services.length;

  const counted = Object.values(report.elementCount)
    .filter(isNonNullable)
    .reduce((a, b) => a + b, 0);

  report.elementCount.total =
    (report.elementCount.total ?? 0) + graph.allElements.length;
  report.elementCount.other = report.elementCount.total - counted;

  return {
    ...report,
    dependenciesCount: graph.dependencyManager.numberOfDependencies,
  };
};
