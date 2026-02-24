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
  GenericLegendApplicationStore,
  NavigationZone,
} from '@finos/legend-application';
import {
  type GraphManagerState,
  type V1_DataProduct,
  type V1_DataProductDiagram,
  type V1_EngineServerClient,
  type V1_EntitlementsDataProductDetails,
  type V1_EntitlementsDataProductOrigin,
  type V1_PureModelContext,
  PureClientVersion,
  V1_AdHocDeploymentDataProductOrigin,
  type V1_NativeModelAccessInfo,
  V1_DATA_PRODUCT_ELEMENT_PROTOCOL_TYPE,
  V1_DataProductArtifact,
  V1_LegendSDLC,
  V1_ModelAccessPointGroup,
  V1_Protocol,
  V1_PureGraphManager,
  V1_PureModelContextPointer,
  V1_SdlcDeploymentDataProductOrigin,
  type V1_SampleQuery,
  V1_Mapping,
  V1_PackageableRuntime,
  V1_EngineRuntime,
  resolvePackagePathAndElementName,
  type V1_DiagramInfo,
  type V1_PackageableElement,
  V1_ModelAccessPointGroupInfo,
  V1_ServiceExecutableInfo,
  V1_MultiExecutionServiceExecutableInfo,
  GraphDataWithOrigin,
  LegendSDLC,
} from '@finos/legend-graph';
import { action, computed, flow, makeObservable, observable } from 'mobx';
import { BaseViewerState } from '../BaseViewerState.js';
import { DataProductLayoutState } from '../BaseLayoutState.js';
import { DATA_PRODUCT_VIEWER_SECTION } from '../ProductViewerNavigation.js';
import {
  ActionState,
  assertErrorThrown,
  guaranteeType,
  type GeneratorFn,
  type PlainObject,
  type UserSearchService,
  LogEvent,
  uniq,
  isNonNullable,
} from '@finos/legend-shared';
import { DataProductAPGState } from './DataProductAPGState.js';
import type { DataProductConfig } from './DataProductConfig.js';
import {
  StoredFileGeneration,
  type ProjectGAVCoordinates,
} from '@finos/legend-storage';
import {
  type DepotServerClient,
  resolveVersion,
  StoreProjectData,
} from '@finos/legend-server-depot';
import { DataProductSqlPlaygroundPanelState } from './DataProductSqlPlaygroundPanelState.js';
import { DataProductViewerModelsDocumentationState } from './DataProductModelsDocumentationState.js';
import { DataProductDocumentationState } from './DataProductDocumentationState.js';
import {
  getDiagram,
  DiagramAnalysisResult,
  type Diagram,
} from '@finos/legend-extension-dsl-diagram';
import type { ViewerModelsDocumentationState } from '@finos/legend-lego/model-documentation';
import { DataProductViewerDiagramViewerState } from './DataProductViewerDiagramViewerState.js';
import type { RegistryServerClient } from '@finos/legend-server-marketplace';
import { DataAccessState } from '@finos/legend-query-builder';

export class DataProductViewerState extends BaseViewerState<
  V1_DataProduct,
  DataProductLayoutState
