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

import { flow, flowResult, makeObservable, runInAction } from 'mobx';
import type { Logger } from '../../../../utils/Logger';
import { CORE_LOG_EVENT } from '../../../../utils/Logger';
import type { Entity } from '../../../sdlc/models/entity/Entity';
import {
  ELEMENT_PATH_DELIMITER,
  ROOT_PACKAGE_NAME,
  SOURCE_INFORMATION_KEY,
} from '../../../MetaModelConst';
import type {
  Clazz,
  GeneratorFn,
  PlainObject,
} from '@finos/legend-studio-shared';
import {
  losslessParse,
  getClass,
  guaranteeNonNullable,
  UnsupportedOperationError,
  recursiveOmit,
  assertTrue,
  assertErrorThrown,
  promisify,
} from '@finos/legend-studio-shared';
import type { ProjectDependencyMetadata } from '../../../sdlc/models/configuration/ProjectDependency';
import {
  GraphError,
  SystemGraphProcessingError,
  DependencyGraphProcessingError,
} from '../../../MetaModelUtils';
import type { AbstractEngineConfig } from '../../../metamodels/pure/action/AbstractEngineConfiguration';
import type {
  EngineSetupConfig,
  GraphBuilderOptions,
} from '../../../metamodels/pure/graph/AbstractPureGraphManager';
import { AbstractPureGraphManager } from '../../../metamodels/pure/graph/AbstractPureGraphManager';
import type { Mapping } from '../../../metamodels/pure/model/packageableElements/mapping/Mapping';
import type { Runtime } from '../../../metamodels/pure/model/packageableElements/runtime/Runtime';
import type {
  ImportConfigurationDescription,
  ImportMode,
} from '../../../metamodels/pure/action/generation/ImportConfigurationDescription';
import type { PackageableElement } from '../../../metamodels/pure/model/packageableElements/PackageableElement';
import type {
  SystemModel,
  CoreModel,
} from '../../../metamodels/pure/graph/PureModel';
import { PureModel } from '../../../metamodels/pure/graph/PureModel';
import type { BasicModel } from '../../../metamodels/pure/graph/BasicModel';
import type { DependencyManager } from '../../../metamodels/pure/graph/DependencyManager';
import type { Class } from '../../../metamodels/pure/model/packageableElements/domain/Class';
import { RawLambda } from '../../../metamodels/pure/model/rawValueSpecification/RawLambda';
import type { RawValueSpecification } from '../../../metamodels/pure/model/rawValueSpecification/RawValueSpecification';
import type { Service } from '../../../metamodels/pure/model/packageableElements/service/Service';
import type {
  FileGenerationSpecification,
  GenerationMode,
} from '../../../metamodels/pure/model/packageableElements/fileGeneration/FileGenerationSpecification';
import type { GenerationConfigurationDescription } from '../../../metamodels/pure/action/generation/GenerationConfigurationDescription';
import type { ServiceTestResult } from '../../../metamodels/pure/action/service/ServiceTestResult';
import type { ServiceRegistrationResult } from '../../../metamodels/pure/action/service/ServiceRegistrationResult';
import type { ExecutionResult } from '../../../metamodels/pure/action/execution/ExecutionResult';
import type { GenerationOutput } from '../../../metamodels/pure/action/generation/GenerationOutput';
import type { ValueSpecification } from '../../../metamodels/pure/model/valueSpecification/ValueSpecification';
import { ServiceExecutionMode } from '../../../metamodels/pure/action/service/ServiceExecutionMode';
import { PureSingleExecution } from '../../../metamodels/pure/model/packageableElements/service/ServiceExecution';
import {
  V1_deserializeRawValueSpecification,
  V1_serializeRawValueSpecification,
} from './transformation/pureProtocol/serializationHelpers/V1_RawValueSpecificationSerializationHelper';
import {
  V1_serializeValueSpecification,
  V1_deserializeValueSpecification,
} from './transformation/pureProtocol/serializationHelpers/V1_ValueSpecificationSerializer';
import V1_CORE_SYSTEM_MODELS from './V1_Core_SystemModels.json';
import { V1_PackageableElementSerializer } from './transformation/pureProtocol/V1_PackageableElementSerialization';
import {
  V1_entitiesToPureModelContextData,
  V1_serializePureModelContext,
  V1_deserializePureModelContextData,
  V1_setupPureModelContextDataSerialization,
} from './transformation/pureProtocol/V1_PureProtocolSerialization';
import type { V1_ServiceConfigurationInfo } from './engine/service/V1_ServiceConfiguration';
import { V1_PureModelContextData } from './model/context/V1_PureModelContextData';
import type {
  V1_PackageableElement,
  V1_PackageableElementVisitor,
} from './model/packageableElements/V1_PackageableElement';
import {
  V1_PackageableElementPointerType,
  V1_PackageableElementPointer,
} from './model/packageableElements/V1_PackageableElement';
import { V1_ProtocolToMetaModelGraphFirstPassBuilder } from './transformation/pureGraph/to/V1_ProtocolToMetaModelGraphFirstPassBuilder';
import { V1_ProtocolToMetaModelGraphSecondPassBuilder } from './transformation/pureGraph/to/V1_ProtocolToMetaModelGraphSecondPassBuilder';
import { V1_ProtocolToMetaModelGraphThirdPassBuilder } from './transformation/pureGraph/to/V1_ProtocolToMetaModelGraphThirdPassBuilder';
import { V1_ProtocolToMetaModelGraphFourthPassBuilder } from './transformation/pureGraph/to/V1_ProtocolToMetaModelGraphFourthPassBuilder';
import { V1_ProtocolToMetaModelGraphFifthPassBuilder } from './transformation/pureGraph/to/V1_ProtocolToMetaModelGraphFifthPassBuilder';
import { V1_ProtocolToMetaModelRawValueSpecificationBuilder } from './transformation/pureGraph/to/V1_ProtocolToMetaModelRawValueSpecificationBuilder';
import { V1_RawBaseExecutionContext } from './model/rawValueSpecification/V1_RawExecutionContext';
import type { V1_GraphBuilderContext } from './transformation/pureGraph/to/V1_GraphBuilderContext';
import { V1_GraphBuilderContextBuilder } from './transformation/pureGraph/to/V1_GraphBuilderContext';
import { V1_PureModelContextPointer } from './model/context/V1_PureModelContextPointer';
import { V1_Engine } from './engine/V1_Engine';
import { V1_PackageableElementTransformer } from './transformation/pureGraph/from/V1_PackageableElementTransformer';
import {
  V1_transformRawLambda,
  V1_RawValueSpecificationTransformer,
} from './transformation/pureGraph/from/V1_RawValueSpecificationTransformer';
import { V1_transformRuntime } from './transformation/pureGraph/from/V1_RuntimeTransformer';
import type { V1_RawLambda } from './model/rawValueSpecification/V1_RawLambda';
import type { V1_ServiceTestResult } from './engine/service/V1_ServiceTestResult';
import { V1_ServiceRegistrationResult } from './engine/service/V1_ServiceRegistrationResult';
import { V1_ExecuteInput } from './engine/execution/V1_ExecuteInput';
import { V1_GenerationOutput } from './engine/generation/V1_GenerationOutput';
import type { V1_PureModelContextGenerationInput } from './engine/import/V1_PureModelContextGenerationInput';
import { V1_buildValueSpecification } from './transformation/pureGraph/to/helpers/V1_ValueSpecificationBuilderHelper';
import { V1_ValueSpecificationTransformer } from './transformation/pureGraph/from/V1_ValueSpecificationTransformer';
import { V1_serializeExecutionResult } from './engine/execution/V1_ExecutionResult';
import { V1_Profile } from './model/packageableElements/domain/V1_Profile';
import { V1_Class } from './model/packageableElements/domain/V1_Class';
import { V1_Enumeration } from './model/packageableElements/domain/V1_Enumeration';
import { V1_Association } from './model/packageableElements/domain/V1_Association';
import { V1_Measure } from './model/packageableElements/domain/V1_Measure';
import { V1_Store } from './model/packageableElements/store/V1_Store';
import { V1_Service } from './model/packageableElements/service/V1_Service';
import { V1_PackageableRuntime } from './model/packageableElements/runtime/V1_PackageableRuntime';
import { V1_PackageableConnection } from './model/packageableElements/connection/V1_PackageableConnection';
import { V1_FileGenerationSpecification } from './model/packageableElements/fileGeneration/V1_FileGenerationSpecification';
import { V1_SectionIndex } from './model/packageableElements/section/V1_SectionIndex';
import { V1_GenerationSpecification } from './model/packageableElements/generationSpecification/V1_GenerationSpecification';
import { V1_Mapping } from './model/packageableElements/mapping/V1_Mapping';
import { V1_Diagram } from './model/packageableElements/diagram/V1_Diagram';
import { V1_ConcreteFunctionDefinition } from './model/packageableElements/function/V1_ConcreteFunctionDefinition';
import { V1_PureModelContextComposite } from './model/context/V1_PureModelContextComposite';
import { V1_AlloySdlc } from './model/context/V1_AlloySdlc';
import { V1_Protocol } from './model/V1_Protocol';
import type { V1_PureModelContext } from './model/context/V1_PureModelContext';
import type { PluginManager } from '../../../../application/PluginManager';
import { V1_ServiceStorage } from './engine/service/V1_ServiceStorage';
import type { V1_ElementBuilder } from './transformation/pureGraph/to/V1_ElementBuilder';
import { V1_GraphBuilderExtensions } from './transformation/pureGraph/to/V1_GraphBuilderExtensions';
import type { PureProtocolProcessorPlugin } from '../PureProtocolProcessorPlugin';
import type { PureGraphManagerPlugin } from '../../../metamodels/pure/graph/PureGraphManagerPlugin';
import type {
  DatabaseBuilderInput,
  DatabasePattern,
} from '../../../metamodels/pure/action/generation/DatabaseBuilderInput';
import {
  V1_DatabaseBuilderConfig,
  V1_DatabaseBuilderInput,
  V1_DatabasePattern,
  V1_TargetDatabase,
} from './engine/generation/V1_DatabaseBuilderInput';
import { V1_transformRelationalDatabaseConnection } from './transformation/pureGraph/from/V1_ConnectionTransformer';
import { V1_FlatData } from './model/packageableElements/store/flatData/model/V1_FlatData';
import { V1_Database } from './model/packageableElements/store/relational/model/V1_Database';
import { V1_ServiceStore } from './model/packageableElements/store/relational/V1_ServiceStore';
import { ENTITY_PATH_DELIMITER } from '../../../sdlc/SDLCUtils';
import type { V1_Multiplicity } from './model/packageableElements/domain/V1_Multiplicity';
import type { V1_RawVariable } from './model/rawValueSpecification/V1_RawVariable';
import { V1_setupDatabaseSerialization } from './transformation/pureProtocol/serializationHelpers/V1_DatabaseSerializationHelper';
import type { DSLGenerationSpecification_PureProtocolProcessorPlugin_Extension } from '../DSLGenerationSpecification_PureProtocolProcessorPlugin_Extension';
import type { RawRelationalOperationElement } from '../../../metamodels/pure/model/packageableElements/store/relational/model/RawRelationalOperationElement';
import type { V1_RawRelationalOperationElement } from './model/packageableElements/store/relational/model/V1_RawRelationalOperationElement';
import { V1_GraphTransformerContextBuilder } from './transformation/pureGraph/from/V1_GraphTransformerContext';
import type {
  ExecutionPlan,
  RawExecutionPlan,
} from '../../../metamodels/pure/model/executionPlan/ExecutionPlan';
import type { V1_ExecutionNode } from './model/executionPlan/nodes/V1_ExecutionNode';
import type { ExecutionNode } from '../../../metamodels/pure/model/executionPlan/nodes/ExecutionNode';
import type { V1_ExecutionPlan } from './model/executionPlan/V1_ExecutionPlan';
import {
  V1_transformExecutionNode,
  V1_transformExecutionPlan,
} from './transformation/pureGraph/from/executionPlan/V1_ExecutionPlanTransformer';
import {
  V1_deserializeExecutionPlan,
  V1_serializeExecutionNode,
  V1_serializeExecutionPlan,
} from './transformation/pureProtocol/serializationHelpers/executionPlan/V1_ExecutionPlanSerializationHelper';
import { V1_buildExecutionPlan } from './transformation/pureGraph/to/V1_ExecutionPlanBuilder';
import type { Query } from '../../../metamodels/pure/action/query/Query';
import { V1_Query } from './engine/query/V1_Query';
import { V1_buildQuery, V1_transformQuery } from './engine/V1_EngineHelper';

