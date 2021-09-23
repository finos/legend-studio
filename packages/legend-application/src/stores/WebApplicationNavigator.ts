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
import { guaranteeNonNullable } from '@finos/legend-shared';

/**
 * This is an initial attempt to try to generalize the application
 * to other platforms. But regardless, this is more convenient for testing.
 */
interface ApplicationNavigator<T> {
  reload(): void;
  goTo(location: T): void;
  jumpTo(location: T): void;
  openNewWindow(location: T): void;
  getCurrentLocation(): T;
}

export class WebApplicationNavigator implements ApplicationNavigator<string> {
  private readonly historyAPI: History;

  private get window(): Window {
    return guaranteeNonNullable(
      window,
      `Window object is not available in non-web environment`,
    );
  }

  constructor(historyApiClient: History) {
    this.historyAPI = historyApiClient;
  }

  reload(): void {
    this.window.location.reload();
  }

  goTo(location: string): void {
    this.historyAPI.push(location);
  }

  jumpTo(location: string): void {
    this.window.location.href = location;
  }

  openNewWindow(location: string): void {
    this.window.open(location, '_blank');
  }

  setCurrentLocation(location: string): void {
    this.window.history.pushState(null, '', location);
  }

  getCurrentLocation(): string {
    return this.window.location.href;
  }

  generateLocation(location: string): string {
    return (
      window.location.origin +
      this.historyAPI.createHref({ pathname: location })
    );
  }
}
