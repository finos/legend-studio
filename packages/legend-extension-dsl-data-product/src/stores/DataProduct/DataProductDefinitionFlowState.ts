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
import type { CubeDefinitionFunctions } from '@finos/legend-cube-builder/definition-flow';
import { CORE_PURE_PATH } from '@finos/legend-graph';
import {
  type GeneratorFn,
  type PlainObject,
  ActionState,
  assertErrorThrown,
  guaranteeNonNullable,
  LogEvent,
} from '@finos/legend-shared';
import { action, flow, makeObservable, observable } from 'mobx';
import {
  type DataProductDefinitionFlow,
  type DataProductDefinitionFlowEntry,
  DataProductDefinitionFlowFailureKind,
  DataProductDefinitionFlowKind,
} from './DataProductDefinitionFlow.js';
import type { DataProductViewerState } from './DataProductViewerState.js';

/** What a definition's flow tells telemetry, once read or failed */
export interface DataProductDefinitionFlowTelemetry {
  /** Cube read it into steps */
  show: (flow: {
    steps: number;
    unknownDataSets: string[];
    durationMs: number;
    functionCallsOpened: number;
    functionCallsClosed: Record<string, number>;
    scalarFunctionSteps: number;
    functionsUnloaded: boolean;
  }) => void;
  /** Cube can't read it yet: it shows as Pure */
  refuse: (refusal: {
    reason: string;
    functionName: string | undefined;
  }) => void;
  /** It can't be shown, though Cube didn't refuse it */
  fail: (failure: { kind: string; error: string }) => void;
}

/** A user-defined function whose Pure shows under the flow */
export interface DataProductShownFunction {
  readonly name: string;
  readonly path: string | undefined;
  readonly origin: string | undefined;
  readonly pure: string | undefined;
  readonly error?: string | undefined;
}

/**
 * A definition as Legend Cube's flow, read-only: an access point's, or a
 * materialized view's. Its function is read into steps in the browser, with
 * no engine call, once: Cube's code loads first, then the user-defined
 * functions it calls, which open into containers, then the ingest
 * definitions it reads, which type the columns of their data sets. Cube
 * reads all of a definition or none of it: what it can't read yet is
 * refused, and shows as Pure.
 */
export class DataProductDefinitionFlowState {
  readonly viewerState: DataProductViewerState;
  /** What the definition is, in log messages, e.g. `access point 'trades'` */
  readonly subject: string;
  private readonly getLambda: () => PlainObject | undefined;
  private readonly telemetry: DataProductDefinitionFlowTelemetry;

  /** The definition, as the flow shows it, once read (`readDefinitionFlow`) */
  definitionFlow: DataProductDefinitionFlow | undefined;
  /** The function elements the definition calls, by path, as loaded */
  readonly functionElements = new Map<string, PlainObject>();
  /** A user-defined function whose Pure shows under the flow */
  shownFunction: DataProductShownFunction | undefined;

  readonly readingDefinitionFlowState = ActionState.create();

  constructor(
    viewerState: DataProductViewerState,
    subject: string,
    /** The definition's function, as protocol JSON; none when it has none */
    getLambda: () => PlainObject | undefined,
    telemetry: DataProductDefinitionFlowTelemetry,
  ) {
    makeObservable<DataProductDefinitionFlowState, 'failDefinitionFlow'>(this, {
      // the reading's steps and Cube's code, as Cube made them
      definitionFlow: observable.ref,
      shownFunction: observable.ref,
      readDefinitionFlow: flow,
      showFunction: flow,
      hideFunction: action,
      resetDefinitionFlow: action,
      failDefinitionFlow: action,
    });
    this.viewerState = viewerState;
    this.subject = subject;
    this.getLambda = getLambda;
    this.telemetry = telemetry;
  }

