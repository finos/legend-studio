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
  ExecutionResultWithMetadata,
} from './action/execution/ExecutionResult.js';
import type {
  ServiceRegistrationResult,
  ServiceRegistrationSuccess,
} from './action/service/ServiceRegistrationResult.js';
import type { Service } from '../graph/metamodel/pure/packageableElements/service/Service.js';
import type { FileGenerationSpecification } from '../graph/metamodel/pure/packageableElements/fileGeneration/FileGenerationSpecification.js';
import type { GenerationOutput } from './action/generation/GenerationOutput.js';
import type { PackageableElement } from '../graph/metamodel/pure/packageableElements/PackageableElement.js';
import {
  PureModel,
  CoreModel,
  SystemModel,
  GenerationModel,
  type GraphTextInputOption,
} from '../graph/PureModel.js';
import type { Mapping } from '../graph/metamodel/pure/packageableElements/mapping/Mapping.js';
import type { Runtime } from '../graph/metamodel/pure/packageableElements/runtime/Runtime.js';
import { DependencyManager } from '../graph/DependencyManager.js';
import type { Class } from '../graph/metamodel/pure/packageableElements/domain/Class.js';
import type { RawLambda } from '../graph/metamodel/pure/rawValueSpecification/RawLambda.js';
import type {
  GenerationConfigurationDescription,
  GenerationMode,
} from './action/generation/GenerationConfigurationDescription.js';
import type { ValueSpecification } from '../graph/metamodel/pure/valueSpecification/ValueSpecification.js';
import type { RawValueSpecification } from '../graph/metamodel/pure/rawValueSpecification/RawValueSpecification.js';
import type { ServiceExecutionMode } from './action/service/ServiceExecutionMode.js';
import type { TEMPORARY__AbstractEngineConfig } from './action/TEMPORARY__AbstractEngineConfig.js';
import type { DatabaseBuilderInput } from './action/generation/DatabaseBuilderInput.js';
import type { RawRelationalOperationElement } from '../graph/metamodel/pure/packageableElements/store/relational/model/RawRelationalOperationElement.js';
import type {
  ExecutionPlan,
  RawExecutionPlan,
} from '../graph/metamodel/pure/executionPlan/ExecutionPlan.js';
import type { ExecutionNode } from '../graph/metamodel/pure/executionPlan/nodes/ExecutionNode.js';
import {
  type ContentType,
  type LogService,
  type PlainObject,
  type ServerClientConfig,
  type TracerService,
  ActionState,
} from '@finos/legend-shared';
import type { LightQuery, Query, QueryInfo } from './action/query/Query.js';
import type { EntitiesWithOrigin, Entity } from '@finos/legend-storage';
import type { QuerySearchSpecification } from './action/query/QuerySearchSpecification.js';
import type { ExternalFormatDescription } from './action/externalFormat/ExternalFormatDescription.js';
import type { ConfigurationProperty } from '../graph/metamodel/pure/packageableElements/fileGeneration/ConfigurationProperty.js';
import type { GraphManagerOperationReport } from './GraphManagerStatistics.js';
import type { RunTestsTestableInput } from '../graph/metamodel/pure/test/result/RunTestsTestableInput.js';
import type { TestResult } from '../graph/metamodel/pure/test/result/TestResult.js';
import type { GraphManagerPluginManager } from './GraphManagerPluginManager.js';
import type {
  MappingModelCoverageAnalysisResult,
  RawMappingModelCoverageAnalysisResult,
} from './action/analytics/MappingModelCoverageAnalysis.js';
import type { SchemaSet } from '../graph/metamodel/pure/packageableElements/externalFormat/schemaSet/DSL_ExternalFormat_SchemaSet.js';
import type {
  CompilationResult,
  TextCompilationResult,
} from './action/compilation/CompilationResult.js';
import type {
  ParameterValue,
  PostValidationAssertionResult,
} from '../DSL_Service_Exports.js';
import type { ModelUnit } from '../graph/metamodel/pure/packageableElements/externalFormat/store/DSL_ExternalFormat_ModelUnit.js';
import type {
  DatasetEntitlementReport,
  DatasetSpecification,
} from './action/analytics/StoreEntitlementAnalysis.js';
import type { GraphDataOrigin } from '../graph/GraphDataOrigin.js';
import type { GraphData } from './GraphData.js';
import type { DEPRECATED__MappingTest } from '../graph/metamodel/pure/packageableElements/mapping/DEPRECATED__MappingTest.js';
import type { EnumerationMapping } from '../graph/metamodel/pure/packageableElements/mapping/EnumerationMapping.js';
import type { SetImplementation } from '../graph/metamodel/pure/packageableElements/mapping/SetImplementation.js';
import type { AssociationImplementation } from '../graph/metamodel/pure/packageableElements/mapping/AssociationImplementation.js';
import { InstanceSetImplementation } from '../graph/metamodel/pure/packageableElements/mapping/InstanceSetImplementation.js';
import { EmbeddedFlatDataPropertyMapping } from '../graph/metamodel/pure/packageableElements/store/flatData/mapping/EmbeddedFlatDataPropertyMapping.js';
import { EmbeddedRelationalInstanceSetImplementation } from '../graph/metamodel/pure/packageableElements/store/relational/mapping/EmbeddedRelationalInstanceSetImplementation.js';
import type { SourceInformation } from './action/SourceInformation.js';
import type {
  ClassifierPathMapping,
  SubtypeInfo,
} from './action/protocol/ProtocolInfo.js';
import type { FunctionActivatorConfiguration } from './action/functionActivator/FunctionActivatorConfiguration.js';
import type { RelationalDatabaseTypeConfiguration } from './action/relational/RelationalDatabaseTypeConfiguration.js';
import type { FunctionActivator } from '../graph/metamodel/pure/packageableElements/function/FunctionActivator.js';
import type { RelationalDatabaseConnection } from '../STO_Relational_Exports.js';
import type { ArtifactGenerationExtensionResult } from './action/generation/ArtifactGenerationExtensionResult.js';
import type { TestDataGenerationResult } from '../graph/metamodel/pure/packageableElements/service/TestGenerationResult.js';
import type { TableRowIdentifiers } from '../graph/metamodel/pure/packageableElements/service/TableRowIdentifiers.js';
import type { EngineError } from './action/EngineError.js';
import type { TestDebug } from '../graph/metamodel/pure/test/result/DebugTestsResult.js';
import type { RelationTypeMetadata } from './action/relation/RelationTypeMetadata.js';
import type { CodeCompletionResult } from './action/compilation/Completion.js';
import type { DeploymentResult } from './action/DeploymentResult.js';
import type {
  LightPersistentDataCube,
  PersistentDataCube,
} from './action/query/PersistentDataCube.js';

