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

import type { History } from 'history';
import { BrowserNavigator } from '../navigation/BrowserNavigator.js';
import { ApplicationPlatform } from './ApplicationPlatform.js';
import type { ApplicationNavigator } from '../navigation/NavigationService.js';
import type { GenericLegendApplicationStore } from '../ApplicationStore.js';

export class BrowserPlatform extends ApplicationPlatform {
  readonly navigator: BrowserNavigator;

  constructor(
    applicationStore: GenericLegendApplicationStore,
    config: { historyAPI: History },
  ) {
    super(applicationStore);
    this.navigator = new BrowserNavigator(config.historyAPI);
  }

  getNavigator(): ApplicationNavigator {
    return this.navigator;
  }
}
