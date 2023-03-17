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

import { guaranteeNonNullable } from '@finos/legend-shared';
import { action, computed, makeObservable, observable } from 'mobx';
import type { GenericLegendApplicationStore } from './ApplicationStore.js';
import { LEGEND_APPLICATION_SETTINGS_KEY } from '../application/LegendApplicationStorage.js';

export type ColorTheme = {
  name: string;
  key: string;
  /**
   * When we eventually refactor theme into palette, we can remove this
   * See https://github.com/finos/legend-studio/issues/264
   */
  TEMPORARY__globalCSSClassName?: string | undefined;
};

export enum LEGEND_APPLICATION_COLOR_THEME {
  DEFAULT_DARK = 'default-dark',
  LEGACY_LIGHT = 'legacy-light',
  HIGH_CONTRAST_LIGHT = 'hc-light',
}

const DEFAULT_DARK_COLOR_THEME: ColorTheme = {
  name: 'Default Dark (default)',
  key: LEGEND_APPLICATION_COLOR_THEME.DEFAULT_DARK,
};

const LEGACY_LIGHT_COLOR_THEME: ColorTheme = {
  name: 'Legacy Light',
  key: LEGEND_APPLICATION_COLOR_THEME.LEGACY_LIGHT,
  TEMPORARY__globalCSSClassName: 'legacy-light',
};

const HIGH_CONTRAST_LIGHT_COLOR_THEME: ColorTheme = {
  name: 'High Contrast Light',
  key: LEGEND_APPLICATION_COLOR_THEME.HIGH_CONTRAST_LIGHT,
  TEMPORARY__globalCSSClassName: 'hc-light',
};

export class LayoutService {
  readonly applicationStore: GenericLegendApplicationStore;

  private readonly DEFAULT_THEME!: ColorTheme;

  // backdrop
  backdropContainerElementID?: string | undefined;
  showBackdrop = false;

  // color theme
  colorThemeRegistry = new Map<string, ColorTheme>();
  currentColorTheme!: ColorTheme;

  constructor(applicationStore: GenericLegendApplicationStore) {
    makeObservable(this, {
      currentColorTheme: observable,
      TEMPORARY__isLightColorThemeEnabled: computed,
      backdropContainerElementID: observable,
      showBackdrop: observable,
      setBackdropContainerElementID: action,
      setShowBackdrop: action,
      setColorTheme: action,
    });
    this.applicationStore = applicationStore;

    // theme
    this.DEFAULT_THEME = DEFAULT_DARK_COLOR_THEME;
    this.colorThemeRegistry.set(
      LEGEND_APPLICATION_COLOR_THEME.DEFAULT_DARK,
      this.DEFAULT_THEME,
    );
    this.colorThemeRegistry.set(
      LEGEND_APPLICATION_COLOR_THEME.LEGACY_LIGHT,
      LEGACY_LIGHT_COLOR_THEME,
    );
    this.colorThemeRegistry.set(
      LEGEND_APPLICATION_COLOR_THEME.HIGH_CONTRAST_LIGHT,
      HIGH_CONTRAST_LIGHT_COLOR_THEME,
    );
    this.currentColorTheme = guaranteeNonNullable(
      this.colorThemeRegistry.get(
        this.applicationStore.storageService.settingsStore.getStringValue(
          LEGEND_APPLICATION_SETTINGS_KEY.COLOR_THEME,
          this.DEFAULT_THEME.key,
        ),
      ),
    );
  }

  getElementByID(val: string): Element | undefined {
    return document.querySelector(`[data-elementid='${val}']`) ?? undefined;
  }

  /**
   * Change the ID used to find the base element to mount the backdrop on.
   * This is useful when we want to use backdrop with embedded application which
   * requires its own backdrop usage.
   *
   * TODO?: we can consider making backdrop container component auto-register its ID
   * as it gets rendered in the application
   */
  setBackdropContainerElementID(val: string | undefined): void {
    this.backdropContainerElementID = val;
  }

  setShowBackdrop(val: boolean): void {
    this.showBackdrop = val;
  }

  /**
   * NOTE: this is the poor man way of doing theming as we only properly support dark color theme
   * This flag is binary because we did light color theme in rush
   *
   * See https://github.com/finos/legend-studio/issues/264
   */
  get TEMPORARY__isLightColorThemeEnabled(): boolean {
    return this.currentColorTheme !== this.DEFAULT_THEME;
  }

  setColorTheme(
    val: string,
    options?: { persist?: boolean | undefined },
  ): void {
    this.currentColorTheme = val
      ? this.colorThemeRegistry.get(val) ?? this.DEFAULT_THEME
      : this.DEFAULT_THEME;

    if (options?.persist) {
      this.applicationStore.storageService.settingsStore.persist(
        LEGEND_APPLICATION_SETTINGS_KEY.COLOR_THEME,
        val === this.DEFAULT_THEME.key ? undefined : val,
      );
    }
  }
}
