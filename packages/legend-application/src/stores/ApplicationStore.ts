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
  assertTrue,
  Log,
  LogEvent,
  assertErrorThrown,
  isString,
  ApplicationError,
  uuid,
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
import { CommandCenter } from './CommandCenter.js';
import { KeyboardShortcutsService } from './KeyboardShortcutsService.js';
import { TerminalService } from './TerminalService.js';
import type { ActionAlertInfo, BlockingAlertInfo } from './AlertService.js';
import {
  Notification,
  type NotificationAction,
  DEFAULT_NOTIFICATION_HIDE_TIME,
  NOTIFCATION_SEVERITY,
} from './NotificationService.js';
import { UNKNOWN_USER_ID } from './IdentityService.js';
import { StorageService } from './storage/StorageService.js';
import { TelemetryService } from './TelemetryService.js';
import { TimeService } from './TimeService.js';

export type GenericLegendApplicationStore = ApplicationStore<
  LegendApplicationConfig,
  LegendApplicationPluginManager<LegendApplicationPlugin>
>;

export class ApplicationStore<
  T extends LegendApplicationConfig,
  V extends LegendApplicationPluginManager<LegendApplicationPlugin>,
> {
  readonly uuid = uuid();

  readonly config: T;
  readonly pluginManager: V;

  // user
  // TODO: if this ever gets more complicated, rename this to `IdentityService`
  currentUser = UNKNOWN_USER_ID;

  // navigation
  // TODO: rename to `NavigationService`
  // NOTE: as of now, we only support web environment, we will not use `Application
  readonly navigator: WebApplicationNavigator;
  readonly navigationContextService: ApplicationNavigationContextService;

  // storage
  storageService: StorageService;
  
  // TODO: refactor this to `NotificationService`
  notification?: Notification | undefined;

  // TODO: refactor this to `AlertService`
  blockingAlertInfo?: BlockingAlertInfo | undefined;
  actionAlertInfo?: ActionAlertInfo | undefined;

  // NOTE: consider renaming this to `LogService`
  readonly log = new Log();
  readonly terminalService: TerminalService;

  // documentation & help
  readonly documentationService: DocumentationService;
  readonly assistantService: AssistantService;

  // event & communication
  readonly timeService = new TimeService();
  readonly eventService = new EventService();
  readonly telemetryService = new TelemetryService();
  readonly tracerService = new TracerService();

  // control and interactions
  readonly commandCenter: CommandCenter;
  readonly keyboardShortcutsService: KeyboardShortcutsService;

  // TODO: config
  // See https://github.com/finos/legend-studio/issues/407

  // backdrop
  backdropContainerElementID?: string | undefined;
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
      currentUser: observable,
      notification: observable,
      blockingAlertInfo: observable,
      actionAlertInfo: observable,
      TEMPORARY__isLightThemeEnabled: observable,
      backdropContainerElementID: observable,
      showBackdrop: observable,
      setBackdropContainerElementID: action,
      setShowBackdrop: action,
      setBlockingAlert: action,
      setActionAlertInfo: action,
      setCurrentUser: action,
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
    this.storageService = new StorageService(this);
    this.pluginManager = pluginManager;
    // NOTE: set the logger first so other loading could use the configured logger
    this.log.registerPlugins(pluginManager.getLoggerPlugins());
    this.terminalService = new TerminalService(this);

    this.navigationContextService = new ApplicationNavigationContextService(
      this,
    );
    this.documentationService = new DocumentationService(this);
    this.assistantService = new AssistantService(this);
    this.telemetryService.registerPlugins(
      pluginManager.getTelemetryServicePlugins(),
    );
    this.setupTelemetryService();
    this.commandCenter = new CommandCenter(this);
    this.keyboardShortcutsService = new KeyboardShortcutsService(this);
    this.tracerService.registerPlugins(pluginManager.getTracerServicePlugins());
    this.eventService.registerEventNotifierPlugins(
      pluginManager.getEventNotifierPlugins(),
    );
  }

  TEMPORARY__setIsLightThemeEnabled(val: boolean): void {
    this.TEMPORARY__isLightThemeEnabled = val;
  }

  setupTelemetryService(): void {
    this.telemetryService.setup({
      userId: this.currentUser,
      appName: this.config.appName,
      appSessionId: this.uuid,
      // appStartTime: this.time timestamp,
    });
  }

  /**
   * Change the ID used to find the base element to mount the backdrop on.
   * This is useful when we want to use backdrop with embedded application which
   * requires its own backdrop usage.
   */
  setBackdropContainerElementID(val: string | undefined): void {
    this.backdropContainerElementID = val;
  }

  setShowBackdrop(val: boolean): void {
    this.showBackdrop = val;
  }

  setBlockingAlert(alertInfo: BlockingAlertInfo | undefined): void {
    if (alertInfo) {
      this.keyboardShortcutsService.blockGlobalHotkeys();
    } else {
      this.keyboardShortcutsService.unblockGlobalHotkeys();
    }
    this.blockingAlertInfo = alertInfo;
  }

  setActionAlertInfo(alertInfo: ActionAlertInfo | undefined): void {
    if (this.actionAlertInfo && alertInfo) {
      this.notifyIllegalState(
        'Action alert is stacked: new alert is invoked while another one is being displayed',
      );
    }
    if (alertInfo) {
      this.keyboardShortcutsService.blockGlobalHotkeys();
    } else {
      this.keyboardShortcutsService.unblockGlobalHotkeys();
    }
    this.actionAlertInfo = alertInfo;
  }

  setCurrentUser(val: string): void {
    this.currentUser = val;
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
    // This is a much cleaner way which requires HTTPS
    // See https://developers.google.com/web/updates/2018/03/clipboardapi
    await navigator.clipboard.writeText(text).catch((error) => {
      this.notifyError(error);
    });
  }

  notifyUnsupportedFeature(featureName: string): void {
    this.notifyWarning(`Unsupported feature: ${featureName}`);
  }
}
