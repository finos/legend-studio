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

import { TypeFamily } from '@finos/legend-cube';

// The engine's catalogue of Pure functions, its PCT documentation
// (`/api/pct/pct-docs.json`): each function's signatures, written as Pure
// writes them, with their Markdown documentation. The expression editors
// complete, describe and explain functions from it (EXPRESSION-EDITOR.md,
// round 1).

/** Whether a multiplicity allows more than one value: `*`, `1..*`, or a type parameter's (`m`) */
const isManyMultiplicity = (multiplicity: string): boolean =>
  /\*$|^[a-z]+$/u.test(multiplicity);

/** A parameter of a signature: its name, from the documentation when it names them, its type and multiplicity as written */
export class CubeFunctionParameter {
  readonly name: string | undefined;
  /** As written: `String`, `Number`, `T`, `Function<{->T[m]}>` */
  readonly type: string;
  /** As written between the brackets: `1`, `0..1`, `*`, `1..*`, `m` */
  readonly multiplicity: string;
  readonly description: string | undefined;

  constructor(
    name: string | undefined,
    type: string,
    multiplicity: string,
    description?: string | undefined,
  ) {
    this.name = name;
    this.type = type;
    this.multiplicity = multiplicity;
    this.description = description;
  }

  /** Whether it takes more than one value: `[*]`, `[1..*]`, or as many as a type parameter says (`[m]`) */
  get isMany(): boolean {
    return isManyMultiplicity(this.multiplicity);
  }

  /** As a signature writes it: `source: String[1]`, or `String[1]` without a name */
  get text(): string {
    const typed = `${this.type}[${this.multiplicity}]`;
    return this.name ? `${this.name}: ${typed}` : typed;
  }
}

/** One signature of a function */
export class CubeFunctionSignature {
  readonly id: string;
  readonly name: string;
  readonly parameters: readonly CubeFunctionParameter[];
  readonly returnType: string;
  readonly returnMultiplicity: string;
  /** Markdown: what it does, its parameters, what it returns, examples */
  readonly documentation: string;
  /** An operator's function, e.g. `plus` for `+`, which code writes as the operator */
  readonly isOperator: boolean;
  /** Only for the platform's own use */
  readonly isPlatformOnly: boolean;

  constructor(
    id: string,
    name: string,
    parameters: readonly CubeFunctionParameter[],
    returnType: string,
    returnMultiplicity: string,
    documentation: string,
    isOperator: boolean,
    isPlatformOnly: boolean,
  ) {
    this.id = id;
    this.name = name;
    this.parameters = parameters;
    this.returnType = returnType;
    this.returnMultiplicity = returnMultiplicity;
    this.documentation = documentation;
    this.isOperator = isOperator;
    this.isPlatformOnly = isPlatformOnly;
  }

  /** As Pure writes it, with the parameters' names: `contains(source: String[1], val: String[1]): Boolean[1]` */
  get text(): string {
    return `${this.name}(${this.parameters
      .map((parameter) => parameter.text)
      .join(', ')}): ${this.returnType}[${this.returnMultiplicity}]`;
  }
}

/** A function, by name: its signatures in every package that defines it */
export class CubeFunction {
  readonly name: string;
  /** Its packages, e.g. `meta::pure::functions::string` */
  readonly packages: readonly string[];
  readonly signatures: readonly CubeFunctionSignature[];

  constructor(
    name: string,
    packages: readonly string[],
    signatures: readonly CubeFunctionSignature[],
  ) {
    this.name = name;
    this.packages = packages;
    this.signatures = signatures;
  }
}

/** A function a value can be passed to, and the signatures that take it first */
export interface CubeFunctionOffer {
  readonly function: CubeFunction;
  readonly signatures: readonly CubeFunctionSignature[];
}

