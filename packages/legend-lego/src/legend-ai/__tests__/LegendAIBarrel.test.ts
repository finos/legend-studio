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
// What this test is about is the package's own barrel.
// eslint-disable-next-line @finos/legend/no-same-workspace-index-import
import * as legendAI from '../index.js';

describe(unitTest('the legend-ai exports'), () => {
  test('the user message class and its view are two names, neither hiding the other', () => {
    expect(new legendAI.LegendAIUserMessage()).toBeInstanceOf(
      legendAI.LegendAIUserMessage,
    );
    expect(typeof legendAI.LegendAIUserMessageView).toBe('function');
  });

  test("the A2A stream's internals are not exported, only the client", () => {
    expect(legendAI.A2AMessageStreamClient).toBeDefined();
    [
      'A2AStreamTurn',
      'DEFAULT_A2A_STREAM_MARKERS',
      'buildA2AMessageStreamPayload',
      'extractA2AAgentParts',
      'formatA2AChatHistory',
      'parseA2AStreamEvent',
      'readJsonEnvelope',
    ].forEach((internal) =>
      expect(Object.keys(legendAI)).not.toContain(internal),
    );
  });
});
