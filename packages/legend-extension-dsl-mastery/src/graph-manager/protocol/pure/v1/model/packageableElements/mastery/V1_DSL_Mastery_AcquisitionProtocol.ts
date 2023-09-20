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
import { type V1_CredentialSecret } from './V1_DSL_Mastery_AuthenticationStrategy.js';

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

export abstract class V1_Decryption implements Hashable {
  get hashCode(): string {
    return hashArray([MASTERY_HASH_STRUCTURE.DECRYPTION]);
  }
}

export class V1_PGPDecryption extends V1_Decryption {
  privateKey!: V1_CredentialSecret;
  passPhrase!: V1_CredentialSecret;

  override get hashCode(): string {
    return hashArray([
      MASTERY_HASH_STRUCTURE.PGP_DECRYPTION,
      this.privateKey,
      this.passPhrase,
      super.hashCode,
    ]);
  }
}

export class V1_DESDecryption extends V1_Decryption {
  decryptionKey!: V1_CredentialSecret;
  uuEncode!: boolean;
  capOption!: boolean;

  override get hashCode(): string {
    return hashArray([
      MASTERY_HASH_STRUCTURE.DES_DECRYPTION,
      this.decryptionKey,
      this.uuEncode.toString(),
      this.capOption.toString(),
      super.hashCode,
    ]);
  }
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
  maxRetryTimeInMinutes?: number | undefined;
  encoding?: string | undefined;
  decryption?: V1_Decryption | undefined;

  override get hashCode(): string {
    return hashArray([
      MASTERY_HASH_STRUCTURE.FILE_ACQUISITION_PROTOCOL,
      this.connection,
      this.filePath,
      this.fileType,
      this.fileSplittingKeys ? hashArray(this.fileSplittingKeys) : '',
      this.headerLines,
      this.recordsKey ?? '',
      this.maxRetryTimeInMinutes ?? '',
      this.encoding ?? '',
      this.decryption ?? '',
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
