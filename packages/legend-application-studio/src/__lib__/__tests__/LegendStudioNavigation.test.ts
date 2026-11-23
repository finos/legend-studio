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

import { describe, expect, test } from '@jest/globals';
import { unitTest } from '@finos/legend-shared/test';
import { matchRoutes } from '@finos/legend-application/browser';
import {
  generateShowcasePath,
  LEGEND_STUDIO_SDLC_BYPASSED_ROUTE_PATTERN,
} from '../LegendStudioNavigation.js';

describe('generateShowcasePath', () => {
  test.each([
    ['a path with a slash and a space', 'Lambda/Function Jar'],
    ['a path with no special characters', 'Simple'],
    ['a path with reserved characters', 'Data & Models/Q: 100%'],
  ])(
    unitTest('round-trips %s through the router as the showcase path'),
    (_description, showcasePath) => {
      const route = generateShowcasePath(showcasePath);
      // match the way `<Routes>` (and so `useParams`) does: the param is
      // what the showcase viewer hands the registry client
      const matches = matchRoutes(
        [{ path: LEGEND_STUDIO_SDLC_BYPASSED_ROUTE_PATTERN.SHOWCASE }],
        route,
      );
      expect(matches?.[0]?.params.showcasePath).toBe(showcasePath);
    },
  );

  test(unitTest('encodes the path once'), () => {
    expect(generateShowcasePath('Lambda/Function Jar')).toBe(
      '/showcase/Lambda%2FFunction%20Jar',
    );
  });
});
