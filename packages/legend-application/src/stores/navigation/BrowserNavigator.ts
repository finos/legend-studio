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

import {
  addQueryParametersToUrl,
  getQueryParameterValue,
  getQueryParameters,
  guaranteeNonNullable,
  noop,
  sanitizeURL,
  stringifyQueryParams,
} from '@finos/legend-shared';
import { action, computed, makeObservable, observable } from 'mobx';
import {
  type NavigationAddress,
  type NavigationLocation,
  type ApplicationNavigator,
  type NavigationLocationParameterValue,
  type NavigationZone,
  NAVIGATION_ZONE_PREFIX,
} from './NavigationService.js';
import {
  Outlet,
  Route,
  Routes,
  matchPath,
  matchRoutes,
  generatePath,
  useParams,
  useLocation,
  useSearchParams,
  type NavigateFunction,
} from 'react-router';

export { BrowserRouter } from 'react-router-dom';
export {
  Outlet,
  Route,
  Routes,
  useParams,
  useSearchParams,
  matchPath,
  matchRoutes,
  generatePath,
};
export const useNavigationZone = (): NavigationZone => {
  const location = useLocation();
  return location.hash.substring(NAVIGATION_ZONE_PREFIX.length);
};

/**
 * Prefix URL patterns coming from extensions with `/extensions/`
 * to avoid potential conflicts with main routes.
 */
