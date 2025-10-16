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
  type NavigationZone,
  DEFAULT_TAB_SIZE,
  EXTERNAL_APPLICATION_NAVIGATION__generateStudioProjectViewUrl,
  EXTERNAL_APPLICATION_NAVIGATION__generateNewDataCubeUrl,
} from '@finos/legend-application';
import {
  resolveVersion,
  retrieveProjectEntitiesWithDependencies,
  StoreProjectData,
  VersionedProjectData,
} from '@finos/legend-server-depot';
import { action, flow, flowResult, makeObservable, observable } from 'mobx';
import type { LegendMarketplaceBaseStore } from '../LegendMarketplaceBaseStore.js';
import {
  type GeneratorFn,
  type PlainObject,
  ActionState,
  assertErrorThrown,
  guaranteeNonNullable,
  guaranteeType,
  stringifyQueryParams,
  addQueryParametersToUrl,
} from '@finos/legend-shared';
import {
  type Class,
  type TDSExecutionResult,
  type TDSRowDataType,
  type V1_EntitlementsDataProductDetailsResponse,
  type V1_Terminal,
  getRowDataFromExecutionResult,
  GraphDataWithOrigin,
  GraphManagerState,
  LegendSDLC,
  V1_AdHocDeploymentDataProductOrigin,
  V1_DataProduct,
  V1_DataProductArtifact,
  V1_dataProductModelSchema,
  V1_entitlementsDataProductDetailsResponseToDataProductDetails,
  V1_PureGraphManager,
  V1_SdlcDeploymentDataProductOrigin,
  V1_TerminalModelSchema,
} from '@finos/legend-graph';
import type { AuthContextProps } from 'react-oidc-context';
import { getDataProductFromDetails } from './LakehouseUtils.js';
import {
  type Entity,
  type StoredFileGeneration,
  parseGAVCoordinates,
  parseProjectIdentifier,
} from '@finos/legend-storage';
import { deserialize } from 'serializr';
import {
  EXTERNAL_APPLICATION_NAVIGATION__generateDataSpaceQueryEditorUrl,
  EXTERNAL_APPLICATION_NAVIGATION__generateStudioSDLCProjectViewUrl,
  generateLakehouseDataProductPath,
  generateLakehouseTaskPath,
} from '../../__lib__/LegendMarketplaceNavigation.js';
import {
  DataSpaceViewerState,
  EXTERNAL_APPLICATION_NAVIGATION__generateServiceQueryCreatorUrl,
} from '@finos/legend-extension-dsl-data-space/application';
import {
  type DataSpaceAnalysisResult,
  DSL_DataSpace_getGraphManagerExtension,
  retrieveAnalyticsResultCache,
} from '@finos/legend-extension-dsl-data-space/graph';
import {
  DataProductDataAccessState,
  DataProductViewerState,
  TerminalProductLayoutState,
  TerminalProductViewerState,
} from '@finos/legend-extension-dsl-data-product';
import {
  DATAPRODUCT_TYPE,
  LegendMarketplaceTelemetryHelper,
} from '../../__lib__/LegendMarketplaceTelemetryHelper.js';

const ARTIFACT_GENERATION_DATA_PRODUCT_KEY = 'dataProduct';

export class LegendMarketplaceProductViewerStore {
  readonly marketplaceBaseStore: LegendMarketplaceBaseStore;
  dataProductViewer: DataProductViewerState | undefined;
  dataProductDataAccess: DataProductDataAccessState | undefined;
  terminalProductViewer: TerminalProductViewerState | undefined;
  legacyDataProductViewer: DataSpaceViewerState | undefined;

  readonly loadingProductState = ActionState.create();

  constructor(marketplaceBaseStore: LegendMarketplaceBaseStore) {
    this.marketplaceBaseStore = marketplaceBaseStore;

    makeObservable(this, {
      dataProductViewer: observable,
      dataProductDataAccess: observable,
      terminalProductViewer: observable,
      legacyDataProductViewer: observable,
      setDataProductViewer: action,
      setDataProductDataAccess: action,
      setTerminalProductViewer: action,
      setLegacyDataProductViewer: action,
      initWithProduct: flow,
      initWithTerminal: flow,
      initWithSDLCProduct: flow,
      initWithLegacyProduct: flow,
    });
  }

