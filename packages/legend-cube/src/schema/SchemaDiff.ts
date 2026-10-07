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

import type { Schema, SchemaColumn } from './Schema.js';

/** A column in both schemas whose type or nullability differs */
export interface SchemaColumnChange {
  readonly before: SchemaColumn;
  readonly after: SchemaColumn;
}

/** How a schema changed, e.g. a source's table since its snapshot was saved */
export interface SchemaDiff {
  /** Columns only in the new schema, in its order */
  readonly added: readonly SchemaColumn[];
  /** Columns only in the old schema, in its order */
  readonly removed: readonly SchemaColumn[];
  /** Columns in both, by name, whose type or nullability changed, in the new schema's order */
  readonly changed: readonly SchemaColumnChange[];
  /** The columns in both come in another order */
  readonly reordered: boolean;
}

/**
 * What changed from one schema to another, column by column. Two schemas
 * that are `isIdenticalTo` each other have no differences.
 */
export const diffSchemas = (before: Schema, after: Schema): SchemaDiff => {
  const kept = after.columns.filter((column) => before.lookup(column.name));
  const keptBefore = before.columns.filter((column) =>
    after.lookup(column.name),
  );
  return {
    added: after.columns.filter((column) => !before.lookup(column.name)),
    removed: before.columns.filter((column) => !after.lookup(column.name)),
    changed: kept.flatMap((column) => {
      const previous = before.lookup(column.name) as SchemaColumn;
      return previous.type.equals(column.type) &&
        previous.nullable === column.nullable
        ? []
        : [{ before: previous, after: column }];
    }),
    reordered: kept.some(
      (column, index) => keptBefore[index]?.name !== column.name,
    ),
  };
};
