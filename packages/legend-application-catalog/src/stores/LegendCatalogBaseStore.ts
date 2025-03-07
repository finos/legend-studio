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
  LegendApplicationTelemetryHelper,
  APPLICATION_EVENT,
} from '@finos/legend-application';
import { matchRoutes } from '@finos/legend-application/browser';
import {
  action,
  computed,
  flow,
  flowResult,
  makeObservable,
  observable,
} from 'mobx';
import { User, SDLCServerClient } from '@finos/legend-server-sdlc';
import { DepotServerClient } from '@finos/legend-server-depot';
import { getCurrentUserIDFromEngineServer } from '@finos/legend-graph';
import type { LegendCatalogApplicationConfig } from '../application/LegendCatalogApplicationConfig.js';
import type { LegendCatalogPluginManager } from '../application/LegendCatalogPluginManager.js';
import { LegendCatalogEventHelper } from '../__lib__/LegendCatalogEventHelper.js';
import { LEGEND_CATALOG_APP_EVENT } from '../__lib__/LegendCatalogEvent.js';

export type LegendCatalogApplicationStore = ApplicationStore<
  LegendCatalogApplicationConfig,
  LegendCatalogPluginManager
>;

export class LegendCatalogBaseStore {
  readonly applicationStore: LegendCatalogApplicationStore;
  readonly sdlcServerClient: SDLCServerClient;
  readonly depotServerClient: DepotServerClient;
  readonly pluginManager: LegendCatalogPluginManager;

  readonly initState = ActionState.create();

  isSDLCAuthorized: boolean | undefined = false;
  private isSDLCServerInitialized = false;
  SDLCServerTermsOfServicesUrlsToView: string[] = [];

  constructor(applicationStore: LegendCatalogApplicationStore) {
    makeObservable<LegendCatalogBaseStore, 'initializeSDLCServerClient'>(this, {
      isSDLCAuthorized: observable,
      SDLCServerTermsOfServicesUrlsToView: observable,
      needsToAcceptSDLCServerTermsOfServices: computed,
      initialize: flow,
      initializeSDLCServerClient: flow,
      dismissSDLCServerTermsOfServicesAlert: action,
    });

    this.applicationStore = applicationStore;
    this.pluginManager = applicationStore.pluginManager;

    // depot
    this.depotServerClient = new DepotServerClient({
      serverUrl: this.applicationStore.config.depotServerUrl,
    });
    this.depotServerClient.setTracerService(
      this.applicationStore.tracerService,
    );

    // sdlc
    this.sdlcServerClient = new SDLCServerClient({
      env: this.applicationStore.config.env,
      serverUrl: this.applicationStore.config.sdlcServerUrl,
      baseHeaders: this.applicationStore.config.sdlcServerBaseHeaders,
    });
    this.sdlcServerClient.setTracerService(this.applicationStore.tracerService);
  }

  *initialize(): GeneratorFn<void> {
    if (!this.initState.isInInitialState) {
      this.applicationStore.notificationService.notifyIllegalState(
        'Base store is re-initialized',
      );
      return;
    }
    this.initState.inProgress();

    this.isSDLCAuthorized = undefined;

    // retrieved the user identity is not already configured
    if (this.applicationStore.identityService.isAnonymous) {
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
    }

    // setup telemetry service
    this.applicationStore.telemetryService.setup();

    LegendApplicationTelemetryHelper.logEvent_ApplicationInitializationSucceeded(
      this.applicationStore.telemetryService,
      this.applicationStore,
    );

    LegendCatalogEventHelper.notify_ApplicationLoadSucceeded(
      this.applicationStore.eventService,
    );

    this.initState.complete();
  }

  get needsToAcceptSDLCServerTermsOfServices(): boolean {
    return Boolean(this.SDLCServerTermsOfServicesUrlsToView.length);
  }

  dismissSDLCServerTermsOfServicesAlert(): void {
    this.SDLCServerTermsOfServicesUrlsToView = [];
  }

  private *initializeSDLCServerClient(): GeneratorFn<void> {
    try {
      this.isSDLCAuthorized =
        (yield this.sdlcServerClient.isAuthorized()) as boolean;
      if (!this.isSDLCAuthorized) {
        this.applicationStore.navigationService.navigator.goToAddress(
          SDLCServerClient.authorizeCallbackUrl(
            this.applicationStore.config.sdlcServerUrl,
            this.applicationStore.navigationService.navigator.getCurrentAddress(),
          ),
        );
      } else {
        // Only proceed intialization after passing authorization check

        // check terms of service agreement status
        this.SDLCServerTermsOfServicesUrlsToView =
          (yield this.sdlcServerClient.hasAcceptedTermsOfService()) as string[];
        if (this.SDLCServerTermsOfServicesUrlsToView.length) {
          this.applicationStore.alertService.setActionAlertInfo({
            message: `Please read and accept the SDLC servers' terms of service`,
            prompt: `Click 'Done' when you have accepted all the terms`,
            type: ActionAlertType.CAUTION,
            actions: [
              {
                label: 'See terms of services',
                default: true,
                handler: (): void =>
                  this.SDLCServerTermsOfServicesUrlsToView.forEach((url) =>
                    this.applicationStore.navigationService.navigator.visitAddress(
                      url,
                    ),
                  ),
                type: ActionAlertActionType.PROCEED,
              },
              {
                label: 'Done',
                type: ActionAlertActionType.PROCEED_WITH_CAUTION,
                handler: (): void => {
                  this.dismissSDLCServerTermsOfServicesAlert();
                  this.applicationStore.navigationService.navigator.reload();
                },
              },
            ],
          });
        }

        // fetch server features config and platforms
        yield this.sdlcServerClient.fetchServerPlatforms();
        yield this.sdlcServerClient.fetchServerFeaturesConfiguration();

        // the sdlc server client is authorized and initialized
        this.isSDLCServerInitialized = true;
      }
    } catch (error) {
      assertErrorThrown(error);
      if (
        // eslint-disable-next-line no-process-env
        process.env.NODE_ENV === 'development' &&
        error instanceof NetworkClientError &&
        error.response.status === HttpStatus.UNAUTHORIZED
      ) {
        this.applicationStore.alertService.setActionAlertInfo({
          message:
            'The first time the application starts in development mode, the developer would need to authenticate using SDLC server. Please do so then manually reload the app',
          type: ActionAlertType.STANDARD,
          actions: [
            {
              label: 'Authenticate using SDLC',
              type: ActionAlertActionType.PROCEED,
              default: true,
              handler: (): void => {
                this.applicationStore.navigationService.navigator.visitAddress(
                  this.sdlcServerClient.currentUserUrl,
                );
                this.applicationStore.alertService.setBlockingAlert({
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
        this.applicationStore.logService.error(
          LogEvent.create(LEGEND_CATALOG_APP_EVENT.SDLC_MANAGER_FAILURE),
          error,
        );
        this.applicationStore.notificationService.notifyError(error);
      }
    }
  }
}
