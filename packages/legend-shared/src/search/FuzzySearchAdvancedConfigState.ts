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

export enum ADVANCED_FUZZY_SEARCH_MODE {
  STANDARD = 'standard',
  INCLUDE = 'include match',
  EXACT = 'exact match',
  INVERSE = 'excludes exact match',
}

export class FuzzySearchAdvancedConfigState {
  currentMode = ADVANCED_FUZZY_SEARCH_MODE.STANDARD;
  onSearchModeChange: () => void;

  constructor(onSearchModeChange: () => void) {
    makeObservable(this, {
      currentMode: observable,
      isAdvancedSearchActive: computed,
      setCurrentMode: action,
    });

    this.onSearchModeChange = onSearchModeChange;
  }

  get isAdvancedSearchActive(): boolean {
    return this.currentMode !== ADVANCED_FUZZY_SEARCH_MODE.STANDARD;
  }

  generateSearchText(val: string): string {
    switch (this.currentMode) {
      case ADVANCED_FUZZY_SEARCH_MODE.INCLUDE: {
        return `'"${val}"`;
      }
      case ADVANCED_FUZZY_SEARCH_MODE.EXACT: {
        return `="${val}"`;
      }
      case ADVANCED_FUZZY_SEARCH_MODE.INVERSE: {
        return `!"${val}"`;
      }
      default: {
        return val;
      }
    }
  }

  setCurrentMode(val: ADVANCED_FUZZY_SEARCH_MODE): void {
    this.currentMode = val;
    this.onSearchModeChange();
  }
}
