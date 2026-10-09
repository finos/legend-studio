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

import { action, computed, makeObservable, observable } from 'mobx';
import {
  type CubeDataProductProject,
  getCubeDataProductProject,
  getEffectiveCubeWarehouse,
  isCubeSnapshotVersion,
  withCubeDataProductWarehouse,
} from '../graph-manager/CubeDataProduct.js';
import {
  getCubeRememberedWarehouse,
  rememberCubeWarehouse,
} from './CubeDataProductWarehouse.js';
import type { CubeEditorState } from './CubeEditorState.js';

/**
 * Where a data product cube runs (PLAN §6.8, DP-2): its deployment class
 * and the warehouse, shown as it is sent. Editing the warehouse changes the
 * cube's model, as one undo step, and remembers the warehouse for the
 * viewer's next cubes; it calls no engine and re-types no source.
 */
export class CubeDataProductRuntimeState {
  readonly editorState: CubeEditorState;
  /**
   * Counts Cube's own writes of the remembered warehouse: user data isn't
   * observable, so reading it through this lets the page show a new one
   */
  private rememberedChanges = 0;

  constructor(editorState: CubeEditorState) {
    makeObservable<CubeDataProductRuntimeState, 'rememberedChanges'>(this, {
      rememberedChanges: observable,
      project: computed,
      isSnapshot: computed,
      canEditWarehouse: computed,
      remember: action,
      setWarehouse: action,
    });
    this.editorState = editorState;
  }

  /** The warehouse the viewer last picked, read afresh: another page may have changed it */
  get rememberedWarehouse(): string | undefined {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    this.rememberedChanges;
    return getCubeRememberedWarehouse(
      this.editorState.host.applicationStore.userDataService,
    );
  }

  /** The cube's data product project; none on a cube of tables, or one Cube can't run */
  get project(): CubeDataProductProject | undefined {
    const model = this.editorState.document.context?.model;
    return model ? getCubeDataProductProject(model) : undefined;
  }

  /** The warehouse the next run uses, as the engine picks it, from user data read at run time */
  get effectiveWarehouse(): string | undefined {
    const { project } = this;
    return project
      ? getEffectiveCubeWarehouse(project, this.rememberedWarehouse)
      : undefined;
  }

  get isSnapshot(): boolean {
    return this.project ? isCubeSnapshotVersion(this.project.versionId) : false;
  }

  get canEditWarehouse(): boolean {
    return !this.editorState.readOnly && this.project !== undefined;
  }

  /** Remembers the warehouse for the viewer's next cubes */
  remember(warehouse: string): void {
    rememberCubeWarehouse(
      this.editorState.host.applicationStore.userDataService,
      warehouse,
    );
    this.rememberedChanges++;
  }

  /**
   * Runs the cube on another warehouse; gives whether it changed. An empty
   * name, the warehouse already used, or a cube that can't be edited changes
   * nothing
   */
  setWarehouse(text: string): boolean {
    const warehouse = text.trim();
    const { context } = this.editorState.document;
    if (
      !this.canEditWarehouse ||
      !context ||
      !warehouse.length ||
      warehouse === this.effectiveWarehouse
    ) {
      return false;
    }
    this.editorState.applyDocument(
      this.editorState.document.withContext({
        ...context,
        model: withCubeDataProductWarehouse(context.model, warehouse),
      }),
    );
    this.remember(warehouse);
    return true;
  }
}
