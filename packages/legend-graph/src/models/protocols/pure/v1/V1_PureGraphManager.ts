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

import { GRAPH_MANAGER_EVENT } from '../../../../graphManager/GraphManagerEvent.js';
import {
  CORE_PURE_PATH,
  ELEMENT_PATH_DELIMITER,
  PackageableElementPointerType,
} from '../../../../MetaModelConst.js';
import {
  type Clazz,
  type Log,
  type PlainObject,
  type ServerClientConfig,
  type ActionState,
  TracerService,
  LogEvent,
  getClass,
  guaranteeNonNullable,
  UnsupportedOperationError,
  assertTrue,
  assertErrorThrown,
  promisify,
  StopWatch,
  filterByType,
  isNonNullable,
  guaranteeNonEmptyString,
  addUniqueEntry,
  uuid,
  deleteEntry,
  assertType,
} from '@finos/legend-shared';
import type { TEMPORARY__AbstractEngineConfig } from '../../../../graphManager/action/TEMPORARY__AbstractEngineConfig.js';
import {
  AbstractPureGraphManager,
  type TEMPORARY__EngineSetupConfig,
  type GraphBuilderOptions,
  type ExecutionOptions,
} from '../../../../graphManager/AbstractPureGraphManager.js';
import type { Mapping } from '../../../metamodels/pure/packageableElements/mapping/Mapping.js';
import {
  type Runtime,
  EngineRuntime,
} from '../../../metamodels/pure/packageableElements/runtime/Runtime.js';
import type {
  ImportConfigurationDescription,
  ImportMode,
} from '../../../../graphManager/action/generation/ImportConfigurationDescription.js';
import type { PackageableElement } from '../../../metamodels/pure/packageableElements/PackageableElement.js';
import {
  type SystemModel,
  type CoreModel,
  PureModel,
} from '../../../../graph/PureModel.js';
import type { BasicModel } from '../../../../graph/BasicModel.js';
import type { DependencyManager } from '../../../../graph/DependencyManager.js';
import type { Class } from '../../../metamodels/pure/packageableElements/domain/Class.js';
import { RawLambda } from '../../../metamodels/pure/rawValueSpecification/RawLambda.js';
import type { RawValueSpecification } from '../../../metamodels/pure/rawValueSpecification/RawValueSpecification.js';
import type { FileGenerationSpecification } from '../../../metamodels/pure/packageableElements/fileGeneration/FileGenerationSpecification.js';
import type {
  GenerationConfigurationDescription,
  GenerationMode,
} from '../../../../graphManager/action/generation/GenerationConfigurationDescription.js';
import type { DEPRECATED__ServiceTestResult } from '../../../../graphManager/action/service/DEPRECATED__ServiceTestResult.js';
import type { ServiceRegistrationResult } from '../../../../graphManager/action/service/ServiceRegistrationResult.js';
import type { ExecutionResult } from '../../../../graphManager/action/execution/ExecutionResult.js';
import type { GenerationOutput } from '../../../../graphManager/action/generation/GenerationOutput.js';
import type { ValueSpecification } from '../../../metamodels/pure/valueSpecification/ValueSpecification.js';
import { ServiceExecutionMode } from '../../../../graphManager/action/service/ServiceExecutionMode.js';
import {
  KeyedExecutionParameter,
  PureMultiExecution,
  PureSingleExecution,
} from '../../../metamodels/pure/packageableElements/service/ServiceExecution.js';
import {
  V1_deserializeRawValueSpecification,
  V1_serializeRawValueSpecification,
} from './transformation/pureProtocol/serializationHelpers/V1_RawValueSpecificationSerializationHelper.js';
import {
  V1_serializeValueSpecification,
  V1_deserializeValueSpecification,
} from './transformation/pureProtocol/serializationHelpers/V1_ValueSpecificationSerializer.js';
import V1_CORE_SYSTEM_MODELS from './V1_Core_SystemModels.json';
import { V1_serializePackageableElement } from './transformation/pureProtocol/V1_PackageableElementSerialization.js';
import {
  V1_entitiesToPureModelContextData,
  V1_serializePureModelContext,
  V1_deserializePureModelContextData,
  V1_setupPureModelContextDataSerialization,
} from './transformation/pureProtocol/V1_PureProtocolSerialization.js';
import { V1_PureModelContextData } from './model/context/V1_PureModelContextData.js';
import {
  type V1_PackageableElement,
  type V1_PackageableElementVisitor,
  V1_PackageableElementPointer,
} from './model/packageableElements/V1_PackageableElement.js';
import { V1_ProtocolToMetaModelGraphFirstPassBuilder } from './transformation/pureGraph/to/V1_ProtocolToMetaModelGraphFirstPassBuilder.js';
import { V1_ProtocolToMetaModelGraphSecondPassBuilder } from './transformation/pureGraph/to/V1_ProtocolToMetaModelGraphSecondPassBuilder.js';
import { V1_ProtocolToMetaModelGraphThirdPassBuilder } from './transformation/pureGraph/to/V1_ProtocolToMetaModelGraphThirdPassBuilder.js';
import { V1_ProtocolToMetaModelGraphFourthPassBuilder } from './transformation/pureGraph/to/V1_ProtocolToMetaModelGraphFourthPassBuilder.js';
import { V1_ProtocolToMetaModelGraphFifthPassBuilder } from './transformation/pureGraph/to/V1_ProtocolToMetaModelGraphFifthPassBuilder.js';
import { V1_ProtocolToMetaModelRawValueSpecificationBuilder } from './transformation/pureGraph/to/V1_ProtocolToMetaModelRawValueSpecificationBuilder.js';
import { V1_RawBaseExecutionContext } from './model/rawValueSpecification/V1_RawExecutionContext.js';
import {
  type V1_GraphBuilderContext,
  V1_GraphBuilderContextBuilder,
} from './transformation/pureGraph/to/V1_GraphBuilderContext.js';
import { V1_PureModelContextPointer } from './model/context/V1_PureModelContextPointer.js';
import { V1_Engine } from './engine/V1_Engine.js';
import { V1_transformPackageableElement } from './transformation/pureGraph/from/V1_PackageableElementTransformer.js';
import {
  V1_transformRawLambda,
  V1_RawValueSpecificationTransformer,
} from './transformation/pureGraph/from/V1_RawValueSpecificationTransformer.js';
import { V1_transformRuntime } from './transformation/pureGraph/from/V1_RuntimeTransformer.js';
import type { V1_RawLambda } from './model/rawValueSpecification/V1_RawLambda.js';
import {
  V1_ExecuteInput,
  V1_TestDataGenerationExecutionInput,
} from './engine/execution/V1_ExecuteInput.js';
import type { V1_PureModelContextGenerationInput } from './engine/import/V1_PureModelContextGenerationInput.js';
import { V1_buildValueSpecification } from './transformation/pureGraph/to/helpers/V1_ValueSpecificationBuilderHelper.js';
import { V1_transformRootValueSpecification } from './transformation/pureGraph/from/V1_ValueSpecificationTransformer.js';
import { V1_Profile } from './model/packageableElements/domain/V1_Profile.js';
import { V1_Class } from './model/packageableElements/domain/V1_Class.js';
import { V1_Enumeration } from './model/packageableElements/domain/V1_Enumeration.js';
import { V1_Association } from './model/packageableElements/domain/V1_Association.js';
import { V1_Measure } from './model/packageableElements/domain/V1_Measure.js';
import { V1_Store } from './model/packageableElements/store/V1_Store.js';
import { V1_Service } from './model/packageableElements/service/V1_Service.js';
import { V1_PackageableRuntime } from './model/packageableElements/runtime/V1_PackageableRuntime.js';
import { V1_PackageableConnection } from './model/packageableElements/connection/V1_PackageableConnection.js';
import { V1_FileGenerationSpecification } from './model/packageableElements/fileGeneration/V1_FileGenerationSpecification.js';
import { V1_SectionIndex } from './model/packageableElements/section/V1_SectionIndex.js';
import { V1_GenerationSpecification } from './model/packageableElements/generationSpecification/V1_GenerationSpecification.js';
import { V1_Mapping } from './model/packageableElements/mapping/V1_Mapping.js';
import { V1_ConcreteFunctionDefinition } from './model/packageableElements/function/V1_ConcreteFunctionDefinition.js';
import { V1_PureModelContextComposite } from './model/context/V1_PureModelContextComposite.js';
import { V1_AlloySDLC } from './model/context/V1_SDLC.js';
import { V1_Protocol } from './model/V1_Protocol.js';
import type { V1_PureModelContext } from './model/context/V1_PureModelContext.js';
import type { V1_ElementBuilder } from './transformation/pureGraph/to/V1_ElementBuilder.js';
import { V1_GraphBuilderExtensions } from './transformation/pureGraph/to/V1_GraphBuilderExtensions.js';
import type {
  DatabaseBuilderInput,
  DatabasePattern,
} from '../../../../graphManager/action/generation/DatabaseBuilderInput.js';
import {
  V1_DatabaseBuilderConfig,
  V1_DatabaseBuilderInput,
  V1_DatabasePattern,
  V1_setupDatabaseBuilderInputSerialization,
  V1_TargetDatabase,
} from './engine/generation/V1_DatabaseBuilderInput.js';
import { V1_transformRelationalDatabaseConnection } from './transformation/pureGraph/from/V1_ConnectionTransformer.js';
import { V1_FlatData } from './model/packageableElements/store/flatData/model/V1_FlatData.js';
import { V1_Database } from './model/packageableElements/store/relational/model/V1_Database.js';
import type { V1_Multiplicity } from './model/packageableElements/domain/V1_Multiplicity.js';
import type { V1_RawVariable } from './model/rawValueSpecification/V1_RawVariable.js';
import { V1_setupDatabaseSerialization } from './transformation/pureProtocol/serializationHelpers/V1_DatabaseSerializationHelper.js';
import {
  V1_PACKAGEABLE_RUNTIME_ELEMENT_PROTOCOL_TYPE,
  V1_setupEngineRuntimeSerialization,
  V1_setupLegacyRuntimeSerialization,
} from './transformation/pureProtocol/serializationHelpers/V1_RuntimeSerializationHelper.js';
import type { DSLGenerationSpecification_PureProtocolProcessorPlugin_Extension } from '../DSLGenerationSpecification_PureProtocolProcessorPlugin_Extension.js';
import type { RawRelationalOperationElement } from '../../../metamodels/pure/packageableElements/store/relational/model/RawRelationalOperationElement.js';
import { V1_GraphTransformerContextBuilder } from './transformation/pureGraph/from/V1_GraphTransformerContext.js';
import type {
  ExecutionPlan,
  RawExecutionPlan,
} from '../../../metamodels/pure/executionPlan/ExecutionPlan.js';
import type { V1_ExecutionNode } from './model/executionPlan/nodes/V1_ExecutionNode.js';
import type { ExecutionNode } from '../../../metamodels/pure/executionPlan/nodes/ExecutionNode.js';
import type { V1_ExecutionPlan } from './model/executionPlan/V1_ExecutionPlan.js';
import {
  V1_transformExecutionNode,
  V1_transformExecutionPlan,
} from './transformation/pureGraph/from/executionPlan/V1_ExecutionPlanTransformer.js';
import {
  V1_deserializeExecutionPlan,
  V1_serializeExecutionNode,
  V1_serializeExecutionPlan,
} from './transformation/pureProtocol/serializationHelpers/executionPlan/V1_ExecutionPlanSerializationHelper.js';
import { V1_buildExecutionPlan } from './transformation/pureGraph/to/V1_ExecutionPlanBuilder.js';
import type {
  LightQuery,
  Query,
} from '../../../../graphManager/action/query/Query.js';
import {
  V1_buildQuery,
  V1_buildLegacyServiceTestResult,
  V1_buildServiceRegistrationResult,
  V1_transformQuery,
  V1_buildGenerationOutput,
  V1_buildLightQuery,
  V1_transformQuerySearchSpecification,
} from './engine/V1_EngineHelper.js';
import { V1_buildExecutionResult } from './engine/execution/V1_ExecutionHelper.js';
import {
  type Entity,
  ENTITY_PATH_DELIMITER,
} from '@finos/legend-model-storage';
import {
  DependencyGraphBuilderError,
  GraphBuilderError,
  PureClientVersion,
  SystemGraphBuilderError,
} from '../../../../graphManager/GraphManagerUtils.js';
import {
  PackageableElementExplicitReference,
  PackageableElementReference,
} from '../../../metamodels/pure/packageableElements/PackageableElementReference.js';
import type { GraphPluginManager } from '../../../../GraphPluginManager.js';
import type { QuerySearchSpecification } from '../../../../graphManager/action/query/QuerySearchSpecification.js';
import type { ExternalFormatDescription } from '../../../../graphManager/action/externalFormat/ExternalFormatDescription.js';
import type { ConfigurationProperty } from '../../../metamodels/pure/packageableElements/fileGeneration/ConfigurationProperty.js';
import { V1_ExternalFormatModelGenerationInput } from './engine/externalFormat/V1_ExternalFormatModelGeneration.js';
import { GraphBuilderReport } from '../../../../graphManager/GraphBuilderReport.js';
import {
  V1_PureMultiExecution,
  V1_PureSingleExecution,
} from './model/packageableElements/service/V1_ServiceExecution.js';
import { V1_MAPPING_ELEMENT_PROTOCOL_TYPE } from './transformation/pureProtocol/serializationHelpers/V1_MappingSerializationHelper.js';
import { V1_SERVICE_ELEMENT_PROTOCOL_TYPE } from './transformation/pureProtocol/serializationHelpers/V1_ServiceSerializationHelper.js';
import { MappingInclude } from '../../../metamodels/pure/packageableElements/mapping/MappingInclude.js';
import type { ModelGenerationConfiguration } from '../../../ModelGenerationConfiguration.js';
import type { MappingGeneration_PureProtocolProcessorPlugin_Extension } from '../MappingGeneration_PureProtocolProcessorPlugin_Extension.js';
import type { Package } from '../../../metamodels/pure/packageableElements/domain/Package.js';
import { V1_DataElement } from './model/packageableElements/data/V1_DataElement.js';
import {
  V1_RunTestsInput,
  V1_RunTestsTestableInput,
} from './engine/test/V1_RunTestsInput.js';
import { V1_AtomicTestId } from './model/test/V1_AtomicTestId.js';
import type { RunTestsTestableInput } from '../../../metamodels/pure/test/result/RunTestsTestableInput.js';
import { V1_buildTestsResult } from './engine/test/V1_RunTestsResult.js';
import {
  type TestResult,
  TestFailed,
} from '../../../metamodels/pure/test/result/TestResult.js';
import type { Service } from '../../../../DSLService_Exports.js';
import type { Testable } from '../../../metamodels/pure/test/Testable.js';
import { stub_RawLambda } from '../../../../graphManager/action/creation/RawValueSpecificationCreatorHelper.js';
import {
  getNullableIDFromTestable,
  getNullableTestable,
} from '../../../../helpers/Testable_Helper.js';
import type { TestAssertion } from '../../../metamodels/pure/test/assertion/TestAssertion.js';
import type { AssertFail } from '../../../metamodels/pure/test/assertion/status/AssertFail.js';
import {
  type AtomicTest,
  TestSuite,
} from '../../../metamodels/pure/test/Test.js';
import { V1_getIncludedMappingPath } from './helper/V1_DSLMapping_Helper.js';
import { pruneSourceInformation } from '../../../../MetaModelUtils.js';
import { stub_Mapping } from '../../../../graphManager/action/creation/DSLMapping_ModelCreatorHelper.js';

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

  fileGenerations: V1_FileGenerationSpecification[] = [];
  generationSpecifications: V1_GenerationSpecification[] = [];

  dataElements: V1_DataElement[] = [];

  otherElementsByBuilder: Map<
    V1_ElementBuilder<V1_PackageableElement>,
    V1_PackageableElement[]
  > = new Map<
    V1_ElementBuilder<V1_PackageableElement>,
    V1_PackageableElement[]
  >();
}

