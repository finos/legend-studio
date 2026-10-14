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

import type { IngestDefinition } from '@finos/legend-graph';
import type { PlainObject } from '@finos/legend-shared';
import { action, computed, flowResult, makeObservable, observable } from 'mobx';
import {
  getIngestDataSetNames,
  getIngestMaterializedViews,
  ingestDefinition_addMaterializedView,
  ingestDefinition_updateMaterializedView,
  type IngestMaterializedViewOptions,
} from '../../graph-modifier/DSL_Ingest_GraphModifierHelper.js';
import type { EditorStore } from '../EditorStore.js';
import { IngestDefinitionEditorState } from '../editor-state/element-editor-state/ingest/IngestDefinitionEditorState.js';

/** A data set's name: a letter or an underscore, then letters, digits and underscores */
const DATA_SET_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/u;

/**
 * Legend Cube, opened full screen from an ingest definition's editor to build
 * a materialized view of it from the project's ingest data sets (Create
 * MatView with Cube). Studio's own shortcuts are off while it is open. Cube
 * itself, and its host, are loaded with the dialog (`EmbeddedCube`), so
 * nothing here imports them.
 */
export class EmbeddedCubeState {
  readonly editorStore: EditorStore;
  /** The definition the materialized view is added to; none while closed */
  ingest: IngestDefinition | undefined;
  /**
   * The materialized view opened to edit (Edit MatView, PLAN §11.18), by
   * name: Cube opens on its lambda, and Save MatView replaces it; none for a
   * new one
   */
  matView: string | undefined;

  constructor(editorStore: EditorStore) {
    makeObservable(this, {
      ingest: observable.ref,
      matView: observable,
      matViewLambda: computed,
      open: action,
      close: action,
      addMaterializedView: action,
      saveMaterializedView: action,
    });
    this.editorStore = editorStore;
  }

  get isOpen(): boolean {
    return this.ingest !== undefined;
  }

  /** Opens Cube on a new materialized view of the definition, or on one of its views to edit */
  open(ingest: IngestDefinition, matView?: string): void {
    this.ingest = ingest;
    this.matView = matView;
  }

  close(): void {
    this.ingest = undefined;
    this.matView = undefined;
  }

  /** The lambda (protocol JSON) of the materialized view opened to edit */
  get matViewLambda(): PlainObject | undefined {
    const { ingest, matView } = this;
    return ingest && matView !== undefined
      ? getIngestMaterializedViews(ingest).find((view) => view.name === matView)
          ?.lambda
      : undefined;
  }

  /** Why the name can't be the new materialized view's; none when it can */
  getMaterializedViewNameProblem(name: string): string | undefined {
    const trimmed = name.trim();
    if (!trimmed) {
      return 'Name the materialized view.';
    }
    if (!DATA_SET_NAME_PATTERN.test(trimmed)) {
      return 'A data set name is letters, digits and underscores, and starts with a letter or an underscore.';
    }
    return this.ingest && getIngestDataSetNames(this.ingest).includes(trimmed)
      ? `The ingest definition already has a data set named ${trimmed}.`
      : undefined;
  }

  /**
   * The classifications a materialized view's data can take: those a data
   * product's access points offer; none when Studio's config gives none,
   * and the classification is then typed
   */
  get classifications(): string[] {
    return (
      this.editorStore.applicationStore.config.options.dataProductConfig
        ?.classifications ?? []
    );
  }

  /** Why the classification can't be the new materialized view's; none when it can */
  getMaterializedViewClassificationProblem(
    sensitivity: string,
  ): string | undefined {
    const trimmed = sensitivity.trim();
    if (!trimmed) {
      return "Classify the materialized view's data.";
    }
    const { classifications } = this;
    return classifications.length && !classifications.includes(trimmed)
      ? `${trimmed} isn't one of the data classifications.`
      : undefined;
  }

  /**
   * Adds the lambda to the ingest definition as a materialized view, with
   * its primary key and the classification of its data, closes the cube and
   * shows the definition with it
   */
  addMaterializedView(
    name: string,
    lambda: PlainObject,
    options: IngestMaterializedViewOptions,
  ): void {
    const { ingest } = this;
    if (
      !ingest ||
      this.getMaterializedViewNameProblem(name) !== undefined ||
      this.getMaterializedViewClassificationProblem(options.sensitivity) !==
        undefined
    ) {
      return;
    }
    ingestDefinition_addMaterializedView(ingest, name.trim(), lambda, {
      primaryKey: options.primaryKey,
      sensitivity: options.sensitivity.trim(),
    });
    this.closeOn(
      ingest,
      `Added materialized view ${name.trim()} to ${ingest.name}`,
    );
  }

  /**
   * Replaces the lambda of the materialized view opened to edit, in place
   * (Save MatView), closes the cube and shows the definition with it
   */
  saveMaterializedView(lambda: PlainObject): void {
    const { ingest, matView } = this;
    if (!ingest || matView === undefined) {
      return;
    }
    ingestDefinition_updateMaterializedView(ingest, matView, lambda);
    this.closeOn(
      ingest,
      `Saved materialized view ${matView} of ${ingest.name}`,
    );
  }

  /** Closes the cube, then shows the definition's grammar with the change */
  private closeOn(ingest: IngestDefinition, message: string): void {
    this.close();
    const editorState = this.editorStore.tabManagerState.tabs.find(
      (tab): tab is IngestDefinitionEditorState =>
        tab instanceof IngestDefinitionEditorState && tab.ingest === ingest,
    );
    if (editorState) {
      flowResult(editorState.generateElementGrammar()).catch(
        this.editorStore.applicationStore.alertUnhandledError,
      );
    }
    this.editorStore.applicationStore.notificationService.notifySuccess(
      message,
    );
  }
}
