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
import {
  EXTERNAL_APPLICATION_NAVIGATION__generateStudioReviewUrl,
  EXTERNAL_APPLICATION_NAVIGATION__generateStudioWorkspaceUrl,
} from '../LegendMarketplaceNavigation.js';

const STUDIO = 'https://studio.test';

describe(unitTest('Legend Studio links'), () => {
  test('a group workspace, and a user one', () => {
    expect(
      EXTERNAL_APPLICATION_NAVIGATION__generateStudioWorkspaceUrl(
        STUDIO,
        'PROD-1',
        'onboarding-run 1',
      ),
    ).toBe(`${STUDIO}/edit/PROD-1/groupWorkspace/onboarding-run%201/`);
    expect(
      EXTERNAL_APPLICATION_NAVIGATION__generateStudioWorkspaceUrl(
        STUDIO,
        'PROD-1',
        'mine',
        false,
      ),
    ).toBe(`${STUDIO}/edit/PROD-1/mine/`);
  });

  test('a review', () => {
    expect(
      EXTERNAL_APPLICATION_NAVIGATION__generateStudioReviewUrl(
        STUDIO,
        'PROD-1',
        '42',
      ),
    ).toBe(`${STUDIO}/review/PROD-1/42`);
  });
});
