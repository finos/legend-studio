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
  ClassView,
  DiagramRenderer,
} from '@finos/legend-extension-dsl-diagram';
import {
  Diagram,
  DIAGRAM_INTERACTION_MODE,
} from '@finos/legend-extension-dsl-diagram';
import type {
  Class,
  PackageableElementReference,
  PackageableRuntime,
} from '@finos/legend-graph';
import type { Entity } from '@finos/legend-model-storage';
import type { QuerySetupStore } from '@finos/legend-query';
import {
  CreateQueryInfoState,
  QuerySetupState,
  generateCreateQueryRoute,
} from '@finos/legend-query';
import type { StoredEntity } from '@finos/legend-server-depot';
import { ProjectData } from '@finos/legend-server-depot';
import type { GeneratorFn, PlainObject } from '@finos/legend-shared';
import {
  ActionState,
  assertErrorThrown,
  guaranteeNonNullable,
} from '@finos/legend-shared';
import {
  action,
  computed,
  flow,
  flowResult,
  makeObservable,
  observable,
} from 'mobx';
import type {
  ResolvedDataSpace,
  ResolvedDataSpaceExecutionContext,
} from '../../models/protocols/pure/DSLDataSpace_PureProtocolProcessorPlugin';
import {
  DATA_SPACE_ELEMENT_CLASSIFIER_PATH,
  getResolvedDataSpace,
} from '../../models/protocols/pure/DSLDataSpace_PureProtocolProcessorPlugin';

export type LightDataSpace = Entity & {
  groupId: string;
  artifactId: string;
  versionId: string;
  path: string;
  content: {
    groupId: string;
    artifactId: string;
    versionId: string;
  };
};

export enum DATA_SPACE_VIEWER_ACTIVITY_MODE {
  MODELS_OVERVIEW = 'MODELS_OVERVIEW',
  EXECUTION = 'EXECUTION',
  ENTITLEMENT = 'ENTITLEMENT',
  TEST_DATA = 'TEST_DATA',
  SUPPORT = 'SUPPORT',
}

export class DataSpaceViewerState {
  setupState: DataSpaceQuerySetupState;
  lightDataSpace: LightDataSpace;
  dataSpace: ResolvedDataSpace;
  _renderer?: DiagramRenderer | undefined;
  currentDiagram?: Diagram | undefined;
  currentActivity = DATA_SPACE_VIEWER_ACTIVITY_MODE.MODELS_OVERVIEW;
  currentExecutionContext: ResolvedDataSpaceExecutionContext;
  currentRuntime: PackageableRuntime;

  constructor(
    setupState: DataSpaceQuerySetupState,
    lightDataSpace: LightDataSpace,
    dataSpace: ResolvedDataSpace,
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

    this.setupState = setupState;
    this.dataSpace = dataSpace;
    this.lightDataSpace = lightDataSpace;
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
    return this.setupState.queryStore.graphManagerState.graph
      .getExtensionElements(Diagram)
      .concat(
        this.setupState.queryStore.graphManagerState.graph.dependencyManager.getExtensionElements(
          Diagram,
        ),
      );
  }

  get runtimes(): PackageableRuntime[] {
    return this.setupState.queryStore.graphManagerState.graph.ownRuntimes
      .concat(
        this.setupState.queryStore.graphManagerState.graph.dependencyManager
          .runtimes,
      )
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
    this.renderer.onClassViewDoubleClick = (classView: ClassView): void => {
      this.setupState.proceedToCreateQuery(classView.class.value);
    };
  }
}

export class DataSpaceQuerySetupState extends QuerySetupState {
  dataSpaces: LightDataSpace[] = [];
  loadDataSpacesState = ActionState.create();
  setUpDataSpaceState = ActionState.create();
  currentDataSpace?: LightDataSpace | undefined;
  dataSpaceViewerState?: DataSpaceViewerState | undefined;

  constructor(setupStore: QuerySetupStore) {
    super(setupStore);

    makeObservable(this, {
      dataSpaces: observable,
      currentDataSpace: observable.ref,
      dataSpaceViewerState: observable,
      setCurrentDataSpace: action,
      setDataSpaceViewerState: action,
      loadDataSpaces: flow,
      setUpDataSpace: flow,
      proceedToCreateQuery: flow,
    });
  }

  setCurrentDataSpace(val: LightDataSpace | undefined): void {
    this.currentDataSpace = val;
  }

