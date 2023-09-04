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

import { type Hashable, hashArray } from '@finos/legend-shared';
import { MASTERY_HASH_STRUCTURE } from '../../../../../../../graph/DSL_Mastery_HashUtils.js';

export enum V1_FileType {
  JSON,
  CSV,
  XML,
}

export enum V1_KafkaDataType {
  JSON,
  CSV,
  XML,
}

export abstract class V1_AcquisitionProtocol implements Hashable {
  get hashCode(): string {
    return hashArray([MASTERY_HASH_STRUCTURE.ACQUISITION_PROTOCOL]);
  }
}

export class V1_LegendServiceAcquisitionProtocol extends V1_AcquisitionProtocol {
  service!: string;

  override get hashCode(): string {
    return hashArray([
      MASTERY_HASH_STRUCTURE.LEGEND_SERVICE_ACQUISITION_PROTOCOL,
      this.service,
      super.hashCode,
    ]);
  }
}

export class V1_FileAcquisitionProtocol extends V1_AcquisitionProtocol {
  connection!: string;
  filePath!: string;
  fileType!: V1_FileType;
  fileSplittingKeys: string[] | undefined;
  headerLines!: number;
  recordsKey?: string | undefined;

  override get hashCode(): string {
    return hashArray([
      MASTERY_HASH_STRUCTURE.FILE_ACQUISITION_PROTOCOL,
      this.connection,
      this.filePath,
      this.fileType,
      this.fileSplittingKeys ? hashArray(this.fileSplittingKeys) : '',
      this.headerLines,
      this.recordsKey ?? '',
      super.hashCode,
    ]);
  }
}

export class V1_KafkaAcquisitionProtocol extends V1_AcquisitionProtocol {
  connection!: string;
  kafkaDataType!: V1_KafkaDataType;
  recordTag?: string | undefined;

  override get hashCode(): string {
    return hashArray([
      MASTERY_HASH_STRUCTURE.KAFKA_ACQUISITION_PROTOCOL,
      this.connection,
      this.kafkaDataType,
      this.recordTag ?? '',
      super.hashCode,
    ]);
  }
}

export class V1_RestAcquisitionProtocol extends V1_AcquisitionProtocol {
  override get hashCode(): string {
    return hashArray([
      MASTERY_HASH_STRUCTURE.REST_SERVICE_ACQUISITION_PROTOCOL,
      super.hashCode,
    ]);
  }
}
