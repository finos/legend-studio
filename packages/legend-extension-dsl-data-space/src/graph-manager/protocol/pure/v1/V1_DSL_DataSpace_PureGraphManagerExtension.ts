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

import {
  type QueryInfo,
  type AbstractPureGraphManager,
  type PureProtocolProcessorPlugin,
  type MappingModelCoverageAnalysisResult,
  type GraphManagerOperationReport,
  type FunctionAnalysisInfo,
  PureModel,
  V1_PureGraphManager,
  PureClientVersion,
  CoreModel,
  SystemModel,
  V1_Mapping,
  resolvePackagePathAndElementName,
  V1_PureModelContextType,
  V1_PackageableRuntime,
  V1_EngineRuntime,
  V1_Class,
  GRAPH_MANAGER_EVENT,
  V1_buildDatasetSpecification,
  V1_buildModelCoverageAnalysisResult,
  V1_deserializePackageableElement,
  QueryDataSpaceExecutionContextInfo,
  V1_RemoteEngine,
  LegendSDLC,
  PackageableElementPointerType,
  V1_PackageableElementPointer,
  V1_ConcreteFunctionDefinition,
  V1_buildFunctionInfoAnalysis,
} from '@finos/legend-graph';
import type { Entity, ProjectGAVCoordinates } from '@finos/legend-storage';
import {
  type PlainObject,
  ActionState,
  assertErrorThrown,
  filterByType,
  guaranteeNonEmptyString,
  guaranteeNonNullable,
  guaranteeType,
  isNonNullable,
  LogEvent,
  uniq,
} from '@finos/legend-shared';
import {
  DataSpaceSupportCombinedInfo,
  DataSpaceSupportEmail,
} from '../../../../graph/metamodel/pure/model/packageableElements/dataSpace/DSL_DataSpace_DataSpace.js';
import {
  V1_DataSpace,
  V1_DataSpaceExecutionContext,
  V1_DataSpaceSupportCombinedInfo,
  V1_DataSpaceSupportEmail,
  V1_DataSpaceTemplateExecutable,
} from '../../../../graph-manager/protocol/pure/v1/model/packageableElements/dataSpace/V1_DSL_DataSpace_DataSpace.js';
import {
  DataSpaceAnalysisResult,
  DataSpaceDiagramAnalysisResult,
  NormalizedDataSpaceDocumentationEntry,
  DataSpaceExecutableAnalysisResult,
  DataSpaceExecutableTDSResultColumn,
  DataSpaceExecutableTDSResult,
  DataSpaceExecutionContextAnalysisResult,
  DataSpaceServiceExecutableInfo,
  DataSpaceStereotypeInfo,
  DataSpaceTaggedValueInfo,
  DataSpaceClassDocumentationEntry,
  DataSpacePropertyDocumentationEntry,
  DataSpaceEnumerationDocumentationEntry,
  DataSpaceBasicDocumentationEntry,
  DataSpaceAssociationDocumentationEntry,
  DataSpaceMultiExecutionServiceExecutableInfo,
  DataSpaceMultiExecutionServiceKeyedExecutableInfo,
  DataSpaceTemplateExecutableInfo,
  DataSpaceFunctionPointerExecutableInfo,
  DataSpaceExecutionContextRuntimeMetadata,
} from '../../../action/analytics/DataSpaceAnalysis.js';
import { DSL_DataSpace_PureGraphManagerExtension } from '../DSL_DataSpace_PureGraphManagerExtension.js';
import {
  type V1_DataSpaceAnalysisResult,
  V1_DataSpaceAssociationDocumentationEntry,
  V1_DataSpaceClassDocumentationEntry,
  V1_DataSpaceEnumerationDocumentationEntry,
  V1_DataSpaceExecutableTDSResult,
  V1_DataSpaceServiceExecutableInfo,
  V1_deserializeDataSpaceAnalysisResult,
  V1_DataSpaceMultiExecutionServiceExecutableInfo,
  V1_DataSpaceTemplateExecutableInfo,
  V1_DataSpaceFunctionPointerExecutableInfo,
} from './engine/analytics/V1_DataSpaceAnalysis.js';
import { getDiagram } from '@finos/legend-extension-dsl-diagram/graph';
import { resolveVersion } from '@finos/legend-server-depot';

const ANALYZE_DATA_SPACE_TRACE = 'analyze data space';
const TEMPORARY__TDS_SAMPLE_VALUES__DELIMETER = '-- e.g.';

export class V1_DSL_DataSpace_PureGraphManagerExtension extends DSL_DataSpace_PureGraphManagerExtension {
  declare graphManager: V1_PureGraphManager;

