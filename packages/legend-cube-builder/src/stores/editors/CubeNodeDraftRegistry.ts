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

import {
  Distinct,
  Drop,
  Filter,
  Group,
  Join,
  Limit,
  type QueryNode,
  Rename,
  Restrict,
  Slice,
  Sort,
} from '@finos/legend-cube';
import { guaranteeType } from '@finos/legend-shared';
import type { CubeEditorState } from '../CubeEditorState.js';
import { CubeFilterDraft } from './CubeFilterDraft.js';
import { CubeGroupDraft } from './CubeGroupDraft.js';
import { CubeJoinDraft } from './CubeJoinDraft.js';
import { type CubeNodeDraft, CubeReadOnlyNodeDraft } from './CubeNodeDraft.js';
import { CubeRenameDraft } from './CubeRenameDraft.js';
import { CubeRestrictDraft } from './CubeRestrictDraft.js';
import { CubeRowCountDraft } from './CubeRowCountDraft.js';
import { CubeSliceDraft } from './CubeSliceDraft.js';
import { CubeSortDraft } from './CubeSortDraft.js';

/** Makes the draft of a node of one type */
export type CubeNodeDraftFactory = (
  node: QueryNode,
  editorState: CubeEditorState,
) => CubeNodeDraft;

/**
 * The draft of each node type the panel edits, by type (PLAN §7.4). A
 * transform with an editor in `CUBE_NODE_EDITORS` has its factory here; a
 * source, which has nothing to edit, has none, and so no Apply or Cancel.
 */
export const CUBE_NODE_DRAFT_FACTORIES: ReadonlyMap<
  string,
  CubeNodeDraftFactory
> = new Map<string, CubeNodeDraftFactory>([
  [Sort.TYPE, (node) => new CubeSortDraft(guaranteeType(node, Sort))],
  [Group.TYPE, (node) => new CubeGroupDraft(guaranteeType(node, Group))],
  [Filter.TYPE, (node) => new CubeFilterDraft(guaranteeType(node, Filter))],
  [
    Restrict.TYPE,
    (node) => new CubeRestrictDraft(guaranteeType(node, Restrict)),
  ],
  [Rename.TYPE, (node) => new CubeRenameDraft(guaranteeType(node, Rename))],
  [Join.TYPE, (node) => new CubeJoinDraft(guaranteeType(node, Join))],
  [Drop.TYPE, (node) => new CubeRowCountDraft(guaranteeType(node, Drop))],
  [Limit.TYPE, (node) => new CubeRowCountDraft(guaranteeType(node, Limit))],
  [Slice.TYPE, (node) => new CubeSliceDraft(guaranteeType(node, Slice))],
]);

/**
 * The transforms with nothing to set (spec §17.6: Distinct is "description
 * only"): an editor in `CUBE_NODE_EDITORS` and no draft factory, so the panel
 * shows no Apply or Cancel (PLAN §7.4 item 2)
 */
export const CUBE_NODE_TYPES_WITHOUT_SETTINGS: readonly string[] = [
  Distinct.TYPE,
];

/** The node's draft; a node with nothing to edit gets a read-only one */
export const createCubeNodeDraft = (
  node: QueryNode,
  editorState: CubeEditorState,
): CubeNodeDraft =>
  CUBE_NODE_DRAFT_FACTORIES.get(node.type)?.(node, editorState) ??
  new CubeReadOnlyNodeDraft(node);
