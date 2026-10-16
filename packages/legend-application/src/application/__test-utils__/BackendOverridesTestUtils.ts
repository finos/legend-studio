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

import type { LegendApplicationConfig } from '../LegendApplicationConfig.js';

/**
 * The config's URL fields (named `...Url`) that `getBackendEntries()` doesn't
 * declare, apart from the ones given as not being backends (e.g. links to
 * other applications or to documentation). An application's test expects
 * this to be empty, so a backend added to its config can't miss the backend
 * servers dialog.
 */
export const TEST__getUndeclaredBackendUrlFields = (
  config: LegendApplicationConfig,
  nonBackendFields: string[] = [],
): string[] => {
  const declared = new Set(config.getBackendEntries().map((e) => e.field));
  return Object.entries(config)
    .filter(
      ([field, value]) =>
        /Url$/u.test(field) &&
        typeof value === 'string' &&
        !declared.has(field) &&
        !nonBackendFields.includes(field),
    )
    .map(([field]) => field);
};