  setDataProductViewer(val: DataProductViewerState | undefined): void {
    this.dataProductViewer = val;
  }

  setDataProductDataAccess(val: DataProductDataAccessState | undefined): void {
    this.dataProductDataAccess = val;
  }

  setTerminalProductViewer(val: TerminalProductViewerState | undefined): void {
    this.terminalProductViewer = val;
  }

  setLegacyDataProductViewer(val: DataSpaceViewerState | undefined): void {
    this.legacyDataProductViewer = val;
  }

  *initWithTerminal(terminalId: string): GeneratorFn<void> {
    try {
      this.loadingProductState.inProgress();
      const rawTerminalResponse: TDSExecutionResult =
        (yield this.marketplaceBaseStore.engineServerClient.getTerminalById(
          terminalId,
        )) as TDSExecutionResult;
      const terminalRowData: TDSRowDataType[] =
        getRowDataFromExecutionResult(rawTerminalResponse);
      const matchingRows = terminalRowData.filter(
        (row: TDSRowDataType) => row.id === Number(terminalId),
      );
      const terminalProducts: V1_Terminal[] = matchingRows.map(
        (rowData: TDSRowDataType) =>
          deserialize(V1_TerminalModelSchema, rowData),
      );

      this.setTerminalProductViewer(
        new TerminalProductViewerState(
          guaranteeNonNullable(
            terminalProducts[0],
            `No terminal found with ID ${terminalId}`,
          ),
          this.marketplaceBaseStore.applicationStore,
          new TerminalProductLayoutState(),
        ),
      );

      this.loadingProductState.complete();
      LegendMarketplaceTelemetryHelper.logEvent_LoadTerminal(
        this.marketplaceBaseStore.applicationStore.telemetryService,
        terminalId,
        undefined,
      );
    } catch (error) {
      assertErrorThrown(error);
      const message = `Unable to load terminal ${terminalId}: ${error.message}`;
      this.marketplaceBaseStore.applicationStore.notificationService.notifyError(
        message,
      );
      this.loadingProductState.fail();
      LegendMarketplaceTelemetryHelper.logEvent_LoadTerminal(
        this.marketplaceBaseStore.applicationStore.telemetryService,
        terminalId,
        message,
      );
    }
  }

