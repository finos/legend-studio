/**
 * Copyright 2020 Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { serializable, list, object, primitive } from 'serializr';

export enum GenerationItemType {
  ARRAY = 'ARRAY',
  BOOLEAN = 'BOOLEAN',
  ENUM = 'ENUM',
  INTEGER = 'INTEGER',
  MAP = 'MAP',
  STRING = 'STRING',
}

export class GenerationPropertyItem {
  @serializable(list(primitive())) types: GenerationItemType[] = [];
  @serializable(list(primitive())) enums: string[] = [];
}

export class GenerationProperty {
  @serializable name!: string;
  @serializable description!: string;
  @serializable type!: GenerationItemType;
  @serializable(object(GenerationPropertyItem)) items!: GenerationPropertyItem;
  @serializable defaultValue!: string; // we always give string so based on the type of the property, we have to parse this to the appropriate format
  @serializable required!: boolean;
}