const mergePureModelContextData = (
  ...data: V1_PureModelContextData[]
): V1_PureModelContextData => {
  const mergedData = new V1_PureModelContextData();
  for (const _data of data) {
    mergedData.elements = mergedData.elements.concat(_data.elements);
    mergedData.serializer = _data.serializer ?? mergedData.serializer;
    mergedData.origin = _data.origin ?? mergedData.origin;
  }
  return mergedData;
};

const indexPureModelContextData = (
  report: GraphBuilderReport,
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
    } else if (el instanceof V1_FileGenerationSpecification) {
      index.fileGenerations.push(el);
    } else if (el instanceof V1_GenerationSpecification) {
      index.generationSpecifications.push(el);
    } else if (el instanceof V1_DataElement) {
      index.dataElements.push(el);
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

  // report
  report.elementCount.total = report.elementCount.total + index.elements.length;
  report.elementCount.other =
    (report.elementCount.other ?? 0) +
    otherElementsByClass.size +
    index.fileGenerations.length +
    index.generationSpecifications.length;
  report.elementCount.sectionIndex =
    (report.elementCount.sectionIndex ?? 0) + index.sectionIndices.length;

  report.elementCount.association =
    (report.elementCount.association ?? 0) + index.associations.length;
  report.elementCount.class =
    (report.elementCount.class ?? 0) + index.classes.length;
  report.elementCount.enumeration =
    (report.elementCount.enumeration ?? 0) + index.enumerations.length;
  report.elementCount.function =
    (report.elementCount.function ?? 0) + index.functions.length;
  report.elementCount.profile =
    (report.elementCount.profile ?? 0) + index.profiles.length;
  report.elementCount.measure =
    (report.elementCount.measure ?? 0) + index.measures.length;

  report.elementCount.store =
    (report.elementCount.store ?? 0) + index.stores.length;
  report.elementCount.mapping =
    (report.elementCount.mapping ?? 0) + index.mappings.length;
  report.elementCount.connection =
    (report.elementCount.connection ?? 0) + index.connections.length;
  report.elementCount.runtime =
    (report.elementCount.runtime ?? 0) + index.runtimes.length;

  report.elementCount.service =
    (report.elementCount.service ?? 0) + index.services.length;

  return index;
};

// NOTE: this interface is somewhat naive since `model` is of type `BasicModel`,
// so this can only be used for pre-processing/indexing
// we might need to change model to PureModel in the future when we support other use case
interface V1_GraphBuilderInput {
  model: BasicModel;
  data: V1_PureModelContextDataIndex;
}

export interface V1_EngineSetupConfig {
  env: string;
  tabSize: number;
  clientConfig: ServerClientConfig;
}

export class V1_PureGraphManager extends AbstractPureGraphManager {
  engine: V1_Engine;
  extensions: V1_GraphBuilderExtensions;

  constructor(pluginManager: GraphPluginManager, log: Log) {
    super(pluginManager, log);
    this.engine = new V1_Engine({}, log);

    // setup plugins
    this.extensions = new V1_GraphBuilderExtensions(
      this.pluginManager.getPureProtocolProcessorPlugins(),
    );
    // setup serialization plugins
    V1_setupPureModelContextDataSerialization(
      this.pluginManager.getPureProtocolProcessorPlugins(),
    );
    V1_setupDatabaseSerialization(
      this.pluginManager.getPureProtocolProcessorPlugins(),
    );
    V1_setupEngineRuntimeSerialization(
      this.pluginManager.getPureProtocolProcessorPlugins(),
    );
    V1_setupLegacyRuntimeSerialization(
      this.pluginManager.getPureProtocolProcessorPlugins(),
    );
    V1_setupDatabaseBuilderInputSerialization(
      this.pluginManager.getPureProtocolProcessorPlugins(),
    );
  }

  TEMPORARY__getEngineConfig(): TEMPORARY__AbstractEngineConfig {
    return this.engine.config;
  }

  async initialize(
    config: TEMPORARY__EngineSetupConfig,
    options?: {
      tracerService?: TracerService | undefined;
    },
  ): Promise<void> {
    this.engine = new V1_Engine(config.clientConfig, this.log);
    this.engine
      .getEngineServerClient()
      .setTracerService(options?.tracerService ?? new TracerService());
    await this.engine.setup(config);
  }

