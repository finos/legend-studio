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
import { guaranteeType } from '@finos/legend-shared';
import type { EditorStore } from '../../../EditorStore.js';
import {
  type ServiceExecutionState,
  UnsupportedServiceExecutionState,
  SingleServicePureExecutionState,
  MultiServicePureExecutionState,
} from './ServiceExecutionState.js';
import { ServiceRegistrationState } from '../../../editor-state/element-editor-state/service/ServiceRegistrationState.js';
import { ElementEditorState } from '../../../editor-state/element-editor-state/ElementEditorState.js';
import {
  type PackageableElement,
  Service,
  PureSingleExecution,
  PureMultiExecution,
} from '@finos/legend-graph';
import { ServiceTestableState } from './testable/ServiceTestableState.js';

export enum SERVICE_TAB {
  GENERAL = 'GENERAL',
  EXECUTION = 'EXECUTION',
  TEST = 'TEST',
  REGISTRATION = 'REGISTRATION',
}

export const MINIMUM_SERVICE_OWNERS = 2;
export class ServiceEditorState extends ElementEditorState {
  executionState: ServiceExecutionState;
  registrationState: ServiceRegistrationState;
  testableState: ServiceTestableState;
  selectedTab = SERVICE_TAB.GENERAL;

  constructor(editorStore: EditorStore, element: PackageableElement) {
    super(editorStore, element);

    makeObservable(this, {
      executionState: observable,
      registrationState: observable,
      selectedTab: observable,
      setSelectedTab: action,
      resetExecutionState: action,
      service: computed,
      reprocess: action,
    });

    this.executionState = this.buildExecutionState();
    this.registrationState = new ServiceRegistrationState(editorStore, this);
    this.testableState = new ServiceTestableState(editorStore, this);
  }

  setSelectedTab(tab: SERVICE_TAB): void {
    this.selectedTab = tab;
  }

  resetExecutionState(): void {
    this.executionState = this.buildExecutionState();
  }

  buildExecutionState(): ServiceExecutionState {
    const execution = this.service.execution;
    if (execution instanceof PureSingleExecution) {
      return new SingleServicePureExecutionState(
        this.editorStore,
        this,
        execution,
      );
    } else if (execution instanceof PureMultiExecution) {
      return new MultiServicePureExecutionState(
        this.editorStore,
        this,
        execution,
      );
    }
    return new UnsupportedServiceExecutionState(
      this.editorStore,
      this,
      this.service.execution,
    );
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
