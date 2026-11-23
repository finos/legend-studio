/**
 * Copyright (c) 2026-present, Goldman Sachs
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

import { APPLICATION_EVENT } from '@finos/legend-application';
import {
  type IngestDataset,
  type IngestDatasetReference,
  type RawLambda,
  extractElementNameFromPath,
  IngestDefinition,
  IngestFunctionSource,
} from '@finos/legend-graph';
import {
  type GeneratorFn,
  ActionState,
  assertErrorThrown,
  guaranteeNonNullable,
  guaranteeType,
  LogEvent,
} from '@finos/legend-shared';
import {
  action,
  computed,
  flow,
  makeObservable,
  observable,
  type ObservableMap,
} from 'mobx';
import {
  type IngestViewFlow_TelemetryData,
  DataProductTelemetryHelper,
} from '../../__lib__/DataProductTelemetryHelper.js';
import { DataProductDefinitionFlowState } from './DataProductDefinitionFlowState.js';
import type { DataProductViewerState } from './DataProductViewerState.js';

// Producer Info's materialized views: the ingest data sets whose rows their
// ingest definition computes with a function. The data product's artifact
// names the data sets its access points read, and their ingest definitions;
// each ingest definition, loaded from Depot at the data product's version,
// says which of its data sets are views. A view's function shows as Legend
// Cube's flow, read-only, as an access point's definition does.

/** A materialized view Producer Info lists, and its definition */
export class DataProductIngestViewState {
  readonly producerViewsState: DataProductProducerViewsState;
  readonly ingestDefinitionPath: string;
  readonly dataSet: IngestDataset;
  /** Its function, as Legend Cube's flow shows it */
  readonly definitionFlowState: DataProductDefinitionFlowState;
  /** Its function as Pure, once fetched */
  pure: string | undefined;
  readonly fetchingPureState = ActionState.create();

  constructor(
    producerViewsState: DataProductProducerViewsState,
    ingestDefinitionPath: string,
    dataSet: IngestDataset,
  ) {
    makeObservable(this, {
      pure: observable,
      reads: computed,
      fetchPure: flow,
      resetPure: action,
    });
    this.producerViewsState = producerViewsState;
    this.ingestDefinitionPath = ingestDefinitionPath;
    this.dataSet = dataSet;
    const { viewerState } = producerViewsState;
    const { graphManager } = viewerState.graphManagerState;
    const { telemetryService } = viewerState.applicationStore;
    const telemetryData = (): IngestViewFlow_TelemetryData => ({
      dataProduct: viewerState.product.path,
      ingestDefinition: ingestDefinitionPath,
      dataSet: dataSet.name,
      origin: viewerState.projectGAV
        ? {
            groupId: viewerState.projectGAV.groupId,
            artifactId: viewerState.projectGAV.artifactId,
            versionId: viewerState.projectGAV.versionId,
          }
        : undefined,
    });
    this.definitionFlowState = new DataProductDefinitionFlowState(
      viewerState,
      `view '${ingestDefinitionPath}.${dataSet.name}'`,
      () => graphManager.serializeRawValueSpecification(this.function),
      {
        show: (shown) =>
          DataProductTelemetryHelper.logEvent_ShowIngestViewFlow(
            telemetryService,
            telemetryData(),
            shown,
          ),
        refuse: (refusal) =>
          DataProductTelemetryHelper.logEvent_RefuseIngestViewFlow(
            telemetryService,
            telemetryData(),
            refusal,
          ),
        fail: (failure) =>
          DataProductTelemetryHelper.logEvent_FailIngestViewFlow(
            telemetryService,
            telemetryData(),
            failure,
          ),
      },
    );
  }

  get name(): string {
    return this.dataSet.name;
  }

  /** The function that computes its rows */
  get function(): RawLambda {
    return guaranteeType(this.dataSet.source, IngestFunctionSource).function;
  }

  /**
   * The ingest data sets its function reads, each once, in the order it
   * reads them, as legend-graph finds them, with no engine call
   */
  get reads(): IngestDatasetReference[] {
    const { graphManager, graph } =
      this.producerViewsState.viewerState.graphManagerState;
    return graphManager
      .getIngestDatasetsReadByRawLambda(this.function, graph)
      .filter(
        (read, index, all) =>
          all.findIndex(
            (other) =>
              other.ingestDefinitionPath === read.ingestDefinitionPath &&
              other.datasetName === read.datasetName,
          ) === index,
      );
  }

