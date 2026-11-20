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
  CubeLambdaReadError,
  findCubeFreeVariables,
  getCubeRelationInputCount,
  type CubeLambdaParts,
  type IR,
  type Schema,
} from '@finos/legend-cube';
import type { PlainObject } from '@finos/legend-shared';
import { CUBE_DEFINITION_FLOW_MESSAGE } from '../__lib__/LegendCubeDefinitionFlowLabels.js';
import {
  CUBE_EXPRESSION_CODEC,
  readCubeFunctionDefinition,
  readCubeLambdaJson,
} from './protocol/pure/CubeProtocolJson.js';

// PLAN §11.33, docs/wip/legend-cube/USER-FUNCTIONS.md: the
// user-defined functions a definition calls, opened so the flow draws their
// bodies in containers. A call names a function by its path, without the
// signature its element's name carries, so the host loads functions by that
// name and the call picks the one with as many parameters. Opening a call
// puts its body in its place, its parameters given the call's values; what
// Cube can't open is drawn as one box.

/** How many values: its upper bound `undefined` for any number */
export interface CubeFunctionMultiplicity {
  readonly lowerBound: number;
  readonly upperBound: number | undefined;
}

/** A parameter of a user-defined function */
export interface CubeFunctionParameter {
  readonly name: string;
  /** Its type's name, e.g. `StrictDate`, `Relation` */
  readonly type: string;
  /** How many values it takes, its upper bound `undefined` for any number */
  readonly multiplicity: CubeFunctionMultiplicity;
  /** Whether it takes rows: the call's relation, drawn as the container's input */
  readonly isRelation: boolean;
}

/** A user-defined function, read from its element */
export interface CubeFunctionDefinition {
  /** The element's path, with the signature its name carries: `shop::orders::ordersSince_StrictDate_1__String_1__Relation_1_` */
  readonly path: string;
  /** The path a call names it by: `shop::orders::ordersSince` */
  readonly name: string;
  readonly parameters: readonly CubeFunctionParameter[];
  /** Its return type's name, e.g. `Relation`, `StrictDate` */
  readonly returnType: string;
  readonly returnMultiplicity: CubeFunctionMultiplicity;
  readonly returnsRelation: boolean;
  /** The columns it declares it returns, `Relation<(a:Integer, …)>`; `undefined` for `Relation<Any>` */
  readonly declaredSchema: Schema | undefined;
  /** Its body's statements, protocol JSON */
  readonly body: readonly object[];
  /** The project it comes from, e.g. `org.example:shop-common:2.1.0`, when the host says */
  readonly origin: string | undefined;
}

/** A function element, as the host gives it: from Depot, or its graph */
export interface CubeDefinitionFunctionElement {
  /** The element's path, with its signature */
  readonly path: string;
  /** Its content, protocol JSON */
  readonly content: PlainObject;
  readonly origin?: string | undefined;
}

/**
 * The function elements with these names, as calls name them (`pkg::name`),
 * every overload; none for a name the host doesn't have
 */
export type CubeDefinitionFunctionLoader = (
  names: readonly string[],
) => Promise<readonly CubeDefinitionFunctionElement[]>;

/** How deep calls are opened: a call deeper is drawn as one box */
export const CUBE_DEFINITION_FUNCTION_DEPTH = 8;

/** The functions a host loaded for a definition, by the names calls name them by */
export class CubeDefinitionFunctions {
  private readonly byName = new Map<string, CubeFunctionDefinition[]>();
  /** The names asked for, found or not */
  readonly asked = new Set<string>();

  add(definition: CubeFunctionDefinition): void {
    const known = this.byName.get(definition.name) ?? [];
    if (!known.some((each) => each.path === definition.path)) {
      this.byName.set(definition.name, [...known, definition]);
    }
  }

  /** The functions a call may name, by its path */
  named(name: string): readonly CubeFunctionDefinition[] {
    return this.byName.get(name) ?? [];
  }

  get all(): CubeFunctionDefinition[] {
    return [...this.byName.values()].flat();
  }
}

