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
  isJsonObject,
  type JsonObject,
  type JsonValue,
} from '@finos/legend-cube';
import {
  type CubeCodePosition,
  type CubeCodeRange,
  CUBE_OPERATORS,
  CubeExpressionOutline,
  CubeOperatorKind,
  CubeOutlinePart,
  CubeOutlinePartKind,
  getCubeCodeOffset,
  getCubeCodeText,
  getCubePositionAfter,
} from '../../../CubeExpressionOutline.js';

// An expression of one row as the engine parses it (grammar to JSON, its
// source information returned), read into its outline: the engine places
// an operator at its symbol and a call at its name, so a call's parentheses
// are found in the code; an expression without source information, as a
// column stores it, is read without places.

/** A literal's Pure type, by the protocol's `_type` */
const LITERAL_TYPES: Readonly<Record<string, string>> = {
  string: 'String',
  integer: 'Integer',
  float: 'Float',
  decimal: 'Decimal',
  boolean: 'Boolean',
  strictDate: 'StrictDate',
  dateTime: 'DateTime',
  strictTime: 'StrictTime',
  latestDate: 'Date',
};

const objectsOf = (json: JsonObject, key: string): JsonObject[] => {
  const value = json[key];
  return Array.isArray(value) ? value.filter(isJsonObject) : [];
};

const rangeOf = (json: JsonObject): CubeCodeRange | undefined => {
  const info = json.sourceInformation;
  if (!isJsonObject(info)) {
    return undefined;
  }
  const { startLine, startColumn, endLine, endColumn } = info;
  return typeof startLine === 'number' &&
    typeof startColumn === 'number' &&
    typeof endLine === 'number' &&
    typeof endColumn === 'number'
    ? { startLine, startColumn, endLine, endColumn }
    : undefined;
};

const before = (first: CubeCodePosition, second: CubeCodePosition): boolean =>
  first.line < second.line ||
  (first.line === second.line && first.column < second.column);

/** The smallest range holding them all; none when one isn't placed */
const unionOf = (
  ranges: readonly (CubeCodeRange | undefined)[],
): CubeCodeRange | undefined => {
  if (!ranges.length || ranges.some((range) => range === undefined)) {
    return undefined;
  }
  return (ranges as CubeCodeRange[]).reduce((union, range) => {
    const start = before(
      { line: range.startLine, column: range.startColumn },
      { line: union.startLine, column: union.startColumn },
    )
      ? range
      : union;
    const end = before(
      { line: union.endLine, column: union.endColumn },
      { line: range.endLine, column: range.endColumn },
    )
      ? range
      : union;
    return {
      startLine: start.startLine,
      startColumn: start.startColumn,
      endLine: end.endLine,
      endColumn: end.endColumn,
    };
  });
};

/** The position of an offset in the code */
const positionOfOffset = (code: string, offset: number): CubeCodePosition => {
  const lines = code.slice(0, offset).split('\n');
  return {
    line: lines.length,
    column: (lines.at(-1)?.length ?? 0) + 1,
  };
};

/** The range of the parentheses opening right after a position, strings skipped; none when no `(` opens there */
const parenthesesAfter = (
  code: string,
  position: CubeCodePosition,
): CubeCodeRange | undefined => {
  let offset = getCubeCodeOffset(code, position);
  while (/\s/u.test(code.charAt(offset))) {
    offset += 1;
  }
  if (code.charAt(offset) !== '(') {
    return undefined;
  }
  const open = offset;
  let depth = 0;
  for (; offset < code.length; offset++) {
    const char = code.charAt(offset);
    if (char === "'") {
      // to the string's end
      for (offset += 1; offset < code.length; offset++) {
        if (code.charAt(offset) === '\\') {
          offset += 1;
        } else if (code.charAt(offset) === "'") {
          break;
        }
      }
    } else if (char === '(') {
      depth += 1;
    } else if (char === ')') {
      depth -= 1;
      if (!depth) {
        const start = positionOfOffset(code, open);
        const end = positionOfOffset(code, offset);
        return {
          startLine: start.line,
          startColumn: start.column,
          endLine: end.line,
          endColumn: end.column,
        };
      }
    }
  }
  return undefined;
};

/** A literal's value as code writes it, for an expression without places */
const writeValue = (type: string, value: JsonValue | undefined): string =>
  type === 'string'
    ? `'${String(value).replace(/['\\]/gu, '\\$&')}'`
    : type === 'strictDate' || type === 'dateTime' || type === 'strictTime'
      ? `%${String(value)}`
      : String(value);

class V1_CubeExpressionOutlineReader {
  private readonly code: string;
  private readonly parameter: string;

  constructor(code: string, parameter: string) {
    this.code = code;
    this.parameter = parameter;
  }

  private textOf(range: CubeCodeRange | undefined): string | undefined {
    return range ? getCubeCodeText(this.code, range) : undefined;
  }

