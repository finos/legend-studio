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
  HostedService,
  observe_HostedService,
  DeploymentOwner,
  UserList,
  type PostDeploymentAction,
} from '@finos/legend-graph';
import {
  type GeneratorFn,
  ActionState,
  assertErrorThrown,
  guaranteeType,
  type PlainObject,
} from '@finos/legend-shared';
import { makeObservable, action, flow, computed, observable } from 'mobx';
import type { EditorStore } from '../../../EditorStore.js';
import { ElementEditorState } from '../ElementEditorState.js';
import { activator_setOwnership } from '../../../../graph-modifier/DSL_FunctionActivator_GraphModifierHelper.js';
import { User } from '@finos/legend-server-sdlc';
import {
  ActionAlertActionType,
  ActionAlertType,
} from '@finos/legend-application';

//Ownership
export enum HostedServiceOwnershipType {
  DEPLOYMENT_OWNERSHIP = 'deploymentOwnership',
  USERLIST_OWNERSHIP = 'userListOwnership',
}
export const MINIMUM_HOSTED_SERVICE_OWNERS = 2;
export const DeploymentOwnershipLabel = 'Deployment';
export const UserlistOwnershipLabel = 'User List';

export const OWNERSHIP_OPTIONS = [
  {
    label: DeploymentOwnershipLabel,
    value: HostedServiceOwnershipType.DEPLOYMENT_OWNERSHIP,
  },
];

export enum ACTIVATOR_EDITOR_TAB {
  DEFINITION = 'DEFINITION',
  TAGGED_VALUES = 'TAGGED_VALUES',
  STEREOTYPES = 'STEREOTYPES',
  ACTIONS = 'ACTIONS',
}

export type HostedServiceOwnerOption = {
  label: string;
  value: string;
};

export class HostedServiceFunctionActivatorEditorState extends ElementEditorState {
  readonly validateState = ActionState.create();
  readonly renderArtifactState = ActionState.create();
  readonly deployState = ActionState.create();

  selectedTab: ACTIVATOR_EDITOR_TAB;
  selectedAction: PostDeploymentAction | undefined;
  artifact: PlainObject | undefined;

  constructor(editorStore: EditorStore, element: HostedService) {
    super(editorStore, element);

    makeObservable(this, {
      activator: computed,
      reprocess: action,
      updateDocumentation: action,
      updatePattern: action,
      setSelectedOwnership: action,
      selectedOwnership: computed,
      storeModel: action,
      validate: flow,
      renderArtifact: flow,
      artifact: observable,
      setArtifact: action,
      deployToSandbox: flow,
      searchUsers: flow,
      selectedTab: observable,
      selectedAction: observable,
      setSelectedTab: action,
      setSelectedAction: action,
    });

    this.selectedTab = ACTIVATOR_EDITOR_TAB.DEFINITION;
    this.selectedAction = undefined;
  }

  setSelectedTab(tab: ACTIVATOR_EDITOR_TAB): void {
    this.selectedTab = tab;
  }

  get activator(): HostedService {
    return observe_HostedService(
      guaranteeType(
        this.element,
        HostedService,
        'Element inside hosted service state must be a HostedService',
      ),
      this.editorStore.changeDetectionState.observerContext,
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

  setSelectedAction(postDeploymentAction: PostDeploymentAction): void {
    this.selectedAction = postDeploymentAction;
  }

  get selectedOwnership(): HostedServiceOwnerOption | undefined {
    const ownership = this.activator.ownership;
    if (ownership instanceof DeploymentOwner) {
      return {
        label: DeploymentOwnershipLabel,
        value: HostedServiceOwnershipType.DEPLOYMENT_OWNERSHIP,
      };
    } else if (ownership instanceof UserList) {
      return {
        label: UserlistOwnershipLabel,
        value: HostedServiceOwnershipType.USERLIST_OWNERSHIP,
      };
    }
    return undefined;
  }

  setSelectedOwnership(o: HostedServiceOwnerOption): void {
    switch (o.value) {
      case HostedServiceOwnershipType.DEPLOYMENT_OWNERSHIP: {
        activator_setOwnership(
          this.activator,
          new DeploymentOwner('', this.activator),
        );
        break;
      }
      case HostedServiceOwnershipType.USERLIST_OWNERSHIP: {
        const currentUserId =
          this.editorStore.graphManagerState.graphManager.TEMPORARY__getEngineConfig()
            .currentUserId;
        activator_setOwnership(
          this.activator,
          new UserList(currentUserId ? [currentUserId] : [], this.activator),
        );
        break;
      }
      default: {
        this.editorStore.applicationStore.notificationService.notifyError(
          'Unsupported ownership type',
        );
      }
    }
  }

  setArtifact(newArtifact: PlainObject | undefined): void {
    this.artifact = newArtifact;
  }

  *validate(): GeneratorFn<void> {
    this.validateState.inProgress();
    try {
      yield this.editorStore.graphManagerState.graphManager.validateFunctionActivator(
        this.activator,
        new InMemoryGraphData(this.editorStore.graphManagerState.graph),
      );
      this.editorStore.applicationStore.notificationService.notifySuccess(
        `Hosted Service is valid`,
      );
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.notificationService.notifyError(error);
    } finally {
      this.validateState.complete();
    }
  }

  *renderArtifact(): GeneratorFn<void> {
    this.renderArtifactState.inProgress();
    try {
      const artifact =
        (yield this.editorStore.graphManagerState.graphManager.renderFunctionActivatorArtifact(
          this.activator,
          new InMemoryGraphData(this.editorStore.graphManagerState.graph),
        )) as PlainObject;
      this.artifact = artifact;
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.notificationService.notifyError(error);
    } finally {
      this.renderArtifactState.complete();
    }
  }

  *deployToSandbox(): GeneratorFn<void> {
    this.deployState.inProgress();
    try {
      yield this.editorStore.graphManagerState.graphManager
        .publishFunctionActivatorToSandbox(
          this.activator,
          new InMemoryGraphData(this.editorStore.graphManagerState.graph),
        )
        .then((response) =>
          this.editorStore.applicationStore.alertService.setActionAlertInfo({
            message: `Hosted Service Function Activator has been deployed successfully`,
            prompt: response.deployed
              ? 'You can now launch and monitor the operation of your function activator'
              : undefined,
            type: ActionAlertType.STANDARD,
            actions: [
              ...(response.deployed !== undefined
                ? [
                    {
                      label: 'Launch Service',
                      type: ActionAlertActionType.PROCEED,
                      handler: (): void => {
                        this.editorStore.applicationStore.navigationService.navigator.visitAddress(
                          response.deployed ?? '',
                        );
                      },
                      default: true,
                    },
                  ]
                : []),
              {
                label: 'Close',
                type: ActionAlertActionType.PROCEED_WITH_CAUTION,
              },
            ],
          }),
        );
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.notificationService.notifyError(error);
    } finally {
      this.deployState.complete();
    }
  }

  *searchUsers(name: string): GeneratorFn<User[]> {
    try {
      return (
        (yield this.editorStore.sdlcServerClient.getUsers(
          name,
        )) as PlainObject<User>[]
      ).map((p) => User.serialization.fromJson(p));
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.notificationService.notifyError(error);
      return [];
    }
  }

  reprocess(
    newElement: HostedService,
    editorStore: EditorStore,
  ): HostedServiceFunctionActivatorEditorState {
    return new HostedServiceFunctionActivatorEditorState(
      editorStore,
      newElement,
    );
  }
}
