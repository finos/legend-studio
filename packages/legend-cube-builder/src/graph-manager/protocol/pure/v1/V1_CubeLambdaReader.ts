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
  aggregationColSpec,
  collection,
  colSpec,
  colSpecArray,
  CubeLambdaReadError,
  dataProductAccessor,
  elementPtr,
  enumValue,
  func,
  genericType,
  ingestAccessor,
  lambda,
  letBinding,
  literal,
  property,
  relationType,
  storeAccessor,
  variable,
  type IR,
  type LiteralValue,
  type RelationTypeColumn,
} from '@finos/legend-cube';

// V1 protocol lambda JSON → Cube IR (Import Pure, PLAN §11.18): the inverse
// of `V1_serializeCubeLambda`, tolerant of the shapes the engine's grammar
// gives the same Pure. Source information, multiplicities and the engine's
// function controls are ignored; numbers come as JS numbers, lossless numbers
// or strings, and are kept as their digits; `-5` comes as `minus(5)`. What
// Cube has no IR for is refused, by name.

export const V1_CUBE_LAMBDA_READER_MESSAGE = {
  UNREADABLE: (what: string): string => `Cube can't read ${what} in a query.`,
  NUMBER: (value: unknown): string =>
    `Cube can't read the number ${String(value)} without losing digits.`,
  ACCESSOR: (type: string): string =>
    `Cube can't read the accessor #${type}{…}#: it reads #>{…}#, #P{…}# and #I{…}#.`,
  ACCESSOR_PATH: (type: string): string =>
    `The accessor #${type}{…}# doesn't name what it reads.`,
  INGEST_METADATA:
    "Cube reads an ingest data set's rows, not its metadata (#I{…}# with metadata).",
  DATA_PRODUCT_PARAMETERS:
    "Cube reads a data product's access points without parameters.",
  LET_NAME: 'A let must name what it binds.',
};

type Json = Record<string, unknown>;

const isObject = (value: unknown): value is Json =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const arrayOf = (value: unknown): readonly unknown[] =>
  Array.isArray(value) ? value : [];

const stringOf = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

/** A lossless number, as `parseLosslessJSON` gives one */
const isLosslessNumber = (
  value: unknown,
): value is { isLosslessNumber: true; value: string } =>
  isObject(value) &&
  value.isLosslessNumber === true &&
  typeof value.value === 'string';

/** A JS number or a lossless number, as a JS number: a multiplicity's bound */
const numberOf = (value: unknown): number | undefined =>
  isLosslessNumber(value)
    ? Number(value.value)
    : typeof value === 'number'
      ? value
      : undefined;

/** A number literal's digits: a lossless number's text, a string, or a JS number short of losing digits */
const numberText = (
  value: unknown,
  kind: 'integer' | 'float' | 'decimal',
): string => {
  if (isLosslessNumber(value)) {
    return value.value;
  }
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (kind === 'integer' && !Number.isSafeInteger(value)) {
      throw new CubeLambdaReadError(
        V1_CUBE_LAMBDA_READER_MESSAGE.NUMBER(value),
      );
    }
    return String(value);
  }
  throw new CubeLambdaReadError(V1_CUBE_LAMBDA_READER_MESSAGE.NUMBER(value));
};

/** The protocol's literal types, with the `c`-prefixed names older protocol versions used */
const LITERAL_KINDS: Readonly<Record<string, LiteralValue['kind']>> = {
  string: 'string',
  cString: 'string',
  boolean: 'boolean',
  cBoolean: 'boolean',
  integer: 'integer',
  cInteger: 'integer',
  float: 'float',
  cFloat: 'float',
  decimal: 'decimal',
  cDecimal: 'decimal',
  strictDate: 'strictDate',
  cStrictDate: 'strictDate',
  dateTime: 'dateTime',
  cDateTime: 'dateTime',
};