/** The Pure types a value of a family is passed as */
const FAMILY_TYPES: Readonly<Record<TypeFamily, readonly string[]>> = {
  [TypeFamily.BOOLEAN]: ['Boolean'],
  [TypeFamily.STRING]: ['String'],
  [TypeFamily.INTEGER]: ['Integer', 'Number'],
  [TypeFamily.FLOAT]: ['Float', 'Number'],
  [TypeFamily.DECIMAL]: ['Decimal', 'Number'],
  [TypeFamily.NUMBER]: ['Number'],
  [TypeFamily.STRICT_DATE]: ['StrictDate', 'Date'],
  [TypeFamily.DATETIME]: ['DateTime', 'Date'],
  [TypeFamily.DATE]: ['Date'],
  [TypeFamily.STRICT_TIME]: ['StrictTime'],
  [TypeFamily.VARIANT]: ['Variant'],
  [TypeFamily.ENUM]: [],
  [TypeFamily.OPAQUE]: [],
};

/** A type any value is: `Any`, or a type parameter such as `T` */
const isAnyType = (type: string): boolean =>
  type === 'Any' || /^[A-Z]$/u.test(type);

/** A parameter of the Pure type takes a value of the family: of its own types, or any value's */
export const acceptsCubeFamily = (type: string, family: TypeFamily): boolean =>
  isAnyType(type) || FAMILY_TYPES[family].includes(type);

/** The packages of functions a row's value is passed to: not relations, metadata or the language's own machinery */
const VALUE_PACKAGES = [
  'meta::pure::functions::string',
  'meta::pure::functions::math',
  'meta::pure::functions::date',
  'meta::pure::functions::boolean',
  'meta::pure::functions::collection',
  'meta::pure::functions::multiplicity',
  'meta::pure::functions::flow',
  'meta::pure::functions::variant',
];

/** Functions of many values that a row's one value is still passed to */
const TAKE_ONE_AS_MANY = new Set(['isEmpty', 'isNotEmpty', 'toOne']);

/** Functions code writes as an operator, as `==` writes `eq` */
const WRITTEN_AS_OPERATORS = new Set(['eq']);

export class CubeFunctionCatalogue {
  readonly functions: ReadonlyMap<string, CubeFunction>;

  constructor(functions: readonly CubeFunction[]) {
    this.functions = new Map(functions.map((each) => [each.name, each]));
  }

  get(name: string): CubeFunction | undefined {
    return this.functions.get(name);
  }

  /**
   * The functions a value of the family can be passed to first, as
   * `$x.COLUMN->fn(…)` writes it: functions of values (text, numbers,
   * dates, Booleans, empty values, JSON) that give one value; not
   * operators (`plus`, `greaterThan`), platform-only ones, relations, or
   * functions of many values but those a row's value goes to (`isEmpty`,
   * `toOne`); in the catalogue's order. Of a value of an unknown type, those of any value.
   */
  offersFor(family: TypeFamily | undefined): CubeFunctionOffer[] {
    // a value of an unknown type: the functions of any value
    return [...this.functions.values()].flatMap((each) => {
      if (
        WRITTEN_AS_OPERATORS.has(each.name) ||
        each.signatures.some((signature) => signature.isOperator)
      ) {
        return [];
      }
      const signatures = each.signatures.filter((signature) => {
        const [first] = signature.parameters;
        return (
          first !== undefined &&
          !signature.isOperator &&
          !signature.isPlatformOnly &&
          VALUE_PACKAGES.some((path) => signature.id.startsWith(`${path}::`)) &&
          (family !== undefined
            ? acceptsCubeFamily(first.type, family)
            : isAnyType(first.type)) &&
          (!first.isMany || TAKE_ONE_AS_MANY.has(each.name)) &&
          !isManyMultiplicity(signature.returnMultiplicity) &&
          // a lambda to write, as `map` takes, is for code, not a completion
          signature.parameters.every(
            (parameter) => !parameter.type.startsWith('Function<'),
          )
        );
      });
      return signatures.length ? [{ function: each, signatures }] : [];
    });
  }
}

// ---------- reading a signature as Pure writes it ----------

const OPENERS: Readonly<Record<string, string>> = {
  '(': ')',
  '<': '>',
  '{': '}',
  '[': ']',
};

/**
 * The text split on its commas outside of brackets: `<…>`, `{…}`, `(…)`
 * and `[…]`, an arrow's `->` not closing a `<`
 */
