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
import { createNodeRegistry, UnknownNode } from '@finos/legend-cube';
import {
  CUBE_NODE_HELP_TEXT,
  SELECT_NODE_TOOLTIP,
} from '../../../__lib__/LegendCubeHelpText.js';
import { TEST__createCubeHost } from '../../../__test-utils__/CubeTestApplication.js';
import { CubeEditorState } from '../../../stores/CubeEditorState.js';
import { CUBE_NODE_DRAFT_FACTORIES } from '../../../stores/editors/CubeNodeDraftRegistry.js';
import { hasCubeNodeIcon } from '../../CubeNodeIcon.js';
import { CUBE_NODE_EDITORS } from '../CubeNodeEditorRegistry.js';

// What a node type needs in the builder (PLAN §7.4): a new type that misses
// one of these fails here, not in the user's hands

const registry = createNodeRegistry();
const types = [...registry.sources, ...registry.transforms].map(
  (definition) => definition.type,
);

describe('Node editor registries', () => {
  test.each(types)('Has help text, an icon and an editor for %s', (type) => {
    expect(CUBE_NODE_HELP_TEXT[type]).toBeTruthy();
    expect(hasCubeNodeIcon(registry.get(type)?.icon ?? '')).toBe(true);
    expect(CUBE_NODE_EDITORS.has(type)).toBe(true);
  });

  test('Maps only real icon names, never an object key', () => {
    expect(hasCubeNodeIcon('table')).toBe(true);
    expect(hasCubeNodeIcon('no-such-icon')).toBe(false);
    expect(hasCubeNodeIcon('constructor')).toBe(false);
  });

  test('Carries the help text and the Select tooltip verbatim (spec §17.9)', () => {
    expect(CUBE_NODE_HELP_TEXT).toEqual({
      relational: 'Sources data from relational database table.',
      drop: 'Reduces the number of rows in the previous data set, removing the specified number of rows from the beginning of the data set.',
      filter:
        'Reduces the number of rows in the previous data set, keeping only rows matching the specified criteria.',
      join: 'Joins two previous data sets using specified columns as join keys.',
      limit:
        'Reduces the number of rows in the previous data set, keeping the specified number of rows from the beginning of the data set.',
      unknown: 'Source or transformation unknown to the application.',
    });
    expect(SELECT_NODE_TOOLTIP).toBe(
      'Selects this node as active and its output will be shown in the grid once query is executed.',
    );
  });

  test.each(registry.transforms.map((definition) => definition.type))(
    'Has a draft for %s, which gives back a new node of the type until it is edited',
    (type) => {
      const factory = CUBE_NODE_DRAFT_FACTORIES.get(type);
      const definition = registry.get(type);
      expect(factory).toBeDefined();
      if (factory && definition?.kind === 'transform') {
        const node = definition.create(`${type}101`);
        const draft = factory(
          node,
          new CubeEditorState(TEST__createCubeHost().host),
        );
        expect(draft.original).toBe(node);
        expect(draft.build()).toBe(node);
      }
    },
  );

  test('Has a draft only for types with an editor, and help for Unknown nodes', () => {
    [...CUBE_NODE_DRAFT_FACTORIES.keys()].forEach((type) =>
      expect(CUBE_NODE_EDITORS.has(type)).toBe(true),
    );
    expect(CUBE_NODE_HELP_TEXT[UnknownNode.TYPE]).toBe(
      'Source or transformation unknown to the application.',
    );
  });
});
