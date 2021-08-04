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

import type { Entity } from '../../../sdlc/models/entity/Entity';
import type { ProjectDependencyMetadata } from '../../../sdlc/models/configuration/ProjectDependency';
import type { ExecutionResult } from '../action/execution/ExecutionResult';
import type { ServiceRegistrationResult } from '../action/service/ServiceRegistrationResult';
import type { Service } from '../model/packageableElements/service/Service';
import type {
  ImportConfigurationDescription,
  ImportMode,
} from '../action/generation/ImportConfigurationDescription';
import type {
  FileGenerationSpecification,
  GenerationMode,
} from '../model/packageableElements/fileGeneration/FileGenerationSpecification';
import type { GenerationOutput } from '../action/generation/GenerationOutput';
import type { ServiceTestResult } from '../action/service/ServiceTestResult';
import type { PackageableElement } from '../model/packageableElements/PackageableElement';
import type { PureModel, CoreModel, SystemModel } from '../graph/PureModel';
import type { Mapping } from '../model/packageableElements/mapping/Mapping';
import type { Runtime } from '../model/packageableElements/runtime/Runtime';
import type { DependencyManager } from './DependencyManager';
import type { Class } from '../model/packageableElements/domain/Class';
import type { RawLambda } from '../model/rawValueSpecification/RawLambda';
import type { GenerationConfigurationDescription } from '../action/generation/GenerationConfigurationDescription';
import type { ValueSpecification } from '../model/valueSpecification/ValueSpecification';
import type { RawValueSpecification } from '../model/rawValueSpecification/RawValueSpecification';
import type { ServiceExecutionMode } from '../action/service/ServiceExecutionMode';
import type { AbstractEngineConfig } from '../action/AbstractEngineConfiguration';
import type { PluginManager } from '../../../../application/PluginManager';
import type { DatabaseBuilderInput } from '../action/generation/DatabaseBuilderInput';
import type { PureProtocolProcessorPlugin } from '../../../protocols/pure/PureProtocolProcessorPlugin';
import type { PureGraphManagerPlugin } from './PureGraphManagerPlugin';
import type { ServerClientConfig } from '@finos/legend-studio-network';
import type { RawRelationalOperationElement } from '../model/packageableElements/store/relational/model/RawRelationalOperationElement';
import type {
  ExecutionPlan,
  RawExecutionPlan,
} from '../model/executionPlan/ExecutionPlan';
import type { ExecutionNode } from '../model/executionPlan/nodes/ExecutionNode';
import type { GeneratorFn } from '@finos/legend-studio-shared';
import type { LightQuery, Query } from '../action/query/Query';

export interface EngineSetupConfig {
  env: string;
  tabSize: number;
  clientConfig: ServerClientConfig;
}

export interface GraphBuilderOptions {
  quiet?: boolean;
  // the `keepSectionIndex` flag is kept until we have stable support and enable usage of section index.
  TEMPORARY__keepSectionIndex?: boolean;
  // when we change our handling of section index, we should be able to get rid of this flag.
  TEMPORARY__disableRawLambdaResolver?: boolean;
}

export abstract class AbstractPureGraphManager {
  pureGraphManagerPlugins: PureGraphManagerPlugin[] = [];
  pureProtocolProcessorPlugins: PureProtocolProcessorPlugin[] = [];

  constructor(
    pureGraphManagerPlugins: PureGraphManagerPlugin[],
    pureProtocolProcessorPlugins: PureProtocolProcessorPlugin[],
  ) {
    this.pureGraphManagerPlugins = pureGraphManagerPlugins;
    this.pureProtocolProcessorPlugins = pureProtocolProcessorPlugins;
  }

  abstract getEngineConfig(): AbstractEngineConfig;

  abstract setupEngine(
    pluginManager: PluginManager,
    config: EngineSetupConfig,
  ): GeneratorFn<void>;

  // --------------------------------------------- Graph Builder ---------------------------------------------

  /**
   * Build immutable system models
   *
   * NOTE: Ideally should only be build once since the elements will never change in these models
   * System models MUST not depend on the main model, dependency models, nor generation models.
   */
  abstract buildSystem(
    coreModel: CoreModel,
    systemModel: SystemModel,
    options?: GraphBuilderOptions,
  ): GeneratorFn<void>;

