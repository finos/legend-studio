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

/**
 * The lists the engine gives every data set it parses, and reads: a data set
 * Studio writes holds each, empty when it has none
 */
const DATA_SET_LIST_KEYS = [
  'ingestPartitionColumns',
  'preprocessors',
  'storageLayoutClusterColumns',
  'storageLayoutPartitionColumns',
] as const;

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

/** A materialized view of an ingest definition, as its content holds it */
export interface IngestMaterializedView {
  readonly name: string;
  /** Its query, as protocol JSON */
  readonly lambda: PlainObject;
  readonly primaryKey: readonly string[];
  /** The classification of its data; none for a view without one */
  readonly sensitivity: string | undefined;
}

/** The materialized views of the ingest definition, as its content holds them */
export const getIngestMaterializedViews = (
  ingest: IngestDefinition,
): IngestMaterializedView[] =>
  (Array.isArray(ingest.content.datasets) ? ingest.content.datasets : [])
    .filter(isObject)
    .flatMap((dataSet) => {
      const { name, source, primaryKey, privacyClassification } =
        dataSet as PlainObject;
      const lambda = isObject(source)
        ? (source as PlainObject).function
        : undefined;
      const sensitivity = isObject(privacyClassification)
        ? (privacyClassification as PlainObject).sensitivity
        : undefined;
      return isString(name) &&
        (source as PlainObject | undefined)?._type ===
          MATERIALIZED_VIEW_SOURCE_TYPE &&
        isObject(lambda)
        ? [
            {
              name,
              lambda: lambda as PlainObject,
              primaryKey: Array.isArray(primaryKey)
                ? primaryKey.filter(isString)
                : [],
              sensitivity: isString(sensitivity) ? sensitivity : undefined,
            },
          ]
        : [];
    });

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
          ...Object.fromEntries(DATA_SET_LIST_KEYS.map((key) => [key, []])),
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

/**
 * Replaces a materialized view's lambda (protocol JSON) in place: its name,
 * its place among the data sets and its other keys stay, as does its place
 * among the views listed for Lineage and View SQL. A primary key and a
 * classification given replace the view's, and the lists the engine reads
 * that the view lacks, e.g. as Studio wrote a view before it wrote them, are
 * added empty
 */
export const ingestDefinition_updateMaterializedView = action(
  (
    ingest: IngestDefinition,
    name: string,
    lambda: PlainObject,
    options?: IngestMaterializedViewOptions,
  ): void => {
    const dataSets = Array.isArray(ingest.content.datasets)
      ? (ingest.content.datasets as unknown[])
      : [];
    ingest.content = {
      ...ingest.content,
      datasets: dataSets.map((dataSet) => {
        if (!isObject(dataSet)) {
          return dataSet;
        }
        const {
          name: dataSetName,
          source,
          privacyClassification,
        } = dataSet as PlainObject;
        if (
          dataSetName !== name ||
          !isObject(source) ||
          (source as PlainObject)._type !== MATERIALIZED_VIEW_SOURCE_TYPE
        ) {
          return dataSet;
        }
        return {
          ...dataSet,
          ...(options
            ? {
                primaryKey: [...options.primaryKey],
                privacyClassification: {
                  ...(isObject(privacyClassification)
                    ? (privacyClassification as PlainObject)
                    : {}),
                  sensitivity: options.sensitivity,
                },
              }
            : {}),
          source: { ...source, function: lambda },
          ...Object.fromEntries(
            DATA_SET_LIST_KEYS.filter(
              (key) => !Array.isArray((dataSet as PlainObject)[key]),
            ).map((key) => [key, []]),
          ),
        };
      }),
    };
    ingest.TEMPORARY_MATVIEW_FUNCTION_DATA_SETS =
      ingest.TEMPORARY_MATVIEW_FUNCTION_DATA_SETS?.map((view) =>
        view.name === name
          ? {
              ...view,
              source: {
                ...view.source,
                function: new RawLambda(
                  Array.isArray(lambda.parameters) ? lambda.parameters : [],
                  lambda.body as object | undefined,
                ),
              },
            }
          : view,
      );
  },
);
