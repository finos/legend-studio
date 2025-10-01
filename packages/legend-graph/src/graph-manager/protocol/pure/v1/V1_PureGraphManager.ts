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

import { GRAPH_MANAGER_EVENT } from '../../../../__lib__/GraphManagerEvent.js';
import {
  CORE_PURE_PATH,
  PackageableElementPointerType,
} from '../../../../graph/MetaModelConst.js';
import {
  type Clazz,
  type ContentType,
  type LogService,
  type PlainObject,
  type ServerClientConfig,
  ActionState,
  TracerService,
  LogEvent,
  getClass,
  guaranteeNonNullable,
  UnsupportedOperationError,
  assertErrorThrown,
  promisify,
  StopWatch,
  isNonNullable,
  filterByType,
  isString,
  assertNonEmptyString,
  uniq,
  guaranteeType,
  guaranteeNonEmptyString,
  uuid,
} from '@finos/legend-shared';
import type { TEMPORARY__AbstractEngineConfig } from '../../../../graph-manager/action/TEMPORARY__AbstractEngineConfig.js';
import {
  AbstractPureGraphManager,
  type TEMPORARY__EngineSetupConfig,
  type GraphBuilderOptions,
  type ExecutionOptions,
  type ServiceRegistrationOptions,
} from '../../../../graph-manager/AbstractPureGraphManager.js';
import type { Mapping } from '../../../../graph/metamodel/pure/packageableElements/mapping/Mapping.js';
import type { Runtime } from '../../../../graph/metamodel/pure/packageableElements/runtime/Runtime.js';
import type { PackageableElement } from '../../../../graph/metamodel/pure/packageableElements/PackageableElement.js';
import {
  type SystemModel,
  type CoreModel,
  PureModel,
  type GraphTextInputOption,
} from '../../../../graph/PureModel.js';
import type { BasicModel } from '../../../../graph/BasicModel.js';
import type { DependencyManager } from '../../../../graph/DependencyManager.js';
import type { Class } from '../../../../graph/metamodel/pure/packageableElements/domain/Class.js';
import { RawLambda } from '../../../../graph/metamodel/pure/rawValueSpecification/RawLambda.js';
import type { RawValueSpecification } from '../../../../graph/metamodel/pure/rawValueSpecification/RawValueSpecification.js';
import type { FileGenerationSpecification } from '../../../../graph/metamodel/pure/packageableElements/fileGeneration/FileGenerationSpecification.js';
import type {
  GenerationConfigurationDescription,
  GenerationMode,
} from '../../../../graph-manager/action/generation/GenerationConfigurationDescription.js';
import {
  type ServiceRegistrationResult,
  ServiceRegistrationSuccess,
  ServiceRegistrationFail,
} from '../../../../graph-manager/action/service/ServiceRegistrationResult.js';
import type { GenerationOutput } from '../../../../graph-manager/action/generation/GenerationOutput.js';
import type { ValueSpecification } from '../../../../graph/metamodel/pure/valueSpecification/ValueSpecification.js';
import { ServiceExecutionMode } from '../../../../graph-manager/action/service/ServiceExecutionMode.js';
import {
  PureMultiExecution,
  PureSingleExecution,
} from '../../../../graph/metamodel/pure/packageableElements/service/ServiceExecution.js';
import {
  V1_deserializeRawValueSpecification,
  V1_serializeRawValueSpecification,
} from './transformation/pureProtocol/serializationHelpers/V1_RawValueSpecificationSerializationHelper.js';
import {
  V1_serializeValueSpecification,
  V1_deserializeValueSpecification,
} from './transformation/pureProtocol/serializationHelpers/V1_ValueSpecificationSerializer.js';
import V1_CORE_SYSTEM_MODELS from './V1_Core_SystemModels.json' with { type: 'json' };
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
import { V1_ElementFirstPassBuilder } from './transformation/pureGraph/to/V1_ElementFirstPassBuilder.js';
import { V1_ElementSecondPassBuilder } from './transformation/pureGraph/to/V1_ElementSecondPassBuilder.js';
import { V1_ElementThirdPassBuilder } from './transformation/pureGraph/to/V1_ElementThirdPassBuilder.js';
import { V1_ElementFourthPassBuilder } from './transformation/pureGraph/to/V1_ElementFourthPassBuilder.js';
import { V1_ElementFifthPassBuilder } from './transformation/pureGraph/to/V1_ElementFifthPassBuilder.js';
import { V1_RawValueSpecificationBuilder } from './transformation/pureGraph/to/V1_RawValueSpecificationBuilder.js';
import { V1_RawBaseExecutionContext } from './model/rawValueSpecification/V1_RawExecutionContext.js';
import {
  type V1_GraphBuilderContext,
  V1_GraphBuilderContextBuilder,
} from './transformation/pureGraph/to/V1_GraphBuilderContext.js';
import { V1_PureModelContextPointer } from './model/context/V1_PureModelContextPointer.js';
import { V1_RemoteEngine } from './engine/V1_RemoteEngine.js';
import { V1_transformPackageableElement } from './transformation/pureGraph/from/V1_PackageableElementTransformer.js';
import {
  V1_transformRawLambda,
  V1_RawValueSpecificationTransformer,
} from './transformation/pureGraph/from/V1_RawValueSpecificationTransformer.js';
import { V1_transformRuntime } from './transformation/pureGraph/from/V1_RuntimeTransformer.js';
import { V1_RawLambda } from './model/rawValueSpecification/V1_RawLambda.js';
import {
  V1_ExecuteInput,
  V1_TestDataGenerationExecutionInput,
  V1_TestDataGenerationExecutionWithSeedInput,
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
import { V1_LegendSDLC } from './model/context/V1_SDLC.js';
import { V1_Protocol } from './model/V1_Protocol.js';
import type { V1_PureModelContext } from './model/context/V1_PureModelContext.js';
import type { V1_ElementBuilder } from './transformation/pureGraph/to/V1_ElementBuilder.js';
import { V1_GraphBuilderExtensions } from './transformation/pureGraph/to/V1_GraphBuilderExtensions.js';
import type {
  DatabaseBuilderInput,
  DatabasePattern,
} from '../../../../graph-manager/action/generation/DatabaseBuilderInput.js';
import {
  V1_DatabaseBuilderConfig,
  V1_DatabaseBuilderInput,
  V1_DatabasePattern,
  V1_TargetDatabase,
} from './engine/generation/V1_DatabaseBuilderInput.js';
import { V1_transformRelationalDatabaseConnection } from './transformation/pureGraph/from/V1_ConnectionTransformer.js';
import { V1_FlatData } from './model/packageableElements/store/flatData/model/V1_FlatData.js';
import { V1_Database } from './model/packageableElements/store/relational/model/V1_Database.js';
import { V1_setupDatabaseSerialization } from './transformation/pureProtocol/serializationHelpers/V1_DatabaseSerializationHelper.js';
import {
  V1_setupEngineRuntimeSerialization,
  V1_setupLegacyRuntimeSerialization,
} from './transformation/pureProtocol/serializationHelpers/V1_RuntimeSerializationHelper.js';
import type { DSL_Generation_PureProtocolProcessorPlugin_Extension } from '../extensions/DSL_Generation_PureProtocolProcessorPlugin_Extension.js';
import type { RawRelationalOperationElement } from '../../../../graph/metamodel/pure/packageableElements/store/relational/model/RawRelationalOperationElement.js';
import { V1_GraphTransformerContextBuilder } from './transformation/pureGraph/from/V1_GraphTransformerContext.js';
import type {
  ExecutionPlan,
  RawExecutionPlan,
} from '../../../../graph/metamodel/pure/executionPlan/ExecutionPlan.js';
import type { V1_ExecutionNode } from './model/executionPlan/nodes/V1_ExecutionNode.js';
import type { ExecutionNode } from '../../../../graph/metamodel/pure/executionPlan/nodes/ExecutionNode.js';
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
import {
  type LightQuery,
  type Query,
  QueryExplicitExecutionContextInfo,
  type QueryInfo,
  QueryTaggedValue,
} from '../../../../graph-manager/action/query/Query.js';
import {
  V1_buildQuery,
  V1_buildServiceRegistrationSuccess,
  V1_transformQuery,
  V1_buildGenerationOutput,
  V1_buildLightQuery,
  V1_transformQuerySearchSpecification,
  V1_buildSourceInformation,
  V1_buildExecutionContextInfo,
} from './engine/V1_EngineHelper.js';
import { V1_buildExecutionResult } from './engine/execution/V1_ExecutionHelper.js';
import {
  type Entity,
  type EntitiesWithOrigin,
  ENTITY_PATH_DELIMITER,
} from '@finos/legend-storage';
import {
  DependencyGraphBuilderError,
  GraphBuilderError,
  PureClientVersion,
  SystemGraphBuilderError,
} from '../../../../graph-manager/GraphManagerUtils.js';
import { PackageableElementReference } from '../../../../graph/metamodel/pure/packageableElements/PackageableElementReference.js';
import type { GraphManagerPluginManager } from '../../../GraphManagerPluginManager.js';
import type { QuerySearchSpecification } from '../../../../graph-manager/action/query/QuerySearchSpecification.js';
import type { ExternalFormatDescription } from '../../../../graph-manager/action/externalFormat/ExternalFormatDescription.js';
import type { ConfigurationProperty } from '../../../../graph/metamodel/pure/packageableElements/fileGeneration/ConfigurationProperty.js';
import { V1_ExternalFormatModelGenerationInput } from './engine/externalFormat/V1_ExternalFormatModelGeneration.js';
import { V1_GenerateSchemaInput } from './engine/externalFormat/V1_GenerateSchemaInput.js';
import {
  createGraphBuilderReport,
  createGraphManagerOperationReport,
  type GraphManagerOperationReport,
} from '../../../GraphManagerStatistics.js';
import type { Package } from '../../../../graph/metamodel/pure/packageableElements/domain/Package.js';
import { V1_DataElement } from './model/packageableElements/data/V1_DataElement.js';
import {
  V1_RunTestsInput,
  V1_RunTestsTestableInput,
} from './engine/test/V1_RunTestsInput.js';
import { V1_UniqueTestId } from './model/test/V1_UniqueTestId.js';
import type { RunTestsTestableInput } from '../../../../graph/metamodel/pure/test/result/RunTestsTestableInput.js';
import { V1_buildTestsResult } from './engine/test/V1_RunTestsResult.js';
import { type TestResult } from '../../../../graph/metamodel/pure/test/result/TestResult.js';
import type { Testable } from '../../../../graph/metamodel/pure/test/Testable.js';
import {
  getNullableIDFromTestable,
  getNullableTestable,
} from '../../../helpers/DSL_Data_GraphManagerHelper.js';
import {
  extractElementNameFromPath,
  extractPackagePathFromPath,
  pruneSourceInformation,
} from '../../../../graph/MetaModelUtils.js';
import {
  V1_buildModelCoverageAnalysisResult,
  V1_MappingModelCoverageAnalysisInput,
  V1_MappingModelCoverageAnalysisResult,
} from './engine/analytics/V1_MappingModelCoverageAnalysis.js';
import type {
  MappingModelCoverageAnalysisResult,
  RawMappingModelCoverageAnalysisResult,
} from '../../../../graph-manager/action/analytics/MappingModelCoverageAnalysis.js';
import { deserialize } from 'serializr';
import { SchemaSet } from '../../../../graph/metamodel/pure/packageableElements/externalFormat/schemaSet/DSL_ExternalFormat_SchemaSet.js';
import type {
  CompilationResult,
  TextCompilationResult,
} from '../../../action/compilation/CompilationResult.js';
import { CompilationWarning } from '../../../action/compilation/CompilationWarning.js';
import { V1_transformParameterValue } from './transformation/pureGraph/from/V1_ServiceTransformer.js';
import { V1_transformModelUnit } from './transformation/pureGraph/from/V1_DSL_ExternalFormat_Transformer.js';
import type { ModelUnit } from '../../../../graph/metamodel/pure/packageableElements/externalFormat/store/DSL_ExternalFormat_ModelUnit.js';
import { V1_LambdaReturnTypeInput } from './engine/compilation/V1_LambdaReturnType.js';
import type { ParameterValue } from '../../../../graph/metamodel/pure/packageableElements/service/ParameterValue.js';
import type { Service } from '../../../../graph/metamodel/pure/packageableElements/service/Service.js';
import { V1_ExecutionEnvironmentInstance } from './model/packageableElements/service/V1_ExecutionEnvironmentInstance.js';
import {
  V1_EntitlementReportAnalyticsInput,
  V1_StoreEntitlementAnalysisInput,
  V1_buildDatasetEntitlementReport,
  V1_buildDatasetSpecification,
  V1_transformDatasetSpecification,
} from './engine/analytics/V1_StoreEntitlementAnalysis.js';
import type {
  DatasetEntitlementReport,
  DatasetSpecification,
} from '../../../action/analytics/StoreEntitlementAnalysis.js';
import {
  LegendSDLC,
  type GraphDataOrigin,
  GraphEntities,
} from '../../../../graph/GraphDataOrigin.js';
import {
  InMemoryGraphData,
  type GraphData,
  GraphDataWithOrigin,
} from '../../../GraphData.js';
import type { DEPRECATED__MappingTest } from '../../../../graph/metamodel/pure/packageableElements/mapping/DEPRECATED__MappingTest.js';
import { DEPRECATED__validate_MappingTest } from '../../../action/validation/DSL_Mapping_ValidationHelper.js';
import { V1_INTERNAL__UnknownPackageableElement } from './model/packageableElements/V1_INTERNAL__UnknownPackageableElement.js';
import type { SourceInformation } from '../../../action/SourceInformation.js';
import type { V1_SourceInformation } from './model/V1_SourceInformation.js';
import type { FunctionActivator } from '../../../../graph/metamodel/pure/packageableElements/function/FunctionActivator.js';
import { FunctionActivatorConfiguration } from '../../../action/functionActivator/FunctionActivatorConfiguration.js';
import { V1_FunctionActivatorInput } from './engine/functionActivator/V1_FunctionActivatorInput.js';
import { V1_FunctionActivator } from './model/packageableElements/function/V1_FunctionActivator.js';
import { V1_INTERNAL__UnknownFunctionActivator } from './model/packageableElements/function/V1_INTERNAL__UnknownFunctionActivator.js';
import { V1_DatabaseToModelGenerationInput } from './engine/relational/V1_DatabaseToModelGenerationInput.js';
import { type RelationalDatabaseConnection } from '../../../../STO_Relational_Exports.js';
import { V1_RawSQLExecuteInput } from './engine/execution/V1_RawSQLExecuteInput.js';
import type { SubtypeInfo } from '../../../action/protocol/ProtocolInfo.js';
import { V1_INTERNAL__UnknownStore } from './model/packageableElements/store/V1_INTERNAL__UnknownStore.js';
import type { V1_ValueSpecification } from './model/valueSpecification/V1_ValueSpecification.js';
import type { V1_GrammarParserBatchInputEntry } from './engine/V1_EngineServerClient.js';
import type { ArtifactGenerationExtensionResult } from '../../../action/generation/ArtifactGenerationExtensionResult.js';
import {
  V1_ArtifactGenerationExtensionInput,
  V1_buildArtifactsByExtensionElement,
} from './engine/generation/V1_ArtifactGenerationExtensionApi.js';
import type { V1_RawValueSpecification } from './model/rawValueSpecification/V1_RawValueSpecification.js';
import { V1_TestDataGenerationInput } from './engine/service/V1_TestDataGenerationInput.js';
import type { TestDataGenerationResult } from '../../../../graph/metamodel/pure/packageableElements/service/TestGenerationResult.js';
import { V1_buildTestDataGenerationResult } from './engine/service/V1_TestDataGenerationResult.js';
import { RelationalDatabaseTypeConfiguration } from '../../../action/relational/RelationalDatabaseTypeConfiguration.js';
import type { TableRowIdentifiers } from '../../../../graph/metamodel/pure/packageableElements/service/TableRowIdentifiers.js';
import {
  V1_ColumnValuePair,
  V1_RowIdentifier,
  V1_TableRowIdentifiers,
} from './engine/service/V1_TableRowIdentifiers.js';
import { V1_transformTablePointer } from './transformation/pureGraph/from/V1_DatabaseTransformer.js';
import { EngineError } from '../../../action/EngineError.js';
import { V1_SnowflakeApp } from './model/packageableElements/function/V1_SnowflakeApp.js';
import { V1_SnowflakeM2MUdf } from './model/packageableElements/function/V1_SnowflakeM2MUdf.js';
import type {
  ExecutionResult,
  ExecutionResultWithMetadata,
} from '../../../action/execution/ExecutionResult.js';
import { V1_INTERNAL__UnknownElement } from './model/packageableElements/V1_INTERNAL__UnknownElement.js';
import { V1_HostedService } from './model/packageableElements/function/V1_HostedService.js';
import type { PostValidationAssertionResult } from '../../../../DSL_Service_Exports.js';
import { V1_UserListOwnership } from './model/packageableElements/service/V1_ServiceOwnership.js';
import { V1_PureSingleExecution } from './model/packageableElements/service/V1_ServiceExecution.js';
import {
  type V1_Runtime,
  V1_RuntimePointer,
} from './model/packageableElements/runtime/V1_Runtime.js';
import type { TestDebug } from '../../../../graph/metamodel/pure/test/result/DebugTestsResult.js';
import { V1_buildDebugTestsResult } from './engine/test/V1_DebugTestsResult.js';
import type { V1_GraphManagerEngine } from './engine/V1_GraphManagerEngine.js';
import type { RelationTypeMetadata } from '../../../action/relation/RelationTypeMetadata.js';
import type { CodeCompletionResult } from '../../../action/compilation/Completion.js';
import { V1_CompleteCodeInput } from './engine/compilation/V1_CompleteCodeInput.js';
import type { DeploymentResult } from '../../../action/DeploymentResult.js';
import type {
  LightPersistentDataCube,
  PersistentDataCube,
} from '../../../action/query/PersistentDataCube.js';
import { V1_QueryParameterValue } from './engine/query/V1_Query.js';
import { V1_Multiplicity } from './model/packageableElements/domain/V1_Multiplicity.js';
import {
  V1_buildFunctionSignature,
  V1_createGenericTypeWithElementPath,
} from './helpers/V1_DomainHelper.js';
import { V1_DataProduct } from './model/packageableElements/dataProduct/V1_DataProduct.js';
import { V1_MemSQLFunction } from './model/packageableElements/function/V1_MemSQLFunction.js';
import { LineageModel } from '../../../../graph/metamodel/pure/lineage/LineageModel.js';
import {
  V1_LineageInput,
  type V1_RawLineageModel,
} from './model/lineage/V1_Lineage.js';
import { V1_IngestDefinition } from './model/packageableElements/ingest/V1_IngestDefinition.js';

class V1_PureModelContextDataIndex {
  elements: V1_PackageableElement[] = [];
  nativeElements: V1_PackageableElement[] = [];

  associations: V1_Association[] = [];
  classes: V1_Class[] = [];
  enumerations: V1_Enumeration[] = [];
  functions: V1_ConcreteFunctionDefinition[] = [];
  functionActivators: V1_FunctionActivator[] = [];
  profiles: V1_Profile[] = [];
  measures: V1_Measure[] = [];

  stores: V1_Store[] = [];
  mappings: V1_Mapping[] = [];
  connections: V1_PackageableConnection[] = [];
  runtimes: V1_PackageableRuntime[] = [];

  sectionIndices: V1_SectionIndex[] = [];

  fileGenerations: V1_FileGenerationSpecification[] = [];
  generationSpecifications: V1_GenerationSpecification[] = [];

  dataElements: V1_DataElement[] = [];

  services: V1_Service[] = [];
  executionEnvironments: V1_ExecutionEnvironmentInstance[] = [];
  products: V1_DataProduct[] = [];

  INTERNAL__UnknownElement: V1_INTERNAL__UnknownElement[] = [];
  INTERNAL__unknownElements: V1_INTERNAL__UnknownPackageableElement[] = [];

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
    const rawDependencyEntities = (
      mergedData.INTERNAL__rawDependencyEntities ?? []
    ).concat(_data.INTERNAL__rawDependencyEntities ?? []);
    mergedData.INTERNAL__rawDependencyEntities = rawDependencyEntities.length
      ? rawDependencyEntities
      : undefined;
    mergedData.serializer = _data.serializer ?? mergedData.serializer;
    mergedData.origin = _data.origin ?? mergedData.origin;
  }
  return mergedData;
};

