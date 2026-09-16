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

import { describe, test, expect } from '@jest/globals';
import { unitTest } from '@finos/legend-shared/test';
import { QueryBuilderMilestoningState } from '../QueryBuilderMilestoningState.js';

/**
 * `milestoningKind` reads across three independent flags on the same state, so
 * we invoke it with a hand-rolled `this` rather than standing up a full
 * `QueryBuilderState` — the point here is the precedence, not graph wiring.
 */
const getMilestoningKind = (overrides: {
  isAllVersionsInRangeEnabled?: boolean;
  isAllVersionsEnabled?: boolean;
  isMilestonedQuery?: boolean;
}): unknown => {
  const stub = {
    isAllVersionsInRangeEnabled: false,
    isAllVersionsEnabled: false,
    isMilestonedQuery: false,
    ...overrides,
  };
  const descriptor = Object.getOwnPropertyDescriptor(
    QueryBuilderMilestoningState.prototype,
    'milestoningKind',
  );
  return descriptor?.get?.call(stub);
};

describe(unitTest('QueryBuilderMilestoningState.milestoningKind'), () => {
  test(
    unitTest(
      'resolves milestoningKind by precedence, not by independent flags',
    ),
    () => {
      // all three flags are true at once: in-range must win
      expect(
        getMilestoningKind({
          isAllVersionsInRangeEnabled: true,
          isAllVersionsEnabled: true,
          isMilestonedQuery: true,
        }),
      ).toBe('all-versions-in-range');

      expect(
        getMilestoningKind({
          isAllVersionsEnabled: true,
          isMilestonedQuery: true,
        }),
      ).toBe('all-versions');

      expect(getMilestoningKind({ isMilestonedQuery: true })).toBe('get-all');

      expect(getMilestoningKind({})).toBe('none');
    },
  );
});
