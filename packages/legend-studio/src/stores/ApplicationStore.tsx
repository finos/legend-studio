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

import { createContext, useContext } from 'react';
import type {
  GeneratorFn,
  Log,
  PlainObject,
  SuperGenericFunction,
} from '@finos/legend-studio-shared';
import {
  LogEvent,
  assertErrorThrown,
  guaranteeNonNullable,
  isString,
  ApplicationError,
  ActionState,
  TelemetryService,
} from '@finos/legend-studio-shared';
import { makeAutoObservable, action } from 'mobx';
import { APPLICATION_LOG_EVENT } from '../utils/ApplicationLogEvent';
import { SDLC_LOG_EVENT } from '../utils/SDLCLogEvent';
import type { ApplicationConfig } from './application/ApplicationConfig';
import type { WebApplicationNavigator } from './application/WebApplicationNavigator';
import { useLocalObservable } from 'mobx-react-lite';
import { SDLCServerClient } from '../models/sdlc/SDLCServerClient';
import { User } from '../models/sdlc/models/User';
import { SdlcMode } from '../models/sdlc/models/project/Project';
import type { PluginManager } from '../application/PluginManager';
import { CORE_TELEMETRY_EVENT } from './network/Telemetry';
import { MetadataServerClient } from '../models/metadata/MetadataServerClient';

export enum ActionAlertType {
  STANDARD = 'STANDARD',
  CAUTION = 'CAUTION',
}

export enum ActionAlertActionType {
  STANDARD = 'STANDARD',
  PROCEED_WITH_CAUTION = 'PROCEED_WITH_CAUTION',
  PROCEED = 'PROCEED',
}

export interface ActionAlertInfo {
  title?: string;
  message: string;
  prompt?: string;
  type?: ActionAlertType;
  onClose?: () => void;
  onEnter?: () => void;
  actions: {
    label: string;
    default?: boolean;
    handler?: () => void; // default to dismiss
    type?: ActionAlertActionType;
  }[];
}

export interface BlockingAlertInfo {
  message: string;
  prompt?: string;
  showLoading?: boolean;
}

export const DEFAULT_NOTIFICATION_HIDE_TIME = 6000; // ms
export const DEFAULT_ERROR_NOTIFICATION_HIDE_TIME = 10000; // ms

export enum NOTIFCATION_SEVERITY {
  ILEGAL_STATE = 'ILEGAL_STATE', // highest priority since this implies bugs - we expect user to never see this
  ERROR = 'ERROR',
  WARNING = 'WARNING',
  SUCCESS = 'SUCCESS',
  INFO = 'INFO',
}

export interface NotificationAction {
  icon: React.ReactNode;
  action: () => void;
}

export class Notification {
  severity: NOTIFCATION_SEVERITY;
  message: string;
  actions: NotificationAction[];
  autoHideDuration?: number;

  constructor(
    severity: NOTIFCATION_SEVERITY,
    message: string,
    actions: NotificationAction[],
    autoHideDuration: number | undefined,
  ) {
    this.severity = severity;
    this.message = message;
    this.actions = actions;
    this.autoHideDuration = autoHideDuration;
  }
}

export class NetworkClientManager {
  sdlcClient!: SDLCServerClient;
  metadataClient!: MetadataServerClient;

  constructor(config: ApplicationConfig) {
    this.sdlcClient = new SDLCServerClient({
      env: config.env,
      serverUrl: config.sdlcServerUrl,
    });
    this.metadataClient = new MetadataServerClient({
      serverUrl: config.metadataServerUrl,
    });
  }
}

const UNKNOWN_USER_ID = '(unknown)';

export class ApplicationStore {
  pluginManager: PluginManager;
  networkClientManager: NetworkClientManager;
  telemetryService = new TelemetryService();
  navigator: WebApplicationNavigator;
  notification?: Notification;
  log: Log;
  blockingAlertInfo?: BlockingAlertInfo;
  actionAlertInfo?: ActionAlertInfo;
  config: ApplicationConfig;
  initState = ActionState.create();