export interface TEMPORARY__EngineSetupConfig {
  env: string;
  tabSize: number;
  clientConfig: ServerClientConfig;
  /**
   * Theses are workarounds we need to manually supply the configuration data
   * for roundtrip grammar test, as the network call to engine is blocked in test
   * environment, till we figure out the best way to do this, we can remove this
   * config
   */
  TEMPORARY__classifierPathMapping?: ClassifierPathMapping[] | undefined;
  TEMPORARY__subtypeInfo?: SubtypeInfo | undefined;
}

export interface GraphBuilderOptions {
  /**
   * This flag will be kept until we have full support for section index
   * See https://github.com/finos/legend-studio/issues/1067
   */
  TEMPORARY__preserveSectionIndex?: boolean;
  /**
   * If strict mode is enabled, certain validations, which, in normal mode, are often considered as warnings or non-problems,
   * will be treated as error and will be thrown. This is to compensate for discrepancies in strictness between engine compilation
   * and graph builder algorithm. Ideally, a lot of these errors will eventually be treated as errors by engine compilation.
   *
   * See https://github.com/finos/legend-studio/issues/941
   */
  strict?: boolean;
  /**
   * This ties a graph to an sdlc pointer. Meaning the graph is immutable and tied to a specific `versioned` SDLC.
   */
  origin?: GraphDataOrigin | undefined;
}

export interface ExecutionOptions {
  /**
   * Use lossless algorithm while parsing the execution result object.
   * NOTE: This will result in numeric values being stored as object instead of primitive type number values.
   */
  useLosslessParse?: boolean | undefined;
  convertUnsafeNumbersToString?: boolean | undefined;
  serializationFormat?: EXECUTION_SERIALIZATION_FORMAT | undefined;
  parameterValues?: ParameterValue[];
  abortController?: AbortController | undefined;
  preservedResponseHeadersList?: string[];
  tracingtags?: PlainObject | undefined;
}