export const V1_indexPureModelContextData = (
  report: GraphManagerOperationReport,
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
    if (el instanceof V1_INTERNAL__UnknownElement) {
      index.INTERNAL__UnknownElement.push(el);
    } else if (el instanceof V1_INTERNAL__UnknownPackageableElement) {
      index.INTERNAL__unknownElements.push(el);
    } else if (el instanceof V1_Association) {
      index.associations.push(el);
    } else if (el instanceof V1_Class) {
      index.classes.push(el);
    } else if (el instanceof V1_Enumeration) {
      index.enumerations.push(el);
    } else if (el instanceof V1_ConcreteFunctionDefinition) {
      index.functions.push(el);
    } else if (el instanceof V1_FunctionActivator) {
      index.functionActivators.push(el);
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
    } else if (el instanceof V1_ExecutionEnvironmentInstance) {
      index.executionEnvironments.push(el);
    } else if (el instanceof V1_DataProduct) {
      index.products.push(el);
    } else {
      const clazz = getClass<V1_PackageableElement>(el);
      if (otherElementsByClass.has(clazz)) {
        otherElementsByClass.get(clazz)?.push(el);
      } else {
        otherElementsByClass.set(clazz, [el]);
      }
      isIndexedAsOtherElement = true;
    }
    // we index everything else as native
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
  report.elementCount.total =
    (report.elementCount.total ?? 0) + index.elements.length;
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
  report.elementCount.functionActivators =
    (report.elementCount.functionActivators ?? 0) +
    index.functionActivators.length;
  report.elementCount.profile =
    (report.elementCount.profile ?? 0) + index.profiles.length;
  report.elementCount.measure =
    (report.elementCount.measure ?? 0) + index.measures.length;

  report.elementCount.dataElement =
    (report.elementCount.dataElement ?? 0) + index.dataElements.length;

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
  report.elementCount.executionEnvironment =
    (report.elementCount.executionEnvironment ?? 0) +
    index.executionEnvironments.length;

  report.elementCount.unknown =
    (report.elementCount.unknown ?? 0) + index.INTERNAL__unknownElements.length;

  return index;
};

// NOTE: this interface is somewhat naive since `model` is of type `BasicModel`,
// so this can only be used for pre-processing/indexing
// we might need to change model to PureModel in the future when we support other use case
interface V1_PureGraphBuilderInput {
  model: BasicModel;
  data: V1_PureModelContextDataIndex;
  origin?: GraphDataOrigin | undefined;
}

export interface V1_EngineSetupConfig {
  env: string;
  tabSize: number;
  clientConfig: ServerClientConfig;
}

interface ServiceRegistrationInput {
  service: Service;
  context: V1_PureModelContext;
}

export class V1_PureGraphManager extends AbstractPureGraphManager {
  private readonly elementClassifierPathMap = new Map<string, string>();
  private readonly subtypeInfo: SubtypeInfo = {
    storeSubtypes: [],
    functionActivatorSubtypes: [],
  };

  // Pure Client Version represent the version of the pure protocol.
  // Most Engine APIs will interrupt an undefined pure client version to mean
  // use the latest production version of the protocol i.e V20_0_0, while version
  // `VX_X_X` represents the version in development and used for testing
  static readonly PURE_PROTOCOL_NAME = 'pure';
  static readonly DEV_PROTOCOL_VERSION = PureClientVersion.VX_X_X;
  static readonly PROD_PROTOCOL_VERSION = undefined;

  engine: V1_GraphManagerEngine;
  readonly graphBuilderExtensions: V1_GraphBuilderExtensions;

