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

import { test, describe, expect } from '@jest/globals';
import { unitTest } from '@finos/legend-shared/test';
import { parseMcpToolDocumentation } from '../intelligence/McpToolDocumentation.js';

const envelope = (documentation: string): string =>
  `This tool executes the service with pattern '/Sample/MCP/getSample/{code}'. Service documentation: '${documentation}'. Args: '[code(string)]'. Returns: Array of json objects.`;

describe(unitTest('parseMcpToolDocumentation'), () => {
  test('extracts the service pattern and documentation from the envelope', () => {
    const parsed = parseMcpToolDocumentation(envelope('Returns sample rows.'));

    expect(parsed.servicePattern).toBe('/Sample/MCP/getSample/{code}');
    expect(parsed.documentation).toBe('Returns sample rows.');
    expect(parsed.groundingRules).toBeUndefined();
  });

  test('splits grounding rules announced by a plain text line', () => {
    const parsed = parseMcpToolDocumentation(
      envelope(
        'Returns sample rows.\nGrounding Rules\nDATA INTEGRITY\nReturn every row from the tool output.',
      ),
    );

    expect(parsed.documentation).toBe('Returns sample rows.');
    expect(parsed.groundingRules?.startsWith('Grounding Rules')).toBe(true);
    expect(parsed.groundingRules).toContain('DATA INTEGRITY');
  });

  test('splits grounding rules announced by a markdown heading', () => {
    const parsed = parseMcpToolDocumentation(
      envelope(
        '## Description Lists sample groups. ## Grounding Rules NO FABRICATION Never fabricate data.',
      ),
    );

    expect(parsed.documentation).toBe('## Description Lists sample groups.');
    expect(parsed.groundingRules).toContain('## Grounding Rules');
    expect(parsed.groundingRules).toContain('NO FABRICATION');
  });

  test('ends the grounding block at the next heading and keeps the tail', () => {
    const parsed = parseMcpToolDocumentation(
      envelope(
        'Intro text. ## Grounding Rules Never fabricate data. ## Field Descriptions | A | B |',
      ),
    );

    expect(parsed.documentation).toBe(
      'Intro text.\n\n## Field Descriptions | A | B |',
    );
    expect(parsed.groundingRules).not.toContain('## Field Descriptions');
  });

  test('does not end the grounding block on a non-heading hash', () => {
    const parsed = parseMcpToolDocumentation(
      envelope(
        'Intro text. ## Grounding Rules - Use the #1 ranked row. - Never fabricate data.',
      ),
    );

    expect(parsed.documentation).toBe('Intro text.');
    expect(parsed.groundingRules).toContain('#1 ranked row');
    expect(parsed.groundingRules).toContain('Never fabricate data');
  });

  test('falls back to the raw description when the envelope is absent', () => {
    const parsed = parseMcpToolDocumentation('A plain tool description.');

    expect(parsed.servicePattern).toBeUndefined();
    expect(parsed.documentation).toBe('A plain tool description.');
    expect(parsed.groundingRules).toBeUndefined();
  });

  test('returns an empty document for an empty description', () => {
    const parsed = parseMcpToolDocumentation('');

    expect(parsed.servicePattern).toBeUndefined();
    expect(parsed.documentation).toBe('');
    expect(parsed.groundingRules).toBeUndefined();
  });
});