const readLiteral = (kind: LiteralValue['kind'], json: Json): IR => {
  const { value } = json;
  switch (kind) {
    case 'integer':
    case 'float':
    case 'decimal':
      return literal({ kind, value: numberText(value, kind) });
    case 'boolean':
      if (typeof value !== 'boolean') {
        throw new CubeLambdaReadError(
          V1_CUBE_LAMBDA_READER_MESSAGE.UNREADABLE(
            `the boolean ${String(value)}`,
          ),
        );
      }
      return literal({ kind, value });
    default:
      if (typeof value !== 'string') {
        throw new CubeLambdaReadError(
          V1_CUBE_LAMBDA_READER_MESSAGE.UNREADABLE(
            `the ${kind} ${String(value)}`,
          ),
        );
      }
      return literal({ kind, value } as LiteralValue);
  }
};

/** `-<number>`, which the engine's grammar gives as `minus(<number>)`, as the negative literal */
const negated = (ir: IR): IR | undefined => {
  if (
    ir.k !== 'literal' ||
    (ir.value.kind !== 'integer' &&
      ir.value.kind !== 'float' &&
      ir.value.kind !== 'decimal')
  ) {
    return undefined;
  }
  const text = ir.value.value;
  return literal({
    kind: ir.value.kind,
    value: text.startsWith('-') ? text.slice(1) : `-${text}`,
  });
};

/** A generic type's path and its integer parameters (`Varchar(15)`), from its JSON */
const readGenericType = (
  json: unknown,
): Extract<IR, { readonly k: 'genericType' }> => {
  const type = isObject(json) ? json : {};
  const rawType = isObject(type.rawType) ? type.rawType : {};
  const path = stringOf(rawType.fullPath) ?? stringOf(type.fullPath);
  if (!path) {
    throw new CubeLambdaReadError(
      V1_CUBE_LAMBDA_READER_MESSAGE.UNREADABLE('a type without a name'),
    );
  }
  const params = arrayOf(type.typeVariableValues).map((param) => {
    const text = isObject(param) ? numberText(param.value, 'integer') : '';
    const number = Number(text);
    if (!Number.isSafeInteger(number)) {
      throw new CubeLambdaReadError(
        V1_CUBE_LAMBDA_READER_MESSAGE.UNREADABLE(`the type ${path}(${text})`),
      );
    }
    return number;
  });
  return genericType(path, params);
};

/** A `genericTypeInstance`: a relation type (`@Relation<(…)>`) or a type (`@Integer`) */
const readTypeInstance = (json: Json): IR => {
  const type = isObject(json.genericType) ? json.genericType : json;
  const rawType = isObject(type.rawType) ? type.rawType : {};
  const [argument] = arrayOf(type.typeArguments);
  const argumentRawType =
    isObject(argument) && isObject(argument.rawType)
      ? argument.rawType
      : undefined;
  if (
    stringOf(rawType.fullPath) === 'Relation' &&
    argumentRawType?._type === 'relationType'
  ) {
    return relationType(
      arrayOf(argumentRawType.columns).map((column): RelationTypeColumn => {
        const value = isObject(column) ? column : {};
        const name = stringOf(value.name);
        if (name === undefined) {
          throw new CubeLambdaReadError(
            V1_CUBE_LAMBDA_READER_MESSAGE.UNREADABLE(
              'a relation type column without a name',
            ),
          );
        }
        const multiplicity = isObject(value.multiplicity)
          ? value.multiplicity
          : {};
        return {
          name,
          type: readGenericType(value.genericType),
          nullable: numberOf(multiplicity.lowerBound) === 0,
        };
      }),
    );
  }
  return readGenericType(type);
};

