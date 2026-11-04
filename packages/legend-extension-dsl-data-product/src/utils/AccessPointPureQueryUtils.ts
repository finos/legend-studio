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
  type V1_Variable,
  extractElementNameFromPath,
  V1_getGenericTypeFullPath,
} from '@finos/legend-graph';
import { returnUndefOnError } from '@finos/legend-shared';

/** Up to this many columns, the Pure Query example selects every column by name */
export const MAX_PURE_QUERY_EXAMPLE_COLUMNS = 20;
export const PURE_QUERY_EXAMPLE_ROW_LIMIT = 100;

const INDENT = '  ';
// a longer `select` puts its columns on lines of their own
const EXAMPLE_LINE_WIDTH = 100;

const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/u;
// as legend-cube's printer: words Pure does not read as a column name unquoted
const RESERVED_NAMES: ReadonlySet<string> = new Set([
  'true',
  'false',
  'owner',
  'externalId',
  'function',
  'message',
  'enforcementLevel',
]);

/** Pure's string syntax: backslash first, so the escapes it adds stay as they are */
const printPureString = (value: string): string =>
  `'${value
    .replaceAll('\\', '\\\\')
    .replaceAll("'", "\\'")
    .replaceAll('\n', '\\n')
    .replaceAll('\r', '\\r')
    .replaceAll('\t', '\\t')}'`;

/** A column name as Pure writes it: as is when it is an identifier, else single-quoted */
export const printPureColumnName = (name: string): string =>
  IDENTIFIER.test(name) && !RESERVED_NAMES.has(name)
    ? name
    : printPureString(name);

/**
 * The Pure that queries an access point, as the viewer runs it for sample data:
 * `#P{<data product path>.<access point ID>}#`, with the names of a
 * parameterized access point's parameters in parentheses.
 */
export const buildAccessPointAccessor = (
  dataProductPath: string,
  accessPointId: string,
  parameterNames: string[],
): string =>
  `#P{${dataProductPath}.${accessPointId}${
    parameterNames.length > 0 ? `(${parameterNames.join(', ')})` : ''
  }}#`;

/** The names as lines of the given indent, as many to a line as fit */
const wrapNames = (names: string[], indent: string): string[] => {
  const lines: string[] = [];
  let line: string[] = [];
  names.forEach((name, index) => {
    const item = index < names.length - 1 ? `${name},` : name;
    if (
      line.length > 0 &&
      `${indent}${[...line, item].join(' ')}`.length > EXAMPLE_LINE_WIDTH
    ) {
      lines.push(`${indent}${line.join(' ')}`);
      line = [];
    }
    line.push(item);
  });
  if (line.length > 0) {
    lines.push(`${indent}${line.join(' ')}`);
  }
  return lines;
};

/**
 * The example query of the Pure Query tab: the accessor, then every column in
 * the access point's order when there are 20 or fewer, then the first 100
 * rows. With more columns (or none known), it selects no columns by name.
 */
export const buildAccessPointPureQueryExample = (
  accessor: string,
  columnNames: string[],
): string => {
  const take = `${INDENT}->take(${PURE_QUERY_EXAMPLE_ROW_LIMIT})`;
  if (
    columnNames.length === 0 ||
    columnNames.length > MAX_PURE_QUERY_EXAMPLE_COLUMNS
  ) {
    return [accessor, take].join('\n');
  }
  const names = columnNames.map(printPureColumnName);
  const select = `${INDENT}->select(~[${names.join(', ')}])`;
  if (select.length <= EXAMPLE_LINE_WIDTH) {
    return [accessor, select, take].join('\n');
  }
  return [
    accessor,
    `${INDENT}->select(~[`,
    ...wrapNames(names, `${INDENT}${INDENT}`),
    `${INDENT}])`,
    take,
  ].join('\n');
};

/** A parameter's type as the Column Type column shows it, e.g. `StrictDate`, if it has one */
export const getAccessPointParameterTypeName = (
  parameter: V1_Variable,
): string | undefined => {
  const genericType = parameter.genericType;
  return genericType
    ? returnUndefOnError(() =>
        extractElementNameFromPath(V1_getGenericTypeFullPath(genericType)),
      )
    : undefined;
};
