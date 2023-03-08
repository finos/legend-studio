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
  TracerService,
  LogService,
  LogEvent,
  uuid,
} from '@finos/legend-shared';
import { action, makeObservable, observable } from 'mobx';
import { APPLICATION_EVENT } from './ApplicationEvent.js';
import type { LegendApplicationConfig } from '../application/LegendApplicationConfig.js';
import type {
  ApplicationNavigator,
  WebApplicationNavigator,
} from './WebApplicationNavigator.js';
import type { LegendApplicationPluginManager } from '../application/LegendApplicationPluginManager.js';
import { DocumentationService } from './DocumentationService.js';
import { AssistantService } from './AssistantService.js';
import { EventService } from './event/EventService.js';
import { ApplicationNavigationContextService } from './ApplicationNavigationContextService.js';
import type { LegendApplicationPlugin } from './LegendApplicationPlugin.js';
import { CommandService } from './CommandService.js';
import { KeyboardShortcutsService } from './KeyboardShortcutsService.js';
import { TerminalService } from './TerminalService.js';
import {
  type ActionAlertInfo,
  AlertService,
  type BlockingAlertInfo,
} from './AlertService.js';
import { NotificationService } from './NotificationService.js';
import { IdentityService } from './IdentityService.js';
import { StorageService } from './storage/StorageService.js';
import { TelemetryService } from './TelemetryService.js';
import { TimeService } from './TimeService.js';
import { LayoutService } from './LayoutService.js';
import { ClipboardService } from './ClipboardService.js';

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

  // core
  readonly identityService: IdentityService;
  readonly storageService: StorageService;
  readonly timeService = new TimeService();
  readonly commandService: CommandService;
  readonly keyboardShortcutsService: KeyboardShortcutsService;
  readonly layoutService = new LayoutService();
  readonly clipboardService: ClipboardService;

  // navigation
  // NOTE: as of now, we only support web environment, we will not use `Application
  readonly navigationService: ApplicationNavigator;
  readonly navigationContextService: ApplicationNavigationContextService;

  // documentation & help
  readonly documentationService: DocumentationService;
  readonly assistantService: AssistantService;

  // event & communication
  // TODO: refactor this to `AlertService`
  blockingAlertInfo?: BlockingAlertInfo | undefined;
  actionAlertInfo?: ActionAlertInfo | undefined;
  readonly alertService = new AlertService();
  readonly notificationService = new NotificationService();
  readonly logService = new LogService();
  readonly terminalService: TerminalService;
  readonly eventService = new EventService();
  readonly telemetryService: TelemetryService;
  readonly tracerService = new TracerService();

  constructor(config: T, navigator: WebApplicationNavigator, pluginManager: V) {
    makeObservable(this, {
      blockingAlertInfo: observable,
      actionAlertInfo: observable,
      setBlockingAlert: action,
      setActionAlertInfo: action,
    });

    this.config = config;
    this.pluginManager = pluginManager;

    this.navigationService = navigator;
    this.navigationContextService = new ApplicationNavigationContextService(
      this,
    );

    this.identityService = new IdentityService(this);
    this.storageService = new StorageService(this);
    this.clipboardService = new ClipboardService(this);

    // NOTE: set the logger first so other loading could use the configured logger
    this.logService.registerPlugins(pluginManager.getLoggerPlugins());
    this.terminalService = new TerminalService(this);

    this.documentationService = new DocumentationService(this);
    this.assistantService = new AssistantService(this);

    this.telemetryService = new TelemetryService(this);
    this.telemetryService.registerPlugins(
      pluginManager.getTelemetryServicePlugins(),
    );
    this.telemetryService.setup();
    this.commandService = new CommandService(this);
    this.keyboardShortcutsService = new KeyboardShortcutsService(this);
    this.tracerService.registerPlugins(pluginManager.getTracerServicePlugins());
    this.eventService.registerEventNotifierPlugins(
      pluginManager.getEventNotifierPlugins(),
    );
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
      this.notificationService.notifyIllegalState(
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

  /**
   * When we call store/state functions from the component, we should handle error thrown at these functions instead
   * of throwing them to the UI. This enforces that by throwing `IllegalStateError`
   */
  alertUnhandledError = (error: Error): void => {
    this.logService.error(
      LogEvent.create(APPLICATION_EVENT.ILLEGAL_APPLICATION_STATE_OCCURRED),
      'Encountered unhandled error in component tree',
      error,
    );
    this.notificationService.notifyIllegalState(error.message);
  };

  /**
   * Guarantee that the action being used by the component does not throw unhandled errors
   */
  guardUnhandledError =
    (actionFn: () => Promise<void>): (() => void) =>
    (): void => {
      actionFn().catch(this.alertUnhandledError);
    };
}
