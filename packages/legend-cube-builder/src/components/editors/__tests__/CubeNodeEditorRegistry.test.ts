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
import {
  Concat,
  createNodeRegistry,
  Difference,
  Partition,
  SortDirection,
  UnknownNode,
  WindowRankFunction,
} from '@finos/legend-cube';
import {
  CUBE_NODE_HELP_TEXT,
  SELECT_NODE_TOOLTIP,
} from '../../../__lib__/LegendCubeHelpText.js';
import { TEST__createCubeHost } from '../../../__test-utils__/CubeTestApplication.js';
import { CubeEditorState } from '../../../stores/CubeEditorState.js';
import { CubeConcatDraft } from '../../../stores/editors/CubeConcatDraft.js';
import { CubeDifferenceDraft } from '../../../stores/editors/CubeDifferenceDraft.js';
import {
  CUBE_NODE_DRAFT_FACTORIES,
  CUBE_NODE_TYPES_WITHOUT_SETTINGS,
} from '../../../stores/editors/CubeNodeDraftRegistry.js';
import { CubePartitionDraft } from '../../../stores/editors/CubePartitionDraft.js';
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

  test("Carries the help text and the Select tooltip verbatim (spec §17.9; Concat's per PLAN §11.5, Q8)", () => {
    expect(CUBE_NODE_HELP_TEXT).toEqual({
      relational: 'Sources data from relational database table.',
      dataProductAccessPoint:
        'Sources data from an access point of a deployed data product.',
      ingestDataset:
        'Sources data from a data set of a deployed ingest definition.',
      concat:
        'Combines the rows of the two previous data sets, keeping duplicates, in no particular order. Both must have the same columns: the same names, in the same order, with the same types.',
      difference:
        'Compares numeric values of specified columns from two previous data sets.',
      distinct: 'Removes duplicate rows from the previous data set.',
      drop: 'Reduces the number of rows in the previous data set, removing the specified number of rows from the beginning of the data set.',
      extend:
        'Extends outgoing data set with new columns produced by expressions.',
      filter:
        'Reduces the number of rows in the previous data set, keeping only rows matching the specified criteria.',
      group:
        'Aggregates the data from the previous data set using the specified columns and aggregation functions.',
      join: 'Joins two previous data sets using specified columns as join keys.',
      limit:
        'Reduces the number of rows in the previous data set, keeping the specified number of rows from the beginning of the data set.',
      partition:
        'Adds new columns with outputs of window functions for optional window partition and order.',
      rename:
        'Renames specified columns in the previous data set to new names.',
      restrict: 'Restricts outgoing data set to the specified columns only.',
      slice:
        'Reduces the number of rows in the previous data set, keeping only the rows from position "start" up to, but not including, position "stop", counting from 0.',
      sort: 'Reorders rows of the previous data set by one or more columns, either in ascending or descending order per column.',
      unknown: 'Source or transformation unknown to the application.',
    });
    expect(SELECT_NODE_TOOLTIP).toBe(
      'Selects this node as active and its output will be shown in the grid once query is executed.',
    );
  });

  test.each(
    registry.transforms
      .map((definition) => definition.type)
      .filter((type) => !CUBE_NODE_TYPES_WITHOUT_SETTINGS.includes(type)),
  )(
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

  test('Has no draft for a transform with nothing to set, only an editor', () => {
    expect(CUBE_NODE_TYPES_WITHOUT_SETTINGS).toEqual(['distinct']);
    CUBE_NODE_TYPES_WITHOUT_SETTINGS.forEach((type) => {
      expect(registry.get(type)?.kind).toBe('transform');
      expect(CUBE_NODE_DRAFT_FACTORIES.has(type)).toBe(false);
      expect(CUBE_NODE_EDITORS.has(type)).toBe(true);
    });
  });

  test('Gives a Concat a draft of its Convert types setting (PLAN §11.5, Q5)', () => {
    const state = new CubeEditorState(TEST__createCubeHost().host);
    [false, true].forEach((widenTypes) => {
      const concat = new Concat('concat101', widenTypes);
      const draft = CUBE_NODE_DRAFT_FACTORIES.get(Concat.TYPE)?.(concat, state);
      expect(draft).toBeInstanceOf(CubeConcatDraft);
      expect((draft as CubeConcatDraft).original).toBe(concat);
      expect((draft as CubeConcatDraft).widenTypes).toBe(widenTypes);
    });
  });

  test('Gives a Difference a draft of its join columns and difference columns (PLAN §11.7)', () => {
    const state = new CubeEditorState(TEST__createCubeHost().host);
    const difference = new Difference('difference101', {
      leftColumns: ['ORDER_ID'],
      rightColumns: ['ORDER_ID'],
      differenceColumns: ['FREIGHT'],
    });
    const draft = CUBE_NODE_DRAFT_FACTORIES.get(Difference.TYPE)?.(
      difference,
      state,
    );
    expect(draft).toBeInstanceOf(CubeDifferenceDraft);
    const differenceDraft = draft as CubeDifferenceDraft;
    expect(differenceDraft.original).toBe(difference);
    expect(differenceDraft.differenceColumns).toEqual(['FREIGHT']);
    expect(differenceDraft.build()).toBe(difference);
  });

  test('Gives a Partition a draft of its partition columns, sort keys and window functions (PLAN §11.6)', () => {
    const state = new CubeEditorState(TEST__createCubeHost().host);
    const partition = new Partition(
      'partition101',
      ['SHIP_COUNTRY'],
      [{ column: 'ORDER_DATE', direction: SortDirection.DESC }],
      [{ column: undefined, function: WindowRankFunction.RANK, name: 'Rank' }],
    );
    const draft = CUBE_NODE_DRAFT_FACTORIES.get(Partition.TYPE)?.(
      partition,
      state,
    );
    expect(draft).toBeInstanceOf(CubePartitionDraft);
    const partitionDraft = draft as CubePartitionDraft;
    expect(partitionDraft.original).toBe(partition);
    expect(partitionDraft.columns).toEqual(['SHIP_COUNTRY']);
    expect(partitionDraft.sorts).toEqual(partition.sorts);
    expect(partitionDraft.aggregations).toEqual(partition.aggregations);
    expect(partitionDraft.build()).toBe(partition);
  });

  test('Has a draft only for types with an editor, and help for Unknown nodes', () => {
    [...CUBE_NODE_DRAFT_FACTORIES.keys()].forEach((type) =>
      expect(CUBE_NODE_EDITORS.has(type)).toBe(true),
    );
    expect(CUBE_NODE_HELP_TEXT[UnknownNode.TYPE]).toBe(
      'Source or transformation unknown to the application.',
    );
  });
});
