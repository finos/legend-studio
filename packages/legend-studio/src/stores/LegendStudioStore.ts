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
  type PlainObject,
  HttpStatus,
  NetworkClientError,
  ActionState,
  LogEvent,
  assertErrorThrown,
} from '@finos/legend-shared';
import {
  type ApplicationStore,
  ActionAlertActionType,
  ActionAlertType,
  ApplicationTelemetry,
} from '@finos/legend-application';
import {
  action,
  computed,
  flow,
  flowResult,
  makeObservable,
  observable,
} from 'mobx';
import { User, SDLCServerClient } from '@finos/legend-server-sdlc';
import { LEGEND_STUDIO_APP_EVENT } from './LegendStudioAppEvent';
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
    makeObservable<LegendStudioStore, 'initializeSDLCServerClient'>(this, {
      isSDLCAuthorized: observable,
      SDLCServerTermsOfServicesUrlsToView: observable,
      needsToAcceptSDLCServerTermsOfServices: computed,
      initialize: flow,
      initializeSDLCServerClient: flow,
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
    yield flowResult(this.initializeSDLCServerClient());

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
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.SDLC_MANAGER_FAILURE),
        error,
      );
      this.applicationStore.notifyWarning(error.message);
    }

    // setup telemetry service
    this.applicationStore.telemetryService.setUserId(currentUserID);

    ApplicationTelemetry.logEvent_GraphInitialized(
      this.applicationStore.telemetryService,
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

  private *initializeSDLCServerClient(): GeneratorFn<void> {
    try {
      this.isSDLCAuthorized =
        (yield this.sdlcServerClient.isAuthorized()) as boolean;
      if (!this.isSDLCAuthorized) {
        this.applicationStore.navigator.jumpTo(
          SDLCServerClient.authorizeCallbackUrl(
            this.applicationStore.config.sdlcServerUrl,
            this.applicationStore.navigator.getCurrentLocation(),
          ),
        );
      } else {
        // Only proceed intialization after passing authorization check

        // check terms of service agreement status
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

        // fetch server features config
        yield this.sdlcServerClient.fetchServerFeaturesConfiguration();
      }
    } catch (error) {
      assertErrorThrown(error);
      if (
        // eslint-disable-next-line no-process-env
        process.env.NODE_ENV === 'development' &&
        error instanceof NetworkClientError &&
        error.response.status === HttpStatus.UNAUTHORIZED
      ) {
        this.applicationStore.setActionAltertInfo({
          message:
            'The first time the application starts in development mode, the developer would need to authenticate using SDLC server. Please do so then manually reload the app',
          type: ActionAlertType.STANDARD,
          actions: [
            {
              label: 'Authenticate using SDLC',
              type: ActionAlertActionType.PROCEED,
              default: true,
              handler: (): void => {
                this.applicationStore.navigator.openNewWindow(
                  this.sdlcServerClient.currentUserUrl,
                );
                this.applicationStore.setBlockingAlert({
                  message:
                    'Waiting for the developer to authenticate using SDLC server',
                  prompt:
                    'Please manually reload the application after authentication',
                });
              },
            },
          ],
        });
      } else {
        this.applicationStore.log.error(
          LogEvent.create(LEGEND_STUDIO_APP_EVENT.SDLC_MANAGER_FAILURE),
          error,
        );
        this.applicationStore.notifyError(error);
      }
    }
  }

  get needsToAcceptSDLCServerTermsOfServices(): boolean {
    return Boolean(this.SDLCServerTermsOfServicesUrlsToView.length);
  }

  dismissSDLCServerTermsOfServicesAlert(): void {
    this.SDLCServerTermsOfServicesUrlsToView = [];
  }
}
