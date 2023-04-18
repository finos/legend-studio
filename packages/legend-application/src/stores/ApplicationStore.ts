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
  ActionState,
  assertErrorThrown,
  IllegalStateError,
  type Writable,
} from '@finos/legend-shared';
import { APPLICATION_EVENT } from '../__lib__/LegendApplicationEvent.js';
import type { LegendApplicationConfig } from '../application/LegendApplicationConfig.js';
import type { LegendApplicationPluginManager } from '../application/LegendApplicationPluginManager.js';
import { DocumentationService } from './DocumentationService.js';
import { AssistantService } from './AssistantService.js';
import { EventService } from './event/EventService.js';
import { ApplicationNavigationContextService } from './ApplicationNavigationContextService.js';
import type { LegendApplicationPlugin } from './LegendApplicationPlugin.js';
import { CommandService } from './CommandService.js';
import { KeyboardShortcutsService } from './KeyboardShortcutsService.js';
import { TerminalService } from './TerminalService.js';
import { AlertService } from './AlertService.js';
import { NotificationService } from './NotificationService.js';
import { IdentityService } from './IdentityService.js';
import { StorageService } from './storage/StorageService.js';
import { TelemetryService } from './TelemetryService.js';
import { TimeService } from './TimeService.js';
import { LayoutService } from './LayoutService.js';
import { ClipboardService } from './ClipboardService.js';
import { NavigationService } from './navigation/NavigationService.js';
import { SettingService } from './SettingService.js';
import { DefaultNavigator } from './navigation/DefaultNavigator.js';
import type { ApplicationPlatform } from './platform/ApplicationPlatform.js';

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
  readonly initState = ActionState.create();
  readonly platform?: ApplicationPlatform | undefined;

  // core
  readonly timeService: TimeService;
  readonly logService: LogService;
  readonly storageService: StorageService;
  readonly settingService: SettingService;
  readonly alertService: AlertService;
  readonly notificationService: NotificationService;

  readonly identityService: IdentityService;
  readonly commandService: CommandService;
  readonly keyboardShortcutsService: KeyboardShortcutsService;
  readonly layoutService: LayoutService;
  readonly clipboardService: ClipboardService;
  readonly terminalService: TerminalService;
  readonly navigationService: NavigationService;
  readonly navigationContextService: ApplicationNavigationContextService;

  // support
  readonly documentationService: DocumentationService;
  readonly assistantService: AssistantService;

  // event
  readonly eventService: EventService;
  readonly telemetryService: TelemetryService;
  readonly tracerService: TracerService;

  constructor(config: T, pluginManager: V) {
    this.config = config;
    this.pluginManager = pluginManager;

    this.timeService = new TimeService();
    // NOTE: set the logger first so other loading could use the configured logger
    this.logService = new LogService();
    this.logService.registerPlugins(pluginManager.getLoggerPlugins());
    this.storageService = new StorageService(this);
    this.settingService = new SettingService(this);
    this.alertService = new AlertService(this);
    this.notificationService = new NotificationService();

    this.identityService = new IdentityService(this);
    this.layoutService = new LayoutService(this);
    this.clipboardService = new ClipboardService(this);
    this.terminalService = new TerminalService(this);
    this.commandService = new CommandService(this);
    this.keyboardShortcutsService = new KeyboardShortcutsService(this);

    this.navigationService = new NavigationService(new DefaultNavigator());
    this.navigationContextService = new ApplicationNavigationContextService(
      this,
    );

    this.documentationService = new DocumentationService(this);
    this.assistantService = new AssistantService(this);

    this.eventService = new EventService();
    this.eventService.registerEventNotifierPlugins(
      pluginManager.getEventNotifierPlugins(),
    );
    this.telemetryService = new TelemetryService(this);
    this.telemetryService.registerPlugins(
      pluginManager.getTelemetryServicePlugins(),
    );
    this.telemetryService.setup();
    this.tracerService = new TracerService();
    this.tracerService.registerPlugins(pluginManager.getTracerServicePlugins());
  }

  async initialize(platform: ApplicationPlatform): Promise<void> {
    if (!this.initState.isInInitialState) {
      this.notificationService.notifyIllegalState(
        'Application store is re-initialized',
      );
      return;
    }
    this.initState.inProgress();

    try {
      if (this.platform) {
        throw new IllegalStateError(`Platform is already configured`);
      }
      (this as Writable<ApplicationStore<T, V>>).platform = platform;
      (this as Writable<ApplicationStore<T, V>>).navigationService =
        new NavigationService(platform.getNavigator());

      await platform.initialize();

      this.initState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.notificationService.notifyError(error);
      this.logService.error(
        LogEvent.create(APPLICATION_EVENT.APPLICATION_LOAD__FAILURE),
        'Failed to load Legend application',
      );
      this.initState.fail();
    }
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
