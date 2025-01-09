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

import type { PlainObject } from '@finos/legend-shared';

export type DataCubeQuerySnapshotBuilderTestCase = [
  string, // name
  string, // partial query
  { name: string; type: string }[], // source columns
  PlainObject | undefined, // configuration
  string | undefined, // error
];

export type OperationSnapshotAnalysisTestCase = [
  string, // name
  string, // query roundtrip
];

export type OperationSnapshotAnalysisTestCaseWithGrammarIssues = [
  string, // name
  string, // query
  string, // engine produced query
];

export function _testCase(data: {
  name: string;
  query: string;
  columns: string[];
  configuration?: PlainObject | undefined;
  error?: string | undefined;
}): DataCubeQuerySnapshotBuilderTestCase {
  return [
    data.name,
    data.query,
    data.columns.map((entry) => {
      const parts = entry.split(':');
      return {
        name: parts[0] as string,
        type: parts[1] as string,
      };
    }),
    data.configuration,
    data.error,
  ];
}
