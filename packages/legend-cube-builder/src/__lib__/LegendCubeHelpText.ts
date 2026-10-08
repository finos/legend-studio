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
  Distinct,
  Drop,
  Filter,
  Join,
  Limit,
  RelationalTableSource,
  Slice,
  UnknownNode,
} from '@finos/legend-cube';

// The node editor's help text, verbatim from the original (spec §17.9), but
// Slice's, which counts rows from 0 and leaves the stop row out (D5, PLAN
// §11.4). A new node type adds its entry here.

export const CUBE_NODE_HELP_TEXT: Readonly<Record<string, string>> = {
  [RelationalTableSource.TYPE]: 'Sources data from relational database table.',
  [Distinct.TYPE]: 'Removes duplicate rows from the previous data set.',
  [Drop.TYPE]:
    'Reduces the number of rows in the previous data set, removing the specified number of rows from the beginning of the data set.',
  [Filter.TYPE]:
    'Reduces the number of rows in the previous data set, keeping only rows matching the specified criteria.',
  [Join.TYPE]:
    'Joins two previous data sets using specified columns as join keys.',
  [Limit.TYPE]:
    'Reduces the number of rows in the previous data set, keeping the specified number of rows from the beginning of the data set.',
  [Slice.TYPE]:
    'Reduces the number of rows in the previous data set, keeping only the rows from position "start" up to, but not including, position "stop", counting from 0.',
  [UnknownNode.TYPE]: 'Source or transformation unknown to the application.',
};

/** The tooltip of the editor's Select link (spec §17.9) */
export const SELECT_NODE_TOOLTIP =
  'Selects this node as active and its output will be shown in the grid once query is executed.';
