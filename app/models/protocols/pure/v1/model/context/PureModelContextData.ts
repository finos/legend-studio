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

import { deserialize, list, serializable, custom, SKIP } from 'serializr';
import { UnsupportedOperationError } from 'Utilities/GeneralUtil';
import { Entity } from 'SDLC/entity/Entity';
import { GraphDataParserError } from 'MetaModelUtility';
import { SectionIndex } from 'V1/model/packageableElements/section/SectionIndex';
import { Measure } from 'V1/model/packageableElements/domain/Measure';
import { GenerationSpecification } from 'V1/model/packageableElements/generationSpecification/GenerationSpecification';
import { Class } from 'V1/model/packageableElements/domain/Class';
import { Association } from 'V1/model/packageableElements/domain/Association';
import { ConcreteFunctionDefinition } from 'V1/model/packageableElements/function/ConcreteFunctionDefinition';
import { Enumeration } from 'V1/model/packageableElements/domain/Enumeration';
import { Profile } from 'V1/model/packageableElements/domain/Profile';
import { Mapping } from 'V1/model/packageableElements/mapping/Mapping';
import { Diagram } from 'V1/model/packageableElements/diagram/Diagram';
import { PureModelContext, PureModelContextType } from 'V1/model/context/PureModelContext';
import { PackageableElement, PackageableElementType } from 'V1/model/packageableElements/PackageableElement';
import { Text } from 'V1/model/packageableElements/text/Text';
import { FileGeneration } from 'V1/model/packageableElements/fileGeneration/FileGeneration';

export const deserializePackageableElement = (val: Record<PropertyKey, unknown>): PackageableElement => {
  switch (val._type) {
    /* @MARKER: NEW ELEMENT TYPE SUPPORT --- consider adding new element type handler here whenever support for a new element type is added to the app */
    case PackageableElementType.PROFILE: return deserialize(Profile, val);
    case PackageableElementType.CLASS: return deserialize(Class, val);
    case PackageableElementType.ENUMERATION: return deserialize(Enumeration, val);
    case PackageableElementType.ASSOCIATION: return deserialize(Association, val);
    case PackageableElementType.FUNCTION: return deserialize(ConcreteFunctionDefinition, val);
    case PackageableElementType.MEASURE: return deserialize(Measure, val);
    case PackageableElementType.MAPPING: return deserialize(Mapping, val);
    case PackageableElementType.DIAGRAM: return deserialize(Diagram, val);
    case PackageableElementType.TEXT: return deserialize(Text, val);
    case PackageableElementType.FILE_GENERATION: return deserialize(FileGeneration, val);
    case PackageableElementType.GENERATION_SPECIFICATION: return deserialize(GenerationSpecification, val);
    // case PackageableElementType.CONNECTION: return deserialize(PackageableConnection, val);
    // case PackageableElementType.RUNTIME: return deserialize(PackageableRuntime, val);
    // TODO: store
    case PackageableElementType.SECTION_INDEX: return deserialize(SectionIndex, val);
    default: throw new UnsupportedOperationError(`Can't deserialize element of unsupported type '${val._type}'`);
  }
};

export class PureModelContextData extends PureModelContext {
  @serializable _type = PureModelContextType.DATA;
  @serializable(list(custom(() => SKIP, val => deserializePackageableElement(val)))) elements: PackageableElement[] = [];

  /* @MARKER: NEW ELEMENT TYPE SUPPORT --- consider adding new element type handler here whenever support for a new element type is added to the app */
  async build(entities: Entity[] | undefined): Promise<void> {
    try {
      if (entities) {
        this.elements = await Promise.all<PackageableElement>(entities.map(e => new Promise((resolve, reject) => setTimeout(() => {
          try {
            resolve(deserializePackageableElement(e.content as unknown as Record<PropertyKey, unknown>));
          } catch (error) {
            reject(error);
          }
        }, 0))));
      }
    } catch (error) {
      // wrap all de-serializer error so we can handle them downstream
      throw new GraphDataParserError(error);
    }
  }
}
