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

import { guaranteeNonNullable } from '@finos/legend-shared';

export enum GenerationMode {
  CODE_GENERATION = 'codeGeneration',
  SCHEMA_GENERATION = 'schemaGeneration',
}

export enum GenerationPropertyItemType {
  ARRAY = 'ARRAY',
  BOOLEAN = 'BOOLEAN',
  ENUM = 'ENUM',
  INTEGER = 'INTEGER',
  MAP = 'MAP',
  STRING = 'STRING',
  ENUMERATION = 'ENUMERATION',
}

export const getGenerationPropertyItemType = (
  value: string,
): GenerationPropertyItemType =>
  guaranteeNonNullable(
    Object.values(GenerationPropertyItemType).find((mode) => mode === value),
    `Encountered unsupported generation property item type '${value}'`,
  );

export class GenerationPropertyItem {
  types: GenerationPropertyItemType[] = [];
  enums: string[] = [];
}

export class GenerationProperty {
  name!: string;
  description!: string;
  type!: GenerationPropertyItemType;
  items?: GenerationPropertyItem | undefined;
  defaultValue!: string; // we always give string so based on the type of the property, we have to parse this to the appropriate format
  required!: boolean;
}

export class GenerationConfigurationDescription {
  key!: string;
  label!: string;
  properties: GenerationProperty[] = [];
  generationMode!: GenerationMode;
}
