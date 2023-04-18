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

import { UnsupportedOperationError } from '@finos/legend-shared';
import {
  type NavigationAddress,
  type NavigationLocation,
  type ApplicationNavigator,
  type NavigationLocationParameterValue,
  type NavigationZone,
} from './NavigationService.js';

export class DefaultNavigator implements ApplicationNavigator {
  goToLocation(
    location: NavigationLocation,
    options?: { ignoreBlocking?: boolean | undefined },
  ): void {
    throw new UnsupportedOperationError(
      `Navigator does not support this operation`,
    );
  }

  reload(options?: { ignoreBlocking?: boolean | undefined }): void {
    throw new UnsupportedOperationError(
      `Navigator does not support this operation`,
    );
  }

  goToAddress(
    address: NavigationAddress,
    options?: { ignoreBlocking?: boolean | undefined },
  ): void {
    throw new UnsupportedOperationError(
      `Navigator does not support this operation`,
    );
  }

  visitAddress(address: NavigationAddress): void {
    throw new UnsupportedOperationError(
      `Navigator does not support this operation`,
    );
  }

  generateAddress(location: NavigationLocation): string {
    throw new UnsupportedOperationError(
      `Navigator does not support this operation`,
    );
  }

  updateCurrentLocation(location: NavigationLocation): void {
    throw new UnsupportedOperationError(
      `Navigator does not support this operation`,
    );
  }

  updateCurrentZone(zone: NavigationZone): void {
    throw new UnsupportedOperationError(
      `Navigator does not support this operation`,
    );
  }

  resetZone(): void {
    throw new UnsupportedOperationError(
      `Navigator does not support this operation`,
    );
  }

  getCurrentBaseAddress(options?: {
    withAppRoot?: boolean | undefined;
  }): NavigationAddress {
    throw new UnsupportedOperationError(
      `Navigator does not support this operation`,
    );
  }

  getCurrentAddress(): NavigationAddress {
    throw new UnsupportedOperationError(
      `Navigator does not support this operation`,
    );
  }

  getCurrentLocation(): NavigationLocation {
    throw new UnsupportedOperationError(
      `Navigator does not support this operation`,
    );
  }

  getCurrentLocationParameters<
    T extends Record<string, NavigationLocationParameterValue>,
  >(): T {
    throw new UnsupportedOperationError(
      `Navigator does not support this operation`,
    );
  }

  getCurrentLocationParameterValue(
    key: string,
  ): NavigationLocationParameterValue {
    throw new UnsupportedOperationError(
      `Navigator does not support this operation`,
    );
  }

  getCurrentZone(): NavigationZone {
    throw new UnsupportedOperationError(
      `Navigator does not support this operation`,
    );
  }

  blockNavigation(
    blockCheckers: (() => boolean)[],
    onBlock?: ((onProceed: () => void) => void) | undefined,
    onNativePlatformNavigationBlock?: (() => void) | undefined,
  ): void {
    throw new UnsupportedOperationError(
      `Navigator does not support this operation`,
    );
  }

  unblockNavigation(): void {
    throw new UnsupportedOperationError(
      `Navigator does not support this operation`,
    );
  }

  get isNavigationBlocked(): boolean {
    throw new UnsupportedOperationError(
      `Navigator does not support this operation`,
    );
  }

  INTERNAL__internalizeTransientParameter(key: string): void {
    throw new UnsupportedOperationError(
      `Navigator does not support this operation`,
    );
  }
}