const V1_FUNCTION_SUFFIX_MULTIPLICITY_INFINITE = 'MANY';

const getMultiplicitySuffix = (multiplicity: V1_Multiplicity): string => {
  if (multiplicity.lowerBound === multiplicity.upperBound) {
    return multiplicity.lowerBound.toString();
  } else if (
    multiplicity.lowerBound === 0 &&
    multiplicity.upperBound === undefined
  ) {
    return V1_FUNCTION_SUFFIX_MULTIPLICITY_INFINITE;
  }
  return `$${multiplicity.lowerBound}_${
    multiplicity.upperBound ?? V1_FUNCTION_SUFFIX_MULTIPLICITY_INFINITE
  }$`;
};

const getVariableSuffix = (variable: V1_RawVariable): string =>
  `${variable.class
    .split(ELEMENT_PATH_DELIMITER)
    .pop()}_${getMultiplicitySuffix(variable.multiplicity)}_`;

const getFunctionSuffix = (fn: V1_ConcreteFunctionDefinition): string =>
  `${fn.parameters.map((p) => getVariableSuffix(p)).join('_')}_${fn.returnType
    .split(ELEMENT_PATH_DELIMITER)
    .pop()}_${getMultiplicitySuffix(fn.returnMultiplicity)}_`;

/* @MARKER: NEW ELEMENT TYPE SUPPORT --- consider adding new element type handler here whenever support for a new element type is added to the app */
enum CORE_ELEMENT_CLASSIFIER_PATH {
  PROFILE = 'meta::pure::metamodel::extension::Profile',
  ENUMERATION = 'meta::pure::metamodel::type::Enumeration',
  MEASURE = 'meta::pure::metamodel::type::Measure', // since we don't expose unit outside of measure, we probably don't need to reveal it
  CLASS = 'meta::pure::metamodel::type::Class',
  ASSOCIATION = 'meta::pure::metamodel::relationship::Association',
  FUNCTION = 'meta::pure::metamodel::function::ConcreteFunctionDefinition',
  FLAT_DATA = 'meta::flatData::metamodel::FlatData',
  DATABASE = 'meta::relational::metamodel::Database',
  SERVICE_STORE = 'meta::servicestore::metamodel::ServiceStore',
  MAPPING = 'meta::pure::mapping::Mapping',
  SERVICE = 'meta::legend::service::metamodel::Service',
  DIAGRAM = 'meta::pure::metamodel::diagram::Diagram',
  CONNECTION = 'meta::pure::runtime::PackageableConnection',
  RUNTIME = 'meta::pure::runtime::PackageableRuntime',
  FILE_GENERATION = 'meta::pure::generation::metamodel::GenerationConfiguration',
  GENERATION_SPECIFICATION = 'meta::pure::generation::metamodel::GenerationSpecification',
  SECTION_INDEX = 'meta::pure::metamodel::section::SectionIndex',
}

class V1_PureModelContextDataIndex {
  elements: V1_PackageableElement[] = [];
  nativeElements: V1_PackageableElement[] = [];

  associations: V1_Association[] = [];
  classes: V1_Class[] = [];
  enumerations: V1_Enumeration[] = [];
  functions: V1_ConcreteFunctionDefinition[] = [];
  profiles: V1_Profile[] = [];
  measures: V1_Measure[] = [];

  stores: V1_Store[] = [];
  mappings: V1_Mapping[] = [];
  connections: V1_PackageableConnection[] = [];
  runtimes: V1_PackageableRuntime[] = [];

  sectionIndices: V1_SectionIndex[] = [];

  services: V1_Service[] = [];
  diagrams: V1_Diagram[] = [];

  fileGenerations: V1_FileGenerationSpecification[] = [];
  generationSpecifications: V1_GenerationSpecification[] = [];

  otherElementsByBuilder: Map<
    V1_ElementBuilder<V1_PackageableElement>,
    V1_PackageableElement[]
  > = new Map<
    V1_ElementBuilder<V1_PackageableElement>,
    V1_PackageableElement[]
  >();
}

const indexPureModelContextData = (
  data: V1_PureModelContextData,
  extensions: V1_GraphBuilderExtensions,
): V1_PureModelContextDataIndex => {
  const index = new V1_PureModelContextDataIndex();
  index.elements = data.elements;
  const otherElementsByClass = new Map<
    Clazz<V1_PackageableElement>,
    V1_PackageableElement[]
  >();
  data.elements.forEach((el) => {
    let isIndexedAsOtherElement = false;
    if (el instanceof V1_Association) {
      index.associations.push(el);
    } else if (el instanceof V1_Class) {
      index.classes.push(el);
    } else if (el instanceof V1_Enumeration) {
      index.enumerations.push(el);
    } else if (el instanceof V1_ConcreteFunctionDefinition) {
      index.functions.push(el);
    } else if (el instanceof V1_Profile) {
      index.profiles.push(el);
    } else if (el instanceof V1_Measure) {
      index.measures.push(el);
    } else if (el instanceof V1_Mapping) {
      index.mappings.push(el);
    } else if (el instanceof V1_PackageableConnection) {
      index.connections.push(el);
    } else if (el instanceof V1_PackageableRuntime) {
      index.runtimes.push(el);
    } else if (el instanceof V1_Store) {
      index.stores.push(el);
    } else if (el instanceof V1_SectionIndex) {
      index.sectionIndices.push(el);
    } else if (el instanceof V1_Service) {
      index.services.push(el);
    } else if (el instanceof V1_Diagram) {
      index.diagrams.push(el);
    } else if (el instanceof V1_FileGenerationSpecification) {
      index.fileGenerations.push(el);
    } else if (el instanceof V1_GenerationSpecification) {
      index.generationSpecifications.push(el);
    } else {
      const clazz = getClass<V1_PackageableElement>(el);
      if (otherElementsByClass.has(clazz)) {
        otherElementsByClass.get(clazz)?.push(el);
      } else {
        otherElementsByClass.set(clazz, [el]);
      }
      isIndexedAsOtherElement = true;
    }
    if (!isIndexedAsOtherElement) {
      index.nativeElements.push(el);
    }
  });
  otherElementsByClass.forEach((elements, _class) => {
    const builder = extensions.getExtraBuilderForProtocolClassOrThrow(_class);
    index.otherElementsByBuilder.set(
      builder,
      (index.otherElementsByBuilder.get(builder) ?? []).concat(elements),
    );
  });
  return index;
};

// NOTE: this interface is somewhat naive since `model` is of type `BasicModel`,
// so this can only be used for pre-processing/indexing
// we might need to change model to PureModel in the future when we support other use case
interface V1_GraphBuilderInput {
  model: BasicModel;
  data: V1_PureModelContextDataIndex;
  parentElementPath?: string;
}

export class V1_PureGraphManager extends AbstractPureGraphManager {
  engine!: V1_Engine;
  logger: Logger;
  extensions: V1_GraphBuilderExtensions;

  constructor(
    pureGraphManagerPlugins: PureGraphManagerPlugin[],
    pureProtocolProcessorPlugins: PureProtocolProcessorPlugin[],
    logger: Logger,
  ) {
    super(pureGraphManagerPlugins, pureProtocolProcessorPlugins);

    makeObservable<
      V1_PureGraphManager,
      | 'initializeAndIndexElements'
      | 'postProcess'
      | 'buildTypes'
      | 'buildStores'
      | 'buildMappings'
      | 'buildConnectionsAndRuntimes'
      | 'buildServices'
      | 'buildDiagrams'
      | 'buildFileGenerations'
      | 'buildGenerationSpecificationss'
      | 'buildSectionIndex'
      | 'buildOtherElements'
      | 'pureCodeToPureModelContextData'
      | 'entitiesToPureModelContextData'
    >(this, {
      setupEngine: flow,
      buildSystem: flow,
      buildDependencies: flow,
      buildGraph: flow,
      buildGenerations: flow,
      initializeAndIndexElements: flow,
      postProcess: flow,
      buildTypes: flow,
      buildStores: flow,
      buildMappings: flow,
      buildConnectionsAndRuntimes: flow,
      buildServices: flow,
      buildDiagrams: flow,
      buildFileGenerations: flow,
      buildGenerationSpecificationss: flow,
      buildSectionIndex: flow,
      buildOtherElements: flow,
      graphToPureCode: flow,
      pureCodeToPureModelContextData: flow,
      entitiesToPureCode: flow,
      pureCodeToEntities: flow,
      pureCodeToLambda: flow,
      lambdaToPureCode: flow,
      pureCodeToRelationalOperationElement: flow,
      relationalOperationElementToPureCode: flow,
      compileGraph: flow,
      compileText: flow,
      getLambdaReturnType: flow,
      getAvailableGenerationConfigurationDescriptions: flow,
      generateFile: flow,
      generateModel: flow,
      getAvailableImportConfigurationDescriptions: flow,
      externalFormatTextToEntities: flow,
      entitiesToPureProtocolText: flow,
      executeMapping: flow,
      generateTestData: flow,
      generateExecutionPlan: flow,
      buildDatabase: flow,
      runServiceTests: flow,
      registerService: flow,
      activateService: flow,
      getQueries: flow,
      getQuery: flow,
      createQuery: flow,
      updateQuery: flow,
      buildHashesIndex: flow,
      entitiesToPureModelContextData: flow,
    });

    this.logger = logger;
    // setup plugins
    this.extensions = new V1_GraphBuilderExtensions(
      this.pureProtocolProcessorPlugins,
    );
    // setup (de)serializer using plugins
    V1_setupPureModelContextDataSerialization(
      this.pureProtocolProcessorPlugins,
    );
    V1_setupDatabaseSerialization(this.pureProtocolProcessorPlugins);
  }

  getEngineConfig(): AbstractEngineConfig {
    return this.engine.config;
  }

