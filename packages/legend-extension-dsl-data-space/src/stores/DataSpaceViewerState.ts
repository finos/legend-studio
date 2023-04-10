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
  type ClassView,
  type DiagramRenderer,
  DIAGRAM_INTERACTION_MODE,
} from '@finos/legend-extension-dsl-diagram';
import type {
  BasicGraphManagerState,
  GraphData,
  PackageableRuntime,
} from '@finos/legend-graph';
import {
  getNullableFirstElement,
  guaranteeNonNullable,
} from '@finos/legend-shared';
import { action, computed, makeObservable, observable } from 'mobx';
import type {
  DataSpaceAnalysisResult,
  DataSpaceDiagramAnalysisResult,
  DataSpaceExecutionContextAnalysisResult,
} from '../graphManager/action/analytics/DataSpaceAnalysis.js';
import {
  PURE_DATA_SPACE_INFO_PROFILE_PATH,
  PURE_DATA_SPACE_INFO_PROFILE_VERIFIED_STEREOTYPE,
} from '../graphManager/DSL_DataSpace_PureGraphManagerPlugin.js';
import { DataSpaceViewerDataAccessState } from './DataSpaceViewerDataAccessState.js';
import { DataSpaceViewerModelsDocumentationState } from './DataSpaceModelsDocumentationState.js';

export enum DATA_SPACE_VIEWER_ACTIVITY_MODE {
  DESCRIPTION = 'description',
  DIAGRAM_VIEWER = 'diagram_viewer',
  MODELS_DOCUMENTATION = 'models_documentation',
  QUICK_START = 'quick_start',
  EXECUTION_CONTEXT = 'execution_context',
  DATA_ACCESS = 'data_access',

  DATA_STORES = 'data_stores', // TODO: with test-data, also let user call TDS query on top of these
  DATA_AVAILABILITY = 'data_availability',
  DATA_READINESS = 'data_readiness',
  DATA_COST = 'data_cost',
  DATA_GOVERNANCE = 'data_governance',
  INFO = 'info', // TODO: test coverage? (or maybe this should be done in elements/diagrams/data-quality section)
  SUPPORT = 'support',
}

class DataSpaceLayoutState {
  readonly dataSpaceViewerState: DataSpaceViewerState;

  isExpandedModeEnabled = false;

  constructor(dataSpaceViewerState: DataSpaceViewerState) {
    makeObservable(this, {
      isExpandedModeEnabled: observable,
      enableExpandedMode: action,
    });

    this.dataSpaceViewerState = dataSpaceViewerState;
  }

  enableExpandedMode(val: boolean): void {
    this.isExpandedModeEnabled = val;
  }
}

export class DataSpaceViewerState {
  readonly applicationStore: GenericLegendApplicationStore;
  readonly graphManagerState: BasicGraphManagerState;
  readonly layoutState: DataSpaceLayoutState;

  readonly dataSpaceAnalysisResult: DataSpaceAnalysisResult;
  readonly groupId: string;
  readonly artifactId: string;
  readonly versionId: string;
  readonly retriveGraphData: () => GraphData;
  readonly viewProject: (
    groupId: string,
    artifactId: string,
    versionId: string,
    entityPath: string | undefined,
  ) => void;
  readonly viewSDLCProject: (
    groupId: string,
    artifactId: string,
    entityPath: string | undefined,
  ) => Promise<void>;
  readonly onDiagramClassDoubleClick: (classView: ClassView) => void;
  readonly onZoneChange?:
    | ((zone: NavigationZone | undefined) => void)
    | undefined;

  readonly dataAccessState: DataSpaceViewerDataAccessState;
  readonly modelsDocumentationState: DataSpaceViewerModelsDocumentationState;

