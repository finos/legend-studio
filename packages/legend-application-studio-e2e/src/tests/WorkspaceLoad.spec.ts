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

import { test, expect } from '@playwright/test';
import { setupStudio } from '../support/StudioSetup.js';
import {
  expectFormMode,
  getPropertyNameInputs,
  openElement,
  openWorkspace,
} from '../support/StudioHelpers.js';

test('the workspace opens in form mode, with its model', async ({ page }) => {
  const backends = await setupStudio(page);
  await openWorkspace(page);

  await expectFormMode(page);
  await openElement(page, 'model::Person');
  await expect(getPropertyNameInputs(page)).toHaveCount(3);
  await expect(getPropertyNameInputs(page).first()).toHaveValue('firstName');
  expect(backends.unmockedCalls).toEqual([]);
});
