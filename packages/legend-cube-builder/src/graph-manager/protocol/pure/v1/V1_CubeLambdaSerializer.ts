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

import type { IR, LiteralValue, Origin } from '@finos/legend-cube';
import { parseLosslessJSON, type PlainObject } from '@finos/legend-shared';

// Cube IR → V1 protocol lambda JSON (PLAN §8.3, §8.5), built as plain JSON,
// never through legend-graph's value-specification classes, whose serializer
// drops `sourceInformation`. Numbers are lossless number values, so the
// request body must be written with `stringifyLosslessJSON`.

/** The prefix of the source ids Cube stamps, `cube:<nodeId>:<role>` */
export const V1_CUBE_SOURCE_ID_PREFIX = 'cube:';

/** A JSON number token: what an integer, float or decimal literal must be */
const NUMBER_TOKEN = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/u;

/** The source id of an origin */
export const V1_buildCubeSourceId = (origin: Origin): string =>
  `${V1_CUBE_SOURCE_ID_PREFIX}${origin.nodeId}:${origin.role}`;

/**
 * The origin a source id names, or none when Cube didn't stamp it. A role
 * never contains `:`, so a node id that does still reads back whole.
 */
export const V1_parseCubeSourceId = (
  sourceId: string | undefined,
): Origin | undefined => {
  if (!sourceId?.startsWith(V1_CUBE_SOURCE_ID_PREFIX)) {
    return undefined;
  }
  const rest = sourceId.slice(V1_CUBE_SOURCE_ID_PREFIX.length);
  const at = rest.lastIndexOf(':');
  if (at <= 0 || at === rest.length - 1) {
    return undefined;
  }
  return { nodeId: rest.slice(0, at), role: rest.slice(at + 1) };
};

const stamped = (json: PlainObject, origin: Origin | undefined): PlainObject =>
  origin
    ? {
        ...json,
        sourceInformation: { sourceId: V1_buildCubeSourceId(origin) },
      }
    : json;

/** A lossless JSON number for a numeric literal's text, written digit for digit */
const numberToken = (text: string): unknown => {
  if (!NUMBER_TOKEN.test(text)) {
    throw new Error(`"${text}" is not a number Cube can send`);
  }
  return parseLosslessJSON(text);
};

/** The literal types whose value is a number, which Cube keeps as its digit string in an expression's JSON */
const NUMBER_LITERAL_TYPES: readonly unknown[] = [
  'integer',
  'float',
  'decimal',
];

/**
 * An expression's lambda as the engine reads it (PLAN §11.7): each number
 * literal written digit for digit from the string Cube keeps, any source
 * information replaced by the origin, on every value specification
 */
const serializeLambdaJson = (
  json: unknown,
  origin: Origin | undefined,
): unknown => {
  if (Array.isArray(json)) {
    return json.map((item) => serializeLambdaJson(item, origin));
  }
  if (typeof json !== 'object' || json === null) {
    return json;
  }
  const object: PlainObject = Object.fromEntries(
    Object.entries(json)
      .filter(([key]) => key !== 'sourceInformation')
      .map(([key, value]) => [key, serializeLambdaJson(value, origin)]),
  );
  if (
    NUMBER_LITERAL_TYPES.includes(object._type) &&
    typeof object.value === 'string'
  ) {
    object.value = numberToken(object.value);
  }
  return typeof object._type === 'string' ? stamped(object, origin) : object;
};

const serializeLiteral = (value: LiteralValue): PlainObject => {
  switch (value.kind) {
    case 'string':
    case 'boolean':
    case 'strictDate':
    case 'dateTime':
      return { _type: value.kind, value: value.value };
    case 'integer':
    case 'float':
    case 'decimal':
      return { _type: value.kind, value: numberToken(value.value) };
    case 'enum':
      // enumeration values are emitted as `enumValue`, with their enumeration
      throw new Error(
        `Can't send the enumeration value "${value.value}" as a literal`,
      );
    default: {
      const unknown: never = value;
      throw new Error(`Unknown literal ${JSON.stringify(unknown)}`);
    }
  }
};

/**
 * The protocol JSON of an IR node. Every protocol node is stamped with the
 * origin of its IR node, or else of its nearest ancestor that has one.
 */