  _renderer?: DiagramRenderer | undefined;
  currentDiagram?: DataSpaceDiagramAnalysisResult | undefined;
  currentActivity = DATA_SPACE_VIEWER_ACTIVITY_MODE.DESCRIPTION;
  currentExecutionContext: DataSpaceExecutionContextAnalysisResult;
  currentRuntime: PackageableRuntime;

  constructor(
    applicationStore: GenericLegendApplicationStore,
    graphManagerState: BasicGraphManagerState,
    groupId: string,
    artifactId: string,
    versionId: string,
    dataSpaceAnalysisResult: DataSpaceAnalysisResult,
    actions: {
      retriveGraphData: () => GraphData;
      viewProject: (
        groupId: string,
        artifactId: string,
        versionId: string,
        entityPath: string | undefined,
      ) => void;
      viewSDLCProject: (
        groupId: string,
        artifactId: string,
        entityPath: string | undefined,
      ) => Promise<void>;
      onDiagramClassDoubleClick: (classView: ClassView) => void;
      onZoneChange?: ((zone: NavigationZone | undefined) => void) | undefined;
    },
  ) {
    makeObservable(this, {
      _renderer: observable,
      currentDiagram: observable,
      currentActivity: observable,
      currentExecutionContext: observable,
      currentRuntime: observable,
      isVerified: computed,
      diagramRenderer: computed,
      setDiagramRenderer: action,
      setCurrentDiagram: action,
      setCurrentActivity: action,
      setCurrentExecutionContext: action,
      setCurrentRuntime: action,
    });

    this.applicationStore = applicationStore;
    this.graphManagerState = graphManagerState;
    this.layoutState = new DataSpaceLayoutState(this);

    this.dataSpaceAnalysisResult = dataSpaceAnalysisResult;
    this.groupId = groupId;
    this.artifactId = artifactId;
    this.versionId = versionId;
    this.currentExecutionContext =
      dataSpaceAnalysisResult.defaultExecutionContext;
    this.currentRuntime = this.currentExecutionContext.defaultRuntime;
    this.currentDiagram = getNullableFirstElement(
      this.dataSpaceAnalysisResult.diagrams,
    );
    this.retriveGraphData = actions.retriveGraphData;
    this.viewProject = actions.viewProject;
    this.viewSDLCProject = actions.viewSDLCProject;
    this.onDiagramClassDoubleClick = actions.onDiagramClassDoubleClick;
    this.onZoneChange = actions.onZoneChange;

    this.dataAccessState = new DataSpaceViewerDataAccessState(this);
    this.modelsDocumentationState = new DataSpaceViewerModelsDocumentationState(
      this,
    );
  }

  get diagramRenderer(): DiagramRenderer {
    return guaranteeNonNullable(
      this._renderer,
      `Diagram renderer must be initialized (this is likely caused by calling this method at the wrong place)`,
    );
  }

  get isDiagramRendererInitialized(): boolean {
    return Boolean(this._renderer);
  }