/** Whether a call's name may be a user-defined function's: a path, not one of the engine's own */
export const isCubeUserFunctionName = (name: string): boolean =>
  name.includes('::') && !name.startsWith('meta::');

/** Each object of the IR, once */
const visitIR = (ir: unknown, visit: (node: IR) => void): void => {
  const seen = new Set<unknown>();
  const walk = (value: unknown): void => {
    if (value === null || typeof value !== 'object' || seen.has(value)) {
      return;
    }
    seen.add(value);
    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }
    const node = value as Record<string, unknown>;
    if (typeof node.k === 'string') {
      visit(node as unknown as IR);
    }
    Object.entries(node).forEach(([key, child]) => {
      // what a host passes through as JSON reads no function
      if (key !== 'json') {
        walk(child);
      }
    });
  };
  walk(ir);
};

/** The names of the user-defined functions the IR may call, in the order it calls them */
const findCalledNames = (ir: unknown): string[] => {
  const names: string[] = [];
  visitIR(ir, (node) => {
    if (
      node.k === 'func' &&
      isCubeUserFunctionName(node.name) &&
      !names.includes(node.name)
    ) {
      names.push(node.name);
    }
  });
  return names;
};

/** A function's body as a lambda's IR: its statements */
const readBody = (definition: CubeFunctionDefinition): IR[] | undefined => {
  try {
    const lambda = readCubeLambdaJson({
      _type: 'lambda',
      body: definition.body,
      parameters: [],
    });
    return lambda.k === 'lambda' ? [...lambda.body] : undefined;
  } catch (error) {
    if (error instanceof CubeLambdaReadError) {
      return undefined;
    }
    throw error;
  }
};

/**
 * The functions a definition calls, loaded: the ones its lambda calls, then
 * the ones their bodies call, as deep as calls are opened. Loads each name
 * once. A host loads these before it looks for the ingest definitions the
 * definition reads, as a function's body may read some.
 */
export const loadCubeDefinitionFunctions = async (
  lambda: unknown,
  load: CubeDefinitionFunctionLoader,
): Promise<CubeDefinitionFunctions> => {
  const functions = new CubeDefinitionFunctions();
  let lambdaIR: IR;
  try {
    lambdaIR = readCubeLambdaJson(lambda);
  } catch (error) {
    if (error instanceof CubeLambdaReadError) {
      return functions;
    }
    throw error;
  }
  let names = findCalledNames(lambdaIR);
  for (
    let depth = 0;
    names.length && depth <= CUBE_DEFINITION_FUNCTION_DEPTH;
    depth++
  ) {
    names.forEach((name) => functions.asked.add(name));
    const loaded = (await load(names))
      .map((element) =>
        readCubeFunctionDefinition(
          element.path,
          element.content,
          element.origin,
        ),
      )
      .filter((each): each is CubeFunctionDefinition => each !== undefined);
    loaded.forEach((definition) => functions.add(definition));
    names = [
      ...new Set(
        loaded.flatMap((definition) =>
          findCalledNames(readBody(definition) ?? []),
        ),
      ),
    ].filter((name) => !functions.asked.has(name));
  }
  return functions;
};

// ---------------------------------------- opening calls ----------------------------------------

/** Why a call is drawn as one box, its body not opened */
export enum CubeDefinitionFunctionClosedReason {
  /** The host has no function by that name and number of parameters */
  NOT_FOUND = 'notFound',
  /** Two functions of that name take as many parameters: Cube doesn't tell them apart by type */
  AMBIGUOUS = 'ambiguous',
  /** Its body has statements other than lets before its last */
  STATEMENTS = 'statements',
  /** Cube can't draw its body: the reason is Cube's refusal */
  NOT_DRAWABLE = 'notDrawable',
  /** Its body reads a relation it takes other than once */
  SHARED_INPUT = 'sharedInput',
  /** A value it is given reads a name its body binds */
  CAPTURE = 'capture',
  /** It calls itself, directly or through others */
  RECURSION = 'recursion',
  /** It is called deeper than calls are opened */
  DEPTH = 'depth',
}

