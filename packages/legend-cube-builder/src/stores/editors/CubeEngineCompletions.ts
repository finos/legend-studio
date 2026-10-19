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

import { type IR, QueryEmitter } from '@finos/legend-cube';
import type {
  CubeCodeCompletion,
  NodeId,
} from '../../graph-manager/CubeEngine.js';
import type { CubeEditorState } from '../CubeEditorState.js';
import { pureStringLiteral } from '../CubePureText.js';

// The engine's completions of a node's Pure code (user, 2026-10-16), which
// the engine reads as the code written after the node's input: its
// relation, then e.g. `->filter(` and the code typed so far.

const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/u;

/** A new column's name as a column spec writes it: `~NAME`, or `~'a name'` */
export const colSpecOf = (name: string): string =>
  `~${IDENTIFIER.test(name) ? name : pureStringLiteral(name)}`;

/**
 * The engine's completions of code written after the node's input:
 * undefined when the engine completes no code, none when the cube has no
 * model yet or its input can't be written
 */
export const getCubeEngineCompletions = async (
  editorState: CubeEditorState,
  nodeId: NodeId,
  text: string,
): Promise<readonly CubeCodeCompletion[] | undefined> => {
  const { context, query } = editorState.document;
  const [inputId] = query.getInputIds(nodeId);
  if (!context || inputId === undefined) {
    return [];
  }
  let relation: IR;
  try {
    relation = new QueryEmitter(query, editorState.registry).emitRelation(
      inputId,
    );
  } catch {
    // an input not complete yet
    return [];
  }
  return editorState.host.engine.completeCode(context.model, relation, text);
};
