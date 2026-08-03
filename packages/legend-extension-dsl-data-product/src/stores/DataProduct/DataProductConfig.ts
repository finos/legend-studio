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

import { StereotypeConfig, TaggedValueConfig } from '@finos/legend-application';
import { SerializationFactory, usingModelSchema } from '@finos/legend-shared';
import { createModelSchema, list, optional, primitive } from 'serializr';

export class DataProductImageConfig {
  /**
   * Indicates the maximum dimension (width or height) of the image in pixels.
   * Images larger than this will be resized (maintaining aspect ratio)
   * to fit within this dimension.
   */
  maxDimension!: number;
  /**
   * Indicates the maximum size of the image in KB that a user can upload.
   * Images larger than this will not be accepted and the user must upload
   * a smaller image.
   */
  maxUploadSizeKB!: number;
  /**
   * Indicates the maximum size of the image in KB.
   * Images larger than this will be compressed.
   */
  maxSizeKB!: number;

  static readonly serialization = new SerializationFactory(
    createModelSchema(DataProductImageConfig, {
      maxDimension: primitive(),
      maxUploadSizeKB: primitive(),
      maxSizeKB: primitive(),
    }),
  );
}

export class DataProductProducerConfig {
  /**
   * Base URL of the external operational-view app used to inspect a producer
   * environment (and optionally a producer / ingest definition within it).
   */
  operationalUrl!: string;
  /**
   * Path (relative to the Legend Engine base) of the deployed Legend user
   * service that resolves AppDir deployment ids to human-readable deployment
   * names.
   */
  deploymentLegendServiceUrl!: string;
  /**
   * Base URL of the external app used to view an AppDir deployment by id.
   * The concrete deployment id is appended by consumers when building the
   * final link.
   */
  deploymentViewUrl!: string;

  static readonly serialization = new SerializationFactory(
    createModelSchema(DataProductProducerConfig, {
      operationalUrl: primitive(),
      deploymentLegendServiceUrl: primitive(),
      deploymentViewUrl: primitive(),
    }),
  );
}

export class DataProductConfig {
  classifications: string[] = [];
  publicClassifications: string[] = [];
  classificationDoc!: string;
  publicStereotype!: StereotypeConfig;
  vendorTaggedValue!: TaggedValueConfig;
  imageConfig!: DataProductImageConfig;
  legendJdbcLink!: string;
  producer?: DataProductProducerConfig | undefined;

  static readonly serialization = new SerializationFactory(
    createModelSchema(DataProductConfig, {
      classifications: list(primitive()),
      publicClassifications: list(primitive()),
      classificationDoc: primitive(),
      legendJdbcLink: primitive(),
      producer: optional(
        usingModelSchema(DataProductProducerConfig.serialization.schema),
      ),
      publicStereotype: usingModelSchema(StereotypeConfig.serialization.schema),
      vendorTaggedValue: usingModelSchema(
        TaggedValueConfig.serialization.schema,
      ),
      imageConfig: usingModelSchema(
        DataProductImageConfig.serialization.schema,
      ),
    }),
  );
}