  constructor(
    pluginManager: GraphManagerPluginManager,
    logService: LogService,
    engine?: V1_GraphManagerEngine,
  ) {
    super(pluginManager, logService);
    this.engine = engine ?? new V1_RemoteEngine({}, logService);

    // setup plugins
    this.graphBuilderExtensions = new V1_GraphBuilderExtensions(
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
      disableGraphConfiguration?: boolean | undefined;
      engine?: V1_GraphManagerEngine;
    },
  ): Promise<void> {
    this.engine =
      options?.engine ??
      new V1_RemoteEngine(config.clientConfig, this.logService);
    // TODO: improve abstraction so that we do not need to access the engine server client directly
    if (this.engine instanceof V1_RemoteEngine) {
      this.engine
        .getEngineServerClient()
        .setTracerService(options?.tracerService ?? new TracerService());
    }
    if (!options?.disableGraphConfiguration) {
      // TODO: should probably be moved into each store's own initialize method
      await Promise.all([
        this.engine.setup(config),
        this.configureElementClassifierPathMap(config),
        this.configureSubtypeInfoMap(config),
      ]);

      // setup serialization plugins
      V1_setupPureModelContextDataSerialization(
        this.pluginManager.getPureProtocolProcessorPlugins(),
        this.subtypeInfo,
        this.elementClassifierPathMap,
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
    }
  }

  private async configureElementClassifierPathMap(
    config: TEMPORARY__EngineSetupConfig,
  ): Promise<void> {
    const classifierPathMapEntries =
      config.TEMPORARY__classifierPathMapping ??
      (await this.engine.getClassifierPathMapping());
    classifierPathMapEntries.forEach((entry) => {
      this.elementClassifierPathMap.set(entry.type, entry.classifierPath);
    });
  }

  private async configureSubtypeInfoMap(
    config: TEMPORARY__EngineSetupConfig,
  ): Promise<void> {
    const subtypeInfo =
      config.TEMPORARY__subtypeInfo ?? (await this.engine.getSubtypeInfo());
    this.subtypeInfo.storeSubtypes = subtypeInfo.storeSubtypes;
    this.subtypeInfo.functionActivatorSubtypes =
      subtypeInfo.functionActivatorSubtypes;
  }

  // --------------------------------------------- Generic ---------------------------------------------

  getSupportedProtocolVersion(): string {
    return PureClientVersion.V1_0_0;
  }

  getElementEntities(entities: Entity[]): Entity[] {
    return entities.filter(
      (entity) => entity.classifierPath !== CORE_PURE_PATH.SECTION_INDEX,
    );
  }

  // --------------------------------------------- Graph Builder ---------------------------------------------

  async buildSystem(
    coreModel: CoreModel,
    systemModel: SystemModel,
    buildState: ActionState,
    options?: GraphBuilderOptions,
    _report?: GraphManagerOperationReport,
  ): Promise<void> {
    const stopWatch = new StopWatch();
    const report = _report ?? createGraphBuilderReport();
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
      stopWatch.record(
        GRAPH_MANAGER_EVENT.GRAPH_BUILDER_DESERIALIZE_ELEMENTS__SUCCESS,
      );

      // prepare build inputs
      const buildInputs = [
        {
          model: systemModel,
          data: V1_indexPureModelContextData(
            report,
            systemData,
            this.graphBuilderExtensions,
          ),
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

      const totalTime = stopWatch.elapsed;
      report.timings = {
        ...Object.fromEntries(stopWatch.records),
        [GRAPH_MANAGER_EVENT.GRAPH_BUILDER_BUILD_GRAPH__SUCCESS]: totalTime,
        total: totalTime,
      };
    } catch (error) {
      assertErrorThrown(error);
      buildState.fail();
      this.logService.error(
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
    dependencyEntitiesIndex: Map<string, EntitiesWithOrigin>,
    buildState: ActionState,
    options?: GraphBuilderOptions,
    _report?: GraphManagerOperationReport,
  ): Promise<void> {
    const stopWatch = new StopWatch();
    const report = _report ?? createGraphBuilderReport();
    buildState.reset();

    // Create a dummy graph for system processing. This is to ensure dependency models do not depend on the main graph
    const graph = new PureModel(
      coreModel,
      systemModel,
      this.pluginManager.getPureGraphPlugins(),
    );
    graph.dependencyManager = dependencyManager;

    try {
      dependencyManager.initialize(dependencyEntitiesIndex);

      // deserialize
      buildState.setMessage(`Partitioning and deserializing elements...`);
      const dependencyGraphDataIndex = new Map<
        string,
        V1_PureModelContextData
      >();
      await Promise.all(
        Array.from(dependencyEntitiesIndex.entries()).map(
          ([dependencyKey, entitiesWithOrigin]) => {
            const projectModelData = new V1_PureModelContextData();
            dependencyGraphDataIndex.set(dependencyKey, projectModelData);
            return V1_entitiesToPureModelContextData(
              entitiesWithOrigin.entities,
              projectModelData,
              this.pluginManager.getPureProtocolProcessorPlugins(),
              this.subtypeInfo,
              this.elementClassifierPathMap,
            );
          },
        ),
      );
      stopWatch.record(
        GRAPH_MANAGER_EVENT.GRAPH_BUILDER_DESERIALIZE_ELEMENTS__SUCCESS,
      );

      // prepare build inputs
      const buildInputs: V1_PureGraphBuilderInput[] = Array.from(
        dependencyGraphDataIndex.entries(),
      ).map(([dependencyKey, dependencyData]) => ({
        model: graph.dependencyManager.getModel(dependencyKey),
        data: V1_indexPureModelContextData(
          report,
          dependencyData,
          this.graphBuilderExtensions,
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
      // set dependency manager graph origin to entities
      if (dependencyManager.origin === undefined) {
        dependencyManager.setOrigin(
          new GraphEntities(
            Array.from(dependencyEntitiesIndex.values())
              .map((e) => e.entities)
              .flat(),
          ),
        );
      }
      buildState.pass();
      const totalTime = stopWatch.elapsed;
      report.timings = {
        ...Object.fromEntries(stopWatch.records),
        [GRAPH_MANAGER_EVENT.GRAPH_BUILDER_BUILD_GRAPH__SUCCESS]: totalTime,
        total: totalTime,
      };
    } catch (error) {
      assertErrorThrown(error);
      this.logService.error(
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
    _report?: GraphManagerOperationReport,
  ): Promise<void> {
    const stopWatch = new StopWatch();
    const report = _report ?? createGraphBuilderReport();
    buildState.reset();

    try {
      // deserialize
      buildState.setMessage(`Deserializing elements...`);
      const data = new V1_PureModelContextData();
      await V1_entitiesToPureModelContextData(
        entities,
        data,
        this.pluginManager.getPureProtocolProcessorPlugins(),
        this.subtypeInfo,
        this.elementClassifierPathMap,
      );
      stopWatch.record(
        GRAPH_MANAGER_EVENT.GRAPH_BUILDER_DESERIALIZE_ELEMENTS__SUCCESS,
      );

      // prepare build inputs
      const buildInputs: V1_PureGraphBuilderInput[] = [
        {
          model: graph,
          data: V1_indexPureModelContextData(
            report,

            data,
            this.graphBuilderExtensions,
          ),
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
      if (options?.origin) {
        graph.setOrigin(options.origin);
      }

      buildState.pass();

      const totalTime = stopWatch.elapsed;
      report.timings = {
        ...Object.fromEntries(stopWatch.records),
        [GRAPH_MANAGER_EVENT.GRAPH_BUILDER_BUILD_GRAPH__SUCCESS]: totalTime,
        total: totalTime,
      };
    } catch (error) {
      assertErrorThrown(error);
      this.logService.error(
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

  async buildLightGraph(
    graph: PureModel,
    entities: Entity[],
    buildState: ActionState,
    options?: GraphBuilderOptions,
    _report?: GraphManagerOperationReport,
  ): Promise<void> {
    const stopWatch = new StopWatch();
    const report = _report ?? createGraphBuilderReport();
    buildState.reset();

    try {
      // deserialize
      buildState.setMessage(`Deserializing elements...`);
      const data = new V1_PureModelContextData();
      await V1_entitiesToPureModelContextData(
        entities,
        data,
        this.pluginManager.getPureProtocolProcessorPlugins(),
        this.subtypeInfo,
        this.elementClassifierPathMap,
      );
      stopWatch.record(
        GRAPH_MANAGER_EVENT.GRAPH_BUILDER_DESERIALIZE_ELEMENTS__SUCCESS,
      );

      // prepare build inputs
      const buildInputs: V1_PureGraphBuilderInput[] = [
        {
          model: graph,
          data: V1_indexPureModelContextData(
            report,
            data,
            this.graphBuilderExtensions,
          ),
        },
      ];

      // build
      await this.buildLightGraphFromInputs(
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

      const totalTime = stopWatch.elapsed;
      report.timings = {
        ...Object.fromEntries(stopWatch.records),
        [GRAPH_MANAGER_EVENT.GRAPH_BUILDER_BUILD_GRAPH__SUCCESS]: totalTime,
        total: totalTime,
      };
    } catch (error) {
      assertErrorThrown(error);
      this.logService.error(
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
    _report?: GraphManagerOperationReport,
  ): Promise<void> {
    const stopWatch = new StopWatch();
    const report = _report ?? createGraphBuilderReport();
    const generatedModel = graph.generationModel;
    buildState.reset();

    try {
      // deserialize
      buildState.setMessage(`Deserializing elements...`);
      const generationGraphDataIndex = new Map<
        string,
        V1_PureModelContextData
      >();
      await Promise.all(
        Array.from(generatedEntities.entries()).map(
          ([generationParentPath, entities]) => {
            const generatedData = new V1_PureModelContextData();
            generationGraphDataIndex.set(generationParentPath, generatedData);
            return V1_entitiesToPureModelContextData(
              entities,
              generatedData,
              this.pluginManager.getPureProtocolProcessorPlugins(),
              this.subtypeInfo,
              this.elementClassifierPathMap,
            );
          },
        ),
      );
      stopWatch.record(
        GRAPH_MANAGER_EVENT.GRAPH_BUILDER_DESERIALIZE_ELEMENTS__SUCCESS,
      );

      // prepare build inputs
      const buildInputs: V1_PureGraphBuilderInput[] = Array.from(
        generationGraphDataIndex.entries(),
      ).map(([generationParentPath, generatedData]) => ({
        model: generatedModel,
        data: V1_indexPureModelContextData(
          report,
          generatedData,
          this.graphBuilderExtensions,
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

      const totalTime = stopWatch.elapsed;
      report.timings = {
        ...Object.fromEntries(stopWatch.records),
        [GRAPH_MANAGER_EVENT.GRAPH_BUILDER_BUILD_GRAPH__SUCCESS]: totalTime,
        total: totalTime,
      };
    } catch (error) {
      assertErrorThrown(error);
      this.logService.error(
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
    inputs: V1_PureGraphBuilderInput[],
    report: GraphManagerOperationReport,
    stopWatch: StopWatch,
    graphBuilderState: ActionState,
    options?: GraphBuilderOptions,
  ): Promise<void> {
    // index
    graphBuilderState.setMessage(
      `Indexing ${report.elementCount.total} elements...`,
    );
    await this.initializeAndIndexElements(graph, inputs, options);
    stopWatch.record(GRAPH_MANAGER_EVENT.GRAPH_BUILDER_INDEX_ELEMENTS__SUCCESS);

    // build section index
    graphBuilderState.setMessage(`Building section indices...`);
    await this.buildSectionIndices(graph, inputs, options);
    stopWatch.record(
      GRAPH_MANAGER_EVENT.GRAPH_BUILDER_BUILD_SECTION_INDICES__SUCCESS,
    );

    // build types
    graphBuilderState.setMessage(`Building domain models...`);
    await this.buildTypes(graph, inputs, options);
    stopWatch.record(
      GRAPH_MANAGER_EVENT.GRAPH_BUILDER_BUILD_DOMAIN_MODELS__SUCCESS,
    );

    // build stores
    graphBuilderState.setMessage(`Building stores...`);
    await this.buildStores(graph, inputs, options);
    stopWatch.record(GRAPH_MANAGER_EVENT.GRAPH_BUILDER_BUILD_STORES__SUCCESS);

    // build mappings
    graphBuilderState.setMessage(`Building mappings...`);
    await this.buildMappings(graph, inputs, options);
    stopWatch.record(GRAPH_MANAGER_EVENT.GRAPH_BUILDER_BUILD_MAPPINGS__SUCCESS);

    // build connections and runtimes
    graphBuilderState.setMessage(`Building connections and runtimes...`);
    await this.buildConnectionsAndRuntimes(graph, inputs, options);
    stopWatch.record(
      GRAPH_MANAGER_EVENT.GRAPH_BUILDER_BUILD_CONNECTIONS_AND_RUNTIMES__SUCCESS,
    );

    // build function activators
    graphBuilderState.setMessage(`Building function activators...`);
    await this.buildFunctionActivators(graph, inputs, options);
    stopWatch.record(
      GRAPH_MANAGER_EVENT.GRAPH_BUILDER_BUILD_DOMAIN_MODELS__SUCCESS,
    );

    // build services
    graphBuilderState.setMessage(
      `Building services and execution environments...`,
    );
    await this.buildServices(graph, inputs, options);
    stopWatch.record(GRAPH_MANAGER_EVENT.GRAPH_BUILDER_BUILD_SERVICES__SUCCESS);

    // build data elements
    graphBuilderState.setMessage(`Building data elements...`);
    await this.buildDataElements(graph, inputs, options);
    stopWatch.record(
      GRAPH_MANAGER_EVENT.GRAPH_BUILDER_BUILD_DATA_ELEMENTS__SUCCESS,
    );

    // build data products
    graphBuilderState.setMessage(`Building data products...`);
    await this.buildDataProducts(graph, inputs, options);
    stopWatch.record(
      GRAPH_MANAGER_EVENT.GRAPH_BUILDER_BUILD_DATA_PRODUCTS__SUCCESS,
    );

    // build other elements
    graphBuilderState.setMessage(`Building other elements...`);
    await this.buildFileGenerations(graph, inputs, options);
    await this.buildGenerationSpecifications(graph, inputs, options);
    await this.buildOtherElements(graph, inputs, options);
    stopWatch.record(
      GRAPH_MANAGER_EVENT.GRAPH_BUILDER_BUILD_OTHER_ELEMENTS__SUCCESS,
    );
  }

  private async buildLightGraphFromInputs(
    graph: PureModel,
    inputs: V1_PureGraphBuilderInput[],
    report: GraphManagerOperationReport,
    stopWatch: StopWatch,
    graphBuilderState: ActionState,
    options?: GraphBuilderOptions,
  ): Promise<void> {
    // index
    graphBuilderState.setMessage(
      `Indexing ${report.elementCount.total} elements...`,
    );
    await this.initializeAndIndexElements(graph, inputs, options);
    stopWatch.record(GRAPH_MANAGER_EVENT.GRAPH_BUILDER_INDEX_ELEMENTS__SUCCESS);
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
      this.graphBuilderExtensions,
      this.logService,
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
    inputs: V1_PureGraphBuilderInput[],
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
          input.data.nativeElements.map((element) => {
            return this.visitWithGraphBuilderErrorHandling(
              element,
              new V1_ElementFirstPassBuilder(
                this.getBuilderContext(graph, input.model, element, options),
                packageCache,
                elementPathCache,
              ),
            );
          }),
        );
        await Promise.all(
          this.graphBuilderExtensions.sortedExtraElementBuilders.flatMap(
            (builder) =>
              (input.data.otherElementsByBuilder.get(builder) ?? []).map(
                (element) => {
                  return this.visitWithGraphBuilderErrorHandling(
                    element,
                    new V1_ElementFirstPassBuilder(
                      this.getBuilderContext(
                        graph,
                        input.model,
                        element,
                        options,
                      ),
                      packageCache,
                      elementPathCache,
                    ),
                  );
                },
              ),
          ),
        );
      }),
    );
  }

  private async buildTypes(
    graph: PureModel,
    inputs: V1_PureGraphBuilderInput[],
    options?: GraphBuilderOptions,
  ): Promise<void> {
    // Second pass
    await Promise.all(
      inputs.flatMap((input) =>
        input.data.profiles.map((element) =>
          this.visitWithGraphBuilderErrorHandling(
            element,
            new V1_ElementSecondPassBuilder(
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
            new V1_ElementSecondPassBuilder(
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
            new V1_ElementSecondPassBuilder(
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
            new V1_ElementSecondPassBuilder(
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
            new V1_ElementSecondPassBuilder(
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
            new V1_ElementThirdPassBuilder(
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
            new V1_ElementThirdPassBuilder(
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
            new V1_ElementFourthPassBuilder(
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
            new V1_ElementFourthPassBuilder(
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
            new V1_ElementFifthPassBuilder(
              this.getBuilderContext(graph, input.model, element, options),
            ),
          ),
        ),
      ),
    );
  }

  private async buildFunctionActivators(
    graph: PureModel,
    inputs: V1_PureGraphBuilderInput[],
    options?: GraphBuilderOptions,
  ): Promise<void> {
    await Promise.all(
      inputs.flatMap((input) =>
        input.data.functionActivators.map((element) =>
          this.visitWithGraphBuilderErrorHandling(
            element,
            new V1_ElementSecondPassBuilder(
              this.getBuilderContext(graph, input.model, element, options),
            ),
          ),
        ),
      ),
    );
  }

  private async buildStores(
    graph: PureModel,
    inputs: V1_PureGraphBuilderInput[],
    options?: GraphBuilderOptions,
  ): Promise<void> {
    await Promise.all(
      inputs.flatMap((input) =>
        input.data.stores.map((element) =>
          this.visitWithGraphBuilderErrorHandling(
            element,
            new V1_ElementSecondPassBuilder(
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
            new V1_ElementThirdPassBuilder(
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
            new V1_ElementFourthPassBuilder(
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
            new V1_ElementFifthPassBuilder(
              this.getBuilderContext(graph, input.model, element, options),
            ),
          ),
        ),
      ),
    );
  }

  private async buildMappings(
    graph: PureModel,
    inputs: V1_PureGraphBuilderInput[],
    options?: GraphBuilderOptions,
  ): Promise<void> {
    await Promise.all(
      inputs.flatMap((input) =>
        input.data.mappings.map((element) =>
          this.visitWithGraphBuilderErrorHandling(
            element,
            new V1_ElementSecondPassBuilder(
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
            new V1_ElementThirdPassBuilder(
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
            new V1_ElementFourthPassBuilder(
              this.getBuilderContext(graph, input.model, element, options),
            ),
          ),
        ),
      ),
    );
  }

  private async buildConnectionsAndRuntimes(
    graph: PureModel,
    inputs: V1_PureGraphBuilderInput[],
    options?: GraphBuilderOptions,
  ): Promise<void> {
    // NOTE: connections must be built before runtimes
    await Promise.all(
      inputs.flatMap((input) =>
        input.data.connections.map((element) =>
          this.visitWithGraphBuilderErrorHandling(
            element,
            new V1_ElementSecondPassBuilder(
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
            new V1_ElementSecondPassBuilder(
              this.getBuilderContext(graph, input.model, element, options),
            ),
          ),
        ),
      ),
    );
  }

  private async buildServices(
    graph: PureModel,
    inputs: V1_PureGraphBuilderInput[],
    options?: GraphBuilderOptions,
  ): Promise<void> {
    await Promise.all(
      inputs.flatMap((input) =>
        input.data.services.map((element) =>
          this.visitWithGraphBuilderErrorHandling(
            element,
            new V1_ElementSecondPassBuilder(
              this.getBuilderContext(graph, input.model, element, options),
            ),
          ),
        ),
      ),
    );
    await Promise.all(
      inputs.flatMap((input) =>
        input.data.executionEnvironments.map((element) =>
          this.visitWithGraphBuilderErrorHandling(
            element,
            new V1_ElementSecondPassBuilder(
              this.getBuilderContext(graph, input.model, element, options),
            ),
          ),
        ),
      ),
    );
  }

  private async buildDataElements(
    graph: PureModel,
    inputs: V1_PureGraphBuilderInput[],
    options?: GraphBuilderOptions,
  ): Promise<void> {
    await Promise.all(
      inputs.flatMap((input) =>
        input.data.dataElements.map((element) =>
          this.visitWithGraphBuilderErrorHandling(
            element,
            new V1_ElementSecondPassBuilder(
              this.getBuilderContext(graph, input.model, element, options),
            ),
          ),
        ),
      ),
    );
  }

  private async buildDataProducts(
    graph: PureModel,
    inputs: V1_PureGraphBuilderInput[],
    options?: GraphBuilderOptions,
  ): Promise<void> {
    await Promise.all(
      inputs.flatMap((input) =>
        input.data.products.map((element) =>
          this.visitWithGraphBuilderErrorHandling(
            element,
            new V1_ElementSecondPassBuilder(
              this.getBuilderContext(graph, input.model, element, options),
            ),
          ),
        ),
      ),
    );
  }

  private async buildFileGenerations(
    graph: PureModel,
    inputs: V1_PureGraphBuilderInput[],
    options?: GraphBuilderOptions,
  ): Promise<void> {
    await Promise.all(
      inputs.flatMap((input) =>
        input.data.fileGenerations.map((element) =>
          this.visitWithGraphBuilderErrorHandling(
            element,
            new V1_ElementSecondPassBuilder(
              this.getBuilderContext(graph, input.model, element, options),
            ),
          ),
        ),
      ),
    );
  }

  private async buildGenerationSpecifications(
    graph: PureModel,
    inputs: V1_PureGraphBuilderInput[],
    options?: GraphBuilderOptions,
  ): Promise<void> {
    await Promise.all(
      inputs.flatMap((input) =>
        input.data.generationSpecifications.map((element) =>
          this.visitWithGraphBuilderErrorHandling(
            element,
            new V1_ElementSecondPassBuilder(
              this.getBuilderContext(graph, input.model, element, options),
            ),
          ),
        ),
      ),
    );
  }

  private async buildSectionIndices(
    graph: PureModel,
    inputs: V1_PureGraphBuilderInput[],
    options?: GraphBuilderOptions,
  ): Promise<void> {
    await Promise.all(
      inputs.flatMap((input) =>
        input.data.sectionIndices.map((element) =>
          this.visitWithGraphBuilderErrorHandling(
            element,
            new V1_ElementSecondPassBuilder(
              this.getBuilderContext(graph, input.model, element, options),
            ),
          ),
        ),
      ),
    );
  }

  private async buildOtherElements(
    graph: PureModel,
    inputs: V1_PureGraphBuilderInput[],
    options?: GraphBuilderOptions,
  ): Promise<void> {
    await Promise.all(
      this.graphBuilderExtensions.sortedExtraElementBuilders.map(
        async (builder) => {
          await Promise.all(
            inputs.flatMap((input) =>
              (input.data.otherElementsByBuilder.get(builder) ?? []).map(
                (element) =>
                  this.visitWithGraphBuilderErrorHandling(
                    element,
                    new V1_ElementSecondPassBuilder(
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
                    new V1_ElementThirdPassBuilder(
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
                    new V1_ElementFourthPassBuilder(
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
                    new V1_ElementFifthPassBuilder(
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
        },
      ),
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

  async graphToPureCode(
    graph: PureModel,
    options?: {
      pretty?: boolean | undefined;
      excludeUnknown?: boolean | undefined;
    },
  ): Promise<string> {
    const startTime = Date.now();
    const graphData = this.graphToPureModelContextData(graph, {
      excludeUnknown: options?.excludeUnknown,
    });
    const grammarToJson = await this.engine.transformPureModelContextDataToCode(
      graphData,
      Boolean(options?.pretty),
    );
    this.logService.info(
      LogEvent.create(
        GRAPH_MANAGER_EVENT.TRANSFORM_GRAPH_META_MODEL_TO_GRAMMAR__SUCCESS,
      ),
      Date.now() - startTime,
      'ms',
    );
    return grammarToJson;
  }

  async prettyLambdaContent(lambda: string): Promise<string> {
    return this.engine.prettyLambdaContent(lambda);
  }

  async entitiesToPureCode(
    entities: Entity[],
    options?: { pretty?: boolean | undefined },
  ): Promise<string> {
    const startTime = Date.now();
    const grammarToJson = await this.engine.transformPureModelContextDataToCode(
      await this.entitiesToPureModelContextData(entities),
      Boolean(options?.pretty),
    );
    this.logService.info(
      LogEvent.create(
        GRAPH_MANAGER_EVENT.TRANSFORM_GRAPH_META_MODEL_TO_GRAMMAR__SUCCESS,
      ),
      Date.now() - startTime,
      'ms',
    );
    return grammarToJson;
  }

  async pureCodeToEntities(
    code: string,
    options?: {
      sourceInformationIndex?: Map<string, SourceInformation>;
      TEMPORARY__keepSectionIndex?: boolean;
    },
  ): Promise<Entity[]> {
    const index = new Map<string, V1_SourceInformation>();
    const pmcd = await this.engine.transformCodeToPureModelContextData(code, {
      sourceInformationIndex: options?.sourceInformationIndex
        ? index
        : undefined,
    });
    const sourceInformationIndex = options?.sourceInformationIndex;
    if (sourceInformationIndex) {
      sourceInformationIndex.clear();
      for (const [key, value] of index.entries()) {
        sourceInformationIndex.set(key, value);
      }
    }
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
    options?: {
      pruneSourceInformation?: boolean;
    },
  ): Promise<RawLambda> {
    const result = await this.engine.transformCodeToLambda(
      lambda,
      lambdaId,
      options,
    );
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

  override valueSpecificationsToPureCode(
    lambdas: Map<string, ValueSpecification>,
    pretty?: boolean | undefined,
  ): Promise<Map<string, string>> {
    const input: Record<string, PlainObject<V1_ValueSpecification>> = {};
    lambdas.forEach((val, key) => {
      input[key] = this.serializeValueSpecification(val);
    });
    return this.engine.transformValueSpecificationsToCode(
      input,
      Boolean(pretty),
    );
  }

  async valueSpecificationToPureCode(
    valSpec: PlainObject<ValueSpecification>,
    pretty?: boolean | undefined,
  ): Promise<string> {
    return this.engine.transformValueSpecificationToCode(
      valSpec,
      Boolean(pretty),
    );
  }

  async pureCodeToValueSpecification(
    valSpec: string,
    returnSourceInformation?: boolean,
  ): Promise<PlainObject<ValueSpecification>> {
    return this.engine.transformCodeToValueSpecification(
      valSpec,
      returnSourceInformation,
    );
  }

  async pureCodeToValueSpecifications(
    lambdas: Map<string, string>,
    graph: PureModel,
  ): Promise<Map<string, ValueSpecification>> {
    const pureCodeToValueSpecInput: Record<
      string,
      V1_GrammarParserBatchInputEntry
    > = {};
    Array.from(lambdas.entries()).forEach(([k, content]) => {
      pureCodeToValueSpecInput[k] = {
        value: content,
        returnSourceInformation: false,
      };
    });
    const specs = await this.engine.transformCodeToValueSpecifications(
      pureCodeToValueSpecInput,
    );
    const result = new Map<string, ValueSpecification>();
    Array.from(specs.entries()).forEach(([k, v]) => {
      result.set(k, this.buildValueSpecification(v, graph));
    });
    return result;
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

  async compileEntities(entities: Entity[]): Promise<void> {
    await this.engine.compilePureModelContextData(
      await this.entitiesToPureModelContextData(entities),
    );
  }

  async compileGraph(
    graph: PureModel,
    options?:
      | {
          onError?: (() => void) | undefined;
          keepSourceInformation?: boolean | undefined;
        }
      | undefined,
    _report?: GraphManagerOperationReport,
  ): Promise<CompilationResult> {
    const report = _report ?? createGraphManagerOperationReport();
    const stopWatch = new StopWatch();

    const graphData = this.getFullGraphModelData(graph, {
      keepSourceInformation: options?.keepSourceInformation,
    });
    stopWatch.record(GRAPH_MANAGER_EVENT.V1_ENGINE_OPERATION_INPUT__SUCCESS);

    const compilationResult = await this.engine.compilePureModelContextData(
      graphData,
      {
        onError: options?.onError,
      },
    );
    stopWatch.record(
      GRAPH_MANAGER_EVENT.V1_ENGINE_OPERATION_SERVER_CALL__SUCCESS,
    );

    report.timings = {
      ...Object.fromEntries(stopWatch.records),
      total: stopWatch.elapsed,
    };

    return {
      warnings: compilationResult.warnings?.map(
        (warning) =>
          new CompilationWarning(warning.message, warning.sourceInformation),
      ),
    };
  }

  async compileText(
    graphGrammar: string,
    graph: PureModel,
    options?: { onError?: () => void },
    _report?: GraphManagerOperationReport,
  ): Promise<TextCompilationResult> {
    const report = _report ?? createGraphManagerOperationReport();
    const stopWatch = new StopWatch();

    const graphCompileContext = this.getGraphCompileContext(graph);
    stopWatch.record(GRAPH_MANAGER_EVENT.V1_ENGINE_OPERATION_INPUT__SUCCESS);

    const compilationResult = await this.engine.compileText(
      graphGrammar,
      report,
      graphCompileContext,
      options,
    );

    const entities = this.pureModelContextDataToEntities(
      compilationResult.model,
    );
    const sourceInformationIndex = new Map<string, SourceInformation>();
    compilationResult.sourceInformationIndex.forEach((value, key) => {
      sourceInformationIndex.set(key, V1_buildSourceInformation(value));
    });

    report.timings = {
      ...report.timings,
      ...Object.fromEntries(stopWatch.records),
      total: stopWatch.elapsed,
    };

    return {
      entities,
      warnings: compilationResult.warnings?.map(
        (warning) =>
          new CompilationWarning(warning.message, warning.sourceInformation),
      ),
      sourceInformationIndex,
    };
  }

  getLambdaReturnType(
    lambda: RawLambda,
    graph: PureModel,
    options?: { keepSourceInformation?: boolean },
  ): Promise<string> {
    return this.engine.getLambdaReturnType(
      this.buildLambdaReturnTypeInput(lambda, graph, options),
    );
  }

  getLambdaRelationType(
    lambda: RawLambda,
    graph: PureModel,
    options?: { keepSourceInformation?: boolean },
  ): Promise<RelationTypeMetadata> {
    return this.engine.getLambdaRelationTypeFromRawInput(
      this.buildLambdaReturnTypeInput(lambda, graph, options),
    );
  }

  getCodeComplete(
    codeBlock: string,
    graph: PureModel,
    offset: number | undefined,
    options?: {
      ignoreElements: string[] | undefined;
    },
  ): Promise<CodeCompletionResult> {
    const pureModelContext = this.getFullGraphModelContext(
      graph,
      V1_PureGraphManager.DEV_PROTOCOL_VERSION,
    );
    if (
      pureModelContext instanceof V1_PureModelContextData &&
      options?.ignoreElements
    ) {
      pureModelContext.elements = pureModelContext.elements.filter(
        (element) => !options.ignoreElements?.includes(element.path),
      );
    }
    return this.engine.getCodeCompletion(
      new V1_CompleteCodeInput(codeBlock, pureModelContext, -1),
    );
  }

  override async getLambdasReturnType(
    lambdas: Map<string, RawLambda>,
    graph: PureModel,
    options?: { keepSourceInformation?: boolean },
  ): Promise<{
    results: Map<string, string>;
    errors: Map<string, EngineError>;
  }> {
    const returnTypes = {
      results: new Map<string, string>(),
      errors: new Map<string, EngineError>(),
    };
    const plainGraph = V1_serializePureModelContext(
      this.getFullGraphModelContext(
        graph,
        V1_PureGraphManager.DEV_PROTOCOL_VERSION,
      ),
    );
    await Promise.all(
      Array.from(lambdas.entries()).map((input) =>
        this.TEMPORARY__getLambdaReturnType(
          input[0],
          input[1],
          plainGraph,
          returnTypes,
          options,
        ),
      ),
    );
    return returnTypes;
  }

  // TEMPORARY: we mock batch `lambdaReturnType` as Engine currently does not support batching of lambda return types
  async TEMPORARY__getLambdaReturnType(
    key: string,
    lambda: RawLambda,
    plainGraph: PlainObject<V1_PureModelContext>,
    finalResult: {
      results: Map<string, string>;
      errors: Map<string, EngineError>;
    },
    options?: { keepSourceInformation?: boolean },
  ): Promise<void> {
    try {
      const plainLambda = V1_serializeRawValueSpecification(
        this.buildV1RawLambda(lambda, options),
      );
      const type = await this.engine.getLambdaReturnTypeFromRawInput({
        model: plainGraph,
        lambda: plainLambda,
      });
      finalResult.results.set(key, type);
    } catch (error) {
      assertErrorThrown(error);
      if (error instanceof EngineError) {
        finalResult.errors.set(key, error);
        return;
      }
      this.logService.error(
        LogEvent.create(GRAPH_MANAGER_EVENT.COMPILATION_FAILURE),
        error,
      );
    }
  }

  private buildLambdaReturnTypeInput(
    lambda: RawLambda,
    graph: PureModel,
    options?: { keepSourceInformation?: boolean },
  ): V1_LambdaReturnTypeInput {
    return new V1_LambdaReturnTypeInput(
      this.getFullGraphModelContext(
        graph,
        V1_PureGraphManager.DEV_PROTOCOL_VERSION,
      ),
      this.buildV1RawLambda(lambda, options),
    );
  }

  private buildV1RawLambda(
    lambda: RawLambda,
    options?: { keepSourceInformation?: boolean },
  ): V1_RawLambda {
    return lambda.accept_RawValueSpecificationVisitor(
      new V1_RawValueSpecificationTransformer(
        new V1_GraphTransformerContextBuilder(
          this.pluginManager.getPureProtocolProcessorPlugins(),
        )
          .withKeepSourceInformationFlag(
            Boolean(options?.keepSourceInformation),
          )
          .build(),
      ),
    ) as V1_RawLambda;
  }

  // ------------------------------------------- Generation -------------------------------------------

  getAvailableGenerationConfigurationDescriptions(): Promise<
    GenerationConfigurationDescription[]
  > {
    return this.engine.getAvailableGenerationConfigurationDescriptions();
  }

  private async buildPMCDWithOptions(
    graph: PureModel,
    graphOptions?: GraphTextInputOption,
  ): Promise<V1_PureModelContextData> {
    const graphGrammar = graphOptions?.graphGrammar;
    if (graphGrammar) {
      const graphCompileContext = this.getGraphCompileContext(graph);
      return this.engine.combineTextAndPMCD(graphGrammar, graphCompileContext);
    }
    return this.getFullGraphModelData(graph);
  }

  async generateArtifacts(
    graph: PureModel,
    graphOptions?: GraphTextInputOption,
    elementPaths?: string[],
  ): Promise<ArtifactGenerationExtensionResult> {
    const model = await this.buildPMCDWithOptions(graph, graphOptions);
    const input = new V1_ArtifactGenerationExtensionInput(
      model,
      // TODO provide plugin to filter out artifacts we don't want to show in the generation
      elementPaths ?? graph.allOwnElements.map((e) => e.path),
    );
    const result = await this.engine.generateArtifacts(input);
    return V1_buildArtifactsByExtensionElement(result);
  }

  async generateFile(
    fileGeneration: FileGenerationSpecification,
    generationMode: GenerationMode,
    graph: PureModel,
    graphOptions?: GraphTextInputOption,
  ): Promise<GenerationOutput[]> {
    const config: PlainObject = {};
    config.scopeElements = fileGeneration.scopeElements.map((element) =>
      element instanceof PackageableElementReference
        ? element.value.path
        : element,
    );
    fileGeneration.configurationProperties.forEach((property) => {
      config[property.name] = property.value as PlainObject;
    });
    const model = await this.buildPMCDWithOptions(graph, graphOptions);
    return (
      await this.engine.generateFile(
        config,
        fileGeneration.type,
        generationMode,
        model,
      )
    ).map(V1_buildGenerationOutput);
  }

  async generateModel(
    generationElement: PackageableElement,
    graph: PureModel,
    graphOptions?: GraphTextInputOption,
  ): Promise<Entity[]> {
    const model = await this.buildPMCDWithOptions(graph, graphOptions);
    let generatedModel: V1_PureModelContextData | undefined = undefined;
    const extraModelGenerators = this.pluginManager
      .getPureProtocolProcessorPlugins()
      .flatMap(
        (plugin) =>
          (
            plugin as DSL_Generation_PureProtocolProcessorPlugin_Extension
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

  // --------------------------------------------- Test Data Generation ---------------------------------------------

  async generateTestData(
    query: RawLambda,
    mapping: string,
    runtime: string,
    graph: PureModel,
  ): Promise<TestDataGenerationResult> {
    const testDataGenerationInput = new V1_TestDataGenerationInput();
    testDataGenerationInput.query = V1_transformRawLambda(
      query,
      new V1_GraphTransformerContextBuilder(
        this.pluginManager.getPureProtocolProcessorPlugins(),
      ).build(),
    );
    testDataGenerationInput.mapping = mapping;
    testDataGenerationInput.runtime = runtime;
    const graphData = this.getFullGraphModelContext(
      graph,
      V1_PureGraphManager.DEV_PROTOCOL_VERSION,
    );
    testDataGenerationInput.model = graphData;
    return V1_buildTestDataGenerationResult(
      await this.engine.generateTestData(
        testDataGenerationInput,
        this.pluginManager.getPureProtocolProcessorPlugins(),
      ),
      this.getBuilderContext(graph, graph, new V1_Mapping()), // use a dummy V1_PackageableElement to generate V1_GraphBuilderContext which is used in V1_buildEmbeddedData()
    );
  }

  // ------------------------------------------- Test  -------------------------------------------

  async runTests(
    inputs: RunTestsTestableInput[],
    graph: PureModel,
  ): Promise<TestResult[]> {
    const runTestsInput = new V1_RunTestsInput();
    runTestsInput.model = this.getFullGraphModelContext(
      graph,
      V1_PureGraphManager.DEV_PROTOCOL_VERSION,
    );
    runTestsInput.testables = inputs
      .map((input) => {
        const testable = guaranteeNonNullable(
          getNullableIDFromTestable(
            input.testable,
            graph,
            this.pluginManager.getPureGraphManagerPlugins(),
          ),
          `Unable to find testable from id`,
        );
        if (!testable) {
          return undefined;
        }
        const runTestableInput = new V1_RunTestsTestableInput();
        runTestableInput.testable = testable;
        runTestableInput.unitTestIds = input.unitTestIds.map((unit) => {
          const unitAtomicTest = new V1_UniqueTestId();
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
      this.pluginManager.getPureProtocolProcessorPlugins(),
    );
    return result;
  }

  async debugTests(
    inputs: RunTestsTestableInput[],
    graph: PureModel,
  ): Promise<TestDebug[]> {
    const runTestsInput = new V1_RunTestsInput();
    runTestsInput.model = this.getFullGraphModelContext(
      graph,
      V1_PureGraphManager.DEV_PROTOCOL_VERSION,
    );
    runTestsInput.testables = inputs
      .map((input) => {
        const testable = guaranteeNonNullable(
          getNullableIDFromTestable(
            input.testable,
            graph,
            this.pluginManager.getPureGraphManagerPlugins(),
          ),
          `Unable to find testable from id`,
        );
        if (!testable) {
          return undefined;
        }
        const runTestableInput = new V1_RunTestsTestableInput();
        runTestableInput.testable = testable;
        runTestableInput.unitTestIds = input.unitTestIds.map((unit) => {
          const unitAtomicTest = new V1_UniqueTestId();
          unitAtomicTest.testSuiteId = unit.parentSuite?.id;
          unitAtomicTest.atomicTestId = unit.atomicTest.id;
          return unitAtomicTest;
        });
        return runTestableInput;
      })
      .filter(isNonNullable);
    const runTestsResult = await this.engine.debugTests(runTestsInput);
    const result = V1_buildDebugTestsResult(
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

  // ------------------------------------------- Value Specification -------------------------------------------

  buildValueSpecification(
    json: PlainObject,
    graph: PureModel,
  ): ValueSpecification {
    return V1_buildValueSpecification(
      V1_deserializeValueSpecification(
        json,
        this.pluginManager.getPureProtocolProcessorPlugins(),
      ),
      new V1_GraphBuilderContextBuilder(
        graph,
        graph,
        this.graphBuilderExtensions,
        this.logService,
      ).build(),
    );
  }

  serializeValueSpecification(
    valueSpecification: ValueSpecification,
  ): PlainObject {
    return V1_serializeValueSpecification(
      V1_transformRootValueSpecification(valueSpecification),
      this.pluginManager.getPureProtocolProcessorPlugins(),
    );
  }

  transformValueSpecToRawValueSpec(
    valueSpecification: ValueSpecification,
    graph: PureModel,
  ): RawValueSpecification {
    // converts value spec to json
    const json = this.serializeValueSpecification(valueSpecification);
    return this.buildRawValueSpecification(json, graph);
  }

  buildRawValueSpecification(
    json: object,
    graph: PureModel,
  ): RawValueSpecification {
    const rawValueSpecification = V1_deserializeRawValueSpecification(
      json as PlainObject<V1_RawValueSpecification>,
    );
    return rawValueSpecification.accept_RawValueSpecificationVisitor(
      new V1_RawValueSpecificationBuilder(
        new V1_GraphBuilderContextBuilder(
          graph,
          graph,
          this.graphBuilderExtensions,
          this.logService,
        ).build(),
      ),
    );
  }

  serializeRawValueSpecification(
    metamodel: RawValueSpecification,
  ): PlainObject {
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

  createGetAllRawLambda(_class: Class): RawLambda {
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

  createDefaultBasicRawLambda(options?: {
    addDummyParameter?: boolean;
  }): RawLambda {
    return new RawLambda(
      options?.addDummyParameter ? [{ _type: 'var', name: 'x' }] : [],
      [
        {
          _type: 'string',
          value: '',
        },
      ],
    );
  }

  // ------------------------------------------- External Format --------------------------------

  getAvailableExternalFormatsDescriptions(): Promise<
    ExternalFormatDescription[]
  > {
    return this.engine.getAvailableExternalFormatsDescriptions();
  }

  generateModelFromExternalFormat(
    schemaSet: SchemaSet,
    targetBinding: string | undefined,
    configurationProperties: ConfigurationProperty[],
    graph: PureModel,
  ): Promise<string> {
    const config: PlainObject = {};
    configurationProperties.forEach((property) => {
      config[property.name] = property.value as PlainObject;
    });
    const model = this.getFullGraphModelData(graph);
    const input = new V1_ExternalFormatModelGenerationInput(
      schemaSet.path,
      model,
      config,
    );
    if (targetBinding) {
      input.generateBinding = true;
      input.targetBindingPath = targetBinding;
    }
    // TODO: once api defaults to latest prod pure client version
    input.clientVersion = PureClientVersion.VX_X_X;
    return this.engine.generateModel(input);
  }

  async generateSchemaFromExternalFormatConfig(
    modelUnit: ModelUnit,
    targetBinding: string | undefined,
    configurationProperties: ConfigurationProperty[],
    currentGraph: PureModel,
  ): Promise<SchemaSet[]> {
    const config: PlainObject = {};
    configurationProperties.forEach((property) => {
      config[property.name] = property.value as PlainObject;
    });
    const input = new V1_GenerateSchemaInput(
      V1_transformModelUnit(modelUnit),
      this.getFullGraphModelData(currentGraph),
      Boolean(targetBinding),
      config,
    );
    input.targetBindingPath = targetBinding;
    const genPMCD = await this.engine.generateSchema(input);
    const genGraph = await this.createBasicGraph();
    const report = createGraphBuilderReport();
    const mainGraphBuilderInput: V1_PureGraphBuilderInput[] = [
      {
        model: genGraph,
        data: V1_indexPureModelContextData(
          report,
          genPMCD,
          this.graphBuilderExtensions,
        ),
      },
    ];
    await this.buildGraphFromInputs(
      genGraph,
      mainGraphBuilderInput,
      report,
      new StopWatch(),
      ActionState.create(),
    );
    return genGraph.allElements.filter(filterByType(SchemaSet));
  }

  // ------------------------------------------- Import -------------------------------------------

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

  private prepareExecutionContextGraphData(
    graphData: GraphData,
  ): V1_PureModelContext {
    if (graphData instanceof InMemoryGraphData) {
      return this.getFullGraphModelData(graphData.graph);
    } else if (graphData instanceof GraphDataWithOrigin) {
      return this.buildPureModelSDLCPointer(
        graphData.origin,
        V1_PureGraphManager.PROD_PROTOCOL_VERSION,
      );
    }
    throw new UnsupportedOperationError(
      `Can't build Pure model context from unsupported graph data`,
      graphData,
    );
  }

  public createExecutionInput = (
    graph: PureModel,
    mapping: Mapping | undefined,
    lambda: RawLambda,
    runtime: Runtime | undefined,
    clientVersion: string | undefined,
    options?: ExecutionOptions,
  ): V1_ExecuteInput =>
    this.createExecutionInputWithPureModelContext(
      graph.origin
        ? this.buildPureModelSDLCPointer(graph.origin, undefined)
        : this.getFullGraphModelData(graph),
      mapping,
      lambda,
      runtime,
      clientVersion,
      new V1_ExecuteInput(),
      options,
    );

  public createLineageInput = (
    graph: PureModel,
    mapping: Mapping | undefined,
    lambda: RawLambda,
    runtime: Runtime | undefined,
    clientVersion: string | undefined,
  ): V1_LineageInput => {
    const executionInput = this.createExecutionInput(
      graph,
      mapping,
      lambda,
      runtime,
      clientVersion,
    );

    const lineageInput = new V1_LineageInput();
    lineageInput.clientVersion = executionInput.clientVersion;
    lineageInput.function = executionInput.function;
    lineageInput.mapping = executionInput.mapping;
    lineageInput.model = executionInput.model;
    lineageInput.runtime = executionInput.runtime;
    return lineageInput;
  };

  private createExecutionInputWithPureModelContext = (
    data: V1_PureModelContext,
    mapping: Mapping | undefined,
    lambda: RawLambda,
    runtime: Runtime | undefined,
    clientVersion: string | undefined,
    executeInput: V1_ExecuteInput,
    options?: ExecutionOptions | undefined,
  ): V1_ExecuteInput => {
    let mappingPath = mapping?.path;
    const lambdaToExecute = V1_transformRawLambda(
      lambda,
      new V1_GraphTransformerContextBuilder(
        this.pluginManager.getPureProtocolProcessorPlugins(),
      ).build(),
    );
    let runtimeToExecute = runtime
      ? V1_transformRuntime(
          runtime,
          new V1_GraphTransformerContextBuilder(
            this.pluginManager.getPureProtocolProcessorPlugins(),
          ).build(),
        )
      : undefined;
    if (options?.forceFromExpression) {
      if (runtimeToExecute instanceof V1_RuntimePointer) {
        const runtimePath = runtimeToExecute.runtime;
        const body = lambdaToExecute.body;
        if (body && runtimePath.length) {
          // handles multi expression lambda (i.e let statement executions)
          if (Array.isArray(body)) {
            const expressions = body as object[];
            if (expressions.length) {
              const lastIdx = expressions.length - 1;
              const lastBody = expressions[lastIdx];
              if (lastBody) {
                const fromExpression = this.__fromExpression(
                  mappingPath,
                  runtimePath,
                  lastBody,
                );
                expressions[lastIdx] = fromExpression;
                mappingPath = undefined;
                runtimeToExecute = undefined;
              }
            }
          } else {
            const fromExpression = this.__fromExpression(
              mappingPath,
              runtimePath,
              body,
            );
            lambdaToExecute.body = fromExpression;
            mappingPath = undefined;
            runtimeToExecute = undefined;
          }
        }
      }
    }
    return this.createExecutionInputWithPureModelContextWithV1(
      data,
      mappingPath,
      lambdaToExecute,
      runtimeToExecute,
      clientVersion,
      executeInput,
      options?.parameterValues,
    );
  };

  __fromExpression = (
    mapping: string | undefined,
    runtime: string,
    body: object,
  ): object => {
    return {
      _type: 'func',
      function: 'from',
      parameters: [
        body,
        mapping
          ? {
              _type: 'packageableElementPtr',
              fullPath: mapping,
            }
          : undefined,
        {
          _type: 'packageableElementPtr',
          fullPath: runtime,
        },
      ].filter(isNonNullable),
    };
  };

  private createExecutionInputWithPureModelContextWithV1 = (
    data: V1_PureModelContext,
    mapping: string | undefined,
    lambda: V1_RawLambda,
    runtime: V1_Runtime | undefined,
    clientVersion: string | undefined,
    executeInput: V1_ExecuteInput,
    parameterValues?: ParameterValue[],
  ): V1_ExecuteInput => {
    // NOTE: for execution, we usually will just assume that we send the connections embedded in the runtime value, since we don't want the user to have to create
    // packageable runtime and connection just to play with execution.
    executeInput.clientVersion = clientVersion;
    executeInput.function = lambda;
    executeInput.mapping = mapping;
    executeInput.runtime = runtime;
    executeInput.model = data;
    executeInput.context = new V1_RawBaseExecutionContext(); // TODO: potentially need to support more types
    if (parameterValues) {
      executeInput.parameterValues = parameterValues.map((parameterValue) =>
        V1_transformParameterValue(parameterValue),
      );
    }
    return executeInput;
  };

  async runQueryWithUncompiledGraph(
    lambda: RawLambda | string,
    mapping: string | undefined,
    runtime: string | undefined,
    graph: PureModel,
    options?: ExecutionOptions,
    _report?: GraphManagerOperationReport,
  ): Promise<ExecutionResultWithMetadata> {
    let rawLambda: V1_RawLambda;
    if (isString(lambda)) {
      const rawValueSpecification = V1_deserializeRawValueSpecification(
        await this.pureCodeToValueSpecification(lambda),
      );
      rawLambda = guaranteeType(rawValueSpecification, V1_RawLambda);
    } else {
      rawLambda = V1_transformRawLambda(
        lambda,
        new V1_GraphTransformerContextBuilder(
          this.pluginManager.getPureProtocolProcessorPlugins(),
        ).build(),
      );
    }
    let v1Runtime: V1_RuntimePointer | undefined = undefined;
    if (runtime) {
      const _run = new V1_RuntimePointer();
      _run.runtime = runtime;
      v1Runtime = _run;
    }
    return this._runQuery(
      () =>
        this.createExecutionInputWithPureModelContextWithV1(
          graph.origin
            ? this.buildPureModelSDLCPointer(graph.origin, undefined)
            : this.getFullGraphModelData(graph),
          mapping,
          rawLambda,
          v1Runtime,
          this.engine.config.useDevClientProtocol
            ? V1_PureGraphManager.DEV_PROTOCOL_VERSION
            : V1_PureGraphManager.PROD_PROTOCOL_VERSION,
          new V1_ExecuteInput(),
          options?.parameterValues,
        ),
      options,
      _report,
    );
  }

  async runQuery(
    lambda: RawLambda,
    mapping: Mapping,
    runtime: Runtime,
    graph: PureModel,
    options?: ExecutionOptions,
    _report?: GraphManagerOperationReport,
  ): Promise<ExecutionResultWithMetadata> {
    return this._runQuery(
      () =>
        this.createExecutionInput(
          graph,
          mapping,
          lambda,
          runtime,
          this.engine.config.useDevClientProtocol
            ? V1_PureGraphManager.DEV_PROTOCOL_VERSION
            : V1_PureGraphManager.PROD_PROTOCOL_VERSION,
          options,
        ),
      options,
      _report,
    );
  }

  async _runQuery(
    createV1ExecuteInputFunc: () => V1_ExecuteInput,
    options?: ExecutionOptions,
    _report?: GraphManagerOperationReport,
  ): Promise<ExecutionResultWithMetadata> {
    const report = _report ?? createGraphManagerOperationReport();
    const stopWatch = new StopWatch();
    const input = createV1ExecuteInputFunc();
    stopWatch.record(GRAPH_MANAGER_EVENT.V1_ENGINE_OPERATION_INPUT__SUCCESS);

    const result = await this.engine.runQuery(input, options);
    stopWatch.record(
      GRAPH_MANAGER_EVENT.V1_ENGINE_OPERATION_SERVER_CALL__SUCCESS,
    );

    report.timings = {
      ...Object.fromEntries(stopWatch.records),
      total: stopWatch.elapsed,
    };
    if (result.executionTraceId) {
      return {
        executionResult: V1_buildExecutionResult(result.executionResult),
        executionTraceId: result.executionTraceId,
      };
    } else {
      return {
        executionResult: V1_buildExecutionResult(result.executionResult),
      };
    }
  }

  async exportData(
    lambda: RawLambda,
    mapping: Mapping,
    runtime: Runtime,
    graph: PureModel,
    options?: ExecutionOptions | undefined,
    _report?: GraphManagerOperationReport | undefined,
    contentType?: ContentType | undefined,
  ): Promise<Response> {
    const report = _report ?? createGraphManagerOperationReport();
    const stopWatch = new StopWatch();

    const input = this.createExecutionInput(
      graph,
      mapping,
      lambda,
      runtime,
      this.engine.config.useDevClientProtocol
        ? V1_PureGraphManager.DEV_PROTOCOL_VERSION
        : V1_PureGraphManager.PROD_PROTOCOL_VERSION,
      options,
    );
    stopWatch.record(GRAPH_MANAGER_EVENT.V1_ENGINE_OPERATION_INPUT__SUCCESS);
    const stream = await this.engine.exportData(input, options, contentType);
    stopWatch.record(
      GRAPH_MANAGER_EVENT.V1_ENGINE_OPERATION_SERVER_CALL__SUCCESS,
    );
    report.timings = {
      ...Object.fromEntries(stopWatch.records),
      total: stopWatch.elapsed,
    };
    return stream;
  }

  async DEPRECATED__runLegacyMappingTests(
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
  ): Promise<void> {
    const report = _report ?? createGraphManagerOperationReport();
    const stopWatch = new StopWatch();
    const pureModelContext = graph.origin
      ? this.buildPureModelSDLCPointer(graph.origin, undefined)
      : this.getFullGraphModelData(graph);
    stopWatch.record(GRAPH_MANAGER_EVENT.V1_ENGINE_OPERATION_INPUT__SUCCESS);
    await Promise.all(
      tests.map((t) =>
        this.DEPRECATED__runLegacyMappingTest(
          t,
          mapping,
          pureModelContext,
          options,
          report,
        ),
      ),
    );
  }

  private async DEPRECATED__runLegacyMappingTest(
    testInfo: {
      test: DEPRECATED__MappingTest;
      runtime: Runtime;
      handleResult: (val: ExecutionResult) => void;
      handleError: (message: Error) => void;
    },
    mapping: Mapping,
    data: V1_PureModelContext,
    options?: ExecutionOptions,
    _report?: GraphManagerOperationReport,
  ): Promise<void> {
    const report = _report ?? createGraphManagerOperationReport();
    try {
      const stopWatch = new StopWatch();
      stopWatch.record(GRAPH_MANAGER_EVENT.V1_ENGINE_OPERATION_INPUT__SUCCESS);
      DEPRECATED__validate_MappingTest(testInfo.test);
      const input = this.createExecutionInputWithPureModelContext(
        data,
        mapping,
        testInfo.test.query,
        testInfo.runtime,
        V1_PureGraphManager.PROD_PROTOCOL_VERSION,
        new V1_ExecuteInput(),
        options,
      );
      const result = V1_buildExecutionResult(
        (await this.engine.runQuery(input, options)).executionResult,
      );
      stopWatch.record(
        GRAPH_MANAGER_EVENT.V1_ENGINE_OPERATION_SERVER_CALL__SUCCESS,
      );
      report.timings = {
        ...Object.fromEntries(stopWatch.records),
        total: stopWatch.elapsed,
      };
      testInfo.handleResult(result);
    } catch (error) {
      assertErrorThrown(error);
      testInfo.handleError(error);
    }
  }

  async generateExecutionPlan(
    lambda: RawLambda,
    mapping: Mapping | undefined,
    runtime: Runtime | undefined,
    graph: PureModel,
    options?: ExecutionOptions,
    _report?: GraphManagerOperationReport,
  ): Promise<RawExecutionPlan> {
    const report = _report ?? createGraphManagerOperationReport();
    const stopWatch = new StopWatch();

    const input = this.createExecutionInput(
      graph,
      mapping,
      lambda,
      runtime,
      V1_PureGraphManager.DEV_PROTOCOL_VERSION,
      options,
    );
    stopWatch.record(GRAPH_MANAGER_EVENT.V1_ENGINE_OPERATION_INPUT__SUCCESS);

    const result = await this.engine.generateExecutionPlan(input);
    stopWatch.record(
      GRAPH_MANAGER_EVENT.V1_ENGINE_OPERATION_SERVER_CALL__SUCCESS,
    );

    report.timings = {
      ...Object.fromEntries(stopWatch.records),
      total: stopWatch.elapsed,
    };

    return result;
  }

  async debugExecutionPlanGeneration(
    lambda: RawLambda,
    mapping: Mapping | undefined,
    runtime: Runtime | undefined,
    graph: PureModel,
    options?: ExecutionOptions,
    _report?: GraphManagerOperationReport,
  ): Promise<{ plan: RawExecutionPlan; debug: string }> {
    const report = _report ?? createGraphManagerOperationReport();
    const stopWatch = new StopWatch();

    const input = this.createExecutionInput(
      graph,
      mapping,
      lambda,
      runtime,
      V1_PureGraphManager.DEV_PROTOCOL_VERSION,
      options,
    );
    stopWatch.record(GRAPH_MANAGER_EVENT.V1_ENGINE_OPERATION_INPUT__SUCCESS);

    const result = await this.engine.debugExecutionPlanGeneration(input);
    stopWatch.record(
      GRAPH_MANAGER_EVENT.V1_ENGINE_OPERATION_SERVER_CALL__SUCCESS,
    );

    report.timings = {
      ...Object.fromEntries(stopWatch.records),
      total: stopWatch.elapsed,
    };

    return {
      plan: result.plan,
      debug: result.debug.join('\n'),
    };
  }

  async generateExecuteTestData(
    lambda: RawLambda,
    parameters: (string | number | boolean)[],
    mapping: Mapping,
    runtime: Runtime,
    graph: PureModel,
    options?: {
      anonymizeGeneratedData?: boolean;
      parameterValues?: ParameterValue[];
    },
    _report?: GraphManagerOperationReport,
  ): Promise<string> {
    const report = _report ?? createGraphManagerOperationReport();
    const stopWatch = new StopWatch();

    const testDataGenerationExecuteInput =
      new V1_TestDataGenerationExecutionInput();
    this.createExecutionInputWithPureModelContext(
      graph.origin
        ? this.buildPureModelSDLCPointer(graph.origin, undefined)
        : this.getFullGraphModelData(graph),
      mapping,
      lambda,
      runtime,
      V1_PureGraphManager.DEV_PROTOCOL_VERSION,
      testDataGenerationExecuteInput,
      options,
    );
    testDataGenerationExecuteInput.parameters = parameters;
    testDataGenerationExecuteInput.hashStrings = Boolean(
      options?.anonymizeGeneratedData,
    );
    stopWatch.record(GRAPH_MANAGER_EVENT.V1_ENGINE_OPERATION_INPUT__SUCCESS);

    const result = await this.engine.generateExecuteTestData(
      testDataGenerationExecuteInput,
    );
    stopWatch.record(
      GRAPH_MANAGER_EVENT.V1_ENGINE_OPERATION_SERVER_CALL__SUCCESS,
    );

    report.timings = {
      ...Object.fromEntries(stopWatch.records),
      total: stopWatch.elapsed,
    };

    return result;
  }

  async generateExecuteTestDataWithSeedData(
    lambda: RawLambda,
    tableRowIdentifiers: TableRowIdentifiers[],
    mapping: Mapping,
    runtime: Runtime,
    graph: PureModel,
    options?: {
      anonymizeGeneratedData?: boolean;
      parameterValues?: ParameterValue[];
    },
    _report?: GraphManagerOperationReport,
  ): Promise<string> {
    const report = _report ?? createGraphManagerOperationReport();
    const stopWatch = new StopWatch();
    const testDataGenerationExecuteWithSeedInput =
      new V1_TestDataGenerationExecutionWithSeedInput();
    this.createExecutionInputWithPureModelContext(
      graph.origin
        ? this.buildPureModelSDLCPointer(graph.origin, undefined)
        : this.getFullGraphModelData(graph),
      mapping,
      lambda,
      runtime,
      V1_PureGraphManager.DEV_PROTOCOL_VERSION,
      testDataGenerationExecuteWithSeedInput,
      options,
    );
    testDataGenerationExecuteWithSeedInput.hashStrings = Boolean(
      options?.anonymizeGeneratedData,
    );
    testDataGenerationExecuteWithSeedInput.tableRowIdentifiers =
      tableRowIdentifiers.map((tr) => {
        const result = new V1_TableRowIdentifiers();
        result.table = V1_transformTablePointer(tr.table);
        result.rowIdentifiers = tr.rowIdentifiers.map((ri) => {
          const value = new V1_RowIdentifier();
          value.columnValuePairs = ri.columnValuePairs.map((cv) => {
            const pair = new V1_ColumnValuePair();
            pair.name = cv.name;
            pair.value = cv.value;
            return pair;
          });
          return value;
        });
        return result;
      });
    stopWatch.record(GRAPH_MANAGER_EVENT.V1_ENGINE_OPERATION_INPUT__SUCCESS);

    const result = await this.engine.generateExecuteTestDataWithSeedData(
      testDataGenerationExecuteWithSeedInput,
    );
    stopWatch.record(
      GRAPH_MANAGER_EVENT.V1_ENGINE_OPERATION_SERVER_CALL__SUCCESS,
    );

    report.timings = {
      ...Object.fromEntries(stopWatch.records),
      total: stopWatch.elapsed,
    };

    return result;
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
        this.graphBuilderExtensions,
        this.logService,
      ).build(),
    );
  }

  buildLineage(lineageJSON: PlainObject<V1_RawLineageModel>): LineageModel {
    return deserialize(LineageModel, lineageJSON);
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

  async cancelUserExecutions(broadcastToCluster: boolean): Promise<string> {
    return this.engine.cancelUserExecutions(broadcastToCluster);
  }

  override async analyzeExecuteInput(
    data: PlainObject,
    executablePath: string,
  ): Promise<{ origin: GraphDataOrigin; entities: Entity[] }> {
    const executeInput = V1_ExecuteInput.serialization.fromJson(data);
    let origin: GraphDataOrigin | undefined;
    if (executeInput.model instanceof V1_PureModelContextData) {
      origin = new GraphEntities(
        this.pureModelContextDataToEntities(executeInput.model),
      );
    } else if (
      executeInput.model instanceof V1_PureModelContextPointer &&
      executeInput.model.sdlcInfo instanceof V1_LegendSDLC
    ) {
      origin = new LegendSDLC(
        executeInput.model.sdlcInfo.groupId,
        executeInput.model.sdlcInfo.artifactId,
        executeInput.model.sdlcInfo.version,
      );
    }

    let executable: V1_PackageableElement | undefined;

    if (
      executeInput.mapping !== undefined &&
      executeInput.runtime !== undefined
    ) {
      const service = new V1_Service();
      service.name = extractElementNameFromPath(executablePath);
      service.package = extractPackagePathFromPath(executablePath) ?? 'test';
      service.pattern = `/${uuid()}`;
      service.documentation = '';
      const execution = new V1_PureSingleExecution();
      execution.mapping = executeInput.mapping;
      execution.runtime = executeInput.runtime;
      execution.func = executeInput.function;
      service.execution = execution;
      executable = service;
    } else if (
      executeInput.mapping === undefined &&
      executeInput.runtime === undefined
    ) {
      // TODO: we don't support runtime, mapping, parameter values,
      // we assume the function does not take parameters and we won't
      // unpack the function body to decorate with ->from() to build
      // the execution context for simplicity sake, we fall back to use
      // service instead
      const func = new V1_ConcreteFunctionDefinition();
      func.name = extractElementNameFromPath(executablePath);
      func.package = extractPackagePathFromPath(executablePath) ?? 'test';
      func.body = executeInput.function.body as object[];
      func.returnMultiplicity = V1_Multiplicity.ZERO_ONE;
      func.returnGenericType = V1_createGenericTypeWithElementPath(
        CORE_PURE_PATH.ANY,
      );
      func.name = V1_buildFunctionSignature(func);
      executable = func;
    }

    // TODO: we can also add a new Text element with the content of
    // the execute input and instruction to go to debugger function
    if (!origin) {
      throw new Error(`Can't analyze execute input: failed to extract origin`);
    }
    if (!executable) {
      throw new Error(
        `Can't analyze execute input: failed to synthesize debugger executable`,
      );
    }
    return {
      origin,
      entities: [this.elementProtocolToEntity(executable)],
    };
  }

  // --------------------------------------------- Query ---------------------------------------------

  async searchQueries(
    searchSpecification: QuerySearchSpecification,
  ): Promise<LightQuery[]> {
    return (
      await this.engine.searchQueries(
        V1_transformQuerySearchSpecification(searchSpecification),
      )
    ).map((protocol) => {
      // TODO: improve abstraction so that we can get the current user ID from any abstract engine
      return V1_buildLightQuery(protocol, this.engine.getCurrentUserId());
    });
  }

  async getQueries(queryIds: string[]): Promise<LightQuery[]> {
    return (await this.engine.getQueries(queryIds)).map((protocol) => {
      // TODO: improve abstraction so that we can get the current user ID from any abstract engine
      return V1_buildLightQuery(protocol, this.engine.getCurrentUserId());
    });
  }

  async getLightQuery(queryId: string): Promise<LightQuery> {
    // TODO: improve abstraction so that we can get the current user ID from any abstract engine
    return V1_buildLightQuery(
      await this.engine.getQuery(queryId),
      this.engine.getCurrentUserId(),
    );
  }

  async getQuery(queryId: string, graph: PureModel): Promise<Query> {
    // TODO: improve abstraction so that we can get the current user ID from any abstract engine
    return V1_buildQuery(
      await this.engine.getQuery(queryId),
      graph,
      this.engine.getCurrentUserId(),
    );
  }
  async getQueryInfo(queryId: string): Promise<QueryInfo> {
    const currentUserId =
      this.engine instanceof V1_RemoteEngine
        ? this.engine.getCurrentUserId()
        : undefined;

    const query = await this.engine.getQuery(queryId);
    return {
      name: query.name,
      id: query.id,
      versionId: query.versionId,
      groupId: query.groupId,
      artifactId: query.artifactId,
      mapping: query.mapping,
      runtime: query.runtime,
      executionContext: V1_buildExecutionContextInfo(query),
      content: query.content,
      isCurrentUserQuery:
        currentUserId !== undefined && query.owner === currentUserId,
      taggedValues: query.taggedValues?.map((taggedValueProtocol) => {
        const taggedValue = new QueryTaggedValue();
        taggedValue.profile = guaranteeNonEmptyString(
          taggedValueProtocol.tag.profile,
          `Tagged value 'tag.profile' field is missing or empty`,
        );
        taggedValue.tag = guaranteeNonEmptyString(
          taggedValueProtocol.tag.value,
          `Tagged value 'tag.value' field is missing or empty`,
        );
        taggedValue.value = guaranteeNonEmptyString(
          taggedValueProtocol.value,
          `Tagged value 'value' field is missing or empty`,
        );
        return taggedValue;
      }),
      defaultParameterValues: query.defaultParameterValues?.map((param) => {
        const vDefault = new V1_QueryParameterValue();
        vDefault.name = param.name;
        vDefault.content = param.content;
        return vDefault;
      }),
    };
  }

  async createQuery(query: Query, graph: PureModel): Promise<Query> {
    // TODO: improve abstraction so that we can get the current user ID from any abstract engine
    return V1_buildQuery(
      await this.engine.createQuery(V1_transformQuery(query)),
      graph,
      this.engine.getCurrentUserId(),
    );
  }

  async updateQuery(query: Query, graph: PureModel): Promise<Query> {
    // TODO: improve abstraction so that we can get the current user ID from any abstract engine
    return V1_buildQuery(
      await this.engine.updateQuery(V1_transformQuery(query)),
      graph,
      this.engine.getCurrentUserId(),
    );
  }

  async patchQuery(query: Partial<Query>, graph: PureModel): Promise<Query> {
    // TODO: improve abstraction so that we can get the current user ID from any abstract engine
    return V1_buildQuery(
      await this.engine.patchQuery(V1_transformQuery(query)),
      graph,
      this.engine.getCurrentUserId(),
    );
  }

  async renameQuery(queryId: string, queryName: string): Promise<LightQuery> {
    const query = await this.engine.getQuery(queryId);
    query.name = queryName;
    // TODO: improve abstraction so that we can get the current user ID from any abstract engine
    return V1_buildLightQuery(
      await this.engine.updateQuery(query),
      this.engine.getCurrentUserId(),
    );
  }

  async deleteQuery(queryId: string): Promise<void> {
    await this.engine.deleteQuery(queryId);
  }

  async productionizeQueryToServiceEntity(
    query: QueryInfo,
    serviceConfig: {
      name: string;
      packageName: string;
      pattern: string;
      serviceOwners: string[];
    },
    graph: Entity[],
  ): Promise<Entity> {
    const service = new V1_Service();
    service.name = serviceConfig.name;
    service.package = serviceConfig.packageName;
    const owernship = new V1_UserListOwnership();
    owernship.users = serviceConfig.serviceOwners;
    service.ownership = owernship;
    service.pattern = serviceConfig.pattern;
    service.documentation = '';
    const lambda = await this.engine.transformCodeToLambda(
      query.content,
      undefined,
      {
        pruneSourceInformation: true,
      },
    );
    const pureExecution = new V1_PureSingleExecution();
    pureExecution.func = lambda;
    if (query.mapping && query.runtime) {
      pureExecution.mapping = query.mapping;
      const runtime = new V1_RuntimePointer();
      runtime.runtime = query.runtime;
      pureExecution.runtime = runtime;
    } else if (
      query.executionContext instanceof QueryExplicitExecutionContextInfo
    ) {
      pureExecution.mapping = query.executionContext.mapping;
      const runtime = new V1_RuntimePointer();
      runtime.runtime = query.executionContext.runtime;
      pureExecution.runtime = runtime;
    } else {
      const extraExecutionBuilder = this.pluginManager
        .getPureProtocolProcessorPlugins()
        .flatMap(
          (plugin) => plugin.V1_getExtraSavedQueryExecutionBuilder?.() ?? [],
        );
      const builder = extraExecutionBuilder
        .map((_builder) => _builder(query.executionContext, graph))
        .filter(isNonNullable);
      if (builder.length === 1) {
        pureExecution.mapping = guaranteeNonNullable(builder[0]).mapping;
        const runtime = new V1_RuntimePointer();
        runtime.runtime = guaranteeNonNullable(builder[0]).runtime;
        pureExecution.runtime = runtime;
      }
    }
    service.execution = pureExecution;
    return this.elementProtocolToEntity(service);
  }

  async resolveQueryInfoExecutionContext(
    query: QueryInfo,
    graphLoader: () => Promise<PlainObject<Entity>[]>,
  ): Promise<{ mapping: string | undefined; runtime: string }> {
    if (query.mapping && query.runtime) {
      return {
        mapping: query.mapping,
        runtime: query.runtime,
      };
    } else if (
      query.executionContext instanceof QueryExplicitExecutionContextInfo
    ) {
      return {
        mapping: query.executionContext.mapping,
        runtime: query.executionContext.runtime,
      };
    } else {
      const graph = await graphLoader();
      const extraExecutionBuilder = this.pluginManager
        .getPureProtocolProcessorPlugins()
        .flatMap(
          (plugin) => plugin.V1_getExtraSavedQueryExecutionBuilder?.() ?? [],
        );
      const builder = extraExecutionBuilder
        .map((_builder) =>
          _builder(query.executionContext, graph as unknown as Entity[]),
        )
        .filter(isNonNullable);
      if (builder.length === 1) {
        return {
          mapping: guaranteeNonNullable(builder[0]).mapping,
          runtime: guaranteeNonNullable(builder[0]).runtime,
        };
      }
      throw new UnsupportedOperationError(
        `Unable to resolve execution context for query ${query.id}`,
      );
    }
  }

  // --------------------------------------------- DataCube ---------------------------------------------

  override searchDataCubes(
    searchSpecification: QuerySearchSpecification,
  ): Promise<LightPersistentDataCube[]> {
    return this.engine.searchDataCubes(
      V1_transformQuerySearchSpecification(searchSpecification),
    );
  }

  override getDataCubes(ids: string[]): Promise<LightPersistentDataCube[]> {
    return this.engine.getDataCubes(ids);
  }

  override async getDataCube(id: string): Promise<PersistentDataCube> {
    const query = await this.engine.getDataCube(id);
    return query;
  }

  override async createDataCube(
    dataCube: PersistentDataCube,
  ): Promise<PersistentDataCube> {
    return this.engine.createDataCube(dataCube);
  }

  override updateDataCube(
    dataCube: PersistentDataCube,
  ): Promise<PersistentDataCube> {
    return this.engine.updateDataCube(dataCube);
  }

  override async deleteDataCube(id: string): Promise<void> {
    await this.engine.deleteDataCube(id);
  }

  // --------------------------------------------- Analysis ---------------------------------------------

  async analyzeMappingModelCoverage(
    mapping: Mapping,
    graph: PureModel,
  ): Promise<MappingModelCoverageAnalysisResult> {
    const input = new V1_MappingModelCoverageAnalysisInput();
    input.clientVersion = V1_PureGraphManager.DEV_PROTOCOL_VERSION;
    input.mapping = mapping.path;
    input.model = graph.origin
      ? this.buildPureModelSDLCPointer(graph.origin, undefined)
      : this.getFullGraphModelData(graph);
    return V1_buildModelCoverageAnalysisResult(
      await this.engine.analyzeMappingModelCoverage(input),
      this,
      mapping,
    );
  }

  buildMappingModelCoverageAnalysisResult(
    input: RawMappingModelCoverageAnalysisResult,
    mapping: Mapping,
  ): MappingModelCoverageAnalysisResult {
    return V1_buildModelCoverageAnalysisResult(
      deserialize(
        V1_MappingModelCoverageAnalysisResult,
        input as PlainObject<V1_MappingModelCoverageAnalysisResult>,
      ),
      this,
      mapping,
    );
  }

  generateStoreEntitlementAnalysisInput(
    mapping: string,
    runtime: string,
    query: RawLambda | undefined,
    graphData: GraphData,
  ): V1_StoreEntitlementAnalysisInput {
    const input = new V1_StoreEntitlementAnalysisInput();
    input.clientVersion = V1_PureGraphManager.PROD_PROTOCOL_VERSION;
    input.mapping = mapping;
    input.runtime = runtime;
    input.query = query
      ? V1_transformRawLambda(
          query,
          new V1_GraphTransformerContextBuilder(
            this.pluginManager.getPureProtocolProcessorPlugins(),
          ).build(),
        )
      : undefined;
    input.model = this.prepareExecutionContextGraphData(graphData);
    return input;
  }

  async surveyDatasets(
    mapping: string,
    runtime: string,
    query: RawLambda | undefined,
    graphData: GraphData,
  ): Promise<DatasetSpecification[]> {
    return (
      await this.engine.surveyDatasets(
        this.generateStoreEntitlementAnalysisInput(
          mapping,
          runtime,
          query,
          graphData,
        ),
        this.pluginManager.getPureProtocolProcessorPlugins(),
      )
    ).map((dataset) =>
      V1_buildDatasetSpecification(
        dataset,
        this.pluginManager.getPureProtocolProcessorPlugins(),
      ),
    );
  }

  async checkDatasetEntitlements(
    datasets: DatasetSpecification[],
    mapping: string,
    runtime: string,
    query: RawLambda | undefined,
    graphData: GraphData,
  ): Promise<DatasetEntitlementReport[]> {
    const input = new V1_EntitlementReportAnalyticsInput();
    input.storeEntitlementAnalyticsInput =
      this.generateStoreEntitlementAnalysisInput(
        mapping,
        runtime,
        query,
        graphData,
      );
    input.reports = datasets.map((dataset) =>
      V1_transformDatasetSpecification(
        dataset,
        this.pluginManager.getPureProtocolProcessorPlugins(),
      ),
    );
    return (
      await this.engine.checkDatasetEntitlements(
        input,
        this.pluginManager.getPureProtocolProcessorPlugins(),
      )
    ).map((report) =>
      V1_buildDatasetEntitlementReport(
        report,
        this.pluginManager.getPureProtocolProcessorPlugins(),
      ),
    );
  }

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
    config.enrichTableFunctions = input.config.enrichTableFunctions;
    config.enrichPrimaryKeys = input.config.enrichPrimaryKeys;
    config.enrichColumns = input.config.enrichColumns;
    config.patterns = input.config.patterns.map(
      (storePattern: DatabasePattern): V1_DatabasePattern => {
        const pattern = new V1_DatabasePattern();
        pattern.schemaPattern = storePattern.schemaPattern;
        pattern.tablePattern = storePattern.tablePattern;
        pattern.functionPattern = storePattern.functionPattern;
        pattern.escapeSchemaPattern = storePattern.escapeSchemaPattern;
        pattern.escapeTablePattern = storePattern.escapeTablePattern;
        pattern.escapeFunctionPattern = storePattern.escapeFunctionPattern;
        return pattern;
      },
    );
    dbBuilderInput.config = config;
    return this.pureModelContextDataToEntities(
      await this.engine.buildDatabase(
        dbBuilderInput,
        this.pluginManager.getPureProtocolProcessorPlugins(),
      ),
    );
  }

  override async executeRawSQL(
    connection: RelationalDatabaseConnection,
    sql: string,
  ): Promise<string> {
    const input = new V1_RawSQLExecuteInput();
    input.connection = V1_transformRelationalDatabaseConnection(
      connection,
      new V1_GraphTransformerContextBuilder(
        this.pluginManager.getPureProtocolProcessorPlugins(),
      ).build(),
    );
    input.sql = sql;
    return this.engine.executeRawSQL(
      input,
      this.pluginManager.getPureProtocolProcessorPlugins(),
    );
  }

  // --------------------------------------------- Function ---------------------------------------------

  async getAvailableFunctionActivatorConfigurations(
    coreModel: CoreModel,
    systemModel: SystemModel,
  ): Promise<FunctionActivatorConfiguration[]> {
    return (
      await Promise.all(
        (await this.engine.getAvailableFunctionActivators()).map(
          async (info) => {
            try {
              const config = new FunctionActivatorConfiguration();
              config.name = info.name;
              config.description = info.description;
              config.packageableElementJSONType =
                info.configuration.packageableElementJSONType;

              // build the mini graph for configuration
              const graph = new PureModel(
                coreModel,
                systemModel,
                this.pluginManager.getPureGraphPlugins(),
              );
              const _report = createGraphBuilderReport();
              const _stopWatch = new StopWatch();
              const _buildState = ActionState.create();
              const data = new V1_PureModelContextData();
              data.elements = info.configuration.model;
              const buildInputs: V1_PureGraphBuilderInput[] = [
                {
                  model: graph,
                  data: V1_indexPureModelContextData(
                    _report,
                    data,
                    this.graphBuilderExtensions,
                  ),
                },
              ];
              await this.buildGraphFromInputs(
                graph,
                buildInputs,
                _report,
                _stopWatch,
                _buildState,
                {},
              );
              config.graph = graph;
              config.configurationType = graph.getClass(
                info.configuration.topElement,
              );
              return config;
            } catch (error) {
              assertErrorThrown(error);
              this.logService.warn(
                LogEvent.create(GRAPH_MANAGER_EVENT.GRAPH_MANAGER_FAILURE),
                `Can't build function activator config: ${error.message}`,
              );
              return undefined;
            }
          },
        ),
      )
    ).filter(isNonNullable);
  }

  async validateFunctionActivator(
    functionActivator: FunctionActivator,
    graphData: GraphData,
  ): Promise<void> {
    const input = new V1_FunctionActivatorInput();
    input.clientVersion = V1_PureGraphManager.PROD_PROTOCOL_VERSION;
    input.functionActivator = functionActivator.path;
    input.model = this.prepareExecutionContextGraphData(graphData);
    await this.engine.validateFunctionActivator(input);
  }

  async renderFunctionActivatorArtifact(
    functionActivator: FunctionActivator,
    graphData: GraphData,
  ): Promise<PlainObject> {
    const input = new V1_FunctionActivatorInput();
    input.clientVersion = V1_PureGraphManager.PROD_PROTOCOL_VERSION;
    input.functionActivator = functionActivator.path;
    input.model = this.prepareExecutionContextGraphData(graphData);
    const result = await this.engine.renderFunctionActivatorArtifact(input);
    return result;
  }

  async publishFunctionActivatorToSandbox(
    functionActivator: FunctionActivator,
    graphData: GraphData,
  ): Promise<DeploymentResult> {
    const input = new V1_FunctionActivatorInput();
    input.clientVersion = V1_PureGraphManager.PROD_PROTOCOL_VERSION;
    input.functionActivator = functionActivator.path;
    input.model = this.prepareExecutionContextGraphData(graphData);
    const result = await this.engine.publishFunctionActivatorToSandbox(input);
    return result;
  }

  // --------------------------------------------- Relational ---------------------------------------------

  async generateModelsFromDatabaseSpecification(
    databasePath: string,
    targetPackage: undefined | string,
    graph: PureModel,
  ): Promise<Entity[]> {
    const graphData = new V1_PureModelContextData();
    graphData.elements = [this.elementToProtocol(graph.getStore(databasePath))];
    const input = new V1_DatabaseToModelGenerationInput();
    input.databasePath = databasePath;
    input.modelData = graphData;
    input.targetPackage = targetPackage;
    const generatedModel =
      await this.engine.generateModelsFromDatabaseSpecification(input);
    return this.pureModelContextDataToEntities(generatedModel);
  }

  async getAvailableRelationalDatabaseTypeConfigurations(): Promise<
    RelationalDatabaseTypeConfiguration[] | undefined
  > {
    try {
      const configs =
        await this.engine.getAvailableRelationalDatabaseTypeConfigurations();
      return uniq(configs.map((e) => e.dbType)).map((type) => {
        assertNonEmptyString(
          type,
          'Property dbType missing in database authentication flow',
        );
        const compatibles = configs.filter((f) => f.dbType === type);
        const config = new RelationalDatabaseTypeConfiguration();
        config.type = type;
        config.compatibleAuthStrategies = uniq(
          compatibles
            .map((aFlow) => aFlow.authStrategy)
            .flat()
            .map((e) => {
              assertNonEmptyString(
                e,
                'Property authStrategy missing in database authentication flow',
              );
              return e;
            }),
        );
        config.compatibleDataSources = uniq(
          compatibles
            .map((aFlow) => aFlow.dataSource)
            .flat()
            .map((dataSource) => {
              assertNonEmptyString(
                dataSource,
                'Property dataSource missing in database authentication flow',
              );
              return dataSource;
            }),
        );
        return config;
      });
    } catch (error) {
      assertErrorThrown(error);
      this.logService.error(
        LogEvent.create(GRAPH_MANAGER_EVENT.RELATIONAL_CONNECTION),
        error,
      );
      return undefined;
    }
  }

  // --------------------------------------------- Service ---------------------------------------------

  async registerService(
    service: Service,
    graph: PureModel,
    groupId: string,
    artifactId: string,
    version: string | undefined,
    server: string,
    executionMode: ServiceExecutionMode,
    options?: ServiceRegistrationOptions,
  ): Promise<ServiceRegistrationSuccess> {
    const serverServiceInfo = await this.engine.getServerServiceInfo();
    // input
    let input: V1_PureModelContext;
    const protocol = new V1_Protocol(
      V1_PureGraphManager.PURE_PROTOCOL_NAME,
      serverServiceInfo.services.dependencies.pure,
    );
    switch (executionMode) {
      case ServiceExecutionMode.FULL_INTERACTIVE: {
        const data = this.getFullGraphModelData(graph);
        const sdlcInfo = new V1_LegendSDLC(groupId, artifactId, version);
        sdlcInfo.packageableElementPointers = [
          new V1_PackageableElementPointer(
            PackageableElementPointerType.SERVICE,
            service.path,
          ),
        ];
        data.origin = new V1_PureModelContextPointer(protocol, sdlcInfo);
        input = data;
        break;
      }
      case ServiceExecutionMode.SEMI_INTERACTIVE: {
        const sdlcInfo = new V1_LegendSDLC(groupId, artifactId, version);
        const pointer = new V1_PureModelContextPointer(protocol, sdlcInfo);

        // data
        const data = new V1_PureModelContextData();
        data.origin = new V1_PureModelContextPointer(protocol);
        const serviceProtocol = this.elementToProtocol<V1_Service>(service);

        // override the URL pattern if specified
        if (options?.TEMPORARY__semiInteractiveOverridePattern) {
          serviceProtocol.pattern =
            options.TEMPORARY__semiInteractiveOverridePattern;
        }

        data.elements = [serviceProtocol];

        // SDLC info
        // TODO: We may need to add `runtime` pointers if the runtime defned in the service is a packageable runtime
        // and not embedded.
        const execution = service.execution;
        if (execution instanceof PureSingleExecution) {
          if (execution.mapping) {
            sdlcInfo.packageableElementPointers = [
              new V1_PackageableElementPointer(
                PackageableElementPointerType.MAPPING,
                execution.mapping.value.path,
              ),
            ];
          }
        } else if (execution instanceof PureMultiExecution) {
          sdlcInfo.packageableElementPointers =
            execution.executionParameters?.map(
              (e) =>
                new V1_PackageableElementPointer(
                  PackageableElementPointerType.MAPPING,
                  e.mapping.value.path,
                ),
            ) ?? [];
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
        const sdlcInfo = new V1_LegendSDLC(groupId, artifactId, version);
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
    return V1_buildServiceRegistrationSuccess(
      service,
      await this.engine.registerService(
        input,
        server,
        executionMode,
        Boolean(options?.TEMPORARY__useStoreModel),
        Boolean(options?.TEMPORARY__useGenerateLineage),
        Boolean(options?.TEMPORARY__useGenerateOpenApi),
      ),
    );
  }

  async bulkServiceRegistration(
    services: Service[],
    graph: PureModel,
    groupId: string,
    artifactId: string,
    version: string | undefined,
    server: string,
    executionMode: ServiceExecutionMode,
    options?: ServiceRegistrationOptions,
  ): Promise<ServiceRegistrationResult[]> {
    const serverServiceInfo = await this.engine.getServerServiceInfo();
    const inputs: ServiceRegistrationInput[] = [];

    const protocol = new V1_Protocol(
      V1_PureGraphManager.PURE_PROTOCOL_NAME,
      serverServiceInfo.services.dependencies.pure,
    );
    switch (executionMode) {
      case ServiceExecutionMode.FULL_INTERACTIVE: {
        const graphData = this.getFullGraphModelData(graph);

        services.forEach((service) => {
          const pmcd = new V1_PureModelContextData();
          pmcd.serializer = graphData.serializer;
          pmcd.INTERNAL__rawDependencyEntities =
            graphData.INTERNAL__rawDependencyEntities;
          pmcd.elements = graphData.elements;
          const sdlcInfo = new V1_LegendSDLC(groupId, artifactId, version);
          sdlcInfo.packageableElementPointers = [
            new V1_PackageableElementPointer(
              PackageableElementPointerType.SERVICE,
              service.path,
            ),
          ];
          pmcd.origin = new V1_PureModelContextPointer(protocol, sdlcInfo);
          inputs.push({ service: service, context: pmcd });
        });
        break;
      }
      case ServiceExecutionMode.SEMI_INTERACTIVE: {
        services.forEach((service) => {
          const sdlcInfo = new V1_LegendSDLC(groupId, artifactId, version);
          const pointer = new V1_PureModelContextPointer(protocol, sdlcInfo);
          // data
          const data = new V1_PureModelContextData();
          data.origin = new V1_PureModelContextPointer(protocol);
          const serviceProtocol = this.elementToProtocol<V1_Service>(service);

          // override the URL pattern if specified
          if (options?.TEMPORARY__semiInteractiveOverridePattern) {
            serviceProtocol.pattern =
              options.TEMPORARY__semiInteractiveOverridePattern;
          }

          data.elements = [serviceProtocol];

          // SDLC info
          // TODO: We may need to add `runtime` pointers if the runtime defned in the service is a packageable runtime
          // and not embedded.
          const execution = service.execution;
          if (execution instanceof PureSingleExecution) {
            if (execution.mapping) {
              sdlcInfo.packageableElementPointers = [
                new V1_PackageableElementPointer(
                  PackageableElementPointerType.MAPPING,
                  execution.mapping.value.path,
                ),
              ];
            }
          } else if (execution instanceof PureMultiExecution) {
            sdlcInfo.packageableElementPointers =
              execution.executionParameters?.map(
                (e) =>
                  new V1_PackageableElementPointer(
                    PackageableElementPointerType.MAPPING,
                    e.mapping.value.path,
                  ),
              ) ?? [];
          } else {
            throw new UnsupportedOperationError(
              `Can't register service with the specified execution`,
              execution,
            );
          }
          // composite input
          inputs.push({
            service: service,
            context: new V1_PureModelContextComposite(protocol, data, pointer),
          });
        });
        break;
      }
      case ServiceExecutionMode.PROD: {
        services.forEach((service) => {
          const sdlcInfo = new V1_LegendSDLC(groupId, artifactId, version);
          const pointer = new V1_PureModelContextPointer(protocol, sdlcInfo);
          const data = new V1_PackageableElementPointer(
            PackageableElementPointerType.SERVICE,
            service.path,
          );
          sdlcInfo.packageableElementPointers.push(data);
          inputs.push({ service: service, context: pointer });
        });
        break;
      }
      default: {
        throw new UnsupportedOperationError(
          `Can't register service with execution mode '${executionMode}'`,
        );
      }
    }

    const results = (
      await Promise.all(
        inputs.map(async (inputData) => {
          try {
            const result = await this.engine.registerService(
              inputData.context,
              server,
              executionMode,
              Boolean(options?.TEMPORARY__useStoreModel),
              Boolean(options?.TEMPORARY__useGenerateLineage),
              Boolean(options?.TEMPORARY__useGenerateOpenApi),
            );
            if (result.status === 'success') {
              return new ServiceRegistrationSuccess(
                inputData.service,
                result.serverURL,
                result.pattern,
                result.serviceInstanceId,
              );
            }
            return undefined;
          } catch (error) {
            assertErrorThrown(error);
            return new ServiceRegistrationFail(
              inputData.service,
              error.message,
            );
          }
        }),
      )
    ).filter(isNonNullable);

    return results;
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

  async runServicePostValidations(
    service: Service,
    graph: PureModel,
    assertionId: string,
  ): Promise<PostValidationAssertionResult> {
    const contextData = this.getFullGraphModelData(graph);
    const result = await this.engine.runServicePostVal(
      service.path,
      contextData,
      assertionId,
    );
    return result;
  }

  // --------------------------------------------- SDLC --------------------------------------------------
  createSandboxProject(): Promise<{
    projectId: string;
    webUrl: string | undefined;
    owner: string;
  }> {
    // TODO: improve abstraction so that we do not need to access the engine server client directly
    const engine = guaranteeType(
      this.engine,
      V1_RemoteEngine,
      'createSandboxProject is only supported by remote engine',
    );
    return engine.getEngineServerClient().createPrototypeProject();
  }

  userHasPrototypeProjectAccess(userId: string): Promise<boolean> {
    // TODO: improve abstraction so that we do not need to access the engine server client directly
    const engine = guaranteeType(
      this.engine,
      V1_RemoteEngine,
      'userHasPrototypeProjectAccess is only supported by remote engine',
    );
    return engine.getEngineServerClient().validUserAccessRole(userId);
  }

  // --------------------------------------------- Change Detection ---------------------------------------------

  async buildHashesIndex(entities: Entity[]): Promise<Map<string, string>> {
    const hashMap = new Map<string, string>();
    const pureModelContextData = new V1_PureModelContextData();
    /**
     * FIXME: to be deleted when most users have migrated to using full function signature as function name
     * Currently, SDLC store many functions in legacy form (entity path does
     * not contain full function signature). However, since they store function
     * entity in text, when they parse the content to return JSON for entity
     * content, the content is then updated to have proper `name` for function
     * entities, this means that there's now a mismatch in the path constructed
     * from entity content and the entity path, which is a contract that SDLC
     * should maintain but currently not because of this change
     * See https://github.com/finos/legend-sdlc/pull/515
     *
     * For that reason, during this migration, we want to respect entity path
     * instead of the path constructed from entity content to properly
     * reflect the renaming of function in local changes.
     */
    const TEMPORARY__entityPathIndex = new Map<string, string>();
    await V1_entitiesToPureModelContextData(
      entities,
      pureModelContextData,
      this.pluginManager.getPureProtocolProcessorPlugins(),
      this.subtypeInfo,
      this.elementClassifierPathMap,
      TEMPORARY__entityPathIndex,
    );
    await Promise.all(
      pureModelContextData.elements.map((element) =>
        promisify(() =>
          hashMap.set(
            TEMPORARY__entityPathIndex.get(element.path)
              ? guaranteeNonNullable(
                  TEMPORARY__entityPathIndex.get(element.path),
                )
              : element.path,
            element.hashCode,
          ),
        ),
      ),
    );
    return hashMap;
  }

  // --------------------------------------------- Shared ---------------------------------------------

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

  override async elementsToPureCode(
    elements: PackageableElement[],
    options?: { pruneSourceInformation?: boolean; pretty?: boolean },
  ): Promise<string> {
    const graphData = new V1_PureModelContextData();
    graphData.elements = elements.map((element) =>
      this.elementToProtocol(element, {
        keepSourceInformation: !options?.pruneSourceInformation,
      }),
    );
    const jsonToGrammar = await this.engine.transformPureModelContextDataToCode(
      graphData,
      Boolean(options?.pretty),
    );
    return jsonToGrammar;
  }

  private prunePureModelContextData = (
    data: V1_PureModelContextData,
    elementFilter?: (val: V1_PackageableElement) => boolean,
    entityFilter?: (entity: Entity) => boolean,
  ): V1_PureModelContextData => {
    const prunedGraphData = new V1_PureModelContextData();
    prunedGraphData.elements = data.elements.filter((element) =>
      elementFilter ? elementFilter(element) : true,
    );
    prunedGraphData.INTERNAL__rawDependencyEntities =
      data.INTERNAL__rawDependencyEntities?.filter((entity) =>
        entityFilter ? entityFilter(entity) : true,
      );
    return prunedGraphData;
  };

  private buildPureModelSDLCPointer(
    origin: GraphDataOrigin,
    clientVersion: string | undefined,
  ): V1_PureModelContextPointer {
    if (origin instanceof LegendSDLC) {
      return new V1_PureModelContextPointer(
        clientVersion
          ? new V1_Protocol(
              V1_PureGraphManager.PURE_PROTOCOL_NAME,
              clientVersion,
            )
          : undefined,
        new V1_LegendSDLC(origin.groupId, origin.artifactId, origin.versionId),
      );
    }
    throw new UnsupportedOperationError('Unsupported graph origin');
  }

  /**
   * This method helps indexing the graph from graph and dependencies' entities
   * This will produce a _light_ graph with empty unprocesed elements, they are just indexed in the graph
   * and the Pure model context data which can be used to further build the graph
   *
   * There are a few simple analytics we want to do on the graph which does not necessarily
   * require us to build the full-graph, in fact, doing so would be too costly. In those scenarios,
   * we need to build the _light_ graph, hence the existence of this utility method
   *
   * TODO?: do we need to account for system elements?
   */
  async indexLightGraph(
    graph: PureModel,
    entities: Entity[],
    dependencyEntitiesIndex: Map<string, EntitiesWithOrigin>,
    entityFilterFn?: ((entity: Entity) => boolean) | undefined,
    entityProcessorFn?: ((entity: Entity) => Entity) | undefined,
  ): Promise<V1_PureGraphBuilderInput[]> {
    const report = createGraphBuilderReport();

    // build main graph builder input
    const data = new V1_PureModelContextData();
    await V1_entitiesToPureModelContextData(
      entities
        .filter((entity) => {
          // never exclude section index as it could be used for path resolution when building the graph later
          if (entity.classifierPath === CORE_PURE_PATH.SECTION_INDEX) {
            return true;
          }
          if (entityFilterFn) {
            return entityFilterFn(entity);
          }
          return true;
        })
        .map((entity) =>
          entityProcessorFn ? entityProcessorFn(entity) : entity,
        ),
      data,
      this.pluginManager.getPureProtocolProcessorPlugins(),
      this.subtypeInfo,
      this.elementClassifierPathMap,
    );
    const mainGraphBuilderInput: V1_PureGraphBuilderInput[] = [
      {
        model: graph,
        data: V1_indexPureModelContextData(
          report,
          data,
          this.graphBuilderExtensions,
        ),
      },
    ];

    // build dependencies graph builder input
    graph.dependencyManager.initialize(dependencyEntitiesIndex);
    const dependencyGraphDataIndex = new Map<string, V1_PureModelContextData>();
    await Promise.all(
      Array.from(dependencyEntitiesIndex.entries()).map(
        ([dependencyKey, value]) => {
          const projectModelData = new V1_PureModelContextData();
          dependencyGraphDataIndex.set(dependencyKey, projectModelData);
          return V1_entitiesToPureModelContextData(
            value.entities
              .filter((entity) => {
                // never exclude section index as it could be used for path resolution when building the graph later
                if (entity.classifierPath === CORE_PURE_PATH.SECTION_INDEX) {
                  return true;
                }
                if (entityFilterFn) {
                  return entityFilterFn(entity);
                }
                return true;
              })
              .map((entity) =>
                entityProcessorFn ? entityProcessorFn(entity) : entity,
              ),
            projectModelData,
            this.pluginManager.getPureProtocolProcessorPlugins(),
            this.subtypeInfo,
            this.elementClassifierPathMap,
          );
        },
      ),
    );
    const dependencyGraphBuilderInput: V1_PureGraphBuilderInput[] = Array.from(
      dependencyGraphDataIndex.entries(),
    ).map(([dependencyKey, dependencyData]) => ({
      data: V1_indexPureModelContextData(
        report,
        dependencyData,
        this.graphBuilderExtensions,
      ),
      model: graph.dependencyManager.getModel(dependencyKey),
    }));

    // index simplified graph
    const graphBuilderInput = [
      ...dependencyGraphBuilderInput,
      ...mainGraphBuilderInput,
    ];
    await this.initializeAndIndexElements(graph, graphBuilderInput);

    return graphBuilderInput;
  }

  private getFullGraphModelContext(
    graph: PureModel,
    clientVersion: string | undefined,
    options?: { keepSourceInformation?: boolean | undefined } | undefined,
  ): V1_PureModelContext {
    // if options is given we will not use the origin if we want to keep source information
    if (graph.origin && !options?.keepSourceInformation) {
      return this.buildPureModelSDLCPointer(graph.origin, clientVersion);
    }
    return this.getFullGraphModelData(graph, options);
  }

  getFullGraphModelData(
    graph: PureModel,
    options?: { keepSourceInformation?: boolean | undefined } | undefined,
  ): V1_PureModelContextData {
    const contextData1 = this.graphToPureModelContextData(graph, {
      keepSourceInformation: options?.keepSourceInformation,
      excludeUnknown: true,
    });
    const contextData2 = this.getGraphCompileContext(graph);
    contextData1.elements = [
      ...contextData1.elements,
      ...contextData2.elements,
    ];
    const rawDependencyEntities = [
      ...(contextData1.INTERNAL__rawDependencyEntities ?? []),
      ...(contextData2.INTERNAL__rawDependencyEntities ?? []),
    ];
    contextData1.INTERNAL__rawDependencyEntities = rawDependencyEntities.length
      ? rawDependencyEntities
      : undefined;
    return contextData1;
  }

  elementProtocolToEntity = (
    elementProtocol: V1_PackageableElement,
  ): Entity => ({
    path: this.getElementPath(elementProtocol),
    content: V1_serializePackageableElement(
      elementProtocol,
      this.pluginManager.getPureProtocolProcessorPlugins(),
    ),
    classifierPath: this.getElementClassiferPath(elementProtocol),
  });

  pureModelContextDataToEntities = (
    graphProtocol: V1_PureModelContextData,
  ): Entity[] =>
    graphProtocol.elements.map((element) =>
      this.elementProtocolToEntity(element),
    );

  private async entitiesToPureModelContextData(
    entities: Entity[],
  ): Promise<V1_PureModelContextData> {
    const graphData = new V1_PureModelContextData();
    await V1_entitiesToPureModelContextData(
      entities,
      graphData,
      this.pluginManager.getPureProtocolProcessorPlugins(),
      this.subtypeInfo,
      this.elementClassifierPathMap,
    );
    return graphData;
  }

  elementToProtocol = <T extends V1_PackageableElement>(
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

  private getElementPath = (elementProtocol: V1_PackageableElement): string =>
    `${elementProtocol.package}${ENTITY_PATH_DELIMITER}${elementProtocol.name}`;

  private getElementClassiferPath = (
    protocol: V1_PackageableElement,
  ): string => {
    if (
      protocol instanceof V1_INTERNAL__UnknownElement ||
      protocol instanceof V1_INTERNAL__UnknownPackageableElement ||
      protocol instanceof V1_INTERNAL__UnknownFunctionActivator ||
      protocol instanceof V1_INTERNAL__UnknownStore
    ) {
      if (protocol instanceof V1_IngestDefinition) {
        return CORE_PURE_PATH.INGEST_DEFINITION;
      }
      const _type = protocol.content._type;
      const classifierPath = isString(_type)
        ? this.elementClassifierPathMap.get(_type)
        : undefined;
      if (classifierPath) {
        return classifierPath;
      }
      throw new UnsupportedOperationError(
        `Can't get classifier path for element '${protocol.path}': no classifier path mapping available`,
      );
    } else if (protocol instanceof V1_Association) {
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
    } else if (protocol instanceof V1_ExecutionEnvironmentInstance) {
      return CORE_PURE_PATH.EXECUTION_ENVIRONMENT;
    } else if (protocol instanceof V1_Service) {
      return CORE_PURE_PATH.SERVICE;
    } else if (protocol instanceof V1_FileGenerationSpecification) {
      return CORE_PURE_PATH.FILE_GENERATION;
    } else if (protocol instanceof V1_DataElement) {
      return CORE_PURE_PATH.DATA_ELEMENT;
    } else if (protocol instanceof V1_GenerationSpecification) {
      return CORE_PURE_PATH.GENERATION_SPECIFICATION;
    } else if (protocol instanceof V1_SnowflakeApp) {
      return CORE_PURE_PATH.SNOWFLAKE_APP;
    } else if (protocol instanceof V1_SnowflakeM2MUdf) {
      return CORE_PURE_PATH.SNOWFLAKE_M2M_UDF;
    } else if (protocol instanceof V1_HostedService) {
      return CORE_PURE_PATH.HOSTED_SERVICE;
    } else if (protocol instanceof V1_DataProduct) {
      return CORE_PURE_PATH.DATA_PRODUCT;
    } else if (protocol instanceof V1_MemSQLFunction) {
      return CORE_PURE_PATH.MEM_SQL_FUNCTION;
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
    options?:
      | {
          keepSourceInformation?: boolean | undefined;
          excludeUnknown?: boolean | undefined;
        }
      | undefined,
  ): V1_PureModelContextData => {
    const startTime = Date.now();
    const graphData = new V1_PureModelContextData();
    graphData.elements = (
      options?.excludeUnknown ? graph.knownAllOwnElements : graph.allOwnElements
    ).map((element) =>
      this.elementToProtocol(element, {
        keepSourceInformation: options?.keepSourceInformation,
      }),
    );
    this.logService.info(
      LogEvent.create(
        GRAPH_MANAGER_EVENT.TRANSFORM_GRAPH_META_MODEL_TO_PROTOCOL__SUCCESS,
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
    let elements = [...generatedModel.allOwnElements];
    if (dependencyManager.origin instanceof GraphEntities) {
      // If dependency manager holds the original entities we will just use those to save on transforming/serialization
      // of dependency elements. This can further be improved by adding support for PureModelContext composite so engine understands
      // list of pure model context sdlc pointers for dependencies.
      graphData.INTERNAL__rawDependencyEntities =
        dependencyManager.origin.entities;
    } else {
      elements = [...dependencyManager.allOwnElements, ...elements];
    }
    graphData.elements = elements.map((element) =>
      this.elementToProtocol(element),
    );

    this.logService.info(
      LogEvent.create(
        GRAPH_MANAGER_EVENT.COLLECT_GRAPH_COMPILE_CONTEXT__SUCCESS,
      ),
      Date.now() - startTime,
      'ms',
    );
    return graphData;
  };

  async generateLineage(
    lambda: RawLambda,
    mapping: Mapping | undefined,
    runtime: Runtime | undefined,
    graph: PureModel,
    _report?: GraphManagerOperationReport,
  ): Promise<V1_RawLineageModel> {
    const report = _report ?? createGraphManagerOperationReport();
    const stopWatch = new StopWatch();

    const input = this.createLineageInput(
      graph,
      mapping,
      lambda,
      runtime,
      V1_PureGraphManager.DEV_PROTOCOL_VERSION,
    );
    stopWatch.record(GRAPH_MANAGER_EVENT.V1_ENGINE_OPERATION_INPUT__SUCCESS);
    const result = await this.engine.generateLineage(input);
    stopWatch.record(
      GRAPH_MANAGER_EVENT.V1_ENGINE_OPERATION_SERVER_CALL__SUCCESS,
    );

    report.timings = {
      ...Object.fromEntries(stopWatch.records),
      total: stopWatch.elapsed,
    };
    return result;
  }
}