  read(json: JsonObject): CubeOutlinePart {
    const type = typeof json._type === 'string' ? json._type : '';
    const range = rangeOf(json);
    const literal = LITERAL_TYPES[type];
    if (literal) {
      return new CubeOutlinePart(
        CubeOutlinePartKind.VALUE,
        this.textOf(range) ?? writeValue(type, json.value),
        [],
        { valueType: literal, extent: range },
      );
    }
    switch (type) {
      case 'func':
        return this.readFunction(json, range);
      case 'property': {
        const [receiver] = objectsOf(json, 'parameters');
        const name = typeof json.property === 'string' ? json.property : '';
        if (receiver?._type === 'var' && receiver.name === this.parameter) {
          return new CubeOutlinePart(CubeOutlinePartKind.COLUMN, name, [], {
            extent: unionOf([rangeOf(receiver), range]),
          });
        }
        const parts = receiver ? [this.read(receiver)] : [];
        return new CubeOutlinePart(
          CubeOutlinePartKind.OTHER,
          `.${name}`,
          parts,
          {
            extent: unionOf([range, ...parts.map((part) => part.extent)]),
          },
        );
      }
      case 'collection': {
        const parts = objectsOf(json, 'values').map((value) =>
          this.read(value),
        );
        return new CubeOutlinePart(CubeOutlinePartKind.LIST, '[…]', parts, {
          extent: unionOf([range, ...parts.map((part) => part.extent)]),
        });
      }
      case 'lambda': {
        const parts = objectsOf(json, 'body').map((each) => this.read(each));
        return new CubeOutlinePart(CubeOutlinePartKind.LAMBDA, '|…', parts, {
          extent: unionOf([range, ...parts.map((part) => part.extent)]),
        });
      }
      case 'genericTypeInstance':
        return new CubeOutlinePart(
          CubeOutlinePartKind.TYPE,
          this.textOf(range) ?? '@…',
          [],
          { extent: range },
        );
      case 'var':
        return new CubeOutlinePart(
          CubeOutlinePartKind.OTHER,
          `$${typeof json.name === 'string' ? json.name : ''}`,
          [],
          { extent: range },
        );
      default:
        return new CubeOutlinePart(
          CubeOutlinePartKind.OTHER,
          this.textOf(range) ?? type,
          [],
          { extent: range },
        );
    }
  }

  private readFunction(
    json: JsonObject,
    range: CubeCodeRange | undefined,
  ): CubeOutlinePart {
    const name = typeof json.function === 'string' ? json.function : '';
    const parameters = objectsOf(json, 'parameters');
    const operator = CUBE_OPERATORS[name];
    // where it is placed, an operator's symbol, not a name; with no place, its name tells
    const isOperator =
      operator !== undefined &&
      (range
        ? !/[A-Za-z_]/u.test(
            this.code.charAt(
              getCubeCodeOffset(this.code, {
                line: range.startLine,
                column: range.startColumn,
              }),
            ),
          )
        : true);
    if (isOperator) {
      const operatorAt = range
        ? { line: range.startLine, column: range.startColumn }
        : undefined;
      let functionName = name;
      let operands = parameters;
      const [first] = parameters;
      // `a != b` is `not(equal(a, b))`, both at `!=`
      if (
        name === 'not' &&
        first?.function === 'equal' &&
        range &&
        rangeOf(first)?.startLine === range.startLine &&
        rangeOf(first)?.startColumn === range.startColumn
      ) {
        functionName = 'notEqual';
        operands = objectsOf(first, 'parameters');
      } else if (
        operator.kind === CubeOperatorKind.ARITHMETIC &&
        parameters.length === 1 &&
        first?._type === 'collection'
      ) {
        // `a + b` is `plus([a, b])`
        operands = objectsOf(first, 'values');
      }
      const parts = operands.map((each) => this.read(each));
      return new CubeOutlinePart(
        CubeOutlinePartKind.OPERATOR,
        CUBE_OPERATORS[functionName]?.symbol ?? name,
        parts,
        {
          functionName,
          operatorAt,
          extent: unionOf([range, ...parts.map((part) => part.extent)]),
        },
      );
    }
    const parts = parameters.map((each) => this.read(each));
    const parentheses = range
      ? parenthesesAfter(this.code, getCubePositionAfter(range))
      : undefined;
    const nameStart = range
      ? getCubeCodeOffset(this.code, {
          line: range.startLine,
          column: range.startColumn,
        })
      : undefined;
    return new CubeOutlinePart(CubeOutlinePartKind.CALL, name, parts, {
      functionName: name,
      isArrow:
        nameStart !== undefined &&
        /->\s*$/u.test(this.code.slice(0, nameStart)),
      extent: unionOf([
        range,
        ...parts.map((part) => part.extent),
        ...(parentheses ? [parentheses] : []),
      ]),
    });
  }
}

/**
 * The outline of an expression of one row, `x | …`, from the engine's JSON
 * of its code: placed in the code when the JSON has its source
 * information; none for anything but a lambda of one parameter and one
 * expression
 */
export const V1_buildCubeExpressionOutline = (
  json: JsonObject,
  code: string,
): CubeExpressionOutline | undefined => {
  const [parameter] = objectsOf(json, 'parameters');
  const body = objectsOf(json, 'body');
  const [expression] = body;
  if (
    json._type !== 'lambda' ||
    body.length !== 1 ||
    !expression ||
    typeof parameter?.name !== 'string'
  ) {
    return undefined;
  }
  return new CubeExpressionOutline(
    parameter.name,
    new V1_CubeExpressionOutlineReader(code, parameter.name).read(expression),
    code,
  );
};
