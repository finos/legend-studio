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
  type V1_SampleQueryInfo,
  V1_Mapping,
  V1_PackageableRuntime,
  resolvePackagePathAndElementName,
  type V1_DiagramInfo,
  type V1_PackageableElement,
} from '@finos/legend-graph';
import { flow, makeObservable, observable } from 'mobx';
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
import { DataProductNativeModelAccessDocumentationState } from './DataProductNativeModelAccessDocumentationState.js';
import {
  getDiagram,
  DiagramAnalysisResult,
  type Diagram,
} from '@finos/legend-extension-dsl-diagram';
import { DataProductViewerDiagramViewerState } from './DataProductViewerDiagramViewerState.js';

export class DataProductViewerState extends BaseViewerState<
  V1_DataProduct,
  DataProductLayoutState
> {
  readonly engineServerClient: V1_EngineServerClient;
  readonly depotServerClient: DepotServerClient;
  readonly graphManagerState: GraphManagerState;
  readonly apgStates: DataProductAPGState[];
  readonly userSearchService: UserSearchService | undefined;
  readonly dataProductConfig: DataProductConfig | undefined;
  readonly projectGAV: ProjectGAVCoordinates | undefined;
  readonly dataProductSqlPlaygroundState: DataProductSqlPlaygroundPanelState;
  readonly modelsDocumentationState:
    | DataProductViewerModelsDocumentationState
    | undefined;
  nativeModelAccessDocumentationState:
    | DataProductNativeModelAccessDocumentationState
    | undefined;
  readonly modelAccessPointGroupDiagramViewerState: DataProductViewerDiagramViewerState;
  nativeModelAccessDiagramViewerState:
    | DataProductViewerDiagramViewerState
    | undefined;
  dataProductArtifact: V1_DataProductArtifact | undefined;

  // actions
  readonly viewDataProductSource?: (() => void) | undefined;
  readonly openPowerBi?: ((apg: string) => void) | undefined;
  readonly openDataCube?: ((sourceData: object) => void) | undefined;
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
    },
  ) {
    super(product, applicationStore, new DataProductLayoutState(), actions);

    makeObservable(this, {
      dataProductArtifact: observable,
      nativeModelAccessDocumentationState: observable,
      nativeModelAccessDiagramViewerState: observable,
      init: flow,
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

    this.modelAccessPointGroupDiagramViewerState =
      new DataProductViewerDiagramViewerState(
        this.getModelAccessPointDiagrams(),
      );

    // actions
    this.viewDataProductSource = actions.viewDataProductSource;
    this.openPowerBi = actions.openPowerBi;
    this.openDataCube = actions.openDataCube;

    try {
      this.modelsDocumentationState =
        new DataProductViewerModelsDocumentationState(this);
    } catch {
      this.modelsDocumentationState = undefined;
    }
  }

  protected getValidSections(): string[] {
    return Object.values(DATA_PRODUCT_VIEWER_SECTION).map((section) =>
      section.toString(),
    );
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

  getModelAccessPointGroup(): V1_ModelAccessPointGroup | undefined {
    return this.product.accessPointGroups.find(
      (apg): apg is V1_ModelAccessPointGroup =>
        apg instanceof V1_ModelAccessPointGroup,
    );
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

  getSampleQueries(): V1_SampleQueryInfo[] {
    if (!this.dataProductArtifact?.nativeModelAccess?.sampleQueries?.length) {
      return [];
    }
    return this.dataProductArtifact.nativeModelAccess.sampleQueries;
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

  async buildGraphFromNativeModelAccess(
    nativeModelAccessInfo: V1_NativeModelAccessInfo,
  ): Promise<void> {
    try {
      const graphManager = guaranteeType(
        this.graphManagerState.graphManager,
        V1_PureGraphManager,
        'GraphManager must be a V1_PureGraphManager',
      );

      const graph = this.graphManagerState.graph;

      const defaultExecutionContext =
        nativeModelAccessInfo.nativeModelExecutionContexts.find(
          (ctx) => ctx.key === nativeModelAccessInfo.defaultExecutionContext,
        );

      const elements: V1_PackageableElement[] = [];

      if (defaultExecutionContext) {
        const [mappingPackagePath, mappingName] =
          resolvePackagePathAndElementName(defaultExecutionContext.mapping);
        const mappingProtocol = new V1_Mapping();
        mappingProtocol.package = mappingPackagePath;
        mappingProtocol.name = mappingName;
        elements.push(mappingProtocol);

        if (defaultExecutionContext.runtime) {
          const [runtimePackagePath, runtimeName] =
            resolvePackagePathAndElementName(
              defaultExecutionContext.runtime.path,
            );
          const runtimeProtocol = new V1_PackageableRuntime();
          runtimeProtocol.package = runtimePackagePath;
          runtimeProtocol.name = runtimeName;
          elements.push(runtimeProtocol);
        }

        const mappingGeneration = nativeModelAccessInfo.mappingGenerations.get(
          defaultExecutionContext.mapping,
        );

        if (mappingGeneration) {
          elements.concat(mappingGeneration.model.elements);
        }
      }

      const combinedElements =
        nativeModelAccessInfo.model.elements.concat(elements);
      const allElements = uniq(combinedElements.map((el) => el.path))
        .map((path) => combinedElements.find((el) => el.path === path))
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
  ): GeneratorFn<void> {
    const dataProductArtifactPromise = this.fetchDataProductArtifact();
    this.apgStates.map((apgState) =>
      apgState.init(dataProductArtifactPromise, entitlementsDataProductDetails),
    );
    const dataProductArtifact =
      (yield dataProductArtifactPromise) as V1_DataProductArtifact;
    this.dataProductArtifact = dataProductArtifact;

    // Build graph from native model access if present (use first one for now)
    if (
      entitlementsDataProductDetails?.origin instanceof
        V1_SdlcDeploymentDataProductOrigin &&
      dataProductArtifact.nativeModelAccess
    ) {
      try {
        const nativeModelAccess = dataProductArtifact.nativeModelAccess;
        yield this.buildGraphFromNativeModelAccess(nativeModelAccess);
      } catch (error) {
        assertErrorThrown(error);
        this.applicationStore.logService.warn(
          LogEvent.create('data-product.nativeModelAccessGraph.failure'),
          `Unable to build native model access graph: ${error.message}`,
        );
      }
    }

    if (dataProductArtifact.nativeModelAccess) {
      try {
        this.nativeModelAccessDocumentationState =
          new DataProductNativeModelAccessDocumentationState(this);
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
  }
}
