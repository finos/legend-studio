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
  type GeneratorFn,
  ActionState,
  LogEvent,
  assertErrorThrown,
  guaranteeNonNullable,
} from '@finos/legend-shared';
import { flow, makeObservable, observable } from 'mobx';
import { LEGEND_STUDIO_APP_EVENT } from '../__lib__/LegendStudioEvent.js';
import {
  type Showcase,
  type ShowcaseMetadata,
  ShowcaseRegistryServerClient,
} from '@finos/legend-server-showcase';
import type { LegendStudioApplicationStore } from './LegendStudioBaseStore.js';
import {
  ApplicationExtensionState,
  type GenericLegendApplicationStore,
} from '@finos/legend-application';

export class ShowcaseManagerState extends ApplicationExtensionState {
  private static readonly IDENTIFIER = 'showcase-manager';

  readonly applicationStore: LegendStudioApplicationStore;
  readonly fetchShowcasesState = ActionState.create();

  private readonly showcaseServerClient?: ShowcaseRegistryServerClient;

  showcases: ShowcaseMetadata[] = [];

  constructor(applicationStore: LegendStudioApplicationStore) {
    super();

    makeObservable(this, {
      showcases: observable,
      fetchShowcases: flow,
    });

    this.applicationStore = applicationStore;

    if (this.applicationStore.config.showcaseServerUrl) {
      this.showcaseServerClient = new ShowcaseRegistryServerClient({
        baseUrl: this.applicationStore.config.showcaseServerUrl,
      });
    }
  }

  override get INTERNAL__identifierKey(): string {
    return ShowcaseManagerState.IDENTIFIER;
  }

  static retrieveNullableState(
    applicationStore: GenericLegendApplicationStore,
  ): ShowcaseManagerState | undefined {
    return applicationStore.extensionStates.find((extensionState) => {
      if (
        /**
         * In development mode, when we make changes in certain areas like utils or base states, the following `instanceof`
         * check will fail as if there were multiple copies of the classes with the same name, this could be caused by either
         * React `fast-refresh` or `webpack HMR`; we didn't have time to really do a thorough debug here, as such,
         * we will just do a simple key check to match the right state to bypass the problem for development mode.
         */
        // eslint-disable-next-line no-process-env
        process.env.NODE_ENV === 'development'
      ) {
        return (
          extensionState.INTERNAL__identifierKey ===
          ShowcaseManagerState.IDENTIFIER
        );
      }
      return extensionState instanceof ShowcaseManagerState;
    }) as ShowcaseManagerState;
  }

  static retrieveState(
    applicationStore: GenericLegendApplicationStore,
  ): ShowcaseManagerState {
    return guaranteeNonNullable(
      ShowcaseManagerState.retrieveNullableState(applicationStore),
      `Can't find showcase manager state: make sure it is added as an editor extension state`,
    );
  }

  get isEnabled(): boolean {
    return Boolean(this.showcaseServerClient);
  }

  private get client(): ShowcaseRegistryServerClient {
    return guaranteeNonNullable(
      this.showcaseServerClient,
      `Showcase registry server client is not configured`,
    );
  }

  *fetchShowcases(): GeneratorFn<void> {
    if (!this.isEnabled || this.fetchShowcasesState.isInProgress) {
      return;
    }

    try {
      this.fetchShowcasesState.inProgress();
      this.showcases = (yield this.client.getShowcases()) as Showcase[];
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.SHOWCASE_MANAGER_FAILURE),
        error,
      );
    } finally {
      this.fetchShowcasesState.complete();
    }
  }
}
