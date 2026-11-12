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
  INGEST_DEFINITION_CLASSIFIER_PATH,
  ingestColumn,
  ingestDataSet,
  ingestFunction,
  ingestMaterializedView,
} from '../support/IngestEntities.js';
import type { Entity } from '../support/TEST_DATA__SDLC.js';

export const FIRM_INGEST_PATH = 'guide::ingest::FirmIngest';

/**
 * The guide's ingest definition: it brings the firm database's tables into
 * the Lakehouse, one data set each, which the data product's access points
 * read, and computes two materialized views of them. Its views' functions
 * are parsed by the engine the guide runs against.
 */
export const getFirmIngest = async (): Promise<Entity> => ({
  path: FIRM_INGEST_PATH,
  classifierPath: INGEST_DEFINITION_CLASSIFIER_PATH,
  content: {
    _type: 'ingestDefinition',
    name: 'FirmIngest',
    package: 'guide::ingest',
    owner: {
      _type: 'appDir',
      production: { appDirId: 12345, level: 'DEPLOYMENT' },
      prodParallel: { appDirId: 12346, level: 'DEPLOYMENT' },
    },
    readMode: {
      _type: 'Delta',
      format: {
        _type: 'CSV',
        fieldDelimiter: ',',
        headerRowsToSkipCount: 1,
        recordDelimiter: '\n',
        parseHeader: true,
      },
    },
    writeMode: { _type: 'append_only' },
    datasetGroup: 'FIRM_DATA',
    autoTrigger: true,
    enableTypeSystemValidations: true,
    taggedValues: [
      {
        tag: { profile: 'meta::pure::profiles::doc', value: 'doc' },
        value:
          "The firm database's firms and their employees, in the Lakehouse",
      },
    ],
    datasets: [
      ingestDataSet(
        'FIRM',
        [
          ingestColumn('ID', 'Int', {
            required: true,
            description: "The firm's ID in the firm database",
          }),
          ingestColumn('LEGAL_NAME', 'Varchar', {
            size: 200,
            description: 'The name the firm is registered under',
          }),
          ingestColumn('INC_TYPE', 'Varchar', {
            size: 10,
            description: 'How the firm is incorporated, e.g. LLC',
          }),
        ],
        {
          privacyClassification: { sensitivity: 'DP10' },
          lookupIndexes: [{ _type: 'fullText', column: 'LEGAL_NAME' }],
        },
      ),
      ingestDataSet(
        'PERSON',
        [
          ingestColumn('ID', 'Int', {
            required: true,
            description: "The person's ID in the firm database",
          }),
          ingestColumn('FIRST_NAME', 'Varchar', { size: 200 }),
          ingestColumn('LAST_NAME', 'Varchar', { size: 200 }),
          ingestColumn('AGE', 'Int', { description: 'In years' }),
          ingestColumn('FIRM_ID', 'Int', {
            description: 'The firm the person works for',
          }),
        ],
        {
          privacyClassification: { sensitivity: 'DP20' },
          dataResidencyJurisdictions: [{ region: 'US' }],
          lookupIndexes: [{ _type: 'equality', column: 'LAST_NAME' }],
        },
      ),
      ingestMaterializedView(
        'FIRM_EMPLOYEES',
        await ingestFunction(
          `|#>{${FIRM_INGEST_PATH}.PERSON}#->select(~[FIRST_NAME, LAST_NAME, FIRM_ID])->join(#>{${FIRM_INGEST_PATH}.FIRM}#->select(~[ID, LEGAL_NAME]), meta::pure::functions::relation::JoinKind.INNER, {p, f | $p.FIRM_ID == $f.ID})`,
        ),
        {
          primaryKey: ['FIRST_NAME', 'LAST_NAME'],
          privacyClassification: { sensitivity: 'DP20' },
        },
      ),
      ingestMaterializedView(
        'EMPLOYEES_BY_FIRM',
        await ingestFunction(
          `|#>{${FIRM_INGEST_PATH}.PERSON}#->groupBy(~[FIRM_ID], ~[EMPLOYEES : x | $x.ID : y | $y->count()])`,
        ),
        {
          primaryKey: ['FIRM_ID'],
          privacyClassification: { sensitivity: 'DP10' },
        },
      ),
    ],
  },
});
