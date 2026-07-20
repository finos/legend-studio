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

import { describe, expect, test } from '@jest/globals';
import { unitTest } from '@finos/legend-shared/test';
import { V1_IngestDefinition } from '../../../model/packageableElements/ingest/V1_IngestDefinition.js';
import { V1_serializePackageableElement } from '../V1_PackageableElementSerialization.js';

const createIngestDefinition = (): V1_IngestDefinition => {
  const element = new V1_IngestDefinition();
  element.package = 'model';
  element.name = 'PersonIngest';
  element.content = {
    _type: 'ingestDefinition',
    name: 'PersonIngest',
    package: 'model',
  };
  return element;
};

describe(unitTest('V1 packageable element serialization'), () => {
  test('preserves empty ingest testSuites for engine roundtrip tests', () => {
    const originalTestGroup = process.env.TEST_GROUP;
    process.env.TEST_GROUP = 'engine-roundtrip';

    try {
      expect(
        V1_serializePackageableElement(createIngestDefinition(), []),
      ).toEqual({
        _type: 'ingestDefinition',
        name: 'PersonIngest',
        package: 'model',
        testSuites: [],
      });
    } finally {
      if (originalTestGroup === undefined) {
        delete process.env.TEST_GROUP;
      } else {
        process.env.TEST_GROUP = originalTestGroup;
      }
    }
  });

  test('omits empty ingest testSuites outside engine roundtrip tests', () => {
    const originalTestGroup = process.env.TEST_GROUP;
    delete process.env.TEST_GROUP;

    try {
      expect(
        V1_serializePackageableElement(createIngestDefinition(), []),
      ).toEqual({
        _type: 'ingestDefinition',
        name: 'PersonIngest',
        package: 'model',
      });
    } finally {
      if (originalTestGroup !== undefined) {
        process.env.TEST_GROUP = originalTestGroup;
      }
    }
  });
});