const serialize = (ir: IR, inherited: Origin | undefined): PlainObject => {
  switch (ir.k) {
    case 'func': {
      const origin = ir.origin ?? inherited;
      return stamped(
        {
          _type: 'func',
          function: ir.name,
          parameters: ir.params.map((param) => serialize(param, origin)),
        },
        origin,
      );
    }
    case 'property': {
      const origin = ir.origin ?? inherited;
      return stamped(
        {
          _type: 'property',
          property: ir.name,
          parameters: [serialize(ir.receiver, origin)],
        },
        origin,
      );
    }
    case 'var':
      return stamped({ _type: 'var', name: ir.name }, inherited);
    case 'lambda':
      return stamped(
        {
          _type: 'lambda',
          parameters: ir.params.map((name) =>
            stamped({ _type: 'var', name }, inherited),
          ),
          body: ir.body.map((statement) => serialize(statement, inherited)),
        },
        inherited,
      );
    case 'literal':
      return stamped(serializeLiteral(ir.value), ir.origin ?? inherited);
    case 'collection':
      return stamped(
        {
          _type: 'collection',
          multiplicity: {
            lowerBound: ir.values.length,
            upperBound: ir.values.length,
          },
          values: ir.values.map((value) => serialize(value, inherited)),
        },
        inherited,
      );
    case 'colSpec':
      // the engine reports a missing column on the spec's value, which is
      // also what a column list holds, so the value is stamped too
      return stamped(
        {
          _type: 'classInstance',
          type: 'colSpec',
          value: stamped(
            {
              name: ir.name,
              ...(ir.fn1 ? { function1: serialize(ir.fn1, inherited) } : {}),
              ...(ir.fn2 ? { function2: serialize(ir.fn2, inherited) } : {}),
            },
            inherited,
          ),
        },
        inherited,
      );
    case 'colSpecArray':
      return stamped(
        {
          _type: 'classInstance',
          type: 'colSpecArray',
          value: {
            colSpecs: ir.specs.map((spec) => {
              if (spec.k !== 'colSpec') {
                throw new Error(
                  `A column list holds only column specs, not "${spec.k}"`,
                );
              }
              return (serialize(spec, inherited) as { value: PlainObject })
                .value;
            }),
          },
        },
        inherited,
      );
    case 'storeAccessor': {
      const origin = ir.origin ?? inherited;
      // the engine reports a wrong database, schema or table on the value
      return stamped(
        {
          _type: 'classInstance',
          type: '>',
          value: stamped({ path: [...ir.path] }, origin),
        },
        origin,
      );
    }
    case 'dataProductAccessor':
      // stamped on the outer instance only: the value is sent as legend-graph
      // sends it, which Query and Data Cube already send to the engine
      return stamped(
        {
          _type: 'classInstance',
          type: 'P',
          multiplicity: { lowerBound: 1, upperBound: 1 },
          value: { path: [...ir.path], parameters: [] },
        },
        ir.origin ?? inherited,
      );
    case 'ingestAccessor':
      // as legend-graph sends it, and Legend Query's ingest queries with it:
      // the data set's rows, never its metadata
      return stamped(
        {
          _type: 'classInstance',
          type: 'I',
          multiplicity: { lowerBound: 1, upperBound: 1 },
          value: { path: [...ir.path], metadata: false },
        },
        ir.origin ?? inherited,
      );
    case 'elementPtr':
      return stamped(
        { _type: 'packageableElementPtr', fullPath: ir.path },
        inherited,
      );
    case 'genericType':
      return stamped(
        {
          _type: 'genericTypeInstance',
          genericType: {
            rawType: { _type: 'packageableType', fullPath: ir.path },
            typeArguments: [],
            multiplicityArguments: [],
            typeVariableValues: (ir.params ?? []).map((param) =>
              stamped(
                { _type: 'integer', value: numberToken(String(param)) },
                inherited,
              ),
            ),
          },
        },
        inherited,
      );
    case 'enumValue': {
      const origin = ir.origin ?? inherited;
      return stamped(
        {
          _type: 'property',
          property: ir.value,
          parameters: [
            stamped(
              { _type: 'packageableElementPtr', fullPath: ir.enumPath },
              origin,
            ),
          ],
        },
        origin,
      );
    }
    case 'let': {
      // `let n = v` is the engine's `letFunction('n', v)`; the name is
      // stamped too, so an error the engine reports on it lands on the node
      // the let binds (PLAN §8.6)
      const origin = ir.origin ?? inherited;
      return stamped(
        {
          _type: 'func',
          function: 'letFunction',
          parameters: [
            stamped({ _type: 'string', value: ir.name }, origin),
            serialize(ir.value, origin),
          ],
        },
        origin,
      );
    }
    case 'raw':
      return ir.json as PlainObject;
    case 'lambdaJson':
      return serializeLambdaJson(
        ir.json,
        ir.origin ?? inherited,
      ) as PlainObject;
    default: {
      const unknown: never = ir;
      throw new Error(`Unknown IR ${JSON.stringify(unknown)}`);
    }
  }
};

/**
 * The protocol JSON of a lambda Cube emitted (a typing or an execution
 * lambda), with lossless numbers: write it with `stringifyLosslessJSON`.
 */
export const V1_serializeCubeLambda = (ir: IR): PlainObject => {
  if (ir.k !== 'lambda') {
    throw new Error(`Only a lambda can be sent, not "${ir.k}"`);
  }
  return serialize(ir, undefined);
};
