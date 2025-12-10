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

import { action, computed, makeObservable, observable } from 'mobx';
import type { GenericLegendApplicationStore } from './ApplicationStore.js';
import { LEGEND_APPLICATION_SETTING_KEY } from '../__lib__/LegendApplicationSetting.js';
import { LogEvent, guaranteeNonNullable } from '@finos/legend-shared';
import { APPLICATION_EVENT } from '../__lib__/LegendApplicationEvent.js';
import {
  DEFAULT_DARK_COLOR_THEME,
  LEGEND_APPLICATION_COLOR_THEME,
} from '../__lib__/LegendApplicationColorTheme.js';

export type ColorTheme = {
  name: string;
  key: string;
  /**
   * When we eventually refactor theme into palette, we can remove this
   * See https://github.com/finos/legend-studio/issues/264
   */
  TEMPORARY__globalCSSClassName: string;
  colors?: Record<string, string | undefined>;
};

export class LayoutService {
  readonly applicationStore: GenericLegendApplicationStore;

  // backdrop
  backdropContainerElementID?: string | undefined;
  showBackdrop = false;

  // color theme
  private readonly colorThemeRegistry = new Map<string, ColorTheme>();
  currentColorTheme!: ColorTheme;

  constructor(applicationStore: GenericLegendApplicationStore) {
    makeObservable(this, {
      currentColorTheme: observable.ref,
      TEMPORARY__isLightColorThemeEnabled: computed,
      backdropContainerElementID: observable,
      showBackdrop: observable,
      setBackdropContainerElementID: action,
      setShowBackdrop: action,
      setColorTheme: action,
    });
    this.applicationStore = applicationStore;

    // register core color themes
    // TODO: we might want to cover at least: a dark theme, a light theme, and a high contrast theme (etc.)
    // as part of core
    this.colorThemeRegistry.set(
      LEGEND_APPLICATION_COLOR_THEME.DEFAULT_DARK,
      DEFAULT_DARK_COLOR_THEME,
    );

    // register color themes from extensions
    this.applicationStore.pluginManager
      .getApplicationPlugins()
      .flatMap((plugin) => plugin.getExtraColorThemes?.() ?? [])
      .forEach((colorTheme) => {
        // NOTE: in the future, when we need to make theme extensible, we might want to reconsider this decision here
        // perhaps, each extension can define a new set of color keys that each theme supports and the core theme is extensible
        // while non-core themes are left in a separate package/module and might/might not have support for those color keys
        if (this.colorThemeRegistry.has(colorTheme.key)) {
          this.applicationStore.logService.warn(
            LogEvent.create(
              APPLICATION_EVENT.COLOR_THEME_CONFIGURATION_CHECK__FAILURE,
            ),
            `Found duplicated color themes with key '${colorTheme.key}'`,
          );
          return;
        }
        this.colorThemeRegistry.set(colorTheme.key, colorTheme);
      });

    const themeKey =
      this.applicationStore.settingService.getStringValue(
        LEGEND_APPLICATION_SETTING_KEY.COLOR_THEME,
      ) ?? LEGEND_APPLICATION_COLOR_THEME.DEFAULT_DARK;
    this.currentColorTheme = guaranteeNonNullable(
      this.colorThemeRegistry.get(themeKey),
    );
    this.TEMPORARY__syncGlobalCSSClassName(this.currentColorTheme, undefined);
  }

  getElementByID(val: string): Element | undefined {
    return document.querySelector(`[data-elementid='${val}']`) ?? undefined;
  }

  setWindowTitle(value: string): void {
    document.title = value;
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
    return (
      this.currentColorTheme.key !==
        LEGEND_APPLICATION_COLOR_THEME.DEFAULT_DARK &&
      this.currentColorTheme.key !==
        LEGEND_APPLICATION_COLOR_THEME.HIGH_CONTRAST_DARK
    );
  }

  private TEMPORARY__syncGlobalCSSClassName(
    theme: ColorTheme,
    previousTheme: ColorTheme | undefined,
  ): void {
    if (previousTheme) {
      document.body.classList.remove(
        previousTheme.TEMPORARY__globalCSSClassName,
      );
    }
    document.body.classList.add(theme.TEMPORARY__globalCSSClassName);
  }

  setColorTheme(
    key: string,
    options?: { persist?: boolean | undefined },
  ): void {
    const newColorTheme = this.colorThemeRegistry.get(key);
    if (key === this.currentColorTheme.key || !newColorTheme) {
      return;
    }

    const previousColorTheme = this.currentColorTheme;
    this.currentColorTheme = newColorTheme;
    this.TEMPORARY__syncGlobalCSSClassName(newColorTheme, previousColorTheme);

    if (options?.persist) {
      this.applicationStore.settingService.persistValue(
        LEGEND_APPLICATION_SETTING_KEY.COLOR_THEME,
        key,
      );
    }
  }

  getColor(key: string): string {
    return (
      this.currentColorTheme.colors?.[key] ??
      guaranteeNonNullable(
        this.colorThemeRegistry.get(
          LEGEND_APPLICATION_COLOR_THEME.DEFAULT_DARK,
        ),
      ).colors?.[key] ??
      'transparent'
    );
  }
}
