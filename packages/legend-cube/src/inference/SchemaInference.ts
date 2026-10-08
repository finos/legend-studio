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

import type { Query } from '../graph/Query.js';
import type { QueryNode } from '../graph/QueryNode.js';
import {
  ERR_INCOMPLETE,
  ERR_OTHER,
  ERR_SCHEMAS,
} from '../messages/CubeMessages.js';
import type { Schema } from '../schema/Schema.js';

/**
 * A rule over the whole query, checked before the nodes themselves. It returns
 * the errors it finds, by the id of the node they belong to.
 */
export type QueryRule = (
  query: Query,
) => ReadonlyMap<string, readonly string[]>;

export interface SchemaInferenceResult {
  /** The output schema of each node, `undefined` when the node is invalid */
  readonly schemas: ReadonlyMap<string, Schema | undefined>;
  /** The errors of each node: an empty list means the node is valid */
  readonly validity: ReadonlyMap<string, readonly string[]>;
}

/** Whether the error says that the problem is upstream of the node, so the UI can style it differently */
export const isSchemasError = (error: string): boolean => error === ERR_SCHEMAS;

/** Whether the error says that an input port of the node is empty */
export const isIncompleteError = (error: string): boolean =>
  error === ERR_INCOMPLETE;

/**
 * Infers the output schema of every node and checks every node, depth first
 * from the inputs, after every edit:
 * - a node with an empty input port is incomplete (`ERR_INCOMPLETE`);
 * - a node fed by an invalid node is invalid too (`ERR_SCHEMAS`), so an error
 *   is reported once, where it is, and not repeated down the chain;
 * - otherwise the node checks itself against its input schemas, given in port
 *   order, and when valid computes its output schema. An invalid node has no
 *   schema.
 *
 * The query rules run first; their errors are added to the nodes they name,
 * and make those nodes invalid.
 */
export const buildSchemasAndValidity = (
  query: Query,
  rules: readonly QueryRule[] = [],
): SchemaInferenceResult => {
  const ruleErrors = new Map<string, string[]>();
  rules.forEach((rule) =>
    rule(query).forEach((errors, nodeId) =>
      ruleErrors.set(nodeId, [...(ruleErrors.get(nodeId) ?? []), ...errors]),
    ),
  );

  const schemas = new Map<string, Schema | undefined>();
  const validity = new Map<string, readonly string[]>();
  // the query is acyclic, but guard the recursion anyway
  const visiting = new Set<string>();

  const visit = (node: QueryNode): void => {
    if (validity.has(node.id) || visiting.has(node.id)) {
      return;
    }
    visiting.add(node.id);
    const inputIds = query.getInputIds(node.id);
    inputIds.forEach((inputId) => {
      const input = inputId === undefined ? undefined : query.getNode(inputId);
      if (input) {
        visit(input);
      }
    });
    visiting.delete(node.id);

    const errors = [...(ruleErrors.get(node.id) ?? [])];
    const settle = (schema: Schema | undefined): void => {
      schemas.set(node.id, schema);
      validity.set(node.id, errors);
    };

    const inputSchemas = inputIds.map((inputId) =>
      inputId === undefined ? undefined : schemas.get(inputId),
    );
    if (inputIds.some((inputId) => inputId === undefined)) {
      errors.push(ERR_INCOMPLETE);
      settle(undefined);
      return;
    }
    if (!inputSchemas.every((schema) => schema !== undefined)) {
      errors.push(ERR_SCHEMAS);
      settle(undefined);
      return;
    }
    const isValid = node.validate(inputSchemas, errors) && !errors.length;
    const schema = isValid ? node.schematize(inputSchemas) : undefined;
    if (!schema && !errors.length) {
      // invalid without a reason, or valid without a schema
      errors.push(ERR_OTHER);
    }
    settle(schema);
  };

  query.nodes.forEach(visit);
  return { schemas, validity };
};
