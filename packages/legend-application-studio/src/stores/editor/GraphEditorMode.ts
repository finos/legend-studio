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

import type { PackageableElement } from '@finos/legend-graph';
import type { GeneratorFn } from '@finos/legend-shared';
import type { Entity } from '@finos/legend-storage';
import { makeObservable, flow, action } from 'mobx';
import type { EditorStore } from './EditorStore.js';

import type { GRAPH_EDITOR_MODE } from './EditorConfig.js';
import type { Problem } from './EditorGraphState.js';
import type { EditorInitialConfiguration } from './editor-state/element-editor-state/ElementEditorInitialConfiguration.js';

export abstract class GraphEditorMode {
  readonly editorStore: EditorStore;

  constructor(editorStore: EditorStore) {
    makeObservable(this, {
      initialize: flow,
      addElement: flow,
      deleteElement: flow,
      renameElement: flow,
      globalCompile: flow,
      updateGraphAndApplication: flow,
      onLeave: flow,
      cleanupBeforeEntering: flow,
      handleCleanupFailure: flow,
      openElement: action,
    });
    this.editorStore = editorStore;
  }

  get disableLeaveMode(): boolean {
    return false;
  }

  abstract initialize(options?: {
    isCompilationFailure?: boolean;
    isGraphBuildFailure?: boolean;
    useStoredEntities?: boolean;
  }): GeneratorFn<void>;
  abstract addElement(
    element: PackageableElement,
    packagePath: string | undefined,
    openAfterCreate: boolean,
  ): GeneratorFn<void>;
  abstract deleteElement(element: PackageableElement): GeneratorFn<void>;
  abstract renameElement(
    element: PackageableElement,
    newPath: string,
  ): GeneratorFn<void>;
  abstract getCurrentGraphHash(): string | undefined;
  abstract globalCompile(options?: {
    message?: string;
    disableNotificationOnSuccess?: boolean;
    openConsole?: boolean;
    ignoreBlocking?: boolean | undefined;
    suppressCompilationFailureMessage?: boolean | undefined;
  }): GeneratorFn<void>;
  abstract updateGraphAndApplication(entities: Entity[]): GeneratorFn<void>;
  abstract get mode(): GRAPH_EDITOR_MODE;
  abstract goToProblem(problem: Problem): void;
  abstract onLeave(fallbackOptions?: {
    isCompilationFailure?: boolean;
    isGraphBuildFailure?: boolean;
  }): GeneratorFn<void>;
  abstract cleanupBeforeEntering(fallbackOptions?: {
    isCompilationFailure?: boolean;
    isGraphBuildFailure?: boolean;
  }): GeneratorFn<void>;
  abstract handleCleanupFailure(error: unknown): GeneratorFn<void>;
  abstract openElement(
    element: PackageableElement,
    config?: EditorInitialConfiguration | undefined,
  ): void;
}
