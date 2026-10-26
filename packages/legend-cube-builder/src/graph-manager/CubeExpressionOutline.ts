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

import { type CubeType, PrimitiveType, TypeFamily } from '@finos/legend-cube';
import {
  type CubeFunctionCatalogue,
  type CubeFunctionSignature,
  acceptsCubeFamily,
} from './CubeFunctionCatalogue.js';

// An expression's outline (EXPRESSION-EDITOR.md, round 2): the parts of a
// Pure expression of one row, as the engine parsed it, each where it is in
// the code. It shows how Pure reads the code, which its flat precedence can
// make other than what was meant (`$x.A + 1 == 3` adds `1 == 3`); it finds
// those shapes, and a value that can be empty where one is needed, each
// with the edits that fix it.

/** A place in an expression's code: lines and columns from 1, its end column included, as the engine gives them */
export interface CubeCodeRange {
  readonly startLine: number;
  readonly startColumn: number;
  readonly endLine: number;
  readonly endColumn: number;
}

/** A position in the code: lines and columns from 1 */
export interface CubeCodePosition {
  readonly line: number;
  readonly column: number;
}

/** Text written before a position in the code */
export interface CubeCodeEdit {
  readonly at: CubeCodePosition;
  readonly text: string;
}

export enum CubeOutlinePartKind {
  /** `$x.NAME`: a column of the row */
  COLUMN = 'column',
  /** A literal: text, a number, a date, a Boolean */
  VALUE = 'value',
  /** A function called by name: `name(…)` or `value->name(…)` */
  CALL = 'call',
  /** An operator: `+`, `==`, `&&`, `!`… */
  OPERATOR = 'operator',
  /** `[…]` */
  LIST = 'list',
  /** `|…`, as `if` takes */
  LAMBDA = 'lambda',
  /** `@Type`, as `to` and `cast` take */
  TYPE = 'type',
  OTHER = 'other',
}

export enum CubeOperatorKind {
  ARITHMETIC = 'arithmetic',
  COMPARISON = 'comparison',
  LOGIC = 'logic',
}

/** Pure's operators, by the function the engine parses each to */
export const CUBE_OPERATORS: Readonly<
  Record<string, { readonly symbol: string; readonly kind: CubeOperatorKind }>
> = {
  plus: { symbol: '+', kind: CubeOperatorKind.ARITHMETIC },
  minus: { symbol: '-', kind: CubeOperatorKind.ARITHMETIC },
  times: { symbol: '*', kind: CubeOperatorKind.ARITHMETIC },
  divide: { symbol: '/', kind: CubeOperatorKind.ARITHMETIC },
  equal: { symbol: '==', kind: CubeOperatorKind.COMPARISON },
  notEqual: { symbol: '!=', kind: CubeOperatorKind.COMPARISON },
  greaterThan: { symbol: '>', kind: CubeOperatorKind.COMPARISON },
  lessThan: { symbol: '<', kind: CubeOperatorKind.COMPARISON },
  greaterThanEqual: { symbol: '>=', kind: CubeOperatorKind.COMPARISON },
  lessThanEqual: { symbol: '<=', kind: CubeOperatorKind.COMPARISON },
  and: { symbol: '&&', kind: CubeOperatorKind.LOGIC },
  or: { symbol: '||', kind: CubeOperatorKind.LOGIC },
  not: { symbol: '!', kind: CubeOperatorKind.LOGIC },
};

/** A part of an expression */
export class CubeOutlinePart {
  readonly kind: CubeOutlinePartKind;
  /** As the outline writes it: a column's name, a value as written, a function's name, an operator's symbol */
  readonly label: string;
  /** A call's or an operator's function, e.g. `plus` for `+`, `notEqual` for `!=` */
  readonly functionName: string | undefined;
  /** A value's Pure type, e.g. `Integer` */
  readonly valueType: string | undefined;
  /** Its operands, a call's arguments (the value before `->` first), a list's values */
  readonly parts: readonly CubeOutlinePart[];
  /** All of it in the code, its operands and a call's parentheses included; none when the code wasn't located */
  readonly extent: CubeCodeRange | undefined;
  /** Where its operator is in the code */
  readonly operatorAt: CubeCodePosition | undefined;
  /** A call written after its first argument, `value->name(…)` */
  readonly isArrow: boolean;

