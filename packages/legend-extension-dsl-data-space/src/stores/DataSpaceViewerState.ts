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
} from '../graph-manager/action/analytics/DataSpaceAnalysis.js';
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
  DataSpaceMappingProviderAccessState,
} from './DataSpaceMappingProviderAccessState.js';

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
    | ((
        groupId: string,
        artifactId: string,
        versionId: string,
        dataProductPath: string,
      ) => void)
    | undefined;
  readonly mappingProviderAccessConfig?:
    | DataSpaceMappingProviderAccessConfig
    | undefined;

  readonly diagramViewerState: DataSpaceViewerDiagramViewerState;
  readonly modelsDocumentationState: DataSpaceViewerModelsDocumentationState;
  readonly quickStartState: DataSpaceQuickStartState;
  legendAIConfig: LegendAIConfig;
  executableStates: DataSpaceViewerExecutableState[] = [];

  currentActivity = DATA_SPACE_VIEWER_ACTIVITY_MODE.DESCRIPTION;
  currentDataAccessState?: DataAccessState | undefined;
  currentExecutionContext?: DataSpaceExecutionContextAnalysisResult | undefined;
  currentRuntime?: PackageableRuntime | undefined;
  /**
   * Cache of mapping-provider access states keyed by the mapping provider
   * (Data Product) element path. Multiple execution contexts often point at
   * the same underlying Data Product, so caching avoids re-hitting
   * depot + Lakehouse every time the user switches execution context.
   */
  mappingProviderAccessStates = new Map<
    string,
    DataSpaceMappingProviderAccessState
  >();

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
        | ((
            groupId: string,
            artifactId: string,
            versionId: string,
            dataProductPath: string,
          ) => void)
        | undefined;
      mappingProviderAccessConfig?:
        | DataSpaceMappingProviderAccessConfig
        | undefined;
    },
  ) {
    makeObservable(this, {
      currentActivity: observable,
      currentExecutionContext: observable,
      currentRuntime: observable,
      currentDataAccessState: observable,
      mappingProviderAccessStates: observable.shallow,
      currentMappingProviderAccessState: computed,
      executableStates: observable,
      legendAIConfig: observable,
      isVerified: computed,
      setCurrentActivity: action,
      setCurrentExecutionContext: action,
      setCurrentRuntime: action,
      refreshCurrentMappingProviderAccessState: action,
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
    this.legendAIConfig = DEFAULT_LEGEND_AI_CONFIG;
    this.initMappingProviderAccessState();
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

  get currentMappingProviderAccessState():
    | DataSpaceMappingProviderAccessState
    | undefined {
    const mappingProvider =
      this.currentExecutionContext?.mappingProvider?.element;
    if (!mappingProvider) {
      return undefined;
    }
    return this.mappingProviderAccessStates.get(mappingProvider);
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

  /**
   * Ensures a `DataSpaceMappingProviderAccessState` exists (and has been
   * initialized) for the current execution context's mapping provider. Reuses
   * the cached entry keyed by the mapping provider (Data Product) path when
   * possible so switching execution contexts does not re-hit depot / Lakehouse.
   */
  private initMappingProviderAccessState(): void {
    const mappingProvider =
      this.currentExecutionContext?.mappingProvider?.element;
    if (!mappingProvider || !this.mappingProviderAccessConfig) {
      return;
    }
    if (this.mappingProviderAccessStates.has(mappingProvider)) {
      return;
    }
    const state = new DataSpaceMappingProviderAccessState(
      this.applicationStore,
      this.graphManagerState,
      {
        groupId: this.groupId,
        artifactId: this.artifactId,
        versionId: this.versionId,
      },
      mappingProvider,
      this.mappingProviderAccessConfig,
    );
    this.mappingProviderAccessStates.set(mappingProvider, state);
    // eslint-disable-next-line no-void
    void flowResult(state.initialize()).catch(() => undefined);
  }

  /**
   * Evicts the cached access state for the current execution context's mapping
   * provider and rebuilds it, re-running the full resolve + init flow (depot
   * artifact fetch, Lakehouse data-product details, contracts / entitlements
   * / ingest fetches, and per-APG user access status).
   */
  refreshCurrentMappingProviderAccessState(): void {
    const mappingProvider =
      this.currentExecutionContext?.mappingProvider?.element;
    if (!mappingProvider) {
      return;
    }
    this.mappingProviderAccessStates.delete(mappingProvider);
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
