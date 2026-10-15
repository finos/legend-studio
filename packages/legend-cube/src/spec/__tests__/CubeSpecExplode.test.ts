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
import { describeDocument } from '../../__test-utils__/CubeSpecTestUtils.js';
import { unitTest } from '../../__test-utils__/CubeTestUtils.js';
import { CubeDocument } from '../../graph/CubeDocument.js';
import { Query } from '../../graph/Query.js';
import {
  createNodeRegistry,
  EXPLODE_DEFINITION,
  NodeRegistry,
} from '../../nodes/NodeRegistry.js';
import { Explode } from '../../nodes/transforms/Explode.js';
import { UnknownNode } from '../../nodes/UnknownNode.js';
import type { JsonObject } from '../../utils/Json.js';
import { decodeCubeSpec, encodeCubeSpec } from '../CubeSpecCodec.js';
import { CubeSpecDecodeError } from '../SpecReader.js';

const REGISTRY = createNodeRegistry();

/** The saved spec of one unconnected explode, `explode101`, with these fields of its own */
const explodeSpec = (own: JsonObject): JsonObject => ({
  formatVersion: 1,
  query: {
    selected: 'explode101',
    nodes: [{ kind: 'explode', id: 'explode101', inputs: [null], ...own }],
  },
});

const documentOf = (node: Explode): CubeDocument =>
  new CubeDocument({ query: new Query([node], [], node.id) });

/** The document saves to exactly `expected`, and reads back equal, saving the same again */
const expectEncoded = (node: Explode, expected: JsonObject): void => {
  const encoded = encodeCubeSpec(documentOf(node), REGISTRY);
  expect(encoded).toStrictEqual(expected);
  const decoded = decodeCubeSpec(encoded, { registry: REGISTRY }).document;
  expect(describeDocument(decoded)).toEqual(describeDocument(documentOf(node)));
  expect(JSON.stringify(encodeCubeSpec(decoded, REGISTRY))).toBe(
    JSON.stringify(encoded),
  );
};

const decodedNode = (json: JsonObject, registry = REGISTRY): unknown =>
  decodeCubeSpec(json, { registry }).document.query.getNode('explode101');

describe(unitTest('Saved spec: explodes (PLAN §11.20)'), () => {
  test('Writes a new explode: nothing picked', () => {
    expectEncoded(
      EXPLODE_DEFINITION.create('explode101'),
      explodeSpec({ column: '', path: [], name: '' }),
    );
  });

  test('Writes its column, its keys in order and its name, as held, an empty key included', () => {
    expectEncoded(
      new Explode('explode101', 'PAYLOAD', ['order', 'items'], 'item'),
      explodeSpec({
        column: 'PAYLOAD',
        path: ['order', 'items'],
        name: 'item',
      }),
    );
    expectEncoded(
      new Explode('explode101', 'PAYLOAD', ['', 'items'], ' x'),
      explodeSpec({ column: 'PAYLOAD', path: ['', 'items'], name: ' x' }),
    );
  });

  test('Keeps the keys it does not know through a read and an edit', () => {
    const node = decodedNode(
      explodeSpec({ column: 'PAYLOAD', path: [], name: 'e', outer: true }),
    ) as Explode;
    expect(node).toBeInstanceOf(Explode);
    expect(node.rest).toEqual({ outer: true });
    expect(
      encodeCubeSpec(documentOf(node.with({ name: 'f' })), REGISTRY),
    ).toStrictEqual(
      explodeSpec({ column: 'PAYLOAD', path: [], name: 'f', outer: true }),
    );
  });

  test('Reads it as an Unknown node in a version without it, writing it back as it was', () => {
    const json = explodeSpec({ column: 'PAYLOAD', path: ['items'], name: 'e' });
    const older = new NodeRegistry(
      [...REGISTRY.sources, ...REGISTRY.transforms].filter(
        (definition) => definition.type !== Explode.TYPE,
      ),
    );
    const node = decodedNode(json, older);
    expect(node).toBeInstanceOf(UnknownNode);
    expect((node as UnknownNode).savedKind).toBe('explode');
    const document = decodeCubeSpec(json, { registry: older }).document;
    expect(encodeCubeSpec(document, older)).toStrictEqual(json);
  });

  test('Refuses an explode whose fields are malformed', () => {
    const base = { column: 'PAYLOAD', path: [], name: 'e' };
    [
      { ...base, column: undefined },
      { ...base, column: 1 },
      { ...base, path: undefined },
      { ...base, path: 'items' },
      { ...base, path: ['items', 2] },
      { ...base, name: undefined },
      { ...base, name: false },
    ].forEach((own) =>
      expect(() => decodedNode(explodeSpec(own as JsonObject))).toThrow(
        CubeSpecDecodeError,
      ),
    );
  });
});
