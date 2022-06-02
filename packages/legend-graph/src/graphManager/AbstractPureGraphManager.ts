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

import type {
  ExecutionResult,
  EXECUTION_SERIALIZATION_FORMAT,
} from './action/execution/ExecutionResult.js';
import type { ServiceRegistrationResult } from './action/service/ServiceRegistrationResult.js';
import type { Service } from '../models/metamodels/pure/packageableElements/service/Service.js';
import type {
  ImportConfigurationDescription,
  ImportMode,
} from './action/generation/ImportConfigurationDescription.js';
import type { FileGenerationSpecification } from '../models/metamodels/pure/packageableElements/fileGeneration/FileGenerationSpecification.js';
import type { GenerationOutput } from './action/generation/GenerationOutput.js';
import type { PackageableElement } from '../models/metamodels/pure/packageableElements/PackageableElement.js';
import type { PureModel, CoreModel, SystemModel } from '../graph/PureModel.js';
import type { Mapping } from '../models/metamodels/pure/packageableElements/mapping/Mapping.js';
import type { Runtime } from '../models/metamodels/pure/packageableElements/runtime/Runtime.js';
import type { DependencyManager } from '../graph/DependencyManager.js';
import type { Class } from '../models/metamodels/pure/packageableElements/domain/Class.js';
import type { RawLambda } from '../models/metamodels/pure/rawValueSpecification/RawLambda.js';
import type {
  GenerationConfigurationDescription,
  GenerationMode,
} from './action/generation/GenerationConfigurationDescription.js';
import type { ValueSpecification } from '../models/metamodels/pure/valueSpecification/ValueSpecification.js';
import type { RawValueSpecification } from '../models/metamodels/pure/rawValueSpecification/RawValueSpecification.js';
import type { ServiceExecutionMode } from './action/service/ServiceExecutionMode.js';
import type { TEMPORARY__AbstractEngineConfig } from './action/TEMPORARY__AbstractEngineConfig.js';
import type { DatabaseBuilderInput } from './action/generation/DatabaseBuilderInput.js';
import type { RawRelationalOperationElement } from '../models/metamodels/pure/packageableElements/store/relational/model/RawRelationalOperationElement.js';
import type {
  ExecutionPlan,
  RawExecutionPlan,
} from '../models/metamodels/pure/executionPlan/ExecutionPlan.js';
import type { ExecutionNode } from '../models/metamodels/pure/executionPlan/nodes/ExecutionNode.js';
import type {
  ActionState,
  Log,
  ServerClientConfig,
  TracerService,
} from '@finos/legend-shared';
import type { LightQuery, Query } from './action/query/Query.js';
import type { Entity } from '@finos/legend-model-storage';
import type { GraphPluginManager } from '../GraphPluginManager.js';
import type { QuerySearchSpecification } from './action/query/QuerySearchSpecification.js';
import type { ExternalFormatDescription } from './action/externalFormat/ExternalFormatDescription.js';
import type { ConfigurationProperty } from '../models/metamodels/pure/packageableElements/fileGeneration/ConfigurationProperty.js';
import type { GraphBuilderReport } from './GraphBuilderReport.js';
import type { ModelGenerationConfiguration } from '../models/ModelGenerationConfiguration.js';
import type { DEPRECATED__ServiceTestResult } from './action/service/DEPRECATED__ServiceTestResult.js';
import type { RunTestsTestableInput } from '../models/metamodels/pure/test/result/RunTestsTestableInput.js';
import type { TestResult } from '../models/metamodels/pure/test/result/TestResult.js';

export interface TEMPORARY__EngineSetupConfig {
  env: string;
  tabSize: number;
  clientConfig: ServerClientConfig & {
    queryBaseUrl?: string | undefined;
  };
}

export interface GraphBuilderOptions {
  /**
   * This flag will be kept until we have full support for section index
   * See https://github.com/finos/legend-studio/issues/1067
   */
  TEMPORARY__preserveSectionIndex?: boolean;
}

export interface ExecutionOptions {
  /**
   * Use lossless algorithm while parsing the execution result object.
   * NOTE: This will result in numeric values being stored as object instead of primitive type number values.
   */
  useLosslessParse?: boolean | undefined;
  serializationFormat?: EXECUTION_SERIALIZATION_FORMAT | undefined;
}

export abstract class AbstractPureGraphManager {
  pluginManager: GraphPluginManager;
  log: Log;

  constructor(pluginManager: GraphPluginManager, log: Log) {
    this.pluginManager = pluginManager;
    this.log = log;
  }

  /**
   * TODO: we should not expose a fixed config like this, we probably
   * should not mention anything about engine because it is an internal construct
   * used by the graph manager, different graph manager may not need engine.
   *
   * As such, we should expose a generic config instead.
   * See https://github.com/finos/legend-studio/issues/407
   */
  abstract TEMPORARY__getEngineConfig(): TEMPORARY__AbstractEngineConfig;

