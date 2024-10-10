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

export enum APPLICATION_EVENT {
  APPLICATION_SETUP__FAILURE = 'application.setup.failure',

  APPLICATION_LOAD__SUCCESS = 'application.load.success',
  APPLICATION_LOAD__FAILURE = 'application.load.failure',

  ILLEGAL_APPLICATION_STATE_OCCURRED = 'application.error.illegal-state',
  APPLICATION_CONFIGURATION__FAILURE = 'application.configuration.failure',

  IDENTITY_AUTO_FETCH__FAILURE = 'application.identity.auto-fetch.failure',

  DOCUMENTATION_FETCH__FAILURE = 'application.documentation.fetch.failure',
  DOCUMENTATION_LOAD__SKIP = 'application.documentation.load.skip',
  DOCUMENTATION_REQUIREMENT_CHECK__FAILURE = 'application.documentation.requirement-check.failure',

  CONTEXTUAL_DOCUMENTATION_LOAD__SKIP = 'application.virtual-assistant.contextual-documentation-load.skip',
  VIRTUAL_ASSISTANT_DOCUMENTATION_ENTRY__ACCESS = 'application.virtual-assistant.documentation-entry.access',

  TERMINAL_COMMAND_CONFIGURATION_CHECK__FAILURE = 'application.load.terminal-command.configuration-check.failure',

  COLOR_THEME_CONFIGURATION_CHECK__FAILURE = 'application.layout.color-theme.configuration-check.failure',

  SETTING_CONFIGURATION_CHECK__FAILURE = 'application.setting.configuration-check.failure',
  SETTING_RETRIVE_FAILURE = 'application.setting.retrieve.failure',

  USER_DATA_RETRIEVE_FAILURE = 'application.user-data.retrieve.failure',

  COMMAND_CENTER_REGISTRATION__FAILURE = 'application.command.registration.failure',

  APPLICATION_CONTEXT__ACCESS = 'application.context.access',

  APPLICATION_USAGE__INTERRUPT = 'application.usage.interrupt',
  NAVIGATION_BLOCKED = 'application.usage.navigation-blocked',

  APPLICATION_TELEMETRY_EVENT__FAILURE = 'application.telemetry-event.failure',

  DEBUG = 'development.debug',
}
