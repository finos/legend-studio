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
} from '@finos/legend-graph';
import { action, computed, flowResult, makeObservable, observable } from 'mobx';
import {
  type DataSpaceAnalysisResult,
  type DataSpaceExecutionContextAnalysisResult,
  DataproductReferenceMetadata,
  LakehouseDataProductExecutableAccessorInfo,
} from '../graph-manager/action/analytics/DataSpaceAnalysis.js';
import { isSnapshotVersion } from '@finos/legend-server-depot';
import {
  PURE_DATA_SPACE_INFO_PROFILE_PATH,
  PURE_DATA_SPACE_INFO_PROFILE_VERIFIED_STEREOTYPE,
} from '../graph-manager/DSL_DataSpace_PureGraphManagerPlugin.js';
import { DataSpaceViewerModelsDocumentationState } from './DataSpaceModelsDocumentationState.js';
import { DataSpaceViewerDiagramViewerState } from './DataSpaceViewerDiagramViewerState.js';
import {
  DATA_SPACE_WIKI_PAGE_SECTIONS,
  DataSpaceLayoutState,
} from './DataSpaceLayoutState.js';
import {
  DATA_SPACE_VIEWER_ACTIVITY_MODE,
  generateAnchorForActivity,
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

export class DataSpaceViewerState {
  readonly applicationStore: GenericLegendApplicationStore;
  readonly graphManagerState: GraphManagerState;
  readonly layoutState: DataSpaceLayoutState;

  readonly dataSpaceAnalysisResult: DataSpaceAnalysisResult;
  readonly groupId: string;
  readonly artifactId: string;
  readonly versionId: string;
  readonly retrieveGraphData: () => GraphData;
  readonly queryDataSpace: (executionContextKey: string) => void;
  readonly viewProject: (path: string | undefined) => void;
  readonly viewSDLCProject: (path: string | undefined) => Promise<void>;
  readonly onZoneChange?:
    | ((zone: NavigationZone | undefined) => void)
    | undefined;
  readonly queryClass: (_class: Class) => void;
  readonly openServiceQuery: (servicePath: string) => void;
  readonly onQuickStartTabChange?:
    | ((tabKey: string, executableTitle: string) => void)
    | undefined;
  readonly viewDataProduct?:
    | ((dataProductPath: string, deploymentId: number) => void)
    | undefined;
  readonly mappingProviderAccessConfig?:
    | DataSpaceMappingProviderAccessConfig
    | undefined;
  readonly fetchDataSpaceQuality?:
    | (() => Promise<DataSpaceQualityResult>)
    | undefined;

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

  constructor(
    applicationStore: GenericLegendApplicationStore,
    graphManagerState: GraphManagerState,
    groupId: string,
    artifactId: string,
    versionId: string,
    dataSpaceAnalysisResult: DataSpaceAnalysisResult,
    actions: {
      retrieveGraphData: () => GraphData;
      queryDataSpace: (executionContextKey: string) => void;
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
      mappingProviderAccessConfig?:
        | DataSpaceMappingProviderAccessConfig
        | undefined;
      fetchDataSpaceQuality?:
        | (() => Promise<DataSpaceQualityResult>)
        | undefined;
    },
  ) {
    makeObservable(this, {
      currentActivity: observable,
      currentExecutionContext: observable,
      currentRuntime: observable,
      currentDataAccessState: observable,
      dataProductAccessStates: observable.shallow,
      currentMappingProviderAccessState: computed,
      executableStates: observable,
      legendAIConfig: observable,
      isVerified: computed,
      isDataAccessAvailable: computed,
      setCurrentActivity: action,
      setCurrentExecutionContext: action,
      setCurrentRuntime: action,
      refreshCurrentMappingProviderAccessState: action,
      refreshDataProductAccessState: action,
    });

    this.applicationStore = applicationStore;
    this.graphManagerState = graphManagerState;
    this.layoutState = new DataSpaceLayoutState(this);

    this.dataSpaceAnalysisResult = dataSpaceAnalysisResult;
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
    this.onZoneChange = actions.onZoneChange;
    this.queryClass = actions.queryClass;
    this.openServiceQuery = actions.openServiceQuery;
    this.onQuickStartTabChange = actions.onQuickStartTabChange;
    this.viewDataProduct = actions.viewDataProduct;
    this.mappingProviderAccessConfig = actions.mappingProviderAccessConfig;
    this.fetchDataSpaceQuality = actions.fetchDataSpaceQuality;

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
  }

  get isVerified(): boolean {
    return Boolean(
      this.dataSpaceAnalysisResult.stereotypes.find(
        (stereotype) =>
          stereotype.profile === PURE_DATA_SPACE_INFO_PROFILE_PATH &&
          stereotype.value === PURE_DATA_SPACE_INFO_PROFILE_VERIFIED_STEREOTYPE,
      ),
    );
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

  syncZoneWithNavigation(zone: NavigationZone): void {
    this.layoutState.setCurrentNavigationZone(zone);
    this.onZoneChange?.(zone);
  }

  changeZone(zone: NavigationZone, force = false): void {
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
        if (DATA_SPACE_WIKI_PAGE_SECTIONS.includes(matchingActivity)) {
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
