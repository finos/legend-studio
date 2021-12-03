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
 *
 * FIXME: this is not the right way to do this. Our intention here is to make
 * app navigator something generic enough so we are somewhat platform-agnostic
 * i.e. browser, electron, PC, UNIX, etc.
 *
 * Parameterize on the type of the location might not be the best thing to do.
 * Because typing wise, this forces us to also parameterize consumers of this,
 * which is `ApplicationStore`. It means that we must dictate in the source
 * code the platform the app depends on, clearly for web browser, `string` is the
 * easy option, but if we do so, it defeats the purpose of this abstraction in the
 * first place.
 *
 * As such, instead, we should design a more generic concept `Location` to pass around.
 * We would need to flesh out the details, but this is the rough idea.
 *
 * Another thought is that we should also genericize Router so it handles more than just
 * URLs. If we make `router` and `navigator` work together, we can potentially genericize
 * application navigation
 *
 * However, this depends on how and when we move to another platform, like `electron` for example
 * See https://github.com/finos/legend-studio/issues/718
 */
interface ApplicationNavigator<T> {
  reload(): void;
  goTo(location: T): void;
  jumpTo(location: T): void;
  openNewWindow(location: T): void;
  getCurrentLocation(): T;
  getCurrentLocationPath(): T;
  generateLocation(locationPath: T): T;
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

  getCurrentLocation(): string {
    return this.window.location.href;
  }

  getCurrentLocationPath(): string {
    return this.historyAPI.location.pathname;
  }

  generateLocation(locationPath: string): string {
    return (
      window.location.origin +
      this.historyAPI.createHref({ pathname: locationPath })
    );
  }
}
