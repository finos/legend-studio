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

import type * as CubeDefinitionFlowEntry from '@finos/legend-cube-builder/definition-flow';
import type { CubeDefinitionReading } from '@finos/legend-cube-builder/definition-flow';
import {
  IngestDefinition,
  RawLambda,
  type MatViewDataSet,
} from '@finos/legend-graph';
import {
  ActionState,
  assertErrorThrown,
  LogEvent,
  type GeneratorFn,
  type PlainObject,
} from '@finos/legend-shared';
import { action, computed, flow, makeObservable, observable } from 'mobx';
import { LEGEND_STUDIO_APP_EVENT } from '../../../../../__lib__/LegendStudioEvent.js';
import {
  getIngestDataSets,
  getIngestMaterializedViewReads,
  getIngestMaterializedViews,
  type IngestDataSet,
  type IngestDataSetReference,
  type IngestMaterializedView,
} from '../../../../graph-modifier/DSL_Ingest_GraphModifierHelper.js';
import type { IngestDefinitionEditorState } from './IngestDefinitionEditorState.js';

// An ingest definition's materialized views, one at a time, as Legend Cube
// draws them, read-only: each view's function read into steps in the
// browser, with no engine call, its data sets typed by the ingest
// definitions of the graph. Cube's code loads the first time the flow shows,
// so neither Studio's own load nor an ingest definition without views pays
// for it. Beside the views, the list has the definition's other data sets,
// each one's columns read from the definition's JSON for display. Studio
// builds no model of the definition: the rest stays its raw JSON.

/** Legend Cube's definition flow: `@finos/legend-cube-builder/definition-flow` */
export type IngestDefinitionFlowEntry = typeof CubeDefinitionFlowEntry;

/** How the Definition tab shows an ingest definition with materialized views */
export enum INGEST_DEFINITION_VIEW {
  /** Its materialized views, one at a time, each as Legend Cube draws it */
  FLOW = 'Flow',
  /** The whole definition as Pure */
  PURE = 'Pure',
}

/** Why a view's flow can't be shown, when Cube didn't refuse its function */
export enum INGEST_DEFINITION_FLOW_FAILURE {
  /** Cube's code didn't load: a network error, or a deploy replaced its chunk */
  LOAD = 'load',
  /** Cube failed to read the view's function, unexpectedly */
  READ = 'read',
  /** The canvas failed while drawing the flow */
  DRAW = 'draw',
}

/**
 * A materialized view's function, as Cube read it: its flow, why Cube can't
 * draw it yet, or the error Cube threw reading it
 */
export type IngestMaterializedViewReading =
  | CubeDefinitionReading
  | { readonly kind: 'failed'; readonly error: Error };

/** A materialized view's own Pure, as the engine writes its function, or why it couldn't */
export type IngestMaterializedViewGrammar =
  | { readonly text: string }
  | { readonly error: Error };

export class IngestDefinitionFlowState {
  readonly editorState: IngestDefinitionEditorState;
  /** Flow until the user picks Pure */
  view = INGEST_DEFINITION_VIEW.FLOW;
  /** The view picked in the list; the first view until one is picked */
  selectedViewName: string | undefined;
  /** The data set picked in the list, which shows instead of a view; none until one is picked */
  selectedDataSetName: string | undefined;
  /** Cube's definition flow, once loaded */
  entry: IngestDefinitionFlowEntry | undefined;
  /** Why Cube's definition flow didn't load, if it didn't */
  entryError: Error | undefined;
  readonly loadEntryState = ActionState.create();
  /** Each view's own Pure, by its function, fetched when Cube can't draw the view */
  readonly viewGrammars = new Map<PlainObject, IngestMaterializedViewGrammar>();

  constructor(editorState: IngestDefinitionEditorState) {
    makeObservable<IngestDefinitionFlowState, 'viewGrammars'>(this, {
      view: observable,
      selectedViewName: observable,
      selectedDataSetName: observable,
      entry: observable.ref,
      entryError: observable.ref,
      viewGrammars: observable.shallow,
      materializedViews: computed,
      selectedView: computed,
      dataSets: computed,
      selectedDataSet: computed,
      viewReads: computed,
      readings: computed,
      setView: action,
      selectView: action,
      selectDataSet: action,
      resetEntry: action,
      loadEntry: flow,
      fetchViewGrammar: flow,
    });
    this.editorState = editorState;
  }

  /** The definition's materialized views, as its content holds them */
  get materializedViews(): IngestMaterializedView[] {
    return getIngestMaterializedViews(this.editorState.ingest);
  }

  /** The view the flow shows: the one picked, else the first */
  get selectedView(): IngestMaterializedView | undefined {
    const views = this.materializedViews;
    return (
      views.find((view) => view.name === this.selectedViewName) ?? views[0]
    );
  }

  /** The definition's data sets that aren't views, with their columns, as its content holds them */
  get dataSets(): IngestDataSet[] {
    return getIngestDataSets(this.editorState.ingest).filter(
      (dataSet) => !dataSet.isMaterializedView,
    );
  }

