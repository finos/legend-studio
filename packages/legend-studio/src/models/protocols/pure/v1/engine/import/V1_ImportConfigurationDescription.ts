/**
 * Copyright Goldman Sachs
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

import { createModelSchema, primitive } from 'serializr';
import {
  guaranteeNonNullable,
  SerializationFactory,
} from '@finos/legend-studio-shared';
import {
  getImportMode,
  ImportConfigurationDescription,
} from '../../../../../metamodels/pure/action/generation/ImportConfigurationDescription';

export class V1_ImportConfigurationDescription {
  key!: string;
  label!: string;
  modelImportMode!: string;

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_ImportConfigurationDescription, {
      key: primitive(),
      label: primitive(),
      modelImportMode: primitive(),
    }),
  );

  build(): ImportConfigurationDescription {
    const generationDescription = new ImportConfigurationDescription();
    generationDescription.key = guaranteeNonNullable(
      this.key,
      'Generation configuration description name is missing',
    );
    generationDescription.label = guaranteeNonNullable(
      this.label,
      'Generation configuration description label is missing',
    );
    generationDescription.modelImportMode = getImportMode(
      guaranteeNonNullable(
        this.modelImportMode,
        'Generation configuration description mode is missing',
      ),
    );
    return generationDescription;
  }
}