  /**
   * Process entities and build the main graph.
   */
  abstract buildGraph(
    graph: PureModel,
    entities: Entity[],
    options?: GraphBuilderOptions,
  ): GeneratorFn<void>;

  /**
   * Build immutable models which holds dependencies.
   * Dependency models MUST not depend on the main model.
   *
   * NOTE: loading all dependencies in the graph like this can be costly and definitely not scalable, so we might need to modify this in the future
   * As such, we might want to compress the dependency models to a smaller shape (or this could be done in the server) and only maintain that
   * so the app can use less memory
   */
  abstract buildDependencies(
    coreModel: CoreModel,
    systemModel: SystemModel,
    dependencyManager: DependencyManager,
    projectDependencyMetadataMap: Map<string, ProjectDependencyMetadata>,
    options?: GraphBuilderOptions,
  ): GeneratorFn<void>;

  abstract buildGenerations(
    graph: PureModel,
    generationEntities: Map<string, Entity[]>,
    options?: GraphBuilderOptions,
  ): GeneratorFn<void>;

  // ------------------------------------------- Grammar -------------------------------------------

  abstract graphToPureCode(graph: PureModel): Promise<string>;
  abstract pureCodeToEntities(code: string): Promise<Entity[]>;
  abstract entitiesToPureCode(entities: Entity[]): Promise<string>;
  abstract pureCodeToLambda(
    lambda: string,
    lambdaId?: string,
  ): Promise<RawLambda | undefined>;
  abstract lambdaToPureCode(
    lambda: RawLambda,
    lambdaId?: string,
    pretty?: boolean,
  ): Promise<string>;
  abstract lambdasToPureCode(
    lambdas: Map<string, RawLambda>,
    pretty?: boolean,
  ): Promise<Map<string, string>>;

  // TODO: consider moving these to relational plugin when we complete modularization
  abstract pureCodeToRelationalOperationElement(
    operation: string,
    operationId: string,
  ): Promise<RawRelationalOperationElement | undefined>;
  abstract relationalOperationElementToPureCode(
    operations: Map<string, RawRelationalOperationElement>,
  ): Promise<Map<string, string>>;

  // ------------------------------------------- Compile -------------------------------------------

  abstract compileGraph(
    graph: PureModel,
    options?: { onError?: () => void; keepSourceInformation?: boolean },
  ): Promise<void>;
  abstract compileText(
    graphGrammar: string,
    graph: PureModel,
    options?: { onError?: () => void },
  ): Promise<Entity[]>;
  abstract getLambdaReturnType(
    lambda: RawLambda,
    graph: PureModel,
    options?: { keepSourceInformation?: boolean },
  ): Promise<string>;

  // ------------------------------------------- ValueSpecification  -------------------------------------------

  abstract buildValueSpecification(
    valueSpecificationJson: Record<PropertyKey, unknown>,
    graph: PureModel,
  ): ValueSpecification;
  abstract serializeValueSpecification(
    valueSpecification: ValueSpecification,
  ): Record<PropertyKey, unknown>;
  abstract buildRawValueSpecification(
    valueSpecification: ValueSpecification,
    graph: PureModel,
  ): RawValueSpecification;
  abstract serializeRawValueSpecification(
    rawValueSpecification: RawValueSpecification,
  ): Record<PropertyKey, unknown>;

  // ------------------------------------------- Generation -------------------------------------------

  abstract getAvailableGenerationConfigurationDescriptions(): Promise<
    GenerationConfigurationDescription[]
  >;
  abstract generateFile(
    fileGeneration: FileGenerationSpecification,
    generationMode: GenerationMode,
    graph: PureModel,
  ): Promise<GenerationOutput[]>;
  abstract generateModel(
    generationElement: PackageableElement,
    graph: PureModel,
  ): Promise<Entity[]>;

  // ------------------------------------------- Import -------------------------------------------

