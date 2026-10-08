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
import {
  CubeTableFlag,
  type CubeModelOutline,
  type CubeOutlineDatabase,
  type CubeOutlineRuntime,
  type CubeOutlineSchema,
  type CubeOutlineTable,
} from '../../../CubeEngine.js';

// The databases and runtimes of a parsed model (`{_type: 'data', elements}`),
// for the source picker (PLAN §6.2.3-§6.2.6). Read as plain JSON: only names,
// column types and store paths are needed, and an element's full protocol
// deserializer needs the graph manager's plugins.

const DATABASE_TYPE = 'relational';
const RUNTIME_TYPE = 'runtime';
/** The only runtime value whose store keys Cube can read; others are hidden */
const ENGINE_RUNTIME_TYPE = 'engineRuntime';

/** The flag a column type gives its table, if any (PLAN §6.2.6) */
const COLUMN_TYPE_FLAGS: Record<string, CubeTableFlag> = {
  // the engine fails to type the whole table
  Binary: CubeTableFlag.UNAVAILABLE,
  Varbinary: CubeTableFlag.UNAVAILABLE,
  // typed with a length of 1
  Char: CubeTableFlag.LENGTH_UNKNOWN,
  // an ARRAY column is parsed as Other; both are typed as a bare String
  Other: CubeTableFlag.TYPE_UNKNOWN,
};

const asObject = (value: unknown): PlainObject =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as PlainObject)
    : {};

const asList = (value: unknown): unknown[] =>
  Array.isArray(value) ? value : [];

const asString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

const elementPath = (element: PlainObject): string => {
  const name = asString(element.name) ?? '';
  const pkg = asString(element.package);
  return pkg ? `${pkg}::${name}` : name;
};

const buildTable = (json: unknown): CubeOutlineTable => {
  const table = asObject(json);
  const columns = asList(table.columns).map(asObject);
  const flags = new Set<CubeTableFlag>();
  const untypedColumns: string[] = [];
  columns.forEach((column) => {
    const flag = COLUMN_TYPE_FLAGS[asString(asObject(column.type)._type) ?? ''];
    if (flag) {
      flags.add(flag);
    }
    if (flag === CubeTableFlag.TYPE_UNKNOWN) {
      untypedColumns.push(asString(column.name) ?? '');
    }
  });
  return {
    name: asString(table.name) ?? '',
    isView: false,
    columnCount: columns.length,
    flags: Object.values(CubeTableFlag).filter((flag) => flags.has(flag)),
    untypedColumns,
  };
};

const buildView = (json: unknown): CubeOutlineTable => {
  const view = asObject(json);
  return {
    name: asString(view.name) ?? '',
    isView: true,
    columnCount: asList(view.columnMappings).length,
    flags: [],
    untypedColumns: [],
  };
};

const buildSchema = (json: unknown): CubeOutlineSchema => {
  const schema = asObject(json);
  return {
    name: asString(schema.name) ?? '',
    tables: [
      ...asList(schema.tables).map(buildTable),
      ...asList(schema.views).map(buildView),
    ],
  };
};

const buildDatabase = (element: PlainObject): CubeOutlineDatabase => ({
  path: elementPath(element),
  // included stores are not followed (v1)
  schemas: asList(element.schemas).map(buildSchema),
});

/** The stores a runtime's connections are keyed by, in both syntaxes; none when it can't be read */
const buildRuntime = (element: PlainObject): CubeOutlineRuntime | undefined => {
  const value = asObject(element.runtimeValue);
  if (value._type !== ENGINE_RUNTIME_TYPE) {
    return undefined;
  }
  const storePaths = [
    // `connections: [<store>: [...]]`
    ...asList(value.connections).map((connection) =>
      asString(asObject(asObject(connection).store).path),
    ),
    // `connectionStores: [<connection>: [<store>, ...]]`
    ...asList(value.connectionStores).flatMap((connectionStore) =>
      asList(asObject(connectionStore).storePointers).map((pointer) =>
        asString(asObject(pointer).path),
      ),
    ),
  ].filter((path): path is string => path !== undefined);
  return { path: elementPath(element), storePaths: [...new Set(storePaths)] };
};

/** The outline of a parsed model: its Database elements and its readable runtimes, in model order */
export const V1_buildCubeModelOutline = (
  modelData: PlainObject,
): CubeModelOutline => {
  const elements = asList(modelData.elements).map(asObject);
  return {
    databases: elements
      .filter((element) => element._type === DATABASE_TYPE)
      .map(buildDatabase),
    runtimes: elements
      .filter((element) => element._type === RUNTIME_TYPE)
      .map(buildRuntime)
      .filter(
        (runtime): runtime is CubeOutlineRuntime => runtime !== undefined,
      ),
  };
};