  constructor(
    kind: CubeOutlinePartKind,
    label: string,
    parts: readonly CubeOutlinePart[],
    options?: {
      functionName?: string | undefined;
      valueType?: string | undefined;
      extent?: CubeCodeRange | undefined;
      operatorAt?: CubeCodePosition | undefined;
      isArrow?: boolean | undefined;
    },
  ) {
    this.kind = kind;
    this.label = label;
    this.parts = parts;
    this.functionName = options?.functionName;
    this.valueType = options?.valueType;
    this.extent = options?.extent;
    this.operatorAt = options?.operatorAt;
    this.isArrow = options?.isArrow ?? false;
  }

  /** An operator's kind, for an operator */
  get operatorKind(): CubeOperatorKind | undefined {
    return this.kind === CubeOutlinePartKind.OPERATOR && this.functionName
      ? CUBE_OPERATORS[this.functionName]?.kind
      : undefined;
  }

  /** An operator between two operands, of the kind */
  isBinary(kind: CubeOperatorKind): boolean {
    return this.operatorKind === kind && this.parts.length === 2;
  }
}

/** An expression of one row, `x | …`, in parts */
export class CubeExpressionOutline {
  /** The row's name, `x` in `x | …` */
  readonly parameter: string;
  readonly root: CubeOutlinePart;
  /** The code it was read from */
  readonly code: string;

  constructor(parameter: string, root: CubeOutlinePart, code: string) {
    this.parameter = parameter;
    this.root = root;
    this.code = code;
  }

  /** Its parts were placed in the code: they can be shown there and edited */
  get isLocated(): boolean {
    return this.root.extent !== undefined;
  }

  /** The code of a part, on one line */
  textOf(part: CubeOutlinePart): string {
    return part.extent
      ? getCubeCodeText(this.code, part.extent).replace(/\s+/gu, ' ')
      : part.label;
  }
}

// ---------- the code, by line and column ----------

/** The offset in the code of a position, its column past its line's end kept on that line */
export const getCubeCodeOffset = (
  code: string,
  position: CubeCodePosition,
): number => {
  const lines = code.split('\n');
  let offset = 0;
  for (let index = 0; index < position.line - 1; index++) {
    offset += (lines[index]?.length ?? 0) + 1;
  }
  return offset + position.column - 1;
};

/** The code in a range, its end column included */
export const getCubeCodeText = (code: string, range: CubeCodeRange): string =>
  code.slice(
    getCubeCodeOffset(code, {
      line: range.startLine,
      column: range.startColumn,
    }),
    getCubeCodeOffset(code, { line: range.endLine, column: range.endColumn }) +
      1,
  );

/** The position just after a range's end */
export const getCubePositionAfter = (
  range: CubeCodeRange,
): CubeCodePosition => ({ line: range.endLine, column: range.endColumn + 1 });

/** The position of a range's start */
export const getCubePositionOf = (range: CubeCodeRange): CubeCodePosition => ({
  line: range.startLine,
  column: range.startColumn,
});

const comparePositions = (
  first: CubeCodePosition,
  second: CubeCodePosition,
): number => first.line - second.line || first.column - second.column;