  // --------------------------------------------- Graph Builder ---------------------------------------------

  async buildSystem(
    coreModel: CoreModel,
    systemModel: SystemModel,
    buildState: ActionState,
    options?: GraphBuilderOptions,
  ): Promise<GraphBuilderReport> {
    const stopWatch = new StopWatch();
    const report = new GraphBuilderReport();
    buildState.reset();

    // Create a dummy graph for system processing. This is to ensure system model does not depend on the main graph
    const graph = new PureModel(
      coreModel,
      systemModel,
      this.pluginManager.getPureGraphPlugins(),
    );

    try {
      // deserialize
      buildState.setMessage(`Collecting and deserializing elements...`);
      const systemData = mergePureModelContextData(
        V1_deserializePureModelContextData(V1_CORE_SYSTEM_MODELS),
        ...this.pluginManager
          .getPureProtocolProcessorPlugins()
          .flatMap((plugin) => plugin.V1_getExtraSystemModels?.() ?? [])
          .map((modelContextData) =>
            V1_deserializePureModelContextData(modelContextData),
          ),
      );
      stopWatch.record(GRAPH_MANAGER_EVENT.GRAPH_BUILDER_ELEMENTS_DESERIALIZED);

      // prepare build inputs
      const buildInputs = [
        {
          model: systemModel,
          data: indexPureModelContextData(report, systemData, this.extensions),
        },
      ];

      // build
      await this.buildGraphFromInputs(
        graph,
        buildInputs,
        report,
        stopWatch,
        buildState,
        options,
      );

      buildState.pass();
      report.timings = {
        ...Object.fromEntries(stopWatch.records),
        [GRAPH_MANAGER_EVENT.GRAPH_BUILDER_COMPLETED]: stopWatch.elapsed,
      };
      return report;
    } catch (error) {
      assertErrorThrown(error);
      buildState.fail();
      this.log.error(
        LogEvent.create(GRAPH_MANAGER_EVENT.GRAPH_BUILDER_FAILURE),
        error,
      );
      throw new SystemGraphBuilderError(error);
    } finally {
      buildState.setMessage(undefined);
    }
  }

  async buildDependencies(
    coreModel: CoreModel,
    systemModel: SystemModel,
    dependencyManager: DependencyManager,
    dependencyEntitiesMap: Map<string, Entity[]>,
    buildState: ActionState,
    options?: GraphBuilderOptions,
  ): Promise<GraphBuilderReport> {
    const stopWatch = new StopWatch();
    const report = new GraphBuilderReport();
    buildState.reset();

    // Create a dummy graph for system processing. This is to ensure dependency models do not depend on the main graph
    const graph = new PureModel(
      coreModel,
      systemModel,
      this.pluginManager.getPureGraphPlugins(),
    );
    graph.dependencyManager = dependencyManager;

    try {
      dependencyManager.initialize(dependencyEntitiesMap);

      // deserialize
      buildState.setMessage(`Partitioning and deserializing elements...`);
      const dependencyDataMap = new Map<string, V1_PureModelContextData>();
      await Promise.all(
        Array.from(dependencyEntitiesMap.entries()).map(
          ([dependencyKey, entities]) => {
            const projectModelData = new V1_PureModelContextData();
            dependencyDataMap.set(dependencyKey, projectModelData);
            return V1_entitiesToPureModelContextData(
              entities,
              projectModelData,
              this.pluginManager.getPureProtocolProcessorPlugins(),
            );
          },
        ),
      );
      stopWatch.record(GRAPH_MANAGER_EVENT.GRAPH_BUILDER_ELEMENTS_DESERIALIZED);

      // prepare build inputs
      const buildInputs: V1_GraphBuilderInput[] = Array.from(
        dependencyDataMap.entries(),
      ).map(([dependencyKey, dependencyData]) => ({
        model: graph.dependencyManager.getModel(dependencyKey),
        data: indexPureModelContextData(
          report,
          dependencyData,
          this.extensions,
        ),
      }));

      // build
      await this.buildGraphFromInputs(
        graph,
        buildInputs,
        report,
        stopWatch,
        buildState,
        options,
      );

      buildState.pass();
      report.otherStats.projectCount = dependencyEntitiesMap.size;
      report.timings = {
        ...Object.fromEntries(stopWatch.records),
        [GRAPH_MANAGER_EVENT.GRAPH_BUILDER_COMPLETED]: stopWatch.elapsed,
      };
      return report;
    } catch (error) {
      assertErrorThrown(error);
      this.log.error(
        LogEvent.create(GRAPH_MANAGER_EVENT.GRAPH_BUILDER_FAILURE),
        error,
      );
      buildState.fail();
      throw new DependencyGraphBuilderError(error);
    } finally {
      buildState.setMessage(undefined);
    }
  }

  async buildGraph(
    graph: PureModel,
    entities: Entity[],
    buildState: ActionState,
    options?: GraphBuilderOptions,
  ): Promise<GraphBuilderReport> {
    const stopWatch = new StopWatch();
    const report = new GraphBuilderReport();
    buildState.reset();

    try {
      // deserialize
      buildState.setMessage(`Deserializing elements...`);
      const data = new V1_PureModelContextData();
      await V1_entitiesToPureModelContextData(
        entities,
        data,
        this.pluginManager.getPureProtocolProcessorPlugins(),
      );
      stopWatch.record(GRAPH_MANAGER_EVENT.GRAPH_BUILDER_ELEMENTS_DESERIALIZED);

      // prepare build inputs
      const buildInputs: V1_GraphBuilderInput[] = [
        {
          model: graph,
          data: indexPureModelContextData(report, data, this.extensions),
        },
      ];

      // build
      await this.buildGraphFromInputs(
        graph,
        buildInputs,
        report,
        stopWatch,
        buildState,
        options,
      );

      /**
       * For now, we delete the section index. We are able to read both resolved and unresolved element paths
       * but when we write (serialize) we write only resolved paths. In the future once the issue with dependency is solved we will
       * perserve the element path both resolved and unresolved
       */
      if (!options?.TEMPORARY__preserveSectionIndex) {
        graph.TEMPORARY__deleteOwnSectionIndex();
      }

      buildState.pass();
      report.timings = {
        ...Object.fromEntries(stopWatch.records),
        [GRAPH_MANAGER_EVENT.GRAPH_BUILDER_COMPLETED]: stopWatch.elapsed,
      };
      return report;
    } catch (error) {
      assertErrorThrown(error);
      this.log.error(
        LogEvent.create(GRAPH_MANAGER_EVENT.GRAPH_BUILDER_FAILURE),
        error,
      );
      buildState.fail();
      /**
       * Wrap all error with `GraphBuilderError`, as we throw a lot of assertion error in the graph builder
       * But we might want to rethink this decision in the future and throw appropriate type of error
       */
      throw error instanceof GraphBuilderError
        ? error
        : new GraphBuilderError(error);
    } finally {
      buildState.setMessage(undefined);
    }
  }

  async buildGenerations(
    graph: PureModel,
    generatedEntities: Map<string, Entity[]>,
    buildState: ActionState,
    options?: GraphBuilderOptions,
  ): Promise<GraphBuilderReport> {
    const stopWatch = new StopWatch();
    const report = new GraphBuilderReport();
    const generatedModel = graph.generationModel;
    buildState.reset();

    try {
      // deserialize
      buildState.setMessage(`Deserializing elements...`);
      const generatedDataMap = new Map<string, V1_PureModelContextData>();
      await Promise.all(
        Array.from(generatedEntities.entries()).map(
          ([generationParentPath, entities]) => {
            const generatedData = new V1_PureModelContextData();
            generatedDataMap.set(generationParentPath, generatedData);
            return V1_entitiesToPureModelContextData(
              entities,
              generatedData,
              this.pluginManager.getPureProtocolProcessorPlugins(),
            );
          },
        ),
      );
      stopWatch.record(GRAPH_MANAGER_EVENT.GRAPH_BUILDER_ELEMENTS_DESERIALIZED);

      // prepare build inputs
      const buildInputs: V1_GraphBuilderInput[] = Array.from(
        generatedDataMap.entries(),
      ).map(([generationParentPath, generatedData]) => ({
        model: generatedModel,
        data: indexPureModelContextData(report, generatedData, this.extensions),
      }));

      // build
      await this.buildGraphFromInputs(
        graph,
        buildInputs,
        report,
        stopWatch,
        buildState,
        options,
      );

      buildState.pass();
      report.otherStats.generationCount = generatedDataMap.size;
      report.timings = {
        ...Object.fromEntries(stopWatch.records),
        [GRAPH_MANAGER_EVENT.GRAPH_BUILDER_COMPLETED]: stopWatch.elapsed,
      };
      return report;
    } catch (error) {
      assertErrorThrown(error);
      this.log.error(
        LogEvent.create(GRAPH_MANAGER_EVENT.GRAPH_BUILDER_FAILURE),
        error,
      );
      buildState.fail();
      /**
       * Wrap all error with `GraphBuilderError`, as we throw a lot of assertion error in the graph builder
       * But we might want to rethink this decision in the future and throw appropriate type of error
       */
      throw error instanceof GraphBuilderError
        ? error
        : new GraphBuilderError(error);
    } finally {
      buildState.setMessage(undefined);
    }
  }