  *setupEngine(
    pluginManager: PluginManager,
    config: EngineSetupConfig,
  ): GeneratorFn<void> {
    this.engine = new V1_Engine(config.clientConfig, this.logger);
    // register plugin
    this.engine.engineServerClient.registerTracerServicePlugins(
      pluginManager.getTracerServicePlugins(),
    );
    // setup the engine client
    this.engine.config.setEnv(config.env);
    this.engine.config.setTabSize(config.tabSize);
    try {
      this.engine.config.setCurrentUserId(
        (yield this.engine.engineServerClient.getCurrentUserId()) as string,
      );
    } catch {
      // do nothing
    }
  }

  // --------------------------------------------- Graph Builder ---------------------------------------------

  /* @MARKER: NEW ELEMENT TYPE SUPPORT --- consider adding new element type handler here whenever support for a new element type is added to the app */
  *buildSystem(
    coreModel: CoreModel,
    systemModel: SystemModel,
    options?: GraphBuilderOptions,
  ): GeneratorFn<void> {
    const startTime = Date.now();

    // Create a dummy graph for system processing. This is to ensure system model does not depend on the main graph
    const graph = new PureModel(
      coreModel,
      systemModel,
      this.pureGraphManagerPlugins.flatMap(
        (plugin) => plugin.getExtraPureGraphExtensionClasses?.() ?? [],
      ),
    );
    try {
      const systemData = new V1_PureModelContextData();
      yield V1_entitiesToPureModelContextData(
        /**
         * Get all system entities.
         *
         * NOTE: right now, we are doing extra work here: JSON -> protocol -> entities -> protocol, since we are
         * expecting to get these models from some a remote SDLC project in the future.
         */
        V1_deserializePureModelContextData(V1_CORE_SYSTEM_MODELS)
          .elements.concat(
            this.pureProtocolProcessorPlugins
              .flatMap((plugin) => plugin.V1_getExtraSystemModels?.() ?? [])
              .flatMap(
                (modelContextData) =>
                  V1_deserializePureModelContextData(modelContextData).elements,
              ),
          )
          .map((element) => this.elementProtocolToEntity(element)),
        systemData,
        this.pureProtocolProcessorPlugins,
      );
      const systemGraphBuilderInput = [
        {
          model: systemModel,
          data: indexPureModelContextData(systemData, this.extensions),
        },
      ];
      yield flowResult(
        this.initializeAndIndexElements(graph, systemGraphBuilderInput),
      );
      // NOTE: right now we only have profile and enumeration for system, we might need to generalize this step in the future
      yield flowResult(this.buildTypes(graph, systemGraphBuilderInput));
      yield flowResult(this.buildOtherElements(graph, systemGraphBuilderInput));
      yield flowResult(this.postProcess(graph, systemGraphBuilderInput));
      if (!options?.quiet) {
        this.logger.info(
          CORE_LOG_EVENT.GRAPH_SYSTEM_BUILT,
          Date.now() - startTime,
          'ms',
          `[profile: ${systemModel.ownProfiles.length}, enumeration: ${systemModel.ownEnumerations.length}]`,
        );
      }
      systemModel.buildState.pass();
    } catch (error: unknown) {
      assertErrorThrown(error);
      systemModel.buildState.fail();
      if (!options?.quiet) {
        this.logger.info(
          CORE_LOG_EVENT.GRAPH_BUILD_FAILED,
          '[ERROR]',
          Date.now() - startTime,
          'ms',
        );
      }
      throw new SystemGraphProcessingError(error);
    }
  }

  /* @MARKER: NEW ELEMENT TYPE SUPPORT --- consider adding new element type handler here whenever support for a new element type is added to the app */
  *buildDependencies(
    coreModel: CoreModel,
    systemModel: SystemModel,
    dependencyManager: DependencyManager,
    dependencyMetadataMap: Map<string, ProjectDependencyMetadata>,
    options?: GraphBuilderOptions,
  ): GeneratorFn<void> {
    const startTime = Date.now();
    dependencyManager.buildState.reset();
    // Create a dummy graph for system processing. This is to ensure dependency models do not depend on the main graph
    const graph = new PureModel(
      coreModel,
      systemModel,
      this.pureGraphManagerPlugins.flatMap(
        (plugin) => plugin.getExtraPureGraphExtensionClasses?.() ?? [],
      ),
    );
    graph.setDependencyManager(dependencyManager);
    try {
      dependencyManager.initialize(dependencyMetadataMap);
      // Parse/Build Data
      const dependencyDataMap = new Map<string, V1_PureModelContextData>();
      yield Promise.all(
        Array.from(dependencyMetadataMap.entries()).map(
          ([dependencyKey, projectDependencyMetadata]) => {
            const projectModelData = new V1_PureModelContextData();
            dependencyDataMap.set(dependencyKey, projectModelData);
            return V1_entitiesToPureModelContextData(
              projectDependencyMetadata.entities,
              projectModelData,
              this.pureProtocolProcessorPlugins,
            );
          },
        ),
      );
      const preprocessingFinishedTime = Date.now();
      if (!options?.quiet) {
        this.logger.info(
          CORE_LOG_EVENT.GRAPH_DEPENDENCIES_PREPROCESSED,
          preprocessingFinishedTime - startTime,
          'ms',
        );
      }

      const graphBuilderInput: V1_GraphBuilderInput[] = Array.from(
        dependencyDataMap.entries(),
      ).map(([dependencyKey, dependencyData]) => ({
        data: indexPureModelContextData(dependencyData, this.extensions),
        model: graph.dependencyManager.getModel(dependencyKey),
      }));
      yield flowResult(
        this.initializeAndIndexElements(graph, graphBuilderInput, options),
      );
      // NOTE: we might need to process sectionIndex if we support unresolved element paths in dependencies
      yield flowResult(this.buildTypes(graph, graphBuilderInput, options));
      yield flowResult(this.buildStores(graph, graphBuilderInput, options));
      yield flowResult(this.buildMappings(graph, graphBuilderInput, options));
      yield flowResult(
        this.buildConnectionsAndRuntimes(graph, graphBuilderInput, options),
      );
      yield flowResult(this.buildServices(graph, graphBuilderInput, options));
      yield flowResult(this.buildDiagrams(graph, graphBuilderInput, options));
      yield flowResult(
        this.buildFileGenerations(graph, graphBuilderInput, options),
      );
      yield flowResult(
        this.buildGenerationSpecificationss(graph, graphBuilderInput, options),
      );
      yield flowResult(
        this.buildOtherElements(graph, graphBuilderInput, options),
      );

      yield flowResult(this.postProcess(graph, graphBuilderInput));
      const processingFinishedTime = Date.now();
      if (!options?.quiet) {
        this.logger.info(
          CORE_LOG_EVENT.GRAPH_DEPENDENCIES_PROCESSED,
          processingFinishedTime - preprocessingFinishedTime,
          'ms',
        );
      }

      dependencyManager.buildState.pass();
      if (!options?.quiet) {
        this.logger.info(
          CORE_LOG_EVENT.GRAPH_DEPENDENCIES_BUILT,
          '[TOTAL]',
          Date.now() - startTime,
          'ms',
        );
      }
    } catch (error: unknown) {
      assertErrorThrown(error);
      if (!options?.quiet) {
        this.logger.info(
          CORE_LOG_EVENT.GRAPH_BUILD_FAILED,
          '[ERROR]',
          Date.now() - startTime,
          'ms',
        );
      }
      dependencyManager.buildState.fail();
      throw new DependencyGraphProcessingError(error);
    }
  }

  /* @MARKER: NEW ELEMENT TYPE SUPPORT --- consider adding new element type handler here whenever support for a new element type is added to the app */
  *buildGraph(
    graph: PureModel,
    entities: Entity[],
    options?: GraphBuilderOptions,
  ): GeneratorFn<void> {
    if (!options?.quiet) {
      this.logger.info(CORE_LOG_EVENT.GRAPH_BUILD_STARTED);
    }
    let stepStartTime = Date.now();
    let stepFinishedTime;
    const startTime = stepStartTime;
    try {
      // Parse/Build Data
      const data = new V1_PureModelContextData();
      yield V1_entitiesToPureModelContextData(
        entities,
        data,
        this.pureProtocolProcessorPlugins,
      );

      const graphBuilderInput: V1_GraphBuilderInput[] = [
        {
          model: graph,
          data: indexPureModelContextData(data, this.extensions),
        },
      ];
      stepFinishedTime = Date.now();
      if (!options?.quiet) {
        this.logger.info(
          CORE_LOG_EVENT.GRAPH_BUILD_DATA_MODEL_PARSED,
          stepFinishedTime - stepStartTime,
          'ms',
        );
      }
      stepStartTime = stepFinishedTime;

      yield flowResult(
        this.initializeAndIndexElements(graph, graphBuilderInput, options),
      );
      stepFinishedTime = Date.now();
      if (!options?.quiet) {
        this.logger.info(
          CORE_LOG_EVENT.GRAPH_BUILD_ELEMENTS_INITIALIZED_AND_INDEXED,
          stepFinishedTime - stepStartTime,
          'ms',
          `[element: ${data.elements.length}]`,
        );
      }
      stepStartTime = stepFinishedTime;

      // Section index
      yield flowResult(
        this.buildSectionIndex(graph, graphBuilderInput, options),
      );
      stepFinishedTime = Date.now();
      if (!options?.quiet) {
        this.logger.info(
          CORE_LOG_EVENT.GRAPH_BUILD_SECTION_INDICES_BUILT,
          stepFinishedTime - stepStartTime,
          'ms',
          `[sectionIndex: ${graph.ownSectionIndices.length}]`,
        );
      }
      stepStartTime = stepFinishedTime;
      // Types
      yield flowResult(this.buildTypes(graph, graphBuilderInput, options));
      stepFinishedTime = Date.now();
      if (!options?.quiet) {
        this.logger.info(
          CORE_LOG_EVENT.GRAPH_BUILD_DOMAIN_MODELS_BUILT,
          stepFinishedTime - stepStartTime,
          'ms',
          `[class: ${graph.ownClasses.length}, enumeration: ${graph.ownEnumerations.length}, association: ${graph.ownAssociations.length}, profile: ${graph.ownProfiles.length}, functions: ${graph.ownFunctions.length}]`,
        );
      }
      stepStartTime = stepFinishedTime;

      // Stores
      yield flowResult(this.buildStores(graph, graphBuilderInput, options));
      stepFinishedTime = Date.now();
      // TODO: we might want to detail out the number of stores by type
      if (!options?.quiet) {
        this.logger.info(
          CORE_LOG_EVENT.GRAPH_BUILD_STORES_BUILT,
          stepFinishedTime - stepStartTime,
          'ms',
          `[store: ${graph.ownStores.length}]`,
        );
      }
      stepStartTime = stepFinishedTime;

      // Mappings
      yield flowResult(this.buildMappings(graph, graphBuilderInput, options));
      stepFinishedTime = Date.now();
      if (!options?.quiet) {
        this.logger.info(
          CORE_LOG_EVENT.GRAPH_BUILD_MAPPINGS_BUILT,
          stepFinishedTime - stepStartTime,
          'ms',
          `[mapping: ${graph.ownMappings.length}]`,
        );
      }
      stepStartTime = stepFinishedTime;

      // Connections
      yield flowResult(
        this.buildConnectionsAndRuntimes(graph, graphBuilderInput, options),
      );
      stepFinishedTime = Date.now();
      if (!options?.quiet) {
        this.logger.info(
          CORE_LOG_EVENT.GRAPH_BUILD_CONNECTIONS_AND_RUNTIMES_BUILT,
          stepFinishedTime - stepStartTime,
          'ms',
          `[connection: ${graph.ownConnections.length}, runtime: ${graph.ownRuntimes.length}]`,
        );
      }
      stepStartTime = stepFinishedTime;

      // Services
      yield flowResult(this.buildServices(graph, graphBuilderInput, options));
      stepFinishedTime = Date.now();
      if (!options?.quiet) {
        this.logger.info(
          CORE_LOG_EVENT.GRAPH_BUILD_SERVICES_BUILT,
          stepFinishedTime - stepStartTime,
          'ms',
          `[service: ${graph.ownServices.length}]`,
        );
      }
      stepStartTime = stepFinishedTime;

      // Diagrams
      yield flowResult(this.buildDiagrams(graph, graphBuilderInput, options));
      stepFinishedTime = Date.now();
      if (!options?.quiet) {
        this.logger.info(
          CORE_LOG_EVENT.GRAPH_BUILD_DIAGRAMS_BUILT,
          stepFinishedTime - stepStartTime,
          'ms',
          `[diagram: ${graph.ownDiagrams.length}]`,
        );
      }
      stepStartTime = stepFinishedTime;

      // File Generation
      yield flowResult(
        this.buildFileGenerations(graph, graphBuilderInput, options),
      );
      stepFinishedTime = Date.now();
      if (!options?.quiet) {
        this.logger.info(
          CORE_LOG_EVENT.GRAPH_BUILD_FILE_GENERATIONS_BUILT,
          stepFinishedTime - stepStartTime,
          'ms',
          `[file-generation: ${graph.ownFileGenerations.length}]`,
        );
      }
      stepStartTime = stepFinishedTime;

      // Generation Specifications (tree)
      yield flowResult(
        this.buildGenerationSpecificationss(graph, graphBuilderInput, options),
      );
      stepFinishedTime = Date.now();
      if (!options?.quiet) {
        this.logger.info(
          CORE_LOG_EVENT.GRAPH_BUILD_GENERATION_TREE_BUILT,
          stepFinishedTime - stepStartTime,
          'ms',
          `[generation-specification: ${graph.ownGenerationSpecifications.length}]`,
        );
      }
      stepStartTime = stepFinishedTime;

      // Other elements
      yield flowResult(
        this.buildOtherElements(graph, graphBuilderInput, options),
      );
      stepFinishedTime = Date.now();
      if (!options?.quiet) {
        this.logger.info(
          CORE_LOG_EVENT.GRAPH_BUILD_OTHER_ELEMENTS_BUILT,
          stepFinishedTime - stepStartTime,
          'ms',
        );
      }

      yield flowResult(
        this.postProcess(graph, graphBuilderInput, {
          TEMPORARY__keepSectionIndex: options?.TEMPORARY__keepSectionIndex,
        }),
      );
      graph.buildState.pass();
      if (!options?.quiet) {
        this.logger.info(
          CORE_LOG_EVENT.GRAPH_BUILT,
          '[TOTAL]',
          Date.now() - startTime,
          'ms',
        );
      }
    } catch (error: unknown) {
      assertErrorThrown(error);
      if (!options?.quiet) {
        this.logger.info(
          CORE_LOG_EVENT.GRAPH_BUILD_FAILED,
          '[ERROR]',
          Date.now() - startTime,
          'ms',
        );
      }
      graph.buildState.fail();
      /**
       * Wrap all error with `GraphError`, as we throw a lot of assertion error in the graph builder
       * But we might want to rethink this decision in the future and throw appropriate type of error
       */
      throw error instanceof GraphError ? error : new GraphError(error);
    }
  }