  abstract getAvailableImportConfigurationDescriptions(): Promise<
    ImportConfigurationDescription[]
  >;
  abstract externalFormatTextToEntities(
    code: string,
    type: string,
    mode: ImportMode,
  ): Promise<Entity[]>;
  abstract getExamplePureProtocolText(): string;
  abstract getExampleExternalFormatImportText(): string;
  abstract entitiesToPureProtocolText(entities: Entity[]): Promise<string>;
  abstract pureProtocolToEntities(protocol: string): Entity[];

  // ------------------------------------------- Execute -------------------------------------------

  abstract executeMapping(
    graph: PureModel,
    mapping: Mapping,
    lambda: RawLambda,
    runtime: Runtime,
    clientVersion: string,
    /**
     * Use lossless algorithm while parsing the execution result object.
     * NOTE: This will result in numeric values being stored as object instead of primitive type number values.
     */
    lossless: boolean,
  ): Promise<ExecutionResult>;

  abstract generateMappingTestData(
    graph: PureModel,
    mapping: Mapping,
    lambda: RawLambda,
    runtime: Runtime,
    clientVersion: string,
  ): Promise<string>;

  abstract generateExecutionPlan(
    graph: PureModel,
    mapping: Mapping,
    lambda: RawLambda,
    runtime: Runtime,
    clientVersion: string,
  ): Promise<RawExecutionPlan>;

  abstract buildExecutionPlan(
    executionPlanJson: RawExecutionPlan,
    graph: PureModel,
  ): ExecutionPlan;

  abstract serializeExecutionPlan(
    executionPlan: ExecutionPlan,
  ): RawExecutionPlan;

  abstract serializeExecutionNode(executionNode: ExecutionNode): object;

  // ------------------------------------------- Service -------------------------------------------

  abstract registerService(
    graph: PureModel,
    service: Service,
    projectId: string,
    server: string,
    executionMode: ServiceExecutionMode,
    version: string | undefined,
  ): Promise<ServiceRegistrationResult>;
  abstract runServiceTests(
    service: Service,
    graph: PureModel,
  ): Promise<ServiceTestResult[]>;
  abstract activateService(
    serviceUrl: string,
    serviceId: string,
  ): Promise<void>;

  // ------------------------------------------- Query -------------------------------------------

  abstract getQueries(
    showOwnQueryOnly: boolean | undefined,
    limit: number | undefined,
  ): Promise<LightQuery[]>;
  abstract getLightQuery(queryId: string): Promise<LightQuery>;
  abstract getQuery(queryId: string, graph: PureModel): Promise<Query>;
  abstract createQuery(query: Query): Promise<void>;
  abstract updateQuery(query: Query): Promise<void>;

  // ------------------------------------------- Utilities -------------------------------------------

  abstract buildDatabase(
    databaseBuilderInput: DatabaseBuilderInput,
  ): Promise<Entity[]>;

  // ------------------------------------------- Change detection -------------------------------------------

  abstract buildHashesIndex(entities: Entity[]): Promise<Map<string, string>>;

  // ------------------------------------------- Raw Protocol Handling -------------------------------------------
  // This is the set of method that exposes the protocol out into the app, these are for readonly purpose like
  // displaying, or for interacting with SDLC server.
  // As such, most of these methods will only deal with `string` or `plain object`

  /**
   * Prune source information from protocol object
   *
   * NOTE: if we did this right initially, it is as easy as walking through the object and prune
   * any field with key `sourceInformation`, but we have introduced many specific source information
   * fields, such as `elementSourceInformation in connection, so we need to handle them all.
   */
  abstract pruneSourceInformation(object: object): Record<PropertyKey, unknown>;
  abstract elementToEntity(
    element: PackageableElement,
    pruneSourceInformation?: boolean,
  ): Entity;

  // --------------------------------------------- HACKY ---------------------------------------------
  // As the name suggested, these methods are temporary hacks since we don't handle value-specification
  // structurally in Studio

  abstract HACKY_createGetAllLambda(_class: Class): RawLambda;
  abstract HACKY_createServiceTestAssertLambda(assertData: string): RawLambda;
  abstract HACKY_extractServiceTestAssertionData(
    query: RawLambda,
  ): string | undefined;
}
