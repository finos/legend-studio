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
  type PackageableConnection,
  type SnowflakePermissionScheme,
  SnowflakeApp,
  ConnectionPointer,
  InMemoryGraphData,
  PackageableElementExplicitReference,
  observe_SnowflakeAppDeploymentConfiguration,
  observe_SnowflakeApp,
  DeploymentOwner,
  observe_DeploymentOwnership,
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

export class SnowflakeAppFunctionActivatorEdtiorState extends ElementEditorState {
  readonly validateState = ActionState.create();
  readonly deployState = ActionState.create();

  constructor(editorStore: EditorStore, element: SnowflakeApp) {
    super(editorStore, element);

    makeObservable(this, {
      activator: computed,
      reprocess: action,
      updateOwnership: action,
      updateUsageRole: action,
      updateDeploymentSchema: action,
      updatePermissionScopte: action,
      updateAppDescription: action,
      updateApplicationName: action,
      updateConnection: action,
      validate: flow,
      deployToSandbox: flow,
    });
  }

  get activator(): SnowflakeApp {
    return observe_SnowflakeApp(
      guaranteeType(
        this.element,
        SnowflakeApp,
        'Element inside snowflake app function editor state must be a SnowflakeApp',
      ),
    );
  }

  updateConnection(val: PackageableConnection): void {
    this.activator.activationConfiguration.activationConnection =
      new ConnectionPointer(PackageableElementExplicitReference.create(val));
    observe_SnowflakeAppDeploymentConfiguration(
      this.activator.activationConfiguration,
    );
  }

  updateOwnership(val: string): void {
    this.activator.ownership = new DeploymentOwner(val, this.activator);
    observe_DeploymentOwnership(this.activator.ownership);
  }

  updateApplicationName(val: string): void {
    this.activator.applicationName = val;
  }

  updateUsageRole(val: string | undefined): void {
    this.activator.usageRole = val;
  }

  updateDeploymentSchema(val: string | undefined): void {
    this.activator.deploymentSchema = val;
  }

  updatePermissionScopte(val: SnowflakePermissionScheme): void {
    this.activator.permissionScheme = val;
  }

  updateAppDescription(val: string): void {
    this.activator.description = val;
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
        'SnowflakeApp Function Activator has been deployed successfully',
      );
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.notificationService.notifyError(error);
    } finally {
      this.deployState.complete();
    }
  }

  reprocess(
    newElement: SnowflakeApp,
    editorStore: EditorStore,
  ): SnowflakeAppFunctionActivatorEdtiorState {
    return new SnowflakeAppFunctionActivatorEdtiorState(
      editorStore,
      newElement,
    );
  }
}
