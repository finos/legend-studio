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
  InMemoryGraphData,
  type INTERNAL__UnknownFunctionActivator,
} from '@finos/legend-graph';
import type { EditorStore } from '../../EditorStore.js';
import { ElementEditorState } from './ElementEditorState.js';
import { action, flow, makeObservable } from 'mobx';
import {
  ActionState,
  assertErrorThrown,
  type GeneratorFn,
} from '@finos/legend-shared';

export class INTERNAL__UnknownFunctionActivatorEdtiorState extends ElementEditorState {
  readonly activator: INTERNAL__UnknownFunctionActivator;
  readonly validateState = ActionState.create();
  readonly publishToSandboxState = ActionState.create();

  constructor(
    editorStore: EditorStore,
    element: INTERNAL__UnknownFunctionActivator,
  ) {
    super(editorStore, element);

    makeObservable(this, {
      reprocess: action,
      validate: flow,
      publishToSandbox: flow,
    });

    this.activator = element;
  }

  *validate(): GeneratorFn<void> {
    this.validateState.inProgress();
    try {
      yield this.editorStore.graphManagerState.graphManager.validateFunctionActivator(
        this.activator,
        new InMemoryGraphData(this.editorStore.graphManagerState.graph),
      );
      this.editorStore.applicationStore.notificationService.notifySuccess(
        `Function activator is valid`,
      );
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.notificationService.notifyError(error);
    } finally {
      this.validateState.complete();
    }
  }

  *publishToSandbox(): GeneratorFn<void> {
    this.publishToSandboxState.inProgress();
    try {
      yield this.editorStore.graphManagerState.graphManager.publishFunctionActivatorToSandbox(
        this.activator,
        new InMemoryGraphData(this.editorStore.graphManagerState.graph),
      );
      this.editorStore.applicationStore.notificationService.notifySuccess(
        `Function activator is published to sandbox`,
      );
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.notificationService.notifyError(error);
    } finally {
      this.publishToSandboxState.complete();
    }
  }

  reprocess(
    newElement: INTERNAL__UnknownFunctionActivator,
    editorStore: EditorStore,
  ): INTERNAL__UnknownFunctionActivatorEdtiorState {
    return new INTERNAL__UnknownFunctionActivatorEdtiorState(
      editorStore,
      newElement,
    );
  }
}
