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

import type { GenericLegendApplicationStore } from '@finos/legend-application';
import { uuid } from '@finos/legend-shared';
import { action, makeObservable, observable } from 'mobx';

export interface LayoutElementOwnerState {
  layout: LayoutConfiguration;
}

export type WindowConfiguration = {
  x?: number | undefined;
  y?: number | undefined;
  width?: number | undefined;
  height?: number | undefined;
  minWidth?: number | undefined;
  minHeight?: number | undefined;
  center?: boolean | undefined;
};

export class LayoutConfiguration {
  readonly owner: LayoutElementOwnerState;
  readonly contentRenderer: (config: LayoutConfiguration) => React.ReactNode;
  title: string;
  window: WindowConfiguration = {};

  constructor(
    owner: LayoutElementOwnerState,
    contentRenderer: (config: LayoutConfiguration) => React.ReactNode,
    title: string,
  ) {
    this.owner = owner;
    this.contentRenderer = contentRenderer;
    this.title = title;
  }
}

export class WindowState {
  readonly uuid = uuid();
  readonly configuration: LayoutConfiguration;

  constructor(configuration: LayoutConfiguration) {
    this.configuration = configuration;
  }
}

export class LayoutManagerState {
  readonly application: GenericLegendApplicationStore;
  windows: WindowState[] = [];

  constructor(applicationStore: GenericLegendApplicationStore) {
    makeObservable(this, {
      windows: observable,
      newWindow: action,
      bringWindowFront: action,
      closeWindow: action,
    });

    this.application = applicationStore;
  }

  newWindow(window: WindowState): void {
    this.windows.push(window);
  }

  bringWindowFront(window: WindowState): void {
    const matchingWindow = this.windows.find((w) => w.uuid === window.uuid);
    if (matchingWindow) {
      this.windows = this.windows.filter((w) => w.uuid !== window.uuid);
      this.windows.push(window);
    }
  }

  closeWindow(window: WindowState): void {
    const matchingWindow = this.windows.find((w) => w.uuid === window.uuid);
    if (matchingWindow) {
      this.windows = this.windows.filter((w) => w.uuid !== window.uuid);
    }
  }
}
