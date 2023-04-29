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

import { PostValidation } from '@finos/legend-graph';
import type { ServiceEditorState } from './ServiceEditorState.js';
import {
  service_addValidation,
  service_deleteValidation,
} from '../../../../graph-modifier/DSL_Service_GraphModifierHelper.js';
import { action, makeObservable, observable } from 'mobx';
import type { EditorStore } from '../../../EditorStore.js';

export enum PostValidationTab {
  PARAMETERS = 'PARAMETERS',
  ASSERTIONS = 'ASSERTIONS',
}

export class PostValidationState {
  readonly servicePostValidationState: ServicePostValidationsState;
  validation: PostValidation;
  selectedTab = PostValidationTab.PARAMETERS;

  constructor(
    validation: PostValidation,
    servicePostValidationState: ServicePostValidationsState,
  ) {
    makeObservable(this, {
      validation: observable,
      selectedTab: observable,
      setSelectedTab: action,
    });
    this.validation = validation;
    this.servicePostValidationState = servicePostValidationState;
  }

  setSelectedTab(val: PostValidationTab): void {
    this.selectedTab = val;
  }
}

export class ServicePostValidationsState {
  readonly serviceEditorState: ServiceEditorState;
  readonly editorStore: EditorStore;
  selectedPostValidationState: PostValidationState | undefined;

  constructor(serviceEditorState: ServiceEditorState) {
    makeObservable(this, {
      selectedPostValidationState: observable,
      init: action,
      buildPostValidationState: action,
      addValidation: action,
      deleteValidation: action,
      changeValidation: action,
    });
    this.serviceEditorState = serviceEditorState;
    this.editorStore = serviceEditorState.editorStore;
    this.init();
  }

  get postValidations(): PostValidation[] {
    return this.serviceEditorState.service.postValidations;
  }

  init(): void {
    const currentVal = this.selectedPostValidationState?.validation;
    if (
      !currentVal ||
      (currentVal && !this.postValidations.includes(currentVal))
    ) {
      const validation = this.serviceEditorState.service.postValidations[0];
      if (validation) {
        this.selectedPostValidationState =
          this.buildPostValidationState(validation);
      }
    }
  }

  buildPostValidationState(validation: PostValidation): PostValidationState {
    return new PostValidationState(validation, this);
  }

  deleteValidation(validation: PostValidation): void {
    service_deleteValidation(this.serviceEditorState.service, validation);
    if (this.selectedPostValidationState?.validation === validation) {
      this.init();
    }
  }

  addValidation(): void {
    const val = new PostValidation();
    val.description = '';
    service_addValidation(this.serviceEditorState.service, val);
    this.selectedPostValidationState = this.buildPostValidationState(val);
  }

  changeValidation(validation: PostValidation): void {
    this.selectedPostValidationState =
      this.buildPostValidationState(validation);
  }
}
