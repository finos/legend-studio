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

import type { GeneratorFn, PlainObject } from '@finos/legend-shared';
import { ActionState, LogEvent, assertErrorThrown } from '@finos/legend-shared';
import type { ApplicationStore } from '@finos/legend-application';
import {
  CORE_TELEMETRY_EVENT,
  ActionAlertActionType,
  ActionAlertType,
} from '@finos/legend-application';
import {
  action,
  computed,
  flow,
  flowResult,
  makeObservable,
  observable,
} from 'mobx';
import { User, SDLCMode, SDLCServerClient } from '@finos/legend-server-sdlc';
import { LEGEND_STUDIO_LOG_EVENT_TYPE } from './LegendStudioLogEvent';
import type { DepotServerClient } from '@finos/legend-server-depot';
import type { LegendStudioPluginManager } from '../application/LegendStudioPluginManager';
import type { LegendStudioConfig } from '../application/LegendStudioConfig';

const UNKNOWN_USER_ID = '(unknown)';

export class LegendStudioStore {
  applicationStore: ApplicationStore<LegendStudioConfig>;
  sdlcServerClient: SDLCServerClient;
  depotServerClient: DepotServerClient;
  pluginManager: LegendStudioPluginManager;

  initState = ActionState.create();

  isSDLCAuthorized = false;
  SDLCServerTermsOfServicesUrlsToView: string[] = [];

  constructor(
    applicationStore: ApplicationStore<LegendStudioConfig>,
    sdlcServerClient: SDLCServerClient,
    depotServerClient: DepotServerClient,
    pluginManager: LegendStudioPluginManager,
  ) {
    makeObservable<LegendStudioStore, 'checkSDLCAuthorization'>(this, {
      isSDLCAuthorized: observable,
      SDLCServerTermsOfServicesUrlsToView: observable,
      needsToAcceptSDLCServerTermsOfServices: computed,
      initialize: flow,
      checkSDLCAuthorization: flow,
      dismissSDLCServerTermsOfServicesAlert: action,
    });

    this.applicationStore = applicationStore;
    this.sdlcServerClient = sdlcServerClient;
    this.depotServerClient = depotServerClient;

    this.pluginManager = pluginManager;

    // Register plugins
    this.sdlcServerClient.setTracerService(this.applicationStore.tracerService);
    this.depotServerClient.setTracerService(
      this.applicationStore.tracerService,
    );
  }

  *initialize(): GeneratorFn<void> {
    if (!this.initState.isInInitialState) {
      this.applicationStore.notifyIllegalState(
        'Studio store is re-initialized',
      );
      return;
    }
    this.initState.inProgress();

    // setup SDLC server client
    yield flowResult(this.checkSDLCAuthorization());

    let currentUserID = UNKNOWN_USER_ID;
    try {
      const currentUser = User.serialization.fromJson(
        (yield this.sdlcServerClient.getCurrentUser()) as PlainObject<User>,
      );
      this.sdlcServerClient.setCurrentUser(currentUser);
      currentUserID = currentUser.userId;
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.log.error(
        LogEvent.create(LEGEND_STUDIO_LOG_EVENT_TYPE.SDLC_MANAGER_FAILURE),
        error,
      );
      this.applicationStore.notifyWarning(error.message);
    }

    // setup telemetry service
    this.applicationStore.telemetryService.setUserId(currentUserID);
    this.applicationStore.telemetryService.logEvent(
      CORE_TELEMETRY_EVENT.APPLICATION_LOADED,
      {
        browser: {
          userAgent: navigator.userAgent,
        },
        screen: {
          height: window.screen.height,
          width: window.screen.width,
        },
      },
    );

    this.initState.complete();
  }

  private *checkSDLCAuthorization(): GeneratorFn<void> {
    try {
      this.isSDLCAuthorized = (
        (yield Promise.all(
          Object.values(SDLCMode).map((mode) =>
            this.sdlcServerClient.isAuthorized(mode).catch((error) => {
              if (mode !== SDLCMode.PROD) {
                // if there is an issue with an endpoint in a non prod env, we return authorized as true
                // but notify the user of the error
                this.applicationStore.log.error(
                  LogEvent.create(
                    LEGEND_STUDIO_LOG_EVENT_TYPE.SDLC_MANAGER_FAILURE,
                  ),
                  error,
                );
                this.applicationStore.notifyError(error);
                return true;
              }
              throw error;
            }),
          ),
        )) as boolean[]
      ).every(Boolean);

      if (!this.isSDLCAuthorized) {
        this.applicationStore.navigator.jumpTo(
          SDLCServerClient.authorizeCallbackUrl(
            this.applicationStore.config.sdlcServerUrl,
            this.applicationStore.navigator.getCurrentLocation(),
          ),
        );
      } else {
        // Only proceed to check terms of service agreement status after the passing authorization check
        this.SDLCServerTermsOfServicesUrlsToView =
          (yield this.sdlcServerClient.hasAcceptedTermsOfService()) as string[];
        if (this.SDLCServerTermsOfServicesUrlsToView.length) {
          this.applicationStore.setActionAltertInfo({
            message: `Please read and accept the SDLC servers' terms of service`,
            prompt: `Click 'Done' when you have accepted all the terms`,
            type: ActionAlertType.CAUTION,
            actions: [
              {
                label: 'See terms of services',
                default: true,
                handler: (): void =>
                  this.SDLCServerTermsOfServicesUrlsToView.forEach((url) =>
                    this.applicationStore.navigator.openNewWindow(url),
                  ),
                type: ActionAlertActionType.PROCEED,
              },
              {
                label: 'Done',
                type: ActionAlertActionType.PROCEED_WITH_CAUTION,
                handler: (): void => {
                  this.dismissSDLCServerTermsOfServicesAlert();
                  this.applicationStore.navigator.reload();
                },
              },
            ],
          });
        }
      }
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.log.error(
        LogEvent.create(LEGEND_STUDIO_LOG_EVENT_TYPE.SDLC_MANAGER_FAILURE),
        error,
      );
      this.applicationStore.notifyError(error);
    }
  }

  get needsToAcceptSDLCServerTermsOfServices(): boolean {
    return Boolean(this.SDLCServerTermsOfServicesUrlsToView.length);
  }

  dismissSDLCServerTermsOfServicesAlert(): void {
    this.SDLCServerTermsOfServicesUrlsToView = [];
  }
}