/** A call of a user-defined function in a definition, as the flow draws it */
export interface CubeDefinitionFunctionCall {
  /** Unique in the definition, by the order calls are met: `call1`, `call2`… */
  readonly id: string;
  /** The path the call names, e.g. `shop::orders::ordersSince` */
  readonly name: string;
  /** The function it calls, when the host has it */
  readonly definition: CubeFunctionDefinition | undefined;
  /**
   * The functions it may call, by its name and how many values it takes:
   * one when the host has it, several when Cube can't tell them apart
   */
  readonly candidates: readonly CubeFunctionDefinition[];
  /** The call it is in the body of, if any */
  readonly parentId: string | undefined;
  /** Its values, the relations it takes left out (they are its inputs): IR, in order */
  readonly values: readonly {
    readonly parameter: string | undefined;
    readonly value: IR;
  }[];
  /** Whether its body is drawn: otherwise it is one box */
  readonly opened: boolean;
  readonly closedReason?: CubeDefinitionFunctionClosedReason | undefined;
  /** Cube's own words, for a body Cube can't draw */
  readonly closedMessage?: string | undefined;
}

/** A lambda's parts with the calls Cube can open replaced by their bodies */
export interface CubeDefinitionExpansion {
  readonly parts: CubeLambdaParts;
  readonly calls: readonly CubeDefinitionFunctionCall[];
  /** The call whose body each IR comes from: the steps read from it are in its container */
  readonly callOf: ReadonlyMap<IR, string>;
  /** The call each call left unopened is, by its IR */
  readonly closedCallOf: ReadonlyMap<IR, string>;
}

/**
 * Checks a body with the relations it takes as sources Cube draws by name:
 * throws Cube's refusal when Cube can't draw it
 */
export type CubeDefinitionBodyCheck = (body: IR) => void;

/** A copy of the IR, each object new, so two calls of one function share none */
const copyIR = <T>(value: T): T => {
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(copyIR) as T;
  }
  return Object.fromEntries(
    Object.entries(value).map(([key, child]) => [
      key,
      key === 'json' ? child : copyIR(child),
    ]),
  ) as T;
};

/** The variables the IR reads that it doesn't bind: core's walker */
const freeVariables = (ir: IR): Set<string> =>
  new Set(findCubeFreeVariables(ir, CUBE_EXPRESSION_CODEC.read));

class Capture extends Error {}

/** An SQL island reads a name by `var('name')`, in its text, where no value can be put */
class SqlReadsValue extends Error {
  constructor(readonly variable: string) {
    super();
  }
}

/**
 * The IR with each free variable the values name put in its place; a lambda
 * that binds a name hides it. Throws `Capture` when a value put in would read
 * a name a lambda round it binds, and `SqlReadsValue` when an SQL island
 * reads one of the names: its SQL is text, which Cube doesn't rewrite.
 */
const substitute = (ir: IR, values: ReadonlyMap<string, IR>): IR => {
  const walk = (node: IR, bound: ReadonlySet<string>): IR => {
    switch (node.k) {
      case 'var': {
        const value = bound.has(node.name) ? undefined : values.get(node.name);
        if (value === undefined) {
          return node;
        }
        if ([...freeVariables(value)].some((name) => bound.has(name))) {
          throw new Capture();
        }
        return value;
      }
      case 'lambda': {
        let inner: ReadonlySet<string> = new Set([...bound, ...node.params]);
        const body = node.body.map((statement) => {
          const next = walk(statement, inner);
          if (statement.k === 'let') {
            inner = new Set(inner).add(statement.name);
          }
          return next;
        });
        return { ...node, body };
      }
      case 'func':
        return {
          ...node,
          params: node.params.map((param) => walk(param, bound)),
        };
      case 'property':
        return { ...node, receiver: walk(node.receiver, bound) };
      case 'collection':
        return {
          ...node,
          values: node.values.map((value) => walk(value, bound)),
        };
      case 'colSpec':
        return {
          ...node,
          ...(node.fn1 ? { fn1: walk(node.fn1, bound) } : {}),
          ...(node.fn2 ? { fn2: walk(node.fn2, bound) } : {}),
        };
      case 'colSpecArray':
        return { ...node, specs: node.specs.map((spec) => walk(spec, bound)) };
      case 'let':
        return { ...node, value: walk(node.value, bound) };
      case 'sqlAccessor': {
        const read = node.variables.find(
          (name) => !bound.has(name) && values.has(name),
        );
        if (read !== undefined) {
          throw new SqlReadsValue(read);
        }
        return node;
      }
      default:
        return node;
    }
  };
  return walk(ir, new Set());
};

