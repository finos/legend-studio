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
  APPLICATION_EVENT,
  type ApplicationStore,
  LegendApplicationTelemetryHelper,
} from '@finos/legend-application';
import { getCurrentUserIDFromEngineServer } from '@finos/legend-graph';
import {
  ActionState,
  assertErrorThrown,
  type GeneratorFn,
  LogEvent,
} from '@finos/legend-shared';
import { flow, makeObservable } from 'mobx';
import type { LegendAnalyticsApplicationConfig } from '../application/LegendAnalyticsApplicationConfig.js';
import type { LegendAnalyticsPluginManager } from '../application/LegendAnalyticsPluginManager.js';

export type LegendAnalyticsApplicationStore = ApplicationStore<
  LegendAnalyticsApplicationConfig,
  LegendAnalyticsPluginManager
>;

/**
 * What Legend Analytics sets up before showing a page, as Legend Query does:
 * the viewer, read from the engine (data products run as them), and telemetry
 */
export class LegendAnalyticsBaseStore {
  readonly applicationStore: LegendAnalyticsApplicationStore;
  readonly initState = ActionState.create();

  constructor(applicationStore: LegendAnalyticsApplicationStore) {
    makeObservable(this, {
      initialize: flow,
    });
    this.applicationStore = applicationStore;
  }

  *initialize(): GeneratorFn<void> {
    if (!this.initState.isInInitialState) {
      this.applicationStore.notificationService.notifyIllegalState(
        'Base store is re-initialized',
      );
      return;
    }
    this.initState.inProgress();

    try {
      this.applicationStore.identityService.setCurrentUser(
        (yield getCurrentUserIDFromEngineServer(
          this.applicationStore.config.engineServerUrl,
        )) as string,
      );
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.logService.error(
        LogEvent.create(APPLICATION_EVENT.IDENTITY_AUTO_FETCH__FAILURE),
        error,
      );
      this.applicationStore.notificationService.notifyWarning(error.message);
    }

    this.applicationStore.telemetryService.setup();
    LegendApplicationTelemetryHelper.logEvent_ApplicationInitializationSucceeded(
      this.applicationStore.telemetryService,
      this.applicationStore,
    );

    this.initState.complete();
  }
}
