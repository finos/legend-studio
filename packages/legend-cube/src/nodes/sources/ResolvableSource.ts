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

import type { QueryNode, SourceResolution } from '../../graph/QueryNode.js';
import type { SnapshotColumnRest } from './RelationalTableSource.js';

/**
 * A source the host resolves to a schema, and resolves again to see drift: a
 * relational table, a data product's access point or an ingest data set
 */
export interface ResolvableSource extends QueryNode {
  readonly resolution: SourceResolution;
  readonly columnRest: ReadonlyMap<string, SnapshotColumnRest>;
  withResolution(resolution: SourceResolution): ResolvableSource;
}

export const isResolvableSource = (node: QueryNode): node is ResolvableSource =>
  'resolution' in node &&
  'columnRest' in node &&
  typeof (node as Partial<ResolvableSource>).withResolution === 'function';
