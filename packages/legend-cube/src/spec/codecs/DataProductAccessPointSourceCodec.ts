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
import { DataProductAccessPointSource } from '../../nodes/sources/DataProductAccessPointSource.js';
import type { NodeSpecCodec } from '../NodeSpecCodec.js';
import { pathTo, readString, UnreadableContent } from '../SpecReader.js';
import {
  decodeSchemaSnapshot,
  encodeSchemaSnapshot,
} from './SchemaSnapshotCodec.js';

/**
 * Values for an access point's parameters: no version writes them yet. A
 * node saved with them by a later version is kept as it was, unread, rather
 * than run without them
 */
const PARAMETER_VALUES_KEY = 'parameterValues';

/**
 * A data product's access point (PLAN §6.8): where it is, and once resolved
 * its schema snapshot, so inference works offline. The project, its version
 * and the warehouse are the cube's model's. The deployment id is text, as
 * the catalog gives it. Unresolved and failed sources have no snapshot and
 * load unresolved: the host resolves them again.
 */
export const DATA_PRODUCT_ACCESS_POINT_SOURCE_CODEC: NodeSpecCodec<DataProductAccessPointSource> =
  {
    keys: [
      'dataProduct',
      'accessPointGroup',
      'accessPoint',
      'dataProductId',
      'deploymentId',
      'schemaSnapshot',
      PARAMETER_VALUES_KEY,
    ],
    encode: (node) => ({
      dataProduct: node.dataProduct,
      accessPointGroup: node.accessPointGroup,
      accessPoint: node.accessPoint,
      dataProductId: node.dataProductId,
      deploymentId: node.deploymentId,
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
        dataProduct: readString(json, 'dataProduct', path),
        accessPointGroup: readString(json, 'accessPointGroup', path),
        accessPoint: readString(json, 'accessPoint', path),
        dataProductId: readString(json, 'dataProductId', path),
        deploymentId: readString(json, 'deploymentId', path),
      };
      if (json[PARAMETER_VALUES_KEY] !== undefined) {
        throw new UnreadableContent(
          `An access point with parameter values can't be read yet`,
        );
      }
      if (json.schemaSnapshot === undefined) {
        return new DataProductAccessPointSource(
          id,
          coordinates,
          UNRESOLVED,
          rest,
        );
      }
      const { schema, columnRest } = decodeSchemaSnapshot(
        json.schemaSnapshot,
        pathTo(path, 'schemaSnapshot'),
      );
      return new DataProductAccessPointSource(
        id,
        coordinates,
        { kind: 'resolved', schema },
        rest,
        columnRest,
      );
    },
  };