  *initWithProduct(
    dataProductId: string,
    deploymentId: number,
    auth: AuthContextProps,
  ): GeneratorFn<void> {
    try {
      this.loadingProductState.inProgress();

      const rawResponse =
        (yield this.marketplaceBaseStore.lakehouseContractServerClient.getDataProductByIdAndDID(
          dataProductId,
          deploymentId,
          auth.user?.access_token,
        )) as PlainObject<V1_EntitlementsDataProductDetailsResponse>;
      const fetchedDataProductDetails =
        V1_entitlementsDataProductDetailsResponseToDataProductDetails(
          rawResponse,
        );
      if (fetchedDataProductDetails.length === 0) {
        throw new Error(
          `No data products found for ID ${dataProductId} and DID ${deploymentId}`,
        );
      } else if (fetchedDataProductDetails.length > 1) {
        throw new Error(
          `Multiple data products found for ID ${dataProductId} and DID ${deploymentId}`,
        );
      }

      const entitlementsDataProductDetails = guaranteeNonNullable(
        fetchedDataProductDetails[0],
      );

      // Create graph manager state
      const graphManagerState = new GraphManagerState(
        this.marketplaceBaseStore.applicationStore.pluginManager,
        this.marketplaceBaseStore.applicationStore.logService,
      );
      const graphManager = guaranteeType(
        graphManagerState.graphManager,
        V1_PureGraphManager,
        'GraphManager must be a V1_PureGraphManager',
      );
      yield graphManager.initialize(
        {
          env: this.marketplaceBaseStore.applicationStore.config.env,
          tabSize: DEFAULT_TAB_SIZE,
          clientConfig: {
            baseUrl:
              this.marketplaceBaseStore.applicationStore.config.engineServerUrl,
          },
        },
        { engine: this.marketplaceBaseStore.remoteEngine },
      );
      yield graphManagerState.initializeSystem();

      // For AdHoc DataProducts, we need to build the graph so that we have the
      // PCMD to use for fetching access point relation types.
      if (
        entitlementsDataProductDetails.origin instanceof
        V1_AdHocDeploymentDataProductOrigin
      ) {
        const entities: Entity[] = (yield graphManager.pureCodeToEntities(
          entitlementsDataProductDetails.origin.definition,
        )) as Entity[];
        yield graphManager.buildGraph(
          graphManagerState.graph,
          entities,
          ActionState.create(),
        );
      }

      const v1DataProduct = guaranteeType(
        yield getDataProductFromDetails(
          entitlementsDataProductDetails,
          graphManager,
          this.marketplaceBaseStore,
        ),
        V1_DataProduct,
        `Unable to get V1_DataProduct from details for id: ${entitlementsDataProductDetails.id}`,
      );

      const projectGAV =
        entitlementsDataProductDetails.origin instanceof
        V1_SdlcDeploymentDataProductOrigin
          ? {
              groupId: entitlementsDataProductDetails.origin.group,
              artifactId: entitlementsDataProductDetails.origin.artifact,
              versionId: entitlementsDataProductDetails.origin.version,
            }
          : undefined;

      const dataProductViewerState = new DataProductViewerState(
        v1DataProduct,
        this.marketplaceBaseStore.applicationStore,
        this.marketplaceBaseStore.engineServerClient,
        this.marketplaceBaseStore.depotServerClient,
        graphManagerState,
        this.marketplaceBaseStore.applicationStore.config.options.dataProductConfig,
        this.marketplaceBaseStore.userSearchService,
        projectGAV,
        {
          viewDataProductSource: () => {
            if (
              entitlementsDataProductDetails.origin instanceof
              V1_SdlcDeploymentDataProductOrigin
            ) {
              this.marketplaceBaseStore.applicationStore.navigationService.navigator.visitAddress(
                EXTERNAL_APPLICATION_NAVIGATION__generateStudioProjectViewUrl(
                  this.marketplaceBaseStore.applicationStore.config
                    .studioApplicationUrl,
                  entitlementsDataProductDetails.origin.group,
                  entitlementsDataProductDetails.origin.artifact,
                  entitlementsDataProductDetails.origin.version,
                  v1DataProduct.path,
                ),
              );
            }
          },
          openPowerBi: (apg) => {
            if (
              entitlementsDataProductDetails.origin instanceof
              V1_SdlcDeploymentDataProductOrigin
            ) {
              const {
                group: groupId,
                artifact: artifactId,
                version: versionId,
              } = entitlementsDataProductDetails.origin;
              const path = v1DataProduct.path;
              const powerBiUrl =
                this.marketplaceBaseStore.applicationStore.config.powerBiUrl;
              this.marketplaceBaseStore.applicationStore.navigationService.navigator.visitAddress(
                addQueryParametersToUrl(
                  powerBiUrl,
                  stringifyQueryParams({
                    groupId,
                    artifactId,
                    versionId,
                    path,
                    apg,
                  }),
                ),
              );
            }
          },
          openDataCube: (sourceData) => {
            this.marketplaceBaseStore.applicationStore.navigationService.navigator.visitAddress(
              EXTERNAL_APPLICATION_NAVIGATION__generateNewDataCubeUrl(
                this.marketplaceBaseStore.applicationStore.config
                  .datacubeApplicationUrl,
                sourceData,
              ),
            );
          },
        },
      );
      const dataProductDataAccessState = new DataProductDataAccessState(
        entitlementsDataProductDetails,
        dataProductViewerState,
        this.marketplaceBaseStore.lakehouseContractServerClient,
        this.marketplaceBaseStore.lakehousePlatformServerClient,
        this.marketplaceBaseStore.lakehouseIngestServerClient,
        this.marketplaceBaseStore.applicationStore.pluginManager.getApplicationPlugins(),
        {
          getContractTaskUrl: (taskId: string) =>
            this.marketplaceBaseStore.applicationStore.navigationService.navigator.generateAddress(
              generateLakehouseTaskPath(taskId),
            ),
          getDataProductUrl: (_dataProductId: string, _deploymentId: number) =>
            this.marketplaceBaseStore.applicationStore.navigationService.navigator.generateAddress(
              generateLakehouseDataProductPath(_dataProductId, _deploymentId),
            ),
        },
      );
      this.setDataProductViewer(dataProductViewerState);
      this.setDataProductDataAccess(dataProductDataAccessState);
      dataProductViewerState.init(entitlementsDataProductDetails);
      dataProductDataAccessState.init(auth.user?.access_token);
      this.loadingProductState.complete();
      const origin =
        entitlementsDataProductDetails.origin instanceof
        V1_SdlcDeploymentDataProductOrigin
          ? {
              type: DATAPRODUCT_TYPE.SDLC,
              groupId: entitlementsDataProductDetails.origin.group,
              artifactId: entitlementsDataProductDetails.origin.artifact,
              versionId: entitlementsDataProductDetails.origin.version,
            }
          : {
              type: DATAPRODUCT_TYPE.ADHOC,
            };
      LegendMarketplaceTelemetryHelper.logEvent_LoadDataProduct(
        this.marketplaceBaseStore.applicationStore.telemetryService,
        {
          origin: origin,
          dataProductId: dataProductId,
          deploymentId: deploymentId,
          name: entitlementsDataProductDetails.dataProduct.name,
          environmentClassification:
            entitlementsDataProductDetails.lakehouseEnvironment?.type,
        },
        undefined,
      );
    } catch (error) {
      assertErrorThrown(error);
      const message = `Unable to load product ${dataProductId}: ${error.message}`;
      this.marketplaceBaseStore.applicationStore.notificationService.notifyError(
        message,
      );
      this.loadingProductState.fail();
      LegendMarketplaceTelemetryHelper.logEvent_LoadDataProduct(
        this.marketplaceBaseStore.applicationStore.telemetryService,
        {
          dataProductId: dataProductId,
          deploymentId: deploymentId,
        },
        message,
      );
    }
  }