  *buildGenerations(
    graph: PureModel,
    generatedEntities: Map<string, Entity[]>,
    options?: GraphBuilderOptions,
  ): GeneratorFn<void> {
    const stepStartTime = Date.now();
    const generatedModel = graph.generationModel;
    generatedModel.buildState.reset();
    try {
      if (!options?.quiet) {
        this.logger.info(CORE_LOG_EVENT.GRAPH_BUILD_DATA_MODEL_PARSED);
      }
      const generatedDataMap = new Map<string, V1_PureModelContextData>();
      yield Promise.all(
        Array.from(generatedEntities.entries()).map(
          ([generationParentPath, entities]) => {
            const generatedData = new V1_PureModelContextData();
            generatedDataMap.set(generationParentPath, generatedData);
            return V1_entitiesToPureModelContextData(
              entities,
              generatedData,
              this.pureProtocolProcessorPlugins,
            );
          },
        ),
      );
      const generationGraphBuilderInput = Array.from(
        generatedDataMap.entries(),
      ).map(([generationParentPath, generatedData]) => ({
        parentElementPath: generationParentPath,
        data: indexPureModelContextData(generatedData, this.extensions),
        model: generatedModel,
      }));

      yield flowResult(
        this.initializeAndIndexElements(graph, generationGraphBuilderInput),
      );

      yield flowResult(this.buildTypes(graph, generationGraphBuilderInput));
      yield flowResult(this.buildStores(graph, generationGraphBuilderInput));
      yield flowResult(this.buildMappings(graph, generationGraphBuilderInput));
      yield flowResult(
        this.buildConnectionsAndRuntimes(graph, generationGraphBuilderInput),
      );
      yield flowResult(this.buildServices(graph, generationGraphBuilderInput));
      yield flowResult(this.buildDiagrams(graph, generationGraphBuilderInput));
      yield flowResult(
        this.buildFileGenerations(graph, generationGraphBuilderInput),
      );
      yield flowResult(
        this.buildGenerationSpecificationss(graph, generationGraphBuilderInput),
      );
      yield flowResult(
        this.buildOtherElements(graph, generationGraphBuilderInput),
      );

      yield flowResult(this.postProcess(graph, generationGraphBuilderInput));
      generatedModel.buildState.pass();
      if (!options?.quiet) {
        this.logger.info(
          CORE_LOG_EVENT.GRAPH_GENERATIONS_BUILT,
          Date.now() - stepStartTime,
          `${graph.generationModel.allOwnElements.length} generated elements processed`,
          'ms',
        );
      }
    } catch (error: unknown) {
      assertErrorThrown(error);
      if (!options?.quiet) {
        this.logger.info(
          CORE_LOG_EVENT.GRAPH_BUILD_FAILED,
          Date.now() - stepStartTime,
          'ms',
        );
      }
      generatedModel.buildState.fail();
      /**
       * Wrap all error with `GraphError`, as we throw a lot of assertion error in the graph builder
       * But we might want to rethink this decision in the future and throw appropriate type of error
       */
      throw error instanceof GraphError ? error : new GraphError(error);
    }
  }

  private getBuilderContext(
    graph: PureModel,
    currentSubGraph: BasicModel,
    element: V1_PackageableElement,
    options?: GraphBuilderOptions,
  ): V1_GraphBuilderContext {
    return new V1_GraphBuilderContextBuilder(
      graph,
      currentSubGraph,
      this.extensions,
      this.logger,
      options,
    )
      .withElement(element)
      .build();
  }

  /**
   * This will run the first pass builder for all elements and index them.
   * This process is needed so other core processes such as building the section indices
   * or building processes that relies on the `existence` of other elements to refer to them,
   * but not necessarily use them.
   *
   * NOTE: We aim to not do anything more than running the first pass and indexing the first pass.
   */
  private *initializeAndIndexElements(
    graph: PureModel,
    inputs: V1_GraphBuilderInput[],
    options?: GraphBuilderOptions,
  ): GeneratorFn<void> {
    yield Promise.all(
      inputs.flatMap((input) =>
        input.data.nativeElements.map((element) =>
          this.visitWithErrorHandling(
            element,
            new V1_ProtocolToMetaModelGraphFirstPassBuilder(
              this.getBuilderContext(graph, input.model, element, options),
            ),
          ),
        ),
      ),
    );
    yield Promise.all(
      this.extensions.sortedExtraElementBuilders.map(async (builder) => {
        await Promise.all(
          inputs.flatMap((input) =>
            (input.data.otherElementsByBuilder.get(builder) ?? []).map(
              (element) =>
                this.visitWithErrorHandling(
                  element,
                  new V1_ProtocolToMetaModelGraphFirstPassBuilder(
                    this.getBuilderContext(
                      graph,
                      input.model,
                      element,
                      options,
                    ),
                  ),
                ),
            ),
          ),
        );
      }),
    );
  }

  /**
   * Run post-processers on elements of the graph.
   */
  private *postProcess(
    graph: PureModel,
    inputs: V1_GraphBuilderInput[],
    options?: {
      TEMPORARY__keepSectionIndex?: boolean;
    },
  ): GeneratorFn<void> {
    yield Promise.all(
      inputs.flatMap((input) =>
        input.data.elements.map((el) =>
          promisify(() =>
            runInAction(() => {
              const element = graph.getElement(el.path);
              if (input.parentElementPath) {
                element.generationParentElement = graph.getElement(
                  input.parentElementPath,
                );
              }
              const isElementReadOnly = Boolean(
                element.getRoot().path !== ROOT_PACKAGE_NAME.MAIN,
              );
              if (isElementReadOnly) {
                element.freeze();
              }
            }),
          ),
        ),
      ),
    );
    /**
     * For now, we delete the section index. We are able to read both resolved and unresolved element paths
     * but when we write (serialize) we write only resolved paths. In the future once the issue with dependency is solved we will
     * perserve the element path both resolved and unresolved
     */
    if (!options?.TEMPORARY__keepSectionIndex) {
      graph.TEMP__deleteOwnSectionIndex();
    }
  }

  private *buildTypes(
    graph: PureModel,
    inputs: V1_GraphBuilderInput[],
    options?: GraphBuilderOptions,
  ): GeneratorFn<void> {
    // Second pass
    yield Promise.all(
      inputs.flatMap((input) =>
        input.data.profiles.map((element) =>
          this.visitWithErrorHandling(
            element,
            new V1_ProtocolToMetaModelGraphSecondPassBuilder(
              this.getBuilderContext(graph, input.model, element, options),
            ),
          ),
        ),
      ),
    );
    yield Promise.all(
      inputs.flatMap((input) =>
        input.data.classes.map((element) =>
          this.visitWithErrorHandling(
            element,
            new V1_ProtocolToMetaModelGraphSecondPassBuilder(
              this.getBuilderContext(graph, input.model, element, options),
            ),
          ),
        ),
      ),
    );
    yield Promise.all(
      inputs.flatMap((input) =>
        input.data.enumerations.map((element) =>
          this.visitWithErrorHandling(
            element,
            new V1_ProtocolToMetaModelGraphSecondPassBuilder(
              this.getBuilderContext(graph, input.model, element, options),
            ),
          ),
        ),
      ),
    );
    yield Promise.all(
      inputs.flatMap((input) =>
        input.data.measures.map((element) =>
          this.visitWithErrorHandling(
            element,
            new V1_ProtocolToMetaModelGraphSecondPassBuilder(
              this.getBuilderContext(graph, input.model, element, options),
            ),
          ),
        ),
      ),
    );
    yield Promise.all(
      inputs.flatMap((input) =>
        input.data.functions.map((element) =>
          this.visitWithErrorHandling(
            element,
            new V1_ProtocolToMetaModelGraphSecondPassBuilder(
              this.getBuilderContext(graph, input.model, element, options),
            ),
          ),
        ),
      ),
    );
    // Third pass
    yield Promise.all(
      inputs.flatMap((input) =>
        input.data.classes.map((element) =>
          this.visitWithErrorHandling(
            element,
            new V1_ProtocolToMetaModelGraphThirdPassBuilder(
              this.getBuilderContext(graph, input.model, element, options),
            ),
          ),
        ),
      ),
    );
    yield Promise.all(
      inputs.flatMap((input) =>
        input.data.associations.map((element) =>
          this.visitWithErrorHandling(
            element,
            new V1_ProtocolToMetaModelGraphThirdPassBuilder(
              this.getBuilderContext(graph, input.model, element, options),
            ),
          ),
        ),
      ),
    );
    // Fifth pass
    yield Promise.all(
      inputs.flatMap((input) =>
        input.data.classes.map((element) =>
          this.visitWithErrorHandling(
            element,
            new V1_ProtocolToMetaModelGraphFifthPassBuilder(
              this.getBuilderContext(graph, input.model, element, options),
            ),
          ),
        ),
      ),
    );
  }