  setDataSpaceViewerState(val: DataSpaceViewerState | undefined): void {
    this.dataSpaceViewerState = val;
  }

  *loadDataSpaces(searchText: string): GeneratorFn<void> {
    if (this.queryStore.initState.isInInitialState) {
      yield flowResult(this.queryStore.initialize());
    } else if (this.queryStore.initState.isInProgress) {
      return;
    }
    const isValidSearchString = searchText.length >= 3;
    this.loadDataSpacesState.inProgress();
    try {
      this.dataSpaces = (
        (yield this.queryStore.depotServerClient.getEntitiesByClassifierPath(
          DATA_SPACE_ELEMENT_CLASSIFIER_PATH,
          {
            search: isValidSearchString ? searchText : undefined,
            limit: 10,
          },
        )) as StoredEntity[]
      )
        // .map((storedEntity) => storedEntity.entity)
        .map(
          (storedEntity) =>
            ({
              ...storedEntity.entity,
              groupId: storedEntity.groupId,
              artifactId: storedEntity.artifactId,
              versionId: storedEntity.versionId,
              path: storedEntity.entity.path,
              content: {
                ...storedEntity.entity.content,
                groupId: guaranteeNonNullable(
                  storedEntity.entity.content.groupId,
                  `Data space 'groupId' field is missing`,
                ),
                artifactId: guaranteeNonNullable(
                  storedEntity.entity.content.artifactId,
                  `Data space 'artifactId' field is missing`,
                ),
                versionId: guaranteeNonNullable(
                  storedEntity.entity.content.versionId,
                  `Data space 'versionId' field is missing`,
                ),
              },
            } as LightDataSpace),
        );
      this.loadDataSpacesState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.loadDataSpacesState.fail();
      this.queryStore.applicationStore.notifyError(error);
    }
  }

  *setUpDataSpace(dataSpace: LightDataSpace): GeneratorFn<void> {
    if (this.queryStore.initState.isInInitialState) {
      yield flowResult(this.queryStore.initialize());
    } else if (this.queryStore.initState.isInProgress) {
      return;
    }
    this.setUpDataSpaceState.inProgress();
    try {
      const projectData = ProjectData.serialization.fromJson(
        (yield flowResult(
          this.queryStore.depotServerClient.getProject(
            dataSpace.content.groupId,
            dataSpace.content.artifactId,
          ),
        )) as PlainObject<ProjectData>,
      );
      yield flowResult(
        this.queryStore.buildGraph(projectData, dataSpace.content.versionId),
      );
      const resolvedDataSpace = getResolvedDataSpace(
        dataSpace.content,
        this.queryStore.graphManagerState.graph,
      );
      this.dataSpaceViewerState = new DataSpaceViewerState(
        this,
        dataSpace,
        resolvedDataSpace,
      );
      this.setUpDataSpaceState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.setUpDataSpaceState.fail();
      this.queryStore.applicationStore.notifyError(error);
    }
  }

  *proceedToCreateQuery(_class?: Class): GeneratorFn<void> {
    if (this.dataSpaceViewerState) {
      const projectData = ProjectData.serialization.fromJson(
        (yield flowResult(
          this.queryStore.depotServerClient.getProject(
            this.dataSpaceViewerState.dataSpace.groupId,
            this.dataSpaceViewerState.dataSpace.artifactId,
          ),
        )) as PlainObject<ProjectData>,
      );
      const queryInfoState = new CreateQueryInfoState(
        this.queryStore,
        projectData,
        this.dataSpaceViewerState.dataSpace.versionId,
        this.dataSpaceViewerState.currentExecutionContext.mapping.value,
        this.dataSpaceViewerState.currentRuntime,
      );
      queryInfoState.class = _class;
      this.queryStore.setQueryInfoState(queryInfoState);
      this.queryStore.applicationStore.navigator.goTo(
        generateCreateQueryRoute(
          this.dataSpaceViewerState.dataSpace.groupId,
          this.dataSpaceViewerState.dataSpace.artifactId,
          this.dataSpaceViewerState.dataSpace.versionId,
          this.dataSpaceViewerState.currentExecutionContext.mapping.value.path,
          this.dataSpaceViewerState.currentRuntime.path,
        ),
      );
      this.setupStore.setSetupState(undefined);
    }
  }
}