/** How many times the IR holds this object */
const countOf = (ir: IR, target: IR): number => {
  let count = 0;
  const walk = (value: unknown): void => {
    if (value === target) {
      count++;
      return;
    }
    if (value !== null && typeof value === 'object') {
      Object.entries(value).forEach(
        ([key, child]) => key !== 'json' && walk(child),
      );
    }
  };
  walk(ir);
  return count;
};

/** The relation inputs of a call Cube reads as a step, by their index: as many as core's reader reads */
const relationInputsOf = (
  call: Extract<IR, { readonly k: 'func' }>,
): number[] =>
  Array.from(
    { length: getCubeRelationInputCount(call.name) ?? 1 },
    (_, index) => index,
  );

/** Whether the IR reads rows: a source, a let, or a call of a function */
const readsRows = (ir: IR | undefined): boolean =>
  ir?.k === 'func' ||
  ir?.k === 'var' ||
  ir?.k === 'ingestAccessor' ||
  ir?.k === 'storeAccessor' ||
  ir?.k === 'dataProductAccessor' ||
  ir?.k === 'sqlAccessor';

/**
 * The indexes of a call's values that are relations, its inputs: the
 * relation parameters of the functions it may call, when they agree; for a
 * function the host doesn't have, its first value, when that reads rows
 */
export const getCubeCallRelationIndexes = (
  call: Extract<IR, { readonly k: 'func' }>,
  candidates: readonly CubeFunctionDefinition[],
): number[] => {
  const [first, ...others] = candidates.map((definition) =>
    definition.parameters.flatMap((parameter, index) =>
      parameter.isRelation ? [index] : [],
    ),
  );
  if (first) {
    return others.every((indexes) => indexes.join() === first.join())
      ? first
      : [];
  }
  return readsRows(call.params[0]) ? [0] : [];
};

/** A stand-in for a relation a body takes, drawn by name when the body is checked alone */
export const CUBE_DEFINITION_INPUT_STAND_IN = '__cube__::input';

/** The IR with these objects replaced, each object on the way to one new */
const replaceObjects = (ir: IR, replacements: ReadonlyMap<IR, IR>): IR => {
  const walk = (value: unknown): unknown => {
    if (value === null || typeof value !== 'object') {
      return value;
    }
    const replacement = replacements.get(value as IR);
    if (replacement) {
      return replacement;
    }
    if (Array.isArray(value)) {
      const list = value as unknown[];
      const next = list.map(walk);
      return next.some((each, index) => each !== list[index]) ? next : list;
    }
    const entries = Object.entries(value);
    const next = entries.map(([key, child]): [string, unknown] => [
      key,
      key === 'json' ? child : walk(child),
    ]);
    return next.some(([, child], index) => child !== entries[index]?.[1])
      ? Object.fromEntries(next)
      : value;
  };
  return walk(ir) as IR;
};

/**
 * The lambda's parts with each call of a user-defined function Cube can
 * open replaced by its body, the call's values put in place of its
 * parameters, as deep as calls are opened. A call Cube can't open stays,
 * the relations it takes opened; `check` tells a body Cube can't draw.
 */