> {
  readonly engineServerClient: V1_EngineServerClient;
  readonly depotServerClient: DepotServerClient;
  readonly registryServerClient?: RegistryServerClient | undefined;
  readonly graphManagerState: GraphManagerState;
  readonly apgStates: DataProductAPGState[];
  readonly userSearchService: UserSearchService | undefined;
  readonly dataProductConfig: DataProductConfig | undefined;
  readonly projectGAV: ProjectGAVCoordinates | undefined;
  readonly dataProductSqlPlaygroundState: DataProductSqlPlaygroundPanelState;
  modelsDocumentationState: ViewerModelsDocumentationState | undefined;
  nativeModelAccessDocumentationState:
    | DataProductDocumentationState
    | undefined;
  modelAccessPointGroupDiagramViewerState:
    | DataProductViewerDiagramViewerState
    | undefined;
  nativeModelAccessDiagramViewerState:
    | DataProductViewerDiagramViewerState
    | undefined;
  dataProductArtifact: V1_DataProductArtifact | undefined;
  sampleQueryDataAccessStateIndex = new Map<V1_SampleQuery, DataAccessState>();
  nativeModelAccessDataAccessState: DataAccessState | undefined;

  // actions
  readonly viewDataProductSource?: (() => void) | undefined;
  readonly openPowerBi?: ((apg: string) => void) | undefined;
  readonly openDataCube?: ((sourceData: object) => void) | undefined;
  readonly openLineage?:
    | ((dataProductName: string, accessPointName: string) => void)
    | undefined;
  readonly fetchingDataProductArtifactState = ActionState.create();

  constructor(
    product: V1_DataProduct,
    applicationStore: GenericLegendApplicationStore,
    engineServerClient: V1_EngineServerClient,
    depotServerClient: DepotServerClient,
    graphManagerState: GraphManagerState,
    dataProductConfig: DataProductConfig | undefined,
    userSearchService: UserSearchService | undefined,
    projectGAV: ProjectGAVCoordinates | undefined,
    actions: {
      viewDataProductSource?: (() => void) | undefined;
      onZoneChange?: ((zone: NavigationZone | undefined) => void) | undefined;
      openPowerBi?: ((apg: string) => void) | undefined;
      openDataCube?: (sourceData: object) => void;
      openLineage?:
        | ((dataProductName: string, accessPointName: string) => void)
        | undefined;
    },
    registryServerClient?: RegistryServerClient | undefined,
  ) {
    super(
      product,
      applicationStore,
      new DataProductLayoutState(product),
      actions,
    );

    this.layoutState.setViewerState(this);

    makeObservable(this, {
      dataProductArtifact: observable,
      modelsDocumentationState: observable,
      modelAccessPointGroupDiagramViewerState: observable,
      sampleQueryDataAccessStateIndex: observable,
      nativeModelAccessDocumentationState: observable,
      nativeModelAccessDiagramViewerState: observable,
      nativeModelAccessDataAccessState: observable,
      init: flow,
      isAllApgsCollapsed: computed,
      toggleAllApgGroupCollapse: action,
    });

    this.apgStates = this.product.accessPointGroups.map(
      (e) => new DataProductAPGState(e, this),
    );
    this.dataProductSqlPlaygroundState = new DataProductSqlPlaygroundPanelState(
      this,
    );
    this.engineServerClient = engineServerClient;
    this.depotServerClient = depotServerClient;
    this.graphManagerState = graphManagerState;
    this.userSearchService = userSearchService;
    this.dataProductConfig = dataProductConfig;
    this.projectGAV = projectGAV;
    this.registryServerClient = registryServerClient;

    // actions
    this.viewDataProductSource = actions.viewDataProductSource;
    this.openPowerBi = actions.openPowerBi;
    this.openDataCube = actions.openDataCube;
    this.openLineage = actions.openLineage;
  }

  protected getValidSections(): string[] {
    return Object.values(DATA_PRODUCT_VIEWER_SECTION).map((section) =>
      section.toString(),
    );
  }

  getModelAccessPointGroup(): V1_ModelAccessPointGroup | undefined {
    const modelapg = this.product.accessPointGroups.find(
      (apg): apg is V1_ModelAccessPointGroup =>
        apg instanceof V1_ModelAccessPointGroup,
    );
    return modelapg;
  }

  get isVDP(): boolean {
    const vendorProfile = this.dataProductConfig?.vendorTaggedValue.profile;
    if (!vendorProfile) {
      return false;
    }
    return Boolean(
      this.product.taggedValues.find(
        (taggedValue) => taggedValue.tag.profile === vendorProfile,
      ),
    );
  }

  get isAllApgsCollapsed(): boolean {
    return (
      this.apgStates.length > 0 &&
      this.apgStates.every((groupState) => groupState.isCollapsed)
    );
  }

  toggleAllApgGroupCollapse(): void {
    const shouldCollapse = !this.isAllApgsCollapsed;
    this.apgStates.forEach((groupState) => {
      groupState.setIsCollapsed(shouldCollapse);
    });
  }

  getModelAccessPointDiagrams(): DiagramAnalysisResult[] {
    const modelAPG = this.getModelAccessPointGroup();

    if (!modelAPG || modelAPG.diagrams.length === 0) {
      return [];
    }

    return modelAPG.diagrams.map((v1Diagram: V1_DataProductDiagram) => {
      const result = new DiagramAnalysisResult();
      result.title = v1Diagram.title;
      result.description = v1Diagram.description;
      result.diagram = getDiagram(
        v1Diagram.diagram.path,
        this.graphManagerState.graph,
      );
      return result;
    });
  }

  getNativeModelAccessDiagrams(): DiagramAnalysisResult[] {
    const nativeModelAccess = this.dataProductArtifact?.nativeModelAccess;

    if (!nativeModelAccess?.diagrams.length) {
      return [];
    }

    return nativeModelAccess.diagrams.map((v1Diagram: V1_DiagramInfo) => {
      const result = new DiagramAnalysisResult();
      result.title = v1Diagram.title;
      result.description = v1Diagram.description;
      try {
        result.diagram = this.graphManagerState.graph.allOwnElements.find(
          (element) => element.path === v1Diagram.diagram,
        ) as Diagram;
      } catch (error) {
        assertErrorThrown(error);
        this.applicationStore.logService.warn(
          LogEvent.create('data-product.nativeModelAccessDiagram.failure'),
          `Unable to fetch diagram '${v1Diagram.diagram}': ${error.message}`,
        );
        throw error;
      }
      return result;
    });
  }

  getModelAccessPointGroupDiagramsFromArtifact(
    modelAccessPointGroupInfo: V1_ModelAccessPointGroupInfo,
  ): DiagramAnalysisResult[] {
    if (!modelAccessPointGroupInfo.diagrams.length) {
      return [];
    }

    return modelAccessPointGroupInfo.diagrams.map(
      (v1Diagram: V1_DiagramInfo) => {
        const result = new DiagramAnalysisResult();
        result.title = v1Diagram.title;
        result.description = v1Diagram.description;
        try {
          result.diagram = this.graphManagerState.graph.allOwnElements.find(
            (element) => element.path === v1Diagram.diagram,
          ) as Diagram;
        } catch (error) {
          assertErrorThrown(error);
          this.applicationStore.logService.warn(
            LogEvent.create(
              'data-product.modelAccessPointGroupDiagram.failure',
            ),
            `Unable to fetch diagram '${v1Diagram.diagram}': ${error.message}`,
          );
          throw error;
        }
        return result;
      },
    );
  }

  getSampleQueries(): V1_SampleQuery[] {
    if (!this.dataProductArtifact?.nativeModelAccess?.sampleQueries?.length) {
      return [];
    }
    return this.dataProductArtifact.nativeModelAccess.sampleQueries;
  }

  buildSampleQueryDataAccessStates(
    nativeModelAccess: V1_NativeModelAccessInfo,
  ): void {
    const sampleQueries = nativeModelAccess.sampleQueries ?? [];

    if (!this.projectGAV) {
      return;
    }

    const graphData = new GraphDataWithOrigin(
      new LegendSDLC(
        this.projectGAV.groupId,
        this.projectGAV.artifactId,
        resolveVersion(this.projectGAV.versionId),
      ),
    );

    // Get the default execution context for fallback mapping/runtime
    const defaultExecutionContext =
      nativeModelAccess.nativeModelExecutionContexts.find(
        (ctx) => ctx.key === nativeModelAccess.defaultExecutionContext,
      );

    sampleQueries.forEach((sampleQuery) => {
      let mapping: string | undefined;
      let runtime: string | undefined;

      // Check if info has mapping/runtime (ServiceExecutableInfo or MultiExecutionServiceExecutableInfo)
      if (sampleQuery.info instanceof V1_ServiceExecutableInfo) {
        mapping = sampleQuery.info.mapping;
        runtime = sampleQuery.info.runtime;
      } else if (
        sampleQuery.info instanceof V1_MultiExecutionServiceExecutableInfo
      ) {
        const firstKeyedInfo = sampleQuery.info.keyedExecutableInfos.at(0);
        mapping = firstKeyedInfo?.mapping;
        runtime = firstKeyedInfo?.runtime;
      }

      // Fallback to execution context based on executionContextKey or default
      if (!mapping || !runtime) {
        const executionContextKey =
          sampleQuery.info.executionContextKey ??
          nativeModelAccess.defaultExecutionContext;
        const executionContext =
          nativeModelAccess.nativeModelExecutionContexts.find(
            (ctx) => ctx.key === executionContextKey,
          ) ?? defaultExecutionContext;

        if (executionContext) {
          if (!mapping) {
            mapping = executionContext.mapping;
          }
          if (!runtime && executionContext.runtimeGeneration) {
            runtime = executionContext.runtimeGeneration.path;
          }
        }
      }

      // Only create DataAccessState if we have both mapping and runtime
      if (mapping && runtime) {
        try {
          const dataAccessState = new DataAccessState(
            this.applicationStore,
            this.graphManagerState,
            {
              mapping,
              runtime,
              graphData,
              getQuery: async () => undefined,
            },
          );

          this.sampleQueryDataAccessStateIndex.set(
            sampleQuery,
            dataAccessState,
          );
        } catch (error) {
          assertErrorThrown(error);
          this.applicationStore.logService.warn(
            LogEvent.create('data-product.sampleQueryDataAccess.failure'),
            `Unable to create DataAccessState for sample query '${sampleQuery.title}': ${error.message}`,
          );
        }
      }
    });
  }

  buildNativeModelAccessDataAccessState(
    nativeModelAccess: V1_NativeModelAccessInfo,
  ): void {
    if (!this.projectGAV) {
      return;
    }

    const defaultExecutionContext =
      nativeModelAccess.nativeModelExecutionContexts.find(
        (ctx) => ctx.key === nativeModelAccess.defaultExecutionContext,
      );

    if (!defaultExecutionContext) {
      return;
    }

    const mapping = defaultExecutionContext.mapping;
    const runtime = defaultExecutionContext.runtimeGeneration?.path;

    if (!mapping || !runtime) {
      return;
    }

    const graphData = new GraphDataWithOrigin(
      new LegendSDLC(
        this.projectGAV.groupId,
        this.projectGAV.artifactId,
        resolveVersion(this.projectGAV.versionId),
      ),
    );

    try {
      this.nativeModelAccessDataAccessState = new DataAccessState(
        this.applicationStore,
        this.graphManagerState,
        {
          mapping,
          runtime,
          graphData,
          getQuery: async () => undefined,
        },
      );
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.logService.warn(
        LogEvent.create('data-product.nativeModelAccessDataAccess.failure'),
        `Unable to create DataAccessState for native model access: ${error.message}`,
      );
    }
  }

  getAccessPointModel(
    projectGAV: ProjectGAVCoordinates | undefined,
    entitlementsOrigin: V1_EntitlementsDataProductOrigin | null | undefined,
  ): V1_PureModelContext | undefined {
    return projectGAV !== undefined
      ? new V1_PureModelContextPointer(
          // TODO: remove as backend should handle undefined protocol input
          new V1_Protocol(
            V1_PureGraphManager.PURE_PROTOCOL_NAME,
            PureClientVersion.VX_X_X,
          ),
          new V1_LegendSDLC(
            projectGAV.groupId,
            projectGAV.artifactId,
            resolveVersion(projectGAV.versionId),
          ),
        )
      : entitlementsOrigin instanceof V1_AdHocDeploymentDataProductOrigin ||
          entitlementsOrigin === undefined
        ? guaranteeType(
            this.graphManagerState.graphManager,
            V1_PureGraphManager,
          ).getFullGraphModelData(this.graphManagerState.graph)
        : entitlementsOrigin instanceof V1_SdlcDeploymentDataProductOrigin
          ? new V1_PureModelContextPointer(
              // TODO: remove as backend should handle undefined protocol input
              new V1_Protocol(
                V1_PureGraphManager.PURE_PROTOCOL_NAME,
                PureClientVersion.VX_X_X,
              ),
              new V1_LegendSDLC(
                entitlementsOrigin.group,
                entitlementsOrigin.artifact,
                resolveVersion(entitlementsOrigin.version),
              ),
            )
          : undefined;
  }

  async fetchDataProductArtifact(): Promise<
    V1_DataProductArtifact | undefined
  > {
    this.fetchingDataProductArtifactState.inProgress();
    let artifact: V1_DataProductArtifact | undefined;
    try {
      if (this.projectGAV !== undefined) {
        const storeProject = new StoreProjectData();
        storeProject.groupId = this.projectGAV.groupId;
        storeProject.artifactId = this.projectGAV.artifactId;
        const files = (
          await this.depotServerClient.getGenerationFilesByType(
            storeProject,
            resolveVersion(this.projectGAV.versionId),
            V1_DATA_PRODUCT_ELEMENT_PROTOCOL_TYPE,
          )
        ).map((rawFile) =>
          StoredFileGeneration.serialization.fromJson(rawFile),
        );
        const fileGen = files.filter((e) => e.path === this.product.path)[0]
          ?.file.content;
        if (fileGen) {
          const content: PlainObject = JSON.parse(fileGen) as PlainObject;
          artifact = V1_DataProductArtifact.serialization.fromJson(content);
          return artifact;
        } else {
          throw new Error(
            `Artifact generation not found for data product: ${storeProject.groupId}:${storeProject.artifactId}:${this.projectGAV.versionId}/${this.product.path}`,
          );
        }
      }
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.notificationService.notifyError(error.message);
    } finally {
      this.fetchingDataProductArtifactState.complete();
    }
    return artifact;
  }

  async buildGraphFromNativeModelAccessAndModelAccessPointGroup(
    nativeModelAccessInfo?: V1_NativeModelAccessInfo | undefined,
    modelAccessPointGroupInfo?: V1_ModelAccessPointGroupInfo | undefined,
  ): Promise<void> {
    try {
      const graphManager = guaranteeType(
        this.graphManagerState.graphManager,
        V1_PureGraphManager,
        'GraphManager must be a V1_PureGraphManager',
      );

      const graph = this.graphManagerState.graph;

      const elements: V1_PackageableElement[] = [];

      if (nativeModelAccessInfo) {
        elements.push(...nativeModelAccessInfo.model.elements);

        const defaultExecutionContext =
          nativeModelAccessInfo.nativeModelExecutionContexts.find(
            (ctx) => ctx.key === nativeModelAccessInfo.defaultExecutionContext,
          );

        if (defaultExecutionContext) {
          const [mappingPackagePath, mappingName] =
            resolvePackagePathAndElementName(defaultExecutionContext.mapping);
          const mappingProtocol = new V1_Mapping();
          mappingProtocol.package = mappingPackagePath;
          mappingProtocol.name = mappingName;
          elements.push(mappingProtocol);

          const mappingGeneration =
            nativeModelAccessInfo.mappingGenerations.get(
              defaultExecutionContext.mapping,
            );

          if (defaultExecutionContext.runtimeGeneration) {
            const [runtimePackagePath, runtimeName] =
              resolvePackagePathAndElementName(
                defaultExecutionContext.runtimeGeneration.path,
              );
            const runtimeProtocol = new V1_PackageableRuntime();
            runtimeProtocol.package = runtimePackagePath;
            runtimeProtocol.name = runtimeName;
            runtimeProtocol.runtimeValue = new V1_EngineRuntime();
            elements.push(runtimeProtocol);
          }

          if (mappingGeneration) {
            elements.push(...mappingGeneration.model.elements);
          }
        }
      }

      if (modelAccessPointGroupInfo) {
        elements.push(...modelAccessPointGroupInfo.model.elements);
        elements.push(
          ...modelAccessPointGroupInfo.mappingGeneration.model.elements,
        );
      }

      const allElements = uniq(elements.map((el) => el.path))
        .map((path) => elements.find((el) => el.path === path))
        .filter(isNonNullable);

      const graphEntities = allElements
        .filter((el) => !graph.getNullableElement(el.path, false))
        .map((el) => graphManager.elementProtocolToEntity(el));

      await graphManager.buildGraph(graph, graphEntities, ActionState.create());
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.logService.warn(
        LogEvent.create('data-product.buildNativeModelAccessGraph.failure'),
        `Unable to build native model access graph: ${error.message}`,
      );
      throw error;
    }
  }

  *init(
    entitlementsDataProductDetails?: V1_EntitlementsDataProductDetails,
    prefetchedArtifact?: V1_DataProductArtifact,
  ): GeneratorFn<void> {
    const dataProductArtifactPromise = prefetchedArtifact
      ? Promise.resolve(prefetchedArtifact)
      : this.fetchDataProductArtifact();
    this.apgStates.map((apgState) =>
      apgState.init(dataProductArtifactPromise, entitlementsDataProductDetails),
    );
    const dataProductArtifact = (yield dataProductArtifactPromise) as
      | V1_DataProductArtifact
      | undefined;
    this.dataProductArtifact = dataProductArtifact;

    const isSdlc =
      prefetchedArtifact !== undefined ||
      entitlementsDataProductDetails?.origin instanceof
        V1_SdlcDeploymentDataProductOrigin;

    const modelAccessPointGroupInfo =
      dataProductArtifact?.accessPointGroups.find(
        (apg): apg is V1_ModelAccessPointGroupInfo =>
          apg instanceof V1_ModelAccessPointGroupInfo,
      );

    if (
      isSdlc &&
      (dataProductArtifact?.nativeModelAccess || modelAccessPointGroupInfo)
    ) {
      try {
        yield this.buildGraphFromNativeModelAccessAndModelAccessPointGroup(
          dataProductArtifact?.nativeModelAccess,
          modelAccessPointGroupInfo,
        );
      } catch (error) {
        assertErrorThrown(error);
        this.applicationStore.logService.warn(
          LogEvent.create('data-product.nativeModelAccessGraph.failure'),
          `Unable to build graph from artifact models: ${error.message}`,
        );
      }
    }

    const nativeModelAccess = dataProductArtifact?.nativeModelAccess;
    if (isSdlc && nativeModelAccess) {
      try {
        this.buildSampleQueryDataAccessStates(nativeModelAccess);
      } catch (error) {
        assertErrorThrown(error);
        this.applicationStore.logService.warn(
          LogEvent.create('data-product.sampleQueryDataAccess.failure'),
          `Unable to build sample query data access states: ${error.message}`,
        );
      }

      try {
        this.buildNativeModelAccessDataAccessState(nativeModelAccess);
      } catch (error) {
        assertErrorThrown(error);
        this.applicationStore.logService.warn(
          LogEvent.create('data-product.nativeModelAccessDataAccess.failure'),
          `Unable to build native model access data access state: ${error.message}`,
        );
      }

      try {
        this.nativeModelAccessDocumentationState =
          new DataProductDocumentationState(
            nativeModelAccess.elementDocs,
            this.graphManagerState,
          );
      } catch (error) {
        assertErrorThrown(error);
        this.applicationStore.logService.warn(
          LogEvent.create(
            'data-product.nativeModelAccessDocumentation.failure',
          ),
          `Unable to initialize native model access documentation: ${error.message}`,
        );
        this.nativeModelAccessDocumentationState = undefined;
      }

      this.nativeModelAccessDiagramViewerState =
        new DataProductViewerDiagramViewerState(
          this.getNativeModelAccessDiagrams(),
        );
    }

    if (modelAccessPointGroupInfo) {
      try {
        this.modelsDocumentationState = new DataProductDocumentationState(
          modelAccessPointGroupInfo.elementDocs,
          this.graphManagerState,
        );
      } catch (error) {
        assertErrorThrown(error);
        this.applicationStore.logService.warn(
          LogEvent.create(
            'data-product.modelAccessPointGroupDocumentation.failure',
          ),
          `Unable to initialize model access point group documentation: ${error.message}`,
        );
        this.modelsDocumentationState = undefined;
      }

      try {
        this.modelAccessPointGroupDiagramViewerState =
          new DataProductViewerDiagramViewerState(
            this.getModelAccessPointGroupDiagramsFromArtifact(
              modelAccessPointGroupInfo,
            ),
          );
      } catch (error) {
        assertErrorThrown(error);
        this.applicationStore.logService.warn(
          LogEvent.create('data-product.modelAccessPointGroupDiagram.failure'),
          `Unable to initialize model access point group diagrams: ${error.message}`,
        );
        this.modelAccessPointGroupDiagramViewerState = undefined;
      }
    } else if (!isSdlc && this.getModelAccessPointGroup()) {
      // graph is already built
      try {
        this.modelsDocumentationState =
          new DataProductViewerModelsDocumentationState(this);
      } catch (error) {
        assertErrorThrown(error);
        this.applicationStore.logService.warn(
          LogEvent.create(
            'data-product.modelAccessPointGroupDocumentation.failure',
          ),
          `Unable to initialize model access point group documentation: ${error.message}`,
        );
        this.modelsDocumentationState = undefined;
      }

      try {
        this.modelAccessPointGroupDiagramViewerState =
          new DataProductViewerDiagramViewerState(
            this.getModelAccessPointDiagrams(),
          );
      } catch (error) {
        assertErrorThrown(error);
        this.applicationStore.logService.warn(
          LogEvent.create('data-product.modelAccessPointGroupDiagram.failure'),
          `Unable to initialize model access point group diagrams: ${error.message}`,
        );
        this.modelAccessPointGroupDiagramViewerState = undefined;
      }
    }
  }
}
