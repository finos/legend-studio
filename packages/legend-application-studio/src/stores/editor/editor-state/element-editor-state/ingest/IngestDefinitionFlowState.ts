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
  getIngestDatasetWriteMode,
  getIngestWriteModeColumns,
  getMultiplicityPrettyDescription,
  getRelationColumnTypeLabel,
  IngestDefinition,
  IngestFunctionSource,
  IngestSerializedSource,
  Multiplicity,
  type IngestDataset,
  type IngestDatasetReference,
  type IngestDefinitionSpecification,
  type IngestWriteMode,
  type MatViewDataSet,
  type RawLambda,
} from '@finos/legend-graph';
import {
  ActionState,
  assertErrorThrown,
  guaranteeType,
  LogEvent,
  type GeneratorFn,
  type PlainObject,
} from '@finos/legend-shared';
import { action, computed, flow, makeObservable, observable } from 'mobx';
import { LEGEND_STUDIO_APP_EVENT } from '../../../../../__lib__/LegendStudioEvent.js';
import type { IngestDefinitionEditorState } from './IngestDefinitionEditorState.js';
import { getIngestWriteModeLabel } from './IngestDefinitionSpecificationHelper.js';

// An ingest definition's Overview, read-only: the definition's own settings,
// then its materialized views and its other data sets. Each view shows as
// Legend Cube draws it, its function read into steps in the browser, with no
// engine call, its data sets typed by the ingest definitions of the graph;
// each data set shows its columns. Cube's code loads the first time a view
// shows, so neither Studio's own load nor an ingest definition without views
// pays for it. Everything shown is read from the definition's specification
// (`IngestDefinitionEditorState.specification`), built from its content by
// legend-graph: a definition whose content can't be read has no Overview,
// only its Pure.

/** Legend Cube's definition flow: `@finos/legend-cube-builder/definition-flow` */
export type IngestDefinitionFlowEntry = typeof CubeDefinitionFlowEntry;

/** How the Definition tab shows an ingest definition */
export enum INGEST_DEFINITION_VIEW {
  /** Its own settings, then its materialized views and data sets, one at a time */
  OVERVIEW = 'Overview',
  /** The whole definition as Pure */
  PURE = 'Pure',
}

/** What a data set of the Overview shows */
export enum INGEST_DATA_SET_TAB {
  /** Its columns */
  SCHEMA = 'Schema',
  /** Everything else it says, e.g. its key, write mode and storage */
  METADATA = 'Metadata',
}

