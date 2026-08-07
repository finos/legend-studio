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

import { describe, test, expect } from '@jest/globals';
import { unitTest } from '@finos/legend-shared/test';
import {
  generateExistingQueryEditorRoute,
  LEGEND_QUERY_QUERY_PARAM_TOKEN,
} from '../LegendQueryNavigation.js';

describe(unitTest('generateExistingQueryEditorRoute'), () => {
  test(
    unitTest('generates the plain editor route when no revision is provided'),
    () => {
      expect(generateExistingQueryEditorRoute('test-query-id')).toBe(
        '/edit/test-query-id',
      );
    },
  );

  test(
    unitTest(
      'appends the revisionId query parameter when a revision version is provided',
    ),
    () => {
      expect(generateExistingQueryEditorRoute('test-query-id', 'rev-42')).toBe(
        `/edit/test-query-id?${LEGEND_QUERY_QUERY_PARAM_TOKEN.REVISION_ID}=rev-42`,
      );
    },
  );
});