/** The code with the edits written, each at its position in the code as it was */
export const applyCubeCodeEdits = (
  code: string,
  edits: readonly CubeCodeEdit[],
): string =>
  [...edits]
    // from the end, so each position still holds; at one position, in order
    .map((edit, index) => ({ edit, index }))
    .sort(
      (first, second) =>
        comparePositions(second.edit.at, first.edit.at) ||
        second.index - first.index,
    )
    .reduce((text, { edit }) => {
      const offset = getCubeCodeOffset(text, edit.at);
      return `${text.slice(0, offset)}${edit.text}${text.slice(offset)}`;
    }, code);

/** The code between two positions, the first included, the second not */
const textBetween = (
  code: string,
  from: CubeCodePosition,
  to: CubeCodePosition,
): string =>
  code.slice(getCubeCodeOffset(code, from), getCubeCodeOffset(code, to));

// ---------- precedence traps ----------

export enum CubePrecedenceTrapKind {
  /** `$x.A + 1 == 3`: Pure adds `1 == 3` */
  ARITHMETIC_THEN_COMPARISON = 'ARITHMETIC_THEN_COMPARISON',
  /** `$x.A > 0 && $x.A < 30`: Pure compares `… && $x.A` with 30 */
  LOGIC_THEN_COMPARISON = 'LOGIC_THEN_COMPARISON',
  /** `!$x.A > 3`: Pure compares `!$x.A` with 3 */
  NOT_THEN_COMPARISON = 'NOT_THEN_COMPARISON',
}

/** A shape Pure's flat precedence gives code that was likely meant otherwise */
export interface CubePrecedenceTrap {
  readonly kind: CubePrecedenceTrapKind;
  /** The part read other than it was likely meant */
  readonly part: CubeOutlinePart;
  /** How Pure reads it, its parentheses written */
  readonly readAs: string;
  /** What was likely meant, its parentheses written */
  readonly meant: string;
  /** The parentheses that make it what was meant */
  readonly edits: readonly CubeCodeEdit[];
}

const symbolOf = (part: CubeOutlinePart): string =>
  (part.functionName ? CUBE_OPERATORS[part.functionName]?.symbol : undefined) ??
  part.label;

/** The position just after an operator's symbol */
const afterOperator = (part: CubeOutlinePart): CubeCodePosition | undefined =>
  part.operatorAt
    ? {
        line: part.operatorAt.line,
        column: part.operatorAt.column + symbolOf(part).length,
      }
    : undefined;

const trapOf = (
  outline: CubeExpressionOutline,
  part: CubeOutlinePart,
): CubePrecedenceTrap | undefined => {
  const { code } = outline;
  const text = (each: CubeOutlinePart): string => outline.textOf(each);
  const [left, right] = part.parts;
  if (!left?.extent || !right?.extent || !part.operatorAt) {
    return undefined;
  }
  // `A + B == C`, read `A + (B == C)`, unless the comparison was put in parentheses
  if (
    part.isBinary(CubeOperatorKind.ARITHMETIC) &&
    right.isBinary(CubeOperatorKind.COMPARISON)
  ) {
    const [compared, against] = right.parts;
    const after = afterOperator(part);
    if (
      !compared?.extent ||
      !against ||
      !after ||
      textBetween(code, after, getCubePositionOf(compared.extent)).includes('(')
    ) {
      return undefined;
    }
    return {
      kind: CubePrecedenceTrapKind.ARITHMETIC_THEN_COMPARISON,
      part,
      readAs: `${text(left)} ${symbolOf(part)} (${text(compared)} ${symbolOf(right)} ${text(against)})`,
      meant: `(${text(left)} ${symbolOf(part)} ${text(compared)}) ${symbolOf(right)} ${text(against)}`,
      edits: [
        { at: getCubePositionOf(left.extent), text: '(' },
        { at: getCubePositionAfter(compared.extent), text: ')' },
      ],
    };
  }
  if (!part.isBinary(CubeOperatorKind.COMPARISON)) {
    return undefined;
  }
  // `A && B < C`, read `(A && B) < C`, unless the logic was put in parentheses
  if (left.isBinary(CubeOperatorKind.LOGIC)) {
    const [first, last] = left.parts;
    if (
      !first ||
      !last?.extent ||
      textBetween(
        code,
        getCubePositionAfter(last.extent),
        part.operatorAt,
      ).includes(')')
    ) {
      return undefined;
    }
    return {
      kind: CubePrecedenceTrapKind.LOGIC_THEN_COMPARISON,
      part,
      readAs: `(${text(first)} ${symbolOf(left)} ${text(last)}) ${symbolOf(part)} ${text(right)}`,
      meant: `${text(first)} ${symbolOf(left)} (${text(last)} ${symbolOf(part)} ${text(right)})`,
      edits: [
        { at: getCubePositionOf(last.extent), text: '(' },
        { at: getCubePositionAfter(right.extent), text: ')' },
      ],
    };
  }
  // `!A > C`, read `(!A) > C`, unless the negation was put in parentheses
  if (left.functionName === 'not' && left.parts.length === 1) {
    const [negated] = left.parts;
    if (
      !negated?.extent ||
      textBetween(
        code,
        getCubePositionAfter(negated.extent),
        part.operatorAt,
      ).includes(')')
    ) {
      return undefined;
    }
    return {
      kind: CubePrecedenceTrapKind.NOT_THEN_COMPARISON,
      part,
      readAs: `(!${text(negated)}) ${symbolOf(part)} ${text(right)}`,
      meant: `!(${text(negated)} ${symbolOf(part)} ${text(right)})`,
      edits: [
        { at: getCubePositionOf(negated.extent), text: '(' },
        { at: getCubePositionAfter(right.extent), text: ')' },
      ],
    };
  }
  return undefined;
};

