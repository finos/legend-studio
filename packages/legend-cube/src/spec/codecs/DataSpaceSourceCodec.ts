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

import { UNRESOLVED } from '../../graph/QueryNode.js';
import {
  type DataSpaceCoordinates,
  DataSpaceSource,
  isDataSpaceRelation,
} from '../../nodes/sources/DataSpaceSource.js';
import type { NodeSpecCodec } from '../NodeSpecCodec.js';
import { fail, pathTo, readObject, readString } from '../SpecReader.js';
import {
  decodeSchemaSnapshot,
  encodeSchemaSnapshot,
} from './SchemaSnapshotCodec.js';

/**
 * A data space source (PLAN §11.25): its data space, execution context and
 * entity, the query builder's lambda and its relation, each as the engine's
 * JSON, and once resolved its schema snapshot, so inference works offline.
 * Unresolved and failed sources have no snapshot and load unresolved: the
 * host resolves them again.
 */
export const DATA_SPACE_SOURCE_CODEC: NodeSpecCodec<DataSpaceSource> = {
  keys: [
    'dataSpace',
    'executionContext',
    'entity',
    'query',
    'relation',
    'schemaSnapshot',
  ],
  encode: (node) => ({
    dataSpace: node.dataSpace,
    executionContext: node.executionContext,
    entity: node.entity,
    query: node.query,
    relation: node.relation,
    ...(node.resolution.kind === 'resolved'
      ? {
          schemaSnapshot: encodeSchemaSnapshot(
            node.resolution.schema,
            node.columnRest,
          ),
        }
      : {}),
  }),
  decode: (id, json, path, rest) => {
    const relationPath = pathTo(path, 'relation');
    const relation = readObject(json.relation, relationPath);
    if (!isDataSpaceRelation(relation)) {
      return fail(
        relationPath,
        'must be a lambda with no parameters and one expression',
      );
    }
    const coordinates: DataSpaceCoordinates = {
      dataSpace: readString(json, 'dataSpace', path),
      executionContext: readString(json, 'executionContext', path),
      entity: readString(json, 'entity', path),
      query: readObject(json.query, pathTo(path, 'query')),
      relation,
    };
    if (json.schemaSnapshot === undefined) {
      return new DataSpaceSource(id, coordinates, UNRESOLVED, rest);
    }
    const { schema, columnRest } = decodeSchemaSnapshot(
      json.schemaSnapshot,
      pathTo(path, 'schemaSnapshot'),
    );
    return new DataSpaceSource(
      id,
      coordinates,
      { kind: 'resolved', schema },
      rest,
      columnRest,
    );
  },
};
