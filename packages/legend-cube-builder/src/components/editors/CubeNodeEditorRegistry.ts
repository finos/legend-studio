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
  Filter,
  Join,
  RelationalTableSource,
  type Schema,
} from '@finos/legend-cube';
import type { CubeEditorState } from '../../stores/CubeEditorState.js';
import type { CubeNodeDraft } from '../../stores/editors/CubeNodeDraft.js';
import { CubeFilterEditor } from './CubeFilterEditor.js';
import { CubeJoinEditor } from './CubeJoinEditor.js';
import { CubeSourceEditor } from './CubeSourceEditor.js';

/**
 * What the panel gives a node type's editor (PLAN §7.4). Edits go to the
 * draft, which the panel's Apply stores; an action on the document goes
 * through `editorState.nodeEditor` (e.g. `swapInputs`), which applies the
 * draft first, so the panel never loses its edits under a replaced node.
 */
export interface CubeNodeEditorProps {
  readonly editorState: CubeEditorState;
  /** The node's draft, made by its type's factory in `CUBE_NODE_DRAFT_FACTORIES` */
  readonly draft: CubeNodeDraft;
  /**
   * The schemas of the node's inputs, in port order, e.g. a Join's Left then
   * Right. All are there: the panel shows the upstream error instead of the
   * editor while an input is missing or invalid.
   */
  readonly inputSchemas: readonly Schema[];
  /** The cube was saved by a newer version: show, don't edit */
  readonly readOnly: boolean;
}

/**
 * The editor of each node type, by type. A type without one shows its
 * description; a type with one either has a draft factory in
 * `CUBE_NODE_DRAFT_FACTORIES` or edits nothing (a source).
 */
export const CUBE_NODE_EDITORS: ReadonlyMap<
  string,
  React.FC<CubeNodeEditorProps>
> = new Map<string, React.FC<CubeNodeEditorProps>>([
  [RelationalTableSource.TYPE, CubeSourceEditor],
  [Filter.TYPE, CubeFilterEditor],
  [Join.TYPE, CubeJoinEditor],
]);
