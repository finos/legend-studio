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

export class LayoutService {
  // backdrop
  backdropContainerElementID?: string | undefined;
  showBackdrop = false;

  // theme
  /**
   * NOTE: this is the poor man way of doing theming
   * we would need to revise this flag later
   * See https://github.com/finos/legend-studio/issues/264
   */
  TEMPORARY__isLightThemeEnabled = false;

  constructor() {
    makeObservable(this, {
      TEMPORARY__isLightThemeEnabled: observable,
      backdropContainerElementID: observable,
      showBackdrop: observable,
      setBackdropContainerElementID: action,
      setShowBackdrop: action,
      TEMPORARY__setIsLightThemeEnabled: action,
    });
  }

  TEMPORARY__setIsLightThemeEnabled(val: boolean): void {
    this.TEMPORARY__isLightThemeEnabled = val;
  }

  /**
   * Change the ID used to find the base element to mount the backdrop on.
   * This is useful when we want to use backdrop with embedded application which
   * requires its own backdrop usage.
   */
  setBackdropContainerElementID(val: string | undefined): void {
    this.backdropContainerElementID = val;
  }

  setShowBackdrop(val: boolean): void {
    this.showBackdrop = val;
  }
}