/** Every precedence trap in the expression, outermost first; none when it wasn't located */
export const findCubePrecedenceTraps = (
  outline: CubeExpressionOutline,
): CubePrecedenceTrap[] => {
  const traps: CubePrecedenceTrap[] = [];
  const visit = (part: CubeOutlinePart): void => {
    const trap = trapOf(outline, part);
    if (trap) {
      traps.push(trap);
    }
    part.parts.forEach(visit);
  };
  if (outline.isLocated) {
    visit(outline.root);
  }
  return traps;
};

/** The edits that fix every trap at once */
export const getCubePrecedenceFixEdits = (
  traps: readonly CubePrecedenceTrap[],
): CubeCodeEdit[] => {
  const seen = new Set<string>();
  // at one position, a closing parenthesis before an opening one
  return traps
    .flatMap((trap) => trap.edits)
    .filter((edit) => {
      const key = `${edit.at.line}:${edit.at.column}:${edit.text}`;
      return !seen.has(key) && Boolean(seen.add(key));
    })
    .sort(
      (first, second) =>
        comparePositions(first.at, second.at) ||
        (first.text === ')' ? -1 : 0) - (second.text === ')' ? -1 : 0),
    );
};

// ---------- the parts' types, and a value that can be empty where one is needed ----------

/** A column an expression can read */
export interface CubeOutlineColumn {
  readonly name: string;
  readonly type?: CubeType | undefined;
  readonly nullable?: boolean | undefined;
}

/** A part as the outline shows it */
export interface CubeOutlineRow {
  readonly part: CubeOutlinePart;
  /** How deep in the expression: the whole of it is 0 */
  readonly depth: number;
  /** What it is to the part it is in: `left`, `right`, or the parameter's name */
  readonly role: string | undefined;
  /** The kind of value it gives, where Cube can tell */
  readonly family: TypeFamily | undefined;
  /** It can be empty, as an optional column or `get` can */
  readonly isOptional: boolean;
  /** It can be empty where one value is needed: arithmetic, `&&`, or a parameter of one value */
  readonly needsValue: boolean;
}

