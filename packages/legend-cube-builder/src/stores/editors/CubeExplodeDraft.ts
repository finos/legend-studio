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

import type { Explode, Schema } from '@finos/legend-cube';
import { assertErrorThrown, type GeneratorFn } from '@finos/legend-shared';
import { action, computed, flow, makeObservable, observable } from 'mobx';
import { CubeEngineError } from '../../graph-manager/CubeEngine.js';
import type { CubeEditorState } from '../CubeEditorState.js';
import { CubeQueryRunAborted } from '../CubeQueryRun.js';
import {
  type CubeJsonField,
  getCubeJsonElementName,
  getCubeJsonFields,
  getFreeCubeColumnName,
} from '../variant/CubeJsonOffers.js';
import { readCubeJsonSample } from '../variant/CubeJsonSampling.js';
import type { CubeJsonSample } from '../variant/CubeJsonShape.js';
import { isSameList } from './CubeAggregationRows.js';
import { CubeNodeDraft } from './CubeNodeDraft.js';

/** An array a sample of the column holds, to explode */
export interface CubeExplodeArray {
  /** The keys from the column to it, empty for the column itself */
  readonly path: readonly string[];
  /** What it held, e.g. `list of object` */
  readonly description: string;
  /** Its share, 0 to 1, of the places it could be */
  readonly presence: number;
}

/** The arrays of a column's fields, in tree order */
const arraysOf = (field: CubeJsonField): CubeExplodeArray[] => [
  ...(field.offers.some((offer) => offer.explode !== undefined)
    ? [
        {
          path: field.path,
          description: field.description,
          presence: field.presence,
        },
      ]
    : []),
  ...field.children.flatMap(arraysOf),
];

/**
 * The Explode Array editor's draft (PLAN §11.20): the Variant column, the
 * keys to its array and the new column's name. The arrays to pick from come
 * from a sample of the column's documents, read after the node's input as
 * Explore JSON reads them. Until a name is typed, the name follows the
 * column and keys (`<last key>_element`, free in the input); picking another
 * column drops the keys and the sample, which were the other column's.
 */
export class CubeExplodeDraft extends CubeNodeDraft<Explode> {
  readonly editorState: CubeEditorState;
  column: string;
  path: readonly string[];
  name: string;
  /** What a sample of the column held, once read */
  sample:
    | { readonly column: string; readonly sample: CubeJsonSample }
    | undefined;
  isSampling = false;
  /** Why the sample couldn't be read */
  sampleError: string | undefined;
  /** The name follows the column and keys until one is typed */
  private namedByDefault: boolean;
  private controller: AbortController | undefined;
  /** Anything was changed; until then, `build()` gives the original back */
  private touched = false;

  constructor(original: Explode, editorState: CubeEditorState) {
    super(original);
    makeObservable<CubeExplodeDraft, 'touched' | 'namedByDefault'>(this, {
      column: observable,
      path: observable.ref,
      name: observable,
      sample: observable.ref,
      isSampling: observable,
      sampleError: observable,
      namedByDefault: observable,
      touched: observable,
      arrays: computed,
      setColumn: action,
      setKey: action,
      addKey: action,
      removeKey: action,
      pickArray: action,
      setName: action,
      stopSample: action,
      readSample: flow,
    });
    this.editorState = editorState;
    this.column = original.column;
    this.path = original.path;
    this.name = original.name;
    this.namedByDefault = original.name === '';
  }

  /** The node's input: its id and schema, once known */
  private get input(): { id: string; schema: Schema } | undefined {
    const [id] = this.editorState.document.query.getInputIds(this.original.id);
    const schema =
      id === undefined ? undefined : this.editorState.analysis.schemas.get(id);
    return id === undefined || !schema ? undefined : { id, schema };
  }

  /** The arrays the sample found, if it was of the picked column */
  get arrays(): CubeExplodeArray[] | undefined {
    const { sample, column } = this;
    return sample && sample.column === column
      ? arraysOf(getCubeJsonFields(column, sample.sample))
      : undefined;
  }

  private edited(): void {
    this.touched = true;
    if (this.namedByDefault) {
      this.name = this.column
        ? getFreeCubeColumnName(
            getCubeJsonElementName(this.column, this.path),
            this.input?.schema.names() ?? [],
          )
        : '';
    }
  }

  /** Picks the column; another column's keys and sample are dropped */
  setColumn(column: string): void {
    if (column === this.column) {
      return;
    }
    this.stopSample();
    this.column = column;
    this.path = [];
    this.sample = undefined;
    this.sampleError = undefined;
    this.edited();
  }

  setKey(index: number, key: string): void {
    this.path = this.path.map((each, at) => (at === index ? key : each));
    this.edited();
  }

  addKey(): void {
    this.path = [...this.path, ''];
    this.edited();
  }

  removeKey(index: number): void {
    this.path = this.path.filter((_, at) => at !== index);
    this.edited();
  }

  /** Takes the keys of an array the sample found */
  pickArray(path: readonly string[]): void {
    this.path = path;
    this.edited();
  }

  /** Types the name: it no longer follows the column and keys */
  setName(name: string): void {
    this.name = name;
    this.namedByDefault = false;
    this.touched = true;
  }

  stopSample(): void {
    this.controller?.abort();
    this.controller = undefined;
    this.isSampling = false;
  }

  /**
   * Reads the picked column's first values after the node's input, as
   * Explore JSON does (listed in Runs, can be stopped), for the arrays they
   * hold; picking another column abandons it
   */
  *readSample(): GeneratorFn<void> {
    const { editorState, column, input } = this;
    const picked = column ? input?.schema.lookup(column) : undefined;
    if (this.isSampling || !input || !picked) {
      return;
    }
    const controller = new AbortController();
    this.controller = controller;
    this.isSampling = true;
    this.sampleError = undefined;
    try {
      const sample = (yield readCubeJsonSample(editorState, {
        document: editorState.document,
        afterId: input.id,
        column: picked,
        everyRow: false,
        abortController: controller,
      })) as CubeJsonSample | undefined;
      if (this.controller === controller && sample) {
        this.sample = { column, sample };
      }
    } catch (error) {
      if (
        this.controller !== controller ||
        error instanceof CubeQueryRunAborted
      ) {
        return;
      }
      assertErrorThrown(error);
      this.sampleError =
        error instanceof CubeEngineError ? error.firstLine : error.message;
    } finally {
      if (this.controller === controller) {
        this.controller = undefined;
        this.isSampling = false;
      }
    }
  }

  build(): Explode {
    const { original, column, path, name } = this;
    return !this.touched ||
      (column === original.column &&
        isSameList(path, original.path) &&
        name === original.name)
      ? original
      : original.with({ column, path, name });
  }
}
