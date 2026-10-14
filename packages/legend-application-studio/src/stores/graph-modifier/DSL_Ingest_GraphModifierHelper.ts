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

import { RawLambda, type IngestDefinition } from '@finos/legend-graph';
import { isObject, isString, type PlainObject } from '@finos/legend-shared';
import { action } from 'mobx';

/** The source of a data set whose rows a function computes: a materialized view */
const MATERIALIZED_VIEW_SOURCE_TYPE = 'FunctionSource';

/** The ingest definition's data sets, as its content holds them */
export const getIngestDataSetNames = (ingest: IngestDefinition): string[] =>
  (Array.isArray(ingest.content.datasets) ? ingest.content.datasets : [])
    .map((dataSet: unknown) =>
      isObject(dataSet) ? (dataSet as PlainObject).name : undefined,
    )
    .filter(isString);

/** What a materialized view's data set says besides its name and its query */
export interface IngestMaterializedViewOptions {
  /** The columns that identify a row, in the order of the view's columns; none for no key */
  readonly primaryKey: readonly string[];
  /** The classification of its data, e.g. `DP10`, as a data product's access points take one */
  readonly sensitivity: string;
}

/**
 * Adds a materialized view to the ingest definition: a data set whose rows
 * the lambda (protocol JSON) computes, with its primary key and the
 * classification of its data. It holds every key the engine gives a data
 * set it parses, its lists empty, as the engine reads them all: a view
 * without a `privacyClassification` failed with a NullPointerException.
 * The content is replaced, so the change is seen, and the view is listed
 * for Lineage and View SQL as one read from the definition would be
 */
export const ingestDefinition_addMaterializedView = action(
  (
    ingest: IngestDefinition,
    name: string,
    lambda: PlainObject,
    options: IngestMaterializedViewOptions,
  ): void => {
    const dataSets = Array.isArray(ingest.content.datasets)
      ? (ingest.content.datasets as unknown[])
      : [];
    ingest.content = {
      ...ingest.content,
      datasets: [
        ...dataSets,
        {
          name,
          primaryKey: [...options.primaryKey],
          privacyClassification: { sensitivity: options.sensitivity },
          source: { _type: MATERIALIZED_VIEW_SOURCE_TYPE, function: lambda },
          ingestPartitionColumns: [],
          preprocessors: [],
          storageLayoutClusterColumns: [],
          storageLayoutPartitionColumns: [],
        },
      ],
    };
    ingest.TEMPORARY_MATVIEW_FUNCTION_DATA_SETS = [
      ...(ingest.TEMPORARY_MATVIEW_FUNCTION_DATA_SETS ?? []),
      {
        name,
        source: {
          function: new RawLambda(
            Array.isArray(lambda.parameters) ? lambda.parameters : [],
            lambda.body as object | undefined,
          ),
        },
      },
    ];
  },
);