export const expandCubeDefinitionFunctions = (
  parts: CubeLambdaParts,
  functions: CubeDefinitionFunctions,
  check: CubeDefinitionBodyCheck,
): CubeDefinitionExpansion => {
  const calls: CubeDefinitionFunctionCall[] = [];
  const callOf = new Map<IR, string>();
  const closedCallOf = new Map<IR, string>();
  const bodies = new Map<string, IR[] | undefined>();
  const bodyOf = (definition: CubeFunctionDefinition): IR[] | undefined => {
    if (!bodies.has(definition.path)) {
      bodies.set(definition.path, readBody(definition));
    }
    return bodies.get(definition.path);
  };

  /** Marks each object of the IR as read from the call's body, but the relations it was given */
  const mark = (ir: IR, callId: string, given: ReadonlySet<IR>): void => {
    const walk = (value: unknown): void => {
      if (value === null || typeof value !== 'object') {
        return;
      }
      if (given.has(value as IR)) {
        return;
      }
      if (!Array.isArray(value) && typeof (value as IR).k === 'string') {
        if (!callOf.has(value as IR)) {
          callOf.set(value as IR, callId);
        }
      }
      Object.entries(value).forEach(
        ([key, child]) => key !== 'json' && walk(child),
      );
    };
    walk(ir);
  };

  const expand = (
    ir: IR,
    depth: number,
    stack: readonly string[],
    parentId: string | undefined,
  ): IR => {
    if (ir.k !== 'func') {
      return ir;
    }
    if (!isCubeUserFunctionName(ir.name)) {
      // a function Cube reads as a step: the relations it reads, opened
      const inputs = relationInputsOf(ir);
      const params = ir.params.map((param, index) =>
        inputs.includes(index) ? expand(param, depth, stack, parentId) : param,
      );
      return params.some((param, index) => param !== ir.params[index])
        ? { ...ir, params }
        : ir;
    }
    const candidates = functions
      .named(ir.name)
      .filter((each) => each.parameters.length === ir.params.length);
    const definition = candidates.length === 1 ? candidates[0] : undefined;
    const relationIndexes = getCubeCallRelationIndexes(ir, candidates);
    // the relations it is given are read before it, outside its container
    const given = new Map(
      relationIndexes.map((index) => [
        index,
        expand(ir.params[index] as IR, depth, stack, parentId),
      ]),
    );
    const id = `call${calls.length + 1}`;
    const record = (
      opened: boolean,
      closedReason?: CubeDefinitionFunctionClosedReason,
      closedMessage?: string,
    ): void => {
      calls.push({
        id,
        name: ir.name,
        definition,
        candidates,
        parentId,
        values: ir.params.flatMap((value, index) =>
          relationIndexes.includes(index)
            ? []
            : [{ parameter: definition?.parameters[index]?.name, value }],
        ),
        opened,
        ...(closedReason ? { closedReason } : {}),
        ...(closedMessage ? { closedMessage } : {}),
      });
    };
    const closed = (
      reason: CubeDefinitionFunctionClosedReason,
      message?: string,
    ): IR => {
      record(false, reason, message);
      const box: IR = {
        ...ir,
        params: ir.params.map((param, index) => given.get(index) ?? param),
      };
      closedCallOf.set(box, id);
      return box;
    };
    if (!definition) {
      return closed(
        candidates.length > 1
          ? CubeDefinitionFunctionClosedReason.AMBIGUOUS
          : CubeDefinitionFunctionClosedReason.NOT_FOUND,
      );
    }
    if (stack.includes(definition.path)) {
      return closed(CubeDefinitionFunctionClosedReason.RECURSION);
    }
    if (depth >= CUBE_DEFINITION_FUNCTION_DEPTH) {
      return closed(CubeDefinitionFunctionClosedReason.DEPTH);
    }
    const statements = bodyOf(definition);
    if (!statements?.length) {
      return closed(CubeDefinitionFunctionClosedReason.NOT_DRAWABLE);
    }
    if (statements.slice(0, -1).some((statement) => statement.k !== 'let')) {
      return closed(CubeDefinitionFunctionClosedReason.STATEMENTS);
    }
    // its parameters given the call's values, then its lets their values
    const values = new Map<string, IR>(
      definition.parameters.map((parameter, index) => [
        parameter.name,
        given.get(index) ?? (ir.params[index] as IR),
      ]),
    );
    let body: IR;
    try {
      const copied = copyIR(statements);
      copied.slice(0, -1).forEach((statement) => {
        if (statement.k === 'let') {
          values.set(statement.name, substitute(statement.value, values));
        }
      });
      body = substitute(copied.at(-1) as IR, values);
    } catch (error) {
      if (error instanceof Capture) {
        return closed(CubeDefinitionFunctionClosedReason.CAPTURE);
      }
      if (error instanceof SqlReadsValue) {
        return closed(
          CubeDefinitionFunctionClosedReason.NOT_DRAWABLE,
          CUBE_DEFINITION_FLOW_MESSAGE.SQL_READS_VALUE(error.variable),
        );
      }
      throw error;
    }
    if ([...given.values()].some((input) => countOf(body, input) !== 1)) {
      return closed(CubeDefinitionFunctionClosedReason.SHARED_INPUT);
    }
    // the calls in its body, opened: their containers are in its own
    const callCount = calls.length;
    record(true);
    const opened = expand(body, depth + 1, [...stack, definition.path], id);
    // checked alone, the relations it takes drawn by name
    try {
      check(
        replaceObjects(
          opened,
          new Map(
            [...given.values()].map((input, index) => [
              input,
              {
                k: 'ingestAccessor',
                path: [CUBE_DEFINITION_INPUT_STAND_IN, `input${index}`],
              } as IR,
            ]),
          ),
        ),
      );
    } catch (error) {
      if (error instanceof CubeLambdaReadError) {
        // forget what opening it recorded: it is one box
        calls.splice(callCount);
        const kept = new Set(calls.map((call) => call.id));
        [callOf, closedCallOf].forEach((byIR) =>
          [...byIR.entries()].forEach(
            ([key, value]) => kept.has(value) || byIR.delete(key),
          ),
        );
        return closed(
          CubeDefinitionFunctionClosedReason.NOT_DRAWABLE,
          error.message,
        );
      }
      throw error;
    }
    mark(opened, id, new Set(given.values()));
    return opened;
  };

  const lets = new Map(
    [...parts.lets.entries()].map(([name, value]) => [
      name,
      expand(value, 0, [], undefined),
    ]),
  );
  const relation = expand(parts.relation, 0, [], undefined);
  return {
    parts: { ...parts, relation, lets },
    calls,
    callOf,
    closedCallOf,
  };
};

