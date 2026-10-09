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
  NAVIGATION_ZONE_SEPARATOR,
  type GenericLegendApplicationStore,
  type NavigationZone,
} from '@finos/legend-application';
import {
  type Class,
  type GraphData,
  type GraphManagerState,
  type PackageableRuntime,
  extractElementNameFromPath,
} from '@finos/legend-graph';
import {
  action,
  computed,
  flow,
  flowResult,
  makeObservable,
  observable,
} from 'mobx';
import {
  type DataSpaceAnalysisResult,
  type DataSpaceExecutionContextAnalysisResult,
  DataproductReferenceMetadata,
  LakehouseDataProductExecutableAccessorInfo,
} from '../graph-manager/action/analytics/DataSpaceAnalysis.js';
import {
  isSnapshotVersion,
  resolveVersion,
  type DepotServerClient,
} from '@finos/legend-server-depot';
import { DataSpaceViewerModelsDocumentationState } from './DataSpaceModelsDocumentationState.js';
import { DataSpaceViewerDiagramViewerState } from './DataSpaceViewerDiagramViewerState.js';
import {
  DATA_SPACE_WIKI_PAGE_SECTIONS,
  DataSpaceLayoutState,
} from './DataSpaceLayoutState.js';
import {
  type DataSpaceWikiRelatedDataSpace,
  DATA_SPACE_VIEWER_ACTIVITY_MODE,
  generateAnchorForActivity,
  parseRelatedDataSpaceGAVs,
} from './DataSpaceViewerNavigation.js';
import { DataAccessState } from '@finos/legend-query-builder';
import {
  DEFAULT_LEGEND_AI_CONFIG,
  type LegendAIConfig,
} from '@finos/legend-lego/legend-ai';
import { DataSpaceQuickStartState } from './DataSpaceQuickStartState.js';
import { DataSpaceViewerExecutableState } from './DataSpaceViewerExecutableState.js';
import {
  type DataSpaceMappingProviderAccessConfig,
  DataSpaceDataProductAccessState,
} from './DataSpaceDataProductAccessState.js';
import {
  DataSpaceQualityState,
  type DataSpaceQualityResult,
} from './DataSpaceQualityState.js';
import { BaseViewerState } from '@finos/legend-extension-dsl-data-product';
import {
  type GeneratorFn,
  ActionState,
  assertErrorThrown,
  guaranteeNonNullable,
  isString,
} from '@finos/legend-shared';
import { type Entity } from '@finos/legend-storage';

export class DataSpaceViewerState extends BaseViewerState<
  DataSpaceAnalysisResult,
  DataSpaceLayoutState
