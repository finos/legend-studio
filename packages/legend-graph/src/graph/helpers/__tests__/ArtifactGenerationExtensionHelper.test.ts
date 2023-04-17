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

import { test, expect } from '@jest/globals';
import { unitTest } from '@finos/legend-shared/test';
import { getExpectedArtifactGenerationExtensionOutputPath } from '../ArtifactGenerationExtensionHelper.js';

test(unitTest('Get expected artifact generation extension output path'), () => {
  const elementPath = 'model::testing::MyEnum';
  const key = 'enum-generation-extension';
  const fileName = 'GeneratedEnumResult.json';
  const filePath = getExpectedArtifactGenerationExtensionOutputPath(
    elementPath,
    key,
    fileName,
  );
  expect(filePath).toBe(
    '/model/testing/MyEnum/enum-generation-extension/GeneratedEnumResult.json',
  );
});