  private *buildStores(
    graph: PureModel,
    inputs: V1_GraphBuilderInput[],
    options?: GraphBuilderOptions,
  ): GeneratorFn<void> {
    yield Promise.all(
      inputs.flatMap((input) =>
        input.data.stores.map((element) =>
          this.visitWithErrorHandling(
            element,
            new V1_ProtocolToMetaModelGraphSecondPassBuilder(
              this.getBuilderContext(graph, input.model, element, options),
            ),
          ),
        ),
      ),
    );
    yield Promise.all(
      inputs.flatMap((input) =>
        input.data.stores.map((element) =>
          this.visitWithErrorHandling(
            element,
            new V1_ProtocolToMetaModelGraphThirdPassBuilder(
              this.getBuilderContext(graph, input.model, element, options),
            ),
          ),
        ),
      ),
    );
    yield Promise.all(
      inputs.flatMap((input) =>
        input.data.stores.map((element) =>
          this.visitWithErrorHandling(
            element,
            new V1_ProtocolToMetaModelGraphFourthPassBuilder(
              this.getBuilderContext(graph, input.model, element, options),
            ),
          ),
        ),
      ),
    );
    yield Promise.all(
      inputs.flatMap((input) =>
        input.data.stores.map((element) =>
          this.visitWithErrorHandling(
            element,
            new V1_ProtocolToMetaModelGraphFifthPassBuilder(
              this.getBuilderContext(graph, input.model, element, options),
            ),
          ),
        ),
      ),
    );
  }

  private *buildMappings(
    graph: PureModel,
    inputs: V1_GraphBuilderInput[],
    options?: GraphBuilderOptions,
  ): GeneratorFn<void> {
    yield Promise.all(
      inputs.flatMap((input) =>
        input.data.mappings.map((element) =>
          this.visitWithErrorHandling(
            element,
            new V1_ProtocolToMetaModelGraphSecondPassBuilder(
              this.getBuilderContext(graph, input.model, element, options),
            ),
          ),
        ),
      ),
    );
    yield Promise.all(
      inputs.flatMap((input) =>
        input.data.mappings.map((element) =>
          this.visitWithErrorHandling(
            element,
            new V1_ProtocolToMetaModelGraphThirdPassBuilder(
              this.getBuilderContext(graph, input.model, element, options),
            ),
          ),
        ),
      ),
    );
    yield Promise.all(
      inputs.flatMap((input) =>
        input.data.mappings.map((element) =>
          this.visitWithErrorHandling(
            element,
            new V1_ProtocolToMetaModelGraphFourthPassBuilder(
              this.getBuilderContext(graph, input.model, element, options),
            ),
          ),
        ),
      ),
    );
  }

  private *buildConnectionsAndRuntimes(
    graph: PureModel,
    inputs: V1_GraphBuilderInput[],
    options?: GraphBuilderOptions,
  ): GeneratorFn<void> {
    // NOTE: connections must be built before runtimes
    yield Promise.all(
      inputs.flatMap((input) =>
        input.data.connections.map((element) =>
          this.visitWithErrorHandling(
            element,
            new V1_ProtocolToMetaModelGraphSecondPassBuilder(
              this.getBuilderContext(graph, input.model, element, options),
            ),
          ),
        ),
      ),
    );
    yield Promise.all(
      inputs.flatMap((input) =>
        input.data.runtimes.map((element) =>
          this.visitWithErrorHandling(
            element,
            new V1_ProtocolToMetaModelGraphSecondPassBuilder(
              this.getBuilderContext(graph, input.model, element, options),
            ),
          ),
        ),
      ),
    );
  }

  private *buildServices(
    graph: PureModel,
    inputs: V1_GraphBuilderInput[],
    options?: GraphBuilderOptions,
  ): GeneratorFn<void> {
    yield Promise.all(
      inputs.flatMap((input) =>
        input.data.services.map((element) =>
          this.visitWithErrorHandling(
            element,
            new V1_ProtocolToMetaModelGraphSecondPassBuilder(
              this.getBuilderContext(graph, input.model, element, options),
            ),
          ),
        ),
      ),
    );
  }

  private *buildDiagrams(
    graph: PureModel,
    inputs: V1_GraphBuilderInput[],
    options?: GraphBuilderOptions,
  ): GeneratorFn<void> {
    yield Promise.all(
      inputs.flatMap((input) =>
        input.data.diagrams.map((element) =>
          this.visitWithErrorHandling(
            element,
            new V1_ProtocolToMetaModelGraphSecondPassBuilder(
              this.getBuilderContext(graph, input.model, element, options),
            ),
          ),
        ),
      ),
    );
  }

  private *buildFileGenerations(
    graph: PureModel,
    inputs: V1_GraphBuilderInput[],
    options?: GraphBuilderOptions,
  ): GeneratorFn<void> {
    yield Promise.all(
      inputs.flatMap((input) =>
        input.data.fileGenerations.map((element) =>
          this.visitWithErrorHandling(
            element,
            new V1_ProtocolToMetaModelGraphSecondPassBuilder(
              this.getBuilderContext(graph, input.model, element, options),
            ),
          ),
        ),
      ),
    );
  }

  private *buildGenerationSpecificationss(
    graph: PureModel,
    inputs: V1_GraphBuilderInput[],
    options?: GraphBuilderOptions,
  ): GeneratorFn<void> {
    yield Promise.all(
      inputs.flatMap((input) =>
        input.data.generationSpecifications.map((element) =>
          this.visitWithErrorHandling(
            element,
            new V1_ProtocolToMetaModelGraphSecondPassBuilder(
              this.getBuilderContext(graph, input.model, element, options),
            ),
          ),
        ),
      ),
    );
  }

  private *buildSectionIndex(
    graph: PureModel,
    inputs: V1_GraphBuilderInput[],
    options?: GraphBuilderOptions,
  ): GeneratorFn<void> {
    yield Promise.all(
      inputs.flatMap((input) =>
        input.data.sectionIndices.map((element) =>
          this.visitWithErrorHandling(
            element,
            new V1_ProtocolToMetaModelGraphSecondPassBuilder(
              this.getBuilderContext(graph, input.model, element, options),
            ),
          ),
        ),
      ),
    );
  }

  private *buildOtherElements(
    graph: PureModel,
    inputs: V1_GraphBuilderInput[],
    options?: GraphBuilderOptions,
  ): GeneratorFn<void> {
    yield Promise.all(
      this.extensions.sortedExtraElementBuilders.map(async (builder) => {
        await Promise.all(
          inputs.flatMap((input) =>
            (input.data.otherElementsByBuilder.get(builder) ?? []).map(
              (element) =>
                this.visitWithErrorHandling(
                  element,
                  new V1_ProtocolToMetaModelGraphSecondPassBuilder(
                    this.getBuilderContext(
                      graph,
                      input.model,
                      element,
                      options,
                    ),
                  ),
                ),
            ),
          ),
        );
        await Promise.all(
          inputs.flatMap((input) =>
            (input.data.otherElementsByBuilder.get(builder) ?? []).map(
              (element) =>
                this.visitWithErrorHandling(
                  element,
                  new V1_ProtocolToMetaModelGraphThirdPassBuilder(
                    this.getBuilderContext(
                      graph,
                      input.model,
                      element,
                      options,
                    ),
                  ),
                ),
            ),
          ),
        );
        await Promise.all(
          inputs.flatMap((input) =>
            (input.data.otherElementsByBuilder.get(builder) ?? []).map(
              (element) =>
                this.visitWithErrorHandling(
                  element,
                  new V1_ProtocolToMetaModelGraphFourthPassBuilder(
                    this.getBuilderContext(
                      graph,
                      input.model,
                      element,
                      options,
                    ),
                  ),
                ),
            ),
          ),
        );
        await Promise.all(
          inputs.flatMap((input) =>
            (input.data.otherElementsByBuilder.get(builder) ?? []).map(
              (element) =>
                this.visitWithErrorHandling(
                  element,
                  new V1_ProtocolToMetaModelGraphFifthPassBuilder(
                    this.getBuilderContext(
                      graph,
                      input.model,
                      element,
                      options,
                    ),
                  ),
                ),
            ),
          ),
        );
      }),
    );
  }

  private visitWithErrorHandling<T>(
    element: V1_PackageableElement,
    visitor: V1_PackageableElementVisitor<T>,
  ): Promise<T> {
    try {
      return promisify(() =>
        runInAction(() => element.accept_PackageableElementVisitor(visitor)),
      );
    } catch (err: unknown) {
      assertErrorThrown(err);
      const error = err instanceof GraphError ? err : new GraphError(err);
      error.message = `Error processing element '${element.path}': ${err.message}`;
      throw error;
    }
  }

  // --------------------------------------------- Grammar ---------------------------------------------

  *graphToPureCode(graph: PureModel): GeneratorFn<string> {
    const startTime = Date.now();
    const graphData = this.graphToPureModelContextData(graph);
    const grammarToJson = (yield flowResult(
      this.engine.pureModelContextDataToPureCode(graphData),
    )) as string;
    this.logger.info(
      CORE_LOG_EVENT.GRAPH_MODEL_TO_GRAMMAR_TRANSFORMED,
      Date.now() - startTime,
      'ms',
    );
    return grammarToJson;
  }

  private *pureCodeToPureModelContextData(
    code: string,
    options?: { onError?: () => void },
  ): GeneratorFn<V1_PureModelContextData> {
    return (yield flowResult(
      this.engine.pureCodeToPureModelContextData(code, options),
    )) as V1_PureModelContextData;
  }

  *entitiesToPureCode(entities: Entity[]): GeneratorFn<string> {
    const graphData = (yield flowResult(
      this.entitiesToPureModelContextData(entities),
    )) as V1_PureModelContextData;
    const startTime = Date.now();
    const grammarToJson = (yield flowResult(
      this.engine.pureModelContextDataToPureCode(graphData),
    )) as string;
    this.logger.info(
      CORE_LOG_EVENT.GRAPH_MODEL_TO_GRAMMAR_TRANSFORMED,
      Date.now() - startTime,
      'ms',
    );
    return grammarToJson;
  }

  *pureCodeToEntities(code: string): GeneratorFn<Entity[]> {
    const graphData = (yield flowResult(
      this.pureCodeToPureModelContextData(code),
    )) as V1_PureModelContextData;
    return this.pureModelContextDataToEntities(graphData);
  }