const LITERAL_FAMILIES: Readonly<Record<string, TypeFamily>> = {
  String: TypeFamily.STRING,
  Integer: TypeFamily.INTEGER,
  Float: TypeFamily.FLOAT,
  Decimal: TypeFamily.DECIMAL,
  Boolean: TypeFamily.BOOLEAN,
  StrictDate: TypeFamily.STRICT_DATE,
  DateTime: TypeFamily.DATETIME,
  Date: TypeFamily.DATE,
  StrictTime: TypeFamily.STRICT_TIME,
};

/** The family of a Pure type a signature names, e.g. `Integer`; none for `Any` or a type parameter */
const familyOfType = (type: string): TypeFamily | undefined => {
  if (type === 'Number') {
    return TypeFamily.NUMBER;
  }
  try {
    return PrimitiveType.get(type).family;
  } catch {
    return undefined;
  }
};

const NUMBER_FAMILIES = new Set([
  TypeFamily.INTEGER,
  TypeFamily.FLOAT,
  TypeFamily.DECIMAL,
  TypeFamily.NUMBER,
]);

interface PartType {
  readonly family: TypeFamily | undefined;
  readonly isOptional: boolean;
}

/** The signature of a call: of its arity, the first taking its first argument's family */
const signatureOf = (
  catalogue: CubeFunctionCatalogue | undefined,
  name: string | undefined,
  argumentTypes: readonly PartType[],
): CubeFunctionSignature | undefined => {
  const signatures = (name ? catalogue?.get(name)?.signatures : undefined)
    ?.filter((each) => !each.isPlatformOnly)
    .filter((each) => each.parameters.length === argumentTypes.length);
  const family = argumentTypes[0]?.family;
  return (
    signatures?.find(
      (each) =>
        family !== undefined &&
        each.parameters[0] !== undefined &&
        acceptsCubeFamily(each.parameters[0].type, family),
    ) ?? signatures?.[0]
  );
};

/** Every signature of a call's arity takes one value at the position */
const takesOneValue = (
  catalogue: CubeFunctionCatalogue | undefined,
  name: string | undefined,
  arity: number,
  position: number,
): boolean => {
  const signatures = (name ? catalogue?.get(name)?.signatures : undefined)
    ?.filter((each) => !each.isPlatformOnly)
    .filter((each) => each.parameters.length === arity);
  return Boolean(
    signatures?.length &&
      signatures.every(
        (each) => each.parameters[position]?.multiplicity === '1',
      ),
  );
};

/**
 * The outline's parts, each with its role, the kind of value it gives where
 * Cube can tell (the engine stays the judge), and whether it can be empty
 * where one value is needed: the operand of arithmetic or of `&&`, `||` and
 * `!`, or the argument of a function whose every signature of its arity takes
 * one value there; never a comparison's, which takes an empty value
 */
