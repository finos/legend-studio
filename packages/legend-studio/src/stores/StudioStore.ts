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
import {
  ActionState,
  LogEvent,
  assertErrorThrown,
  TelemetryService,
} from '@finos/legend-shared';
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
import { STUDIO_LOG_EVENT } from '../stores/StudioLogEvent';
import type { DepotServerClient } from '@finos/legend-server-depot';
import type { StudioPluginManager } from '../application/StudioPluginManager';
import type { StudioConfig } from '../application/StudioConfig';

const UNKNOWN_USER_ID = '(unknown)';

export class StudioStore {
  applicationStore: ApplicationStore<StudioConfig>;
  sdlcServerClient: SDLCServerClient;
  depotServerClient: DepotServerClient;
  pluginManager: StudioPluginManager;

  telemetryService = new TelemetryService();
  initState = ActionState.create();

  isSDLCAuthorized = false;
  SDLCServerTermsOfServicesUrlsToView: string[] = [];

  constructor(
    applicationStore: ApplicationStore<StudioConfig>,
    sdlcServerClient: SDLCServerClient,
    depotServerClient: DepotServerClient,
    pluginManager: StudioPluginManager,
  ) {
    makeObservable<StudioStore, 'checkSDLCAuthorization'>(this, {
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
    this.sdlcServerClient.registerTracerServicePlugins(
      this.pluginManager.getTracerServicePlugins(),
    );
    this.depotServerClient.registerTracerServicePlugins(
      this.pluginManager.getTracerServicePlugins(),
    );
    this.telemetryService.registerPlugins(
      this.pluginManager.getTelemetryServicePlugins(),
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
        LogEvent.create(STUDIO_LOG_EVENT.SDLC_MANAGER_FAILURE),
        error,
      );
      this.applicationStore.notifyWarning(error.message);
    }

    // setup telemetry service
    this.telemetryService.setUserId(currentUserID);
    this.telemetryService.logEvent(CORE_TELEMETRY_EVENT.APPLICATION_LOADED, {
      browser: {
        userAgent: navigator.userAgent,
      },
      screen: {
        height: window.screen.height,
        width: window.screen.width,
      },
    });

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
                  LogEvent.create(STUDIO_LOG_EVENT.SDLC_MANAGER_FAILURE),
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
        LogEvent.create(STUDIO_LOG_EVENT.SDLC_MANAGER_FAILURE),
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
