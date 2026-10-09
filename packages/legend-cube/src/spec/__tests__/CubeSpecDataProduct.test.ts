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
import { MESSAGE_TABLE_AFTER_DATA_PRODUCT } from '../../messages/CubeMessages.js';
import {
  createNodeRegistry,
  FILTER_DEFINITION,
  JOIN_DEFINITION,
  NodeRegistry,
  RELATIONAL_TABLE_SOURCE_DEFINITION,
} from '../../nodes/NodeRegistry.js';
import type { DataProductAccessPointSource } from '../../nodes/sources/DataProductAccessPointSource.js';
import { UnknownNode } from '../../nodes/UnknownNode.js';
import type { JsonObject } from '../../utils/Json.js';
import {
  decodeCubeSpec,
  encodeCubeSpec,
  parseCubeSpec,
  serializeCubeSpec,
} from '../CubeSpecCodec.js';
import { CubeSpecDecodeError } from '../SpecReader.js';

// Cubes on a data product's access points (PLAN §6.8): the project, its
// version, the environment type and the warehouse are saved once, as the
// cube's model, which the core keeps whole; each source saves where its
// access point is. The samples sit in their own folder, which the corpus
// tests don't read

const FIXTURES = resolve(__dirname, 'fixtures', 'dataProduct');
const FILES = readdirSync(FIXTURES)
  .filter((file) => file.endsWith('.cube.json'))
  .sort();

const textOf = (file: string): string =>
  readFileSync(join(FIXTURES, file), 'utf-8');
const read = (file: string): JsonObject => JSON.parse(textOf(file));

/** Today's node kinds */
const REGISTRY = createNodeRegistry();

/** The node kinds of 0.0.2, the first release, which has no data products */
const RELEASE_0_0_2_REGISTRY = new NodeRegistry([
  RELATIONAL_TABLE_SOURCE_DEFINITION,
  FILTER_DEFINITION,
  JOIN_DEFINITION,
]);

// the validity each sample was written with
const INVALID_NODES: Record<string, string[]> = {
  'join-filter.cube.json': [],
  'mixed-with-table.cube.json': ['relational101'],
  'resolved-types.cube.json': [],
  'snapshot-version.cube.json': [],
  'unknown-keys.cube.json': [],
  'unresolved.cube.json': ['dataProductAccessPoint101'],
};

/** A sample's first node, with one of its fields changed */
const withNodeField = (key: string, value: unknown): JsonObject => {
  const json = read('join-filter.cube.json');
  const query = json.query as { nodes: JsonObject[] };
  const [first, ...others] = query.nodes;
  return {
    ...json,
    query: {
      ...query,
      nodes: [{ ...first, [key]: value } as JsonObject, ...others],
    },
  };
};

const decodeErrorOf = (json: unknown): CubeSpecDecodeError => {
  try {
    decodeCubeSpec(json, { registry: REGISTRY });
  } catch (error) {
    if (error instanceof CubeSpecDecodeError) {
      return error;
    }
    throw error;
  }
  throw new Error('Expected a CubeSpecDecodeError, but the spec was read');
};

