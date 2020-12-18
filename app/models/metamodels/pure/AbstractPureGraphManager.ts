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

import { Entity } from 'SDLC/entity/Entity';
import { CLIENT_VERSION, ENTITY_PATH_DELIMITER } from 'MetaModelConst';
import { ProjectDependencyMetadata } from 'SDLC/configuration/ProjectDependency';
import { ExecuteInput } from 'EXEC/execution/ExecuteInput';
import { PackageableElement, PACKAGEABLE_ELEMENT_TYPE, getClassiferPathFromType } from 'MM/model/packageableElements/PackageableElement';
import { PureModel, CoreModel, SystemModel } from 'MM/PureModel';
import { Mapping } from 'MM/model/packageableElements/mapping/Mapping';
import { Runtime } from 'MM/model/packageableElements/runtime/Runtime';
import { BasicModel } from './BasicModel';
import { DependencyManager } from './DependencyManager';
import { Class } from 'MM/model/packageableElements/domain/Class';
import { Lambda } from 'MM/model/valueSpecification/raw/Lambda';
import { RootGraphFetchTree, GraphFetchTree } from 'MM/model/valueSpecification/raw/graph/GraphFetchTree';

// NOTE: this is a convenient shape to have, but it shouldn't really exist,
// hopefully, when we merge API specific code into V1 we can remove this
export interface PackageableElementObject {
  name: string;
  package: string;
  _type: string;
}

export const getElementPath = (elementObj: PackageableElementObject): string => `${elementObj.package}::${elementObj.name}`;

/* @MARKER: NEW ELEMENT TYPE SUPPORT --- consider adding new element type handler here whenever support for a new element type is added to the app */
export interface PureModelContextDataObject {
  _type: string;
  version: CLIENT_VERSION;
  serializer?: {
    name: string;
    version: string;
  };
  origin?: {
    _type: string;
    serializer: {
      name: string;
      version: string;
    }
  },
  elements: PackageableElementObject[];
}

export const elementProtocolToEntity = (graphManager: AbstractPureGraphManager, elementProtocol: PackageableElementObject): Entity => ({
  path: `${elementProtocol.package}${ENTITY_PATH_DELIMITER}${elementProtocol.name}`,
  content: elementProtocol,
  classifierPath: getClassiferPathFromType(graphManager.getTypeFromProtocolType(elementProtocol._type))
});

export const graphModelDataToEntities = (graphManager: AbstractPureGraphManager, graphModelData: Partial<PureModelContextDataObject>): Entity[] => [
  ...(graphModelData.elements ?? []),
].map(element => elementProtocolToEntity(graphManager, element));

export abstract class AbstractPureGraphManager {
  /**
   * Process entities and build model graph.
   * WIP: `TEMP_retainSection` is kept until we fully support sections in SDLC flow
   */
  abstract build(graph: PureModel, entities: Entity[], options?: { quiet?: boolean; TEMP_retainSection?: boolean }): Promise<void>

  /**
   * Build immutable models which holds system.
   * Ideally should only be build once since the elements will never change in these models
   * System models MUST not depend on the main model, nor dependency models.
   * TODO: legal entities are only for demo so should be removed eventually
   */
  abstract buildSystem(coreModel: CoreModel, systemModel: SystemModel, systemEntities: Entity[], legalModel: BasicModel, legalEntities: Entity[], quiet?: boolean): Promise<void>

  /**
   * Build immutable models which holds dependencies.
   * Dependency models MUST not depend on the main model.
   * TODO: Since in the future, we obviously do not want to have to call generation on model generations in dependency models, we will need
   * to leverage the metadata server (which has all models including the generated ones)
   * NOTE: loading all dependencies in the graph like this can be costly and definitely not scalable, so we might need to modify this in the future
   * As such, we might want to compress the dependency models to a smaller shape (or this could be done in the server) and only maintain that
   * so the app can use less memory
   */
  abstract buildDependencies(coreModel: CoreModel, systemModel: SystemModel, legalModel: BasicModel, dependencyManager: DependencyManager, projectDependencyMetadataMap: Map<string, ProjectDependencyMetadata>, quiet?: boolean): Promise<void>

  abstract buildGenerations(graph: PureModel, generationEntities: Map<string, Entity[]>, options?: { quiet?: boolean; TEMP_retainSection?: boolean }): Promise<void>
  /**
   * Transform/Serialize element to protocol JSON
   */
  abstract getPackageableElementProtocol<T>(element: PackageableElement): T

  /**
   * Create an empty PURE model context data
   * NOTE: the reason we have this method is that we want the pure model context data to be versioned
   */
  abstract createBareModelData(): PureModelContextDataObject

  /**
   * Create execution input
   * NOTE: the reason we have this method here is that we currently have `ExecuteInput` in V1 models, also we need to serialize
   * runtime to V1 runtime.
   */
  abstract createExecutionInput(graph: PureModel, mapping: Mapping, lambda: object, runtime: Runtime, clientVersion: string): ExecuteInput
  /**
   * Construct the PURE model context data and hashes index from entities
   */
  abstract getHashInfoAndModelDataFromEntities(entities: Entity[]): Promise<[Map<string, string>, PureModelContextDataObject]>

  /**
   * Get packageable element type from the protocol type
   */
  abstract getTypeFromProtocolType(protocolType: string): PACKAGEABLE_ELEMENT_TYPE

  /**
   * Get the model context data from the model
   * NOTE: we might need to make this non-blocking depending on how heavy this computation is
   */
  abstract getGraphModelData(graph: PureModel): PureModelContextDataObject

  /**
   * Get the compile context (project dependencies, generated elements, etc.) model data
   * NOTE: we might need to make this non-blocking depending on how heavy this computation is
   */
  abstract getCompileContextModelData(graph: PureModel): PureModelContextDataObject

  abstract combineGraphModelData(graphData1: PureModelContextDataObject, graphData2: PureModelContextDataObject): PureModelContextDataObject

  /**
   * Create PURE model context data from entities
   * NOTE: Since these 2 forms are equivalent and can be easily transformed into one another,
   * we don't need to deserialize the entities but rather moving JSON properties around
   */
  abstract buildModelDataFromEntities(entities: Entity[]): PureModelContextDataObject

  /**
   * Prune source information from protocol object
   *
   * NOTE: if we did this right initially, it is as easy as walking through the object
   * and prune any field with key `sourceInformation`, but we have introduced many specific
   * source information fields, such as `classSourceInformation` in Diagram or `elementSourceInformation
   * in connection, so we need to handle them all.
   */
  abstract pruneSourceInformation(object: object): Record<PropertyKey, unknown>

  /**
   * As the name suggested, these methods are temporary hacks until we support full function/value-specification
   */
  abstract HACKY_createParameterObject(name: string, type: string): object
  abstract HACKY_createGraphFetchLambda(graphFetchTree: GraphFetchTree, _class: Class): Lambda
  abstract HACKY_createGetAllLambda(_class: Class): Lambda
  abstract HACKY_createAssertLambda(assertData: string): Lambda
  abstract HACKY_extractCheckedModelToModelAssertionResult(query: Lambda): string | undefined
  abstract HACKY_extractAssertionString(query: Lambda): string | undefined
  abstract HACKY_deriveGraphFetchTreeContentFromQuery(query: Lambda, graph: PureModel, parentElement: PackageableElement): Class | RootGraphFetchTree | undefined
  abstract HACKY_isGetAllLambda(query: Lambda): boolean
}
