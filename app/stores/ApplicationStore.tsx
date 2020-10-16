/**
 * Copyright 2020 Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import React, { createContext, useContext } from 'react';
import { useLocalStore } from 'mobx-react-lite';
import { guaranteeNonNullable, isString, ApplicationError, SuperGenericFunction } from 'Utilities/GeneralUtil';
import { observable, action, flow, computed } from 'mobx';
import { sdlcClient } from 'API/SdlcClient';
import { Log, LOG_EVENT } from 'Utilities/Logger';
import { History } from 'history';

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

export interface Notification {
  severity: NOTIFCATION_SEVERITY;
  message: string;
  actions: NotificationAction[];
}

export class Notification {
  severity: NOTIFCATION_SEVERITY;
  message: string;
  actions: NotificationAction[];
  autoHideDuration?: number;

  constructor(severity: NOTIFCATION_SEVERITY, message: string, actions: NotificationAction[], autoHideDuration: number | undefined) {
    this.severity = severity;
    this.message = message;
    this.actions = actions;
    this.autoHideDuration = autoHideDuration;
  }
}

export class ApplicationStore {
  @observable notification?: Notification;
  @observable isSDLCAuthorized = false;
  @observable SDLCServerTermsOfServicesUrlsToView: string[] = [];
  @observable blockingAlertInfo?: BlockingAlertInfo;
  @observable actionAlertInfo?: ActionAlertInfo;
  @observable.ref historyApiClient: History;

  constructor(historyApi: History) {
    this.historyApiClient = historyApi;
  }

  @action dismissSDLCServerTermsOfServicesAlert(): void { this.SDLCServerTermsOfServicesUrlsToView = [] }
  @action setBlockingAlert(alertInfo?: BlockingAlertInfo): void { this.blockingAlertInfo = alertInfo }
  @action setActionAltertInfo(alertInfo?: ActionAlertInfo): void {
    if (this.actionAlertInfo && alertInfo) { this.notifyIllegalState('Action alert is stacked: new alert is invoked while another one is being displayed') }
    this.actionAlertInfo = alertInfo;
  }

  @action setNotification(notification: Notification | undefined): void { this.notification = notification }
  @action notify(message: string, actions?: NotificationAction[], autoHideDuration?: number): void { this.setNotification(new Notification(NOTIFCATION_SEVERITY.INFO, message, actions ?? [], autoHideDuration ?? DEFAULT_NOTIFICATION_HIDE_TIME)) }
  @action notifySuccess(message: string, actions?: NotificationAction[], autoHideDuration?: number): void { this.setNotification(new Notification(NOTIFCATION_SEVERITY.SUCCESS, message, actions ?? [], autoHideDuration ?? DEFAULT_NOTIFICATION_HIDE_TIME)) }
  @action notifyWarning(message: string, actions?: NotificationAction[], autoHideDuration?: number): void { this.setNotification(new Notification(NOTIFCATION_SEVERITY.WARNING, message, actions ?? [], autoHideDuration ?? DEFAULT_NOTIFICATION_HIDE_TIME)) }
  @action notifyIllegalState(message: string, actions?: NotificationAction[], autoHideDuration?: number): void { this.setNotification(new Notification(NOTIFCATION_SEVERITY.ILEGAL_STATE, isString(message) ? `[PLEASE NOTIFY DEVELOPER] ${message}` : message, actions ?? [], autoHideDuration ?? DEFAULT_ERROR_NOTIFICATION_HIDE_TIME)) }

  @action notifyError(content: unknown, actions?: NotificationAction[], autoHideDuration?: number): void {
    let message: string | undefined;
    if (content instanceof Error || content instanceof ApplicationError) {
      message = content.message;
    } else if (isString(content)) {
      message = content;
    } else {
      message = undefined;
      Log.error(LOG_EVENT.ILLEGAL_APPLICATION_STATE_OCCURRED, 'Unable to display error in notification', message);
      this.notifyIllegalState('Unable to display error');
    }
    if (message) {
      this.setNotification(new Notification(NOTIFCATION_SEVERITY.ERROR, message, actions ?? [], autoHideDuration ?? DEFAULT_ERROR_NOTIFICATION_HIDE_TIME));
    }
  }

  @computed get needsToAcceptSDLCServerTermsOfServices(): boolean { return Boolean(this.SDLCServerTermsOfServicesUrlsToView.length) }

  checkSDLCAuthorization = flow(function* (this: ApplicationStore) {
    try {
      this.isSDLCAuthorized = (yield sdlcClient.isAuthorized()) as unknown as boolean;
      if (!this.isSDLCAuthorized) {
        window.location.href = sdlcClient.authorizeCallbackUrl(window.location.href);
      } else {
        // Only proceed to check terms of service agreement status after the passing authorization check
        this.SDLCServerTermsOfServicesUrlsToView = (yield sdlcClient.hasAcceptedTermsOfService()) as unknown as string[];
        if (this.SDLCServerTermsOfServicesUrlsToView.length) {
          this.setActionAltertInfo({
            message: 'Please read and accept the SDLC servers\' terms of service',
            prompt: 'Click "Done" when you have accepted all the terms',
            type: ActionAlertType.CAUTION,
            actions: [
              {
                label: 'See terms of services',
                default: true,
                handler: (): void => this.SDLCServerTermsOfServicesUrlsToView.forEach(url => {
                  window.open(url, '_blank');
                }),
                type: ActionAlertActionType.PROCEED,
              },
              {
                label: 'Done',
                type: ActionAlertActionType.PROCEED_WITH_CAUTION,
                handler: (): void => {
                  this.dismissSDLCServerTermsOfServicesAlert();
                  window.location.reload();
                }
              }
            ],
          });
        }
      }
    } catch (error) {
      Log.error(LOG_EVENT.SETUP_PROBLEM, error);
      this.notifyError(error);
    }
  });

  /**
   * This function creates a more user-friendly way to throw error in the UI. Rather than crashing the whole app, we will
   * just notify and replacing the value should get with an alternative (e.g. `undefined`). A good use-case for this
   * is where we would not expect an error to throw (i.e. `IllegalStateError`), but we want to be sure that if the error
   * ever occurs, it still shows very apparently in the UI, as such, printing out in the console is not good enough,
   * but crashing the app is bad too, so this is a good balance.
   */
  notifyAndReturnAlternativeOnError = <T extends SuperGenericFunction, W>(fn: T, alternative: W): ReturnType<T> | W | undefined => {
    try {
      return fn();
    } catch (error) {
      this.notifyIllegalState(error.message);
      return alternative;
    }
  }

  /**
   * When we call store/state functions from the component, we should handle error thrown at these functions instead
   * of throwing them to the UI. This enforces that by throwing `IllegalStateError`
   */
  alertIllegalUnhandledError = (error: Error): void => {
    Log.error(LOG_EVENT.ILLEGAL_APPLICATION_STATE_OCCURRED, 'Encountered unhandled rejection in component', error);
    this.notifyIllegalState(error.message);
  }

  /**
   * Guarantee that the action being used by the component does not throw unhandled errors
   */
  guaranteeSafeAction = (fn: () => Promise<void>): () => Promise<void> => (): Promise<void> => fn().catch(this.alertIllegalUnhandledError);

  async copyTextToClipboard(text: string): Promise<void> {
    if (typeof navigator.clipboard.writeText === 'function') {
      // This is a much cleaner way which requires HTTPS
      // See https://developers.google.com/web/updates/2018/03/clipboardapi
      await navigator.clipboard.writeText(text).catch(error => {
        this.notifyError(error);
      });
    } else {
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
        } catch (error) {
          this.notifyError(error);
        } finally {
          element.remove();
        }
      }
    }
    this.notifyError('Browser does not support clipboard functionality');
  }
}

const ApplicationStoreContext = createContext<ApplicationStore | undefined>(undefined);

export const ApplicationStoreProvider = ({ children, history }: { children: React.ReactNode, history: History }): React.ReactElement => {
  const store = useLocalStore(() => new ApplicationStore(history));
  return <ApplicationStoreContext.Provider value={store}>{children}</ApplicationStoreContext.Provider>;
};

export const useApplicationStore = (): ApplicationStore =>
  guaranteeNonNullable(useContext(ApplicationStoreContext), 'useApplicationStore() hook must be used inside ApplicationStore context provider');
