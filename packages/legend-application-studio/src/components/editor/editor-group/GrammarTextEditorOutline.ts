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

import { PARSER_SECTION_MARKER } from '@finos/legend-graph';

export type GrammarElementDeclaration = {
  /**
   * The element keyword as written, e.g. `Class`, `Enum`, `function`, `Mapping`
   */
  keyword: string;
  path: string;
  /**
   * 1-based, inclusive
   */
  startLine: number;
  /**
   * 1-based, inclusive; trailing blank lines are not part of the element
   */
  endLine: number;
};

/**
 * A declaration starts at column 0 with a keyword, then optional stereotypes (`<<...>>`)
 * and tagged values (`{...}`, whose quoted values may contain braces), then the element's
 * package-qualified path.
 */
const ELEMENT_DECLARATION_PATTERN =
  /^(?!import\s)(?<keyword>[A-Za-z]\w*)\s+(?:<<[^>]*>>\s*)?(?:\{(?:'(?:\\.|[^'\\])*'|[^}'])*\}\s*)?(?<path>(?:[A-Za-z_$][\w$]*::)+[A-Za-z_$][\w$]*)/u;

/**
 * Finds the packageable elements declared in grammar text, so text mode can show an outline.
 * Each element runs until the next declaration or section marker (`###...`).
 *
 * NOTE: this scans the text rather than using the source information from the last
 * compilation, so the outline stays right while the text is being edited.
 */
export const getGrammarElementDeclarations = (
  lines: string[],
): GrammarElementDeclaration[] => {
  const boundaries: { line: number; keyword?: string; path?: string }[] = [];
  lines.forEach((line, idx) => {
    if (line.startsWith(PARSER_SECTION_MARKER)) {
      boundaries.push({ line: idx + 1 });
      return;
    }
    const match = line.match(ELEMENT_DECLARATION_PATTERN);
    if (match?.groups?.keyword && match.groups.path) {
      boundaries.push({
        line: idx + 1,
        keyword: match.groups.keyword,
        path: match.groups.path,
      });
    }
  });
  const declarations: GrammarElementDeclaration[] = [];
  boundaries.forEach((boundary, idx) => {
    if (!boundary.keyword || !boundary.path) {
      return;
    }
    let endLine = (boundaries[idx + 1]?.line ?? lines.length + 1) - 1;
    while (endLine > boundary.line && !lines[endLine - 1]?.trim()) {
      endLine--;
    }
    declarations.push({
      keyword: boundary.keyword,
      path: boundary.path,
      startLine: boundary.line,
      endLine,
    });
  });
  return declarations;
};
