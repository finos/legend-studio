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
  guaranteeNonNullable,
  type GeneratorFn,
  assertErrorThrown,
  StopWatch,
  LogEvent,
  assertNonEmptyString,
} from '@finos/legend-shared';
import type { EditorStore } from '../editor/EditorStore.js';
import { flow, flowResult, makeObservable, observable } from 'mobx';
import type { ShowcaseViewerPathParams } from '../../__lib__/LegendStudioNavigation.js';
import { LEGEND_STUDIO_APP_EVENT } from '../../__lib__/LegendStudioEvent.js';
import {
  ShowcaseRegistryServerClient,
  type Showcase,
} from '@finos/legend-server-showcase';
import {
  DependencyGraphBuilderError,
  GRAPH_MANAGER_EVENT,
  GraphBuilderError,
  GraphDataDeserializationError,
  createGraphBuilderReport,
} from '@finos/legend-graph';
import { DEFAULT_TAB_SIZE } from '@finos/legend-application';
import { payloadDebugger } from '../editor/panel-group/DevToolPanelState.js';
import { LegendStudioTelemetryHelper } from '../../__lib__/LegendStudioTelemetryHelper.js';
import { GRAPH_EDITOR_MODE } from '../editor/EditorConfig.js';
import type { Entity } from '@finos/legend-storage';

export class ShowcaseViewerStore {
  readonly editorStore: EditorStore;
  private readonly showcaseServerClient?: ShowcaseRegistryServerClient;
  _showcase: Showcase | undefined;

  constructor(editorStore: EditorStore) {
    this.editorStore = editorStore;
    makeObservable(this, {
      _showcase: observable,
      initialize: flow,
      buildGraph: flow,
    });
    if (this.editorStore.applicationStore.config.showcaseServerUrl) {
      this.showcaseServerClient = new ShowcaseRegistryServerClient({
        baseUrl: this.editorStore.applicationStore.config.showcaseServerUrl,
      });
    }
  }

  private get client(): ShowcaseRegistryServerClient {
    return guaranteeNonNullable(
      this.showcaseServerClient,
      `Showcase registry server client is not configured`,
    );
  }

  get showcase(): Showcase {
    return guaranteeNonNullable(this._showcase);
  }

  setShowcase(val: Showcase): void {
    this._showcase = val;
  }

  *initialize(params: ShowcaseViewerPathParams): GeneratorFn<void> {
    if (!this.editorStore.initState.isInInitialState) {
      return;
    }

    const showcasePath = params.showcasePath;
    this.editorStore.initState.inProgress();
    const onLeave = (hasBuildSucceeded: boolean): void => {
      this.editorStore.initState.complete(hasBuildSucceeded);
    };

    try {
      const stopWatch = new StopWatch();
      assertNonEmptyString(showcasePath, 'Showcase path expected');
      // fetch showcase
      this.editorStore.initState.setMessage(`Fetching Showcase Data...`);
      this._showcase = (yield this.client.getShowcase(
        showcasePath,
      )) as Showcase;
      LegendStudioTelemetryHelper.logEvent_ShowcaseManagerShowcaseProjectLaunch(
        this.editorStore.applicationStore.telemetryService,
        {
          showcasePath: showcasePath,
        },
      );
      // initialize graph manager
      yield this.editorStore.graphManagerState.graphManager.initialize(
        {
          env: this.editorStore.applicationStore.config.env,
          tabSize: DEFAULT_TAB_SIZE,
          clientConfig: {
            baseUrl: this.editorStore.applicationStore.config.engineServerUrl,
            queryBaseUrl:
              this.editorStore.applicationStore.config.engineQueryServerUrl,
            enableCompression: true,
            payloadDebugger,
          },
        },
        {
          tracerService: this.editorStore.applicationStore.tracerService,
        },
      );
      // convert code to entities
      stopWatch.record();
      const grammar = this.showcase.code;
      this.editorStore.initState.setMessage(
        `Converting showcase code to entities...`,
      );
      const entities =
        (yield this.editorStore.graphManagerState.graphManager.pureCodeToEntities(
          grammar,
          // we want to keep section index so we read imports correctly
          {
            TEMPORARY__keepSectionIndex: true,
          },
        )) as Entity[];
      this.editorStore.initState.setMessage(undefined);
      stopWatch.record(GRAPH_MANAGER_EVENT.FETCH_GRAPH_ENTITIES__SUCCESS);
      const graphBuilderResult = (yield flowResult(
        this.buildGraph(entities),
      )) as boolean;

      if (!graphBuilderResult) {
        onLeave(false);
        return;
      }
      this.editorStore.initState.setMessage(`Generating elements...`);
      if (
        this.editorStore.graphManagerState.graph.ownGenerationSpecifications
          .length
      ) {
        yield flowResult(
          this.editorStore.graphState.graphGenerationState.globalGenerate(),
        );
      }

      // build explorer tree
      this.editorStore.explorerTreeState.buildImmutableModelTrees();
      this.editorStore.explorerTreeState.build();

      // complete actions
      this.editorStore.initState.setMessage(undefined);
      onLeave(true);
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.SDLC_MANAGER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notificationService.notifyError(error);
      onLeave(false);
    }
  }

