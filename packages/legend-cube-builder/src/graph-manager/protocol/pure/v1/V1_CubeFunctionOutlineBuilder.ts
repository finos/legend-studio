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

import type { PlainObject } from '@finos/legend-shared';
import type {
  CubeOutlineFunction,
  CubeOutlineFunctionColumn,
  CubeOutlineFunctionParameter,
} from '../../../CubeEngine.js';

// The functions of a parsed model that return a relation (PLAN §6.5), read
// as plain JSON like the rest of the outline: their parameters, the columns
// they declare, and the runtime their body reads through, if any. A cube on
// a function with its own `from(runtime)` must run on that runtime: run on
// another, the query reads different databases depending on its shape.

const FUNCTION_TYPE = 'function';
const RELATION_TYPES = [
  'Relation',
  'meta::pure::metamodel::relation::Relation',
];
const FROM_FUNCTIONS = ['from', 'meta::pure::mapping::from'];
/** How deep calls are followed, for a runtime; deeper calls aren't read */
const MAX_CALL_DEPTH = 20;

/** The primitive types a parameter can take a value of (user, 2026-10-12) */
const VALUE_TYPES = [
  'String',
  'Integer',
  'Float',
  'Decimal',
  'Boolean',
  'StrictDate',
  'DateTime',
  'Date',
];

export const V1_CUBE_FUNCTION_PROBLEM = {
  PARAMETER_TYPE: (name: string, type: string): string =>
    `Its parameter "${name}" is of type ${type}, which Cube can't take a value for yet`,
  PARAMETER_MULTIPLICITY: (name: string, multiplicity: string): string =>
    `Its parameter "${name}" takes ${multiplicity} values; Cube takes one value, or none`,
  RUNTIME_NOT_AN_ELEMENT:
    "It reads through a runtime given by an expression, which Cube can't tell",
  TWO_RUNTIMES: (runtimes: readonly string[]): string =>
    `It reads through more than one runtime: ${runtimes.join(', ')}`,
} as const;

const asObject = (value: unknown): PlainObject =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as PlainObject)
    : {};

const asList = (value: unknown): unknown[] =>
  Array.isArray(value) ? value : [];

const asString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

const lastSegment = (path: string): string => {
  const index = path.lastIndexOf('::');
  return index < 0 ? path : path.slice(index + 2);
};

/** `[1]`, `[0..1]`, `[*]`, `[1..*]`, as the grammar writes it */
const multiplicityText = (json: unknown): string => {
  const { lowerBound, upperBound } = asObject(json);
  const lower = typeof lowerBound === 'number' ? lowerBound : 0;
  const upper = typeof upperBound === 'number' ? upperBound : undefined;
  if (upper === undefined) {
    return lower === 0 ? '[*]' : `[${lower}..*]`;
  }
  return lower === upper ? `[${lower}]` : `[${lower}..${upper}]`;
};

/** The engine's suffix for a multiplicity in a function's full name */
const multiplicitySuffix = (json: unknown): string => {
  const { lowerBound, upperBound } = asObject(json);
  const lower = typeof lowerBound === 'number' ? lowerBound : 0;
  const upper = typeof upperBound === 'number' ? upperBound : undefined;
  if (upper === undefined) {
    return lower === 0 ? 'MANY' : `$${lower}_MANY$`;
  }
  return lower === upper ? String(lower) : `$${lower}_${upper}$`;
};

const typePathOf = (genericType: unknown): string =>
  asString(asObject(asObject(genericType).rawType).fullPath) ?? '';

const returnsRelation = (element: PlainObject): boolean =>
  RELATION_TYPES.includes(typePathOf(element.returnGenericType)) &&
  multiplicityText(element.returnMultiplicity) === '[1]';

/**
 * The path a function is called by: its full name without the signature the
 * engine appends (`ordersAbove_Float_1__Relation_1_` → `ordersAbove`)
 */
const callPathOf = (element: PlainObject): string => {
  const name = asString(element.name) ?? '';
  const pkg = asString(element.package);
  const suffix = `_${asList(element.parameters)
    .map((parameter) => {
      const json = asObject(parameter);
      return `${lastSegment(typePathOf(json.genericType))}_${multiplicitySuffix(json.multiplicity)}_`;
    })
    .join(
      '',
    )}_${lastSegment(typePathOf(element.returnGenericType))}_${multiplicitySuffix(element.returnMultiplicity)}_`;
  const base = name.endsWith(suffix)
    ? name.slice(0, -suffix.length)
    : // a name the engine wrote otherwise: its first segment
      (name.split('_')[0] ?? name);
  return pkg ? `${pkg}::${base}` : base;
};

const signatureOf = (element: PlainObject): string => {
  const name = asString(element.name) ?? '';
  const pkg = asString(element.package);
  return pkg ? `${pkg}::${name}` : name;
};

const buildParameter = (json: unknown): CubeOutlineFunctionParameter => {
  const parameter = asObject(json);
  return {
    name: asString(parameter.name) ?? '',
    type: typePathOf(parameter.genericType),
    multiplicity: multiplicityText(parameter.multiplicity),
  };
};

const buildColumns = (element: PlainObject): CubeOutlineFunctionColumn[] => {
  const [relationType] = asList(
    asObject(element.returnGenericType).typeArguments,
  );
  return asList(asObject(asObject(relationType).rawType).columns).map(
    (json) => {
      const columnJson = asObject(json);
      return {
        name: asString(columnJson.name) ?? '',
        type: typePathOf(columnJson.genericType),
      };
    },
  );
};

