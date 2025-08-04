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

export type NavigationAddress = string;
export type NavigationLocationParameterValue = string | undefined;
export type NavigationLocation = string;
export type NavigationZone = string;

export const NAVIGATION_ZONE_SEPARATOR = '.';
export const NAVIGATION_ZONE_PREFIX = '#';

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
    location: NavigationLocation,
    options?: { ignoreBlocking?: boolean | undefined },
  ): void;

  /**
   * Visit the specified address
   */
  goToAddress(
    address: NavigationAddress,
    options?: { ignoreBlocking?: boolean | undefined },
  ): void;

  /**
   * Visit the specified address in a new window
   */
  visitAddress(address: NavigationAddress): void;

  /**
   * Generate the address from the current base address and the specified location
   */
  generateAddress(location: NavigationLocation): NavigationAddress;

  /**
   * Update the current location
   *
   * NOTE: any navigation actions: reload, go to address, go to location, etc.
   * explicitly updates the current location, this action will just update the
   * location without doing any navigation.
   *
   * NOTE: we need to reset zone when changing location
   */
  updateCurrentLocation(location: NavigationLocation): void;

  /**
   * Update the current zone
   *
   * Changing the address and location might potentially already included changing
   * the zone, this action will just update the zone.
   */
  updateCurrentZone(zone: NavigationZone): void;
  resetZone(): void;

  /**
   * Get the current address base
   */
  getCurrentBaseAddress(): NavigationAddress;
  getCurrentAddress(): NavigationAddress;

  getCurrentLocation(): NavigationLocation;
  getCurrentLocationParameters<
    T extends Record<string, NavigationLocationParameterValue>,
  >(options?: {
    replaceUrlSafeBase64Characters?: boolean | undefined;
    sanitizeParametersInsteadOfUrl?: boolean | undefined;
  }): T;
  getCurrentLocationParameterValue(
    key: string,
    options?: {
      replaceUrlSafeBase64Characters?: boolean | undefined;
      sanitizeParametersInsteadOfUrl?: boolean | undefined;
    },
  ): NavigationLocationParameterValue;

  getCurrentZone(): NavigationZone;

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

  /**
   * Remove a transient parameter, i.e. parameter that the application reads in and internalize
   * as a state and then remove from the address as it's no longer needed and would dirty the address.
   *
   * NOTE: This is somewhat a non-standard and hacky behavior, please avoid using this unless you know what you are doing.
   */
  INTERNAL__internalizeTransientParameter(key: string): void;
}

export class NavigationService {
  readonly navigator: ApplicationNavigator;

  constructor(navigator: ApplicationNavigator) {
    this.navigator = navigator;
  }
}
