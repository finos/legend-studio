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
import { readdirSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import { describeDocument } from '../../__test-utils__/CubeSpecTestUtils.js';
import { unitTest } from '../../__test-utils__/CubeTestUtils.js';
import { buildSchemasAndValidity } from '../../inference/SchemaInference.js';
import { createNodeRegistry } from '../../nodes/NodeRegistry.js';
import {
  decodeCubeSpec,
  encodeCubeSpec,
  parseCubeSpec,
  serializeCubeSpec,
} from '../CubeSpecCodec.js';

const FIXTURES = resolve(__dirname, 'fixtures');
const FILES = readdirSync(FIXTURES)
  .filter((file) => file.endsWith('.cube.json'))
  .sort();

const read = (file: string): unknown =>
  JSON.parse(readFileSync(join(FIXTURES, file), 'utf-8'));

// the validity each sample was written with (PLAN §10.3 samples)
const INVALID_NODES: Record<string, string[]> = {
  'empty.cube.json': [],
  'full-join.cube.json': [],
  'invalid-values.cube.json': ['filter101'],
  'left-join-negations.cube.json': [],
  'newer-version.cube.json': ['pivot101'],
  'operations.cube.json': [],
  'slice.cube.json': [],
  'unfinished.cube.json': ['join101', 'filter101', 'relational102'],
};

describe(unitTest('Saved spec corpus'), () => {
  test('Has every sample', () => {
    expect(FILES).toEqual(Object.keys(INVALID_NODES).sort());
  });

  test.each(FILES)('Re-saves %s exactly, keys in order', (file) => {
    const json = read(file);
    expect(JSON.stringify(encodeCubeSpec(decodeCubeSpec(json).document))).toBe(
      JSON.stringify(json),
    );
  });

  test.each(FILES)('Reads back what it saves from %s', (file) => {
    const { document } = decodeCubeSpec(read(file));
    const again = decodeCubeSpec(encodeCubeSpec(document)).document;
    expect(describeDocument(again)).toEqual(describeDocument(document));
    // and the text form, as exported and imported
    expect(
      describeDocument(parseCubeSpec(serializeCubeSpec(document)).document),
    ).toEqual(describeDocument(document));
  });

  test.each(FILES)('Reads %s offline, with its validity', (file) => {
    const { document, formatVersion, readOnly } = decodeCubeSpec(read(file));
    expect(formatVersion).toBe(1);
    expect(readOnly).toBe(false);
    const { validity } = buildSchemasAndValidity(
      document.query,
      createNodeRegistry().queryRules,
    );
    expect(
      document.query.nodes
        .filter((node) => validity.get(node.id)?.length)
        .map((node) => node.id),
    ).toEqual(INVALID_NODES[file]);
  });
});
