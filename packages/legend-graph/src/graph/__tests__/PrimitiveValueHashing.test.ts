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

import { test, expect } from '@jest/globals';
import { unitTest } from '@finos/legend-shared/test';
import { HostedService } from '../metamodel/pure/packageableElements/function/HostedService.js';

test(unitTest('Toggling a boolean field changes the element hash'), () => {
  const service = new HostedService('MyService');
  service.autoActivateUpdates = true;
  const activated = service.hashCode;
  service.autoActivateUpdates = false;
  const deactivated = service.hashCode;
  service.storeModel = true;
  const storingModel = service.hashCode;

  expect(new Set([activated, deactivated, storingModel]).size).toBe(3);
});