export interface ServiceRegistrationOptions {
  TEMPORARY__useStoreModel?: boolean | undefined;
  TEMPORARY__semiInteractiveOverridePattern?: string | undefined;
  TEMPORARY__useGenerateLineage?: boolean | undefined;
  TEMPORARY__useGenerateOpenApi?: boolean | undefined;
}

export abstract class AbstractPureGraphManagerExtension {
  graphManager: AbstractPureGraphManager;

  constructor(graphManager: AbstractPureGraphManager) {
    this.graphManager = graphManager;
  }

  abstract getSupportedProtocolVersion(): string;
}

export abstract class AbstractPureGraphManager {
  readonly extensions: AbstractPureGraphManagerExtension[] = [];
  readonly pluginManager: GraphManagerPluginManager;
  readonly logService: LogService;

  constructor(
    pluginManager: GraphManagerPluginManager,
    logService: LogService,
  ) {
    this.pluginManager = pluginManager;
    this.logService = logService;
    this.extensions = pluginManager
      .getPureGraphManagerPlugins()
      .flatMap(
        (plugin) => plugin.getExtraPureGraphManagerExtensionBuilders?.() ?? [],
      )
      .map((builder) => builder(this))
      .filter(
        (extension) =>
          extension.getSupportedProtocolVersion() ===
          this.getSupportedProtocolVersion(),
      );
  }

