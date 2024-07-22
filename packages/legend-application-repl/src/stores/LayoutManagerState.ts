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
import {
  action,
  computed,
  makeObservable,
  observable,
  runInAction,
} from 'mobx';

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
  title: string;
  readonly contentRenderer: (config: LayoutConfiguration) => React.ReactNode;
  window: WindowConfiguration = {};

  constructor(
    title: string,
    contentRenderer: (config: LayoutConfiguration) => React.ReactNode,
  ) {
    this.contentRenderer = contentRenderer;
    this.title = title;
  }
}

export class WindowState {
  readonly uuid = uuid();
  readonly configuration: LayoutConfiguration;
  readonly onClose?: (() => void) | undefined;

  constructor(
    configuration: LayoutConfiguration,
    onClose?: (() => void) | undefined,
  ) {
    this.configuration = configuration;
    this.onClose = onClose;
  }
}

export class LayoutManagerState {
  readonly application: GenericLegendApplicationStore;
  windows: WindowState[] = [];

  constructor(application: GenericLegendApplicationStore) {
    makeObservable(this, {
      windows: observable,
      newWindow: action,
      bringWindowFront: action,
      closeWindow: action,
    });

    this.application = application;
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
      window.onClose?.();
    }
  }
}

export const WINDOW_DEFAULT_OFFSET = 50;
export const WINDOW_DEFAULT_WIDTH = 800;
export const WINDOW_DEFAULT_HEIGHT = 600;
export const WINDOW_DEFAULT_MIN_WIDTH = 300;
export const WINDOW_DEFAULT_MIN_HEIGHT = 300;

export const DEFAULT_TOOL_PANEL_WINDOW_CONFIG: WindowConfiguration = {
  width: WINDOW_DEFAULT_WIDTH,
  height: WINDOW_DEFAULT_HEIGHT,
  minWidth: WINDOW_DEFAULT_MIN_WIDTH,
  minHeight: WINDOW_DEFAULT_MIN_HEIGHT,
  center: true,
};

export const DEFAULT_ALERT_WINDOW_CONFIG: WindowConfiguration = {
  width: 500,
  height: 80,
  minWidth: 200,
  minHeight: 80,
  center: true,
};

export class SingletonModeDisplayState {
  readonly layoutManagerState: LayoutManagerState;
  readonly configuration: LayoutConfiguration;
  window?: WindowState | undefined;

  constructor(
    layoutManagerState: LayoutManagerState,
    title: string,
    contentRenderer: (config: LayoutConfiguration) => React.ReactNode,
  ) {
    makeObservable(this, {
      window: observable,
      isOpen: computed,
      open: action,
      close: action,
    });

    this.layoutManagerState = layoutManagerState;
    this.configuration = new LayoutConfiguration(title, contentRenderer);
    this.configuration.window = DEFAULT_TOOL_PANEL_WINDOW_CONFIG;
  }

  get isOpen() {
    return Boolean(this.window);
  }

  open() {
    if (this.window) {
      this.layoutManagerState.bringWindowFront(this.window);
    } else {
      this.window = new WindowState(this.configuration, () =>
        runInAction(() => {
          this.window = undefined;
        }),
      );
      this.layoutManagerState.newWindow(this.window);
    }
  }

  close() {
    if (this.window) {
      this.layoutManagerState.closeWindow(this.window);
      this.window = undefined;
    }
  }
}
