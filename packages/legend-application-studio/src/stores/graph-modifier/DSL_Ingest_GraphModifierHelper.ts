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

import {
  MILESTONE_INGEST_COLUMNS,
  PRECISE_PRIMITIVE_TYPE,
  PRIMITIVE_TYPE,
  RawLambda,
  type IngestDefinition,
} from '@finos/legend-graph';
import { isObject, isString, type PlainObject } from '@finos/legend-shared';
import { action } from 'mobx';

/** The source of a data set whose rows a function computes: a materialized view */
const MATERIALIZED_VIEW_SOURCE_TYPE = 'FunctionSource';

/** How a function's JSON marks an ingest data set it reads: `#I{definition.dataSet}#` */
const INGEST_ACCESSOR_TYPE = 'I';

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

/** The write modes of an ingest definition, or of one of its data sets, as its JSON names them */
const INGEST_WRITE_MODE = {
  APPEND_ONLY: 'append_only',
  BATCH_MILESTONED: 'batch_milestoned',
  BATCH_MILESTONED_BUSINESS_TEMPORAL: 'batch_milestoned_business_temporal',
} as const;

/** A column a write mode adds: its name, and its type as legend-graph types it */
type IngestAddedColumn = readonly [name: string, typePath: string];

const BATCH_MILESTONED_COLUMNS: readonly IngestAddedColumn[] = [
  [MILESTONE_INGEST_COLUMNS.INGEST_LAKE_DIGEST, PRIMITIVE_TYPE.STRING],
  [MILESTONE_INGEST_COLUMNS.INGEST_LAKE_IN_ID, PRIMITIVE_TYPE.INTEGER],
  [MILESTONE_INGEST_COLUMNS.INGEST_LAKE_OUT_ID, PRIMITIVE_TYPE.INTEGER],
];

/**
 * The columns each write mode adds after a data set's own, in the order the
 * engine returns them, as Legend Cube reads them: the digest, the batches a
 * row came in and went out with, then, business temporal, the dates it holds
 * from and through. legend-graph lists them LAKE_IN_ID first.
 */
const INGEST_WRITE_MODE_COLUMNS = new Map<string, readonly IngestAddedColumn[]>(
  [
    [INGEST_WRITE_MODE.APPEND_ONLY, []],
    [INGEST_WRITE_MODE.BATCH_MILESTONED, BATCH_MILESTONED_COLUMNS],
    [
      INGEST_WRITE_MODE.BATCH_MILESTONED_BUSINESS_TEMPORAL,
      [
        ...BATCH_MILESTONED_COLUMNS,
        [
          MILESTONE_INGEST_COLUMNS.INGEST_LAKE_FROM,
          PRECISE_PRIMITIVE_TYPE.TIMESTAMP,
        ],
        [
          MILESTONE_INGEST_COLUMNS.INGEST_LAKE_THRU,
          PRECISE_PRIMITIVE_TYPE.TIMESTAMP,
        ],
      ],
    ],
  ],
);

/** A write mode, in words: `batch milestoned` */
export const describeIngestWriteMode = (writeMode: string): string =>
  writeMode.replaceAll('_', ' ');

/** A column of an ingest data set, as its definition declares it or its write mode adds it, for display */
export class IngestDataSetColumn {
  readonly name: string;
  /** Its type's name, with its parameters: `Varchar(32)`, `Numeric(18, 4)` */
  readonly type: string;
  /** Its type's full path, e.g. `meta::pure::precisePrimitives::Varchar` */
  readonly typePath: string;
  /** How many values it holds, as View SQL's schema says it: `[1] - Required`, `[0..1] - Optional` */
  readonly multiplicity: string;
  readonly isPrimaryKey: boolean;
  /** The write mode that adds it, for a column the definition doesn't declare */
  readonly addedBy: string | undefined;

  constructor(
    name: string,
    type: string,
    typePath: string,
    multiplicity: string,
    isPrimaryKey: boolean,
    addedBy?: string,
  ) {
    this.name = name;
    this.type = type;
    this.typePath = typePath;
    this.multiplicity = multiplicity;
    this.isPrimaryKey = isPrimaryKey;
    this.addedBy = addedBy;
  }
}