const splitTopLevel = (text: string): string[] => {
  const parts: string[] = [];
  const closers: string[] = [];
  let start = 0;
  for (let index = 0; index < text.length; index++) {
    const char = text.charAt(index);
    if (char === '>' && text.charAt(index - 1) === '-') {
      continue;
    }
    const closer = OPENERS[char];
    if (closer) {
      closers.push(closer);
    } else if (char === closers.at(-1)) {
      closers.pop();
    } else if (char === ',' && !closers.length) {
      parts.push(text.slice(start, index));
      start = index + 1;
    }
  }
  parts.push(text.slice(start));
  return parts.map((part) => part.trim()).filter((part) => part.length);
};

/** `String[1]`: the type and the multiplicity */
const readTyped = (
  text: string,
): { type: string; multiplicity: string } | undefined => {
  const match = /^(?<type>.+)\[(?<multiplicity>[^[\]]*)\]$/su.exec(text.trim());
  return match?.groups
    ? {
        type: match.groups.type?.trim() ?? '',
        multiplicity: match.groups.multiplicity?.trim() ?? '',
      }
    : undefined;
};

/** The index of the bracket that closes the one at `open`, an arrow's `->` not closing a `<` */
const closingOf = (text: string, open: number): number => {
  const closers: string[] = [];
  for (let index = open; index < text.length; index++) {
    const char = text.charAt(index);
    if (char === '>' && text.charAt(index - 1) === '-') {
      continue;
    }
    const closer = OPENERS[char];
    if (closer) {
      closers.push(closer);
    } else if (char === closers.at(-1)) {
      closers.pop();
      if (!closers.length) {
        return index;
      }
    }
  }
  return -1;
};

/** A signature as Pure writes it, `meta::…::contains(String[1], String[1]):Boolean[1]`, read into its parts; undefined when it can't be */
export const parseCubeFunctionSignature = (
  simple: string,
):
  | {
      name: string;
      parameters: { type: string; multiplicity: string }[];
      returnType: string;
      returnMultiplicity: string;
    }
  | undefined => {
  // the parameters start at the first `(` outside of type arguments
  let open = -1;
  let depth = 0;
  for (let index = 0; index < simple.length; index++) {
    const char = simple.charAt(index);
    if (char === '<') {
      depth += 1;
    } else if (char === '>') {
      depth -= 1;
    } else if (char === '(' && depth === 0) {
      open = index;
      break;
    }
  }
  if (open < 0) {
    return undefined;
  }
  const close = closingOf(simple, open);
  if (close < 0 || simple.charAt(close + 1) !== ':') {
    return undefined;
  }
  const head = simple.slice(0, open).replace(/<.*>$/su, '');
  const name = head.split('::').at(-1)?.trim();
  const returned = readTyped(simple.slice(close + 2));
  const parameters = splitTopLevel(simple.slice(open + 1, close)).map(
    readTyped,
  );
  if (
    !name ||
    !returned ||
    parameters.some((parameter) => parameter === undefined)
  ) {
    return undefined;
  }
  return {
    name,
    parameters: parameters as { type: string; multiplicity: string }[],
    returnType: returned.type,
    returnMultiplicity: returned.multiplicity,
  };
};

/**
 * The parameters a signature's documentation names, in order, from its
 * **Parameters** list (`` - `source` — the string to search ``)
 */
export const readCubeFunctionParameterNames = (
  documentation: string,
): { name: string; description: string }[] => {
  const section =
    /\*\*Parameters\*\*\s*\n(?<list>(?:[ \t]*[-*][^\n]*(?:\n|$))+)/u.exec(
      documentation,
    )?.groups?.list;
  if (!section) {
    return [];
  }
  return section
    .split('\n')
    .flatMap((line): { name: string; description: string }[] => {
      const item =
        /^\s*[-*]\s*`(?<name>[^`]+)`\s*(?:[—–:-]\s*)?(?<description>.*)$/u.exec(
          line,
        )?.groups;
      return item?.name
        ? [
            {
              name: item.name.trim(),
              description: item.description?.trim() ?? '',
            },
          ]
        : [];
    });
};