  constructor(graphManager: AbstractPureGraphManager) {
    super(graphManager);
    this.graphManager = guaranteeType(graphManager, V1_PureGraphManager);
  }

  getSupportedProtocolVersion(): string {
    return PureClientVersion.V1_0_0;
  }

  getDataSpaceProtocolFromEntity(dataSpaceEntity: Entity): V1_DataSpace {
    return guaranteeType(
      V1_deserializePackageableElement(
        dataSpaceEntity.content,
        this.graphManager.pluginManager.getPureProtocolProcessorPlugins(),
      ),
      V1_DataSpace,
    );
  }

  IsTemplateQueryIdValid(dataSpaceEntity: Entity, id: string): boolean {
    const dataSpaceProtocol =
      this.getDataSpaceProtocolFromEntity(dataSpaceEntity);
    return !dataSpaceProtocol.executables
      ?.filter(filterByType(V1_DataSpaceTemplateExecutable))
      .map((et) => et.id)
      .includes(id);
  }

  async addNewExecutableToDataSpaceEntity(
    dataSpaceEntity: Entity,
    currentQuery: QueryInfo,
    executable: {
      id: string;
      title: string;
      description?: string;
    },
  ): Promise<Entity> {
    const content = currentQuery.content;
    const rawLambda =
      await this.graphManager.engine.transformCodeToLambda(content);
    const dataSpaceProtocol =
      this.getDataSpaceProtocolFromEntity(dataSpaceEntity);
    const dataSpaceTemplateExecutable = new V1_DataSpaceTemplateExecutable();
    dataSpaceTemplateExecutable.id = executable.id;
    dataSpaceTemplateExecutable.title = executable.title;
    dataSpaceTemplateExecutable.description = executable.description;
    const execContext = currentQuery.executionContext;

    if (execContext instanceof QueryDataSpaceExecutionContextInfo) {
      dataSpaceTemplateExecutable.executionContextKey =
        execContext.executionKey;
    } else if (currentQuery.mapping && currentQuery.runtime) {
      dataSpaceTemplateExecutable.executionContextKey = guaranteeNonNullable(
        dataSpaceProtocol.executionContexts.filter(
          (ec) =>
            ec.mapping.path === currentQuery.mapping &&
            ec.defaultRuntime.path === currentQuery.runtime,
        )[0]?.name,
        'can`t find a corresponding executatin key based on query`s mapping and runtime in dataspace',
      );
    }

    dataSpaceTemplateExecutable.query = rawLambda;
    dataSpaceProtocol.executables = dataSpaceProtocol.executables
      ? [...dataSpaceProtocol.executables, dataSpaceTemplateExecutable]
      : [dataSpaceTemplateExecutable];
    return this.graphManager.elementProtocolToEntity(dataSpaceProtocol);
  }

  async analyzeDataSpace(
    dataSpacePath: string,
    entitiesRetriever: () => Promise<Entity[]>,
    cacheRetriever?: () => Promise<PlainObject<DataSpaceAnalysisResult>>,
    actionState?: ActionState,
  ): Promise<DataSpaceAnalysisResult> {
    const cacheResult = cacheRetriever
      ? await this.fetchDataSpaceAnalysisFromCache(cacheRetriever, actionState)
      : undefined;
    // TODO: improve abstraction so that we do not need to access the engine server client directly
    const engineClient = guaranteeType(
      this.graphManager.engine,
      V1_RemoteEngine,
      'analyzeDataSpace is only supported by remote engine',
    ).getEngineServerClient();
    let analysisResult: PlainObject<V1_DataSpaceAnalysisResult>;
    if (cacheResult) {
      analysisResult = cacheResult;
    } else {
      actionState?.setMessage('Fetching project entities and dependencies...');
      const entities = await entitiesRetriever();
      actionState?.setMessage('Analyzing data space...');
      analysisResult = await engineClient.postWithTracing<
        PlainObject<V1_DataSpaceAnalysisResult>
      >(
        engineClient.getTraceData(ANALYZE_DATA_SPACE_TRACE),
        `${engineClient._pure()}/analytics/dataSpace/render`,
        {
          clientVersion: V1_PureGraphManager.DEV_PROTOCOL_VERSION,
          dataSpace: dataSpacePath,
          model: {
            _type: V1_PureModelContextType.DATA,
            elements: entities.map((entity) => entity.content),
          },
        },
        {},
        undefined,
        undefined,
        { enableCompression: true },
      );
    }
    return this.buildDataSpaceAnalytics(
      analysisResult,
      this.graphManager.pluginManager.getPureProtocolProcessorPlugins(),
    );
  }

