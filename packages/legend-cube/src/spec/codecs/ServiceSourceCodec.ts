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
import { ServiceSource } from '../../nodes/sources/ServiceSource.js';
import type { NodeSpecCodec } from '../NodeSpecCodec.js';
import { pathTo, readString } from '../SpecReader.js';
import {
  decodeSchemaSnapshot,
  encodeSchemaSnapshot,
} from './SchemaSnapshotCodec.js';

/**
 * A service (PLAN §6.4): its pattern and name, and once resolved its schema
 * snapshot, so inference works offline. Unresolved and failed sources have
 * no snapshot and load unresolved: the host resolves them again.
 */
export const SERVICE_SOURCE_CODEC: NodeSpecCodec<ServiceSource> = {
  keys: ['pattern', 'service', 'schemaSnapshot'],
  encode: (node) => ({
    pattern: node.pattern,
    service: node.service,
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
      pattern: readString(json, 'pattern', path),
      service: readString(json, 'service', path),
    };
    if (json.schemaSnapshot === undefined) {
      return new ServiceSource(id, coordinates, UNRESOLVED, rest);
    }
    const { schema, columnRest } = decodeSchemaSnapshot(
      json.schemaSnapshot,
      pathTo(path, 'schemaSnapshot'),
    );
    return new ServiceSource(
      id,
      coordinates,
      { kind: 'resolved', schema },
      rest,
      columnRest,
    );
  },
};
