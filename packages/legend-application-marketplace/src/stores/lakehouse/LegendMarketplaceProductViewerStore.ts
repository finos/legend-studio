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
  DEFAULT_TAB_SIZE,
  EXTERNAL_APPLICATION_NAVIGATION__generateStudioProjectViewUrl,
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
} from '@finos/legend-shared';
import {
  type Class,
  type TDSExecutionResult,
  type TDSRowDataType,
  type V1_EntitlementsDataProductDetailsResponse,
  type V1_Terminal,
  DataProductArtifactGeneration,
  getRowDataFromExecutionResult,
  GraphDataWithOrigin,
  GraphManagerState,
  LegendSDLC,
  V1_DataProduct,
  V1_dataProductModelSchema,
  V1_entitlementsDataProductDetailsResponseToDataProductDetails,
  V1_PureGraphManager,
  V1_SdlcDeploymentDataProductOrigin,
  V1_TerminalModelSchema,
} from '@finos/legend-graph';
import { DataProductViewerState } from './DataProductViewerState.js';
import type { AuthContextProps } from 'react-oidc-context';
import { getDataProductFromDetails } from './LakehouseUtils.js';
import {
  parseGAVCoordinates,
  type StoredFileGeneration,
  type Entity,
  parseProjectIdentifier,
} from '@finos/legend-storage';
import { deserialize } from 'serializr';
import {
  EXTERNAL_APPLICATION_NAVIGATION__generateDataSpaceQueryCreatorRoute,
  EXTERNAL_APPLICATION_NAVIGATION__generateStudioSDLCProjectViewUrl,
  generateLakehouseDataProductPath,
} from '../../__lib__/LegendMarketplaceNavigation.js';
import { TerminalProductViewerState } from './TerminalProductViewerState.js';
import {
  DataProductLayoutState,
  TerminalProductLayoutState,
} from './BaseLayoutState.js';
import {
  DataSpaceViewerState,
  EXTERNAL_APPLICATION_NAVIGATION__generateServiceQueryCreatorUrl,
} from '@finos/legend-extension-dsl-data-space/application';
import {
  type DataSpaceAnalysisResult,
  DSL_DataSpace_getGraphManagerExtension,
  retrieveAnalyticsResultCache,
} from '@finos/legend-extension-dsl-data-space/graph';

const ARTIFACT_GENERATION_DAT_PRODUCT_KEY = 'dataProduct';

export class LegendMarketplaceProductViewerStore {
  readonly marketplaceBaseStore: LegendMarketplaceBaseStore;
  dataProductViewer: DataProductViewerState | undefined;
  terminalProductViewer: TerminalProductViewerState | undefined;
  legacyProductViewer: DataSpaceViewerState | undefined;

  readonly loadingProductState = ActionState.create();

  constructor(marketplaceBaseStore: LegendMarketplaceBaseStore) {
    this.marketplaceBaseStore = marketplaceBaseStore;

    makeObservable(this, {
      dataProductViewer: observable,
      terminalProductViewer: observable,
      legacyProductViewer: observable,
      setDataProductViewer: action,
      setTerminalProductViewer: action,
      setLegacyProductViewer: action,
      initWithProduct: flow,
      initWithTerminal: flow,
      initWithSDLCProduct: flow,
      initWithLegacyProduct: flow,
    });
  }

  setDataProductViewer(val: DataProductViewerState | undefined): void {
    this.dataProductViewer = val;
  }

  setTerminalProductViewer(val: TerminalProductViewerState | undefined): void {
    this.terminalProductViewer = val;
  }