  retrieveExecutionContextFromTemplateQueryId(
    dataSpaceAnalysisResult: PlainObject<V1_DataSpaceAnalysisResult>,
    templateQueryId: string,
    plugins: PureProtocolProcessorPlugin[],
  ): string | undefined {
    const analysisResult = V1_deserializeDataSpaceAnalysisResult(
      dataSpaceAnalysisResult,
      plugins,
    );
    let execContext = undefined;
    const info = analysisResult.executables.find(
      (ex) => ex.info?.id === templateQueryId,
    )?.info;
    if (info) {
      execContext =
        info.executionContextKey ?? analysisResult.defaultExecutionContext;
    }
    return execContext;
  }

  async analyzeDataSpaceCoverage(
    dataSpacePath: string,
    entitiesRetriever: () => Promise<Entity[]>,
    entitiesWithClassifierRetriever: () => Promise<
      [PlainObject<Entity>[], PlainObject<Entity>[]]
    >,
    cacheRetriever?: () => Promise<PlainObject<DataSpaceAnalysisResult>>,
    actionState?: ActionState,
    graphReport?: GraphManagerOperationReport | undefined,
    pureGraph?: PureModel | undefined,
    executionContext?: string | undefined,
    mappingPath?: string | undefined,
    projectInfo?: ProjectGAVCoordinates,
    templateQueryId?: string,
  ): Promise<DataSpaceAnalysisResult> {
    const cacheResult = cacheRetriever
      ? await this.fetchDataSpaceAnalysisFromCache(cacheRetriever, actionState)
      : undefined;
    const engineClient = guaranteeType(
      this.graphManager.engine,
      V1_RemoteEngine,
      'analyzeDataSpaceCoverage is only supported by remote engine',
    ).getEngineServerClient();
    let analysisResult: PlainObject<V1_DataSpaceAnalysisResult>;
    let cachedAnalysisResult;
    if (cacheResult) {
      cachedAnalysisResult = V1_deserializeDataSpaceAnalysisResult(
        cacheResult,
        this.graphManager.pluginManager.getPureProtocolProcessorPlugins(),
      );
    }
    if (
      cacheResult &&
      cachedAnalysisResult?.executionContexts.every(
        (e) =>
          e.mappingModelCoverageAnalysisResult?.model !== undefined ||
          cachedAnalysisResult.mappingToMappingCoverageResult?.get(e.mapping)
            ?.model !== undefined,
      )
    ) {
      analysisResult = cacheResult;
    } else {
      actionState?.setMessage('Fetching project entities and dependencies...');
      const entities = await entitiesRetriever();
      actionState?.setMessage('Analyzing data space...');
      analysisResult = await engineClient.postWithTracing<
        PlainObject<V1_DataSpaceAnalysisResult>
      >(
        engineClient.getTraceData(ANALYZE_DATA_SPACE_TRACE),
        `${engineClient._pure()}/analytics/dataSpace/coverage`,
        {
          clientVersion: V1_PureGraphManager.DEV_PROTOCOL_VERSION,
          dataSpace: dataSpacePath,
          model: {
            _type: V1_PureModelContextType.DATA,
            elements: entities.map((entity) => entity.content),
          },
        },
        {},
        undefined,
        undefined,
        { enableCompression: true },
      );
    }
    const plugins =
      this.graphManager.pluginManager.getPureProtocolProcessorPlugins();
    return this.buildDataSpaceAnalytics(
      analysisResult,
      plugins,
      graphReport,
      pureGraph,
      executionContext
        ? executionContext
        : templateQueryId
          ? this.retrieveExecutionContextFromTemplateQueryId(
              analysisResult,
              templateQueryId,
              plugins,
            )
          : undefined,
      mappingPath,
      projectInfo,
      entitiesWithClassifierRetriever,
    );
  }

  async retrieveDataSpaceAnalysisFromCache(
    cacheRetriever: () => Promise<PlainObject<DataSpaceAnalysisResult>>,
    actionState?: ActionState,
  ): Promise<DataSpaceAnalysisResult | undefined> {
    const cacheResult = await this.fetchDataSpaceAnalysisFromCache(
      cacheRetriever,
      actionState,
    );
    return cacheResult
      ? this.buildDataSpaceAnalytics(
          cacheResult,
          this.graphManager.pluginManager.getPureProtocolProcessorPlugins(),
        )
      : undefined;
  }

  private async fetchDataSpaceAnalysisFromCache(
    cacheRetriever: () => Promise<PlainObject<DataSpaceAnalysisResult>>,
    actionState?: ActionState,
  ): Promise<PlainObject<V1_DataSpaceAnalysisResult> | undefined> {
    let cacheResult: PlainObject<V1_DataSpaceAnalysisResult> | undefined;
    try {
      actionState?.setMessage(
        'Fetching data space analysis result from cache...',
      );
      cacheResult = await cacheRetriever();
    } catch (error) {
      assertErrorThrown(error);
      this.graphManager.logService.warn(
        LogEvent.create(GRAPH_MANAGER_EVENT.CACHE_MANAGER_FAILURE),
        `Can't fetch data space analysis result cache: ${error.message}`,
      );
    }
    return cacheResult;
  }

