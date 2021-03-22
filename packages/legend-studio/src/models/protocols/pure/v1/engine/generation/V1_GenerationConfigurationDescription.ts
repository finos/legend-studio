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

import { list, primitive, createModelSchema } from 'serializr';
import {
  SerializationFactory,
  usingModelSchema,
  guaranteeNonNullable,
} from '@finos/legend-studio-shared';
import { getGenerationMode } from '../../../../../metamodels/pure/model/packageableElements/fileGeneration/FileGenerationSpecification';
import {
  GenerationProperty,
  GenerationPropertyItem,
  GenerationConfigurationDescription,
  getGenerationPropertyItemType,
} from '../../../../../metamodels/pure/action/generation/GenerationConfigurationDescription';

export class V1_GenerationPropertyItem {
  types: string[] = [];
  enums: string[] = [];

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_GenerationPropertyItem, {
      types: list(primitive()),
      enums: list(primitive()),
    }),
  );

  build(): GenerationPropertyItem {
    const item = new GenerationPropertyItem();
    item.types = this.types.map(getGenerationPropertyItemType);
    item.enums = this.enums;
    return item;
  }
}

export class V1_GenerationProperty {
  name!: string;
  description!: string;
  type!: string;
  items?: V1_GenerationPropertyItem;
  defaultValue!: string; // we always give string so based on the type of the property, we have to parse this to the appropriate format
  required!: boolean;

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_GenerationProperty, {
      name: primitive(),
      description: primitive(),
      type: primitive(),
      items: usingModelSchema(V1_GenerationPropertyItem.serialization.schema),
      defaultValue: primitive(),
      required: primitive(),
    }),
  );

  build(): GenerationProperty {
    const generationProperty = new GenerationProperty();
    generationProperty.name = guaranteeNonNullable(
      this.name,
      'Generation property name is missing',
    );
    generationProperty.description = guaranteeNonNullable(
      this.description,
      'Generation description is missing',
    );
    generationProperty.type = getGenerationPropertyItemType(
      guaranteeNonNullable(this.type, 'Generation type is missing'),
    );
    generationProperty.items = this.items ? this.items.build() : undefined;
    generationProperty.defaultValue = this.defaultValue;
    generationProperty.required = this.required;
    return generationProperty;
  }
}

export class V1_GenerationConfigurationDescription {
  key!: string;
  label!: string;
  properties: V1_GenerationProperty[] = [];
  generationMode!: string;

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_GenerationConfigurationDescription, {
      key: primitive(),
      label: primitive(),
      properties: usingModelSchema(V1_GenerationProperty.serialization.schema),
      generationMode: primitive(),
    }),
  );

  build(): GenerationConfigurationDescription {
    const generationDescription = new GenerationConfigurationDescription();
    generationDescription.key = guaranteeNonNullable(
      this.key,
      'Generation configuration description key is missing',
    );
    generationDescription.label = guaranteeNonNullable(
      this.label,
      'Generation configuration description label is missing',
    );
    generationDescription.properties = this.properties.map(
      (generationProperty) => generationProperty.build(),
    );
    generationDescription.generationMode = getGenerationMode(
      guaranteeNonNullable(
        this.generationMode,
        'Generation configuration description mode is missing',
      ),
    );
    return generationDescription;
  }
}
