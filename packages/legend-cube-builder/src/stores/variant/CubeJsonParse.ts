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

import { Extend } from '@finos/legend-cube';
import type { CubeEditorState } from '../CubeEditorState.js';
import { columnAccessOf } from '../CubePureText.js';
import { readCubeJson } from './CubeJson.js';
import { getFreeCubeColumnName } from './CubeJsonOffers.js';

// Parse as JSON (PLAN §11.20): a text column holding JSON documents read as a
// Variant column, `fromJson()`, so Explore JSON and Explode Array work on it.
// JSON stored as text is common, and it is the only way to a Variant column on
// a local source: H2 has none, and a direct connection hides a JSON column.

/** The column a text column's documents become: `<name>_json` */
export const getCubeJsonParseName = (column: string): string =>
  `${column}_json`;

/** The Extend column's text: the text read as a document (`fromJson` takes one value) */
export const getCubeJsonParseCode = (column: string): string =>
  `x | ${columnAccessOf(column)}->toOne()->fromJson()`;

/** Whether a text cell holds a JSON object or array, which Parse as JSON is offered on */
export const isCubeJsonDocumentText = (text: string): boolean => {
  const node = readCubeJson(text);
  return node?.kind === 'object' || node?.kind === 'array';
};

/**
 * Adds Parse as JSON's column after the node that ran, as one undo step, once
 * the engine parses its text; nothing if the cube changed meanwhile
 */
export const addCubeJsonParseColumn = async (
  editorState: CubeEditorState,
  column: string,
): Promise<void> => {
  const { document } = editorState;
  const { query } = document;
  const afterId = query.selected;
  if (afterId === undefined) {
    return;
  }
  const extendId = query.generateId(Extend.TYPE);
  const code = getCubeJsonParseCode(column);
  const name = getFreeCubeColumnName(
    getCubeJsonParseName(column),
    (editorState.analysis.schemas.get(afterId)?.columns ?? []).map(
      ({ name: taken }) => taken,
    ),
  );
  const { lambda } = await editorState.host.engine.parseExpression(
    code,
    `${extendId}:0`,
  );
  // as the menu found it: nothing changed while the engine parsed
  if (editorState.document === document) {
    editorState.addConfiguredNode(
      new Extend(extendId, [{ name, code, lambda }]),
      afterId,
    );
  }
};
