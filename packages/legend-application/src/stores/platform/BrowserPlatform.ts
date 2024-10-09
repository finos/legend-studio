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

import { BrowserNavigator } from '../navigation/BrowserNavigator.js';
import { ApplicationPlatform } from './ApplicationPlatform.js';
import type { ApplicationNavigator } from '../navigation/NavigationService.js';
import type { GenericLegendApplicationStore } from '../ApplicationStore.js';
import { LEGEND_APPLICATION_PARAM_TOKEN } from '../../__lib__/LegendApplicationNavigation.js';
import type { NavigateFunction } from 'react-router';

export class BrowserPlatform extends ApplicationPlatform {
  readonly navigator: BrowserNavigator;

  constructor(
    applicationStore: GenericLegendApplicationStore,
    config: { navigate: NavigateFunction; baseUrl: string },
  ) {
    super(applicationStore);
    this.navigator = new BrowserNavigator(config.navigate, config.baseUrl);
  }

  getNavigator(): ApplicationNavigator {
    return this.navigator;
  }

  override async initialize(): Promise<void> {
    // set initial color theme
    // NOTE: we allow this to avoid the flash of default color theme
    // when loading the page from another page/ when using the application in an iframe
    const initialColorTheme =
      this.applicationStore.navigationService.navigator.getCurrentLocationParameterValue(
        LEGEND_APPLICATION_PARAM_TOKEN.INITIAL_COLOR_THEME,
      );
    if (initialColorTheme) {
      this.applicationStore.layoutService.setColorTheme(initialColorTheme);
      this.applicationStore.navigationService.navigator.INTERNAL__internalizeTransientParameter(
        LEGEND_APPLICATION_PARAM_TOKEN.INITIAL_COLOR_THEME,
      );
    }
  }
}
