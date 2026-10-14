/**
 * Copyright (c) 2026-present, Goldman Sachs
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

import { isValidUrl } from '@finos/legend-shared';
import { action, computed, makeObservable, observable } from 'mobx';
import { LEGEND_CUBE_USER_DATA_KEY } from '../__lib__/LegendCubeLabels.js';
import type { CubeEngineClientSettings } from '../graph-manager/CubeEngineClientSettings.js';
import type { CubeHost } from './CubeHost.js';

/**
 * The page's Dev Settings, opened from the menu at the top left as Legend
 * Query's editor opens its own (PLAN §11.16): the engine's URL, and whether
 * Cube's engine clients compress their requests (uncompressed, the browser's
 * Network tab shows each request's JSON). Compression is kept for the user,
 * on by default; the URL lasts while the application runs, as Query's does.
 * Both change every engine client of Cube's host, from the next request.
 */
export class CubeDevSettingsState {
  private readonly host: CubeHost;
  private readonly settings: CubeEngineClientSettings | undefined;
  isOpen = false;
  requestCompression: boolean;
  /** The engine URL as typed: it is used once it is a URL */
  baseUrlText: string;

  constructor(host: CubeHost) {
    makeObservable<CubeDevSettingsState, 'host' | 'settings'>(this, {
      host: false,
      settings: false,
      isOpen: observable,
      requestCompression: observable,
      baseUrlText: observable,
      baseUrlError: computed,
      open: action,
      close: action,
      setRequestCompression: action,
      setBaseUrlText: action,
      resetBaseUrl: action,
    });
    this.host = host;
    this.settings = host.engineClientSettings;
    const uncompressed =
      host.applicationStore.userDataService.getBooleanValue(
        LEGEND_CUBE_USER_DATA_KEY.UNCOMPRESSED_REQUESTS,
      ) ?? false;
    if (uncompressed) {
      this.settings?.setRequestCompression(false);
    }
    this.requestCompression = this.settings?.requestCompression ?? true;
    this.baseUrlText = this.settings?.baseUrl ?? '';
  }

  /** Whether the host lets Dev Settings change its engine clients */
  get isAvailable(): boolean {
    return this.settings !== undefined;
  }

  /** The URL the host configured */
  get defaultBaseUrl(): string | undefined {
    return this.settings?.defaultBaseUrl;
  }

  /** Why the typed engine URL isn't used, if it isn't */
  get baseUrlError(): string | undefined {
    return isValidUrl(this.baseUrlText) ? undefined : 'Invalid URL';
  }

  open(): void {
    this.isOpen = true;
  }

  close(): void {
    this.isOpen = false;
  }

  setRequestCompression(compressed: boolean): void {
    if (!this.settings) {
      return;
    }
    this.requestCompression = compressed;
    this.settings.setRequestCompression(compressed);
    this.host.applicationStore.userDataService.persistValue(
      LEGEND_CUBE_USER_DATA_KEY.UNCOMPRESSED_REQUESTS,
      !compressed,
    );
  }

  /** Takes the typed engine URL, and uses it once it is a URL */
  setBaseUrlText(text: string): void {
    this.baseUrlText = text;
    if (this.settings && isValidUrl(text)) {
      this.settings.setBaseUrl(text);
    }
  }

  /** Goes back to the engine URL the host configured */
  resetBaseUrl(): void {
    if (!this.settings) {
      return;
    }
    this.settings.setBaseUrl(this.settings.defaultBaseUrl);
    this.baseUrlText = this.settings.defaultBaseUrl ?? '';
  }
}
