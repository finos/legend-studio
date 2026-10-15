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

import {
  assertErrorThrown,
  isString,
  isValidUrl,
  LogEvent,
} from '@finos/legend-shared';
import { action, computed, makeObservable, observable } from 'mobx';
import {
  writeBackendOverrides,
  type LegendApplicationAppliedBackendOverride,
  type LegendApplicationBackendEntry,
  type LegendApplicationBackendOverrides,
} from '../application/LegendApplicationBackendOverrides.js';
import { APPLICATION_EVENT } from '../__lib__/LegendApplicationEvent.js';
import type { GenericLegendApplicationStore } from './ApplicationStore.js';

/** A backend server as the backend servers dialog shows it */
export interface BackendOverrideEntry {
  entry: LegendApplicationBackendEntry;
  /** The URL in use: the override if there is one, else the configured URL */
  url: string;
  /** The URL `config.json` has */
  configuredUrl: string;
  /** The override in use, if any */
  override?: LegendApplicationAppliedBackendOverride | undefined;
}

/**
 * Lets the user override the URLs of the application's backend servers (e.g.
 * SDLC, engine) from the backend servers dialog. Overrides are saved in the
 * browser and applied to `config.json` when the application starts (see
 * `LegendApplication.applyBackendOverrides`), so saving reloads the
 * application: every server client and URL then uses them, including the
 * ones built before the application loads, such as the SDLC authorization
 * redirect.
 */
export class BackendOverrideService {
  readonly applicationStore: GenericLegendApplicationStore;

  isOpen = false;
  /** The URLs typed in the dialog, keyed by backend key; empty means no override */
  drafts = new Map<string, string>();

  constructor(applicationStore: GenericLegendApplicationStore) {
    makeObservable(this, {
      isOpen: observable,
      drafts: observable,
      entries: computed,
      hasDraftErrors: computed,
      open: action,
      close: action,
      setDraft: action,
      resetDraft: action,
      resetAllDrafts: action,
    });
    this.applicationStore = applicationStore;
  }

  /** Whether the deployment lets the user override backend URLs */
  get isEnabled(): boolean {
    return (
      this.applicationStore.config.enableBackendOverrides &&
      this.entries.length > 0
    );
  }

  /** The backend overrides in use */
  get activeOverrides(): BackendOverrideEntry[] {
    return this.entries.filter((entry) => entry.override !== undefined);
  }

  /** The application's backends that are configured */
  get entries(): BackendOverrideEntry[] {
    const config = this.applicationStore.config;
    return config.getBackendEntries().flatMap((entry) => {
      const url = (config as unknown as Record<string, unknown>)[entry.field];
      if (!isString(url)) {
        return [];
      }
      const override = config.backendOverrides.find(
        (applied) => applied.configPath === entry.configPath,
      );
      return [
        {
          entry,
          url,
          configuredUrl: override?.configuredUrl ?? url,
          override,
        },
      ];
    });
  }

  getDraft(key: string): string {
    return this.drafts.get(key) ?? '';
  }

  /** Why the URL typed for a backend can't be used, if it can't */
  getDraftError(key: string): string | undefined {
    const draft = this.getDraft(key).trim();
    return draft && !isValidUrl(draft) ? 'Invalid URL' : undefined;
  }

  get hasDraftErrors(): boolean {
    return this.entries.some(
      (entry) => this.getDraftError(entry.entry.key) !== undefined,
    );
  }

  open(): void {
    this.drafts.clear();
    this.activeOverrides.forEach((entry) => {
      if (entry.override) {
        this.drafts.set(entry.entry.key, entry.override.url);
      }
    });
    this.isOpen = true;
  }

  close(): void {
    this.isOpen = false;
  }

  setDraft(key: string, value: string): void {
    this.drafts.set(key, value);
  }

  resetDraft(key: string): void {
    this.drafts.delete(key);
  }

  resetAllDrafts(): void {
    this.drafts.clear();
  }

  /** Saves the URLs typed in the dialog and reloads the application to use them */
  saveAndReload(): void {
    if (this.hasDraftErrors) {
      return;
    }
    const overrides: LegendApplicationBackendOverrides = {};
    this.entries.forEach((entry) => {
      const draft = this.getDraft(entry.entry.key).trim();
      if (draft && draft !== entry.configuredUrl) {
        overrides[entry.entry.configPath] = draft;
      }
    });
    this.persistAndReload(overrides);
  }

  /** Removes every backend override and reloads the application */
  resetAndReload(): void {
    this.persistAndReload({});
  }

  private persistAndReload(overrides: LegendApplicationBackendOverrides): void {
    try {
      writeBackendOverrides(
        window.localStorage,
        this.applicationStore.config.appName,
        this.applicationStore.config.env,
        overrides,
      );
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.logService.error(
        LogEvent.create(APPLICATION_EVENT.BACKEND_OVERRIDES_APPLY__FAILURE),
        error,
      );
      this.applicationStore.notificationService.notifyError(
        `Can't save backend overrides: ${error.message}`,
      );
      return;
    }
    // NOTE: the application's own navigation blocking (e.g. Studio's unsaved
    // changes) still applies, so the user can stay and keep their work
    this.applicationStore.navigationService.navigator.reload();
  }
}
