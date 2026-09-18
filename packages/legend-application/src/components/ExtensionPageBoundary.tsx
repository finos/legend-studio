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

import { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { useApplicationStore } from './ApplicationStoreProvider.js';
import { LegendApplicationTelemetryHelper } from '../__lib__/LegendApplicationTelemetry.js';

/**
 * Thin wrapper that emits a single `EXTENSION_PAGE__ACCESS` telemetry event
 * on mount for pages contributed by application plugins via
 * `getExtraApplicationPageEntries`. Colocating this in `legend-application`
 * means every host app (Studio, Query, DataCube, REPL, ...) gets consistent
 * extension-page visibility from a single line of routing code, without
 * every extension having to opt in to telemetry itself.
 */
export const ExtensionPageBoundary = observer(
  (props: { entryKey: string; pattern: string; children: React.ReactNode }) => {
    const { entryKey, pattern, children } = props;
    const applicationStore = useApplicationStore();

    useEffect(() => {
      LegendApplicationTelemetryHelper.logEvent_ExtensionPageAccessed(
        applicationStore.telemetryService,
        {
          key: entryKey,
          pattern,
          path: applicationStore.navigationService.navigator.getCurrentLocation(),
        },
      );
      // Fire once per mount — `entryKey` + `pattern` are the identity of a
      // logical page view. We intentionally skip `applicationStore` from the
      // dep list since it's stable for the lifetime of the app.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [entryKey, pattern]);

    return <>{children}</>;
  },
);