  *pureCodeToLambda(
    lambda: string,
    lambdaId: string,
  ): GeneratorFn<RawLambda | undefined> {
    const result = (yield flowResult(
      this.engine.transformCodeToLambda(lambda, lambdaId),
    )) as V1_RawLambda | undefined;
    return result ? new RawLambda(result.parameters, result.body) : undefined;
  }

  *lambdaToPureCode(
    lambdas: Map<string, RawLambda>,
    pretty?: boolean,
  ): GeneratorFn<Map<string, string>> {
    return (yield flowResult(
      this.engine.transformLambdasToCode(
        lambdas,
        this.pureProtocolProcessorPlugins,
        pretty,
      ),
    )) as Map<string, string>;
  }

  *pureCodeToRelationalOperationElement(
    operation: string,
    operationId: string,
  ): GeneratorFn<RawRelationalOperationElement | undefined> {
    return (yield flowResult(
      this.engine.transformPureCodeToRelationalOperationElement(
        operation,
        operationId,
      ),
    )) as V1_RawRelationalOperationElement | undefined;
  }

  *relationalOperationElementToPureCode(
    operations: Map<string, RawRelationalOperationElement>,
  ): GeneratorFn<Map<string, string>> {
    return (yield flowResult(
      this.engine.transformRelationalOperationElementsToPureCode(operations),
    )) as Map<string, string>;
  }

  // ------------------------------------------- Compile -------------------------------------------

  *compileGraph(
    graph: PureModel,
    options?: { onError?: () => void; keepSourceInformation?: boolean },
  ): GeneratorFn<void> {
    const fullModel = this.getFullGraphModelData(graph, {
      keepSourceInformation: options?.keepSourceInformation,
    });
    yield flowResult(
      this.engine.compilePureModelContextData(fullModel, {
        onError: options?.onError,
      }),
    );
  }

  *compileText(
    graphGrammar: string,
    graph: PureModel,
    options?: { onError?: () => void },
  ): GeneratorFn<Entity[]> {
    const compileContext = this.getGraphCompileContext(graph);
    const pureModelContextData = (yield flowResult(
      this.engine.compileText(graphGrammar, compileContext, options),
    )) as V1_PureModelContextData;
    return this.pureModelContextDataToEntities(pureModelContextData);
  }

  *getLambdaReturnType(
    lambda: RawLambda,
    graph: PureModel,
    options?: { keepSourceInformation?: boolean },
  ): GeneratorFn<string> {
    return (yield flowResult(
      this.engine.getLambdaReturnType(
        lambda.accept_RawValueSpecificationVisitor(
          new V1_RawValueSpecificationTransformer(
            new V1_GraphTransformerContextBuilder(
              this.pureProtocolProcessorPlugins,
            )
              .withKeepSourceInformationFlag(
                Boolean(options?.keepSourceInformation),
              )
              .build(),
          ),
        ) as V1_RawLambda,
        this.getFullGraphModelData(graph),
      ),
    )) as string;
  }

  // ------------------------------------------- Generation -------------------------------------------

  *getAvailableGenerationConfigurationDescriptions(): GeneratorFn<
    GenerationConfigurationDescription[]
  > {
    return (yield flowResult(
      this.engine.getAvailableGenerationConfigurationDescriptions(),
    )) as GenerationConfigurationDescription[];
  }

  *generateFile(
    fileGeneration: FileGenerationSpecification,
    generationMode: GenerationMode,
    graph: PureModel,
  ): GeneratorFn<GenerationOutput[]> {
    return (
      (yield flowResult(
        this.engine.generateFile(
          fileGeneration.createConfig(),
          fileGeneration.type,
          generationMode,
          this.getFullGraphModelData(graph),
        ),
      )) as PlainObject<V1_GenerationOutput>[]
    ).map((output) =>
      V1_GenerationOutput.serialization.fromJson(output).build(),
    );
  }

  *generateModel(
    generationElement: PackageableElement,
    graph: PureModel,
  ): GeneratorFn<Entity[]> {
    const model = this.getFullGraphModelData(graph);
    let generatedModel: V1_PureModelContextData | undefined = undefined;
    const extraModelGenerators = this.pureProtocolProcessorPlugins.flatMap(
      (plugin) =>
        (
          plugin as DSLGenerationSpecification_PureProtocolProcessorPlugin_Extension
        ).V1_getExtraModelGenerators?.() ?? [],
    );
    for (const generator of extraModelGenerators) {
      const _model = (yield generator(
        generationElement,
        model,
        this.engine,
      )) as V1_PureModelContextData | undefined;
      if (_model) {
        generatedModel = _model;
        break;
      }
    }
    if (!generatedModel) {
      throw new UnsupportedOperationError(
        `Can't generate model using the specified generation element: no compatible generator available from plugins`,
        generationElement,
      );
    }
    return this.pureModelContextDataToEntities(generatedModel);
  }

  // ------------------------------------------- ValueSpecification -------------------------------------------

  buildValueSpecification(
    json: Record<PropertyKey, unknown>,
    graph: PureModel,
  ): ValueSpecification {
    return V1_buildValueSpecification(
      V1_deserializeValueSpecification(json),
      new V1_GraphBuilderContextBuilder(
        graph,
        graph,
        this.extensions,
        this.logger,
      ).build(),
    );
  }

  serializeValueSpecification(
    valueSpecification: ValueSpecification,
  ): Record<PropertyKey, unknown> {
    return V1_serializeValueSpecification(
      valueSpecification.accept_ValueSpecificationVisitor(
        new V1_ValueSpecificationTransformer(
          [],
          new Map<string, unknown[]>(),
          true,
          false,
        ),
      ),
    ) as Record<PropertyKey, unknown>;
  }

  buildRawValueSpecification(
    valueSpecification: ValueSpecification,
    graph: PureModel,
  ): RawValueSpecification {
    // converts value spec to json
    const json = this.serializeValueSpecification(valueSpecification);
    // deserialize json and builds metamodal raw value spec
    const rawValueSpecification = V1_deserializeRawValueSpecification(json);
    return rawValueSpecification.accept_RawValueSpecificationVisitor(
      new V1_ProtocolToMetaModelRawValueSpecificationBuilder(
        new V1_GraphBuilderContextBuilder(
          graph,
          graph,
          this.extensions,
          this.logger,
        ).build(),
      ),
    );
  }

  serializeRawValueSpecification(
    metamodel: RawValueSpecification,
  ): Record<PropertyKey, unknown> {
    return V1_serializeRawValueSpecification(
      metamodel.accept_RawValueSpecificationVisitor(
        new V1_RawValueSpecificationTransformer(
          new V1_GraphTransformerContextBuilder(
            this.pureProtocolProcessorPlugins,
          ).build(),
        ),
      ),
    );
  }

  // ------------------------------------------- Import -------------------------------------------

  *getAvailableImportConfigurationDescriptions(): GeneratorFn<
    ImportConfigurationDescription[]
  > {
    return (yield flowResult(
      this.engine.getAvailableImportConfigurationDescriptions(),
    )) as ImportConfigurationDescription[];
  }

  *externalFormatTextToEntities(
    code: string,
    type: string,
    mode: ImportMode,
  ): GeneratorFn<Entity[]> {
    const graphData = (yield flowResult(
      this.engine.transformExternalFormatToProtocol(code, type, mode),
    )) as V1_PureModelContextData;
    return this.pureModelContextDataToEntities(graphData);
  }

  getExamplePureProtocolText(): string {
    return JSON.stringify(
      new V1_PureModelContextData(),
      undefined,
      this.engine.config.tabSize,
    );
  }

  getExampleExternalFormatImportText(): string {
    return JSON.stringify(
      {
        package: 'string (optional)',
        imports: [
          {
            fileName: 'string (optional)',
            content: 'string (optional)',
          },
        ],
      } as V1_PureModelContextGenerationInput,
      undefined,
      this.engine.config.tabSize,
    );
  }

  *entitiesToPureProtocolText(entities: Entity[]): GeneratorFn<string> {
    return JSON.stringify(
      V1_serializePureModelContext(
        (yield flowResult(
          this.entitiesToPureModelContextData(entities),
        )) as V1_PureModelContextData,
      ),
      undefined,
      this.engine.config.tabSize,
    );
  }

  pureProtocolToEntities = (protocol: string): Entity[] => {
    const graphData = V1_deserializePureModelContextData(JSON.parse(protocol));
    return this.pureModelContextDataToEntities(graphData);
  };

  // --------------------------------------------- Execution ---------------------------------------------

  createExecutionInput = (
    graph: PureModel,
    mapping: Mapping,
    lambda: RawLambda,
    runtime: Runtime,
    clientVersion: string,
  ): V1_ExecuteInput => {
    /**
     * NOTE: to lessen network load, we might need to think of a way to only include relevant part of the pure model context data here
     *
     * Graph data models can be classified based on dependency hieararchy:
     * 1. Building blocks: models that all other models depend on: e.g. domain models, connections, etc.
     * 2. Consumers: models that depends on other models: e.g. mapping, service, etc.
     * 3. Unrelated: models that depends on nothing and vice versa: e.g. text
     *
     * It would be great if we can provide a way to walk the mapping to select only relevant part, but the problem is we cannot really walk the lambda
     * object to identify relevant classes yet. so the more economical way to to base on the classification above and the knowledge about hierarchy between
     * models (e.g. service can use mapping, runtime, connection, store, etc.) we can roughly prune the graph model data by group. Following is an example
     * for mapping used for execution, but this can generalized if we introduce hierarchy/ranking for model type
     *
     */
    const graphData = this.getFullGraphModelData(graph);
    /* @MARKER: NEW ELEMENT TYPE SUPPORT --- consider adding new element type handler here whenever support for a new element type is added to the app */
    const prunedGraphData = new V1_PureModelContextData();
    const extraExecutionElements = this.pureProtocolProcessorPlugins
      .flatMap((e) => e.V1_getExtraExecutionInputGetters?.() ?? [])
      .flatMap((getter) => getter(graph, mapping, runtime, graphData));
    prunedGraphData.elements = graphData.elements
      .filter(
        (element) =>
          element instanceof V1_Class ||
          element instanceof V1_Enumeration ||
          element instanceof V1_Profile ||
          element instanceof V1_Association ||
          element instanceof V1_ConcreteFunctionDefinition ||
          element instanceof V1_Measure ||
          element instanceof V1_Store ||
          element instanceof V1_PackageableConnection ||
          element instanceof V1_PackageableRuntime ||
          element instanceof V1_Mapping,
      )
      .concat(extraExecutionElements);
    // NOTE: for execution, we usually will just assume that we send the connections embedded in the runtime value, since we don't want the user to have to create
    // packageable runtime and connection just to play with execution.
    const executeInput = new V1_ExecuteInput();
    executeInput.clientVersion = clientVersion;
    executeInput.function = V1_transformRawLambda(
      lambda,
      new V1_GraphTransformerContextBuilder(
        this.pureProtocolProcessorPlugins,
      ).build(),
    );
    executeInput.mapping = mapping.path;
    executeInput.runtime = V1_transformRuntime(
      runtime,
      new V1_GraphTransformerContextBuilder(
        this.pureProtocolProcessorPlugins,
      ).build(),
    );
    executeInput.model = prunedGraphData;
    executeInput.context = new V1_RawBaseExecutionContext(); // TODO: potentially need to support more types
    return executeInput;
  };