  /**
   * This is a fallback to support the old data product URL with GAV and path.
   * We check to see if the data product has been deployed, and if so, we redirect
   * to the new URL format with data product ID and deployment ID. If not, we show
   * an error saying the product is not deployed.
   *
   * @param gav The GAV coordinates of the product.
   * @param path The path to the product.
   */
  *initWithSDLCProduct(gav: string, path: string): GeneratorFn<void> {
    try {
      this.loadingProductState.inProgress();
      const projectData = VersionedProjectData.serialization.fromJson(
        parseGAVCoordinates(gav) as unknown as PlainObject,
      );
      try {
        const storeProject = new StoreProjectData();
        storeProject.groupId = projectData.groupId;
        storeProject.artifactId = projectData.artifactId;
        const v1DataProduct = deserialize(
          V1_dataProductModelSchema,
          (
            (yield this.marketplaceBaseStore.depotServerClient.getVersionEntity(
              projectData.groupId,
              projectData.artifactId,
              resolveVersion(projectData.versionId),
              path,
            )) as Entity
          ).content,
        );
        const files =
          (yield this.marketplaceBaseStore.depotServerClient.getGenerationFilesByType(
            storeProject,
            resolveVersion(projectData.versionId),
            ARTIFACT_GENERATION_DATA_PRODUCT_KEY,
          )) as StoredFileGeneration[];
        const fileGen = files.filter((e) => e.path === v1DataProduct.path)[0]
          ?.file.content;
        if (fileGen) {
          const content: PlainObject = JSON.parse(fileGen) as PlainObject;
          const gen = V1_DataProductArtifact.serialization.fromJson(content);
          const dataProductId = v1DataProduct.name.toUpperCase();
          const deploymentId = Number(gen.dataProduct.deploymentId);
          this.marketplaceBaseStore.applicationStore.navigationService.navigator.goToLocation(
            generateLakehouseDataProductPath(dataProductId, deploymentId),
          );
          this.loadingProductState.complete();
          LegendMarketplaceTelemetryHelper.logEvent_LoadSDLCDataProduct(
            this.marketplaceBaseStore.applicationStore.telemetryService,
            {
              path: path,
              origin: {
                type: DATAPRODUCT_TYPE.SDLC,
                groupId: projectData.groupId,
                artifactId: projectData.artifactId,
                versionId: projectData.versionId,
              },
              dataProductId: dataProductId,
              deploymentId: deploymentId,
            },
            undefined,
          );
        } else {
          throw new Error('File generation not found');
        }
      } catch (error) {
        assertErrorThrown(error);
        const message = `Unable to load product ${path}: ${error.message}`;
        this.marketplaceBaseStore.applicationStore.notificationService.notifyError(
          message,
        );
        this.loadingProductState.fail();
        LegendMarketplaceTelemetryHelper.logEvent_LoadSDLCDataProduct(
          this.marketplaceBaseStore.applicationStore.telemetryService,
          {
            path: path,
            origin: {
              type: DATAPRODUCT_TYPE.SDLC,
              groupId: projectData.groupId,
              artifactId: projectData.artifactId,
              versionId: projectData.versionId,
            },
          },
          message,
        );
      }
    } catch (error) {
      assertErrorThrown(error);
      this.marketplaceBaseStore.applicationStore.notificationService.notifyError(
        `Unable to deserialize gav for product ${path}: ${error.message}`,
      );
      this.loadingProductState.fail();
    }
  }