/** What a materialized view of the Overview shows */
export enum INGEST_MATERIALIZED_VIEW_TAB {
  /** Its function, as Legend Cube draws it */
  FLOW = 'Flow',
  /** Everything else it says, e.g. its key, what it reads and its storage */
  METADATA = 'Metadata',
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

/** The function of a materialized view: a data set whose rows its function computes */
export const getMaterializedViewFunction = (view: IngestDataset): RawLambda =>
  guaranteeType(view.source, IngestFunctionSource).function;

/** A column of a data set's table: one it declares, or one its write mode adds */
export interface IngestDataSetColumnRow {
  readonly name: string;
  /** Its type's name, with its parameters: `Varchar(32)`, `Numeric(18, 4)` */
  readonly type: string;
  /** Its type's full path, e.g. `meta::pure::precisePrimitives::Varchar` */
  readonly typePath: string;
  /** How many values it holds, as View SQL's schema says it: `[1] - Required` */
  readonly multiplicity: string;
  readonly isPrimaryKey: boolean;
  /** What the definition says it holds, if it says */
  readonly description: string | undefined;
  /** The write mode that adds it, for a column the definition doesn't declare */
  readonly addedBy: IngestWriteMode | undefined;
}

/** A data set's columns, as its table shows them */
export interface IngestDataSetColumns {
  /** The write mode it is written with: its own, else its definition's */
  readonly writeMode: IngestWriteMode | undefined;
  /** The columns it declares, then those its write mode adds */
  readonly rows: readonly IngestDataSetColumnRow[];
  /** How many of its columns it declares, before those its write mode adds */
  readonly declaredCount: number;
  /** What its columns leave out, or why it has none */
  readonly notes: readonly string[];
}

/**
 * The data set's columns, as its table shows them: those it declares, then
 * those its write mode adds, in the order the engine returns them
 */
export const getIngestDataSetColumns = (
  dataset: IngestDataset,
  specification: IngestDefinitionSpecification,
): IngestDataSetColumns => {
  const writeMode = getIngestDatasetWriteMode(dataset, specification);
  const { source } = dataset;
  if (!(source instanceof IngestSerializedSource)) {
    return {
      writeMode,
      rows: [],
      declaredCount: 0,
      notes: ["Its source isn't one Studio knows: its columns aren't shown."],
    };
  }
  // a column whose type the graph doesn't have is typed `Any`: it shows the
  // type its definition names
  const unresolvedTypes = new Map(
    source.unresolvedColumns.map((column) => [column.name, column.typePath]),
  );
  const rows: IngestDataSetColumnRow[] = (source.schema?.columns ?? []).map(
    (column) => {
      const unresolvedType = unresolvedTypes.get(column.name);
      return {
        name: column.name,
        type:
          unresolvedType === undefined
            ? getRelationColumnTypeLabel(column)
            : (unresolvedType.split('::').pop() ?? unresolvedType),
        typePath: unresolvedType ?? column.genericType.value.rawType.path,
        multiplicity: getMultiplicityPrettyDescription(column.multiplicity),
        isPrimaryKey: dataset.primaryKey.includes(column.name),
        description: column.description,
        addedBy: undefined,
      };
    },
  );
  const declaredCount = rows.length;
  // a data set with no columns of its own gets none from its write mode
  if (!declaredCount) {
    return { writeMode, rows, declaredCount, notes: ['No columns declared.'] };
  }
  const notes = [...unresolvedTypes].map(
    ([name, typePath]) =>
      `The type of ${name}, ${typePath}, isn't in the project.`,
  );
  const added = getIngestWriteModeColumns(writeMode);
  if (writeMode && added === undefined) {
    notes.push(
      `Its write mode, ${getIngestWriteModeLabel(writeMode)}, may add columns, which aren't shown.`,
    );
  } else if (writeMode && added?.length) {
    const clashes: string[] = [];
    added.forEach(({ name, type }) => {
      if (rows.some((row) => row.name === name)) {
        clashes.push(name);
        return;
      }
      rows.push({
        name,
        type: type.split('::').pop() ?? type,
        typePath: type,
        multiplicity: getMultiplicityPrettyDescription(Multiplicity.ONE),
        isPrimaryKey: false,
        description: undefined,
        addedBy: writeMode,
      });
    });
    if (clashes.length) {
      notes.push(
        `It declares ${clashes.join(', ')}, which its write mode, ${getIngestWriteModeLabel(
          writeMode,
        )}, adds too: ${clashes.length === 1 ? 'it is' : 'they are'} listed once.`,
      );
    }
  }
  return { writeMode, rows, declaredCount, notes };
};

export class IngestDefinitionFlowState {
  readonly editorState: IngestDefinitionEditorState;
  /** The Overview until the user picks Pure */
  view = INGEST_DEFINITION_VIEW.OVERVIEW;
  /** The view picked in the list; the first view until one is picked */
  selectedViewName: string | undefined;
  /** The data set picked in the list, which shows instead of a view; none until one is picked */
  selectedDataSetName: string | undefined;
  /** Whether the definition's section shows all its settings, not only its main ones */
  isDefinitionOpen = false;
  /** What each data set shows, kept as another is picked, to compare them */
  dataSetTab = INGEST_DATA_SET_TAB.SCHEMA;
  /** What each view shows, kept as another is picked */
  viewTab = INGEST_MATERIALIZED_VIEW_TAB.FLOW;
  /** Cube's definition flow, once loaded */
  entry: IngestDefinitionFlowEntry | undefined;
  /** Why Cube's definition flow didn't load, if it didn't */
  entryError: Error | undefined;
  readonly loadEntryState = ActionState.create();

  constructor(editorState: IngestDefinitionEditorState) {
    makeObservable(this, {
      view: observable,
      selectedViewName: observable,
      selectedDataSetName: observable,
      isDefinitionOpen: observable,
      dataSetTab: observable,
      viewTab: observable,
      entry: observable.ref,
      entryError: observable.ref,
      specification: computed,
      materializedViews: computed,
      selectedView: computed,
      dataSets: computed,
      selectedDataSet: computed,
      shownDataSet: computed,
      dataSetColumns: computed,
      viewReads: computed,
      readings: computed,
      setView: action,
      selectView: action,
      selectDataSet: action,
      setDefinitionOpen: action,
      setDataSetTab: action,
      setViewTab: action,
      resetEntry: action,
      loadEntry: flow,
    });
    this.editorState = editorState;
  }

