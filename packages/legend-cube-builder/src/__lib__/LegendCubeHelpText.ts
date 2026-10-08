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
  Filter,
  Join,
  RelationalTableSource,
  UnknownNode,
} from '@finos/legend-cube';

// The node editor's help text, verbatim from the original (spec §17.9). A
// new node type adds its entry here.

export const CUBE_NODE_HELP_TEXT: Readonly<Record<string, string>> = {
  [RelationalTableSource.TYPE]: 'Sources data from relational database table.',
  [Filter.TYPE]:
    'Reduces the number of rows in the previous data set, keeping only rows matching the specified criteria.',
  [Join.TYPE]:
    'Joins two previous data sets using specified columns as join keys.',
  [UnknownNode.TYPE]: 'Source or transformation unknown to the application.',
};

/** The tooltip of the editor's Select link (spec §17.9) */
export const SELECT_NODE_TOOLTIP =
  'Selects this node as active and its output will be shown in the grid once query is executed.';
