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
  type SuperGenericFunction,
  TracerService,
  TelemetryService,
  assertTrue,
  Log,
  LogEvent,
  assertErrorThrown,
  isString,
  ApplicationError,
} from '@finos/legend-shared';
import { action, makeObservable, observable } from 'mobx';
import { APPLICATION_EVENT } from './ApplicationEvent.js';
import type { LegendApplicationConfig } from '../application/LegendApplicationConfig.js';
import type { WebApplicationNavigator } from './WebApplicationNavigator.js';
import type { LegendApplicationPluginManager } from '../application/LegendApplicationPluginManager.js';
import { DocumentationService } from './DocumentationService.js';
import { AssistantService } from './AssistantService.js';
import { EventService } from './EventService.js';
import { ApplicationNavigationContextService } from './ApplicationNavigationContextService.js';
import type { LegendApplicationPlugin } from './LegendApplicationPlugin.js';

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
  autoHideDuration?: number | undefined;

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

export type GenericLegendApplicationStore = ApplicationStore<
  LegendApplicationConfig,
  LegendApplicationPluginManager<LegendApplicationPlugin>
>;

export class ApplicationStore<
  T extends LegendApplicationConfig,
  V extends LegendApplicationPluginManager<LegendApplicationPlugin>,
> {
  config: T;
  pluginManager: V;

  // navigation
  navigator: WebApplicationNavigator;
  navigationContextService: ApplicationNavigationContextService;

  // TODO: refactor this to `NotificationService` including notifications and alerts
  notification?: Notification | undefined;
  blockingAlertInfo?: BlockingAlertInfo | undefined;
  actionAlertInfo?: ActionAlertInfo | undefined;

  // TODO: consider renaming this to `LogService`
  log: Log = new Log();

  // documentation & help
  documentationService: DocumentationService;
  assistantService: AssistantService;

  // communication
  eventService = new EventService();
  telemetryService = new TelemetryService();
  tracerService = new TracerService();

  // misc
  showBackdrop = false;

  // theme
  /**
   * NOTE: this is the poor man way of doing theming
   * we would need to revise this flag later
   * See https://github.com/finos/legend-studio/issues/264
   */
  TEMPORARY__isLightThemeEnabled = false;

  constructor(config: T, navigator: WebApplicationNavigator, pluginManager: V) {
    makeObservable(this, {
      notification: observable,
      blockingAlertInfo: observable,
      actionAlertInfo: observable,
      TEMPORARY__isLightThemeEnabled: observable,
      showBackdrop: observable,
      setShowBackdrop: action,
      setBlockingAlert: action,
      setActionAlertInfo: action,
      setNotification: action,
      notify: action,
      notifySuccess: action,
      notifyWarning: action,
      notifyIllegalState: action,
      notifyError: action,
      TEMPORARY__setIsLightThemeEnabled: action,
    });

    this.config = config;
    this.navigator = navigator;
    this.pluginManager = pluginManager;
    // NOTE: set the logger first so other loading could use the configured logger
    this.log.registerPlugins(pluginManager.getLoggerPlugins());

    this.navigationContextService = new ApplicationNavigationContextService(
      this,
    );
    this.documentationService = new DocumentationService(this);
    this.assistantService = new AssistantService(this);
    this.telemetryService.registerPlugins(
      pluginManager.getTelemetryServicePlugins(),
    );
    this.tracerService.registerPlugins(pluginManager.getTracerServicePlugins());
    this.eventService.registerEventNotifierPlugins(
      pluginManager.getEventNotifierPlugins(),
    );
  }

  TEMPORARY__setIsLightThemeEnabled(val: boolean): void {
    this.TEMPORARY__isLightThemeEnabled = val;
  }

  setShowBackdrop(val: boolean): void {
    this.showBackdrop = val;
  }

  setBlockingAlert(alertInfo: BlockingAlertInfo | undefined): void {
    this.blockingAlertInfo = alertInfo;
  }

  setActionAlertInfo(alertInfo: ActionAlertInfo | undefined): void {
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

  notifyError(content: Error | string, actions?: NotificationAction[]): void {
    let message: string | undefined;
    if (content instanceof ApplicationError) {
      message = content.detail;
    } else if (content instanceof Error) {
      message = content.message;
    } else {
      assertTrue(isString(content), `Can't display error`);
      message = content;
    }
    if (message) {
      this.setNotification(
        new Notification(
          NOTIFCATION_SEVERITY.ERROR,
          message,
          actions ?? [],
          undefined,
        ),
      );
    }
  }

  /**
   * This function creates a more user-friendly way to throw error in the UI. Rather than crashing the whole app, we will
   * just notify and replacing the value should get with an alternative (e.g. `undefined`). A good use-case for this
   * is where we would not expect an error to throw (i.e. `IllegalStateError`), but we want to be sure that if the error
   * ever occurs, it still shows very apparently in the UI, as such, printing out in the console is not good enough,
   * but crashing the app is bad too, so this is a good balance.
   */
  notifyAndReturnAlternativeOnError = <U extends SuperGenericFunction, W>(
    fn: U,
    alternative: W,
  ): ReturnType<U> | W | undefined => {
    try {
      return fn();
    } catch (error) {
      assertErrorThrown(error);
      this.notifyIllegalState(error.message);
      return alternative;
    }
  };

  /**
   * When we call store/state functions from the component, we should handle error thrown at these functions instead
   * of throwing them to the UI. This enforces that by throwing `IllegalStateError`
   */
  alertUnhandledError = (error: Error): void => {
    this.log.error(
      LogEvent.create(APPLICATION_EVENT.ILLEGAL_APPLICATION_STATE_OCCURRED),
      'Encountered unhandled error in component tree',
      error,
    );
    this.notifyIllegalState(error.message);
  };

  /**
   * Guarantee that the action being used by the component does not throw unhandled errors
   */
  guardUnhandledError =
    (actionFn: () => Promise<void>): (() => void) =>
    (): void => {
      actionFn().catch(this.alertUnhandledError);
    };

  async copyTextToClipboard(text: string): Promise<void> {
    if (
      typeof navigator.clipboard === 'object' &&
      typeof navigator.clipboard.writeText === 'function'
    ) {
      // This is a much cleaner way which requires HTTPS
      // See https://developers.google.com/web/updates/2018/03/clipboardapi
      await navigator.clipboard.writeText(text).catch((error) => {
        this.notifyError(error);
      });
      return;
    }
    this.notifyError('Browser does not support clipboard functionality');
  }

  notifyUnsupportedFeature(featureName: string): void {
    this.notifyWarning(`Unsupported feature: ${featureName}`);
  }
}