  /** Fetches its function as Pure, once, as the engine prints it */
  *fetchPure(): GeneratorFn<void> {
    if (!this.fetchingPureState.isInInitialState) {
      return;
    }
    this.fetchingPureState.inProgress();
    try {
      this.pure =
        (yield this.producerViewsState.viewerState.graphManagerState.graphManager.lambdaToPureCode(
          this.function,
          true,
        )) as string;
      this.fetchingPureState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.producerViewsState.viewerState.applicationStore.logService.error(
        LogEvent.create(APPLICATION_EVENT.GENERIC_FAILURE),
        `Unable to print the function of view '${this.ingestDefinitionPath}.${this.name}': ${error.message}`,
      );
      this.fetchingPureState.fail();
    }
  }

  /** Forgets its Pure, to fetch it again */
  resetPure(): void {
    this.pure = undefined;
    this.fetchingPureState.reset();
  }
}

/** Producer Info's ingest definitions, as loaded, and their materialized views */
export class DataProductProducerViewsState {
  readonly viewerState: DataProductViewerState;
  /** How the load of each ingest definition asked for went, by its path */
  readonly loadStates: ObservableMap<string, ActionState> = observable.map(
    {},
    { deep: false },
  );
  /** Each loaded ingest definition's views, by its path */
  readonly views: ObservableMap<string, DataProductIngestViewState[]> =
    observable.map({}, { deep: false });
  /** The view whose definition the side panel shows */
  shownView: DataProductIngestViewState | undefined;

  constructor(viewerState: DataProductViewerState) {
    makeObservable(this, {
      shownView: observable.ref,
      loadIngestDefinitions: flow,
      showView: action,
      hideView: action,
    });
    this.viewerState = viewerState;
  }

  /** Whether the host can load ingest definitions: not for an ad-hoc deployment */
  get canLoad(): boolean {
    return this.viewerState.loadIngestDefinition !== undefined;
  }

  /**
   * Loads these ingest definitions, each once, to tell which of their data
   * sets are views. One that fails to load is left as it was: its data sets
   * show as they always did.
   */
  *loadIngestDefinitions(paths: string[]): GeneratorFn<void> {
    const load = this.viewerState.loadIngestDefinition;
    const wanted = paths.filter((path) => !this.loadStates.has(path));
    if (!load || !wanted.length) {
      return;
    }
    wanted.forEach((path) => {
      const state = ActionState.create();
      state.inProgress();
      this.loadStates.set(path, state);
    });
    const { graphManager, graph } = this.viewerState.graphManagerState;
    const loaded = (yield Promise.allSettled(
      wanted.map((path) => load(path)),
    )) as PromiseSettledResult<Awaited<ReturnType<typeof load>>>[];
    loaded.forEach((result, index) => {
      const path = guaranteeNonNullable(wanted[index]);
      const state = guaranteeNonNullable(this.loadStates.get(path));
      try {
        if (result.status === 'rejected') {
          throw result.reason instanceof Error
            ? result.reason
            : new Error(String(result.reason));
        }
        const content = result.value;
        if (!content) {
          throw new Error(`Depot has no ingest definition '${path}'`);
        }
        // its content as legend-graph models it, apart from the graph
        const ingestDefinition = new IngestDefinition(
          extractElementNameFromPath(path),
        );
        ingestDefinition.content = content;
        const specification =
          graphManager.getOrBuildIngestDefinitionSpecification(
            ingestDefinition,
            graph,
          );
        if (!specification) {
          throw new Error(
            `Can't read the content of ingest definition '${path}'`,
          );
        }
        this.views.set(
          path,
          specification.datasets
            .filter((dataSet) => dataSet.source instanceof IngestFunctionSource)
            .map(
              (dataSet) => new DataProductIngestViewState(this, path, dataSet),
            ),
        );
        state.pass();
      } catch (error) {
        assertErrorThrown(error);
        this.viewerState.applicationStore.logService.warn(
          LogEvent.create(APPLICATION_EVENT.GENERIC_FAILURE),
          `Unable to load ingest definition '${path}' for Producer Info: ${error.message}`,
        );
        state.fail();
      }
    });
  }

  /** The view of that name in that ingest definition, if it is one */
  getView(
    ingestDefinitionPath: string,
    dataSet: string,
  ): DataProductIngestViewState | undefined {
    return this.views
      .get(ingestDefinitionPath)
      ?.find((view) => view.name === dataSet);
  }

  showView(view: DataProductIngestViewState): void {
    this.shownView = view;
  }

  hideView(): void {
    this.shownView = undefined;
  }
}