> {
  readonly graphManagerState: GraphManagerState;

  readonly groupId: string;
  readonly artifactId: string;
  readonly versionId: string;
  readonly retrieveGraphData: () => GraphData;
  readonly queryDataSpace: (executionContextKey: string | undefined) => void;
  readonly viewProject: (path: string | undefined) => void;
  readonly viewSDLCProject: (path: string | undefined) => Promise<void>;
  readonly queryClass: (_class: Class) => void;
  readonly openServiceQuery: (servicePath: string) => void;
  readonly onQuickStartTabChange?:
    | ((tabKey: string, executableTitle: string) => void)
    | undefined;
  readonly viewDataProduct?:
    | ((dataProductPath: string, deploymentId: number) => void)
    | undefined;
  readonly viewDataSpace?: ((gavPath: string) => void) | undefined;
  readonly mappingProviderAccessConfig?:
    | DataSpaceMappingProviderAccessConfig
    | undefined;
  readonly fetchDataSpaceQuality?:
    | (() => Promise<DataSpaceQualityResult>)
    | undefined;
  readonly depotServerClient?: DepotServerClient | undefined;

  readonly diagramViewerState: DataSpaceViewerDiagramViewerState;
  readonly modelsDocumentationState: DataSpaceViewerModelsDocumentationState;
  readonly quickStartState: DataSpaceQuickStartState;
  readonly qualityState: DataSpaceQualityState;
  legendAIConfig: LegendAIConfig;
  executableStates: DataSpaceViewerExecutableState[] = [];

  currentActivity = DATA_SPACE_VIEWER_ACTIVITY_MODE.DESCRIPTION;
  currentDataAccessState?: DataAccessState | undefined;
  currentExecutionContext?: DataSpaceExecutionContextAnalysisResult | undefined;
  currentRuntime?: PackageableRuntime | undefined;
  /**
   * Cache of Data Product access states keyed by the Data Product element
   * path. Feeds both:
   *   - execution-context "mappingProvider" Request Access button
   *   - executable-per-APG Request Access buttons (all APGs of a given DP
   *     share the same access state instance)
   * Avoids re-hitting Lakehouse when the user switches execution context or
   * scrolls through executables that reference the same DP.
   */
  dataProductAccessStates = new Map<string, DataSpaceDataProductAccessState>();

  relatedDataSpaces: DataSpaceWikiRelatedDataSpace[] = [];
  readonly fetchRelatedDataSpaceTitlesState = ActionState.create();

  constructor(
    applicationStore: GenericLegendApplicationStore,
    graphManagerState: GraphManagerState,
    groupId: string,
    artifactId: string,
    versionId: string,
    dataSpaceAnalysisResult: DataSpaceAnalysisResult,
    depotServerClient: DepotServerClient | undefined,
    actions: {
      retrieveGraphData: () => GraphData;
      queryDataSpace: (executionContextKey: string | undefined) => void;
      viewProject: (path: string | undefined) => void;
      viewSDLCProject: (path: string | undefined) => Promise<void>;
      queryClass: (_class: Class) => void;
      openServiceQuery: (servicePath: string) => void;
      onZoneChange?: ((zone: NavigationZone | undefined) => void) | undefined;
      onQuickStartTabChange?:
        | ((tabKey: string, executableTitle: string) => void)
        | undefined;
      viewDataProduct?:
        | ((dataProductPath: string, deploymentId: number) => void)
        | undefined;
      viewDataSpace?: ((gavPath: string) => void) | undefined;
      mappingProviderAccessConfig?:
        | DataSpaceMappingProviderAccessConfig
        | undefined;
      fetchDataSpaceQuality?:
        | (() => Promise<DataSpaceQualityResult>)
        | undefined;
    },
  ) {
    super(
      dataSpaceAnalysisResult,
      applicationStore,
      new DataSpaceLayoutState(),
      {
        onZoneChange: actions.onZoneChange,
      },
    );
    this.layoutState.setViewerState(this);

    makeObservable(this, {
      currentActivity: observable,
      currentExecutionContext: observable,
      currentRuntime: observable,
      currentDataAccessState: observable,
      dataProductAccessStates: observable.shallow,
      currentMappingProviderAccessState: computed,
      executableStates: observable,
      legendAIConfig: observable,
      isDataAccessAvailable: computed,
      referencedDataProductPaths: computed,
      relatedDataSpaces: observable,
      setCurrentActivity: action,
      setCurrentExecutionContext: action,
      setCurrentRuntime: action,
      refreshCurrentMappingProviderAccessState: action,
      refreshDataProductAccessState: action,
      fetchRelatedDataSpaceTitles: flow,
    });

    this.graphManagerState = graphManagerState;

    this.executableStates = this.dataSpaceAnalysisResult.executables.map(
      (exec) => new DataSpaceViewerExecutableState(this, exec),
    );
    this.groupId = groupId;
    this.artifactId = artifactId;
    this.versionId = versionId;
    this.retrieveGraphData = actions.retrieveGraphData;
    this.queryDataSpace = actions.queryDataSpace;
    this.viewProject = actions.viewProject;
    this.viewSDLCProject = actions.viewSDLCProject;
    this.queryClass = actions.queryClass;
    this.openServiceQuery = actions.openServiceQuery;
    this.onQuickStartTabChange = actions.onQuickStartTabChange;
    this.viewDataProduct = actions.viewDataProduct;
    this.viewDataSpace = actions.viewDataSpace;
    this.mappingProviderAccessConfig = actions.mappingProviderAccessConfig;
    this.fetchDataSpaceQuality = actions.fetchDataSpaceQuality;
    this.depotServerClient = depotServerClient;

    this.currentExecutionContext =
      dataSpaceAnalysisResult.defaultExecutionContext ??
      Array.from(dataSpaceAnalysisResult.executionContextsIndex.values())[0];
    this.currentRuntime = this.currentExecutionContext?.defaultRuntime;
    if (this.currentExecutionContext && this.currentRuntime) {
      this.currentDataAccessState = new DataAccessState(
        this.applicationStore,
        this.graphManagerState,
        {
          initialDatasets: this.currentExecutionContext.datasets,
          mapping: this.currentExecutionContext.mapping.path,
          runtime: this.currentRuntime.path,
          getQuery: async () => undefined,
          graphData: this.retrieveGraphData(),
        },
      );
    }

    this.modelsDocumentationState = new DataSpaceViewerModelsDocumentationState(
      this,
    );
    this.diagramViewerState = new DataSpaceViewerDiagramViewerState(this);
    this.quickStartState = new DataSpaceQuickStartState(this);
    this.qualityState = new DataSpaceQualityState(this);
    this.legendAIConfig = DEFAULT_LEGEND_AI_CONFIG;
    this.initMappingProviderAccessState();
    this.initExecutableAccessStates();
    this.initReferencedDataProductAccessStates();
  }

  get dataSpaceAnalysisResult(): DataSpaceAnalysisResult {
    return this.product;
  }

  protected getValidSections(): string[] {
    return this.wikiPageSectionsToRender.map((activity) =>
      generateAnchorForActivity(activity),
    );
  }

  get wikiPageSectionsToRender(): DATA_SPACE_VIEWER_ACTIVITY_MODE[] {
    if (this.referencedDataProductPaths.length > 0) {
      return DATA_SPACE_WIKI_PAGE_SECTIONS;
    }
    return DATA_SPACE_WIKI_PAGE_SECTIONS.filter(
      (section) =>
        section !== DATA_SPACE_VIEWER_ACTIVITY_MODE.DATASPACE_LAKEHOUSE_ACCESS,
    );
  }

  override get documentationUrl(): string | undefined {
    return this.dataSpaceAnalysisResult.supportInfo?.documentationUrl;
  }

  get isDataAccessAvailable(): boolean {
    return this.currentExecutionContext !== undefined;
  }

  get currentMappingProviderAccessState():
    | DataSpaceDataProductAccessState
    | undefined {
    const mappingProvider =
      this.currentExecutionContext?.mappingProvider?.element;
    if (!mappingProvider) {
      return undefined;
    }
    return this.dataProductAccessStates.get(mappingProvider);
  }

  /**
   * Look up the Lakehouse deployment id for a Data Product path from the
   * DataSpace analytics' `dataSpaceReferencesMetadataInfo`. Picks the
   * prod-parallel DID for SNAPSHOT versions of the DataSpace, and the
   * production DID otherwise. Returns undefined if the analytics didn't
   * ship a DID for this DP (the DP might not be an entitled Lakehouse DP).
   */
  resolveDeploymentIdForDataProduct(
    dataProductPath: string,
  ): number | undefined {
    const useProdParallel = isSnapshotVersion(this.versionId);
    for (const metadata of this.dataSpaceAnalysisResult
      .dataSpaceReferencesMetadataInfo) {
      if (
        metadata instanceof DataproductReferenceMetadata &&
        metadata.dataproductPath === dataProductPath
      ) {
        const raw = useProdParallel
          ? metadata.prodParallel
          : metadata.production;
        if (raw === undefined || raw === '') {
          return undefined;
        }
        const num = Number(raw);
        return Number.isFinite(num) ? num : undefined;
      }
    }
    return undefined;
  }

  private buildDataProductAccessState(
    dataProductPath: string,
  ): DataSpaceDataProductAccessState | undefined {
    if (!this.mappingProviderAccessConfig) {
      return undefined;
    }
    if (this.dataProductAccessStates.has(dataProductPath)) {
      return this.dataProductAccessStates.get(dataProductPath);
    }
    const deploymentId =
      this.resolveDeploymentIdForDataProduct(dataProductPath);
    if (deploymentId === undefined) {
      return undefined;
    }
    const state = new DataSpaceDataProductAccessState(
      this.applicationStore,
      this.graphManagerState,
      {
        groupId: this.groupId,
        artifactId: this.artifactId,
        versionId: this.versionId,
      },
      dataProductPath,
      deploymentId,
      this.mappingProviderAccessConfig,
    );
    this.dataProductAccessStates.set(dataProductPath, state);
    // eslint-disable-next-line no-void
    void flowResult(state.initialize()).catch(() => undefined);
    return state;
  }

  /**
   * Ensures a `DataSpaceDataProductAccessState` exists (and has been
   * initialized) for the current execution context's mapping provider. Reuses
   * the cached entry keyed by the mapping provider (Data Product) path when
   * possible so switching execution contexts does not re-hit Lakehouse.
   */
  private initMappingProviderAccessState(): void {
    const mappingProvider =
      this.currentExecutionContext?.mappingProvider?.element;
    if (!mappingProvider) {
      return;
    }
    this.buildDataProductAccessState(mappingProvider);
  }

  /**
   * Pre-warms access states for every unique Data Product path referenced by
   * any executable's `executableAccessorInfo`. All APGs of a given DP share
   * a single access state instance (the underlying viewer state exposes all
   * APG states of the DP once initialized).
   */
  private initExecutableAccessStates(): void {
    const seen = new Set<string>();
    for (const exec of this.dataSpaceAnalysisResult.executables) {
      for (const accessor of exec.executableAccessorInfo) {
        if (accessor instanceof LakehouseDataProductExecutableAccessorInfo) {
          if (seen.has(accessor.dataProductPath)) {
            continue;
          }
          seen.add(accessor.dataProductPath);
          this.buildDataProductAccessState(accessor.dataProductPath);
        }
      }
    }
  }

  private initReferencedDataProductAccessStates(): void {
    for (const path of this.referencedDataProductPaths) {
      this.buildDataProductAccessState(path);
    }
  }

  get referencedDataProductPaths(): string[] {
    const paths: string[] = [];
    const seen = new Set<string>();
    for (const metadata of this.dataSpaceAnalysisResult
      .dataSpaceReferencesMetadataInfo) {
      if (
        metadata instanceof DataproductReferenceMetadata &&
        !seen.has(metadata.dataproductPath)
      ) {
        seen.add(metadata.dataproductPath);
        paths.push(metadata.dataproductPath);
      }
    }
    return paths;
  }

  *fetchRelatedDataSpaceTitles(): GeneratorFn<void> {
    if (!this.fetchRelatedDataSpaceTitlesState.isInInitialState) {
      return;
    }
    const relatedDataSpaces = (
      this.dataSpaceAnalysisResult.info?.relatedDataSpaces ?? []
    ).flatMap((entry) => parseRelatedDataSpaceGAVs(entry));
    this.fetchRelatedDataSpaceTitlesState.inProgress();
    if (!this.depotServerClient) {
      this.relatedDataSpaces = relatedDataSpaces;
      this.fetchRelatedDataSpaceTitlesState.pass();
      return;
    }
    const depotServerClient = this.depotServerClient;
    const results = (yield Promise.allSettled(
      relatedDataSpaces.map(async (relatedDataSpace) => {
        const entity = await depotServerClient.getVersionEntity(
          relatedDataSpace.groupId,
          relatedDataSpace.artifactId,
          resolveVersion(relatedDataSpace.versionId),
          relatedDataSpace.path,
        );
        const content = entity.content as Entity['content'];
        return {
          ...relatedDataSpace,
          name: isString(content.title) ? content.title : relatedDataSpace.name,
        };
      }),
    )) as PromiseSettledResult<DataSpaceWikiRelatedDataSpace>[];
    this.relatedDataSpaces = results.map((result, idx) => {
      if (result.status === 'fulfilled') {
        return result.value;
      }
      const relatedDataSpace = guaranteeNonNullable(relatedDataSpaces[idx]);
      assertErrorThrown(result.reason);
      return {
        ...relatedDataSpace,
        name: extractElementNameFromPath(relatedDataSpace.path),
        isInvalid: true,
      };
    });
    this.fetchRelatedDataSpaceTitlesState.pass();
  }

  /**
   * Looks up the initialized access state for a Data Product path (may still
   * be initializing). Used by executable renderers to grab the state for a
   * specific `(dpPath, apgId)` accessor.
   */
  getDataProductAccessState(
    dataProductPath: string,
  ): DataSpaceDataProductAccessState | undefined {
    return this.dataProductAccessStates.get(dataProductPath);
  }

  /**
   * Evicts the cached access state for the current execution context's mapping
   * provider and rebuilds it, re-running the full resolve + init flow
   * (Lakehouse data-product details, contracts / entitlements / ingest
   * fetches, and per-APG user access status).
   */
  refreshCurrentMappingProviderAccessState(): void {
    const mappingProvider =
      this.currentExecutionContext?.mappingProvider?.element;
    if (!mappingProvider) {
      return;
    }
    this.dataProductAccessStates.delete(mappingProvider);
    this.buildDataProductAccessState(mappingProvider);
  }

  /**
   * Evicts and rebuilds the access state for a specific Data Product. Used by
   * per-executable refresh actions.
   */
  refreshDataProductAccessState(dataProductPath: string): void {
    this.dataProductAccessStates.delete(dataProductPath);
    this.buildDataProductAccessState(dataProductPath);
  }

  setCurrentActivity(val: DATA_SPACE_VIEWER_ACTIVITY_MODE): void {
    this.currentActivity = val;
  }

  setCurrentExecutionContext(
    val: DataSpaceExecutionContextAnalysisResult,
  ): void {
    this.currentExecutionContext = val;
    this.currentRuntime = val.defaultRuntime;
    if (this.currentRuntime) {
      this.currentDataAccessState = new DataAccessState(
        this.applicationStore,
        this.graphManagerState,
        {
          initialDatasets: val.datasets,
          mapping: val.mapping.path,
          runtime: this.currentRuntime.path,
          getQuery: async () => undefined,
          graphData: this.retrieveGraphData(),
        },
      );
    } else {
      this.currentDataAccessState = undefined;
    }
    this.initMappingProviderAccessState();
  }

  setCurrentRuntime(val: PackageableRuntime): void {
    this.currentRuntime = val;
  }

  override changeZone(zone: NavigationZone, force = false): void {
    if (force) {
      this.layoutState.setCurrentNavigationZone('');
    }
    if (zone !== this.layoutState.currentNavigationZone) {
      const zoneChunks = zone.split(NAVIGATION_ZONE_SEPARATOR);
      const activityChunk = zoneChunks[0];
      const matchingActivity = Object.values(
        DATA_SPACE_VIEWER_ACTIVITY_MODE,
      ).find(
        (activity) => generateAnchorForActivity(activity) === activityChunk,
      );
      if (activityChunk && matchingActivity) {
        if (this.wikiPageSectionsToRender.includes(matchingActivity)) {
          this.layoutState.setWikiPageAnchorToNavigate({
            anchor: zone,
          });
        }
        this.setCurrentActivity(matchingActivity);
        this.onZoneChange?.(zone);
        this.layoutState.setCurrentNavigationZone(zone);
      } else {
        this.setCurrentActivity(DATA_SPACE_VIEWER_ACTIVITY_MODE.DESCRIPTION);
        this.layoutState.setCurrentNavigationZone('');
      }
    }
  }
}