  *executeMapping(
    graph: PureModel,
    mapping: Mapping,
    lambda: RawLambda,
    runtime: Runtime,
    clientVersion: string,
    lossless: boolean,
  ): GeneratorFn<ExecutionResult> {
    const executeInput = this.createExecutionInput(
      graph,
      mapping,
      lambda,
      runtime,
      clientVersion,
    );
    const result = (yield this.engine.engineServerClient.execute(
      V1_ExecuteInput.serialization.toJson(executeInput),
      true,
    )) as Response;
    const resultTest = (yield result.text()) as string;
    return V1_serializeExecutionResult(
      lossless ? losslessParse(resultTest) : JSON.parse(resultTest),
    ).build();
  }

  *generateTestData(
    graph: PureModel,
    mapping: Mapping,
    lambda: RawLambda,
    runtime: Runtime,
    clientVersion: string,
  ): GeneratorFn<string> {
    const executeInput = this.createExecutionInput(
      graph,
      mapping,
      lambda,
      runtime,
      clientVersion,
    );
    return (yield this.engine.engineServerClient.generateTestDataWithDefaultSeed(
      V1_ExecuteInput.serialization.toJson(executeInput),
    )) as string;
  }

  *generateExecutionPlan(
    graph: PureModel,
    mapping: Mapping,
    lambda: RawLambda,
    runtime: Runtime,
    clientVersion: string,
  ): GeneratorFn<RawExecutionPlan> {
    const executeInput = this.createExecutionInput(
      graph,
      mapping,
      lambda,
      runtime,
      clientVersion,
    );
    return (yield this.engine.engineServerClient.generatePlan(
      V1_ExecuteInput.serialization.toJson(executeInput),
    )) as RawExecutionPlan;
  }

  buildExecutionPlan(
    executionPlanJson: PlainObject<V1_ExecutionPlan>,
    graph: PureModel,
  ): ExecutionPlan {
    return V1_buildExecutionPlan(
      V1_deserializeExecutionPlan(executionPlanJson),
      new V1_GraphBuilderContextBuilder(
        graph,
        graph,
        this.extensions,
        this.logger,
      ).build(),
    );
  }

  serializeExecutionPlan(
    executionPlan: ExecutionPlan,
  ): PlainObject<V1_ExecutionPlan> {
    return V1_serializeExecutionPlan(
      V1_transformExecutionPlan(
        executionPlan,
        new V1_GraphTransformerContextBuilder(
          this.pureProtocolProcessorPlugins,
        ).build(),
      ),
    );
  }

  serializeExecutionNode(
    executionNode: ExecutionNode,
  ): PlainObject<V1_ExecutionNode> {
    return V1_serializeExecutionNode(
      V1_transformExecutionNode(
        executionNode,
        new V1_GraphTransformerContextBuilder(
          this.pureProtocolProcessorPlugins,
        ).build(),
      ),
    );
  }

  // --------------------------------------------- V1_Store ---------------------------------------------

  *buildDatabase(input: DatabaseBuilderInput): GeneratorFn<Entity[]> {
    const dbBuilderInput = new V1_DatabaseBuilderInput();
    dbBuilderInput.connection = V1_transformRelationalDatabaseConnection(
      input.connection,
      new V1_GraphTransformerContextBuilder(
        this.pureProtocolProcessorPlugins,
      ).build(),
    );
    const targetDatabase = new V1_TargetDatabase();
    targetDatabase.package = input.targetDatabase.package;
    targetDatabase.name = input.targetDatabase.name;
    dbBuilderInput.targetDatabase = targetDatabase;
    const config = new V1_DatabaseBuilderConfig();
    config.maxTables = input.config.maxTables;
    config.enrichTables = input.config.enrichTables;
    config.enrichPrimaryKeys = input.config.enrichPrimaryKeys;
    config.enrichColumns = input.config.enrichColumns;
    config.patterns = input.config.patterns.map(
      (storePattern: DatabasePattern): V1_DatabasePattern => {
        const pattern = new V1_DatabasePattern();
        pattern.schemaPattern = storePattern.schemaPattern;
        pattern.tablePattern = storePattern.tablePattern;
        pattern.escapeSchemaPattern = storePattern.escapeSchemaPattern;
        pattern.escapeTablePattern = storePattern.escapeTablePattern;
        return pattern;
      },
    );
    dbBuilderInput.config = config;
    const jsonGraph = (yield this.engine.engineServerClient.buildDatabase(
      V1_DatabaseBuilderInput.serialization.toJson(dbBuilderInput),
    )) as PlainObject<V1_PureModelContextData>;
    const graph = V1_deserializePureModelContextData(jsonGraph);
    return this.pureModelContextDataToEntities(graph);
  }

  // --------------------------------------------- V1_Service ---------------------------------------------

  *runServiceTests(
    service: Service,
    graph: PureModel,
  ): GeneratorFn<ServiceTestResult[]> {
    const protocolGraph = this.getFullGraphModelData(graph);
    const targetService = guaranteeNonNullable(
      protocolGraph
        .getElementsOfType(V1_Service)
        .find((s) => s.path === service.path),
      `Service element '${service.path}' not found to run tests`,
    );
    protocolGraph.elements = protocolGraph.elements.filter(
      (e) => !(e instanceof V1_Service),
    );
    protocolGraph.elements.push(targetService);
    return (
      (yield flowResult(
        this.engine.runServiceTests(service.path, protocolGraph),
      )) as V1_ServiceTestResult[]
    ).map((result) => result.build());
  }

  *registerService(
    graph: PureModel,
    service: Service,
    projectId: string,
    server: string,
    executionMode: ServiceExecutionMode,
    version: string | undefined,
  ): GeneratorFn<ServiceRegistrationResult> {
    const serverServiceInfo =
      (yield this.engine.engineServerClient.serverServiceInfo()) as V1_ServiceConfigurationInfo;
    // end url
    let endUrl = '';
    if (executionMode !== ServiceExecutionMode.PROD) {
      endUrl = `_${
        executionMode === ServiceExecutionMode.FULL_INTERACTIVE
          ? 'fullInteractive'
          : 'semiInteractive'
      }`;
    }
    // input
    let input: V1_PureModelContext;
    const protocol = new V1_Protocol(
      'pure',
      serverServiceInfo.services.dependencies.pure,
    );
    switch (executionMode) {
      case ServiceExecutionMode.FULL_INTERACTIVE: {
        const data = this.createServiceRegistrationInput(
          graph,
          service,
          serverServiceInfo,
        );
        data.origin = new V1_PureModelContextPointer(protocol);
        input = data;
        break;
      }
      case ServiceExecutionMode.SEMI_INTERACTIVE: {
        const sdlcInfo = new V1_AlloySdlc(projectId, version);
        const pointer = new V1_PureModelContextPointer(protocol, sdlcInfo);
        // data
        const data = new V1_PureModelContextData();
        data.origin = new V1_PureModelContextPointer(protocol);
        data.elements = [this.elementToProtocol<V1_Service>(service)];
        // sdlc info
        const execution = service.execution;
        if (execution instanceof PureSingleExecution) {
          sdlcInfo.packageableElementPointers = [
            new V1_PackageableElementPointer(
              V1_PackageableElementPointerType.MAPPING,
              execution.mapping.value.path,
            ),
          ];
        } else {
          throw new UnsupportedOperationError(
            `Can't register service with the specified execution`,
            execution,
          );
        }
        // composite input
        input = new V1_PureModelContextComposite(protocol, data, pointer);
        break;
      }
      case ServiceExecutionMode.PROD: {
        const sdlcInfo = new V1_AlloySdlc(projectId, version);
        const pointer = new V1_PureModelContextPointer(protocol, sdlcInfo);
        sdlcInfo.packageableElementPointers = [
          new V1_PackageableElementPointer(
            V1_PackageableElementPointerType.SERVICE,
            service.path,
          ),
        ];
        input = pointer;
        break;
      }
      default: {
        throw new UnsupportedOperationError(
          `Can't register service with execution mode '${executionMode}'`,
        );
      }
    }
    return V1_ServiceRegistrationResult.serialization
      .fromJson(
        (yield this.engine.engineServerClient.registerService(
          V1_serializePureModelContext(input),
          server,
          endUrl,
        )) as PlainObject<V1_ServiceRegistrationResult>,
      )
      .build();
  }

  *activateService(serviceUrl: string, serviceId: string): GeneratorFn<void> {
    const serviceStoreg = V1_ServiceStorage.serialization.fromJson(
      (yield this.engine.engineServerClient.getServiceVersionInfo(
        serviceUrl,
        serviceId,
      )) as PlainObject<V1_ServiceStorage>,
    );
    yield this.engine.engineServerClient.activateGenerationId(
      serviceUrl,
      serviceStoreg.getGenerationId(),
    );
  }

  private createServiceRegistrationInput = (
    graph: PureModel,
    service: Service,
    serverServiceInfo: V1_ServiceConfigurationInfo,
  ): V1_PureModelContextData => {
    const graphData = this.getFullGraphModelData(graph);
    /* @MARKER: NEW ELEMENT TYPE SUPPORT --- consider adding new element type handler here whenever support for a new element type is added to the app */
    const prunedGraphData = new V1_PureModelContextData();
    prunedGraphData.elements = graphData.elements.filter(
      (element) =>
        element instanceof V1_Class ||
        element instanceof V1_Enumeration ||
        element instanceof V1_Profile ||
        element instanceof V1_Association ||
        element instanceof V1_ConcreteFunctionDefinition ||
        element instanceof V1_Measure ||
        element instanceof V1_Store ||
        element instanceof V1_PackageableConnection ||
        element instanceof V1_Mapping ||
        element instanceof V1_PackageableRuntime,
    );
    prunedGraphData.elements.push(this.elementToProtocol<V1_Service>(service));
    return prunedGraphData;
  };

  // --------------------------------------------- Query ---------------------------------------------

  *getQueries(
    isOwner: boolean,
    limit: number | undefined,
    graph: PureModel,
  ): GeneratorFn<Query[]> {
    return (
      (yield this.engine.engineServerClient.getQueries(
        isOwner,
        limit,
      )) as PlainObject<V1_Query>[]
    )
      .map((query) => V1_Query.serialization.fromJson(query))
      .map((protocol) => V1_buildQuery(protocol, graph));
  }

  *getQuery(queryId: string, graph: PureModel): GeneratorFn<Query> {
    return V1_buildQuery(
      V1_Query.serialization.fromJson(
        (yield this.engine.engineServerClient.getQuery(
          queryId,
        )) as PlainObject<V1_Query>,
      ),
      graph,
    );
  }

  *createQuery(query: Query): GeneratorFn<void> {
    yield this.engine.engineServerClient.createQuery(V1_transformQuery(query));
  }

  *updateQuery(query: Query): GeneratorFn<void> {
    yield this.engine.engineServerClient.updateQuery(
      query.id,
      V1_transformQuery(query),
    );
  }

  // --------------------------------------------- Change Detection ---------------------------------------------

