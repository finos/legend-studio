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
import {
  buildSchemasAndValidity,
  type QueryRule,
} from '../inference/SchemaInference.js';
import { Filter } from '../nodes/transforms/Filter.js';
import type { Schema } from '../schema/Schema.js';
import { rereadFilterValues } from './FilterBuilder.js';

/** One pass: each Filter whose input has a schema, against that schema */
const rereadOnce = (
  query: Query,
  schemas: ReadonlyMap<string, Schema | undefined>,
): Query =>
  query.nodes.reduce((current, node) => {
    if (!(node instanceof Filter) || node.filter === undefined) {
      return current;
    }
    const [inputId] = current.getInputIds(node.id);
    const schema = inputId === undefined ? undefined : schemas.get(inputId);
    if (!schema) {
      return current;
    }
    const filter = rereadFilterValues(node.filter, schema);
    return filter === node.filter
      ? current
      : current.replace(node.withFilter(filter));
  }, query);

/**
 * The query with each Filter's invalid values read again against the schema
 * of its input, as inference gives it, e.g. once its sources are typed again
 * after an import (PLAN §10.3): a Filter after a Join reads against the
 * joined columns. An invalid node has no schema, so a Filter after another
 * one with invalid values is read once that one is: passes repeat until
 * nothing changes, each turning at least one invalid value into a value. The
 * query itself comes back when no value was read again.
 */
export const rereadQueryFilterValues = (
  query: Query,
  queryRules: readonly QueryRule[] = [],
): Query => {
  let current = query;
  for (;;) {
    const next = rereadOnce(
      current,
      buildSchemasAndValidity(current, queryRules).schemas,
    );
    if (next === current) {
      return current;
    }
    current = next;
  }
};