  /** The definition, fully modelled; none when its content can't be read */
  get specification(): IngestDefinitionSpecification | undefined {
    return this.editorState.specification;
  }

  /** The definition's materialized views: its data sets whose rows a function computes */
  get materializedViews(): IngestDataset[] {
    return (
      this.specification?.datasets.filter(
        (dataset) => dataset.source instanceof IngestFunctionSource,
      ) ?? []
    );
  }

  /** The view the flow shows: the one picked, else the first */
  get selectedView(): IngestDataset | undefined {
    const views = this.materializedViews;
    return (
      views.find((view) => view.name === this.selectedViewName) ?? views[0]
    );
  }

  /** The definition's data sets that aren't views */
  get dataSets(): IngestDataset[] {
    return (
      this.specification?.datasets.filter(
        (dataset) => !(dataset.source instanceof IngestFunctionSource),
      ) ?? []
    );
  }

  /** The data set picked in the list, if one is: it shows instead of a view */
  get selectedDataSet(): IngestDataset | undefined {
    const name = this.selectedDataSetName;
    return name === undefined
      ? undefined
      : this.dataSets.find((dataSet) => dataSet.name === name);
  }

  /**
   * The data set the Overview shows: the one picked, else, for a definition
   * with no views, its first one
   */
  get shownDataSet(): IngestDataset | undefined {
    return (
      this.selectedDataSet ??
      (this.materializedViews.length ? undefined : this.dataSets[0])
    );
  }

  /** Each data set's columns, as its table shows them, by the data set's name */
  get dataSetColumns(): ReadonlyMap<string, IngestDataSetColumns> {
    const specification = this.specification;
    return new Map(
      specification
        ? this.dataSets.map((dataSet) => [
            dataSet.name,
            getIngestDataSetColumns(dataSet, specification),
          ])
        : [],
    );
  }

  /**
   * The ingest data sets each view's function reads, by the view's name, as
   * legend-graph finds them, with no engine call: whether or not Cube can
   * draw the view
   */
  get viewReads(): ReadonlyMap<string, IngestDatasetReference[]> {
    const { graphManager, graph } =
      this.editorState.editorStore.graphManagerState;
    return new Map(
      this.materializedViews.map((view) => [
        view.name,
        graphManager.getIngestDatasetsReadByRawLambda(
          getMaterializedViewFunction(view),
          graph,
        ),
      ]),
    );
  }

  /** The views whose functions read the definition's data set of that name */
  getReadBy(dataSet: string): IngestDataset[] {
    const path = this.editorState.ingest.path;
    return this.materializedViews.filter((view) =>
      this.viewReads
        .get(view.name)
        ?.some(
          (read) =>
            read.ingestDefinitionPath === path && read.datasetName === dataSet,
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
    const { graphManager, graph } =
      this.editorState.editorStore.graphManagerState;
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
              entry.readCubeDefinition(
                graphManager.serializeRawValueSpecification(
                  getMaterializedViewFunction(view),
                ),
                { getIngestDefinition },
              ),
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
  getMatViewDataSet(view: IngestDataset): MatViewDataSet | undefined {
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

  setDefinitionOpen(isOpen: boolean): void {
    this.isDefinitionOpen = isOpen;
  }

  setDataSetTab(tab: INGEST_DATA_SET_TAB): void {
    this.dataSetTab = tab;
  }

  setViewTab(tab: INGEST_MATERIALIZED_VIEW_TAB): void {
    this.viewTab = tab;
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

  /** Logs a flow that couldn't be shown, though Cube didn't refuse the view */
  logFlowFailure(failure: INGEST_DEFINITION_FLOW_FAILURE, error: Error): void {
    this.editorState.editorStore.applicationStore.logService.error(
      LogEvent.create(LEGEND_STUDIO_APP_EVENT.GENERIC_FAILURE),
      `Unable to show the flow of the materialized views of ingest definition '${this.editorState.ingest.path}' (${failure}): ${error.message}`,
    );
  }
}
