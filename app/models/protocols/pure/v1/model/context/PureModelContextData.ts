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

import { deserialize, object, list, serializable } from 'serializr';
import { PROTOCOL_CLASSIFIER_PATH } from 'MetaModelConst';
import { Clazz } from 'Utilities/GeneralUtil';
import { Entity } from 'SDLC/entity/Entity';
import { GraphDataParserError } from 'MetaModelUtility';
import { SectionIndex } from 'V1/model/packageableElements/section/SectionIndex';
import { Measure } from 'V1/model/packageableElements/domain/Measure';
import { GenerationSpecification } from 'V1/model/packageableElements/generationSpecification/GenerationSpecification';
import { Class } from 'V1/model/packageableElements/domain/Class';
import { Association } from 'V1/model/packageableElements/domain/Association';
import { Enumeration } from 'V1/model/packageableElements/domain/Enumeration';
import { Profile } from 'V1/model/packageableElements/domain/Profile';
import { Mapping } from 'V1/model/packageableElements/mapping/Mapping';
import { Diagram } from 'V1/model/packageableElements/diagram/Diagram';
import { Domain } from 'V1/model/packageableElements/domain/Domain';
import { PureModelContext, PureModelContextType } from 'V1/model/context/PureModelContext';
import { PackageableElement } from 'V1/model/packageableElements/PackageableElement';
import { Text } from 'V1/model/packageableElements/text/Text';
import { ConcreteFunctionDefinition } from 'V1/model/packageableElements/function/ConcreteFunctionDefinition';
import { Store } from 'V1/model/packageableElements/store/Store';
import { PackageableRuntime } from 'V1/model/packageableElements/runtime/PackageableRuntime';
import { PackageableConnection } from 'V1/model/packageableElements/connection/PackageableConnection';
import { FileGeneration } from 'V1/model/packageableElements/fileGeneration/FileGeneration';

export class PureModelContextData extends PureModelContext {
  @serializable _type = PureModelContextType.DATA;
  /* @MARKER: NEW ELEMENT TYPE SUPPORT --- consider adding new element type handler here whenever support for a new element type is added to the app */
  @serializable(object(Domain)) domain = new Domain();
  stores: Store[] = [];
  @serializable(list(object(Mapping))) mappings: Mapping[] = [];
  @serializable(list(object(Diagram))) diagrams: Diagram[] = [];
  @serializable(list(object(Text))) texts: Text[] = [];
  @serializable(list(object(PackageableRuntime))) runtimes: PackageableRuntime[] = [];
  @serializable(list(object(PackageableConnection))) connections: PackageableConnection[] = [];
  @serializable(list(object(FileGeneration))) fileGenerations: FileGeneration[] = [];
  @serializable(list(object(GenerationSpecification))) generationSpecifications: GenerationSpecification[] = [];
  @serializable(list(object(SectionIndex))) sectionIndices: SectionIndex[] = [];

  /* @MARKER: NEW ELEMENT TYPE SUPPORT --- consider adding new element type handler here whenever support for a new element type is added to the app */
  async build(entities: Entity[] | undefined): Promise<void> {
    try {
      if (entities?.length) {
        const buildEntitiesForType = async <T>(ents: Entity[], type: Clazz<T>): Promise<T[]> => ents.length
          ? Promise.all<T>(ents.map(e => new Promise((resolve, reject) => setTimeout(() => {
            try {
              resolve(deserialize(type, e.content));
            } catch (error) {
              reject(error);
            }
          }, 0))))
          : [];
        this.domain.profiles = await buildEntitiesForType(entities.filter(e => e.classifierPath === PROTOCOL_CLASSIFIER_PATH.PROFILE), Profile);
        this.domain.enums = await buildEntitiesForType(entities.filter(e => e.classifierPath === PROTOCOL_CLASSIFIER_PATH.ENUMERATION), Enumeration);
        this.domain.measures = await buildEntitiesForType(entities.filter(e => e.classifierPath === PROTOCOL_CLASSIFIER_PATH.MEASURE), Measure);
        this.domain.classes = await buildEntitiesForType(entities.filter(e => e.classifierPath === PROTOCOL_CLASSIFIER_PATH.CLASS), Class);
        this.domain.functions = await buildEntitiesForType(entities.filter(e => e.classifierPath === PROTOCOL_CLASSIFIER_PATH.FUNCTION), ConcreteFunctionDefinition);
        this.domain.associations = await buildEntitiesForType(entities.filter(e => e.classifierPath === PROTOCOL_CLASSIFIER_PATH.ASSOCIATION), Association);
        this.stores = [];
        this.mappings = await buildEntitiesForType(entities.filter(e => e.classifierPath === PROTOCOL_CLASSIFIER_PATH.MAPPING), Mapping);
        this.diagrams = await buildEntitiesForType(entities.filter(e => e.classifierPath === PROTOCOL_CLASSIFIER_PATH.DIAGRAM), Diagram);
        this.texts = await buildEntitiesForType(entities.filter(e => e.classifierPath === PROTOCOL_CLASSIFIER_PATH.TEXT), Text);
        this.connections = await buildEntitiesForType(entities.filter(e => e.classifierPath === PROTOCOL_CLASSIFIER_PATH.CONNECTION), PackageableConnection);
        this.runtimes = await buildEntitiesForType(entities.filter(e => e.classifierPath === PROTOCOL_CLASSIFIER_PATH.RUNTIME), PackageableRuntime);
        this.fileGenerations = await buildEntitiesForType(entities.filter(e => e.classifierPath === PROTOCOL_CLASSIFIER_PATH.FILE_GENERATION), FileGeneration);
        this.generationSpecifications = await buildEntitiesForType(entities.filter(e => e.classifierPath === PROTOCOL_CLASSIFIER_PATH.GENERATION_SPECIFICATION), GenerationSpecification);
        this.sectionIndices = await buildEntitiesForType(entities.filter(e => e.classifierPath === PROTOCOL_CLASSIFIER_PATH.SECTION_INDEX), SectionIndex);
      }
    } catch (error) {
      // wrap all de-serializer error so we can handle them downstream
      throw new GraphDataParserError(error);
    }
  }

  /* @MARKER: NEW ELEMENT TYPE SUPPORT --- consider adding new element type handler here whenever support for a new element type is added to the app */
  get types(): PackageableElement[] {
    return [
      ...this.domain.profiles,
      ...this.domain.enums,
      ...this.domain.measures,
      ...this.domain.classes,
      ...this.domain.associations,
      ...this.domain.functions
    ];
  }

  /* @MARKER: NEW ELEMENT TYPE SUPPORT --- consider adding new element type handler here whenever support for a new element type is added to the app */
  get elements(): PackageableElement[] {
    return [
      ...this.types,
      ...this.stores,
      ...this.mappings,
      ...this.diagrams,
      ...this.texts,
      ...this.runtimes,
      ...this.connections,
      ...this.fileGenerations,
      ...this.generationSpecifications,
      ...this.sectionIndices,
    ];
  }
}