  // --------------------------------------------- Setup ---------------------------------------------

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
      disableGraphConfiguration?: boolean | undefined;
    },
  ): Promise<void>;

  // --------------------------------------------- Generic ---------------------------------------------

  abstract getSupportedProtocolVersion(): string;

  /**
   * Removes the SectionIndex from the list of enitites
   */
  abstract getElementEntities(entities: Entity[]): Entity[];

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
    report?: GraphManagerOperationReport,
  ): Promise<void>;

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
    dependencyEntitiesIndex: Map<string, EntitiesWithOrigin>,
    buildState: ActionState,
    options?: GraphBuilderOptions,
    report?: GraphManagerOperationReport,
  ): Promise<void>;

  /**
   * Process entities and build the main graph.
   */
  abstract buildGraph(
    graph: PureModel,
    entities: Entity[],
    buildState: ActionState,
    options?: GraphBuilderOptions,
    report?: GraphManagerOperationReport,
  ): Promise<void>;

  /**
   * Process entities and build the light graph.
   */
  abstract buildLightGraph(
    graph: PureModel,
    entities: Entity[],
    buildState: ActionState,
    options?: GraphBuilderOptions,
    report?: GraphManagerOperationReport,
  ): Promise<void>;

  abstract buildGenerations(
    graph: PureModel,
    generationEntities: Map<string, Entity[]>,
    buildState: ActionState,
    options?: GraphBuilderOptions,
    report?: GraphManagerOperationReport,
  ): Promise<void>;

  // ------------------------------------------- Grammar -------------------------------------------

  abstract graphToPureCode(
    graph: PureModel,
    options?: {
      pretty?: boolean | undefined;
      excludeUnknown?: boolean | undefined;
    },
  ): Promise<string>;
  abstract pureCodeToEntities(
    code: string,
    options?: {
      sourceInformationIndex?: Map<string, SourceInformation>;
      TEMPORARY__keepSectionIndex?: boolean;
    },
  ): Promise<Entity[]>;
  abstract entitiesToPureCode(
    entities: Entity[],
    options?: { pretty?: boolean | undefined },
  ): Promise<string>;
  abstract pureCodeToLambda(
    lambda: string,
    lambdaId?: string,
    options?: {
      pruneSourceInformation?: boolean;
    },
  ): Promise<RawLambda>;
  abstract prettyLambdaContent(lambda: string): Promise<string>;
  abstract lambdaToPureCode(
    lambda: RawLambda,
    pretty?: boolean,
  ): Promise<string>;
  abstract lambdasToPureCode(
    lambdas: Map<string, RawLambda>,
    pretty?: boolean,
  ): Promise<Map<string, string>>;

  abstract valueSpecificationsToPureCode(
    lambdas: Map<string, ValueSpecification>,
    pretty?: boolean,
  ): Promise<Map<string, string>>;

  abstract valueSpecificationToPureCode(
    valSpec: PlainObject<ValueSpecification>,
    pretty?: boolean,
  ): Promise<string>;

  abstract pureCodeToValueSpecification(
    valSpec: string,
    returnSourceInformation?: boolean,
  ): Promise<PlainObject<ValueSpecification>>;

  abstract pureCodeToValueSpecifications(
    lambdas: Map<string, string>,
    graph: PureModel,
  ): Promise<Map<string, ValueSpecification>>;

  // TODO: consider moving these to relational plugin when we complete modularization
  abstract pureCodeToRelationalOperationElement(
    operation: string,
    operationId: string,
  ): Promise<RawRelationalOperationElement>;
  abstract relationalOperationElementToPureCode(
    operations: Map<string, RawRelationalOperationElement>,
  ): Promise<Map<string, string>>;

  // ------------------------------------------- Compile -------------------------------------------

  abstract compileEntities(entities: Entity[]): Promise<void>;
  abstract compileGraph(
    graph: PureModel,
    options?: {
      onError?: () => void;
      keepSourceInformation?: boolean;
    },
    report?: GraphManagerOperationReport,
  ): Promise<CompilationResult>;
  abstract compileText(
    graphGrammar: string,
    graph: PureModel,
    options?: { onError?: () => void },
    report?: GraphManagerOperationReport,
  ): Promise<TextCompilationResult>;
  abstract getLambdaReturnType(
    lambda: RawLambda,
    graph: PureModel,
    options?: { keepSourceInformation?: boolean },
  ): Promise<string>;

  abstract getLambdaRelationType(
    lambda: RawLambda,
    graph: PureModel,
    options?: { keepSourceInformation?: boolean },
  ): Promise<RelationTypeMetadata>;

  abstract getCodeComplete(
    codeBlock: string,
    graph: PureModel,
    offset: number | undefined,
    // used to ignore the current element where you are writing your code complete (can cause issues with current compile)
    options?: {
      ignoreElements: string[] | undefined;
    },
  ): Promise<CodeCompletionResult>;

  abstract getLambdasReturnType(
    lambdas: Map<string, RawLambda>,
    graph: PureModel,
  ): Promise<{
    results: Map<string, string>;
    errors: Map<string, EngineError>;
  }>;

  // ------------------------------------------- SDLC -------------------------------------------

  abstract createSandboxProject(): Promise<{
    projectId: string;
    webUrl: string | undefined;
    owner: string;
  }>;

  abstract userHasPrototypeProjectAccess(userId: string): Promise<boolean>;

  // ------------------------------------------- Test -------------------------------------------

  abstract runTests(
    inputs: RunTestsTestableInput[],
    graph: PureModel,
  ): Promise<TestResult[]>;

  abstract debugTests(
    inputs: RunTestsTestableInput[],
    graph: PureModel,
  ): Promise<TestDebug[]>;

  // ------------------------------------------- Value Specification -------------------------------------------

  abstract buildValueSpecification(
    json: PlainObject,
    graph: PureModel,
  ): ValueSpecification;
  abstract serializeValueSpecification(
    valueSpecification: ValueSpecification,
  ): PlainObject;
  abstract transformValueSpecToRawValueSpec(
    valueSpecification: ValueSpecification,
    graph: PureModel,
  ): RawValueSpecification;
  abstract buildRawValueSpecification(
    valuSpec: object,
    graph: PureModel,
  ): RawValueSpecification;
  abstract serializeRawValueSpecification(
    rawValueSpecification: RawValueSpecification,
  ): PlainObject;

  // These methods are utilities that we could use to quickly construct compilable
  // raw lambdas.
  // NOTE: As of now, to simplify the code, these methods are implemented in quite a hacky way, as we create
  // the lambdas from a templated JSON object. Formally, we could remove these method by building them
  // in metamodel form and convert to raw form as these are relatively simple lambda to construct
  abstract createGetAllRawLambda(_class: Class): RawLambda;
  abstract createDefaultBasicRawLambda(options?: {
    addDummyParameter?: boolean;
  }): RawLambda;

  // ------------------------------------------- Generation -------------------------------------------

  abstract getAvailableGenerationConfigurationDescriptions(): Promise<
    GenerationConfigurationDescription[]
  >;
  abstract generateArtifacts(
    graph: PureModel,
    graphOptions?: GraphTextInputOption,
  ): Promise<ArtifactGenerationExtensionResult>;
  abstract generateFile(
    fileGeneration: FileGenerationSpecification,
    generationMode: GenerationMode,
    graph: PureModel,
    graphOptions?: GraphTextInputOption,
  ): Promise<GenerationOutput[]>;
  abstract generateModel(
    generationElement: PackageableElement,
    graph: PureModel,
    graphOptions?: GraphTextInputOption,
  ): Promise<Entity[]>;

  // --------------------------------------------- Test Data Generation ---------------------------------------------

  abstract generateTestData(
    query: RawLambda,
    mapping: string,
    runtime: string,
    graph: PureModel,
  ): Promise<TestDataGenerationResult>;

  // ------------------------------------------- External Format ----------------------------------

  abstract getAvailableExternalFormatsDescriptions(): Promise<
    ExternalFormatDescription[]
  >;
  abstract generateModelFromExternalFormat(
    schemaSet: SchemaSet,
    targetBinding: string | undefined,
    configs: ConfigurationProperty[],
    graph: PureModel,
  ): Promise<string>;
  abstract generateSchemaFromExternalFormatConfig(
    modelUnit: ModelUnit,
    targetBinding: string | undefined,
    configurationProperties: ConfigurationProperty[],
    graph: PureModel,
  ): Promise<SchemaSet[]>;

  // ------------------------------------------- Model Import -------------------------------------------

  abstract getExamplePureProtocolText(): string;
  abstract getExampleExternalFormatImportText(): string;
  abstract entitiesToPureProtocolText(entities: Entity[]): Promise<string>;
  abstract pureProtocolTextToEntities(protocol: string): Entity[];

  // ------------------------------------------- Execute -------------------------------------------

  abstract runQuery(
    lambda: RawLambda,
    mapping: Mapping | undefined,
    runtime: Runtime | undefined,
    graph: PureModel,
    options?: ExecutionOptions,
    report?: GraphManagerOperationReport,
  ): Promise<ExecutionResultWithMetadata>;

  abstract runQueryWithUncompiledGraph(
    lambda: RawLambda | string,
    mapping: string | undefined,
    runtime: string | undefined,
    graph: PureModel,
    options?: ExecutionOptions,
    report?: GraphManagerOperationReport,
  ): Promise<ExecutionResultWithMetadata>;

  abstract exportData(
    lambda: RawLambda,
    mapping: Mapping | undefined,
    runtime: Runtime | undefined,
    graph: PureModel,
    options?: ExecutionOptions | undefined,
    report?: GraphManagerOperationReport | undefined,
    contentType?: ContentType | undefined,
  ): Promise<Response>;

  abstract cancelUserExecutions(broadcastToCluster: boolean): Promise<string>;

  abstract DEPRECATED__runLegacyMappingTests(
    tests: {
      test: DEPRECATED__MappingTest;
      runtime: Runtime;
      handleResult: (val: ExecutionResult) => void;
      handleError: (message: Error) => void;
    }[],
    mapping: Mapping,
    graph: PureModel,
    options?: ExecutionOptions,
    _report?: GraphManagerOperationReport,
  ): Promise<void>;

  abstract generateExecutionPlan(
    lambda: RawLambda,
    mapping: Mapping | undefined,
    runtime: Runtime | undefined,
    graph: PureModel,
    report?: GraphManagerOperationReport,
  ): Promise<RawExecutionPlan>;

  abstract debugExecutionPlanGeneration(
    lambda: RawLambda,
    mapping: Mapping | undefined,
    runtime: Runtime | undefined,
    graph: PureModel,
    report?: GraphManagerOperationReport,
  ): Promise<{ plan: RawExecutionPlan; debug: string }>;

  abstract generateExecuteTestData(
    lambda: RawLambda,
    parameters: (string | number | boolean)[],
    mapping: Mapping,
    runtime: Runtime,
    graph: PureModel,
    options?: {
      // Anonymizes data by hashing any string values in the generated data
      anonymizeGeneratedData?: boolean;
      parameterValues?: ParameterValue[];
    },
    report?: GraphManagerOperationReport,
  ): Promise<string>;

  abstract generateExecuteTestDataWithSeedData(
    lambda: RawLambda,
    tableRowIdentifiers: TableRowIdentifiers[],
    mapping: Mapping,
    runtime: Runtime,
    graph: PureModel,
    options?: {
      // Anonymizes data by hashing any string values in the generated data
      anonymizeGeneratedData?: boolean;
      parameterValues?: ParameterValue[];
    },
    report?: GraphManagerOperationReport,
  ): Promise<string>;

  abstract buildExecutionPlan(
    executionPlanJson: RawExecutionPlan,
    graph: PureModel,
  ): ExecutionPlan;

  abstract serializeExecutionPlan(
    executionPlan: ExecutionPlan,
  ): RawExecutionPlan;

  abstract serializeExecutionNode(executionNode: ExecutionNode): object;

  abstract analyzeExecuteInput(
    data: PlainObject,
    executablePath: string,
  ): Promise<{
    origin: GraphDataOrigin;
    entities: Entity[];
  }>;

  // ------------------------------------------- Query -------------------------------------------

  abstract searchQueries(
    searchSpecification: QuerySearchSpecification,
  ): Promise<LightQuery[]>;
  abstract getQueries(queryIds: string[]): Promise<LightQuery[]>;
  abstract getLightQuery(queryId: string): Promise<LightQuery>;
  abstract getQuery(queryId: string, graph: PureModel): Promise<Query>;
  abstract getQueryInfo(queryId: string): Promise<QueryInfo>;
  abstract createQuery(query: Query, graph: PureModel): Promise<Query>;
  abstract updateQuery(query: Query, graph: PureModel): Promise<Query>;
  abstract patchQuery(query: Partial<Query>, graph: PureModel): Promise<Query>;
  abstract renameQuery(queryId: string, queryName: string): Promise<LightQuery>;
  abstract deleteQuery(queryId: string): Promise<void>;

  abstract productionizeQueryToServiceEntity(
    query: QueryInfo,
    serviceConfig: {
      name: string;
      packageName: string;
      pattern: string;
      serviceOwners: string[];
    },
    graph: Entity[],
  ): Promise<Entity>;

  abstract resolveQueryInfoExecutionContext(
    query: QueryInfo,
    graphLoader: () => Promise<PlainObject<Entity>[]>,
  ): Promise<{ mapping: string | undefined; runtime: string }>;

  // ------------------------------------------- DataCube -------------------------------------------

  abstract searchDataCubes(
    searchSpecification: QuerySearchSpecification,
  ): Promise<LightPersistentDataCube[]>;
  abstract getDataCubes(ids: string[]): Promise<LightPersistentDataCube[]>;
  abstract getDataCube(id: string): Promise<PersistentDataCube>;
  abstract createDataCube(
    dataCube: PersistentDataCube,
  ): Promise<PersistentDataCube>;
  abstract updateDataCube(
    dataCube: PersistentDataCube,
  ): Promise<PersistentDataCube>;
  abstract deleteDataCube(id: string): Promise<void>;

  // -------------------------------------- Analysis --------------------------------------

  abstract analyzeMappingModelCoverage(
    mapping: Mapping,
    graph: PureModel,
  ): Promise<MappingModelCoverageAnalysisResult>;

  abstract buildMappingModelCoverageAnalysisResult(
    input: RawMappingModelCoverageAnalysisResult,
    mapping: Mapping,
  ): MappingModelCoverageAnalysisResult;

  abstract surveyDatasets(
    mapping: string,
    runtime: string,
    query: RawLambda | undefined,
    graphData: GraphData,
  ): Promise<DatasetSpecification[]>;

  abstract checkDatasetEntitlements(
    datasets: DatasetSpecification[],
    mapping: string,
    runtime: string,
    query: RawLambda | undefined,
    graphData: GraphData,
  ): Promise<DatasetEntitlementReport[]>;

  /**
   * TODO: Move these to store relational extension
   *
   * @modularize
   * See https://github.com/finos/legend-studio/issues/65
   */
  abstract buildDatabase(input: DatabaseBuilderInput): Promise<Entity[]>;
  abstract executeRawSQL(
    connection: RelationalDatabaseConnection,
    sql: string,
  ): Promise<string>;

  // ------------------------------------------- Function -------------------------------------------

  abstract getAvailableFunctionActivatorConfigurations(
    coreModel: CoreModel,
    systemModel: SystemModel,
  ): Promise<FunctionActivatorConfiguration[]>;

  abstract validateFunctionActivator(
    functionActivator: FunctionActivator,
    graphData: GraphData,
  ): Promise<void>;

  abstract publishFunctionActivatorToSandbox(
    functionActivator: FunctionActivator,
    graphData: GraphData,
  ): Promise<DeploymentResult>;

  // --------------------------------------------- Relational ---------------------------------------------

  abstract generateModelsFromDatabaseSpecification(
    databasePath: string,
    targetPackage: undefined | string,
    graph: PureModel,
  ): Promise<Entity[]>;

  abstract getAvailableRelationalDatabaseTypeConfigurations(): Promise<
    RelationalDatabaseTypeConfiguration[] | undefined
  >;

  // ------------------------------------------- Service -------------------------------------------
  /**
   * @modularize
   * See https://github.com/finos/legend-studio/issues/65
   */

  abstract registerService(
    service: Service,
    graph: PureModel,
    groupId: string,
    artifactId: string,
    version: string | undefined,
    server: string,
    executionMode: ServiceExecutionMode,
    options?: ServiceRegistrationOptions,
  ): Promise<ServiceRegistrationSuccess>;
  abstract bulkServiceRegistration(
    service: Service[],
    graph: PureModel,
    groupId: string,
    artifactId: string,
    version: string | undefined,
    server: string,
    executionMode: ServiceExecutionMode,
    options?: ServiceRegistrationOptions,
  ): Promise<ServiceRegistrationResult[]>;
  abstract activateService(
    serviceUrl: string,
    serviceId: string,
  ): Promise<void>;
  abstract runServicePostValidations(
    service: Service,
    graph: PureModel,
    assertionId: string,
  ): Promise<PostValidationAssertionResult>;

  // ------------------------------------------- Change detection -------------------------------------------

  abstract buildHashesIndex(entities: Entity[]): Promise<Map<string, string>>;

  // ------------------------------------------- Utilities -------------------------------------------

  abstract elementToEntity(
    element: PackageableElement,
    options?: {
      pruneSourceInformation?: boolean;
    },
  ): Entity;

  async createBasicGraph(options?: {
    initializeSystem?: boolean;
  }): Promise<PureModel> {
    const extensionElementClasses = this.pluginManager.getPureGraphPlugins();
    const coreModel = new CoreModel(extensionElementClasses);
    const systemModel = new SystemModel(extensionElementClasses);
    if (options?.initializeSystem) {
      await this.buildSystem(coreModel, systemModel, ActionState.create());
      systemModel.initializeAutoImports();
    }
    const graph = new PureModel(
      coreModel,
      systemModel,
      this.pluginManager.getPureGraphPlugins(),
    );
    return graph;
  }

  createDependencyManager(): DependencyManager {
    return new DependencyManager(this.pluginManager.getPureGraphPlugins());
  }

  createGenerationModel(): GenerationModel {
    return new GenerationModel(this.pluginManager.getPureGraphPlugins());
  }

  /**
   * Check if a mapping element is an instance set implementation
   *
   * NOTE: This would account for embedded property mappings as well
   * these are technically instance of `InstanceSetImplementation`
   * but since unlike Pure, Typescript cannot do multiple inheritance
   * we only can make embedded property mapping extends `PropertyMapping`
   *
   * Potentially, we might need to apply an extension mechanism on this
   */
  isInstanceSetImplementation(
    setImplementation:
      | EnumerationMapping
      | SetImplementation
      | AssociationImplementation,
  ): setImplementation is InstanceSetImplementation {
    return (
      setImplementation instanceof InstanceSetImplementation ||
      setImplementation instanceof EmbeddedFlatDataPropertyMapping ||
      setImplementation instanceof EmbeddedRelationalInstanceSetImplementation
    );
  }

  /**
   * Filter the list of system elements that will be shown in selection options
   * to users. This is helpful to avoid overwhelming and confusing users in form
   * mode since many system elements are needed to build the graph, but should
   * not present at all as selection options in form mode.
   */
  collectExposedSystemElements<T extends PackageableElement>(
    systemElements: T[],
  ): T[] {
    const allowedSystemElements = this.pluginManager
      .getPureGraphManagerPlugins()
      .flatMap((plugin) => plugin.getExtraExposedSystemElementPath?.() ?? []);
    return systemElements.filter((element) =>
      allowedSystemElements.includes(element.path),
    );
  }
}