export const generateExtensionUrlPattern = (pattern: string): string =>
  `/extensions/${pattern}`.replace(/^\/extensions\/\//, '/extensions/');

export function stripTrailingSlash(url: string): string {
  let _url = url;
  while (_url.endsWith('/')) {
    _url = _url.slice(0, -1);
  }
  return _url;
}

export class BrowserNavigator implements ApplicationNavigator {
  private readonly navigate: NavigateFunction;
  private readonly baseUrl: string;
  private _isNavigationBlocked = false;
  private _forceBypassNavigationBlocking = false;
  private _blockCheckers: (() => boolean)[] = [];
  private _beforeUnloadListener = (event: BeforeUnloadEvent): void => {
    if (this._forceBypassNavigationBlocking) {
      return;
    }
    if (this._blockCheckers.some((checker) => checker())) {
      // NOTE: there is no way to customize the alert message for now since Chrome removed support for it due to security concerns
      // See https://developer.mozilla.org/en-US/docs/Web/API/WindowEventHandlers/onbeforeunload#Browser_compatibility
      event.returnValue = '';
      event.preventDefault();
    }
  };

  onBlock?: ((onProceed: () => void) => void) | undefined;
  onNativePlatformNavigationBlock?: (() => void) | undefined;

  constructor(navigate: NavigateFunction, baseUrl: string) {
    makeObservable<BrowserNavigator, '_isNavigationBlocked'>(this, {
      _isNavigationBlocked: observable,
      isNavigationBlocked: computed,
      blockNavigation: action,
      unblockNavigation: action,
    });

    this.navigate = navigate;
    this.baseUrl = baseUrl;
  }

  private get window(): Window {
    return guaranteeNonNullable(
      window,
      `Window object is not available in non-web environment`,
    );
  }

  goToLocation(
    location: NavigationLocation,
    options?: { ignoreBlocking?: boolean | undefined },
  ): void {
    if (options?.ignoreBlocking) {
      this._forceBypassNavigationBlocking = true;
    }
    const onProceed = (): void => {
      this._forceBypassNavigationBlocking = true; // make sure to not trigger `BeforeUnloadEvent`
      this.window.location.href = this.generateAddress(location);
    };
    if (
      !this._forceBypassNavigationBlocking &&
      this._blockCheckers.some((checker) => checker())
    ) {
      this.onBlock?.(onProceed);
    } else {
      onProceed();
    }
  }

  reload(options?: { ignoreBlocking?: boolean | undefined }): void {
    if (options?.ignoreBlocking) {
      this._forceBypassNavigationBlocking = true;
    }
    const onProceed = (): void => {
      this._forceBypassNavigationBlocking = true; // make sure to not trigger `BeforeUnloadEvent`
      this.window.location.reload();
    };
    if (
      !this._forceBypassNavigationBlocking &&
      this._blockCheckers.some((checker) => checker())
    ) {
      this.onBlock?.(onProceed);
    } else {
      onProceed();
    }
  }

  goToAddress(
    address: NavigationAddress,
    options?: { ignoreBlocking?: boolean | undefined },
  ): void {
    if (options?.ignoreBlocking) {
      this._forceBypassNavigationBlocking = true;
    }
    const onProceed = (): void => {
      this._forceBypassNavigationBlocking = true; // make sure to not trigger `BeforeUnloadEvent`
      this.window.location.href = address;
    };
    if (
      !this._forceBypassNavigationBlocking &&
      this._blockCheckers.some((checker) => checker())
    ) {
      this.onBlock?.(onProceed);
    } else {
      onProceed();
    }
  }

  visitAddress(address: NavigationAddress): void {
    this.window.open(address, '_blank');
  }

  generateAddress(location: NavigationLocation): string {
    return this.window.location.origin + this.baseUrl + location;
  }

  updateCurrentLocation(location: NavigationLocation): void {
    // `react-router` NavigateFunction returns promise and non-promise type, so we need to wrap it
    // to avoid unhandled promise rejection if any. This might get resolved in the future.
    // See https://github.com/remix-run/react-router/issues/12348
    Promise.resolve(this.navigate(location)).catch(noop());
  }

  updateCurrentZone(zone: NavigationZone): void {
    this.window.location.hash = NAVIGATION_ZONE_PREFIX + zone;
  }

  resetZone(): void {
    this.updateCurrentLocation(this.getCurrentLocation());
  }

  getCurrentBaseAddress(options?: {
    withAppRoot?: boolean | undefined;
  }): NavigationAddress {
    if (options?.withAppRoot) {
      return this.generateAddress('');
    }
    return this.window.location.origin;
  }

  getCurrentAddress(): NavigationAddress {
    return this.window.location.href;
  }

  getCurrentLocation(): NavigationLocation {
    return this.window.location.pathname.substring(this.baseUrl.length);
  }

  getCurrentLocationParameters<
    T extends Record<string, NavigationLocationParameterValue>,
  >(): T {
    const result: Record<string, NavigationLocationParameterValue> = {};
    const parameters = getQueryParameters<
      Record<string, NavigationLocationParameterValue>
    >(sanitizeURL(this.getCurrentAddress()), true);
    Object.keys(parameters).forEach((key) => {
      result[key] = getQueryParameterValue(key, parameters);
    });
    return result as T;
  }

  getCurrentLocationParameterValue(
    key: string,
  ): NavigationLocationParameterValue {
    return this.getCurrentLocationParameters()[key];
  }

  getCurrentZone(): NavigationZone {
    return this.window.location.hash.substring(NAVIGATION_ZONE_PREFIX.length);
  }

  blockNavigation(
    blockCheckers: (() => boolean)[],
    onBlock?: ((onProceed: () => void) => void) | undefined,
    onNativePlatformNavigationBlock?: (() => void) | undefined,
  ): void {
    this._isNavigationBlocked = true;
    this.onBlock = onBlock;
    this.onNativePlatformNavigationBlock = onNativePlatformNavigationBlock;

    // Attempt to cancel the effect of the back button. The mechanism is as follows:
    //
    // This makes the current location the last entry in the browser history and clears any forward history.
    // The popstate event is triggered every time the user clicks back/forward button, but since the forward
    // history has been cleared, if we call, we call `history.forward()`, which go 1 page forward,
    // but there's no page forward, so effectively, the user remains on the same page
    //
    // NOTE: this approach ideal in that, technically the pop state event still can happen for a brief moment,
    // and thus, unecesssary renderings are not avoidable.
    // e.g. we're at route A, then navigate to B
    // we hit back button, we will go back to route A and then immediately go back to B
    // another exploit is user can hit the back button consecutively quickly and this would also break this
    // workaround we have here.
    //
    // All in all, this is the kind of workaround that attempts to override browser capabilities
    // should be avoided
    if (this.onNativePlatformNavigationBlock) {
      this.window.history.pushState(null, '', this.getCurrentAddress());
      this.window.onpopstate = () => {
        this.window.history.forward();
        this.onNativePlatformNavigationBlock?.();
      };
    }

    // Block browser navigation: e.g. reload, setting `window.href` directly, etc.
    this._blockCheckers = blockCheckers;
    this.window.removeEventListener('beforeunload', this._beforeUnloadListener);
    this.window.addEventListener('beforeunload', this._beforeUnloadListener);
  }

  unblockNavigation(): void {
    this._isNavigationBlocked = false;
    this.onBlock = undefined;
    this.window.onpopstate = null;
    this._blockCheckers = [];
    this.window.removeEventListener('beforeunload', this._beforeUnloadListener);
  }

  get isNavigationBlocked(): boolean {
    return this._isNavigationBlocked;
  }

  INTERNAL__internalizeTransientParameter(key: string): void {
    const currentZone = this.getCurrentZone();
    const parameters = this.getCurrentLocationParameters();
    delete parameters[key];

    this.updateCurrentLocation(
      addQueryParametersToUrl(
        this.getCurrentLocation(),
        stringifyQueryParams(parameters),
      ),
    );
    this.updateCurrentZone(currentZone);
  }
}