/** A column spec's value: `{name, function1?, function2?}` */
const readColSpec = (value: unknown): IR => {
  const spec = isObject(value) ? value : {};
  const name = stringOf(spec.name);
  if (name === undefined) {
    throw new CubeLambdaReadError(
      V1_CUBE_LAMBDA_READER_MESSAGE.UNREADABLE('a column without a name'),
    );
  }
  const fn1 = spec.function1 === undefined ? undefined : read(spec.function1);
  const fn2 = spec.function2 === undefined ? undefined : read(spec.function2);
  if (fn2 !== undefined) {
    if (fn1 === undefined) {
      throw new CubeLambdaReadError(
        V1_CUBE_LAMBDA_READER_MESSAGE.UNREADABLE(
          `the column ~${name}'s reduce without its map`,
        ),
      );
    }
    return aggregationColSpec(name, fn1, fn2);
  }
  return colSpec(name, fn1);
};

const accessorPath = (value: unknown, type: string): string[] => {
  const path = arrayOf(isObject(value) ? value.path : undefined);
  if (!path.length || path.some((part) => typeof part !== 'string' || !part)) {
    throw new CubeLambdaReadError(
      V1_CUBE_LAMBDA_READER_MESSAGE.ACCESSOR_PATH(type),
    );
  }
  return path as string[];
};

/** A `classInstance`: a column, a column list, or an accessor */
const readClassInstance = (json: Json): IR => {
  const type = stringOf(json.type) ?? '';
  const { value } = json;
  switch (type) {
    case 'colSpec':
      return readColSpec(value);
    case 'colSpecArray':
      return colSpecArray(
        arrayOf(isObject(value) ? value.colSpecs : undefined).map(readColSpec),
      );
    case '>': {
      const path = accessorPath(value, type);
      // a table of the default schema is `#>{db::Store.T}#`
      if (path.length === 2) {
        return storeAccessor([path[0] as string, 'default', path[1] as string]);
      }
      if (path.length !== 3) {
        throw new CubeLambdaReadError(
          V1_CUBE_LAMBDA_READER_MESSAGE.ACCESSOR_PATH(type),
        );
      }
      return storeAccessor(path as [string, string, string]);
    }
    case 'P': {
      const path = accessorPath(value, type);
      if (path.length !== 2) {
        throw new CubeLambdaReadError(
          V1_CUBE_LAMBDA_READER_MESSAGE.ACCESSOR_PATH(type),
        );
      }
      if (arrayOf(isObject(value) ? value.parameters : undefined).length) {
        throw new CubeLambdaReadError(
          V1_CUBE_LAMBDA_READER_MESSAGE.DATA_PRODUCT_PARAMETERS,
        );
      }
      return dataProductAccessor(path as [string, string]);
    }
    case 'I': {
      const path = accessorPath(value, type);
      if (path.length !== 2) {
        throw new CubeLambdaReadError(
          V1_CUBE_LAMBDA_READER_MESSAGE.ACCESSOR_PATH(type),
        );
      }
      if (isObject(value) && value.metadata === true) {
        throw new CubeLambdaReadError(
          V1_CUBE_LAMBDA_READER_MESSAGE.INGEST_METADATA,
        );
      }
      return ingestAccessor(path as [string, string]);
    }
    default:
      throw new CubeLambdaReadError(
        V1_CUBE_LAMBDA_READER_MESSAGE.ACCESSOR(type),
      );
  }
};

const readFunction = (json: Json): IR => {
  const name = stringOf(json.function);
  if (!name) {
    throw new CubeLambdaReadError(
      V1_CUBE_LAMBDA_READER_MESSAGE.UNREADABLE('a function without a name'),
    );
  }
  const params = arrayOf(json.parameters);
  if (name === 'letFunction' && params.length === 2) {
    const [nameJson, value] = params;
    const letName = isObject(nameJson) ? stringOf(nameJson.value) : undefined;
    if (!letName) {
      throw new CubeLambdaReadError(V1_CUBE_LAMBDA_READER_MESSAGE.LET_NAME);
    }
    return letBinding(letName, read(value));
  }
  const parameters = params.map(read);
  const [only] = parameters;
  if (name === 'minus' && parameters.length === 1 && only?.k !== 'collection') {
    const negative = negated(only as IR);
    if (negative) {
      return negative;
    }
  }
  return func(name, parameters);
};

