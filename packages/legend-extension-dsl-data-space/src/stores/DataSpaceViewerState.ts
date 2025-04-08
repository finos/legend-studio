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
import { action, computed, makeObservable, observable } from 'mobx';
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
import { DataSpaceQuickStartState } from './DataSpaceQuickStartState.js';
import { DataSpaceViewerExecutableState } from './DataSpaceViewerExecutableState.js';

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

  readonly diagramViewerState: DataSpaceViewerDiagramViewerState;
  readonly modelsDocumentationState: DataSpaceViewerModelsDocumentationState;
  readonly quickStartState: DataSpaceQuickStartState;
  executableStates: DataSpaceViewerExecutableState[] = [];

  currentActivity = DATA_SPACE_VIEWER_ACTIVITY_MODE.DESCRIPTION;
  currentDataAccessState: DataAccessState;
  currentExecutionContext: DataSpaceExecutionContextAnalysisResult;
  currentRuntime: PackageableRuntime;

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
    },
  ) {
    makeObservable(this, {
      currentActivity: observable,
      currentExecutionContext: observable,
      currentRuntime: observable,
      currentDataAccessState: observable,
      executableStates: observable,
      isVerified: computed,
      setCurrentActivity: action,
      setCurrentExecutionContext: action,
      setCurrentRuntime: action,
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

    this.currentExecutionContext =
      dataSpaceAnalysisResult.defaultExecutionContext;
    this.currentRuntime = this.currentExecutionContext.defaultRuntime;
    this.currentDataAccessState = new DataAccessState(
      this.applicationStore,
      this.graphManagerState,
      {
        initialDatasets: this.currentExecutionContext.datasets,
        mapping: this.currentExecutionContext.mapping.path,
        runtime: this.currentExecutionContext.defaultRuntime.path,
        getQuery: async () => undefined,
        graphData: this.retrieveGraphData(),
      },
    );

    this.modelsDocumentationState = new DataSpaceViewerModelsDocumentationState(
      this,
    );
    this.diagramViewerState = new DataSpaceViewerDiagramViewerState(this);
    this.quickStartState = new DataSpaceQuickStartState(this);
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

  setCurrentActivity(val: DATA_SPACE_VIEWER_ACTIVITY_MODE): void {
    this.currentActivity = val;
  }

  setCurrentExecutionContext(
    val: DataSpaceExecutionContextAnalysisResult,
  ): void {
    this.currentExecutionContext = val;
    this.currentRuntime = val.defaultRuntime;
    this.currentDataAccessState = new DataAccessState(
      this.applicationStore,
      this.graphManagerState,
      {
        initialDatasets: val.datasets,
        mapping: val.mapping.path,
        runtime: val.defaultRuntime.path,
        getQuery: async () => undefined,
        graphData: this.retrieveGraphData(),
      },
    );
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