  // build function analysis info by fetching functions within this project from metadata when building minimal graph
  async processFunctionForMinimalGraph(
    entitiesWithClassifierRetriever: () => Promise<
      [PlainObject<Entity>[], PlainObject<Entity>[]]
    >,
    graph: PureModel,
    dataSpaceAnalysisResult: DataSpaceAnalysisResult,
    plugins: PureProtocolProcessorPlugin[],
  ): Promise<void> {
    const [functionEntities, dependencyFunctionEntities]: [
      PlainObject<Entity>[],
      PlainObject<Entity>[],
    ] = await entitiesWithClassifierRetriever();
    const functionProtocols = functionEntities.map((func) =>
      guaranteeType(
        V1_deserializePackageableElement(
          (func.entity as Entity).content,
          plugins,
        ),
        V1_ConcreteFunctionDefinition,
      ),
    );
    const dependencyFunctionProtocols = dependencyFunctionEntities.map((func) =>
      guaranteeType(
        V1_deserializePackageableElement(
          (func.entity as Entity).content,
          plugins,
        ),
        V1_ConcreteFunctionDefinition,
      ),
    );
    const functionInfos = V1_buildFunctionInfoAnalysis(
      functionProtocols,
      graph,
    );
    const dependencyFunctionInfos = V1_buildFunctionInfoAnalysis(
      dependencyFunctionProtocols,
      graph,
    );
    if (functionInfos.length > 0) {
      const functionInfoMap = new Map<string, FunctionAnalysisInfo>();
      functionInfos.forEach((funcInfo) => {
        functionInfoMap.set(funcInfo.functionPath, funcInfo);
      });
      dataSpaceAnalysisResult.functionInfos = functionInfoMap;
    }
    if (dependencyFunctionInfos.length > 0) {
      const dependencyFunctionInfoMap = new Map<string, FunctionAnalysisInfo>();
      functionInfos.forEach((funcInfo) => {
        dependencyFunctionInfoMap.set(funcInfo.functionPath, funcInfo);
      });
      dataSpaceAnalysisResult.dependencyFunctionInfos =
        dependencyFunctionInfoMap;
    }
  }