  // NOTE: we have tried to use React to control the cursor and
  // could not overcome the jank/lag problem, so we settle with CSS-based approach
  // See https://css-tricks.com/using-css-cursors/
  // See https://developer.mozilla.org/en-US/docs/Web/CSS/cursor
  get diagramCursorClass(): string {
    if (!this.isDiagramRendererInitialized) {
      return '';
    }
    if (this.diagramRenderer.middleClick || this.diagramRenderer.rightClick) {
      return 'diagram-editor__cursor--grabbing';
    }
    switch (this.diagramRenderer.interactionMode) {
      case DIAGRAM_INTERACTION_MODE.LAYOUT: {
        if (this.diagramRenderer.mouseOverClassView) {
          return 'diagram-editor__cursor--pointer';
        }
        return '';
      }
      default:
        return '';
    }
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

  setDiagramRenderer(val: DiagramRenderer): void {
    this._renderer = val;
  }

  setCurrentDiagram(val: DataSpaceDiagramAnalysisResult): void {
    this.currentDiagram = val;
  }

  setCurrentActivity(val: DATA_SPACE_VIEWER_ACTIVITY_MODE): void {
    this.currentActivity = val;
  }

  setCurrentExecutionContext(
    val: DataSpaceExecutionContextAnalysisResult,
  ): void {
    this.currentExecutionContext = val;
    this.currentRuntime = val.defaultRuntime;
  }

  setCurrentRuntime(val: PackageableRuntime): void {
    this.currentRuntime = val;
  }

  setupDiagramRenderer(): void {
    this.diagramRenderer.setIsReadOnly(true);
    this.diagramRenderer.setEnableLayoutAutoAdjustment(true);
    this.diagramRenderer.onClassViewDoubleClick = (
      classView: ClassView,
    ): void => this.onDiagramClassDoubleClick(classView);
  }

  changeZone(zone: NavigationZone): void {
    switch (zone) {
      case DATA_SPACE_VIEWER_ACTIVITY_MODE.DESCRIPTION:
      case DATA_SPACE_VIEWER_ACTIVITY_MODE.DIAGRAM_VIEWER:
      case DATA_SPACE_VIEWER_ACTIVITY_MODE.MODELS_DOCUMENTATION:
      case DATA_SPACE_VIEWER_ACTIVITY_MODE.QUICK_START: {
        this.setCurrentActivity(DATA_SPACE_VIEWER_ACTIVITY_MODE.DESCRIPTION);
        break;
      }
      case DATA_SPACE_VIEWER_ACTIVITY_MODE.EXECUTION_CONTEXT: {
        this.setCurrentActivity(
          DATA_SPACE_VIEWER_ACTIVITY_MODE.EXECUTION_CONTEXT,
        );
        break;
      }
      case DATA_SPACE_VIEWER_ACTIVITY_MODE.DATA_ACCESS: {
        this.setCurrentActivity(DATA_SPACE_VIEWER_ACTIVITY_MODE.DATA_ACCESS);
        break;
      }
      case DATA_SPACE_VIEWER_ACTIVITY_MODE.DATA_STORES: {
        this.setCurrentActivity(DATA_SPACE_VIEWER_ACTIVITY_MODE.DATA_STORES);
        break;
      }
      case DATA_SPACE_VIEWER_ACTIVITY_MODE.DATA_AVAILABILITY: {
        this.setCurrentActivity(
          DATA_SPACE_VIEWER_ACTIVITY_MODE.DATA_AVAILABILITY,
        );
        break;
      }
      case DATA_SPACE_VIEWER_ACTIVITY_MODE.DATA_READINESS: {
        this.setCurrentActivity(DATA_SPACE_VIEWER_ACTIVITY_MODE.DATA_READINESS);
        break;
      }
      case DATA_SPACE_VIEWER_ACTIVITY_MODE.DATA_COST: {
        this.setCurrentActivity(DATA_SPACE_VIEWER_ACTIVITY_MODE.DATA_COST);
        break;
      }
      case DATA_SPACE_VIEWER_ACTIVITY_MODE.DATA_GOVERNANCE: {
        this.setCurrentActivity(
          DATA_SPACE_VIEWER_ACTIVITY_MODE.DATA_GOVERNANCE,
        );
        break;
      }
      case DATA_SPACE_VIEWER_ACTIVITY_MODE.INFO: {
        this.setCurrentActivity(DATA_SPACE_VIEWER_ACTIVITY_MODE.INFO);
        break;
      }
      case DATA_SPACE_VIEWER_ACTIVITY_MODE.SUPPORT: {
        this.setCurrentActivity(DATA_SPACE_VIEWER_ACTIVITY_MODE.SUPPORT);
        break;
      }
      default: {
        // unknown
        this.setCurrentActivity(DATA_SPACE_VIEWER_ACTIVITY_MODE.DESCRIPTION);
        this.onZoneChange?.(undefined);
        break;
      }
    }
  }
}
