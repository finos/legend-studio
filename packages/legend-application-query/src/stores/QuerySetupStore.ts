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

import { action, computed, flow, makeObservable, observable } from 'mobx';
import {
  type GeneratorFn,
  ActionState,
  assertErrorThrown,
  LogEvent,
  uniq,
  isNonNullable,
} from '@finos/legend-shared';
import { BasicGraphManagerState } from '@finos/legend-graph';
import type { DepotServerClient } from '@finos/legend-server-depot';
import { LEGEND_QUERY_APP_EVENT } from '../__lib__/LegendQueryEvent.js';
import {
  DEFAULT_TAB_SIZE,
  LEGEND_APPLICATION_COLOR_THEME,
} from '@finos/legend-application';
import type { LegendQueryPluginManager } from '../application/LegendQueryPluginManager.js';
import type { LegendQueryApplicationStore } from './LegendQueryBaseStore.js';
import { generateQuerySetupRoute } from '../__lib__/LegendQueryNavigation.js';
import type { QuerySetupActionConfiguration } from './LegendQueryApplicationPlugin.js';

export abstract class BaseQuerySetupStore {
  readonly applicationStore: LegendQueryApplicationStore;
  readonly graphManagerState: BasicGraphManagerState;
  readonly depotServerClient: DepotServerClient;
  readonly pluginManager: LegendQueryPluginManager;

  readonly initState = ActionState.create();

  constructor(
    applicationStore: LegendQueryApplicationStore,
    depotServerClient: DepotServerClient,
  ) {
    makeObservable(this, {
      initialize: flow,
    });

    this.applicationStore = applicationStore;
    this.graphManagerState = new BasicGraphManagerState(
      applicationStore.pluginManager,
      applicationStore.logService,
    );
    this.depotServerClient = depotServerClient;
    this.pluginManager = applicationStore.pluginManager;
  }

  *initialize(): GeneratorFn<void> {
    if (!this.initState.isInInitialState) {
      return;
    }

    // TODO?: remove this when we properly support theme everywhere
    // See https://github.com/finos/legend-studio/issues/264
    this.applicationStore.layoutService.setColorTheme(
      LEGEND_APPLICATION_COLOR_THEME.DEFAULT_DARK,
    );

    try {
      this.initState.inProgress();
      yield this.graphManagerState.graphManager.initialize(
        {
          env: this.applicationStore.config.env,
          tabSize: DEFAULT_TAB_SIZE,
          clientConfig: {
            baseUrl: this.applicationStore.config.engineServerUrl,
            queryBaseUrl: this.applicationStore.config.engineQueryServerUrl,
            enableCompression: true,
          },
        },
        {
          tracerService: this.applicationStore.tracerService,
        },
      );

      this.initState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.logService.error(
        LogEvent.create(LEGEND_QUERY_APP_EVENT.GENERIC_FAILURE),
        error,
      );
      this.applicationStore.alertService.setBlockingAlert({
        message: `Can't initialize query setup store`,
      });
      this.initState.fail();
    }
  }
}

export class QuerySetupLandingPageStore {
  readonly applicationStore: LegendQueryApplicationStore;
  readonly pluginManager: LegendQueryPluginManager;

  readonly initState = ActionState.create();

  actions: QuerySetupActionConfiguration[] = [];
  tags: string[] = [];
  showAllGroups = false;
  showAdvancedActions = false;
  tagToFocus?: string | undefined;

  constructor(applicationStore: LegendQueryApplicationStore) {
    makeObservable(this, {
      showAllGroups: observable,
      showAdvancedActions: observable,
      tagToFocus: observable,
      isCustomized: computed,
      setShowAllGroups: action,
      setShowAdvancedActions: action,
      setTagToFocus: action,
      initialize: action,
    });

    this.applicationStore = applicationStore;
    this.pluginManager = applicationStore.pluginManager;
    this.actions = this.pluginManager
      .getApplicationPlugins()
      .flatMap(
        (plugin) => plugin.getExtraQuerySetupActionConfigurations?.() ?? [],
      )
      .sort((a, b) => (a.isAdvanced ? 1 : 0) - (b.isAdvanced ? 1 : 0));
    this.tags = uniq(
      this.actions.map((config) => config.tag).filter(isNonNullable),
    ).sort();
  }

  get isCustomized(): boolean {
    return (
      this.showAllGroups || this.showAdvancedActions || Boolean(this.tagToFocus)
    );
  }

  setShowAllGroups(val: boolean): void {
    this.showAllGroups = val;
    this.updateCurentLocation();
  }

  setShowAdvancedActions(val: boolean): void {
    this.showAdvancedActions = val;
    this.updateCurentLocation();
  }

  setTagToFocus(val: string | undefined): void {
    if (val && !this.tags.includes(val)) {
      return;
    }
    this.tagToFocus = val;
    this.updateCurentLocation();
  }

  resetConfig(): void {
    this.setShowAdvancedActions(false);
    this.setShowAllGroups(false);
    this.setTagToFocus(undefined);
    this.updateCurentLocation();
  }

  private updateCurentLocation(): void {
    this.applicationStore.navigationService.navigator.updateCurrentLocation(
      generateQuerySetupRoute(
        this.showAllGroups,
        this.showAdvancedActions,
        this.tagToFocus,
      ),
    );
  }

  initialize(
    showAdvancedActions: string | undefined,
    showAllGroups: string | undefined,
    tagToFocus: string | undefined,
  ): void {
    if (!this.initState.isInInitialState) {
      return;
    }

    if (showAdvancedActions) {
      this.showAdvancedActions = showAdvancedActions !== 'false';
    }
    if (showAllGroups) {
      this.showAllGroups = showAllGroups !== 'false';
    }
    if (tagToFocus) {
      this.tagToFocus = this.tags.includes(tagToFocus) ? tagToFocus : undefined;
    }
    this.updateCurentLocation();

    this.initState.pass();
  }
}