function read(json: unknown): IR {
  if (!isObject(json)) {
    throw new CubeLambdaReadError(
      V1_CUBE_LAMBDA_READER_MESSAGE.UNREADABLE(
        Array.isArray(json) ? 'a list where a value is expected' : String(json),
      ),
    );
  }
  const type = stringOf(json._type) ?? '';
  const literalKind = LITERAL_KINDS[type];
  if (literalKind) {
    return readLiteral(literalKind, json);
  }
  switch (type) {
    case 'lambda':
      return lambda(
        arrayOf(json.parameters).map((parameter) => {
          const name = isObject(parameter)
            ? stringOf(parameter.name)
            : undefined;
          if (!name) {
            throw new CubeLambdaReadError(
              V1_CUBE_LAMBDA_READER_MESSAGE.UNREADABLE(
                'a lambda parameter without a name',
              ),
            );
          }
          return name;
        }),
        arrayOf(json.body).map(read),
      );
    case 'func':
      return readFunction(json);
    case 'property': {
      const name = stringOf(json.property);
      const [receiver] = arrayOf(json.parameters);
      if (!name || receiver === undefined) {
        throw new CubeLambdaReadError(
          V1_CUBE_LAMBDA_READER_MESSAGE.UNREADABLE(
            'a property without its owner',
          ),
        );
      }
      // `JoinKind.INNER`: an enumeration's value
      if (isObject(receiver) && receiver._type === 'packageableElementPtr') {
        const enumPath = stringOf(receiver.fullPath);
        if (enumPath) {
          return enumValue(enumPath, name);
        }
      }
      return property(read(receiver), name);
    }
    case 'enumValue': {
      const enumPath = stringOf(json.fullPath);
      const value = stringOf(json.value);
      if (!enumPath || !value) {
        throw new CubeLambdaReadError(
          V1_CUBE_LAMBDA_READER_MESSAGE.UNREADABLE(
            'an enumeration value without its enumeration',
          ),
        );
      }
      return enumValue(enumPath, value);
    }
    case 'var': {
      const name = stringOf(json.name);
      if (!name) {
        throw new CubeLambdaReadError(
          V1_CUBE_LAMBDA_READER_MESSAGE.UNREADABLE('a variable without a name'),
        );
      }
      return variable(name);
    }
    case 'collection':
      return collection(arrayOf(json.values).map(read));
    case 'classInstance':
      return readClassInstance(json);
    case 'packageableElementPtr': {
      const path = stringOf(json.fullPath);
      if (!path) {
        throw new CubeLambdaReadError(
          V1_CUBE_LAMBDA_READER_MESSAGE.UNREADABLE('an element without a path'),
        );
      }
      return elementPtr(path);
    }
    case 'genericTypeInstance':
      return readTypeInstance(json);
    default:
      throw new CubeLambdaReadError(
        V1_CUBE_LAMBDA_READER_MESSAGE.UNREADABLE(
          type ? `a ${type}` : 'a value of no type',
        ),
      );
  }
}

/**
 * The IR of a lambda's protocol JSON, as Cube serializes one or as the
 * engine's grammar gives one (Import Pure, PLAN §11.18). Throws a
 * `CubeLambdaReadError` naming what Cube has no IR for.
 */
export const V1_readCubeLambda = (json: unknown): IR => {
  const ir = read(json);
  if (ir.k !== 'lambda') {
    throw new CubeLambdaReadError(
      V1_CUBE_LAMBDA_READER_MESSAGE.UNREADABLE('a value that is not a lambda'),
    );
  }
  return ir;
};

/** The IR of any value specification's JSON, e.g. an expression's lambda a step stores */
export const V1_readCubeValueSpecification = (json: unknown): IR => read(json);
