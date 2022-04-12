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

import { observable, computed, action, makeObservable } from 'mobx';
import { guaranteeType, UnsupportedOperationError } from '@finos/legend-shared';
import type { EditorStore } from '../../../EditorStore';
import {
  type ServiceExecutionState,
  ServicePureExecutionState,
} from './ServiceExecutionState';
import { ServiceRegistrationState } from '../../../editor-state/element-editor-state/service/ServiceRegistrationState';
import { ElementEditorState } from '../../../editor-state/element-editor-state/ElementEditorState';
import {
  type PackageableElement,
  Service,
  PureExecution,
} from '@finos/legend-graph';

export enum SERVICE_TAB {
  GENERAL = 'GENERAL',
  EXECUTION = 'EXECUTION',
  REGISTRATION = 'REGISTRATION',
}

export const MINIMUM_SERVICE_OWNERS = 2;
export class ServiceEditorState extends ElementEditorState {
  executionState: ServiceExecutionState;
  registrationState: ServiceRegistrationState;
  selectedTab = SERVICE_TAB.GENERAL;

  constructor(editorStore: EditorStore, element: PackageableElement) {
    super(editorStore, element);

    makeObservable(this, {
      executionState: observable,
      registrationState: observable,
      selectedTab: observable,
      setSelectedTab: action,
      service: computed,
      reprocess: action,
    });

    this.executionState = this.buildExecutionState();
    this.registrationState = new ServiceRegistrationState(editorStore, this);
  }

  setSelectedTab(tab: SERVICE_TAB): void {
    this.selectedTab = tab;
  }

  buildExecutionState(): ServiceExecutionState {
    if (this.service.execution instanceof PureExecution) {
      return new ServicePureExecutionState(
        this.editorStore,
        this,
        this.service.execution,
        this.service.test,
      );
    }
    throw new UnsupportedOperationError();
  }

  get service(): Service {
    return guaranteeType(
      this.element,
      Service,
      'Element inside service editor state must be a service',
    );
  }

  reprocess(
    newElement: PackageableElement,
    editorStore: EditorStore,
  ): ServiceEditorState {
    const serviceEditorState = new ServiceEditorState(editorStore, newElement);
    serviceEditorState.selectedTab = this.selectedTab;
    return serviceEditorState;
  }
}
