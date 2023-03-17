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
  LOAD_TEXT_EDITOR_FONT__SUCCESS = 'application.load.font.success',
  APPLICATION_SETUP__FAILURE = 'application.setup.failure',

  ILLEGAL_APPLICATION_STATE_OCCURRED = 'application.error.illegal-state',
  APPLICATION_CONFIGURATION__FAILURE = 'application.configuration.failure',

  APPLICATION_IDENTITY_AUTO_FETCH__FAILURE = 'application.identity.auto-fetch.failure',

  APPLICATION_DOCUMENTATION_FETCH__FAILURE = 'application.fetch.documentation.failure',
  APPLICATION_DOCUMENTATION_LOAD__SKIP = 'application.load.documentation.skip',
  APPLICATION_DOCUMENTATION_REQUIREMENT_CHECK__FAILURE = 'application.load.documentation.requirement-check.failure',
  APPLICATION_TERMINAL_COMMAND_CONFIGURATION_CHECK__FAILURE = 'application.load.terminal-command.configuration-check.failure',
  APPLICATION_CONTEXTUAL_DOCUMENTATION_LOAD__SKIP = 'application.load.contextual-documentation.skip',

  APPLICATION_COMMAND_CENTER_REGISTRATION__FAILURE = 'application.command-center.registration.failure',

  APPLICATION_LOAD__SUCCESS = 'application.load.success',
  APPLICATION_LOAD__FAILURE = 'application.load.failure',

  DEVELOPMENT_ISSUE = 'development.issue',

  APPLICATION_CONTEXT__ACCESS = 'application.context.access',

  APPLICATION_USAGE__INTERRUPT = 'application.usage.interrupt',

  VIRTUAL_ASSISTANT_DOCUMENTATION_ENTRY__ACCESS = 'application.virtual-assistant.documentation-entry.access',
}
