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
import { IngestDatasetSource } from '../../nodes/sources/IngestDatasetSource.js';
import type { NodeSpecCodec } from '../NodeSpecCodec.js';
import { pathTo, readString } from '../SpecReader.js';
import {
  decodeSchemaSnapshot,
  encodeSchemaSnapshot,
} from './SchemaSnapshotCodec.js';

/**
 * An ingest data set: where it is, and once resolved its schema snapshot, so
 * inference works offline. The class, the producer deployment and the
 * warehouse are the cube's model's. Unresolved and failed sources have no
 * snapshot and load unresolved: the host resolves them again.
 */
export const INGEST_DATASET_SOURCE_CODEC: NodeSpecCodec<IngestDatasetSource> = {
  keys: [
    'ingestDefinitionUrn',
    'ingestDefinition',
    'dataSet',
    'schemaSnapshot',
  ],
  encode: (node) => ({
    ingestDefinitionUrn: node.ingestDefinitionUrn,
    ingestDefinition: node.ingestDefinition,
    dataSet: node.dataSet,
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
      ingestDefinitionUrn: readString(json, 'ingestDefinitionUrn', path),
      ingestDefinition: readString(json, 'ingestDefinition', path),
      dataSet: readString(json, 'dataSet', path),
    };
    if (json.schemaSnapshot === undefined) {
      return new IngestDatasetSource(id, coordinates, UNRESOLVED, rest);
    }
    const { schema, columnRest } = decodeSchemaSnapshot(
      json.schemaSnapshot,
      pathTo(path, 'schemaSnapshot'),
    );
    return new IngestDatasetSource(
      id,
      coordinates,
      { kind: 'resolved', schema },
      rest,
      columnRest,
    );
  },
};