  // TODO: move SDLC states out of application
  isSDLCAuthorized = false;
  SDLCServerTermsOfServicesUrlsToView: string[] = [];
  currentSDLCUser = new User(UNKNOWN_USER_ID, UNKNOWN_USER_ID);

  constructor(
    config: ApplicationConfig,
    pluginManager: PluginManager,
    navigator: WebApplicationNavigator,
    log: Log,
  ) {
    makeAutoObservable(this, {
      navigator: false,
      dismissSDLCServerTermsOfServicesAlert: action,
      setBlockingAlert: action,
      setActionAltertInfo: action,
      setNotification: action,
      notify: action,
      notifySuccess: action,
      notifyWarning: action,
      notifyIllegalState: action,
      notifyError: action,
    });

    this.config = config;
    this.pluginManager = pluginManager;
    this.navigator = navigator;
    this.networkClientManager = new NetworkClientManager(config);
    this.log = log;
    // Register plugins
    this.networkClientManager.sdlcClient.registerTracerServicePlugins(
      this.pluginManager.getTracerServicePlugins(),
    );
  }

  dismissSDLCServerTermsOfServicesAlert(): void {
    this.SDLCServerTermsOfServicesUrlsToView = [];
  }

  setBlockingAlert(alertInfo: BlockingAlertInfo | undefined): void {
    this.blockingAlertInfo = alertInfo;
  }

  setActionAltertInfo(alertInfo: ActionAlertInfo | undefined): void {
    if (this.actionAlertInfo && alertInfo) {
      this.notifyIllegalState(
        'Action alert is stacked: new alert is invoked while another one is being displayed',
      );
    }
    this.actionAlertInfo = alertInfo;
  }

  setNotification(notification: Notification | undefined): void {
    this.notification = notification;
  }
  notify(
    message: string,
    actions?: NotificationAction[],
    autoHideDuration?: number | null,
  ): void {
    this.setNotification(
      new Notification(
        NOTIFCATION_SEVERITY.INFO,
        message,
        actions ?? [],
        autoHideDuration === null
          ? undefined
          : autoHideDuration ?? DEFAULT_NOTIFICATION_HIDE_TIME,
      ),
    );
  }
  notifySuccess(
    message: string,
    actions?: NotificationAction[],
    autoHideDuration?: number | null,
  ): void {
    this.setNotification(
      new Notification(
        NOTIFCATION_SEVERITY.SUCCESS,
        message,
        actions ?? [],
        autoHideDuration === null
          ? undefined
          : autoHideDuration ?? DEFAULT_NOTIFICATION_HIDE_TIME,
      ),
    );
  }

  notifyWarning(
    content: string | Error,
    actions?: NotificationAction[],
    autoHideDuration?: number | null,
  ): void {
    this.setNotification(
      new Notification(
        NOTIFCATION_SEVERITY.WARNING,
        content instanceof Error ? content.message : content,
        actions ?? [],
        autoHideDuration === null
          ? undefined
          : autoHideDuration ?? DEFAULT_NOTIFICATION_HIDE_TIME,
      ),
    );
  }

  notifyIllegalState(
    message: string,
    actions?: NotificationAction[],
    autoHideDuration?: number | null,
  ): void {
    this.setNotification(
      new Notification(
        NOTIFCATION_SEVERITY.ILEGAL_STATE,
        isString(message) ? `[PLEASE NOTIFY DEVELOPER] ${message}` : message,
        actions ?? [],
        autoHideDuration === null
          ? undefined
          : autoHideDuration ?? DEFAULT_NOTIFICATION_HIDE_TIME,
      ),
    );
  }