  async buildDataSpaceAnalytics(
    analytics: PlainObject<V1_DataSpaceAnalysisResult>,
    plugins: PureProtocolProcessorPlugin[],
    graphReport?: GraphManagerOperationReport | undefined,
    pureGraph?: PureModel | undefined,
    executionContext?: string | undefined,
    mappingPath?: string | undefined,
    projectInfo?: ProjectGAVCoordinates,
    entitiesWithClassifierRetriever?: () => Promise<
      [PlainObject<Entity>[], PlainObject<Entity>[]]
    >,
  ): Promise<DataSpaceAnalysisResult> {
    const analysisResult = V1_deserializeDataSpaceAnalysisResult(
      analytics,
      plugins,
    );
    const result = new DataSpaceAnalysisResult();
    result.name = analysisResult.name;
    result.package = analysisResult.package;
    result.path = analysisResult.path;
    result.title = analysisResult.title;
    result.description = analysisResult.description;

    result.taggedValues = analysisResult.taggedValues.map((taggedValue) => {
      const info = new DataSpaceTaggedValueInfo();
      info.profile = taggedValue.profile;
      info.tag = taggedValue.tag;
      info.value = taggedValue.value;
      return info;
    });
    result.stereotypes = analysisResult.stereotypes.map((stereotype) => {
      const info = new DataSpaceStereotypeInfo();
      info.profile = stereotype.profile;
      info.value = stereotype.value;
      return info;
    });

    if (analysisResult.supportInfo) {
      if (analysisResult.supportInfo instanceof V1_DataSpaceSupportEmail) {
        const supportEmail = new DataSpaceSupportEmail();
        supportEmail.documentationUrl =
          analysisResult.supportInfo.documentationUrl;
        supportEmail.address = guaranteeNonEmptyString(
          analysisResult.supportInfo.address,
          `Data space support email 'address' field is missing or empty`,
        );
        result.supportInfo = supportEmail;
      } else if (
        analysisResult.supportInfo instanceof V1_DataSpaceSupportCombinedInfo
      ) {
        const combinedInfo = new DataSpaceSupportCombinedInfo();
        combinedInfo.documentationUrl =
          analysisResult.supportInfo.documentationUrl;
        combinedInfo.website = analysisResult.supportInfo.website;
        combinedInfo.faqUrl = analysisResult.supportInfo.faqUrl;
        combinedInfo.supportUrl = analysisResult.supportInfo.supportUrl;
        combinedInfo.emails = analysisResult.supportInfo.emails;
        result.supportInfo = combinedInfo;
      }
      // NOTE: we will relax the check and not throw here for unknown support info type
    }

    let graphEntities;
    let graph: PureModel;
    let minialGraph = false;
    if (pureGraph) {
      graph = pureGraph;
    } else {
      // create an empty graph
      const extensionElementClasses =
        this.graphManager.pluginManager.getPureGraphPlugins();
      const systemModel = new SystemModel(extensionElementClasses);
      const coreModel = new CoreModel(extensionElementClasses);
      await this.graphManager.buildSystem(
        coreModel,
        systemModel,
        ActionState.create(),
        {},
      );
      systemModel.initializeAutoImports();
      graph = new PureModel(
        coreModel,
        systemModel,
        this.graphManager.pluginManager.getPureGraphPlugins(),
      );
    }
    // Create dummy mappings and runtimes
    // TODO?: these stubbed mappings and runtimes are not really useful that useful, so either we should
    // simplify the model here or potentially refactor the backend analytics endpoint to return these as model
    const mappingModels = uniq(
      analysisResult.executionContexts.map((context) => context.mapping),
    ).map((path) => {
      const mapping = new V1_Mapping();
      const [packagePath, name] = resolvePackagePathAndElementName(path);
      mapping.package = packagePath;
      mapping.name = name;
      return mapping;
    });
    const runtimeModels = uniq(
      analysisResult.executionContexts
        .map((context) => context.defaultRuntime)
        .concat(
          analysisResult.executionContexts.flatMap(
            (val) => val.compatibleRuntimes,
          ),
        ),
    ).map((path) => {
      const runtime = new V1_PackageableRuntime();
      const [packagePath, name] = resolvePackagePathAndElementName(path);
      runtime.package = packagePath;
      runtime.name = name;
      runtime.runtimeValue = new V1_EngineRuntime();
      return runtime;
    });

    // The DataSpace entity is excluded from AnalyticsResult.Json to reduce the JSON size
    // because all its information can be found in V1_DataSpaceAnalysisResult.
    // Therefore, we are building a simple v1_DataSpace entity based on V1_DataSpaceAnalysisResult.
    const dataspaceEntity = new V1_DataSpace();
    dataspaceEntity.name = analysisResult.name;
    dataspaceEntity.package = analysisResult.package;
    dataspaceEntity.supportInfo = analysisResult.supportInfo;
    dataspaceEntity.executionContexts = analysisResult.executionContexts.map(
      (execContext) => {
        const contextProtocol = new V1_DataSpaceExecutionContext();
        contextProtocol.name = execContext.name;
        contextProtocol.title = execContext.title;
        contextProtocol.description = execContext.description;
        contextProtocol.mapping = new V1_PackageableElementPointer(
          PackageableElementPointerType.MAPPING,
          execContext.mapping,
        );
        contextProtocol.defaultRuntime = new V1_PackageableElementPointer(
          PackageableElementPointerType.RUNTIME,
          execContext.defaultRuntime,
        );
        return contextProtocol;
      },
    );
    dataspaceEntity.defaultExecutionContext =
      analysisResult.defaultExecutionContext;
    dataspaceEntity.title = analysisResult.title;
    dataspaceEntity.description = analysisResult.description;

    const resolvedMappingPath =
      mappingPath ??
      analysisResult.executionContexts.find(
        (value) =>
          value.name ===
          (executionContext ?? analysisResult.defaultExecutionContext),
      )?.mapping;
    let pmcd;
    if (resolvedMappingPath) {
      const mappingModelCoverageAnalysisResult =
        analysisResult.mappingToMappingCoverageResult?.get(resolvedMappingPath);
      pmcd = mappingModelCoverageAnalysisResult?.model;
    }
    if (pmcd && projectInfo) {
      graphEntities = pmcd.elements
        .concat(mappingModels)
        .concat(runtimeModels)
        .concat(dataspaceEntity)
        // NOTE: if an element could be found in the graph already it means it comes from system
        // so we could rid of it
        .filter((el) => !graph.getNullableElement(el.path, false))
        .map((el) => this.graphManager.elementProtocolToEntity(el));
      await this.graphManager.buildGraph(
        graph,
        graphEntities,
        ActionState.create(),
        {
          origin: new LegendSDLC(
            projectInfo.groupId,
            projectInfo.artifactId,
            resolveVersion(projectInfo.versionId),
          ),
        },
        graphReport,
      );
      if (entitiesWithClassifierRetriever) {
        try {
          await this.processFunctionForMinimalGraph(
            entitiesWithClassifierRetriever,
            graph,
            result,
            plugins,
          );
        } catch {
          //do nothing
        }
      }
      minialGraph = true;
    } else {
      const elements = analysisResult.model.elements
        // NOTE: this is a temporary hack to fix a problem with data space analytics
        // where the classes for properties are not properly surveyed
        // We need to wait for the actual fix in backend to be merged and released
        // See https://github.com/finos/legend-engine/pull/836
        .concat(
          uniq(
            analysisResult.model.elements.flatMap((element) => {
              if (element instanceof V1_Class) {
                return element.derivedProperties
                  .map((prop) => prop.returnType)
                  .concat(element.properties.map((prop) => prop.type));
              }
              return [];
            }),
          )
            // make sure to not include types already returned by the analysis
            .filter(
              (path) =>
                !analysisResult.model.elements
                  .map((el) => el.path)
                  .includes(path),
            )
            .map((path) => {
              const [pkgPath, name] = resolvePackagePathAndElementName(path);
              if (!pkgPath) {
                // exclude package-less elements (i.e. primitive types)
                return undefined;
              }
              const _class = new V1_Class();
              _class.name = name;
              _class.package = pkgPath;
              return _class;
            })
            .filter(isNonNullable),
        )
        .concat(mappingModels)
        .concat(runtimeModels);
      const alreadyContainsDataspace = elements.find(
        (e) => e.path === dataspaceEntity.path,
      );
      let allElements = elements;
      if (!alreadyContainsDataspace) {
        allElements = elements.concat(dataspaceEntity);
      }
      // prepare the model context data
      graphEntities = allElements
        // NOTE: if an element could be found in the graph already it means it comes from system
        // so we could rid of it
        .filter((el) => !graph.getNullableElement(el.path, false))
        .map((el) => this.graphManager.elementProtocolToEntity(el));

      await this.graphManager.buildGraph(
        graph,
        graphEntities,
        ActionState.create(),
      );
    }

    const mappingToMappingCoverageResult = new Map<
      string,
      MappingModelCoverageAnalysisResult
    >();
    if (analysisResult.mappingToMappingCoverageResult) {
      Array.from(analysisResult.mappingToMappingCoverageResult).forEach(
        ([key, value]) => {
          mappingToMappingCoverageResult.set(
            key,
            V1_buildModelCoverageAnalysisResult(
              value,
              this.graphManager,
              graph.getMapping(key),
            ),
          );
        },
      );
    }

    // execution context
    result.executionContextsIndex = new Map<
      string,
      DataSpaceExecutionContextAnalysisResult
    >();
    analysisResult.executionContexts.forEach((context) => {
      const contextAnalysisResult =
        new DataSpaceExecutionContextAnalysisResult();
      contextAnalysisResult.name = context.name;
      contextAnalysisResult.title = context.title;
      contextAnalysisResult.description = context.description;
      contextAnalysisResult.mapping = graph.getMapping(context.mapping);
      contextAnalysisResult.defaultRuntime = graph.getRuntime(
        context.defaultRuntime,
      );
      if (context.runtimeMetadata) {
        const metadata = new DataSpaceExecutionContextRuntimeMetadata();
        if (context.runtimeMetadata.storePath) {
          metadata.storePath = context.runtimeMetadata.storePath;
        }
        if (context.runtimeMetadata.connectionPath) {
          metadata.connectionPath = context.runtimeMetadata.connectionPath;
        }
        if (context.runtimeMetadata.connectionType) {
          metadata.connectionType = context.runtimeMetadata.connectionType;
        }
        contextAnalysisResult.runtimeMetadata = metadata;
      }

      // for handling deprecated mappingModelCoverageAnalysisResult
      if (context.mappingModelCoverageAnalysisResult) {
        mappingToMappingCoverageResult.set(
          context.mapping,
          V1_buildModelCoverageAnalysisResult(
            context.mappingModelCoverageAnalysisResult,
            this.graphManager,
            contextAnalysisResult.mapping,
          ),
        );
      }

      contextAnalysisResult.compatibleRuntimes = context.compatibleRuntimes.map(
        (runtime) => graph.getRuntime(runtime),
      );
      contextAnalysisResult.datasets = context.datasets.map((dataset) =>
        V1_buildDatasetSpecification(dataset, plugins),
      );
      result.executionContextsIndex.set(
        contextAnalysisResult.name,
        contextAnalysisResult,
      );
    });
    result.defaultExecutionContext = guaranteeNonNullable(
      result.executionContextsIndex.get(analysisResult.defaultExecutionContext),
    );

    // elements documentation
    result.elementDocs = analysisResult.elementDocs.flatMap((docEntry) => {
      const entries: NormalizedDataSpaceDocumentationEntry[] = [];
      if (docEntry instanceof V1_DataSpaceClassDocumentationEntry) {
        const classData = new DataSpaceClassDocumentationEntry();
        classData.name = docEntry.name;
        classData.docs = docEntry.docs;
        classData.path = docEntry.path;
        classData.milestoning = docEntry.milestoning;
        entries.push(
          new NormalizedDataSpaceDocumentationEntry(
            docEntry.name,
            docEntry.docs.join('\n').trim(),
            classData,
            classData,
          ),
        );

        docEntry.properties.forEach((property) => {
          const propertyData = new DataSpacePropertyDocumentationEntry();
          propertyData.name = property.name;
          propertyData.docs = property.docs;
          propertyData.type = property.type;
          propertyData.milestoning = property.milestoning;
          propertyData.multiplicity = property.multiplicity
            ? graph.getMultiplicity(
                property.multiplicity.lowerBound,
                property.multiplicity.upperBound,
              )
            : undefined;
          classData.properties.push(propertyData);
          entries.push(
            new NormalizedDataSpaceDocumentationEntry(
              property.name,
              property.docs.join('\n').trim(),
              classData,
              propertyData,
            ),
          );
        });
      } else if (
        docEntry instanceof V1_DataSpaceEnumerationDocumentationEntry
      ) {
        const enumerationData = new DataSpaceEnumerationDocumentationEntry();
        enumerationData.name = docEntry.name;
        enumerationData.docs = docEntry.docs;
        enumerationData.path = docEntry.path;
        entries.push(
          new NormalizedDataSpaceDocumentationEntry(
            docEntry.name,
            docEntry.docs.join('\n').trim(),
            enumerationData,
            enumerationData,
          ),
        );
        docEntry.enumValues.forEach((enumValue) => {
          const enumData = new DataSpaceBasicDocumentationEntry();
          enumData.name = enumValue.name;
          enumData.docs = enumValue.docs;
          enumerationData.enumValues.push(enumData);
          entries.push(
            new NormalizedDataSpaceDocumentationEntry(
              enumValue.name,
              enumValue.docs.join('\n').trim(),
              enumerationData,
              enumData,
            ),
          );
        });
      } else if (
        docEntry instanceof V1_DataSpaceAssociationDocumentationEntry
      ) {
        const associationData = new DataSpaceAssociationDocumentationEntry();
        associationData.name = docEntry.name;
        associationData.docs = docEntry.docs;
        associationData.path = docEntry.path;
        entries.push(
          new NormalizedDataSpaceDocumentationEntry(
            docEntry.name,
            docEntry.docs.join('\n').trim(),
            associationData,
            associationData,
          ),
        );
        docEntry.properties.forEach((property) => {
          const propertyData = new DataSpacePropertyDocumentationEntry();
          propertyData.name = property.name;
          propertyData.docs = property.docs;
          propertyData.type = property.type;
          propertyData.milestoning = property.milestoning;
          propertyData.multiplicity = property.multiplicity
            ? graph.getMultiplicity(
                property.multiplicity.lowerBound,
                property.multiplicity.upperBound,
              )
            : undefined;
          associationData.properties.push(propertyData);
          entries.push(
            new NormalizedDataSpaceDocumentationEntry(
              property.name,
              property.docs.join('\n'),
              associationData,
              propertyData,
            ),
          );
        });
      }
      return entries;
    });

    // diagrams
    result.diagrams = (minialGraph ? [] : analysisResult.diagrams).map(
      (diagramProtocol) => {
        const diagram = new DataSpaceDiagramAnalysisResult();
        diagram.title = diagramProtocol.title;
        diagram.description = diagramProtocol.description;
        diagram.diagram = getDiagram(diagramProtocol.diagram, graph);
        return diagram;
      },
    );

    // executables
    result.executables = analysisResult.executables.map(
      (executableProtocol) => {
        const executable = new DataSpaceExecutableAnalysisResult();
        executable.title = executableProtocol.title;
        executable.description = executableProtocol.description;
        if (executableProtocol.executable) {
          executable.executable = executableProtocol.executable;
        }
        if (
          executableProtocol.info instanceof V1_DataSpaceTemplateExecutableInfo
        ) {
          const templateExecutableInfo = new DataSpaceTemplateExecutableInfo();
          if (executableProtocol.info.id) {
            templateExecutableInfo.id = executableProtocol.info.id;
          }
          if (executableProtocol.info.executionContextKey) {
            templateExecutableInfo.executionContextKey =
              executableProtocol.info.executionContextKey;
          }
          templateExecutableInfo.query = executableProtocol.info.query;
          executable.info = templateExecutableInfo;
        } else if (
          executableProtocol.info instanceof
          V1_DataSpaceFunctionPointerExecutableInfo
        ) {
          const templateExecutableInfo =
            new DataSpaceFunctionPointerExecutableInfo();
          if (executableProtocol.info.id) {
            templateExecutableInfo.id = executableProtocol.info.id;
          }
          if (executableProtocol.info.executionContextKey) {
            templateExecutableInfo.executionContextKey =
              executableProtocol.info.executionContextKey;
          }
          templateExecutableInfo.function = executableProtocol.info.function;
          templateExecutableInfo.query = executableProtocol.info.query;
          executable.info = templateExecutableInfo;
        } else if (
          executableProtocol.info instanceof V1_DataSpaceServiceExecutableInfo
        ) {
          const serviceExecutableInfo = new DataSpaceServiceExecutableInfo();
          serviceExecutableInfo.query = executableProtocol.info.query;
          if (executableProtocol.info.id) {
            serviceExecutableInfo.id = executableProtocol.info.id;
          }
          if (executableProtocol.info.executionContextKey) {
            serviceExecutableInfo.executionContextKey =
              executableProtocol.info.executionContextKey;
          }
          serviceExecutableInfo.pattern = executableProtocol.info.pattern;
          serviceExecutableInfo.mapping = executableProtocol.info.mapping;
          serviceExecutableInfo.runtime = executableProtocol.info.runtime;
          executable.info = serviceExecutableInfo;
          serviceExecutableInfo.datasets = serviceExecutableInfo.datasets.map(
            (dataset) => V1_buildDatasetSpecification(dataset, plugins),
          );
        } else if (
          executableProtocol.info instanceof
          V1_DataSpaceMultiExecutionServiceExecutableInfo
        ) {
          const multiExecutionServiceExecutableInfo =
            new DataSpaceMultiExecutionServiceExecutableInfo();
          multiExecutionServiceExecutableInfo.keyedExecutableInfos =
            executableProtocol.info.keyedExecutableInfos.map((info) => {
              const keyedExecutableInfo =
                new DataSpaceMultiExecutionServiceKeyedExecutableInfo();
              keyedExecutableInfo.key = info.key;
              keyedExecutableInfo.mapping = info.mapping;
              keyedExecutableInfo.runtime = info.runtime;
              keyedExecutableInfo.datasets = info.datasets.map((dataset) =>
                V1_buildDatasetSpecification(dataset, plugins),
              );
              return keyedExecutableInfo;
            });
          multiExecutionServiceExecutableInfo.query =
            executableProtocol.info.query;
          multiExecutionServiceExecutableInfo.pattern =
            executableProtocol.info.pattern;
          if (executableProtocol.info.id) {
            multiExecutionServiceExecutableInfo.id = executableProtocol.info.id;
          }
          if (executableProtocol.info.executionContextKey) {
            multiExecutionServiceExecutableInfo.executionContextKey =
              executableProtocol.info.executionContextKey;
          }
          executable.info = multiExecutionServiceExecutableInfo;
        }
        if (
          executableProtocol.result instanceof V1_DataSpaceExecutableTDSResult
        ) {
          const tdsResult = new DataSpaceExecutableTDSResult();
          tdsResult.columns = executableProtocol.result.columns.map(
            (tdsColumn) => {
              const column = new DataSpaceExecutableTDSResultColumn();
              column.name = tdsColumn.name;
              column.type = tdsColumn.type;
              column.relationalType = tdsColumn.relationalType;
              column.documentation = tdsColumn.documentation;
              if (
                tdsColumn.documentation?.includes(
                  TEMPORARY__TDS_SAMPLE_VALUES__DELIMETER,
                )
              ) {
                column.documentation = tdsColumn.documentation
                  .substring(
                    0,
                    tdsColumn.documentation.indexOf(
                      TEMPORARY__TDS_SAMPLE_VALUES__DELIMETER,
                    ),
                  )
                  .trim();
                column.sampleValues = tdsColumn.documentation
                  .substring(
                    tdsColumn.documentation.indexOf(
                      TEMPORARY__TDS_SAMPLE_VALUES__DELIMETER,
                    ) + TEMPORARY__TDS_SAMPLE_VALUES__DELIMETER.length,
                  )
                  .trim();
              }
              return column;
            },
          );
          executable.result = tdsResult;
        }
        return executable;
      },
    );

    result.mappingToMappingCoverageResult = mappingToMappingCoverageResult;

    return result;
  }
}