export const getCubeOutlineRows = (
  outline: CubeExpressionOutline,
  columns: readonly CubeOutlineColumn[],
  catalogue: CubeFunctionCatalogue | undefined,
): CubeOutlineRow[] => {
  const rows: CubeOutlineRow[] = [];
  const typeOf = (
    part: CubeOutlinePart,
    depth: number,
    role: string | undefined,
    needsOne: boolean,
  ): PartType => {
    const index = rows.length;
    // a placeholder, its type known once its parts are
    rows.push({
      part,
      depth,
      role,
      family: undefined,
      isOptional: false,
      needsValue: false,
    });
    const type = typePart(part, depth);
    rows[index] = {
      part,
      depth,
      role,
      family: type.family,
      isOptional: type.isOptional,
      needsValue: needsOne && type.isOptional,
    };
    return type;
  };
  const typePart = (part: CubeOutlinePart, depth: number): PartType => {
    switch (part.kind) {
      case CubeOutlinePartKind.COLUMN: {
        const column = columns.find((each) => each.name === part.label);
        return {
          family: column?.type?.family,
          isOptional: column?.nullable ?? false,
        };
      }
      case CubeOutlinePartKind.VALUE:
        return {
          family: part.valueType ? LITERAL_FAMILIES[part.valueType] : undefined,
          isOptional: false,
        };
      case CubeOutlinePartKind.OPERATOR: {
        const kind = part.operatorKind;
        const needsOne =
          kind === CubeOperatorKind.ARITHMETIC ||
          kind === CubeOperatorKind.LOGIC;
        const binary = part.parts.length === 2;
        const types = part.parts.map((each, position) =>
          typeOf(
            each,
            depth + 1,
            binary ? (position === 0 ? 'left' : 'right') : undefined,
            needsOne,
          ),
        );
        if (kind !== CubeOperatorKind.ARITHMETIC) {
          return { family: TypeFamily.BOOLEAN, isOptional: false };
        }
        const families = types.map((each) => each.family);
        return {
          family:
            part.parts.length === 1
              ? families[0]
              : families.every((each) => each === TypeFamily.INTEGER) &&
                  part.functionName !== 'divide'
                ? TypeFamily.INTEGER
                : families.every(
                      (each) => each !== undefined && NUMBER_FAMILIES.has(each),
                    )
                  ? TypeFamily.NUMBER
                  : undefined,
          isOptional: false,
        };
      }
      case CubeOutlinePartKind.CALL: {
        const arity = part.parts.length;
        // the arguments' types first, to pick the signature that names them
        const placeholders = part.parts.map((each, position) => {
          const at = rows.length;
          const type = typeOf(
            each,
            depth + 1,
            undefined,
            takesOneValue(catalogue, part.functionName, arity, position),
          );
          return { at, type };
        });
        const signature = signatureOf(
          catalogue,
          part.functionName,
          placeholders.map((each) => each.type),
        );
        placeholders.forEach(({ at }, position) => {
          const row = rows[at];
          const name = signature?.parameters[position]?.name;
          if (row && name) {
            rows[at] = { ...row, role: name };
          }
        });
        if (!signature) {
          return { family: undefined, isOptional: false };
        }
        const first = placeholders[0]?.type;
        // `T` is the first argument's type, as `coalesce` and `toOne` give
        const family = /^[A-Z]$/u.test(signature.returnType)
          ? first?.family
          : familyOfType(signature.returnType);
        const multiplicity = signature.returnMultiplicity;
        return {
          family,
          isOptional:
            multiplicity === '0..1' ||
            (/^[a-z]+$/u.test(multiplicity) && Boolean(first?.isOptional)),
        };
      }
      default:
        part.parts.forEach((each) => typeOf(each, depth + 1, undefined, false));
        return { family: undefined, isOptional: false };
    }
  };
  typeOf(outline.root, 0, undefined, false);
  return rows;
};

/** The edit that takes a part's one value, assuming it has one: `->toOne()` after it */
export const getCubeToOneEdit = (
  part: CubeOutlinePart,
): CubeCodeEdit | undefined =>
  part.extent
    ? { at: getCubePositionAfter(part.extent), text: '->toOne()' }
    : undefined;

/** The value an empty value of the family stands for: 0, '' or false; none for others, such as dates */
export const getCubeEmptyDefault = (
  family: TypeFamily | undefined,
): string | undefined =>
  family === undefined
    ? undefined
    : NUMBER_FAMILIES.has(family)
      ? '0'
      : family === TypeFamily.STRING
        ? "''"
        : family === TypeFamily.BOOLEAN
          ? 'false'
          : undefined;

/** The edit that gives a default for an empty value: `->coalesce(0)` after it */
export const getCubeCoalesceEdit = (
  part: CubeOutlinePart,
  family: TypeFamily | undefined,
): CubeCodeEdit | undefined => {
  const fallback = getCubeEmptyDefault(family);
  return part.extent && fallback !== undefined
    ? {
        at: getCubePositionAfter(part.extent),
        text: `->coalesce(${fallback})`,
      }
    : undefined;
};
