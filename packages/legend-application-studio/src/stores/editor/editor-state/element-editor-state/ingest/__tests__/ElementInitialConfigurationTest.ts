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

import { describe, expect, it } from '@jest/globals';
import {
  EditorInitialConfiguration,
  ElementEditorInitialConfiguration,
  IngestElementEditorInitialConfiguration,
} from '../../ElementEditorInitialConfiguration.js';
import { guaranteeType } from '@finos/legend-shared';

export const EDITOR_CONFIG_TESTA_DATA = {
  elementEditorConfiguration: {
    type: 'INGEST_DEFINITION',
    deployOnOpen: true,
  },
};

describe('ElementEditorInitialConfiguration Serialization Test', () => {
  it('should deserialize, serialize, and encode to base64 correctly', () => {
    // Step 1: Deserialize EDITOR_CONFIG_TESTA_DATA into ElementEditorInitialConfiguration
    const config = EditorInitialConfiguration.serialization.fromJson(
      EDITOR_CONFIG_TESTA_DATA,
    );

    // Step 2: Serialize the configuration back to JSON
    const serializedConfig =
      EditorInitialConfiguration.serialization.toJson(config);

    // Step 3: Encode the serialized JSON to base64
    const base64EncodedConfig = btoa(JSON.stringify(serializedConfig));

    // Step 4: Assertions
    expect(config).toBeInstanceOf(ElementEditorInitialConfiguration);
    expect(serializedConfig).toEqual(EDITOR_CONFIG_TESTA_DATA); // Ensure serialization matches original data
    expect(typeof base64EncodedConfig).toBe('string'); // Ensure base64 encoding is a string
    expect(config.elementEditorConfiguration).toBeInstanceOf(
      IngestElementEditorInitialConfiguration,
    );
    const ingestConfig = guaranteeType(
      config.elementEditorConfiguration,
      IngestElementEditorInitialConfiguration,
    );
    expect(ingestConfig.deployOnOpen).toBe(true); // Ensure deployOnOpen is true
  });
});