/** A data set of an ingest definition, as its JSON holds it, for display */
export class IngestDataSet {
  readonly name: string;
  /** Whether a function computes its rows: a materialized view, whose columns come from its function */
  readonly isMaterializedView: boolean;
  readonly primaryKey: readonly string[];
  /** Its write mode, its own or else its definition's; none when neither says */
  readonly writeMode: string | undefined;
  /** The columns it declares, then those its write mode adds; none for a materialized view */
  readonly columns: readonly IngestDataSetColumn[];
  /** What its columns leave out, or why it has none */
  readonly notes: readonly string[];

  constructor(
    name: string,
    isMaterializedView: boolean,
    primaryKey: readonly string[],
    writeMode: string | undefined,
    columns: readonly IngestDataSetColumn[],
    notes: readonly string[],
  ) {
    this.name = name;
    this.isMaterializedView = isMaterializedView;
    this.primaryKey = primaryKey;
    this.writeMode = writeMode;
    this.columns = columns;
    this.notes = notes;
  }

  /** How many of its columns it declares, before those its write mode adds */
  get declaredColumnCount(): number {
    return this.columns.filter((column) => column.addedBy === undefined).length;
  }
}

/** The `_type` of a write mode, if the JSON holds one */
const readWriteMode = (value: unknown): string | undefined => {
  const type = isObject(value) ? (value as PlainObject)._type : undefined;
  return isString(type) ? type : undefined;
};

/**
 * A multiplicity, as View SQL's schema says it (legend-graph's
 * `getMultiplicityPrettyDescription`), read by value: that one compares
 * with its own instances, so one read from JSON would print as `[1..1]`
 */
const describeMultiplicity = (value: unknown): string => {
  const { lowerBound, upperBound } = isObject(value)
    ? (value as PlainObject)
    : {};
  if (typeof lowerBound !== 'number') {
    return '';
  }
  const upper = typeof upperBound === 'number' ? upperBound : undefined;
  if (lowerBound === 1 && upper === 1) {
    return '[1] - Required';
  }
  if (lowerBound === 0 && upper === 1) {
    return '[0..1] - Optional';
  }
  if (lowerBound === 0 && upper === undefined) {
    return '[*] - List';
  }
  return upper === undefined
    ? `[${lowerBound}..*] - Must have at least ${lowerBound} value(s)`
    : `[${lowerBound}..${upper}] - Must have from ${lowerBound} to ${upper} value(s)`;
};

/** A declared column's type: its name with its parameters, and its full path */
const readColumnType = (
  genericType: unknown,
): { type: string; typePath: string } => {
  const { rawType, typeVariableValues } = isObject(genericType)
    ? (genericType as PlainObject)
    : {};
  const fullPath = isObject(rawType)
    ? (rawType as PlainObject).fullPath
    : undefined;
  const typePath = isString(fullPath) ? fullPath : '';
  const name = typePath.split('::').pop() ?? '';
  const params = (Array.isArray(typeVariableValues) ? typeVariableValues : [])
    .map((each: unknown) =>
      isObject(each) ? (each as PlainObject).value : undefined,
    )
    .filter(
      (each): each is string | number =>
        isString(each) || typeof each === 'number',
    );
  return {
    type: !name ? '?' : params.length ? `${name}(${params.join(', ')})` : name,
    typePath,
  };
};

/**
 * The data sets of the ingest definition, as its content holds them, for
 * display: each one's name, key and columns, those it declares then those
 * its write mode adds. It reads only `datasets` and `writeMode`, as the
 * engine writes them, and never throws: what it can't read, it leaves out,
 * and says so when that hides columns.
 */
