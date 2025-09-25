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

import { StereotypeConfig } from '@finos/legend-application';
import { SerializationFactory, usingModelSchema } from '@finos/legend-shared';
import { createModelSchema, list, primitive } from 'serializr';

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

export class DataProductConfig {
  classifications: string[] = [];
  publicClassifications: string[] = [];
  classificationDoc!: string;
  publicStereotype!: StereotypeConfig;
  imageConfig!: DataProductImageConfig;

  static readonly serialization = new SerializationFactory(
    createModelSchema(DataProductConfig, {
      classifications: list(primitive()),
      publicClassifications: list(primitive()),
      classificationDoc: primitive(),
      publicStereotype: usingModelSchema(StereotypeConfig.serialization.schema),
      imageConfig: usingModelSchema(
        DataProductImageConfig.serialization.schema,
      ),
    }),
  );
}
