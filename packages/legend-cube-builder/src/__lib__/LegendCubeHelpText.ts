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
  Difference,
  IngestDatasetSource,
  Distinct,
  Drop,
  ExpressionFilter,
  Explode,
  Extend,
  Filter,
  FunctionSource,
  Group,
  Join,
  Limit,
  Partition,
  Pivot,
  RelationalTableSource,
  Rename,
  Restrict,
  ServiceSource,
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
  /** Added by Cube: the original's PURE Native Function source (PLAN §6.5) */
  [FunctionSource.TYPE]:
    'Sources data from a function of the model that returns a relation, called with a value for each parameter.',
  /** Added by Cube: the original has no data product source (PLAN §6.8) */
  [DataProductAccessPointSource.TYPE]:
    'Sources data from an access point of a deployed data product.',
  /** Added by Cube: the original has no ingest data set source (PLAN §6.7) */
  [IngestDatasetSource.TYPE]:
    'Sources data from a data set of a deployed ingest definition.',
  /** Added by Cube: the original's service source is read another way, still to come (PLAN §6.4) */
  [ServiceSource.TYPE]:
    "Sources data from a deployed service. In progress: Cube can't read services yet.",
  [Concat.TYPE]:
    'Combines the rows of the two previous data sets, keeping duplicates, in no particular order. Both must have the same columns: the same names, in the same order, with the same types.',
  [Difference.TYPE]:
    'Compares numeric values of specified columns from two previous data sets.',
  [Distinct.TYPE]: 'Removes duplicate rows from the previous data set.',
  [Drop.TYPE]:
    'Reduces the number of rows in the previous data set, removing the specified number of rows from the beginning of the data set.',
  [Extend.TYPE]:
    'Extends outgoing data set with new columns produced by expressions.',
  /** Added by Cube: the original has no JSON operations (PLAN §11.20) */
  [Explode.TYPE]:
    'Makes a row for each element of an array in a JSON (Variant) column of the previous data set, keeping its columns and adding the element as a new column. A row whose array is empty, or missing, is kept once, with an empty element.',
  [Filter.TYPE]:
    'Reduces the number of rows in the previous data set, keeping only rows matching the specified criteria.',
  /** Added by Cube: the original has no filter by expression (PLAN §11.11) */
  [ExpressionFilter.TYPE]:
    'Reduces the number of rows in the previous data set, keeping only rows for which the expression is true.',
  [Group.TYPE]:
    'Aggregates the data from the previous data set using the specified columns and aggregation functions.',
  /** Added by Cube: the original has pivot only in the grid (PLAN §11.12) */
  [Pivot.TYPE]:
    'Turns the values of a column of the previous data set into columns: a row for each combination of the row columns that has a picked value, and a column for each picked value, holding its aggregate.',
  [Join.TYPE]:
    'Joins two previous data sets using specified columns as join keys.',
  [Partition.TYPE]:
    'Adds new columns with outputs of window functions for optional window partition and order.',
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
  'Make this the step that runs: Execute shows its rows in the grid.';

/** The marker on the step that runs, on the canvas and in its editor */
export const RUNNING_NODE_LABEL = 'Runs';

/** What a node's menu and editor call making it the step that runs */
export const RUN_THIS_STEP_LABEL = 'Run this step';