  private async buildGraphFromInputs(
    graph: PureModel,
    inputs: V1_GraphBuilderInput[],
    report: GraphBuilderReport,
    stopWatch: StopWatch,
    graphBuilderState: ActionState,
    options?: GraphBuilderOptions,
  ): Promise<void> {
    // index
    graphBuilderState.setMessage(
      `Indexing ${report.elementCount.total} elements...`,
    );
    await this.initializeAndIndexElements(graph, inputs, options);
    stopWatch.record(GRAPH_MANAGER_EVENT.GRAPH_BUILDER_ELEMENTS_INDEXED);

    // build section index
    graphBuilderState.setMessage(`Building section indices...`);
    await this.buildSectionIndices(graph, inputs, options);
    stopWatch.record(GRAPH_MANAGER_EVENT.GRAPH_BUILDER_SECTION_INDICES_BUILT);

    // build types
    graphBuilderState.setMessage(`Building domain models...`);
    await this.buildTypes(graph, inputs, options);
    stopWatch.record(GRAPH_MANAGER_EVENT.GRAPH_BUILDER_DOMAIN_MODELS_BUILT);

    // build stores
    graphBuilderState.setMessage(`Building stores...`);
    await this.buildStores(graph, inputs, options);
    stopWatch.record(GRAPH_MANAGER_EVENT.GRAPH_BUILDER_STORES_BUILT);

    // build mappings
    graphBuilderState.setMessage(`Building mappings...`);
    await this.buildMappings(graph, inputs, options);
    stopWatch.record(GRAPH_MANAGER_EVENT.GRAPH_BUILDER_MAPPINGS_BUILT);

    // build connections and runtimes
    graphBuilderState.setMessage(`Building connections and runtimes...`);
    await this.buildConnectionsAndRuntimes(graph, inputs, options);
    stopWatch.record(
      GRAPH_MANAGER_EVENT.GRAPH_BUILDER_CONNECTIONS_AND_RUNTIMES_BUILT,
    );

    // build services
    graphBuilderState.setMessage(`Building services...`);
    await this.buildServices(graph, inputs, options);
    stopWatch.record(GRAPH_MANAGER_EVENT.GRAPH_BUILDER_SERVICES_BUILT);

    // build data elements
    graphBuilderState.setMessage(`Building data elements...`);
    await this.buildDataElements(graph, inputs, options);
    stopWatch.record(GRAPH_MANAGER_EVENT.GRAPH_BUILDER_DATA_ELEMENTS_BUILT);

    // build other elements
    graphBuilderState.setMessage(`Building other elements...`);
    await this.buildFileGenerations(graph, inputs, options);
    await this.buildGenerationSpecifications(graph, inputs, options);
    await this.buildOtherElements(graph, inputs, options);
    stopWatch.record(GRAPH_MANAGER_EVENT.GRAPH_BUILDER_OTHER_ELEMENTS_BUILT);
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
      this.log,
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
  private async initializeAndIndexElements(
    graph: PureModel,
    inputs: V1_GraphBuilderInput[],
    options?: GraphBuilderOptions,
  ): Promise<void> {
    // create the element path cache for faster duplication check
    // NOTE: We base on the assumption here that our graph building is cascading, i.e.
    // it first builds core, system, dependencies, graph, and generation.
    // this way, as we build the a graph, we know the next step's duplication check
    // has path cache consisting of all element from its base graphs
    const elementPathCache = new Set<string>(
      graph.allElements.map((el) => el.path),
    );

    await Promise.all(
      inputs.flatMap(async (input) => {
        // create the package cache
        const packageCache = new Map<string, Package>();

        await Promise.all(
          input.data.nativeElements.map((element) =>
            this.visitWithGraphBuilderErrorHandling(
              element,
              new V1_ProtocolToMetaModelGraphFirstPassBuilder(
                this.getBuilderContext(graph, input.model, element, options),
                packageCache,
                elementPathCache,
              ),
            ),
          ),
        );
        await Promise.all(
          this.extensions.sortedExtraElementBuilders.flatMap(async (builder) =>
            (input.data.otherElementsByBuilder.get(builder) ?? []).map(
              (element) =>
                this.visitWithGraphBuilderErrorHandling(
                  element,
                  new V1_ProtocolToMetaModelGraphFirstPassBuilder(
                    this.getBuilderContext(
                      graph,
                      input.model,
                      element,
                      options,
                    ),
                    packageCache,
                    elementPathCache,
                  ),
                ),
            ),
          ),
        );
      }),
    );
  }

  private async buildTypes(
    graph: PureModel,
    inputs: V1_GraphBuilderInput[],
    options?: GraphBuilderOptions,
  ): Promise<void> {
    // Second pass
    await Promise.all(
      inputs.flatMap((input) =>
        input.data.profiles.map((element) =>
          this.visitWithGraphBuilderErrorHandling(
            element,
            new V1_ProtocolToMetaModelGraphSecondPassBuilder(
              this.getBuilderContext(graph, input.model, element, options),
            ),
          ),
        ),
      ),
    );
    await Promise.all(
      inputs.flatMap((input) =>
        input.data.classes.map((element) =>
          this.visitWithGraphBuilderErrorHandling(
            element,
            new V1_ProtocolToMetaModelGraphSecondPassBuilder(
              this.getBuilderContext(graph, input.model, element, options),
            ),
          ),
        ),
      ),
    );
    await Promise.all(
      inputs.flatMap((input) =>
        input.data.enumerations.map((element) =>
          this.visitWithGraphBuilderErrorHandling(
            element,
            new V1_ProtocolToMetaModelGraphSecondPassBuilder(
              this.getBuilderContext(graph, input.model, element, options),
            ),
          ),
        ),
      ),
    );
    await Promise.all(
      inputs.flatMap((input) =>
        input.data.measures.map((element) =>
          this.visitWithGraphBuilderErrorHandling(
            element,
            new V1_ProtocolToMetaModelGraphSecondPassBuilder(
              this.getBuilderContext(graph, input.model, element, options),
            ),
          ),
        ),
      ),
    );
    await Promise.all(
      inputs.flatMap((input) =>
        input.data.functions.map((element) =>
          this.visitWithGraphBuilderErrorHandling(
            element,
            new V1_ProtocolToMetaModelGraphSecondPassBuilder(
              this.getBuilderContext(graph, input.model, element, options),
            ),
          ),
        ),
      ),
    );
    // Third pass
    await Promise.all(
      inputs.flatMap((input) =>
        input.data.classes.map((element) =>
          this.visitWithGraphBuilderErrorHandling(
            element,
            new V1_ProtocolToMetaModelGraphThirdPassBuilder(
              this.getBuilderContext(graph, input.model, element, options),
            ),
          ),
        ),
      ),
    );
    await Promise.all(
      inputs.flatMap((input) =>
        input.data.associations.map((element) =>
          this.visitWithGraphBuilderErrorHandling(
            element,
            new V1_ProtocolToMetaModelGraphThirdPassBuilder(
              this.getBuilderContext(graph, input.model, element, options),
            ),
          ),
        ),
      ),
    );
    // Fourth Pass
    await Promise.all(
      inputs.flatMap((input) =>
        input.data.classes.map((element) =>
          this.visitWithGraphBuilderErrorHandling(
            element,
            new V1_ProtocolToMetaModelGraphFourthPassBuilder(
              this.getBuilderContext(graph, input.model, element, options),
            ),
          ),
        ),
      ),
    );
    await Promise.all(
      inputs.flatMap((input) =>
        input.data.associations.map((element) =>
          this.visitWithGraphBuilderErrorHandling(
            element,
            new V1_ProtocolToMetaModelGraphFourthPassBuilder(
              this.getBuilderContext(graph, input.model, element, options),
            ),
          ),
        ),
      ),
    );
    // Fifth pass
    await Promise.all(
      inputs.flatMap((input) =>
        input.data.classes.map((element) =>
          this.visitWithGraphBuilderErrorHandling(
            element,
            new V1_ProtocolToMetaModelGraphFifthPassBuilder(
              this.getBuilderContext(graph, input.model, element, options),
            ),
          ),
        ),
      ),
    );
  }

  private async buildStores(
    graph: PureModel,
    inputs: V1_GraphBuilderInput[],
    options?: GraphBuilderOptions,
  ): Promise<void> {
    await Promise.all(
      inputs.flatMap((input) =>
        input.data.stores.map((element) =>
          this.visitWithGraphBuilderErrorHandling(
            element,
            new V1_ProtocolToMetaModelGraphSecondPassBuilder(
              this.getBuilderContext(graph, input.model, element, options),
            ),
          ),
        ),
      ),
    );
    await Promise.all(
      inputs.flatMap((input) =>
        input.data.stores.map((element) =>
          this.visitWithGraphBuilderErrorHandling(
            element,
            new V1_ProtocolToMetaModelGraphThirdPassBuilder(
              this.getBuilderContext(graph, input.model, element, options),
            ),
          ),
        ),
      ),
    );
    await Promise.all(
      inputs.flatMap((input) =>
        input.data.stores.map((element) =>
          this.visitWithGraphBuilderErrorHandling(
            element,
            new V1_ProtocolToMetaModelGraphFourthPassBuilder(
              this.getBuilderContext(graph, input.model, element, options),
            ),
          ),
        ),
      ),
    );
    await Promise.all(
      inputs.flatMap((input) =>
        input.data.stores.map((element) =>
          this.visitWithGraphBuilderErrorHandling(
            element,
            new V1_ProtocolToMetaModelGraphFifthPassBuilder(
              this.getBuilderContext(graph, input.model, element, options),
            ),
          ),
        ),
      ),
    );
  }

  private async buildMappings(
    graph: PureModel,
    inputs: V1_GraphBuilderInput[],
    options?: GraphBuilderOptions,
  ): Promise<void> {
    await Promise.all(
      inputs.flatMap((input) =>
        input.data.mappings.map((element) =>
          this.visitWithGraphBuilderErrorHandling(
            element,
            new V1_ProtocolToMetaModelGraphSecondPassBuilder(
              this.getBuilderContext(graph, input.model, element, options),
            ),
          ),
        ),
      ),
    );
    await Promise.all(
      inputs.flatMap((input) =>
        input.data.mappings.map((element) =>
          this.visitWithGraphBuilderErrorHandling(
            element,
            new V1_ProtocolToMetaModelGraphThirdPassBuilder(
              this.getBuilderContext(graph, input.model, element, options),
            ),
          ),
        ),
      ),
    );
    await Promise.all(
      inputs.flatMap((input) =>
        input.data.mappings.map((element) =>
          this.visitWithGraphBuilderErrorHandling(
            element,
            new V1_ProtocolToMetaModelGraphFourthPassBuilder(
              this.getBuilderContext(graph, input.model, element, options),
            ),
          ),
        ),
      ),
    );
  }

  private async buildConnectionsAndRuntimes(
    graph: PureModel,
    inputs: V1_GraphBuilderInput[],
    options?: GraphBuilderOptions,
  ): Promise<void> {
    // NOTE: connections must be built before runtimes
    await Promise.all(
      inputs.flatMap((input) =>
        input.data.connections.map((element) =>
          this.visitWithGraphBuilderErrorHandling(
            element,
            new V1_ProtocolToMetaModelGraphSecondPassBuilder(
              this.getBuilderContext(graph, input.model, element, options),
            ),
          ),
        ),
      ),
    );
    await Promise.all(
      inputs.flatMap((input) =>
        input.data.runtimes.map((element) =>
          this.visitWithGraphBuilderErrorHandling(
            element,
            new V1_ProtocolToMetaModelGraphSecondPassBuilder(
              this.getBuilderContext(graph, input.model, element, options),
            ),
          ),
        ),
      ),
    );
  }

  private async buildServices(
    graph: PureModel,
    inputs: V1_GraphBuilderInput[],
    options?: GraphBuilderOptions,
  ): Promise<void> {
    await Promise.all(
      inputs.flatMap((input) =>
        input.data.services.map((element) =>
          this.visitWithGraphBuilderErrorHandling(
            element,
            new V1_ProtocolToMetaModelGraphSecondPassBuilder(
              this.getBuilderContext(graph, input.model, element, options),
            ),
          ),
        ),
      ),
    );
  }

  private async buildDataElements(
    graph: PureModel,
    inputs: V1_GraphBuilderInput[],
    options?: GraphBuilderOptions,
  ): Promise<void> {
    await Promise.all(
      inputs.flatMap((input) =>
        input.data.dataElements.map((element) =>
          this.visitWithGraphBuilderErrorHandling(
            element,
            new V1_ProtocolToMetaModelGraphSecondPassBuilder(
              this.getBuilderContext(graph, input.model, element, options),
            ),
          ),
        ),
      ),
    );
  }

  private async buildFileGenerations(
    graph: PureModel,
    inputs: V1_GraphBuilderInput[],
    options?: GraphBuilderOptions,
  ): Promise<void> {
    await Promise.all(
      inputs.flatMap((input) =>
        input.data.fileGenerations.map((element) =>
          this.visitWithGraphBuilderErrorHandling(
            element,
            new V1_ProtocolToMetaModelGraphSecondPassBuilder(
              this.getBuilderContext(graph, input.model, element, options),
            ),
          ),
        ),
      ),
    );
  }

  private async buildGenerationSpecifications(
    graph: PureModel,
    inputs: V1_GraphBuilderInput[],
    options?: GraphBuilderOptions,
  ): Promise<void> {
    await Promise.all(
      inputs.flatMap((input) =>
        input.data.generationSpecifications.map((element) =>
          this.visitWithGraphBuilderErrorHandling(
            element,
            new V1_ProtocolToMetaModelGraphSecondPassBuilder(
              this.getBuilderContext(graph, input.model, element, options),
            ),
          ),
        ),
      ),
    );
  }

  private async buildSectionIndices(
    graph: PureModel,
    inputs: V1_GraphBuilderInput[],
    options?: GraphBuilderOptions,
  ): Promise<void> {
    await Promise.all(
      inputs.flatMap((input) =>
        input.data.sectionIndices.map((element) =>
          this.visitWithGraphBuilderErrorHandling(
            element,
            new V1_ProtocolToMetaModelGraphSecondPassBuilder(
              this.getBuilderContext(graph, input.model, element, options),
            ),
          ),
        ),
      ),
    );
  }

  private async buildOtherElements(
    graph: PureModel,
    inputs: V1_GraphBuilderInput[],
    options?: GraphBuilderOptions,
  ): Promise<void> {
    await Promise.all(
      this.extensions.sortedExtraElementBuilders.map(async (builder) => {
        await Promise.all(
          inputs.flatMap((input) =>
            (input.data.otherElementsByBuilder.get(builder) ?? []).map(
              (element) =>
                this.visitWithGraphBuilderErrorHandling(
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
                this.visitWithGraphBuilderErrorHandling(
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
                this.visitWithGraphBuilderErrorHandling(
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
                this.visitWithGraphBuilderErrorHandling(
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

  private visitWithGraphBuilderErrorHandling<T>(
    element: V1_PackageableElement,
    visitor: V1_PackageableElementVisitor<T>,
  ): Promise<T> {
    try {
      return promisify(() => element.accept_PackageableElementVisitor(visitor));
    } catch (err) {
      assertErrorThrown(err);
      const error =
        err instanceof GraphBuilderError ? err : new GraphBuilderError(err);
      error.message = `Can't build element '${element.path}': ${err.message}`;
      throw error;
    }
  }

  // --------------------------------------------- Grammar ---------------------------------------------

  async graphToPureCode(graph: PureModel): Promise<string> {
    const startTime = Date.now();
    const graphData = this.graphToPureModelContextData(graph);
    const grammarToJson = await this.engine.pureModelContextDataToPureCode(
      graphData,
    );
    this.log.info(
      LogEvent.create(GRAPH_MANAGER_EVENT.GRAPH_MODEL_TO_GRAMMAR_TRANSFORMED),
      Date.now() - startTime,
      'ms',
    );
    return grammarToJson;
  }

  async entitiesToPureCode(entities: Entity[]): Promise<string> {
    const startTime = Date.now();
    const grammarToJson = await this.engine.pureModelContextDataToPureCode(
      await this.entitiesToPureModelContextData(entities),
    );
    this.log.info(
      LogEvent.create(GRAPH_MANAGER_EVENT.GRAPH_MODEL_TO_GRAMMAR_TRANSFORMED),
      Date.now() - startTime,
      'ms',
    );
    return grammarToJson;
  }

  async pureCodeToEntities(
    code: string,
    options?: {
      TEMPORARY__keepSectionIndex?: boolean;
    },
  ): Promise<Entity[]> {
    const pmcd = await this.engine.pureCodeToPureModelContextData(code);
    pmcd.elements = pmcd.elements.filter(
      (el) =>
        options?.TEMPORARY__keepSectionIndex ??
        !(el instanceof V1_SectionIndex),
    );
    return this.pureModelContextDataToEntities(pmcd);
  }

  async pureCodeToLambda(
    lambda: string,
    lambdaId?: string,
  ): Promise<RawLambda> {
    const result = await this.engine.transformCodeToLambda(lambda, lambdaId);
    return new RawLambda(result.parameters, result.body);
  }

  async lambdaToPureCode(lambda: RawLambda, pretty?: boolean): Promise<string> {
    return this.engine.transformLambdaToCode(
      lambda,
      Boolean(pretty),
      this.pluginManager.getPureProtocolProcessorPlugins(),
    );
  }

  lambdasToPureCode(
    lambdas: Map<string, RawLambda>,
    pretty?: boolean,
  ): Promise<Map<string, string>> {
    return this.engine.transformLambdasToCode(
      lambdas,
      Boolean(pretty),
      this.pluginManager.getPureProtocolProcessorPlugins(),
    );
  }

  pureCodeToRelationalOperationElement(
    operation: string,
    operationId: string,
  ): Promise<RawRelationalOperationElement> {
    return this.engine.transformPureCodeToRelationalOperationElement(
      operation,
      operationId,
    );
  }

  relationalOperationElementToPureCode(
    operations: Map<string, RawRelationalOperationElement>,
  ): Promise<Map<string, string>> {
    return this.engine.transformRelationalOperationElementsToPureCode(
      operations,
    );
  }

  // ------------------------------------------- Compile -------------------------------------------

  async compileGraph(
    graph: PureModel,
    options?:
      | {
          onError?: (() => void) | undefined;
          keepSourceInformation?: boolean | undefined;
        }
      | undefined,
  ): Promise<void> {
    await this.engine.compilePureModelContextData(
      this.getFullGraphModelData(graph, {
        keepSourceInformation: options?.keepSourceInformation,
      }),
      {
        onError: options?.onError,
      },
    );
  }

  async compileText(
    graphGrammar: string,
    graph: PureModel,
    options?: { onError?: () => void },
  ): Promise<Entity[]> {
    return this.pureModelContextDataToEntities(
      await this.engine.compileText(
        graphGrammar,
        this.getGraphCompileContext(graph),
        options,
      ),
    );
  }

  getLambdaReturnType(
    lambda: RawLambda,
    graph: PureModel,
    options?: { keepSourceInformation?: boolean },
  ): Promise<string> {
    return this.engine.getLambdaReturnType(
      lambda.accept_RawValueSpecificationVisitor(
        new V1_RawValueSpecificationTransformer(
          new V1_GraphTransformerContextBuilder(
            this.pluginManager.getPureProtocolProcessorPlugins(),
          )
            .withKeepSourceInformationFlag(
              Boolean(options?.keepSourceInformation),
            )
            .build(),
        ),
      ) as V1_RawLambda,
      this.getFullGraphModelData(graph),
    );
  }

  // ------------------------------------------- Generation -------------------------------------------

  getAvailableGenerationConfigurationDescriptions(): Promise<
    GenerationConfigurationDescription[]
  > {
    return this.engine.getAvailableGenerationConfigurationDescriptions();
  }

  async generateFile(
    fileGeneration: FileGenerationSpecification,
    generationMode: GenerationMode,
    graph: PureModel,
  ): Promise<GenerationOutput[]> {
    const config: Record<PropertyKey, unknown> = {};
    config.scopeElements = fileGeneration.scopeElements.map((element) =>
      element instanceof PackageableElementReference
        ? element.value.path
        : element,
    );
    fileGeneration.configurationProperties.forEach((property) => {
      config[property.name] = property.value as Record<PropertyKey, unknown>;
    });
    return (
      await this.engine.generateFile(
        config,
        fileGeneration.type,
        generationMode,
        this.getFullGraphModelData(graph),
      )
    ).map(V1_buildGenerationOutput);
  }

  async generateModel(
    generationElement: PackageableElement,
    graph: PureModel,
  ): Promise<Entity[]> {
    const model = this.getFullGraphModelData(graph);
    let generatedModel: V1_PureModelContextData | undefined = undefined;
    const extraModelGenerators = this.pluginManager
      .getPureProtocolProcessorPlugins()
      .flatMap(
        (plugin) =>
          (
            plugin as DSLGenerationSpecification_PureProtocolProcessorPlugin_Extension
          ).V1_getExtraModelGenerators?.() ?? [],
      );
    for (const generator of extraModelGenerators) {
      const _model = await generator(generationElement, model, this.engine);
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

  async generateModelFromConfiguration(
    config: ModelGenerationConfiguration,
    graph: PureModel,
  ): Promise<Entity[]> {
    const model = this.getFullGraphModelData(graph);
    let generatedModel: V1_PureModelContextData | undefined = undefined;
    const extraModelGenerators = this.pluginManager
      .getPureProtocolProcessorPlugins()
      .flatMap(
        (plugin) =>
          (
            plugin as MappingGeneration_PureProtocolProcessorPlugin_Extension
          ).V1_getExtraModelGeneratorsFromConfiguration?.() ?? [],
      );
    for (const generator of extraModelGenerators) {
      const _model = await generator(config, model, this.engine);
      if (_model) {
        generatedModel = _model;
        break;
      }
    }
    if (!generatedModel) {
      throw new UnsupportedOperationError(
        `Can't generate model using the specified configuration: no compatible generator available from plugins`,
        config,
      );
    }
    return this.pureModelContextDataToEntities(generatedModel);
  }

  // ------------------------------------------- Test  -------------------------------------------

  async runTests(
    inputs: RunTestsTestableInput[],
    graph: PureModel,
  ): Promise<TestResult[]> {
    const runTestsInput = new V1_RunTestsInput();
    runTestsInput.model = this.getFullGraphModelData(graph);
    runTestsInput.testables = inputs
      .map((input) => {
        const testable = guaranteeNonNullable(
          getNullableIDFromTestable(
            input.testable,
            graph,
            this.pluginManager.getPureGraphManagerPlugins(),
          ),
        );
        if (!testable) {
          return undefined;
        }
        const runTestableInput = new V1_RunTestsTestableInput();
        runTestableInput.testable = testable;
        runTestableInput.unitTestIds = input.unitTestIds.map((unit) => {
          const unitAtomicTest = new V1_AtomicTestId();
          unitAtomicTest.testSuiteId = unit.parentSuite?.id;
          unitAtomicTest.atomicTestId = unit.atomicTest.id;
          return unitAtomicTest;
        });
        return runTestableInput;
      })
      .filter(isNonNullable);
    const runTestsResult = await this.engine.runTests(runTestsInput);
    const result = V1_buildTestsResult(
      runTestsResult,
      (id: string): Testable | undefined =>
        getNullableTestable(
          id,
          graph,
          this.pluginManager.getPureGraphManagerPlugins(),
        ),
    );
    return result;
  }

  async generateExpectedResult(
    testable: Testable,
    test: AtomicTest,
    baseAssertion: TestAssertion,
    graph: PureModel,
  ): Promise<AssertFail> {
    const id = uuid();
    try {
      baseAssertion.id = id;
      addUniqueEntry(test.assertions, baseAssertion);
      const runTestsInput = new V1_RunTestsInput();
      runTestsInput.model = this.getFullGraphModelData(graph);
      const runTestableInput = new V1_RunTestsTestableInput();
      const unitAtomicTest = new V1_AtomicTestId();
      runTestableInput.testable = guaranteeNonNullable(
        getNullableIDFromTestable(
          testable,
          graph,
          this.pluginManager.getPureGraphManagerPlugins(),
        ),
      );
      runTestsInput.testables = [runTestableInput];
      const parent = test.__parent;
      unitAtomicTest.testSuiteId =
        parent instanceof TestSuite ? parent.id : undefined;
      unitAtomicTest.atomicTestId = test.id;
      const runTestsResult = await this.engine.runTests(runTestsInput);
      const results = V1_buildTestsResult(
        runTestsResult,
        (_id: string): Testable | undefined =>
          getNullableTestable(
            _id,
            graph,
            this.pluginManager.getPureGraphManagerPlugins(),
          ),
      );
      const result = results[0];
      assertType(result, TestFailed);
      const status = result.assertStatuses.find(
        (e) => e.assertion === baseAssertion,
      );
      return guaranteeNonNullable(status);
    } catch (error) {
      assertErrorThrown(error);
      throw error;
    } finally {
      deleteEntry(test.assertions, baseAssertion);
    }
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
        this.log,
      ).build(),
    );
  }

  serializeValueSpecification(
    valueSpecification: ValueSpecification,
  ): Record<PropertyKey, unknown> {
    return V1_serializeValueSpecification(
      V1_transformRootValueSpecification(valueSpecification),
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
          this.log,
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
            this.pluginManager.getPureProtocolProcessorPlugins(),
          ).build(),
        ),
      ),
    );
  }

  // ------------------------------------------- External Format --------------------------------
  getAvailableExternalFormatsDescriptions(): Promise<
    ExternalFormatDescription[]
  > {
    return this.engine.getAvailableExternalFormatsDescriptions();
  }

  generateModelFromExternalFormat(
    configurationProperties: ConfigurationProperty[],
    graph: PureModel,
  ): Promise<string> {
    const config: Record<PropertyKey, unknown> = {};
    configurationProperties.forEach((property) => {
      config[property.name] = property.value as Record<PropertyKey, unknown>;
    });
    const model = this.getFullGraphModelData(graph);
    const input = new V1_ExternalFormatModelGenerationInput(model, config);
    return this.engine.generateModel(input);
  }

  // ------------------------------------------- Import -------------------------------------------

  getAvailableImportConfigurationDescriptions(): Promise<
    ImportConfigurationDescription[]
  > {
    return this.engine.getAvailableImportConfigurationDescriptions();
  }

  async externalFormatTextToEntities(
    code: string,
    type: string,
    mode: ImportMode,
  ): Promise<Entity[]> {
    return this.pureModelContextDataToEntities(
      await this.engine.transformExternalFormatToProtocol(code, type, mode),
    );
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

  async entitiesToPureProtocolText(entities: Entity[]): Promise<string> {
    return JSON.stringify(
      V1_serializePureModelContext(
        await this.entitiesToPureModelContextData(entities),
      ),
      undefined,
      this.engine.config.tabSize,
    );
  }

  pureProtocolTextToEntities = (protocol: string): Entity[] => {
    const graphData = V1_deserializePureModelContextData(JSON.parse(protocol));
    return this.pureModelContextDataToEntities(graphData);
  };

  // --------------------------------------------- Execution ---------------------------------------------

  private createExecutionInput = (
    graph: PureModel,
    mapping: Mapping,
    lambda: RawLambda,
    runtime: Runtime,
    clientVersion: string,
  ): V1_ExecuteInput =>
    this.buildExecutionInput(
      graph,
      mapping,
      lambda,
      runtime,
      clientVersion,
      new V1_ExecuteInput(),
    );

  private buildExecutionInput = (
    graph: PureModel,
    mapping: Mapping,
    lambda: RawLambda,
    runtime: Runtime,
    clientVersion: string,
    executeInput: V1_ExecuteInput,
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
    const prunedGraphData = new V1_PureModelContextData();
    const extraExecutionElements = this.pluginManager
      .getPureProtocolProcessorPlugins()
      .flatMap((element) => element.V1_getExtraExecutionInputGetters?.() ?? [])
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
    executeInput.clientVersion = clientVersion;
    executeInput.function = V1_transformRawLambda(
      lambda,
      new V1_GraphTransformerContextBuilder(
        this.pluginManager.getPureProtocolProcessorPlugins(),
      ).build(),
    );
    executeInput.mapping = mapping.path;
    executeInput.runtime = V1_transformRuntime(
      runtime,
      new V1_GraphTransformerContextBuilder(
        this.pluginManager.getPureProtocolProcessorPlugins(),
      ).build(),
    );
    executeInput.model = prunedGraphData;
    executeInput.context = new V1_RawBaseExecutionContext(); // TODO: potentially need to support more types
    return executeInput;
  };

  async executeMapping(
    graph: PureModel,
    mapping: Mapping,
    lambda: RawLambda,
    runtime: Runtime,
    options?: ExecutionOptions,
  ): Promise<ExecutionResult> {
    return V1_buildExecutionResult(
      await this.engine.executeMapping(
        this.createExecutionInput(
          graph,
          mapping,
          lambda,
          runtime,
          PureClientVersion.VX_X_X,
        ),
        options,
      ),
    );
  }

  generateExecuteTestData(
    graph: PureModel,
    mapping: Mapping,
    lambda: RawLambda,
    runtime: Runtime,
    parameters: (string | number | boolean)[],
    options?: {
      anonymizeGeneratedData?: boolean;
    },
  ): Promise<string> {
    const testDataGenerationExecuteInput =
      new V1_TestDataGenerationExecutionInput();
    this.buildExecutionInput(
      graph,
      mapping,
      lambda,
      runtime,
      PureClientVersion.VX_X_X,
      testDataGenerationExecuteInput,
    );
    testDataGenerationExecuteInput.parameters = parameters;
    testDataGenerationExecuteInput.hashStrings = Boolean(
      options?.anonymizeGeneratedData,
    );
    return this.engine.generateExecuteTestData(testDataGenerationExecuteInput);
  }

  generateExecutionPlan(
    graph: PureModel,
    mapping: Mapping,
    lambda: RawLambda,
    runtime: Runtime,
  ): Promise<RawExecutionPlan> {
    return this.engine.generateExecutionPlan(
      this.createExecutionInput(
        graph,
        mapping,
        lambda,
        runtime,
        PureClientVersion.VX_X_X,
      ),
    );
  }

  async debugExecutionPlanGeneration(
    graph: PureModel,
    mapping: Mapping,
    lambda: RawLambda,
    runtime: Runtime,
  ): Promise<{ plan: RawExecutionPlan; debug: string }> {
    const result = await this.engine.debugExecutionPlanGeneration(
      this.createExecutionInput(
        graph,
        mapping,
        lambda,
        runtime,
        PureClientVersion.VX_X_X,
      ),
    );
    return {
      plan: result.plan,
      debug: result.debug.join('\n'),
    };
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
        this.log,
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
          this.pluginManager.getPureProtocolProcessorPlugins(),
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
          this.pluginManager.getPureProtocolProcessorPlugins(),
        ).build(),
      ),
    );
  }

  // --------------------------------------------- Service ---------------------------------------------

  async runLegacyServiceTests(
    service: Service,
    graph: PureModel,
  ): Promise<DEPRECATED__ServiceTestResult[]> {
    const protocolGraph = this.getFullGraphModelData(graph);
    const targetService = guaranteeNonNullable(
      protocolGraph.elements
        .filter(filterByType(V1_Service))
        .find((element) => element.path === service.path),
      `Can't run service test: service '${service.path}' not found`,
    );
    protocolGraph.elements = protocolGraph.elements.filter(
      (element) => !(element instanceof V1_Service),
    );
    protocolGraph.elements.push(targetService);
    return (await this.engine.runLegacyServiceTests(protocolGraph)).map(
      V1_buildLegacyServiceTestResult,
    );
  }

  async registerService(
    graph: PureModel,
    service: Service,
    groupdId: string,
    artifactId: string,
    server: string,
    executionMode: ServiceExecutionMode,
    version: string | undefined,
  ): Promise<ServiceRegistrationResult> {
    const serverServiceInfo = await this.engine.getServerServiceInfo();
    // input
    let input: V1_PureModelContext;
    const protocol = new V1_Protocol(
      'pure',
      serverServiceInfo.services.dependencies.pure,
    );
    switch (executionMode) {
      case ServiceExecutionMode.FULL_INTERACTIVE: {
        const data = this.createServiceRegistrationInput(graph, service);
        data.origin = new V1_PureModelContextPointer(protocol);
        input = data;
        break;
      }
      case ServiceExecutionMode.SEMI_INTERACTIVE: {
        const sdlcInfo = new V1_AlloySDLC(groupdId, artifactId, version);
        const pointer = new V1_PureModelContextPointer(protocol, sdlcInfo);
        // data
        const data = new V1_PureModelContextData();
        data.origin = new V1_PureModelContextPointer(protocol);
        data.elements = [this.elementToProtocol<V1_Service>(service)];
        // SDLC info
        // TODO: We may need to add `runtime` pointers if the runtime defned in the service is a packageable runtime
        // and not embedded.
        const execution = service.execution;
        if (execution instanceof PureSingleExecution) {
          sdlcInfo.packageableElementPointers = [
            new V1_PackageableElementPointer(
              PackageableElementPointerType.MAPPING,
              execution.mapping.value.path,
            ),
          ];
        } else if (execution instanceof PureMultiExecution) {
          sdlcInfo.packageableElementPointers =
            execution.executionParameters.map(
              (e) =>
                new V1_PackageableElementPointer(
                  PackageableElementPointerType.MAPPING,
                  e.mapping.value.path,
                ),
            );
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
        const sdlcInfo = new V1_AlloySDLC(groupdId, artifactId, version);
        const pointer = new V1_PureModelContextPointer(protocol, sdlcInfo);
        sdlcInfo.packageableElementPointers = [
          new V1_PackageableElementPointer(
            PackageableElementPointerType.SERVICE,
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
    return V1_buildServiceRegistrationResult(
      await this.engine.registerService(input, server, executionMode),
    );
  }

  async activateService(serviceUrl: string, serviceId: string): Promise<void> {
    const serviceStorage = await this.engine.getServiceVersionInfo(
      serviceUrl,
      serviceId,
    );
    await this.engine.activateServiceGeneration(
      serviceUrl,
      serviceStorage.getGenerationId(),
    );
  }

  private createServiceRegistrationInput = (
    graph: PureModel,
    service: Service,
  ): V1_PureModelContextData => {
    const graphData = this.getFullGraphModelData(graph);
    const prunedGraphData = new V1_PureModelContextData();
    prunedGraphData.elements = graphData.elements.filter(
      (element) => !(element instanceof V1_Service),
    );
    prunedGraphData.elements.push(this.elementToProtocol<V1_Service>(service));
    return prunedGraphData;
  };

  // --------------------------------------------- Query ---------------------------------------------

  async searchQueries(
    searchSpecification: QuerySearchSpecification,
  ): Promise<LightQuery[]> {
    return (
      await this.engine.searchQueries(
        V1_transformQuerySearchSpecification(searchSpecification),
      )
    ).map((protocol) =>
      V1_buildLightQuery(
        protocol,
        this.engine.getEngineServerClient().currentUserId,
      ),
    );
  }

  async getLightQuery(queryId: string): Promise<LightQuery> {
    return V1_buildLightQuery(
      await this.engine.getQuery(queryId),
      this.engine.getEngineServerClient().currentUserId,
    );
  }

  // TODO: we could potentially reshape this method to build light graph with just indexing
  // and return a slightly more complicated object instead: separating the graph and the dependencies part instead of
  // return a list of `V1_GraphBuilderInput`. This method would be useful for any other light graph builder algo.
  async indexEntitiesWithDependencyIntoGraph(
    graph: PureModel,
    _entities: Entity[],
    dependencyEntities: Map<string, Entity[]>,
    entityFilterFunc?: (entity: Entity) => boolean,
  ): Promise<V1_GraphBuilderInput[]> {
    let entities = _entities;
    graph.dependencyManager.initialize(dependencyEntities);
    if (entityFilterFunc) {
      Array.from(dependencyEntities.entries()).forEach(
        ([dependencyKey, dEntities]) => {
          dependencyEntities.set(
            dependencyKey,
            dEntities.filter(entityFilterFunc),
          );
        },
      );
      entities = _entities.filter(entityFilterFunc);
    }
    const report = new GraphBuilderReport();
    // build dependency pmcd models
    const dependencyDataMap = new Map<string, V1_PureModelContextData>();
    await Promise.all(
      Array.from(dependencyEntities.entries()).map(([dependencyKey, value]) => {
        const projectModelData = new V1_PureModelContextData();
        dependencyDataMap.set(dependencyKey, projectModelData);
        return V1_entitiesToPureModelContextData(
          value,
          projectModelData,

          this.pluginManager.getPureProtocolProcessorPlugins(),
        );
      }),
    );
    const dependencyGraphBuilderInput: V1_GraphBuilderInput[] = Array.from(
      dependencyDataMap.entries(),
    ).map(([dependencyKey, dependencyData]) => ({
      data: indexPureModelContextData(report, dependencyData, this.extensions),
      model: graph.dependencyManager.getModel(dependencyKey),
    }));
    // build main pmcd
    const data = new V1_PureModelContextData();
    await V1_entitiesToPureModelContextData(
      entities,
      data,
      this.pluginManager.getPureProtocolProcessorPlugins(),
    );
    const mainGraphBuilderInput: V1_GraphBuilderInput[] = [
      {
        model: graph,
        data: indexPureModelContextData(report, data, this.extensions),
      },
    ];
    const graphBuilderInput = [
      ...dependencyGraphBuilderInput,
      ...mainGraphBuilderInput,
    ];
    await this.initializeAndIndexElements(graph, graphBuilderInput);
    return graphBuilderInput;
  }

  // We could optimize this further by omitting parts of the entities we don't need
  async buildGraphForCreateQuerySetup(
    graph: PureModel,
    entities: Entity[],
    dependencyEntities: Map<string, Entity[]>,
  ): Promise<void> {
    try {
      const graphBuilderInput = await this.indexEntitiesWithDependencyIntoGraph(
        graph,
        entities,
        dependencyEntities,
        (entity: Entity): boolean =>
          ((entity.content as PlainObject<V1_PackageableElement>)
            ._type as string) === V1_MAPPING_ELEMENT_PROTOCOL_TYPE ||
          ((entity.content as PlainObject<V1_PackageableElement>)
            ._type as string) === V1_PACKAGEABLE_RUNTIME_ELEMENT_PROTOCOL_TYPE,
      );
      // handle mapping includes
      const mappings = [
        ...graph.ownMappings,
        ...graph.dependencyManager.mappings,
      ];
      const v1Mappings = graphBuilderInput
        .map((e) => e.data.elements.filter(filterByType(V1_Mapping)))
        .flat();
      const context = new V1_GraphBuilderContextBuilder(
        graph,
        graph,
        this.extensions,
        this.log,
      ).build();
      // build include index for compatible runtime analysis
      v1Mappings.forEach((element) => {
        const mapping = mappings.find((e) => e.path === element.path);
        if (mapping) {
          mapping.includes = element.includedMappings.map(
            (i) =>
              new MappingInclude(
                mapping,
                context.resolveMapping(
                  guaranteeNonEmptyString(
                    V1_getIncludedMappingPath(i),
                    `Mapping include path is missing or empty`,
                  ),
                ),
              ),
          );
        }
      });
      // handle runtimes
      const runtimes = [
        ...graph.ownRuntimes,
        ...graph.dependencyManager.runtimes,
      ];
      const v1Runtimes = graphBuilderInput
        .map((e) => e.data.elements.filter(filterByType(V1_PackageableRuntime)))
        .flat();
      v1Runtimes.forEach((element) => {
        const runtime = runtimes.find((e) => e.path === element.path);
        if (runtime) {
          const runtimeValue = new EngineRuntime();
          runtime.runtimeValue = runtimeValue;
          runtimeValue.mappings = element.runtimeValue.mappings.map((mapping) =>
            context.resolveMapping(mapping.path),
          );
        }
      });
    } catch (error) {
      assertErrorThrown(error);
      /**
       * Wrap all error with `GraphBuilderError`, as we throw a lot of assertion error in the graph builder
       * But we might want to rethink this decision in the future and throw appropriate type of error
       */
      throw error instanceof GraphBuilderError
        ? error
        : new GraphBuilderError(error);
    }
  }

  // We could optimize this further by omitting parts of the entities we don't need
  // i.e service entity would only keep execution
  async buildGraphForServiceQuerySetup(
    graph: PureModel,
    entities: Entity[],
    dependencyEntities: Map<string, Entity[]>,
  ): Promise<void> {
    try {
      const graphBuilderInput = await this.indexEntitiesWithDependencyIntoGraph(
        graph,
        entities,
        dependencyEntities,
        (entity: Entity): boolean =>
          ((entity.content as PlainObject<V1_PackageableElement>)
            ._type as string) === V1_SERVICE_ELEMENT_PROTOCOL_TYPE,
      );
      // handle servicess
      const services = [
        ...graph.ownServices,
        ...graph.dependencyManager.services,
      ];
      const v1Services = graphBuilderInput
        .map((e) => e.data.elements.filter(filterByType(V1_Service)))
        .flat();
      // build service multi execution keys
      v1Services.forEach((element) => {
        const service = services.find((e) => e.path === element.path);
        if (service) {
          const serviceExecution = element.execution;
          if (serviceExecution instanceof V1_PureMultiExecution) {
            const execution = new PureMultiExecution(
              serviceExecution.executionKey,
              stub_RawLambda(),
              service,
            );
            execution.executionParameters =
              serviceExecution.executionParameters.map(
                (keyedExecutionParameter) =>
                  new KeyedExecutionParameter(
                    keyedExecutionParameter.key,
                    PackageableElementExplicitReference.create(stub_Mapping()),
                    new EngineRuntime(),
                  ),
              );
            service.execution = execution;
          } else if (serviceExecution instanceof V1_PureSingleExecution) {
            service.execution = new PureSingleExecution(
              stub_RawLambda(),
              service,
              PackageableElementExplicitReference.create(stub_Mapping()),
              new EngineRuntime(),
            );
          }
        }
      });
    } catch (error) {
      assertErrorThrown(error);
      /**
       * Wrap all error with `GraphBuilderError`, as we throw a lot of assertion error in the graph builder
       * But we might want to rethink this decision in the future and throw appropriate type of error
       */
      throw error instanceof GraphBuilderError
        ? error
        : new GraphBuilderError(error);
    }
  }

  async getQuery(queryId: string, graph: PureModel): Promise<Query> {
    return V1_buildQuery(
      await this.engine.getQuery(queryId),
      graph,
      this.engine.getEngineServerClient().currentUserId,
    );
  }

  async getQueryContent(queryId: string): Promise<string> {
    return (await this.engine.getQuery(queryId)).content;
  }

  async createQuery(query: Query, graph: PureModel): Promise<Query> {
    return V1_buildQuery(
      await this.engine.createQuery(V1_transformQuery(query)),
      graph,
      this.engine.getEngineServerClient().currentUserId,
    );
  }

  async updateQuery(query: Query, graph: PureModel): Promise<Query> {
    return V1_buildQuery(
      await this.engine.updateQuery(V1_transformQuery(query)),
      graph,
      this.engine.getEngineServerClient().currentUserId,
    );
  }

  async deleteQuery(queryId: string): Promise<void> {
    await this.engine.deleteQuery(queryId);
  }

  // --------------------------------------------- Change Detection ---------------------------------------------

  async buildHashesIndex(entities: Entity[]): Promise<Map<string, string>> {
    const hashMap = new Map<string, string>();
    const pureModelContextData = new V1_PureModelContextData();
    await V1_entitiesToPureModelContextData(
      entities,
      pureModelContextData,
      this.pluginManager.getPureProtocolProcessorPlugins(),
    );
    await Promise.all(
      pureModelContextData.elements.map((element) =>
        promisify(() => hashMap.set(element.path, element.hashCode)),
      ),
    );
    return hashMap;
  }

  // --------------------------------------------- Utilities ---------------------------------------------

  elementToEntity = (
    element: PackageableElement,
    options?: {
      pruneSourceInformation?: boolean;
    },
  ): Entity => {
    const entity = this.elementProtocolToEntity(
      this.elementToProtocol<V1_PackageableElement>(element),
    );
    if (options?.pruneSourceInformation) {
      entity.content = pruneSourceInformation(entity.content);
    }
    return entity;
  };

  async buildDatabase(input: DatabaseBuilderInput): Promise<Entity[]> {
    const dbBuilderInput = new V1_DatabaseBuilderInput();
    dbBuilderInput.connection = V1_transformRelationalDatabaseConnection(
      input.connection,
      new V1_GraphTransformerContextBuilder(
        this.pluginManager.getPureProtocolProcessorPlugins(),
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
    return this.pureModelContextDataToEntities(
      await this.engine.buildDatabase(dbBuilderInput),
    );
  }

  // --------------------------------------------- HACKY ---------------------------------------------

  HACKY__createGetAllLambda(_class: Class): RawLambda {
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

  HACKY__createServiceTestAssertLambda(assertData: string): RawLambda {
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

  HACKY__extractServiceTestAssertionData(query: RawLambda): string | undefined {
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
    } catch (error) {
      assertErrorThrown(error);
      this.log.warn(
        LogEvent.create(GRAPH_MANAGER_EVENT.GRAPH_MANAGER_FAILURE),
        `Can't extract assertion result`,
      );
      json = undefined;
    }
    if (!json) {
      /* Add other assertion cases if we read others */
    }
    return json;
  }

  HACKY__createDefaultBlankLambda(): RawLambda {
    return new RawLambda(
      [{ _type: 'var', name: 'x' }],
      [
        {
          _type: 'string',
          multiplicity: { lowerBound: 1, upperBound: 1 },
          values: [''],
        },
      ],
    );
  }

  // --------------------------------------------- Shared ---------------------------------------------

  private async entitiesToPureModelContextData(
    entities: Entity[],
  ): Promise<V1_PureModelContextData> {
    const graphData = new V1_PureModelContextData();
    await V1_entitiesToPureModelContextData(
      entities,
      graphData,
      this.pluginManager.getPureProtocolProcessorPlugins(),
    );
    return graphData;
  }

  private getFullGraphModelData(
    graph: PureModel,
    options?: { keepSourceInformation?: boolean | undefined } | undefined,
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
    options?: { keepSourceInformation?: boolean | undefined } | undefined,
  ): T =>
    V1_transformPackageableElement(
      element,
      this.pluginManager.getPureProtocolProcessorPlugins(),
      new V1_GraphTransformerContextBuilder(
        this.pluginManager.getPureProtocolProcessorPlugins(),
      )
        .withKeepSourceInformationFlag(Boolean(options?.keepSourceInformation))
        .build(),
    ) as T;

  private pureModelContextDataToEntities = (
    graphProtocol: V1_PureModelContextData,
  ): Entity[] =>
    graphProtocol.elements.map((element) =>
      this.elementProtocolToEntity(element),
    );

  private elementProtocolToEntity = (
    elementProtocol: V1_PackageableElement,
  ): Entity => ({
    path: this.getElementPath(elementProtocol),
    content: V1_serializePackageableElement(
      elementProtocol,
      this.pluginManager.getPureProtocolProcessorPlugins(),
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

  private getElementClassiferPath = (
    protocol: V1_PackageableElement,
  ): string => {
    if (protocol instanceof V1_Association) {
      return CORE_PURE_PATH.ASSOCIATION;
    } else if (protocol instanceof V1_Class) {
      return CORE_PURE_PATH.CLASS;
    } else if (protocol instanceof V1_Enumeration) {
      return CORE_PURE_PATH.ENUMERATION;
    } else if (protocol instanceof V1_ConcreteFunctionDefinition) {
      return CORE_PURE_PATH.FUNCTION;
    } else if (protocol instanceof V1_Profile) {
      return CORE_PURE_PATH.PROFILE;
    } else if (protocol instanceof V1_Measure) {
      return CORE_PURE_PATH.MEASURE;
    } else if (protocol instanceof V1_Mapping) {
      return CORE_PURE_PATH.MAPPING;
    } else if (protocol instanceof V1_PackageableConnection) {
      return CORE_PURE_PATH.CONNECTION;
    } else if (protocol instanceof V1_PackageableRuntime) {
      return CORE_PURE_PATH.RUNTIME;
    } else if (protocol instanceof V1_SectionIndex) {
      return CORE_PURE_PATH.SECTION_INDEX;
    } else if (protocol instanceof V1_FlatData) {
      return CORE_PURE_PATH.FLAT_DATA;
    } else if (protocol instanceof V1_Database) {
      return CORE_PURE_PATH.DATABASE;
    } else if (protocol instanceof V1_Service) {
      return CORE_PURE_PATH.SERVICE;
    } else if (protocol instanceof V1_FileGenerationSpecification) {
      return CORE_PURE_PATH.FILE_GENERATION;
    } else if (protocol instanceof V1_DataElement) {
      return CORE_PURE_PATH.DATA_ELEMENT;
    } else if (protocol instanceof V1_GenerationSpecification) {
      return CORE_PURE_PATH.GENERATION_SPECIFICATION;
    }
    const extraElementProtocolClassifierPathGetters = this.pluginManager
      .getPureProtocolProcessorPlugins()
      .flatMap(
        (plugin) => plugin.V1_getExtraElementClassifierPathGetters?.() ?? [],
      );
    for (const classifierPathGetter of extraElementProtocolClassifierPathGetters) {
      const classifierPath = classifierPathGetter(protocol);
      if (classifierPath) {
        return classifierPath;
      }
    }
    throw new UnsupportedOperationError(
      `Can't get classifier path for element '${protocol.path}': no compatible classifier path getter available from plugins`,
    );
  };

  private graphToPureModelContextData = (
    graph: PureModel,
    options?: { keepSourceInformation?: boolean | undefined } | undefined,
  ): V1_PureModelContextData => {
    const startTime = Date.now();
    const graphData = new V1_PureModelContextData();
    graphData.elements = graph.allOwnElements.map((element) =>
      this.elementToProtocol(element, {
        keepSourceInformation: options?.keepSourceInformation,
      }),
    );
    this.log.info(
      LogEvent.create(
        GRAPH_MANAGER_EVENT.GRAPH_META_MODEL_TO_PROTOCOL_TRANSFORMED,
      ),
      Date.now() - startTime,
      'ms',
    );
    return graphData;
  };

  private getGraphCompileContext = (
    graph: PureModel,
  ): V1_PureModelContextData => {
    const startTime = Date.now();
    const graphData = new V1_PureModelContextData();
    const dependencyManager = graph.dependencyManager;
    const generatedModel = graph.generationModel;
    graphData.elements = [
      ...dependencyManager.allOwnElements,
      ...generatedModel.allOwnElements,
    ].map((element) => this.elementToProtocol(element));
    this.log.info(
      LogEvent.create(GRAPH_MANAGER_EVENT.GRAPH_COMPILE_CONTEXT_COLLECTED),
      Date.now() - startTime,
      'ms',
    );
    return graphData;
  };
}
