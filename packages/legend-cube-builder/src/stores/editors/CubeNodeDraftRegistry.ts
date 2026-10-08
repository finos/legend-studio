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

import { Join, type QueryNode } from '@finos/legend-cube';
import { guaranteeType } from '@finos/legend-shared';
import type { CubeEditorState } from '../CubeEditorState.js';
import { CubeJoinDraft } from './CubeJoinDraft.js';
import { type CubeNodeDraft, CubeReadOnlyNodeDraft } from './CubeNodeDraft.js';

/** Makes the draft of a node of one type */
export type CubeNodeDraftFactory = (
  node: QueryNode,
  editorState: CubeEditorState,
) => CubeNodeDraft;

/**
 * The draft of each node type the panel edits, by type (PLAN §7.4). A type
 * with an editor in `CUBE_NODE_EDITORS` has its factory here.
 */
export const CUBE_NODE_DRAFT_FACTORIES: ReadonlyMap<
  string,
  CubeNodeDraftFactory
> = new Map<string, CubeNodeDraftFactory>([
  [Join.TYPE, (node) => new CubeJoinDraft(guaranteeType(node, Join))],
]);

/** The node's draft; a node with nothing to edit gets a read-only one */
export const createCubeNodeDraft = (
  node: QueryNode,
  editorState: CubeEditorState,
): CubeNodeDraft =>
  CUBE_NODE_DRAFT_FACTORIES.get(node.type)?.(node, editorState) ??
  new CubeReadOnlyNodeDraft(node);