  *buildHashesIndex(entities: Entity[]): GeneratorFn<Map<string, string>> {
    const hashMap = new Map<string, string>();
    const pureModelContextData = new V1_PureModelContextData();
    yield V1_entitiesToPureModelContextData(
      entities,
      pureModelContextData,
      this.pureProtocolProcessorPlugins,
    );
    yield Promise.all(
      pureModelContextData.elements.map((element) =>
        promisify(() =>
          runInAction(() => hashMap.set(element.path, element.hashCode)),
        ),
      ),
    );
    return hashMap;
  }

  // ------------------------------------------- Raw V1_Protocol Handling -------------------------------------------

  /**
   * As mentioned, this method is needed because sometimes we want to parse and store protocol from grammar
   * However, we want to prune away the source information. There is no realy good way to do this, other than
   * hard-coding the source informations fields like this. We should cleanup these in the backend and use
   * pointer instead so source information is coupled with the value instead of having custom-name source information
   * fields like these, polluting the protocol models.
   */
  pruneSourceInformation = (
    object: Record<PropertyKey, unknown>,
  ): Record<PropertyKey, unknown> =>
    recursiveOmit(
      object,
      [
        SOURCE_INFORMATION_KEY,
        // domain
        'profileSourceInformation',
        'propertyTypeSourceInformation',
        // diagram
        'classSourceInformation',
        'sourceViewSourceInformation',
        'targetViewSourceInformation',
        // connection
        'elementSourceInformation',
        'classSourceInformation',
        // mapping
        'classSourceInformation',
        'sourceClassSourceInformation',
        'enumMappingIdSourceInformation',
        'flatDataSourceInformation',
        // service
        'mappingSourceInformation',
        // flat-data store
        'nameSourceInformation',
        'driverIdSourceInformation',
        // file generation
        'typeSourceInformation',
      ].concat(
        this.pureProtocolProcessorPlugins.flatMap(
          (plugin) => plugin.V1_getExtraSourceInformationKeys?.() ?? [],
        ),
      ),
    );

  elementToEntity = (
    element: PackageableElement,
    pruneSourceInformation?: boolean,
  ): Entity => {
    const entity = this.elementProtocolToEntity(
      this.elementToProtocol<V1_PackageableElement>(element),
    );
    if (pruneSourceInformation) {
      entity.content = this.pruneSourceInformation(entity.content);
    }
    return entity;
  };

  // --------------------------------------------- SHARED ---------------------------------------------

  private *entitiesToPureModelContextData(
    entities: Entity[],
  ): GeneratorFn<V1_PureModelContextData> {
    const graphData = new V1_PureModelContextData();
    yield V1_entitiesToPureModelContextData(
      entities,
      graphData,
      this.pureProtocolProcessorPlugins,
    );
    return graphData;
  }

  private getFullGraphModelData(
    graph: PureModel,
    options?: { keepSourceInformation?: boolean },
  ): V1_PureModelContextData {
    const contextData1 = this.graphToPureModelContextData(graph, {
      keepSourceInformation: options?.keepSourceInformation,
    });
    const contextData2 = this.getGraphCompileContext(graph);
    contextData1.elements = [
      ...contextData1.elements,
      ...contextData2.elements,
    ];
    return contextData1;
  }

  private elementToProtocol = <T extends V1_PackageableElement>(
    element: PackageableElement,
    options?: { keepSourceInformation?: boolean },
  ): T =>
    element.accept_PackageableElementVisitor(
      new V1_PackageableElementTransformer(
        this.pureProtocolProcessorPlugins,
        new V1_GraphTransformerContextBuilder(this.pureProtocolProcessorPlugins)
          .withKeepSourceInformationFlag(
            Boolean(options?.keepSourceInformation),
          )
          .build(),
      ),
    ) as T;

  private pureModelContextDataToEntities = (
    graphProtocol: V1_PureModelContextData,
  ): Entity[] =>
    graphProtocol.elements.map((e) => this.elementProtocolToEntity(e));

  private elementProtocolToEntity = (
    elementProtocol: V1_PackageableElement,
  ): Entity => ({
    path: this.getElementPath(elementProtocol),
    content: elementProtocol.accept_PackageableElementVisitor(
      new V1_PackageableElementSerializer(this.pureProtocolProcessorPlugins),
    ),
    classifierPath: this.getElementClassiferPath(elementProtocol),
  });

  private getElementPath = (elementProtocol: V1_PackageableElement): string => {
    let name = elementProtocol.name;
    // These functions calculation the function suffix and are used to identify if an
    // function imported into Studio via model loader already has a suffix attached to the name
    // if so, we will remove that suffix
    // TODO: to be revised when we support function overloading
    if (elementProtocol instanceof V1_ConcreteFunctionDefinition) {
      const suffixIndex = elementProtocol.name.indexOf(
        getFunctionSuffix(elementProtocol),
      );
      if (suffixIndex > 0) {
        name = elementProtocol.name.substring(0, suffixIndex - 1);
      }
    }

    return `${elementProtocol.package}${ENTITY_PATH_DELIMITER}${name}`;
  };

  /* @MARKER: NEW ELEMENT TYPE SUPPORT --- consider adding new element type handler here whenever support for a new element type is added to the app */
  private getElementClassiferPath = (el: V1_PackageableElement): string => {
    if (el instanceof V1_Association) {
      return CORE_ELEMENT_CLASSIFIER_PATH.ASSOCIATION;
    } else if (el instanceof V1_Class) {
      return CORE_ELEMENT_CLASSIFIER_PATH.CLASS;
    } else if (el instanceof V1_Enumeration) {
      return CORE_ELEMENT_CLASSIFIER_PATH.ENUMERATION;
    } else if (el instanceof V1_ConcreteFunctionDefinition) {
      return CORE_ELEMENT_CLASSIFIER_PATH.FUNCTION;
    } else if (el instanceof V1_Profile) {
      return CORE_ELEMENT_CLASSIFIER_PATH.PROFILE;
    } else if (el instanceof V1_Measure) {
      return CORE_ELEMENT_CLASSIFIER_PATH.MEASURE;
    } else if (el instanceof V1_Mapping) {
      return CORE_ELEMENT_CLASSIFIER_PATH.MAPPING;
    } else if (el instanceof V1_PackageableConnection) {
      return CORE_ELEMENT_CLASSIFIER_PATH.CONNECTION;
    } else if (el instanceof V1_PackageableRuntime) {
      return CORE_ELEMENT_CLASSIFIER_PATH.RUNTIME;
    } else if (el instanceof V1_SectionIndex) {
      return CORE_ELEMENT_CLASSIFIER_PATH.SECTION_INDEX;
    } else if (el instanceof V1_FlatData) {
      return CORE_ELEMENT_CLASSIFIER_PATH.FLAT_DATA;
    } else if (el instanceof V1_Database) {
      return CORE_ELEMENT_CLASSIFIER_PATH.DATABASE;
    } else if (el instanceof V1_ServiceStore) {
      return CORE_ELEMENT_CLASSIFIER_PATH.SERVICE_STORE;
    } else if (el instanceof V1_Service) {
      return CORE_ELEMENT_CLASSIFIER_PATH.SERVICE;
    } else if (el instanceof V1_Diagram) {
      return CORE_ELEMENT_CLASSIFIER_PATH.DIAGRAM;
    } else if (el instanceof V1_FileGenerationSpecification) {
      return CORE_ELEMENT_CLASSIFIER_PATH.FILE_GENERATION;
    } else if (el instanceof V1_GenerationSpecification) {
      return CORE_ELEMENT_CLASSIFIER_PATH.GENERATION_SPECIFICATION;
    }
    const extraElementProtocolClassifierPathGetters =
      this.pureProtocolProcessorPlugins.flatMap(
        (plugin) => plugin.V1_getExtraElementClassifierPathGetters?.() ?? [],
      );
    for (const classifierPathGetter of extraElementProtocolClassifierPathGetters) {
      const classifierPath = classifierPathGetter(el);
      if (classifierPath) {
        return classifierPath;
      }
    }
    throw new UnsupportedOperationError(
      `Can't get classifier path for element '${el.path}': no compatible classifier path getter available from plugins`,
    );
  };

  /* @MARKER: NEW ELEMENT TYPE SUPPORT --- consider adding new element type handler here whenever support for a new element type is added to the app */
  private graphToPureModelContextData = (
    graph: PureModel,
    options?: { keepSourceInformation?: boolean },
  ): V1_PureModelContextData => {
    const startTime = Date.now();
    const graphData = new V1_PureModelContextData();
    graphData.elements = graph.allOwnElements.map((e) =>
      this.elementToProtocol(e, {
        keepSourceInformation: options?.keepSourceInformation,
      }),
    );
    this.logger.info(
      CORE_LOG_EVENT.GRAPH_META_MODEL_TO_PROTOCOL_TRANSFORMED,
      Date.now() - startTime,
      'ms',
    );
    return graphData;
  };

  /* @MARKER: NEW ELEMENT TYPE SUPPORT --- consider adding new element type handler here whenever support for a new element type is added to the app */
  private getGraphCompileContext = (
    graph: PureModel,
  ): V1_PureModelContextData => {
    const startTime = Date.now();
    const graphData = new V1_PureModelContextData();
    const dependencyManager = graph.dependencyManager;
    const generatedModel = graph.generationModel;
    graphData.elements = [
      ...dependencyManager.allElements,
      ...generatedModel.allOwnElements,
    ].map((e) => this.elementToProtocol(e));
    this.logger.info(
      CORE_LOG_EVENT.GRAPH_COMPILE_CONTEXT_COLLECTED,
      Date.now() - startTime,
      'ms',
    );
    return graphData;
  };

  // --------------------------------------------- HACKY ---------------------------------------------

  HACKY_createGetAllLambda(_class: Class): RawLambda {
    return new RawLambda(
      [],
      [
        {
          _type: 'func',
          function: 'getAll',
          parameters: [
            {
              _type: 'packageableElementPtr',
              fullPath: _class.path,
            },
          ],
        },
      ],
    );
  }

  HACKY_createServiceTestAssertLambda(assertData: string): RawLambda {
    return new RawLambda(
      [
        {
          _type: 'var',
          class: 'meta::pure::mapping::Result',
          multiplicity: { lowerBound: 1, upperBound: 1 },
          name: 'res',
        },
      ],
      [
        {
          _type: 'func',
          function: 'equalJsonStrings',
          parameters: [
            {
              _type: 'func',
              function: 'toString',
              parameters: [
                {
                  _type: 'func',
                  function: 'toOne',
                  parameters: [
                    {
                      _type: 'property',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'res',
                        },
                      ],
                      property: 'values',
                    },
                  ],
                },
              ],
            },
            {
              _type: 'string',
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
              values: [assertData],
            },
          ],
        },
      ],
    );
  }

  HACKY_extractServiceTestAssertionData(query: RawLambda): string | undefined {
    let json: string | undefined;
    try {
      json = (
        (
          ((query.body as unknown[])[0] as Record<PropertyKey, unknown>) // FunctionValue
            .parameters as unknown[]
        )[1] as {
          values: (string | undefined)[];
        }
      ).values[0];
      assertTrue(typeof json === 'string', `Expected value of type 'string'`);
    } catch (error: unknown) {
      this.logger.warn(
        CORE_LOG_EVENT.SERVICE_TEST_PROBLEM,
        `Can't extract assertion result`,
      );
      json = undefined;
    }
    if (!json) {
      /* Add other assertion cases if we read others */
    }
    return json;
  }
}