/** Why a parameter can't be given a value, if it can't */
const parameterProblemOf = (
  parameter: CubeOutlineFunctionParameter,
): string | undefined =>
  !VALUE_TYPES.includes(parameter.type)
    ? V1_CUBE_FUNCTION_PROBLEM.PARAMETER_TYPE(
        parameter.name,
        lastSegment(parameter.type) || '(unknown)',
      )
    : !['[1]', '[0..1]'].includes(parameter.multiplicity)
      ? V1_CUBE_FUNCTION_PROBLEM.PARAMETER_MULTIPLICITY(
          parameter.name,
          parameter.multiplicity,
        )
      : undefined;

/** What a function's body reads through: runtime paths, and whether one is an expression */
interface RuntimeUse {
  readonly runtimes: Set<string>;
  notAnElement: boolean;
}

/**
 * Walks the model's functions for the runtimes their `from()` calls name,
 * following calls to the model's functions (by path, or by name when only one
 * function has it), each function read once
 */
class V1_CubeRuntimeFinder {
  private readonly byPath = new Map<string, PlainObject[]>();
  private readonly byName = new Map<string, PlainObject[]>();
  private readonly uses = new Map<PlainObject, RuntimeUse>();

  constructor(functions: readonly PlainObject[]) {
    functions.forEach((element) => {
      const path = callPathOf(element);
      this.byPath.set(path, [...(this.byPath.get(path) ?? []), element]);
      const name = lastSegment(path);
      this.byName.set(name, [...(this.byName.get(name) ?? []), element]);
    });
  }

  useOf(element: PlainObject): RuntimeUse {
    const use: RuntimeUse = { runtimes: new Set(), notAnElement: false };
    this.walkFunction(element, use, new Set(), 0);
    return use;
  }

  private walkFunction(
    element: PlainObject,
    use: RuntimeUse,
    visiting: Set<PlainObject>,
    depth: number,
  ): void {
    const known = this.uses.get(element);
    if (known) {
      known.runtimes.forEach((runtime) => use.runtimes.add(runtime));
      use.notAnElement ||= known.notAnElement;
      return;
    }
    if (visiting.has(element) || depth > MAX_CALL_DEPTH) {
      return;
    }
    visiting.add(element);
    const own: RuntimeUse = { runtimes: new Set(), notAnElement: false };
    asList(element.body).forEach((value) =>
      this.walkValue(value, own, visiting, depth),
    );
    visiting.delete(element);
    this.uses.set(element, own);
    own.runtimes.forEach((runtime) => use.runtimes.add(runtime));
    use.notAnElement ||= own.notAnElement;
  }

  private calledFunctions(name: string): readonly PlainObject[] {
    return (
      this.byPath.get(name) ??
      (!name.includes('::') && this.byName.get(name)?.length === 1
        ? (this.byName.get(name) ?? [])
        : [])
    );
  }

  private walkValue(
    value: unknown,
    use: RuntimeUse,
    visiting: Set<PlainObject>,
    depth: number,
  ): void {
    if (Array.isArray(value)) {
      value.forEach((item) => this.walkValue(item, use, visiting, depth));
      return;
    }
    const json = asObject(value);
    if (json._type === 'func') {
      const name = asString(json.function) ?? '';
      const parameters = asList(json.parameters);
      if (FROM_FUNCTIONS.includes(name) && parameters.length >= 2) {
        const runtime = asObject(parameters[parameters.length - 1]);
        const path = asString(runtime.fullPath);
        if (runtime._type === 'packageableElementPtr' && path) {
          use.runtimes.add(path);
        } else {
          use.notAnElement = true;
        }
      }
      this.calledFunctions(name).forEach((called) =>
        this.walkFunction(called, use, visiting, depth + 1),
      );
    }
    Object.values(json).forEach((child) => {
      if (child && typeof child === 'object') {
        this.walkValue(child, use, visiting, depth);
      }
    });
  }
}

/**
 * The model's functions that return a relation, `[1]`, in model order: those
 * of `listed`, with the runtimes read through every function of `all` (a
 * project's own functions, and its dependencies' too)
 */
export const V1_buildCubeFunctionOutlines = (
  listed: readonly PlainObject[],
  all: readonly PlainObject[] = listed,
): CubeOutlineFunction[] => {
  const finder = new V1_CubeRuntimeFinder(
    all.filter((element) => element._type === FUNCTION_TYPE),
  );
  return listed
    .filter(
      (element) => element._type === FUNCTION_TYPE && returnsRelation(element),
    )
    .map((element) => {
      const parameters = asList(element.parameters).map(buildParameter);
      const use = finder.useOf(element);
      const runtimes = [...use.runtimes];
      const problem =
        parameters.map(parameterProblemOf).find((each) => each !== undefined) ??
        (use.notAnElement
          ? V1_CUBE_FUNCTION_PROBLEM.RUNTIME_NOT_AN_ELEMENT
          : runtimes.length > 1
            ? V1_CUBE_FUNCTION_PROBLEM.TWO_RUNTIMES(runtimes)
            : undefined);
      return {
        path: callPathOf(element),
        signature: signatureOf(element),
        parameters,
        columns: buildColumns(element),
        runtime: runtimes.length === 1 ? runtimes[0] : undefined,
        problem,
      };
    });
};
