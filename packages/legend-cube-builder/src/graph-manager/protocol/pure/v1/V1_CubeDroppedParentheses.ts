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
  type CubeCodeEdit,
  type CubeCodePosition,
  type CubeExpressionOutline,
  type CubeOutlinePart,
  CubeOperatorKind,
  getCubeCodeOffset,
  getCubePositionAfter,
  getCubePositionOf,
} from '../../../CubeExpressionOutline.js';

// The parentheses the engine's text writer drops (EXPRESSION-EDITOR.md, §7):
// it writes a comparison's operands bare, which Pure reads otherwise where
// an operand is an operator's (measured against the engine, 2026-11-09):
// - before `==`: `(a + 1) == 3` is written `a + 1 == 3`, read `a + (1 == 3)`;
//   so with `*`, `>`, `==`, `&&`, `||`, `!` and `-` before it;
// - `&&` or `||` after `==`: `f == (a && b)` is written `f == a && b`, read
//   `(f == a) && b`;
// - a comparison after another: `a >= (b > 1)` is written `a >= b > 1`, read
//   `(a >= b) > 1`.
// The operands of `&&`, `||`, `!`, `!=` and arithmetic it writes in
// parentheses. Each shape is found in how the text parses, and put in
// parentheses again, unless the text has them there.

/** How many `(` there are just before the position, spaces skipped */
const opensBefore = (code: string, at: CubeCodePosition): number => {
  let count = 0;
  for (let offset = getCubeCodeOffset(code, at) - 1; offset >= 0; offset--) {
    const character = code.charAt(offset);
    if (character === '(') {
      count++;
    } else if (!/\s/u.test(character)) {
      break;
    }
  }
  return count;
};

/** How many `)` there are from the position on, spaces skipped */
const closesFrom = (code: string, at: CubeCodePosition): number => {
  let count = 0;
  for (
    let offset = getCubeCodeOffset(code, at);
    offset < code.length;
    offset++
  ) {
    const character = code.charAt(offset);
    if (character === ')') {
      count++;
    } else if (!/\s/u.test(character)) {
      break;
    }
  }
  return count;
};

/** `==`, `>`, `<`, `>=` or `<=`; not `!=`, whose operands the writer puts in parentheses */
const isComparison = (part: CubeOutlinePart | undefined): boolean =>
  part !== undefined &&
  part.functionName !== 'notEqual' &&
  part.isBinary(CubeOperatorKind.COMPARISON);

/**
 * `a + 1 == 3`, read `a + (1 == 3)`: an operator whose last operand is an
 * `==` not in parentheses of its own; `(a + 1) == 3` was written
 */
const beforeEqual = (code: string, part: CubeOutlinePart): CubeCodeEdit[] => {
  const last = part.parts[part.parts.length - 1];
  const compared =
    last?.functionName === 'equal' && isComparison(last)
      ? last.parts[0]
      : undefined;
  if (!part.operatorKind || !part.extent || !compared?.extent) {
    return [];
  }
  const end = getCubePositionAfter(compared.extent);
  // `a + (1 == 3)`: a parenthesis opened before `1` closes after `3`
  if (
    opensBefore(code, getCubePositionOf(compared.extent)) >
    closesFrom(code, end)
  ) {
    return [];
  }
  return [
    { at: getCubePositionOf(part.extent), text: '(' },
    { at: end, text: ')' },
  ];
};

/**
 * `f == a && b`, read `(f == a) && b`, and `a >= b > 1`, read
 * `(a >= b) > 1`: `&&`, `||` or a comparison but `==`, whose first operand is
 * a comparison not in parentheses of its own; `f == (a && b)` and
 * `a >= (b > 1)` were written
 */
const afterComparison = (
  code: string,
  part: CubeOutlinePart,
): CubeCodeEdit[] => {
  const [first] = part.parts;
  const against = isComparison(first) ? first?.parts[1] : undefined;
  if (
    !(
      part.isBinary(CubeOperatorKind.LOGIC) ||
      (isComparison(part) && part.functionName !== 'equal')
    ) ||
    !part.extent ||
    !against?.extent
  ) {
    return [];
  }
  const start = getCubePositionOf(against.extent);
  // `(f == a) && b`: a parenthesis closed after `a` opened before `f`
  if (
    closesFrom(code, getCubePositionAfter(against.extent)) >
    opensBefore(code, start)
  ) {
    return [];
  }
  return [
    { at: start, text: '(' },
    { at: getCubePositionAfter(part.extent), text: ')' },
  ];
};

/**
 * The edits that put back the parentheses the engine's text writer dropped,
 * found in how the text parses; none where it dropped none. A chain of them,
 * `a == 1 == true == false`, isn't put right: the text, parsed again, tells.
 */
export const V1_getCubeDroppedParenthesesEdits = (
  outline: CubeExpressionOutline,
): CubeCodeEdit[] => {
  const edits: CubeCodeEdit[] = [];
  const visit = (part: CubeOutlinePart): void => {
    edits.push(
      ...beforeEqual(outline.code, part),
      ...afterComparison(outline.code, part),
    );
    part.parts.forEach(visit);
  };
  visit(outline.root);
  // at one position, a closing parenthesis before an opening one
  return edits.sort(
    (first, second) =>
      first.at.line - second.at.line ||
      first.at.column - second.at.column ||
      (first.text === ')' ? -1 : 0) - (second.text === ')' ? -1 : 0),
  );
};