  *buildGraph(entities: Entity[]): GeneratorFn<boolean> {
    try {
      const stopWatch = new StopWatch();
      yield this.editorStore.graphManagerState.initializeSystem();

      // reset
      this.editorStore.graphManagerState.resetGraph();

      // build dependencies
      stopWatch.record();
      const dependencyManager =
        this.editorStore.graphManagerState.graphManager.createDependencyManager();
      this.editorStore.graphManagerState.graph.dependencyManager =
        dependencyManager;

      const dependency_buildReport = createGraphBuilderReport();
      yield this.editorStore.graphManagerState.graphManager.buildDependencies(
        this.editorStore.graphManagerState.coreModel,
        this.editorStore.graphManagerState.systemModel,
        dependencyManager,
        new Map(),
        this.editorStore.graphManagerState.dependenciesBuildState,
        {},
        dependency_buildReport,
      );

      // build graph
      const graph_buildReport = createGraphBuilderReport();
      yield this.editorStore.graphManagerState.graphManager.buildGraph(
        this.editorStore.graphManagerState.graph,
        entities,
        this.editorStore.graphManagerState.graphBuildState,
        undefined,
        graph_buildReport,
      );

      // report
      stopWatch.record(GRAPH_MANAGER_EVENT.INITIALIZE_GRAPH__SUCCESS);
      const graphBuilderReportData = {
        timings:
          this.editorStore.applicationStore.timeService.finalizeTimingsRecord(
            stopWatch,
          ),
        dependencies: dependency_buildReport,
        dependenciesCount:
          this.editorStore.graphManagerState.graph.dependencyManager
            .numberOfDependencies,
        graph: graph_buildReport,
      };
      LegendStudioTelemetryHelper.logEvent_GraphInitializationSucceeded(
        this.editorStore.applicationStore.telemetryService,
        graphBuilderReportData,
      );

      this.editorStore.applicationStore.logService.info(
        LogEvent.create(GRAPH_MANAGER_EVENT.INITIALIZE_GRAPH__SUCCESS),
        graphBuilderReportData,
      );

      // fetch available editor configurations
      yield Promise.all([
        this.editorStore.graphState.graphGenerationState.globalFileGenerationState.fetchAvailableFileGenerationDescriptions(),
        this.editorStore.graphState.graphGenerationState.externalFormatState.fetchExternalFormatDescriptions(),
        this.editorStore.graphState.fetchAvailableFunctionActivatorConfigurations(),
      ]);

      return true;
    } catch (error) {
      assertErrorThrown(error);

      // if graph builder fails, we fall back to text-mode
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(GRAPH_MANAGER_EVENT.GRAPH_BUILDER_FAILURE),
        error,
      );
      if (error instanceof DependencyGraphBuilderError) {
        // no recovery if dependency models cannot be built, this makes assumption that all dependencies models are compiled successfully
        // TODO: we might want to handle this more gracefully when we can show people the dependency model element in the future
        this.editorStore.applicationStore.notificationService.notifyError(
          `Can't initialize dependency models. Error: ${error.message}`,
        );
        this.editorStore.applicationStore.alertService.setBlockingAlert({
          message: `Can't initialize dependencies`,
          prompt: 'Please use editor to better invesigate the issue',
        });
      } else if (error instanceof GraphDataDeserializationError) {
        // if something goes wrong with de-serialization, we can't really do anything but to alert
        this.editorStore.applicationStore.notificationService.notifyError(
          `Can't deserialize graph. Error: ${error.message}`,
        );
        this.editorStore.applicationStore.alertService.setBlockingAlert({
          message: `Can't deserialize graph`,
          prompt: 'Please use editor to better invesigate the issue',
        });
      } else if (error instanceof GraphBuilderError) {
        // TODO: we should split this into 2 notifications when we support multiple notifications
        this.editorStore.applicationStore.notificationService.notifyError(
          `Can't build graph. Redirected to text mode for debugging. Error: ${error.message}`,
        );
        yield flowResult(
          this.editorStore.switchModes(GRAPH_EDITOR_MODE.GRAMMAR_TEXT, {
            isGraphBuildFailure: true,
          }),
        );
        if (this.editorStore.graphEditorMode.mode === GRAPH_EDITOR_MODE.FORM) {
          // nothing we can do here so we will just block the user
          this.editorStore.applicationStore.alertService.setBlockingAlert({
            message: `Can't compose Pure code from graph models`,
            prompt: 'Please use editor to better invesigate the issue',
          });
          return false;
        }
      } else {
        this.editorStore.applicationStore.notificationService.notifyError(
          error,
        );
      }
      return false;
    }
  }
}
