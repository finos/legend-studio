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

import type { GenericLegendApplicationStore } from '@finos/legend-application';
import {
  type ClassView,
  type DiagramRenderer,
  type Diagram,
  DIAGRAM_INTERACTION_MODE,
} from '@finos/legend-extension-dsl-diagram';
import type {
  BasicGraphManagerState,
  PackageableRuntime,
} from '@finos/legend-graph';
import {
  getNullableFirstElement,
  guaranteeNonNullable,
} from '@finos/legend-shared';
import { action, computed, makeObservable, observable } from 'mobx';
import type {
  DataSpaceAnalysisResult,
  DataSpaceExecutionContextAnalysisResult,
} from '../graphManager/action/analytics/DataSpaceAnalysis.js';

export enum DATA_SPACE_VIEWER_ACTIVITY_MODE {
  DESCRIPTION = 'DESCRIPTION',
  DIAGRAMS = 'DIAGRAMS',
  MODELS_DOCUMENTATION = 'MODELS_DOCUMENTATION',
  QUICK_START = 'QUICK_START',
  EXECUTION_CONTEXT = 'EXECUTION_CONTEXT',
  DATA_ACCESS = 'DATA_ACCESS',

  DATA_STORES = 'DATA_STORES', // TODO: with test-data, also let user call TDS query on top of these
  DATA_AVAILABILITY = 'DATA_AVAILABILITY',
  DATA_COST = 'DATA_COST',
  DATA_GOVERNANCE = 'DATA_GOVERNANCE',
  INFO = 'INFO', // TODO: test coverage? (or maybe this should be done in elements/diagrams/data-quality section)
  SUPPORT = 'SUPPORT',
}

export class DataSpaceViewerState {
  readonly applicationStore: GenericLegendApplicationStore;
  readonly graphManagerState: BasicGraphManagerState;

  readonly groupId: string;
  readonly artifactId: string;
  readonly versionId: string;
  readonly dataSpaceAnalysisResult: DataSpaceAnalysisResult;
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

  _renderer?: DiagramRenderer | undefined;
  currentDiagram?: Diagram | undefined;
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
    },
  ) {
    makeObservable(this, {
      _renderer: observable,
      currentDiagram: observable,
      currentActivity: observable,
      currentExecutionContext: observable,
      currentRuntime: observable,
      renderer: computed,
      setRenderer: action,
      setCurrentDiagram: action,
      setCurrentActivity: action,
      setCurrentExecutionContext: action,
      setCurrentRuntime: action,
    });

    this.applicationStore = applicationStore;
    this.graphManagerState = graphManagerState;
    this.dataSpaceAnalysisResult = dataSpaceAnalysisResult;
    this.groupId = groupId;
    this.artifactId = artifactId;
    this.versionId = versionId;
    this.currentExecutionContext =
      dataSpaceAnalysisResult.defaultExecutionContext;
    this.currentRuntime = this.currentExecutionContext.defaultRuntime;
    this.currentDiagram = getNullableFirstElement(
      this.dataSpaceAnalysisResult.featuredDiagrams,
    );
    this.viewProject = actions.viewProject;
    this.viewSDLCProject = actions.viewSDLCProject;
    this.onDiagramClassDoubleClick = actions.onDiagramClassDoubleClick;
  }

  get renderer(): DiagramRenderer {
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
    if (this.renderer.middleClick || this.renderer.rightClick) {
      return 'diagram-editor__cursor--grabbing';
    }
    switch (this.renderer.interactionMode) {
      case DIAGRAM_INTERACTION_MODE.LAYOUT: {
        if (this.renderer.mouseOverClassView) {
          return 'diagram-editor__cursor--pointer';
        }
        return '';
      }
      default:
        return '';
    }
  }

  setRenderer(val: DiagramRenderer): void {
    this._renderer = val;
  }

  setCurrentDiagram(val: Diagram): void {
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

  setupRenderer(): void {
    this.renderer.setIsReadOnly(true);
    this.renderer.setEnableLayoutAutoAdjustment(true);
    this.renderer.onClassViewDoubleClick = (classView: ClassView): void =>
      this.onDiagramClassDoubleClick(classView);
  }
}
