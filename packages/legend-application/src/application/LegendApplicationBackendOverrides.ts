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

import { isObject, isString, returnUndefOnError } from '@finos/legend-shared';

/**
 * A backend server the application talks to, as declared by the application's
 * config so the backend servers dialog can list it and let the user override
 * its URL.
 */
export interface LegendApplicationBackendEntry {
  /** A stable identifier, e.g. `sdlc` */
  key: string;
  /** The name shown to the user, e.g. `SDLC Server` */
  label: string;
  /**
   * Dot-separated path of the URL in the raw `config.json`, e.g. `sdlc.url`:
   * this is where an override is applied, before the config is built
   */
  configPath: string;
  /**
   * Name of the config field the URL ends up in, e.g. `sdlcServerUrl`: used to
   * read the URL in use and to check that every backend URL field is declared
   */
  field: string;
}

/** An override that was applied to `config.json` when the application started */
export interface LegendApplicationAppliedBackendOverride {
  configPath: string;
  /** The URL `config.json` has */
  configuredUrl: string;
  /** The URL used instead */
  url: string;
}

/** Overridden URLs, keyed by config path (e.g. `sdlc.url`) */
export type LegendApplicationBackendOverrides = Record<string, string>;

/**
 * NOTE: overrides are read before the application store, hence its storage
 * service, exists, and before the application's storage key is known (its
 * default comes from the config class), so they live under their own key.
 */
export const LEGEND_APPLICATION_BACKEND_OVERRIDES_STORAGE_KEY =
  'legend-application-backend-overrides';

/**
 * Opening the application with this query parameter clears its backend
 * overrides: the way back when an override (e.g. an unreachable SDLC server)
 * keeps the application from loading. A link can clear overrides but never
 * set them: only the user, in the backend servers dialog, sets them.
 */
export const LEGEND_APPLICATION_RESET_BACKEND_OVERRIDES_QUERY_PARAM =
  'resetBackendOverrides';

/** Overrides are kept per application and environment */
const getBackendOverridesIndex = (appName: string, env: string): string =>
  `${appName}:${env}`;

const readAllBackendOverrides = (
  storage: Storage,
): Record<string, LegendApplicationBackendOverrides> => {
  const data = returnUndefOnError(() =>
    storage.getItem(LEGEND_APPLICATION_BACKEND_OVERRIDES_STORAGE_KEY),
  );
  const parsed = data
    ? returnUndefOnError(() => JSON.parse(data) as unknown)
    : undefined;
  return isObject(parsed)
    ? (parsed as Record<string, LegendApplicationBackendOverrides>)
    : {};
};

export const readBackendOverrides = (
  storage: Storage,
  appName: string,
  env: string,
): LegendApplicationBackendOverrides => {
  const overrides =
    readAllBackendOverrides(storage)[getBackendOverridesIndex(appName, env)];
  if (!isObject(overrides)) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(overrides).filter(
      (entry): entry is [string, string] =>
        isString(entry[1]) && entry[1] !== '',
    ),
  );
};

export const writeBackendOverrides = (
  storage: Storage,
  appName: string,
  env: string,
  overrides: LegendApplicationBackendOverrides,
): void => {
  const all = readAllBackendOverrides(storage);
  const index = getBackendOverridesIndex(appName, env);
  if (Object.keys(overrides).length) {
    all[index] = overrides;
  } else {
    delete all[index];
  }
  if (Object.keys(all).length) {
    storage.setItem(
      LEGEND_APPLICATION_BACKEND_OVERRIDES_STORAGE_KEY,
      JSON.stringify(all),
    );
  } else {
    storage.removeItem(LEGEND_APPLICATION_BACKEND_OVERRIDES_STORAGE_KEY);
  }
};

/**
 * Applies backend overrides to a copy of the raw `config.json`. Only a path
 * that already holds a string is overridden, so a stale override can't add a
 * backend the deployment doesn't configure.
 */
export const applyBackendOverrides = <T extends object>(
  configData: T,
  overrides: LegendApplicationBackendOverrides,
): {
  configData: T;
  applied: LegendApplicationAppliedBackendOverride[];
} => {
  const applied: LegendApplicationAppliedBackendOverride[] = [];
  if (!Object.keys(overrides).length) {
    return { configData, applied };
  }
  const result = JSON.parse(JSON.stringify(configData)) as T;
  Object.entries(overrides).forEach(([configPath, url]) => {
    const segments = configPath.split('.');
    const fieldName = segments.pop();
    let parent: unknown = result;
    for (const segment of segments) {
      parent = isObject(parent)
        ? (parent as Record<string, unknown>)[segment]
        : undefined;
    }
    if (!fieldName || !isObject(parent)) {
      return;
    }
    const container = parent as Record<string, unknown>;
    const configuredUrl = container[fieldName];
    if (!isString(configuredUrl) || configuredUrl === url) {
      return;
    }
    container[fieldName] = url;
    applied.push({ configPath, configuredUrl, url });
  });
  return { configData: result, applied };
};