  notifyError(
    content: unknown,
    actions?: NotificationAction[],
    autoHideDuration?: number | null,
  ): void {
    let message: string | undefined;
    if (content instanceof Error || content instanceof ApplicationError) {
      message = content.message;
    } else if (isString(content)) {
      message = content;
    } else {
      message = undefined;
      this.log.error(
        LogEvent.create(
          APPLICATION_LOG_EVENT.ILLEGAL_APPLICATION_STATE_OCCURRED,
        ),
        'Unable to display error in notification',
        message,
      );
      this.notifyIllegalState('Unable to display error');
    }
    if (message) {
      this.setNotification(
        new Notification(
          NOTIFCATION_SEVERITY.ERROR,
          message,
          actions ?? [],
          autoHideDuration === null
            ? undefined
            : autoHideDuration ?? DEFAULT_NOTIFICATION_HIDE_TIME,
        ),
      );
    }
  }

  get needsToAcceptSDLCServerTermsOfServices(): boolean {
    return Boolean(this.SDLCServerTermsOfServicesUrlsToView.length);
  }

  *initialize(): GeneratorFn<void> {
    if (!this.initState.isInInitialState) {
      this.notifyIllegalState('Application store is re-initialized');
      return;
    }
    this.initState.inProgress();
    yield Promise.all([
      this.checkSDLCAuthorization(),
      this.getSDLCCurrentUser(),
    ]);
    this.setupTelemetryService();
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

  private *getSDLCCurrentUser(): GeneratorFn<void> {
    try {
      const currentUser = User.serialization.fromJson(
        (yield this.networkClientManager.sdlcClient.getCurrentUser()) as PlainObject<User>,
      );
      this.networkClientManager.sdlcClient.setCurrentUser(currentUser);
      this.currentSDLCUser = currentUser;
    } catch (error: unknown) {
      assertErrorThrown(error);
      this.log.error(
        LogEvent.create(SDLC_LOG_EVENT.SDLC_MANAGER_FAILURE),
        error,
      );
      this.notifyWarning(error.message);
    }
  }

  private *checkSDLCAuthorization(): GeneratorFn<void> {
    try {
      this.isSDLCAuthorized = (
        (yield Promise.all(
          Object.values(SdlcMode).map((mode) =>
            this.networkClientManager.sdlcClient
              .isAuthorized(mode)
              .catch((error) => {
                if (mode !== SdlcMode.PROD) {
                  // if there is an issue with an endpoint in a non prod env, we return authorized as true
                  // but notify the user of the error
                  this.log.error(
                    LogEvent.create(SDLC_LOG_EVENT.SDLC_MANAGER_FAILURE),
                    error,
                  );
                  this.notifyError(error);
                  return true;
                }
                throw error;
              }),
          ),
        )) as boolean[]
      ).every(Boolean);

      if (!this.isSDLCAuthorized) {
        this.navigator.jumpTo(
          SDLCServerClient.authorizeCallbackUrl(
            this.config.sdlcServerUrl,
            this.navigator.getCurrentLocation(),
          ),
        );
      } else {
        // Only proceed to check terms of service agreement status after the passing authorization check
        this.SDLCServerTermsOfServicesUrlsToView =
          (yield this.networkClientManager.sdlcClient.hasAcceptedTermsOfService()) as string[];
        if (this.SDLCServerTermsOfServicesUrlsToView.length) {
          this.setActionAltertInfo({
            message: `Please read and accept the SDLC servers' terms of service`,
            prompt: `Click 'Done' when you have accepted all the terms`,
            type: ActionAlertType.CAUTION,
            actions: [
              {
                label: 'See terms of services',
                default: true,
                handler: (): void =>
                  this.SDLCServerTermsOfServicesUrlsToView.forEach((url) => {
                    window.open(url, '_blank');
                  }),
                type: ActionAlertActionType.PROCEED,
              },
              {
                label: 'Done',
                type: ActionAlertActionType.PROCEED_WITH_CAUTION,
                handler: (): void => {
                  this.dismissSDLCServerTermsOfServicesAlert();
                  this.navigator.reload();
                },
              },
            ],
          });
        }
      }
    } catch (error: unknown) {
      this.log.error(
        LogEvent.create(SDLC_LOG_EVENT.SDLC_MANAGER_FAILURE),
        error,
      );
      this.notifyError(error);
    }
  }

  setupTelemetryService(): void {
    this.telemetryService.registerPlugins(
      this.pluginManager.getTelemetryServicePlugins(),
    );
    this.telemetryService.setUserId(this.currentSDLCUser.userId);
  }

  /**
   * This function creates a more user-friendly way to throw error in the UI. Rather than crashing the whole app, we will
   * just notify and replacing the value should get with an alternative (e.g. `undefined`). A good use-case for this
   * is where we would not expect an error to throw (i.e. `IllegalStateError`), but we want to be sure that if the error
   * ever occurs, it still shows very apparently in the UI, as such, printing out in the console is not good enough,
   * but crashing the app is bad too, so this is a good balance.
   */
  notifyAndReturnAlternativeOnError = <T extends SuperGenericFunction, W>(
    fn: T,
    alternative: W,
  ): ReturnType<T> | W | undefined => {
    try {
      return fn();
    } catch (error: unknown) {
      assertErrorThrown(error);
      this.notifyIllegalState(error.message);
      return alternative;
    }
  };

  /**
   * When we call store/state functions from the component, we should handle error thrown at these functions instead
   * of throwing them to the UI. This enforces that by throwing `IllegalStateError`
   */
  alertIllegalUnhandledError = (error: Error): void => {
    this.log.error(
      LogEvent.create(APPLICATION_LOG_EVENT.ILLEGAL_APPLICATION_STATE_OCCURRED),
      'Encountered unhandled rejection in component',
      error,
    );
    this.notifyIllegalState(error.message);
  };

  /**
   * Guarantee that the action being used by the component does not throw unhandled errors
   */
  guaranteeSafeAction =
    (actionFn: () => Promise<void>): (() => Promise<void>) =>
    (): Promise<void> =>
      actionFn().catch(this.alertIllegalUnhandledError);

  async copyTextToClipboard(text: string): Promise<void> {
    if (typeof navigator.clipboard.writeText === 'function') {
      // This is a much cleaner way which requires HTTPS
      // See https://developers.google.com/web/updates/2018/03/clipboardapi
      await navigator.clipboard.writeText(text).catch((error) => {
        this.notifyError(error);
      });
      return;
    }
    // See https://hackernoon.com/copying-text-to-clipboard-with-javascript-df4d4988697f
    if (document.queryCommandSupported('copy')) {
      const element = document.createElement('textarea');
      element.style.display = 'fixed';
      element.style.opacity = '0';
      document.documentElement.appendChild(element);
      element.value = text;
      element.select();
      try {
        document.execCommand('copy');
      } catch (error: unknown) {
        this.notifyError(error);
      } finally {
        element.remove();
      }
      return;
    }
    this.notifyError('Browser does not support clipboard functionality');
  }

  notifyUnsupportedFeature(featureName: string): void {
    this.notifyWarning(`Unsupported feature: ${featureName}`);
  }
}

const ApplicationStoreContext = createContext<ApplicationStore | undefined>(
  undefined,
);

export const ApplicationStoreProvider = ({
  children,
  config,
  pluginManager,
  navigator,
  log,
}: {
  children: React.ReactNode;
  config: ApplicationConfig;
  pluginManager: PluginManager;
  navigator: WebApplicationNavigator;
  log: Log;
}): React.ReactElement => {
  const applicationStore = useLocalObservable(
    () => new ApplicationStore(config, pluginManager, navigator, log),
  );
  return (
    <ApplicationStoreContext.Provider value={applicationStore}>
      {children}
    </ApplicationStoreContext.Provider>
  );
};

export const useApplicationStore = (): ApplicationStore =>
  guaranteeNonNullable(
    useContext(ApplicationStoreContext),
    'useApplicationStore() hook must be used inside ApplicationStore context provider',
  );
