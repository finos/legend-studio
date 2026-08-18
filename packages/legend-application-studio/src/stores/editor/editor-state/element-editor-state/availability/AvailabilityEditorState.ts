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

import { type PackageableElement, Availability } from '@finos/legend-graph';
import { guaranteeType } from '@finos/legend-shared';
import { action, makeObservable, observable } from 'mobx';
import type { EditorStore } from '../../../EditorStore.js';
import { ElementEditorState } from '../ElementEditorState.js';
import { AvailabilityTestableState } from './testable/AvailabilityTestableState.js';

export enum AVAILABILITY_TAB {
  DEFINITION = 'Definition',
  TESTING = 'Testing',
}

export class AvailabilityEditorState extends ElementEditorState {
  activeTab = AVAILABILITY_TAB.DEFINITION;
  readonly testableState = new AvailabilityTestableState(this);

  constructor(editorStore: EditorStore, element: PackageableElement) {
    super(editorStore, element);

    makeObservable(this, {
      activeTab: observable,
      setActiveTab: action,
    });
  }

  get availability(): Availability {
    return guaranteeType(this.element, Availability);
  }

  setActiveTab(tab: AVAILABILITY_TAB): void {
    this.activeTab = tab;
  }

  override reprocess(
    newElement: PackageableElement,
    editorStore: EditorStore,
  ): ElementEditorState {
    return new AvailabilityEditorState(editorStore, newElement);
  }
}