  /** The data set picked in the list, if one is: it shows instead of a view */
  get selectedDataSet(): IngestDataSet | undefined {
    const name = this.selectedDataSetName;
    return name === undefined
      ? undefined
      : this.dataSets.find((dataSet) => dataSet.name === name);
  }

  /**
   * The ingest data sets each view's function reads, by the view's name,
   * read from its JSON, for display: whether or not Cube can draw the view
   */
  get viewReads(): ReadonlyMap<string, IngestDataSetReference[]> {
    return new Map(
      this.materializedViews.map((view) => [
        view.name,
        getIngestMaterializedViewReads(view),
      ]),
    );
  }

  /** The views whose functions read the definition's data set of that name */
  getReadBy(dataSet: string): IngestMaterializedView[] {
    const path = this.editorState.ingest.path;
    return this.materializedViews.filter((view) =>
      this.viewReads
        .get(view.name)
        ?.some(
          (read) => read.ingestDefinition === path && read.dataSet === dataSet,
        ),
    );
  }

  /**
   * Each view's function, by the view's name, read by Cube into the steps
   * of its flow; `undefined` until Cube's code loads. Its data sets are
   * typed by the ingest definitions of the graph, as the workspace holds
   * them; one Cube can't type is drawn by its name.
   */
  get readings():
    | ReadonlyMap<string, IngestMaterializedViewReading>
    | undefined {
    const entry = this.entry;
    if (!entry) {
      return undefined;
    }
    const graph = this.editorState.editorStore.graphManagerState.graph;
    const getIngestDefinition = (path: string): PlainObject | undefined => {
      const element = graph.getNullableElement(path);
      return element instanceof IngestDefinition ? element.content : undefined;
    };
    return new Map(
      this.materializedViews.map(
        (view): [string, IngestMaterializedViewReading] => {
          try {
            return [
              view.name,
              entry.readCubeDefinition(view.lambda, { getIngestDefinition }),
            ];
          } catch (error) {
            assertErrorThrown(error);
            return [view.name, { kind: 'failed', error }];
          }
        },
      ),
    );
  }

  /**
   * The view's data set as the graph builder listed it for Lineage and View
   * SQL; none when it didn't, e.g. for a function that isn't a lambda
   */
  getMatViewDataSet(view: IngestMaterializedView): MatViewDataSet | undefined {
    return this.editorState.ingest.TEMPORARY_MATVIEW_FUNCTION_DATA_SETS?.find(
      (dataSet) => dataSet.name === view.name,
    );
  }

  setView(view: INGEST_DEFINITION_VIEW): void {
    this.view = view;
  }

  selectView(name: string): void {
    this.selectedViewName = name;
    this.selectedDataSetName = undefined;
  }

  selectDataSet(name: string): void {
    this.selectedDataSetName = name;
  }

  /** Legend Cube's definition flow, in a chunk of its own, shared with the data product viewer's */
  loadDefinitionFlowEntry(): Promise<IngestDefinitionFlowEntry> {
    return import(
      /* webpackChunkName: "cube-flow" */ '@finos/legend-cube-builder/definition-flow'
    );
  }

  /** Loads Cube's definition flow, once */
  *loadEntry(): GeneratorFn<void> {
    if (this.entry || !this.loadEntryState.isInInitialState) {
      return;
    }
    this.loadEntryState.inProgress();
    try {
      this.entry =
        (yield this.loadDefinitionFlowEntry()) as IngestDefinitionFlowEntry;
      this.loadEntryState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.entryError = error;
      this.logFlowFailure(INGEST_DEFINITION_FLOW_FAILURE.LOAD, error);
      this.loadEntryState.fail();
    }
  }

  /** Forgets why Cube's definition flow didn't load, to load it again */
  resetEntry(): void {
    this.entryError = undefined;
    this.loadEntryState.reset();
  }

  /**
   * Fetches the view's own Pure, as the engine writes its function, once per
   * function: shown when Cube can't draw the view
   */
  *fetchViewGrammar(view: IngestMaterializedView): GeneratorFn<void> {
    const { lambda } = view;
    if (this.viewGrammars.has(lambda)) {
      return;
    }
    try {
      const texts =
        (yield this.editorState.editorStore.graphManagerState.graphManager.lambdasToPureCode(
          new Map([
            [
              view.name,
              new RawLambda(
                Array.isArray(lambda.parameters) ? lambda.parameters : [],
                lambda.body as object | undefined,
              ),
            ],
          ]),
          true,
        )) as Map<string, string>;
      this.viewGrammars.set(lambda, { text: texts.get(view.name) ?? '' });
    } catch (error) {
      assertErrorThrown(error);
      this.viewGrammars.set(lambda, { error });
    }
  }

  /** Logs a flow that couldn't be shown, though Cube didn't refuse the view */
  logFlowFailure(failure: INGEST_DEFINITION_FLOW_FAILURE, error: Error): void {
    this.editorState.editorStore.applicationStore.logService.error(
      LogEvent.create(LEGEND_STUDIO_APP_EVENT.GENERIC_FAILURE),
      `Unable to show the flow of the materialized views of ingest definition '${this.editorState.ingest.path}' (${failure}): ${error.message}`,
    );
  }
}