/**
 * The ingest definitions the IR reads the rows of, by path, in the order it
 * reads them; a data set's batch metadata needs no definition
 */
export const findCubeIngestDefinitionsRead = (ir: unknown): string[] => {
  const paths: string[] = [];
  visitIR(ir, (node) => {
    if (
      node.k === 'ingestAccessor' &&
      node.qualifier === undefined &&
      node.path[0] !== CUBE_DEFINITION_INPUT_STAND_IN &&
      !paths.includes(node.path[0])
    ) {
      paths.push(node.path[0]);
    }
  });
  return paths;
};

/** The SQL of the islands, `#SQL{…}#`, the IR holds, each once, in the order it holds them */
export const findCubeSqlRead = (ir: unknown): string[] => {
  const found: string[] = [];
  visitIR(ir, (node) => {
    if (node.k === 'sqlAccessor' && !found.includes(node.sql)) {
      found.push(node.sql);
    }
  });
  return found;
};

/** The user-defined functions an expression calls, by name, e.g. a filter's condition calling `pkg::defaultDate()` */
export const findCubeScalarFunctionCalls = (
  ir: IR,
  functions: CubeDefinitionFunctions,
): CubeFunctionDefinition[] => {
  const found: CubeFunctionDefinition[] = [];
  visitIR(ir, (node) => {
    if (node.k === 'func' && isCubeUserFunctionName(node.name)) {
      const definition = functions
        .named(node.name)
        .find(
          (each) =>
            !each.returnsRelation &&
            each.parameters.length === node.params.length,
        );
      if (definition && !found.includes(definition)) {
        found.push(definition);
      }
    }
  });
  return found;
};