  *initWithLegacyProduct(gav: string, path: string): GeneratorFn<void> {
    try {
      this.loadingProductState.inProgress();
      const { groupId, artifactId, versionId } = parseGAVCoordinates(gav);
      try {
        // create graph manager
        const graphManagerState = new GraphManagerState(
          this.marketplaceBaseStore.applicationStore.pluginManager,
          this.marketplaceBaseStore.applicationStore.logService,
        );
        const graphManager = guaranteeType(
          graphManagerState.graphManager,
          V1_PureGraphManager,
          'GraphManager must be a V1_PureGraphManager',
        );

        // initialize graph manager
        yield graphManager.initialize(
          {
            env: this.marketplaceBaseStore.applicationStore.config.env,
            tabSize: DEFAULT_TAB_SIZE,
            clientConfig: {
              baseUrl:
                this.marketplaceBaseStore.applicationStore.config
                  .engineServerUrl,
              queryBaseUrl:
                this.marketplaceBaseStore.applicationStore.config
                  .engineQueryServerUrl,
              enableCompression: true,
            },
          },
          { engine: this.marketplaceBaseStore.remoteEngine },
        );
        yield graphManagerState.initializeSystem();

        // fetch project
        this.loadingProductState.setMessage(`Fetching project...`);
        const project = StoreProjectData.serialization.fromJson(
          (yield flowResult(
            this.marketplaceBaseStore.depotServerClient.getProject(
              groupId,
              artifactId,
            ),
          )) as PlainObject<StoreProjectData>,
        );

        // set origin
        graphManagerState.graph.setOrigin(
          new LegendSDLC(groupId, artifactId, resolveVersion(versionId)),
        );

        // analyze data product
        const analysisResult = (yield DSL_DataSpace_getGraphManagerExtension(
          graphManagerState.graphManager,
        ).analyzeDataSpace(
          path,
          () =>
            retrieveProjectEntitiesWithDependencies(
              project,
              versionId,
              this.marketplaceBaseStore.depotServerClient,
            ),
          () =>
            retrieveAnalyticsResultCache(
              project,
              versionId,
              path,
              this.marketplaceBaseStore.depotServerClient,
            ),
          this.loadingProductState,
        )) as DataSpaceAnalysisResult;

        const dataSpaceViewerState = new DataSpaceViewerState(
          this.marketplaceBaseStore.applicationStore,
          graphManagerState,
          groupId,
          artifactId,
          versionId,
          analysisResult,
          {
            retrieveGraphData: () =>
              new GraphDataWithOrigin(
                new LegendSDLC(groupId, artifactId, versionId),
              ),
            queryDataSpace: (executionContextKey: string) =>
              this.marketplaceBaseStore.applicationStore.navigationService.navigator.visitAddress(
                EXTERNAL_APPLICATION_NAVIGATION__generateDataSpaceQueryEditorUrl(
                  this.marketplaceBaseStore.applicationStore.config
                    .queryApplicationUrl,
                  groupId,
                  artifactId,
                  versionId,
                  analysisResult.path,
                  executionContextKey,
                  undefined,
                  undefined,
                ),
              ),
            viewProject: (entityPath: string | undefined) => {
              this.marketplaceBaseStore.applicationStore.navigationService.navigator.visitAddress(
                EXTERNAL_APPLICATION_NAVIGATION__generateStudioProjectViewUrl(
                  this.marketplaceBaseStore.applicationStore.config
                    .studioApplicationUrl,
                  groupId,
                  artifactId,
                  versionId,
                  entityPath,
                ),
              );
            },
            viewSDLCProject: async (entityPath: string | undefined) => {
              // find the matching SDLC instance
              const projectIDPrefix = parseProjectIdentifier(
                project.projectId,
              ).prefix;
              const matchingSDLCEntry =
                this.marketplaceBaseStore.applicationStore.config.studioInstances.find(
                  (entry) => entry.sdlcProjectIDPrefix === projectIDPrefix,
                );
              if (matchingSDLCEntry) {
                this.marketplaceBaseStore.applicationStore.navigationService.navigator.visitAddress(
                  EXTERNAL_APPLICATION_NAVIGATION__generateStudioSDLCProjectViewUrl(
                    matchingSDLCEntry.url,
                    project.projectId,
                    entityPath,
                  ),
                );
              } else {
                this.marketplaceBaseStore.applicationStore.notificationService.notifyWarning(
                  `Can't find the corresponding SDLC instance to view the SDLC project`,
                );
              }
            },
            queryClass: (_class: Class): void => {
              this.marketplaceBaseStore.applicationStore.navigationService.navigator.visitAddress(
                EXTERNAL_APPLICATION_NAVIGATION__generateDataSpaceQueryEditorUrl(
                  this.marketplaceBaseStore.applicationStore.config
                    .queryApplicationUrl,
                  groupId,
                  artifactId,
                  versionId,
                  analysisResult.path,
                  analysisResult.defaultExecutionContext.name,
                  undefined,
                  _class.path,
                ),
              );
            },
            openServiceQuery: (servicePath: string): void => {
              this.marketplaceBaseStore.applicationStore.navigationService.navigator.visitAddress(
                EXTERNAL_APPLICATION_NAVIGATION__generateServiceQueryCreatorUrl(
                  this.marketplaceBaseStore.applicationStore.config
                    .queryApplicationUrl,
                  groupId,
                  artifactId,
                  versionId,
                  servicePath,
                ),
              );
            },
            onZoneChange: (zone: NavigationZone | undefined): void => {
              if (zone === undefined) {
                this.marketplaceBaseStore.applicationStore.navigationService.navigator.resetZone();
              } else {
                this.marketplaceBaseStore.applicationStore.navigationService.navigator.updateCurrentZone(
                  zone,
                );
              }
            },
          },
        );
        this.setLegacyDataProductViewer(dataSpaceViewerState);
        this.loadingProductState.complete();
        LegendMarketplaceTelemetryHelper.logEvent_LoadLegacyDataProduct(
          this.marketplaceBaseStore.applicationStore.telemetryService,
          groupId,
          artifactId,
          versionId,
          path,
          undefined,
        );
      } catch (error) {
        assertErrorThrown(error);
        const message = `Unable to load legacy data product ${gav}::${path}: ${error.message}`;
        this.marketplaceBaseStore.applicationStore.notificationService.notifyError(
          message,
        );
        this.loadingProductState.fail();
        LegendMarketplaceTelemetryHelper.logEvent_LoadLegacyDataProduct(
          this.marketplaceBaseStore.applicationStore.telemetryService,
          groupId,
          artifactId,
          versionId,
          path,
          message,
        );
      }
    } catch (error) {
      assertErrorThrown(error);
      this.marketplaceBaseStore.applicationStore.notificationService.notifyError(
        `Unable to parse gav for product ${path}: ${error.message}`,
      );
      this.loadingProductState.fail();
    }
  }
}