  /**
   * Reads the definition, once, into the steps of Legend Cube's flow
   */
  *readDefinitionFlow(): GeneratorFn<void> {
    if (!this.readingDefinitionFlowState.isInInitialState) {
      return;
    }
    this.readingDefinitionFlowState.inProgress();
    const startedAt = Date.now();
    const { logService } = this.viewerState.applicationStore;
    try {
      const lambda = this.getLambda();
      if (lambda === undefined) {
        this.failDefinitionFlow(
          DataProductDefinitionFlowFailureKind.MISSING,
          new Error(`The ${this.subject} has no function`),
        );
        return;
      }
      let entry: DataProductDefinitionFlowEntry;
      try {
        entry =
          (yield this.viewerState.loadDefinitionFlowEntry()) as DataProductDefinitionFlowEntry;
      } catch (error) {
        assertErrorThrown(error);
        this.failDefinitionFlow(
          DataProductDefinitionFlowFailureKind.LOAD,
          error,
        );
        return;
      }
      // the functions it calls first: their bodies may read ingest
      // definitions too
      const loadFunctions = this.viewerState.loadFunctions;
      let functions: CubeDefinitionFunctions | undefined;
      let functionsUnloaded = false;
      if (loadFunctions) {
        try {
          functions = (yield entry.loadCubeDefinitionFunctions(
            lambda,
            async (names) => {
              const elements = await loadFunctions(names);
              elements.forEach((element) =>
                this.functionElements.set(element.path, element.content),
              );
              return elements;
            },
          )) as CubeDefinitionFunctions;
        } catch (error) {
          assertErrorThrown(error);
          // its calls are drawn as boxes, or refused, as Cube reads them
          functionsUnloaded = true;
          logService.warn(
            LogEvent.create(APPLICATION_EVENT.GENERIC_FAILURE),
            `Unable to load the functions of ${this.subject}: ${error.message}`,
          );
        }
      }
      const ingestDefinitions = (yield this.loadIngestDefinitions(
        entry.findCubeDefinitionIngestDefinitions(lambda, { functions }),
      )) as Map<string, PlainObject>;
      const reading = entry.readCubeDefinition(lambda, {
        getIngestDefinition: (path) => ingestDefinitions.get(path),
        functions,
      });
      if (reading.kind === 'flow') {
        this.definitionFlow = {
          kind: DataProductDefinitionFlowKind.FLOW,
          reading,
          entry,
        };
        this.telemetry.show({
          steps: reading.steps.length,
          unknownDataSets: reading.unknownDataSets.map(
            (each) => `${each.ingestDefinition}.${each.dataSet}`,
          ),
          durationMs: Date.now() - startedAt,
          functionCallsOpened: reading.functionCalls.filter(
            (call) => call.opened,
          ).length,
          functionCallsClosed: reading.functionCalls.reduce<
            Record<string, number>
          >((closed, call) => {
            if (call.closedReason) {
              closed[call.closedReason] = (closed[call.closedReason] ?? 0) + 1;
            }
            return closed;
          }, {}),
          scalarFunctionSteps: reading.scalarFunctions.size,
          functionsUnloaded,
        });
      } else {
        this.definitionFlow = {
          kind: DataProductDefinitionFlowKind.REFUSED,
          refusal: reading,
        };
        this.telemetry.refuse({
          reason: reading.reason,
          functionName: reading.functionName,
        });
      }
    } catch (error) {
      assertErrorThrown(error);
      this.failDefinitionFlow(DataProductDefinitionFlowFailureKind.READ, error);
    } finally {
      this.readingDefinitionFlowState.complete();
    }
  }

  /**
   * The content of the ingest definitions the host gives, by path: one it
   * doesn't have, or fails to load, is left out, and its data sets are drawn
   * by name
   */
  private async loadIngestDefinitions(
    paths: string[],
  ): Promise<Map<string, PlainObject>> {
    const contents = new Map<string, PlainObject>();
    const load = this.viewerState.loadIngestDefinition;
    if (!load) {
      return contents;
    }
    const loaded = await Promise.allSettled(paths.map((path) => load(path)));
    loaded.forEach((result, index) => {
      const path = guaranteeNonNullable(paths[index]);
      if (result.status === 'rejected') {
        this.viewerState.applicationStore.logService.warn(
          LogEvent.create(APPLICATION_EVENT.GENERIC_FAILURE),
          `Unable to load ingest definition '${path}' for the flow of ${this.subject}: ${
            result.reason instanceof Error
              ? result.reason.message
              : String(result.reason)
          }`,
        );
      } else if (result.value) {
        contents.set(path, result.value);
      }
    });
    return contents;
  }

  private failDefinitionFlow(
    failure: DataProductDefinitionFlowFailureKind,
    error: Error,
  ): void {
    this.definitionFlow = {
      kind: DataProductDefinitionFlowKind.FAILED,
      failure,
      error,
    };
    this.logDefinitionFlowFailure(failure, error);
  }

  /**
   * Logs a flow that couldn't be shown, though Cube didn't refuse the
   * definition: e.g. its canvas failed while drawing it
   */
  logDefinitionFlowFailure(
    failure: DataProductDefinitionFlowFailureKind,
    error: Error,
  ): void {
    this.viewerState.applicationStore.logService.error(
      LogEvent.create(APPLICATION_EVENT.GENERIC_FAILURE),
      `Unable to show the flow of ${this.subject} (${failure}): ${error.message}`,
    );
    this.telemetry.fail({ kind: failure, error: error.message });
  }

  /**
   * Shows a user-defined function's Pure under the flow, as the engine
   * prints its element, through the graph manager
   */
  *showFunction(call: {
    readonly name: string;
    readonly path: string | undefined;
    readonly origin: string | undefined;
  }): GeneratorFn<void> {
    const { path } = call;
    const content = path ? this.functionElements.get(path) : undefined;
    this.shownFunction = { ...call, pure: undefined };
    if (!path || !content) {
      this.shownFunction = {
        ...call,
        pure: undefined,
        error: `${call.name} isn't in the data product's project or its dependencies.`,
      };
      return;
    }
    try {
      const pure =
        (yield this.viewerState.graphManagerState.graphManager.entitiesToPureCode(
          [{ path, classifierPath: CORE_PURE_PATH.FUNCTION, content }],
          { pretty: true },
        )) as string;
      this.shownFunction = { ...call, pure: pure.trim() };
    } catch (error) {
      assertErrorThrown(error);
      this.shownFunction = { ...call, pure: undefined, error: error.message };
    }
  }

  hideFunction(): void {
    this.shownFunction = undefined;
  }

  /** Forgets the definition's flow, to read it again */
  resetDefinitionFlow(): void {
    this.definitionFlow = undefined;
    this.readingDefinitionFlowState.reset();
  }
}
