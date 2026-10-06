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
import { RelationalTableSource } from '../../nodes/sources/RelationalTableSource.js';
import type { NodeSpecCodec } from '../NodeSpecCodec.js';
import { pathTo, readString } from '../SpecReader.js';
import {
  decodeSchemaSnapshot,
  encodeSchemaSnapshot,
} from './SchemaSnapshotCodec.js';

/**
 * A relational table: its coordinates as stored in the Database element
 * (quotes included), and once resolved its schema snapshot, so inference
 * works offline. Unresolved and failed sources have no snapshot and load
 * unresolved: the host resolves them again (PLAN §10.3).
 */
export const RELATIONAL_TABLE_SOURCE_CODEC: NodeSpecCodec<RelationalTableSource> =
  {
    keys: ['database', 'schema', 'table', 'schemaSnapshot'],
    encode: (node) => ({
      database: node.database,
      schema: node.schema,
      table: node.table,
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
      const coordinates = {
        database: readString(json, 'database', path),
        schema: readString(json, 'schema', path),
        table: readString(json, 'table', path),
      };
      if (json.schemaSnapshot === undefined) {
        return new RelationalTableSource(id, coordinates, UNRESOLVED, rest);
      }
      const { schema, columnRest } = decodeSchemaSnapshot(
        json.schemaSnapshot,
        pathTo(path, 'schemaSnapshot'),
      );
      return new RelationalTableSource(
        id,
        coordinates,
        { kind: 'resolved', schema },
        rest,
        columnRest,
      );
    },
  };
