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

export type RawMappingModelCoverageAnalysisResult = object;

export class MappedEntity {
  readonly __PROPERTIES_INDEX = new Map<string, MappedProperty>();

  path: string;
  properties: MappedProperty[];

  constructor(path: string, properties: MappedProperty[]) {
    this.path = path;
    this.properties = properties;
    properties.forEach((property) =>
      this.__PROPERTIES_INDEX.set(property.name, property),
    );
  }
}

export class MappedProperty {
  name: string;

  constructor(name: string) {
    this.name = name;
  }
}

export class EntityMappedProperty extends MappedProperty {
  entityPath: string;
  /**
   * If this attribute is set, we need to understand this `mapped property` slightly differently
   * as this will represent a subtype of the class corresponding to the parent mapped entity.
   *
   * For example: class A extends B, assuming that A is mapped and B is mapped, in the list of
   * mapped properties of B, we should see a mapped property with subtype A.
   */
  subType: string | undefined;

  constructor(name: string, entityPath: string, subType: string | undefined) {
    super(name);
    this.entityPath = entityPath;
    this.subType = subType;
  }
}

export class EnumMappedProperty extends MappedProperty {
  enumPath: string;

  constructor(name: string, enumPath: string) {
    super(name);
    this.enumPath = enumPath;
  }
}

export class MappingModelCoverageAnalysisResult {
  readonly __ENTITIES_INDEX = new Map<string, MappedEntity>();

  mappedEntities: MappedEntity[];

  constructor(mappedEntities: MappedEntity[]) {
    this.mappedEntities = mappedEntities;
    mappedEntities.forEach((entity) =>
      this.__ENTITIES_INDEX.set(entity.path, entity),
    );
  }
}
