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

import { SDLCServerClient, User } from '@finos/legend-server-sdlc';
import {
  type GeneratorFn,
  assertErrorThrown,
  HttpStatus,
  LogEvent,
  NetworkClientError,
  type PlainObject,
} from '@finos/legend-shared';
import {
  action,
  computed,
  flow,
  flowResult,
  makeObservable,
  observable,
} from 'mobx';
import { APPLICATION_EVENT } from './ApplicationEvent.js';
import {
  type GenericLegendApplicationStore,
  ActionAlertActionType,
  ActionAlertType,
} from './ApplicationStore.js';

export class LegendApplicationSDLCSetupState {
  applicationStore: GenericLegendApplicationStore;
  sdlcServerClient: SDLCServerClient;
  isSDLCAuthorized = false;
  SDLCServerTermsOfServicesUrlsToView: string[] = [];

  constructor(
    applicationStore: GenericLegendApplicationStore,
    sdlcServerClient: SDLCServerClient,
  ) {
    makeObservable(this, {
      isSDLCAuthorized: observable,
      SDLCServerTermsOfServicesUrlsToView: observable,
      dismissSDLCServerTermsOfServicesAlert: action,
      needsToAcceptSDLCServerTermsOfServices: computed,
      initializeSDLCServerClient: flow,
      fetchCurrentUser: flow,
    });
    this.applicationStore = applicationStore;
    this.sdlcServerClient = sdlcServerClient;
  }

  *initializeSDLCServerClient(): GeneratorFn<void> {
    try {
      this.isSDLCAuthorized =
        (yield this.sdlcServerClient.isAuthorized()) as boolean;
      if (!this.isSDLCAuthorized) {
        this.applicationStore.navigator.jumpTo(
          SDLCServerClient.authorizeCallbackUrl(
            this.sdlcServerClient.baseUrl ?? '',
            this.applicationStore.navigator.getCurrentLocation(),
          ),
        );
      } else {
        // Only proceed intialization after passing authorization check

        // check terms of service agreement status
        this.SDLCServerTermsOfServicesUrlsToView =
          (yield this.sdlcServerClient.hasAcceptedTermsOfService()) as string[];
        if (this.SDLCServerTermsOfServicesUrlsToView.length) {
          this.applicationStore.setActionAlertInfo({
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

        // fetch server features config + current user
        yield this.sdlcServerClient.fetchServerFeaturesConfiguration();
        yield flowResult(this.fetchCurrentUser());
      }
    } catch (error) {
      assertErrorThrown(error);
      if (
        // eslint-disable-next-line no-process-env
        process.env.NODE_ENV === 'development' &&
        error instanceof NetworkClientError &&
        error.response.status === HttpStatus.UNAUTHORIZED
      ) {
        this.applicationStore.setActionAlertInfo({
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
          LogEvent.create(APPLICATION_EVENT.APPLICATION_SETUP_FAILURE),
          error,
        );
        this.applicationStore.notifyError(error);
      }
    }
  }

  *fetchCurrentUser(): GeneratorFn<void> {
    try {
      const currentUser = User.serialization.fromJson(
        (yield this.sdlcServerClient.getCurrentUser()) as PlainObject<User>,
      );
      this.sdlcServerClient.setCurrentUser(currentUser);
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.log.error(
        LogEvent.create(APPLICATION_EVENT.APPLICATION_SETUP_FAILURE),
        error,
      );
      this.applicationStore.notifyWarning(error.message);
    }
  }

  get needsToAcceptSDLCServerTermsOfServices(): boolean {
    return Boolean(this.SDLCServerTermsOfServicesUrlsToView.length);
  }

  dismissSDLCServerTermsOfServicesAlert(): void {
    this.SDLCServerTermsOfServicesUrlsToView = [];
  }
}
