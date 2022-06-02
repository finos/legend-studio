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
  type ClassView,
  type DiagramRenderer,
  Diagram,
  DIAGRAM_INTERACTION_MODE,
} from '@finos/legend-extension-dsl-diagram';
import type {
  GraphManagerState,
  PackageableElementReference,
  PackageableRuntime,
} from '@finos/legend-graph';
import { guaranteeNonNullable } from '@finos/legend-shared';
import { action, computed, makeObservable, observable } from 'mobx';
import type {
  ResolvedDataSpace,
  ResolvedDataSpaceExecutionContext,
} from '../models/protocols/pure/DSLDataSpace_PureProtocolProcessorPlugin.js';

export enum DATA_SPACE_VIEWER_ACTIVITY_MODE {
  MODELS_OVERVIEW = 'MODELS_OVERVIEW',
  EXECUTION = 'EXECUTION',
  ENTITLEMENT = 'ENTITLEMENT',
  TEST_DATA = 'TEST_DATA',
  TEST_COVERAGE = 'TEST_COVERAGE',
  TAGS = 'TAGS',
  SUPPORT = 'SUPPORT',
}

export class DataSpaceViewerState {
  graphManagerState: GraphManagerState;
  dataSpaceGroupId: string;
  dataSpaceArtifactId: string;
  dataSpaceVersionId: string;
  dataSpace: ResolvedDataSpace;
  _renderer?: DiagramRenderer | undefined;
  currentDiagram?: Diagram | undefined;
  currentActivity = DATA_SPACE_VIEWER_ACTIVITY_MODE.MODELS_OVERVIEW;
  currentExecutionContext: ResolvedDataSpaceExecutionContext;
  currentRuntime: PackageableRuntime;
  viewProject?:
    | ((
        groupId: string,
        artifactId: string,
        versionId: string,
        entityPath: string | undefined,
      ) => void)
    | undefined;
  onDiagramClassDoubleClick?: ((classView: ClassView) => void) | undefined;

  constructor(
    graphManagerState: GraphManagerState,
    dataSpaceGroupId: string,
    dataSpaceArtifactId: string,
    dataSpaceVersionId: string,
    dataSpace: ResolvedDataSpace,
    options?: {
      viewProject?: (
        groupId: string,
        artifactId: string,
        versionId: string,
        entityPath: string | undefined,
      ) => void;
      onDiagramClassDoubleClick?: (classView: ClassView) => void;
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

    this.graphManagerState = graphManagerState;
    this.dataSpace = dataSpace;
    this.dataSpaceGroupId = dataSpaceGroupId;
    this.dataSpaceArtifactId = dataSpaceArtifactId;
    this.dataSpaceVersionId = dataSpaceVersionId;
    this.currentExecutionContext = this.dataSpace.defaultExecutionContext;
    this.currentRuntime =
      this.dataSpace.defaultExecutionContext.defaultRuntime.value;
    this.currentDiagram = this.dataSpace.featuredDiagrams.length
      ? (
          this.dataSpace
            .featuredDiagrams[0] as PackageableElementReference<Diagram>
        ).value
      : this.diagrams.length
      ? this.diagrams[0]
      : undefined;
    this.viewProject = options?.viewProject;
    this.onDiagramClassDoubleClick = options?.onDiagramClassDoubleClick;
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

  get featuredDiagrams(): Diagram[] {
    return this.dataSpace.featuredDiagrams.map((ref) => ref.value);
  }

  get diagrams(): Diagram[] {
    return this.graphManagerState.graph
      .getExtensionElements(Diagram)
      .concat(
        this.graphManagerState.graph.dependencyManager.getExtensionElements(
          Diagram,
        ),
      );
  }

  get runtimes(): PackageableRuntime[] {
    return this.graphManagerState.graph.ownRuntimes
      .concat(this.graphManagerState.graph.dependencyManager.runtimes)
      .filter((runtime) =>
        runtime.runtimeValue.mappings
          .map((mapping) => mapping.value)
          .includes(this.currentExecutionContext.mapping.value),
      );
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

  setCurrentExecutionContext(val: ResolvedDataSpaceExecutionContext): void {
    this.currentExecutionContext = val;
    this.currentRuntime = val.defaultRuntime.value;
  }

  setCurrentRuntime(val: PackageableRuntime): void {
    this.currentRuntime = val;
  }

  setupRenderer(): void {
    this.renderer.setIsReadOnly(true);
    this.renderer.onClassViewDoubleClick = (classView: ClassView): void =>
      this.onDiagramClassDoubleClick?.(classView);
  }
}
