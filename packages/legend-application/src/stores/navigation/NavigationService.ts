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

export type Location = string;
export type Address = string;

/**
 * This is an initial attempt to generalize the application navigation to other platforms
 *
 * NOTE: this might **NOT** be the right way to do this. Our intention here is to make
 * app navigator something generic enough so we are somewhat platform-agnostic
 * i.e. browser, electron, PC, UNIX, etc.
 *
 * We should design a more advanced concept `Location` to pass around.
 * Also, we should also generalize Router so it handles more than just
 * URLs. If we make `router` and `navigator` work together, we can potentially generalize
 * application navigation
 *
 * However, this depends on how and when we move to another platform, like `electron` for example
 * See https://github.com/finos/legend-studio/issues/718
 */
export interface ApplicationNavigator {
  /**
   * Reload the application using the same address
   */
  reload(options?: { ignoreBlocking?: boolean | undefined }): void;

  /**
   * Navigate to the specified location
   *
   * NOTE: this will reload the application
   * so application states will not be preserved
   * after navigation
   */
  goToLocation(
    location: Location,
    options?: { ignoreBlocking?: boolean | undefined },
  ): void;

  /**
   * Visit the specified address
   */
  goToAddress(
    address: Address,
    options?: { ignoreBlocking?: boolean | undefined },
  ): void;

  /**
   * Visit the specified address in a new window
   */
  visitAddress(address: Address): void;

  /**
   * Update the current location
   *
   * NOTE: any navigation actions: reload, go to address, go to location, etc.
   * explicitly updates the current location, this action will just update the
   * location without doing any navigation
   */
  updateCurrentLocation(location: Location): void;
  getCurrentAddress(): Address;
  getCurrentLocation(): Location;
  generateAddress(location: Location): Address;

  /**
   * Block all kinds of navigation, including going to another location,
   * changing address, and native platform navigation (e.g. in web browser, we will
   * block back/forward buttons), etc.
   */
  blockNavigation(
    blockCheckers: (() => boolean)[],
    onBlock?: ((onProceed: () => void) => void) | undefined,
    onNativePlatformNavigationBlock?: (() => void) | undefined,
  ): void;
  unblockNavigation(): void;
  get isNavigationBlocked(): boolean;
}

export class NavigationService {
  readonly navigator: ApplicationNavigator;

  constructor(navigator: ApplicationNavigator) {
    this.navigator = navigator;
  }
}
