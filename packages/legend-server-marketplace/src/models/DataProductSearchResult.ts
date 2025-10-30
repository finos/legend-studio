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

import type { V1_EntitlementsLakehouseEnvironmentType } from '@finos/legend-graph';
import {
  SerializationFactory,
  usingConstantValueSchema,
} from '@finos/legend-shared';
import {
  createModelSchema,
  custom,
  list,
  optional,
  primitive,
} from 'serializr';
import {
  deserializeDataProductSearchResultDetails,
  deserializeLakehouseDataProductSearchResultOrigin,
  serializeDataProductSearchResultDetails,
  serializeLakehouseDataProductSearchResultOrigin,
} from '../serializationHelpers/DataProductSerializationHelper.js';

export enum DataProductSearchResultDetailsType {
  lakehouse = 'lakehouse',
  legacy = 'legacy',
}

export enum LakehouseDataProductSearchResultOriginType {
  sdlc = 'sdlc',
  adhoc = 'adhoc',
}

export abstract class LakehouseDataProductSearchResultOrigin {}

export class LakehouseSDLCDataProductSearchResultOrigin extends LakehouseDataProductSearchResultOrigin {
  groupId!: string;
  artifactId!: string;
  versionId!: string;
  path!: string;

  static readonly serialization = new SerializationFactory(
    createModelSchema(LakehouseSDLCDataProductSearchResultOrigin, {
      _type: usingConstantValueSchema(
        LakehouseDataProductSearchResultOriginType.sdlc,
      ),
      groupId: primitive(),
      artifactId: primitive(),
      versionId: primitive(),
      path: primitive(),
    }),
  );
}

export class LakehouseAdHocDataProductSearchResultOrigin extends LakehouseDataProductSearchResultOrigin {
  static readonly serialization = new SerializationFactory(
    createModelSchema(LakehouseAdHocDataProductSearchResultOrigin, {
      _type: usingConstantValueSchema(
        LakehouseDataProductSearchResultOriginType.adhoc,
      ),
    }),
  );
}

export abstract class DataProductSearchResultDetails {}

export class LakehouseDataProductSearchResultDetails extends DataProductSearchResultDetails {
  dataProductId!: string;
  did!: number;
  producerEnvironmentName!: string;
  producerEnvironmentType!: V1_EntitlementsLakehouseEnvironmentType | undefined;
  origin!: LakehouseDataProductSearchResultOrigin;

  static readonly serialization = new SerializationFactory(
    createModelSchema(LakehouseDataProductSearchResultDetails, {
      _type: usingConstantValueSchema(
        DataProductSearchResultDetailsType.lakehouse,
      ),
      dataProductId: primitive(),
      did: primitive(),
      producerEnviornmentName: primitive(),
      producerEnvironmentType: optional(primitive()),
      origin: custom(
        serializeLakehouseDataProductSearchResultOrigin,
        deserializeLakehouseDataProductSearchResultOrigin,
      ),
    }),
  );
}

export class LegacyDataProductSearchResultDetails extends DataProductSearchResultDetails {
  groupId!: string;
  artifactId!: string;
  versionId!: string;
  path!: string;

  static readonly serialization = new SerializationFactory(
    createModelSchema(LegacyDataProductSearchResultDetails, {
      _type: usingConstantValueSchema(
        DataProductSearchResultDetailsType.legacy,
      ),
      groupId: primitive(),
      artifactId: primitive(),
      versionId: primitive(),
      path: primitive(),
    }),
  );
}

export class DataProductSearchResult {
  id!: string;
  chunk_id!: string;
  data_product_name!: string;
  data_product_description!: string;
  data_product_link!: string;
  embedding_type!: string;
  vendor_name!: string;
  tags1!: string[];
  tags2!: string[];
  tag_score!: number;
  similarity!: number;
  dataProductDetails!: DataProductSearchResultDetails;

  static readonly serialization = new SerializationFactory(
    createModelSchema(DataProductSearchResult, {
      id: primitive(),
      chunk_id: primitive(),
      data_product_name: primitive(),
      data_product_description: primitive(),
      data_product_link: primitive(),
      embedding_type: primitive(),
      vendor_name: primitive(),
      tags1: list(primitive()),
      tags2: list(primitive()),
      tag_score: primitive(),
      similarity: primitive(),
      dataProductDetails: custom(
        serializeDataProductSearchResultDetails,
        deserializeDataProductSearchResultDetails,
      ),
    }),
  );
}
