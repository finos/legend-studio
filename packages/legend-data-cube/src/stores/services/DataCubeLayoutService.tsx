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

import { uuid } from '@finos/legend-shared';
import {
  action,
  computed,
  makeObservable,
  observable,
  runInAction,
} from 'mobx';

export type WindowSpecification = {
  x: number;
  y: number;
  width: number;
  height: number;
};

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
  ownerId?: string | undefined;
  specification?: WindowSpecification | undefined;

  constructor(
    configuration: LayoutConfiguration,
    onClose?: (() => void) | undefined,
    ownerId?: string | undefined,
  ) {
    this.configuration = configuration;
    this.onClose = onClose;
    this.ownerId = ownerId;
  }

  setSpecification(val: WindowSpecification) {
    this.specification = val;
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
  height: 200,
  minWidth: 200,
  minHeight: 80,
  center: true,
};

export class DisplayState {
  private readonly layout: LayoutManager;
  readonly configuration: LayoutConfiguration;
  readonly ownerId?: string | undefined;
  window?: WindowState | undefined;

  constructor(
    layout: LayoutManager,
    title: string,
    contentRenderer: (config: LayoutConfiguration) => React.ReactNode,
    ownerId?: string | undefined,
  ) {
    makeObservable(this, {
      window: observable,
      isOpen: computed,
      open: action,
      close: action,
    });

    this.layout = layout;
    this.configuration = new LayoutConfiguration(title, contentRenderer);
    this.configuration.window = DEFAULT_TOOL_PANEL_WINDOW_CONFIG;
    this.ownerId = ownerId;
  }

  get isOpen() {
    return Boolean(this.window);
  }

  open() {
    if (this.window) {
      this.layout.bringWindowFront(this.window);
    } else {
      this.window = new WindowState(
        this.configuration,
        () =>
          runInAction(() => {
            this.window = undefined;
          }),
        this.ownerId,
      );
      this.layout.newWindow(this.window, this.ownerId);
    }
  }

  close() {
    if (this.window) {
      this.layout.closeWindow(this.window);
      this.window = undefined;
    }
  }
}

export class LayoutManager {
  // TODO?: keep a hashmap, in parallel, for faster lookup
  windows: WindowState[] = [];

  constructor() {
    makeObservable(this, {
      windows: observable,
      newWindow: action,
      bringWindowFront: action,
      closeWindow: action,
      closeWindows: action,
    });
  }

  newDisplay(
    title: string,
    contentRenderer: (config: LayoutConfiguration) => React.ReactNode,
    windowConfiguration?: WindowConfiguration | undefined,
    ownerId?: string | undefined,
  ) {
    const display = new DisplayState(this, title, contentRenderer, ownerId);
    if (windowConfiguration) {
      display.configuration.window = windowConfiguration;
    }
    return display;
  }

  newWindow(window: WindowState, ownerId?: string | undefined) {
    window.ownerId = window.ownerId ?? ownerId;
    this.windows.push(window);
  }

  bringWindowFront(window: WindowState) {
    const matchingWindow = this.windows.find((w) => w.uuid === window.uuid);
    if (matchingWindow) {
      this.windows = this.windows.filter((w) => w.uuid !== window.uuid);
      this.windows.push(window);
    }
  }

  closeWindow(window: WindowState) {
    const matchingWindow = this.windows.find((w) => w.uuid === window.uuid);
    if (matchingWindow) {
      this.windows = this.windows.filter((w) => w.uuid !== window.uuid);
      window.onClose?.();
    }
  }

  closeWindows(windows: WindowState[]) {
    this.windows = this.windows.filter(
      (window) => !windows.find((w) => w.uuid === window.uuid),
    );
    windows.forEach((window) => window.onClose?.());
  }
}

export class DataCubeLayoutService {
  readonly uuid = uuid();
  readonly manager: LayoutManager;

  constructor(manager?: LayoutManager | undefined) {
    makeObservable(this, {
      windows: computed,
    });

    this.manager = manager ?? new LayoutManager();
  }

  get windows() {
    return this.manager.windows.filter(
      (window) => window.ownerId === this.uuid,
    );
  }

  newDisplay(
    title: string,
    contentRenderer: (config: LayoutConfiguration) => React.ReactNode,
    windowConfiguration?: WindowConfiguration | undefined,
  ) {
    return this.manager.newDisplay(
      title,
      contentRenderer,
      windowConfiguration,
      this.uuid,
    );
  }

  newWindow(window: WindowState) {
    this.manager.newWindow(window, this.uuid);
  }

  bringWindowFront(window: WindowState) {
    this.manager.bringWindowFront(window);
  }

  closeWindow(window: WindowState) {
    this.manager.closeWindow(window);
  }

  dispose() {
    // close all windows owned by this service
    this.manager.closeWindows(this.windows);
  }
}
