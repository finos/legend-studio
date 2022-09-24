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

import { action, makeObservable, observable } from 'mobx';
import { SEARCH_MODE } from '../../stores/TextSearchAdvancedConfigStore.js';

export class TextSearchAdvancedConfigState {
  isOpen = false;
  modeOfSearch: SEARCH_MODE;
  modeOfSearchOptions: SEARCH_MODE[];
  search: () => void;

  constructor(search: () => void) {
    makeObservable(this, {
      isOpen: observable,
      modeOfSearch: observable,
      modeOfSearchOptions: observable,
      setIsOpen: action,
      changeModeOfSearch: action,
    });
    this.modeOfSearch = SEARCH_MODE.STANDARD;

    this.search = search;

    this.modeOfSearchOptions = [
      SEARCH_MODE.STANDARD,
      SEARCH_MODE.INCLUDE,
      SEARCH_MODE.EXACT,
      SEARCH_MODE.INVERSE,
    ];
  }

  getSearchText(val: string): string {
    switch (this.modeOfSearch) {
      case SEARCH_MODE.INCLUDE: {
        return `'${val}`;
      }
      case SEARCH_MODE.EXACT: {
        return `="${val}"`;
      }
      case SEARCH_MODE.INVERSE: {
        return `!${val}`;
      }
      default: {
        return val;
      }
    }
  }

  setIsOpen(val: boolean): void {
    this.isOpen = val;
  }

  changeModeOfSearch(val: SEARCH_MODE): void {
    this.modeOfSearch = val;
    this.search();
  }
}
