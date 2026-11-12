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

import { ENGINE_URL } from './EngineSpy.js';

// Ingest definitions as their protocol JSON, the form SDLC stores them in:
// the open-source engine has no grammar for them, so a test or a page of the
// guide can't write them in the Legend language

/** The classifier path SDLC stores an ingest definition under */
export const INGEST_DEFINITION_CLASSIFIER_PATH =
  'meta::external::ingest::specification::metamodel::IngestDefinition';

/** How the Legend language marks an accessor to an ingest's data set: `#I{…}#` */
export const INGEST_ACCESSOR = 'I';
/** How it marks an accessor to a relational store's table: `#>{…}#` */
export const RELATION_STORE_ACCESSOR = '>';

/** A column of an ingest's data set, e.g. `LEGAL_NAME: Varchar(200)[0..1]` */
export const ingestColumn = (
  name: string,
  type: string,
  options: { size?: number; required?: boolean; description?: string } = {},
): Record<string, unknown> => ({
  name,
  genericType: {
    multiplicityArguments: [],
    rawType: { _type: 'packageableType', fullPath: type },
    typeArguments: [],
    typeVariableValues:
      options.size === undefined
        ? []
        : [{ _type: 'integer', value: options.size }],
  },
  multiplicity: { lowerBound: options.required ? 1 : 0, upperBound: 1 },
  ...(options.description === undefined
    ? {}
    : { description: options.description }),
});

/** A data set of an ingest, keyed by its `ID` column unless its settings say otherwise */
export const ingestDataSet = (
  name: string,
  columns: Record<string, unknown>[],
  settings: Record<string, unknown> = {},
): Record<string, unknown> => ({
  name,
  primaryKey: ['ID'],
  source: {
    _type: 'serializedSource',
    schema: { _type: 'relationType', columns },
  },
  ...settings,
});

/** A materialized view of an ingest: a data set whose rows its function computes */
export const ingestMaterializedView = (
  name: string,
  func: Record<string, unknown>,
  settings: Record<string, unknown> = {},
): Record<string, unknown> => ({
  name,
  primaryKey: [],
  source: { _type: 'FunctionSource', function: func },
  ...settings,
});

/** The JSON with each relation store accessor made an ingest accessor */
const toIngestAccessors = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(toIngestAccessors);
  }
  if (typeof value !== 'object' || value === null) {
    return value;
  }
  const json = value as Record<string, unknown>;
  if (json._type === 'classInstance' && json.type === RELATION_STORE_ACCESSOR) {
    return { ...json, type: INGEST_ACCESSOR };
  }
  return Object.fromEntries(
    Object.entries(json).map(([key, item]) => [key, toIngestAccessors(item)]),
  );
};

/**
 * A function that reads an ingest's data sets, e.g. a materialized view's,
 * as the engine parses it from the Legend language. It is written with
 * relation store accessors, `#>{guide::ingest::FirmIngest.PERSON}#`, which
 * the open-source engine reads, and they're made ingest accessors,
 * `#I{guide::ingest::FirmIngest.PERSON}#`, which it doesn't
 */
export const ingestFunction = async (
  grammar: string,
): Promise<Record<string, unknown>> => {
  const response = await fetch(
    `${ENGINE_URL}/pure/v1/grammar/grammarToJson/lambda?returnSourceInformation=false`,
    {
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: grammar,
    },
  );
  const json = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    throw new Error(`Can't parse the function: ${String(json.message)}`);
  }
  return toIngestAccessors(json) as Record<string, unknown>;
};
