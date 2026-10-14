/**
 * Copyright (c) 2020-present, Goldman Sachs
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
  V1_deserializePureModelContext,
  V1_LegendSDLC,
  V1_PureModelContextPointer,
  type V1_ValueSpecification,
} from '@finos/legend-graph';
import type { PlainObject } from '@finos/legend-shared';
import type { DataCubeColumn } from './DataCubeColumn.js';

/**
 * Extract the project (SDLC) coordinates from a serialized Pure model context,
 * if the model is an SDLC-backed pointer. Shared by source telemetry builders.
 */
export function _extractProjectInfoFromModel(model: PlainObject):
  | {
      groupId: string;
      artifactId: string;
      versionId: string;
    }
  | undefined {
  const deserializedModel = V1_deserializePureModelContext(model);
  const sdlcInfo =
    deserializedModel instanceof V1_PureModelContextPointer &&
    deserializedModel.sdlcInfo instanceof V1_LegendSDLC
      ? deserializedModel.sdlcInfo
      : undefined;
  return sdlcInfo !== undefined
    ? {
        groupId: sdlcInfo.groupId,
        artifactId: sdlcInfo.artifactId,
        versionId: sdlcInfo.version,
      }
    : undefined;
}

export abstract class DataCubeSource {
  columns: DataCubeColumn[] = [];
  query!: V1_ValueSpecification;

  /**
   * Build the telemetry payload describing this source. The base implementation
   * returns an empty object; each concrete source overrides this to contribute
   * its own metadata (source type, project, etc.).
   *
   * `dataProductDetails` is an optional, already-formatted enrichment payload
   * (resolved asynchronously by the engine) that only certain sources consume.
   */
  getTelemetryData(_dataProductDetails?: PlainObject): PlainObject {
    return {};
  }
}

export class INTERNAL__DataCubeSource extends DataCubeSource {}
