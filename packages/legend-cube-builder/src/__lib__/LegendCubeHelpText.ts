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
  Concat,
  DataProductAccessPointSource,
  Distinct,
  Drop,
  Filter,
  Group,
  Join,
  Limit,
  RelationalTableSource,
  Rename,
  Restrict,
  Slice,
  Sort,
  UnknownNode,
} from '@finos/legend-cube';

// The node editor's help text, verbatim from the original (spec §17.9), but
// Slice's, which counts rows from 0 and leaves the stop row out (D5, PLAN
// §11.4), and Concat's, which matches columns by position (PLAN §11.5, Q8).
// A new node type adds its entry here.

export const CUBE_NODE_HELP_TEXT: Readonly<Record<string, string>> = {
  [RelationalTableSource.TYPE]: 'Sources data from relational database table.',
  /** Added by Cube: the original has no data product source (PLAN §6.8) */
  [DataProductAccessPointSource.TYPE]:
    'Sources data from an access point of a deployed data product.',
  [Concat.TYPE]:
    'Combines the rows of the two previous data sets, keeping duplicates, in no particular order. Both must have the same columns: the same names, in the same order, with the same types.',
  [Distinct.TYPE]: 'Removes duplicate rows from the previous data set.',
  [Drop.TYPE]:
    'Reduces the number of rows in the previous data set, removing the specified number of rows from the beginning of the data set.',
  [Filter.TYPE]:
    'Reduces the number of rows in the previous data set, keeping only rows matching the specified criteria.',
  [Group.TYPE]:
    'Aggregates the data from the previous data set using the specified columns and aggregation functions.',
  [Join.TYPE]:
    'Joins two previous data sets using specified columns as join keys.',
  [Limit.TYPE]:
    'Reduces the number of rows in the previous data set, keeping the specified number of rows from the beginning of the data set.',
  [Rename.TYPE]:
    'Renames specified columns in the previous data set to new names.',
  [Restrict.TYPE]: 'Restricts outgoing data set to the specified columns only.',
  [Slice.TYPE]:
    'Reduces the number of rows in the previous data set, keeping only the rows from position "start" up to, but not including, position "stop", counting from 0.',
  [Sort.TYPE]:
    'Reorders rows of the previous data set by one or more columns, either in ascending or descending order per column.',
  [UnknownNode.TYPE]: 'Source or transformation unknown to the application.',
};

/** The tooltip of the editor's Select link (spec §17.9) */
export const SELECT_NODE_TOOLTIP =
  'Selects this node as active and its output will be shown in the grid once query is executed.';