describe(unitTest('Saved specs of data product cubes'), () => {
  test('Has every sample', () => {
    expect(FILES).toEqual(Object.keys(INVALID_NODES).sort());
  });

  test.each(FILES)('Re-saves %s exactly, keys in order', (file) => {
    const json = read(file);
    const { document } = decodeCubeSpec(json, { registry: REGISTRY });
    expect(JSON.stringify(encodeCubeSpec(document, REGISTRY))).toBe(
      JSON.stringify(json),
    );
  });

  test.each(FILES)(
    'Reads %s back, offline, with its model kept whole and its validity',
    (file) => {
      const json = read(file);
      const { document, formatVersion, readOnly } = parseCubeSpec(
        textOf(file),
        { registry: REGISTRY },
      );
      expect(formatVersion).toBe(1);
      expect(readOnly).toBe(false);
      expect(document.context?.model).toEqual(
        (json.context as JsonObject).model,
      );
      expect(document.context?.runtime).toBe('cube::dataProduct::Runtime');
      expect(
        describeDocument(
          parseCubeSpec(serializeCubeSpec(document, REGISTRY), {
            registry: REGISTRY,
          }).document,
        ),
      ).toEqual(describeDocument(document));
      const { validity } = buildSchemasAndValidity(
        document.query,
        REGISTRY.queryRules,
      );
      expect(
        document.query.nodes
          .filter((node) => validity.get(node.id)?.length)
          .map((node) => node.id),
      ).toEqual(INVALID_NODES[file]);
    },
  );

  test('Flags the table of a cube that reads data products', () => {
    const { document } = decodeCubeSpec(read('mixed-with-table.cube.json'), {
      registry: REGISTRY,
    });
    const { validity } = buildSchemasAndValidity(
      document.query,
      REGISTRY.queryRules,
    );
    expect(validity.get('relational101')).toEqual([
      MESSAGE_TABLE_AFTER_DATA_PRODUCT,
    ]);
  });

  test.each(FILES)(
    'Keeps every node of %s, as saved, for a version without data products',
    (file) => {
      const json = read(file);
      const { document } = decodeCubeSpec(json, {
        registry: RELEASE_0_0_2_REGISTRY,
      });
      const savedSources = (json.query as { nodes: JsonObject[] }).nodes
        .filter((node) => node.kind === 'dataProductAccessPoint')
        .map((node) => node.id);
      const kept = document.query.nodes.filter(
        (node) =>
          node instanceof UnknownNode &&
          node.savedKind === 'dataProductAccessPoint',
      );
      expect(savedSources.length).toBeGreaterThan(0);
      expect(kept.map((node) => node.id)).toEqual(savedSources);
      kept.forEach((node) => expect(node.ports).toEqual([]));
      expect(
        JSON.stringify(encodeCubeSpec(document, RELEASE_0_0_2_REGISTRY)),
      ).toBe(JSON.stringify(json));
    },
  );

  test('Saves a source without a snapshot until resolved, and a failed one too, which reads back unresolved', () => {
    const { document } = decodeCubeSpec(read('unresolved.cube.json'), {
      registry: REGISTRY,
    });
    const [source] = document.query.nodes as DataProductAccessPointSource[];
    expect(source?.resolution.kind).toBe('unresolved');
    const failed = (source as DataProductAccessPointSource).withResolution({
      kind: 'failed',
      message: 'The access point is gone',
    });
    const saved = encodeCubeSpec(
      document.withQuery(document.query.replace(failed)),
      REGISTRY,
    );
    const [node] = (saved.query as { nodes: JsonObject[] }).nodes;
    expect(Object.keys(node as JsonObject)).toEqual([
      'kind',
      'id',
      'dataProduct',
      'accessPointGroup',
      'accessPoint',
      'dataProductId',
      'deploymentId',
    ]);
    const [reread] = decodeCubeSpec(saved, { registry: REGISTRY }).document
      .query.nodes as DataProductAccessPointSource[];
    expect(reread?.resolution.kind).toBe('unresolved');
  });

  test.each([
    'dataProduct',
    'accessPointGroup',
    'accessPoint',
    'dataProductId',
    'deploymentId',
  ])('Refuses a source whose %s is missing, empty or not text', (key) => {
    [undefined, '', 1234].forEach((value) => {
      const error = decodeErrorOf(withNodeField(key, value));
      expect(error.path).toBe(`query.nodes[0].${key}`);
    });
  });

  test('Refuses inputs on a source', () => {
    const error = decodeErrorOf(withNodeField('inputs', ['join101']));
    expect([error.path, error.detail]).toEqual([
      'query.nodes[0].inputs',
      'must be left out: a dataProductAccessPoint node has no inputs',
    ]);
  });

  test("Keeps a source saved with parameter values as it was, since it can't run it without them", () => {
    const json = withNodeField('parameterValues', [
      { name: 'asOf', value: '2026-01-01' },
    ]);
    const { document } = decodeCubeSpec(json, { registry: REGISTRY });
    const [node] = document.query.nodes;
    expect(node).toBeInstanceOf(UnknownNode);
    expect(JSON.stringify(encodeCubeSpec(document, REGISTRY))).toBe(
      JSON.stringify(json),
    );
  });

  test('Keeps the keys it does not know, on the model, the source and its columns, without touching any prototype', () => {
    const { document } = decodeCubeSpec(read('unknown-keys.cube.json'), {
      registry: REGISTRY,
    });
    expect(document.context?.model.laterModelKey).toEqual({
      nested: [1, null],
    });
    const [source] = document.query.nodes as DataProductAccessPointSource[];
    expect(Object.keys(source?.rest ?? {})).toEqual([
      'laterNodeKey',
      '__proto__',
    ]);
    expect(source?.columnRest.get('ORDER_ID')?.column).toEqual({
      laterColumnKey: 'kept',
    });
    expect(({} as JsonObject).polluted).toBeUndefined();
    // kept through a new resolution
    const again = (source as DataProductAccessPointSource).withResolution({
      kind: 'unresolved',
    });
    expect(again.rest).toBe(source?.rest);
  });

  test('Has samples of concrete versions, a snapshot one included, and no moving alias or environment name', () => {
    FILES.forEach((file) => {
      const text = textOf(file);
      expect(text).not.toMatch(/"(?:latest|HEAD|master-SNAPSHOT)"/u);
      expect(text).not.toMatch(/-pp"|"dev-/u);
    });
    expect(
      (read('snapshot-version.cube.json').context as { model: JsonObject })
        .model.versionId,
    ).toBe('feature-returns-SNAPSHOT');
  });
});