  setLegacyProductViewer(val: DataSpaceViewerState | undefined): void {
    this.legacyProductViewer = val;
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
    } catch (error) {
      assertErrorThrown(error);
      this.marketplaceBaseStore.applicationStore.notificationService.notifyError(
        `Unable to load terminal ${terminalId}: ${error.message}`,
      );
      this.loadingProductState.fail();
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

      const dataProductDetails = guaranteeNonNullable(
        fetchedDataProductDetails[0],
      );
      // Crete graph manager for parsing ad-hoc deployed data products
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
      const v1DataProduct = guaranteeType(
        yield getDataProductFromDetails(
          dataProductDetails,
          graphManager,
          this.marketplaceBaseStore,
        ),
        V1_DataProduct,
        `Unable to get V1_DataProduct from details for id: ${dataProductDetails.id}`,
      );

      const stateViewer = new DataProductViewerState(
        this,
        new DataProductLayoutState(),
        graphManagerState,
        v1DataProduct,
        dataProductDetails,
        {
          viewDataProductSource: () => {
            if (
              dataProductDetails.origin instanceof
              V1_SdlcDeploymentDataProductOrigin
            ) {
              this.marketplaceBaseStore.applicationStore.navigationService.navigator.visitAddress(
                EXTERNAL_APPLICATION_NAVIGATION__generateStudioProjectViewUrl(
                  this.marketplaceBaseStore.applicationStore.config
                    .studioApplicationUrl,
                  dataProductDetails.origin.group,
                  dataProductDetails.origin.artifact,
                  dataProductDetails.origin.version,
                  v1DataProduct.path,
                ),
              );
            }
          },
        },
      );
      this.setDataProductViewer(stateViewer);
      stateViewer.fetchContracts(auth.user?.access_token);
      this.loadingProductState.complete();
    } catch (error) {
      assertErrorThrown(error);
      this.marketplaceBaseStore.applicationStore.notificationService.notifyError(
        `Unable to load product ${dataProductId}: ${error.message}`,
      );
      this.loadingProductState.fail();
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
          ARTIFACT_GENERATION_DAT_PRODUCT_KEY,
        )) as StoredFileGeneration[];
      const fileGen = files.filter((e) => e.path === v1DataProduct.path)[0]
        ?.file.content;
      if (fileGen) {
        const content: PlainObject = JSON.parse(fileGen) as PlainObject;
        const gen =
          DataProductArtifactGeneration.serialization.fromJson(content);
        const dataProductId = v1DataProduct.name.toUpperCase();
        const deploymentId = Number(gen.dataProduct.deploymentId);
        this.marketplaceBaseStore.applicationStore.navigationService.navigator.goToLocation(
          generateLakehouseDataProductPath(dataProductId, deploymentId),
        );
      } else {
        throw new Error('File generation not found');
      }
    } catch (error) {
      assertErrorThrown(error);
      this.marketplaceBaseStore.applicationStore.notificationService.notifyError(
        `Unable to load product ${path}: ${error.message}`,
      );
      this.loadingProductState.fail();
    }
  }

  *initWithLegacyProduct(gav: string, path: string): GeneratorFn<void> {
    try {
      this.loadingProductState.inProgress();

      const { groupId, artifactId, versionId } = parseGAVCoordinates(gav);

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

      // create graph manager
      // Crete graph manager for parsing ad-hoc deployed data products
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
            EXTERNAL_APPLICATION_NAVIGATION__generateDataSpaceQueryCreatorRoute(
              groupId,
              artifactId,
              versionId,
              analysisResult.path,
              executionContextKey,
            ),
          viewProject: (_path) => {
            this.marketplaceBaseStore.applicationStore.navigationService.navigator.visitAddress(
              EXTERNAL_APPLICATION_NAVIGATION__generateStudioProjectViewUrl(
                this.marketplaceBaseStore.applicationStore.config
                  .studioApplicationUrl,
                groupId,
                artifactId,
                versionId,
                _path,
              ),
            );
          },
          viewSDLCProject: async () => {
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
                  undefined,
                  path,
                ),
              );
            } else {
              this.marketplaceBaseStore.applicationStore.notificationService.notifyWarning(
                `Can't find the corresponding SDLC instance to view the SDLC project`,
              );
            }
          },
          queryClass: (_class: Class): void => {
            this.marketplaceBaseStore.applicationStore.navigationService.navigator.goToLocation(
              EXTERNAL_APPLICATION_NAVIGATION__generateDataSpaceQueryCreatorRoute(
                groupId,
                artifactId,
                versionId,
                analysisResult.path,
                Object.values(analysisResult.executionContextsIndex).find(
                  (executionContext) =>
                    executionContext === analysisResult.defaultExecutionContext,
                ),
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
        },
      );
      this.setLegacyProductViewer(dataSpaceViewerState);
      this.loadingProductState.complete();
    } catch (error) {
      assertErrorThrown(error);
      this.marketplaceBaseStore.applicationStore.notificationService.notifyError(
        `Unable to load legacy data product ${gav}::${path}: ${error.message}`,
      );
      this.loadingProductState.fail();
    }
  }
}