export const getIngestDataSets = (
  ingest: IngestDefinition,
): IngestDataSet[] => {
  const definitionWriteMode = readWriteMode(ingest.content.writeMode);
  return (Array.isArray(ingest.content.datasets) ? ingest.content.datasets : [])
    .filter(isObject)
    .flatMap((value) => {
      const dataSet = value as PlainObject;
      if (!isString(dataSet.name)) {
        return [];
      }
      const primaryKey = Array.isArray(dataSet.primaryKey)
        ? dataSet.primaryKey.filter(isString)
        : [];
      const source = isObject(dataSet.source)
        ? (dataSet.source as PlainObject)
        : undefined;
      const writeMode = readWriteMode(dataSet.writeMode) ?? definitionWriteMode;
      if (source?._type === MATERIALIZED_VIEW_SOURCE_TYPE) {
        return [
          new IngestDataSet(dataSet.name, true, primaryKey, writeMode, [], []),
        ];
      }
      const schema = isObject(source?.schema)
        ? (source.schema as PlainObject)
        : undefined;
      const declared = (
        Array.isArray(schema?.columns) ? schema.columns : []
      ).filter(isObject) as PlainObject[];
      const notes: string[] = [];
      const columns = declared.flatMap((column) => {
        if (!isString(column.name)) {
          return [];
        }
        const { type, typePath } = readColumnType(column.genericType);
        return [
          new IngestDataSetColumn(
            column.name,
            type,
            typePath,
            describeMultiplicity(column.multiplicity),
            primaryKey.includes(column.name),
          ),
        ];
      });
      const unnamed = declared.length - columns.length;
      if (unnamed) {
        notes.push(
          unnamed === 1
            ? "One of its columns has no name, and isn't shown."
            : `${unnamed} of its columns have no name, and aren't shown.`,
        );
      }
      // a data set with no columns of its own gets none from its write mode
      if (!columns.length) {
        notes.push('No columns declared.');
      } else if (writeMode !== undefined) {
        const added = INGEST_WRITE_MODE_COLUMNS.get(writeMode);
        const label = describeIngestWriteMode(writeMode);
        if (!added) {
          notes.push(
            `Its write mode, ${label}, may add columns, which aren't shown.`,
          );
        } else {
          const clashes: string[] = [];
          added.forEach(([name, addedTypePath]) => {
            if (columns.some((column) => column.name === name)) {
              clashes.push(name);
              return;
            }
            columns.push(
              new IngestDataSetColumn(
                name,
                addedTypePath.split('::').pop() ?? addedTypePath,
                addedTypePath,
                describeMultiplicity({ lowerBound: 1, upperBound: 1 }),
                false,
                writeMode,
              ),
            );
          });
          if (clashes.length) {
            notes.push(
              `It declares ${clashes.join(', ')}, which its write mode, ${label}, adds too: ${
                clashes.length === 1 ? 'it is' : 'they are'
              } listed once.`,
            );
          }
        }
      }
      return [
        new IngestDataSet(
          dataSet.name,
          false,
          primaryKey,
          writeMode,
          columns,
          notes,
        ),
      ];
    });
};

/** An ingest data set, by its definition's path and its name */
export class IngestDataSetReference {
  readonly ingestDefinition: string;
  readonly dataSet: string;

  constructor(ingestDefinition: string, dataSet: string) {
    this.ingestDefinition = ingestDefinition;
    this.dataSet = dataSet;
  }
}

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
 * The ingest data sets a materialized view's function reads, each
 * `#I{definition.dataSet}#` it holds, in the order it holds them, for
 * display: whether or not Cube can draw the view
 */
export const getIngestMaterializedViewReads = (
  view: IngestMaterializedView,
): IngestDataSetReference[] => {
  const reads: IngestDataSetReference[] = [];
  const visit = (value: unknown): void => {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (!isObject(value)) {
      return;
    }
    const json = value as PlainObject;
    if (json._type === 'classInstance' && json.type === INGEST_ACCESSOR_TYPE) {
      const path = isObject(json.value)
        ? (json.value as PlainObject).path
        : undefined;
      const parts: unknown[] = Array.isArray(path) ? path : [];
      const [ingestDefinition, dataSet] = parts;
      if (
        isString(ingestDefinition) &&
        isString(dataSet) &&
        !reads.some(
          (read) =>
            read.ingestDefinition === ingestDefinition &&
            read.dataSet === dataSet,
        )
      ) {
        reads.push(new IngestDataSetReference(ingestDefinition, dataSet));
      }
      return;
    }
    Object.values(json).forEach(visit);
  };
  visit(view.lambda);
  return reads;
};

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
