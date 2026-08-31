/**
 * Copyright (c) 2020-present, Goldman Sachs
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

/**
 * Minimal typed view of the Pure V1 protocol value specifications that the
 * query builder produces, plus helpers to navigate them.
 *
 * These model only what the e2e assertions need — the full protocol lives in
 * `@finos/legend-graph`, but this package deliberately depends on nothing
 * from the workspace so the tests assert against the wire format exactly as
 * an engine would receive it.
 */

export interface V1_ValueSpecification {
  _type: string;
}

export interface V1_AppliedFunction extends V1_ValueSpecification {
  _type: 'func';
  function: string;
  parameters: V1_ValueSpecification[];
}

export interface V1_AppliedProperty extends V1_ValueSpecification {
  _type: 'property';
  property: string;
  parameters: V1_ValueSpecification[];
}

export interface V1_Collection extends V1_ValueSpecification {
  _type: 'collection';
  values: V1_ValueSpecification[];
}

export interface V1_Lambda extends V1_ValueSpecification {
  _type: 'lambda';
  body: V1_ValueSpecification[];
  parameters: V1_ValueSpecification[];
}

export interface V1_PackageableElementPtr extends V1_ValueSpecification {
  _type: 'packageableElementPtr';
  fullPath: string;
}

export interface V1_PrimitiveValue extends V1_ValueSpecification {
  value: string | number | boolean;
}

export interface V1_Variable extends V1_ValueSpecification {
  _type: 'var';
  name: string;
}

/** A node of a graph fetch tree, e.g. one fetched property. */
export interface V1_PropertyGraphFetchTree {
  _type: string;
  property: string;
  subTrees: V1_PropertyGraphFetchTree[];
}

/** The root of a graph fetch tree, rooted at the queried class. */
export interface V1_RootGraphFetchTree {
  _type: string;
  class: string;
  subTrees: V1_PropertyGraphFetchTree[];
}

/**
 * A wrapper the protocol uses for non-primitive instances such as graph
 * fetch trees.
 */
export interface V1_ClassInstance extends V1_ValueSpecification {
  _type: 'classInstance';
  type: string;
  value: V1_RootGraphFetchTree;
}

export interface V1_ExecuteInput {
  function: V1_Lambda;
  mapping: string;
  runtime?: unknown;
  model?: unknown;
}

const fail = (message: string): never => {
  throw new Error(`[query protocol] ${message}`);
};

/** Index into a protocol array, failing loudly instead of yielding undefined. */
export const at = <T>(values: T[] | undefined, index: number): T =>
  values?.[index] ?? fail(`missing element at index ${index}`);

export const asFunction = (
  node: V1_ValueSpecification | undefined,
  expectedName?: string,
): V1_AppliedFunction => {
  if (node?._type !== 'func') {
    fail(`expected a function, got '${node?._type ?? 'nothing'}'`);
  }
  const func = node as V1_AppliedFunction;
  if (expectedName !== undefined && func.function !== expectedName) {
    fail(`expected function '${expectedName}', got '${func.function}'`);
  }
  return func;
};

export const asProperty = (
  node: V1_ValueSpecification | undefined,
): V1_AppliedProperty =>
  node?._type === 'property'
    ? (node as V1_AppliedProperty)
    : fail(`expected a property, got '${node?._type ?? 'nothing'}'`);

export const asCollection = (
  node: V1_ValueSpecification | undefined,
): V1_Collection =>
  node?._type === 'collection'
    ? (node as V1_Collection)
    : fail(`expected a collection, got '${node?._type ?? 'nothing'}'`);

export const asLambda = (node: V1_ValueSpecification | undefined): V1_Lambda =>
  node?._type === 'lambda'
    ? (node as V1_Lambda)
    : fail(`expected a lambda, got '${node?._type ?? 'nothing'}'`);

/** The primitive value carried by nodes such as `string`, `float`, `integer`. */
export const getValue = (
  node: V1_ValueSpecification | undefined,
): string | number | boolean =>
  node && 'value' in node
    ? (node as V1_PrimitiveValue).value
    : fail(`expected a primitive value, got '${node?._type ?? 'nothing'}'`);

/**
 * The name of a variable reference, e.g. the query parameter a filter
 * compares against.
 */
export const getVariableName = (
  node: V1_ValueSpecification | undefined,
): string =>
  node?._type === 'var'
    ? (node as V1_Variable).name
    : fail(`expected a variable, got '${node?._type ?? 'nothing'}'`);

/** The element a `getAll()` targets, e.g. `test::COVIDData`. */
export const getElementPath = (
  node: V1_ValueSpecification | undefined,
): string =>
  node?._type === 'packageableElementPtr'
    ? (node as V1_PackageableElementPtr).fullPath
    : fail(`expected an element pointer, got '${node?._type ?? 'nothing'}'`);

/** The single expression forming a lambda's body. */
export const getLambdaBody = (
  node: V1_ValueSpecification | undefined,
): V1_ValueSpecification => at(asLambda(node).body, 0);

/**
 * The names of the chained functions of a query, outermost first.
 *
 * A query builder query nests each operation inside the first parameter of
 * the next, so a projection with a filter, post-filter and row limit reads
 * as `['take', 'filter', 'project', 'filter', 'getAll']`.
 */
export const getFunctionChain = (lambda: V1_Lambda): string[] => {
  const chain: string[] = [];
  let current: V1_ValueSpecification | undefined = at(lambda.body, 0);
  while (current?._type === 'func') {
    const func = current as V1_AppliedFunction;
    chain.push(func.function);
    current = func.parameters[0];
  }
  return chain;
};

/**
 * Walk the chain described by {@link getFunctionChain} and return the
 * function at the given depth (0 = outermost).
 */
export const getChainedFunction = (
  lambda: V1_Lambda,
  depth: number,
): V1_AppliedFunction => {
  let current: V1_ValueSpecification | undefined = at(lambda.body, 0);
  for (let i = 0; i < depth; i++) {
    current = asFunction(current).parameters[0];
  }
  return asFunction(current);
};

/** The graph fetch tree carried by a `classInstance` node. */
export const asGraphFetchTree = (
  node: V1_ValueSpecification | undefined,
): V1_RootGraphFetchTree => {
  if (node?._type !== 'classInstance') {
    fail(`expected a class instance, got '${node?._type ?? 'nothing'}'`);
  }
  const instance = node as V1_ClassInstance;
  if (instance.type !== 'rootGraphFetchTree') {
    fail(`expected a graph fetch tree, got '${instance.type}'`);
  }
  return instance.value;
};

/** The properties fetched at the top level of a graph fetch tree. */
export const getGraphFetchProperties = (
  tree: V1_RootGraphFetchTree,
): string[] => tree.subTrees.map((subTree) => subTree.property);

/** The string values of a collection, e.g. projected column names. */
export const getCollectionValues = (
  node: V1_ValueSpecification | undefined,
): (string | number | boolean)[] =>
  asCollection(node).values.map((value) => getValue(value));

/**
 * The property each lambda in a collection reads, e.g. the source properties
 * behind projected columns.
 */
export const getCollectionProperties = (
  node: V1_ValueSpecification | undefined,
): string[] =>
  asCollection(node).values.map(
    (value) => asProperty(getLambdaBody(value)).property,
  );
