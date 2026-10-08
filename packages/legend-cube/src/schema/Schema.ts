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

import type { CubeType } from '../types/CubeType.js';

export class SchemaColumn {
  readonly name: string;
  readonly type: CubeType;
  /** whether the column may hold NULL, which Cube infers itself (the engine reports it wrongly after outer joins) */
  readonly nullable: boolean;

  constructor(name: string, type: CubeType, nullable: boolean) {
    if (!name) {
      throw new Error(`Schema column name cannot be empty`);
    }
    this.name = name;
    this.type = type;
    this.nullable = nullable;
  }
}

/** The ordered, immutable columns of a relation. Column names are unique, as the engine requires. */
export class Schema {
  readonly columns: readonly SchemaColumn[];

  constructor(columns: readonly SchemaColumn[]) {
    const names = new Set<string>();
    columns.forEach((column) => {
      if (names.has(column.name)) {
        throw new Error(
          `Schema has more than one column named "${column.name}"`,
        );
      }
      names.add(column.name);
    });
    this.columns = Object.freeze([...columns]);
  }

  /** The column with that name, or `undefined` */
  lookup(name: string): SchemaColumn | undefined {
    return this.columns.find((column) => column.name === name);
  }

  /** The type of the column with that name, or `undefined` */
  type(name: string): CubeType | undefined {
    return this.lookup(name)?.type;
  }

  /** The column names, in order */
  names(): string[] {
    return this.columns.map((column) => column.name);
  }

  /**
   * Same columns, by name and type, in the same order. Nullability is ignored,
   * as the engine ignores it when concatenating relations.
   */
  equals(other: Schema): boolean {
    return (
      this.columns.length === other.columns.length &&
      this.columns.every((column, index) => {
        const otherColumn = other.columns[index];
        return (
          otherColumn !== undefined &&
          column.name === otherColumn.name &&
          column.type.equals(otherColumn.type)
        );
      })
    );
  }

  /**
   * Same columns by name, type and nullability, in the same order: what source
   * schema drift detection compares, unlike `equals()`.
   */
  isIdenticalTo(other: Schema): boolean {
    return (
      this.equals(other) &&
      this.columns.every(
        (column, index) => column.nullable === other.columns[index]?.nullable,
      )
    );
  }
}
