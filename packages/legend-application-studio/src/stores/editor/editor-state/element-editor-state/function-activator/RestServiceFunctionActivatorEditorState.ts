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
  RestService,
  observe_RestService,
} from '@finos/legend-graph';
import {
  type GeneratorFn,
  ActionState,
  assertErrorThrown,
  guaranteeType,
} from '@finos/legend-shared';
import { makeObservable, action, flow, computed } from 'mobx';
import type { EditorStore } from '../../../EditorStore.js';
import { ElementEditorState } from '../ElementEditorState.js';

enum RestServiceOwnershipType {
  DEPLOYMENT_OWNERSHIP = 'deployment',
  USERLIST_OWNERSHIP = 'userList',
}

export const DeploymentOwnershipLabel = 'Deployment';
export const UserlistOwnershipLabel = 'User List';
export const OWNERSHIP_OPTIONS = [
  {
    label: DeploymentOwnershipLabel,
    value: RestServiceOwnershipType.DEPLOYMENT_OWNERSHIP,
  },
  {
    label: UserlistOwnershipLabel,
    value: RestServiceOwnershipType.USERLIST_OWNERSHIP,
  },
];

export type RestServiceOwnerOption = {
  label: string;
  value: string;
};

export class RestServiceFunctionActivatorEditorState extends ElementEditorState {
  readonly validateState = ActionState.create();
  readonly deployState = ActionState.create();

  constructor(editorStore: EditorStore, element: RestService) {
    super(editorStore, element);

    makeObservable(this, {
      activator: computed,
      reprocess: action,
      updateDocumentation: action,
      updatePattern: action,
      storeModel: action,
      generateLineage: action,
      validate: flow,
      deployToSandbox: flow,
    });
  }

  get activator(): RestService {
    return observe_RestService(
      guaranteeType(
        this.element,
        RestService,
        'Element inside restSerivce app function editor state must be a RestService',
      ),
    );
  }

  updateDocumentation(val: string): void {
    this.activator.documentation = val;
  }

  updatePattern(val: string): void {
    this.activator.pattern = val;
  }

  storeModel(val: boolean): void {
    this.activator.storeModel = val;
  }

  generateLineage(val: boolean): void {
    this.activator.generateLineage = val;
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

  *deployToSandbox(): GeneratorFn<void> {
    this.deployState.inProgress();
    try {
      yield this.editorStore.graphManagerState.graphManager.publishFunctionActivatorToSandbox(
        this.activator,
        new InMemoryGraphData(this.editorStore.graphManagerState.graph),
      );
      this.editorStore.applicationStore.notificationService.notifySuccess(
        'Rest Service Function Activator has been deployed successfully',
      );
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.notificationService.notifyError(error);
    } finally {
      this.deployState.complete();
    }
  }

  reprocess(
    newElement: RestService,
    editorStore: EditorStore,
  ): RestServiceFunctionActivatorEditorState {
    return new RestServiceFunctionActivatorEditorState(editorStore, newElement);
  }
}
