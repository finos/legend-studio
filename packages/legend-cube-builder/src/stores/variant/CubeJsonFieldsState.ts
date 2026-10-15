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

import {
  getVariantDatabaseProblem,
  type Schema,
  type SchemaColumn,
} from '@finos/legend-cube';
import { assertErrorThrown, type GeneratorFn } from '@finos/legend-shared';
import {
  action,
  computed,
  flow,
  flowResult,
  makeObservable,
  observable,
} from 'mobx';
import { CubeEngineError } from '../../graph-manager/CubeEngine.js';
import type { CubeEditorState } from '../CubeEditorState.js';
import { CubeQueryRunAborted } from '../CubeQueryRun.js';
import {
  type CubeJsonField,
  filterCubeJsonFields,
  getCubeJsonFields,
} from './CubeJsonOffers.js';
import { readCubeJsonSample } from './CubeJsonSampling.js';
import type { CubeJsonSample } from './CubeJsonShape.js';

/** A field's path as one key */
const pathKey = (path: readonly string[]): string => JSON.stringify(path);

/**
 * A Variant input column's fields in an expression editor, Extend's or
 * Filter by Expression's (PLAN §11.20, V.9): opened from the column's chip,
 * read from a sample of the column just before the node being edited, so no
 * run of the cube is needed and stale rows don't matter. The sample is read
 * as Explore JSON reads one (listed in Runs, and it can be stopped); a field
 * clicked writes its expression into the editor's.
 */
export class CubeJsonFieldsState {
  readonly editorState: CubeEditorState;
  /** The node being edited, whose input is read */
  readonly nodeId: string;

  /** The column whose fields are open; `undefined` while closed */
  column: SchemaColumn | undefined;
  /** What was read, and of which column */
  sample:
    | { readonly column: string; readonly sample: CubeJsonSample }
    | undefined;
  isReading = false;
  /** Why the column couldn't be read */
  error: string | undefined;
  search = '';
  /** The fields folded, by path; every field starts open */
  readonly folded = observable.set<string>();
  /** The field whose other forms show, by path */
  formsOf: string | undefined;

  private controller: AbortController | undefined;

  constructor(editorState: CubeEditorState, nodeId: string) {
    makeObservable(this, {
      column: observable.ref,
      sample: observable.ref,
      isReading: observable,
      error: observable,
      search: observable,
      formsOf: observable,
      input: computed,
      databaseProblem: computed,
      fields: computed,
      shownFields: computed,
      toggle: flow,
      read: flow,
      stop: action,
      close: action,
      setSearch: action,
      toggleFolded: action,
      toggleForms: action,
    });
    this.editorState = editorState;
    this.nodeId = nodeId;
  }

  /** The node's input: its id and schema, once known */
  get input(): { id: string; schema: Schema } | undefined {
    const [id] = this.editorState.document.query.getInputIds(this.nodeId);
    const schema =
      id === undefined ? undefined : this.editorState.analysis.schemas.get(id);
    return id === undefined || !schema ? undefined : { id, schema };
  }

  /**
   * Why the fields can't be read: the database the node's input runs on has
   * no Variant functions; `undefined` when they can, or it isn't known yet
   */
  get databaseProblem(): string | undefined {
    const { editorState, input } = this;
    const { context, query } = editorState.document;
    return input === undefined || context?.runtime === undefined
      ? undefined
      : getVariantDatabaseProblem(
          editorState.getRunDatabaseType(
            query,
            input.id,
            context.model,
            context.runtime,
          ),
        );
  }

  /** The open column's fields, from what was read of it */
  get fields(): CubeJsonField | undefined {
    const { column, sample } = this;
    return column && sample?.column === column.name
      ? getCubeJsonFields(column.name, sample.sample)
      : undefined;
  }

  /** The fields matching the search, with the fields they are in */
  get shownFields(): CubeJsonField | undefined {
    return this.fields && filterCubeJsonFields(this.fields, this.search);
  }

  isOpen(column: string): boolean {
    return this.column?.name === column;
  }

  isFolded(path: readonly string[]): boolean {
    return this.folded.has(pathKey(path));
  }

  areFormsShown(path: readonly string[]): boolean {
    return this.formsOf === pathKey(path);
  }

  /**
   * Opens a column's fields, reading its first values unless they were read
   * already, or closes them if open. The model's databases are loaded first:
   * a database without JSON functions is refused, with the reason.
   */
  *toggle(column: SchemaColumn): GeneratorFn<void> {
    if (this.isOpen(column.name)) {
      this.close();
      return;
    }
    this.stop();
    this.column = column;
    this.error = undefined;
    this.search = '';
    this.formsOf = undefined;
    if (this.sample?.column === column.name) {
      return;
    }
    const { context } = this.editorState.document;
    if (context) {
      yield flowResult(this.editorState.loadModelOutline(context.model));
    }
    const problem = this.databaseProblem;
    if (problem) {
      this.error = problem;
      return;
    }
    yield flowResult(this.read(false));
  }

  /** Reads the open column's first values, or every row, before the node */
  *read(everyRow: boolean): GeneratorFn<void> {
    const { editorState, column, input } = this;
    if (!column || !input || this.isReading) {
      return;
    }
    const controller = new AbortController();
    this.controller = controller;
    this.isReading = true;
    this.error = undefined;
    try {
      const sample = (yield readCubeJsonSample(editorState, {
        document: editorState.document,
        afterId: input.id,
        column,
        everyRow,
        abortController: controller,
      })) as CubeJsonSample | undefined;
      if (this.controller === controller && sample) {
        this.sample = { column: column.name, sample };
      }
    } catch (error) {
      if (
        this.controller !== controller ||
        error instanceof CubeQueryRunAborted
      ) {
        return;
      }
      assertErrorThrown(error);
      this.error =
        error instanceof CubeEngineError ? error.firstLine : error.message;
    } finally {
      if (this.controller === controller) {
        this.controller = undefined;
        this.isReading = false;
      }
    }
  }

  /** Stops a read in flight, keeping what was read before it */
  stop(): void {
    this.controller?.abort();
    this.controller = undefined;
    this.isReading = false;
  }

  /** Closes the fields, keeping what was read for when they open again */
  close(): void {
    this.stop();
    this.column = undefined;
    this.error = undefined;
    this.formsOf = undefined;
  }

  setSearch(search: string): void {
    this.search = search;
  }

  toggleFolded(path: readonly string[]): void {
    const key = pathKey(path);
    if (this.folded.has(key)) {
      this.folded.delete(key);
    } else {
      this.folded.add(key);
    }
  }

  toggleForms(path: readonly string[]): void {
    const key = pathKey(path);
    this.formsOf = this.formsOf === key ? undefined : key;
  }
}