  abstract initialize(
    config: TEMPORARY__EngineSetupConfig,
    options?: {
      tracerService?: TracerService | undefined;
    },
  ): Promise<void>;

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
    buildState: ActionState,
    options?: GraphBuilderOptions,
  ): Promise<GraphBuilderReport>;

  /**
   * Process entities and build the main graph.
   */
  abstract buildGraph(
    graph: PureModel,
    entities: Entity[],
    buildState: ActionState,
    options?: GraphBuilderOptions,
  ): Promise<GraphBuilderReport>;

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
    dependencyEntitiesMap: Map<string, Entity[]>,
    buildState: ActionState,
    options?: GraphBuilderOptions,
  ): Promise<GraphBuilderReport>;

  abstract buildGenerations(
    graph: PureModel,
    generationEntities: Map<string, Entity[]>,
    buildState: ActionState,
    options?: GraphBuilderOptions,
  ): Promise<GraphBuilderReport>;

  // ------------------------------------------- Grammar -------------------------------------------

  abstract graphToPureCode(graph: PureModel): Promise<string>;
  abstract pureCodeToEntities(
    code: string,
    options?: {
      TEMPORARY__keepSectionIndex?: boolean;
    },
  ): Promise<Entity[]>;
  abstract entitiesToPureCode(entities: Entity[]): Promise<string>;
  abstract pureCodeToLambda(
    lambda: string,
    lambdaId?: string,
  ): Promise<RawLambda>;
  abstract lambdaToPureCode(
    lambda: RawLambda,
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
  ): Promise<RawRelationalOperationElement>;
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

  // ------------------------------------------- Test  -------------------------------------------

  abstract runTests(
    inputs: RunTestsTestableInput[],
    graph: PureModel,
  ): Promise<TestResult[]>;

  // ------------------------------------------- Value Specification  -------------------------------------------

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
  abstract generateModelFromConfiguration(
    config: ModelGenerationConfiguration,
    graph: PureModel,
  ): Promise<Entity[]>;

  // ------------------------------------------- External Format ----------------------------------

  abstract getAvailableExternalFormatsDescriptions(): Promise<
    ExternalFormatDescription[]
  >;

  abstract generateModelFromExternalFormat(
    configs: ConfigurationProperty[],
    graph: PureModel,
  ): Promise<string>;

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
  abstract pureProtocolTextToEntities(protocol: string): Entity[];

  // ------------------------------------------- Execute -------------------------------------------

  abstract executeMapping(
    graph: PureModel,
    mapping: Mapping,
    lambda: RawLambda,
    runtime: Runtime,
    clientVersion: string,
    options?: ExecutionOptions,
  ): Promise<ExecutionResult>;

  abstract generateExecutionPlan(
    graph: PureModel,
    mapping: Mapping,
    lambda: RawLambda,
    runtime: Runtime,
    clientVersion: string,
  ): Promise<RawExecutionPlan>;

  abstract debugExecutionPlanGeneration(
    graph: PureModel,
    mapping: Mapping,
    lambda: RawLambda,
    runtime: Runtime,
    clientVersion: string,
  ): Promise<{ plan: RawExecutionPlan; debug: string }>;

  abstract buildExecutionPlan(
    executionPlanJson: RawExecutionPlan,
    graph: PureModel,
  ): ExecutionPlan;

  abstract serializeExecutionPlan(
    executionPlan: ExecutionPlan,
  ): RawExecutionPlan;

  abstract serializeExecutionNode(executionNode: ExecutionNode): object;

  abstract generateMappingTestData(
    graph: PureModel,
    mapping: Mapping,
    lambda: RawLambda,
    runtime: Runtime,
    clientVersion: string,
    parameters: (string | number | boolean)[],
    options?: {
      // Anonymizes data by hashing any string values in the generated data
      anonymizeGeneratedData?: boolean;
    },
  ): Promise<string>;

  // ------------------------------------------- Service -------------------------------------------

  abstract registerService(
    graph: PureModel,
    service: Service,
    groupId: string,
    artifactId: string,
    server: string,
    executionMode: ServiceExecutionMode,
    version: string | undefined,
  ): Promise<ServiceRegistrationResult>;
  abstract activateService(
    serviceUrl: string,
    serviceId: string,
  ): Promise<void>;

  /**
   * @deprecated
   */
  abstract runLegacyServiceTests(
    service: Service,
    graph: PureModel,
  ): Promise<DEPRECATED__ServiceTestResult[]>;

  // ------------------------------------------- Query -------------------------------------------

  abstract searchQueries(
    searchSpecification: QuerySearchSpecification,
  ): Promise<LightQuery[]>;
  abstract getLightQuery(queryId: string): Promise<LightQuery>;
  abstract getQuery(queryId: string, graph: PureModel): Promise<Query>;
  abstract getQueryContent(queryId: string): Promise<string>;
  abstract createQuery(query: Query, graph: PureModel): Promise<Query>;
  abstract updateQuery(query: Query, graph: PureModel): Promise<Query>;
  abstract deleteQuery(queryId: string): Promise<void>;

  // ------------------------------------------- Legend Query -------------------------------------

  abstract buildGraphForCreateQuerySetup(
    graph: PureModel,
    entities: Entity[],
    dependencyEntitiesMap: Map<string, Entity[]>,
  ): Promise<void>;

  abstract buildGraphForServiceQuerySetup(
    graph: PureModel,
    entities: Entity[],
    dependencyEntitiesMap: Map<string, Entity[]>,
  ): Promise<void>;

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

  abstract pruneSourceInformation(object: object): Record<PropertyKey, unknown>;
  abstract elementToEntity(
    element: PackageableElement,
    pruneSourceInformation?: boolean,
  ): Entity;

  // --------------------------------------------- HACKY ---------------------------------------------
  // As the name suggested, these methods are temporary hacks since we don't handle value-specification
  // structurally in Studio

  // Eventually, we could remove these method by building them in metamodel form and convert to raw form
  // as these are relatively simple lambda to construct
  abstract HACKY__createGetAllLambda(_class: Class): RawLambda;
  abstract HACKY__createDefaultBlankLambda(): RawLambda;

  // NOTE: after we refactor service, we probably can remove these methods
  // See https://github.com/finos/legend-studio/issues/1077
  abstract HACKY__createServiceTestAssertLambda(assertData: string): RawLambda;
  abstract HACKY__extractServiceTestAssertionData(
    query: RawLambda,
  ): string | undefined;
}
