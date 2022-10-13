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
  TEXT_EDITOR_FONT_LOADED = 'application.load.font.success',
  APPLICATION_SETUP_FAILURE = 'application.setup.failure',

  ILLEGAL_APPLICATION_STATE_OCCURRED = 'application.error.illegal-state',
  APPLICATION_CONFIGURATION_FAILURE = 'application.configuration.failure',

  APPLICATION_DOCUMENTATION_FETCH_FAILURE = 'application.fetch.documentation.failure',
  APPLICATION_DOCUMENTATION_LOAD_SKIPPED = 'application.load.documentation.skipped',
  APPLICATION_DOCUMENTATION_REQUIREMENT_CHECK_FAILURE = 'application.load.documentation.requirement-check.failure',
  APPLICATION_KEYBOARD_SHORTCUTS_CONFIGURATION_CHECK_FAILURE = 'application.load.keyboard-shortcuts.configuration-check.failure',
  APPLICATION_CONTEXTUAL_DOCUMENTATION_LOAD_SKIPPED = 'application.load.contextual-documentation.skipped',

  APPLICATION_COMMAND_CENTER_REGISTRATION_FAILURE = 'application.command-center.registration.failure',

  APPLICATION_LOADED = 'application.load.success',
  APPLICATION_LOAD_FAILURE = 'application.load.failure',

  DEVELOPMENT_ISSUE = 'development.issue',

  APPLICATION_CONTEXT_ACCESSED = 'application.context.accessed',

  VIRTUAL_ASSISTANT_DOCUMENTATION_ENTRY_ACCESSED = 'application.virtual-assistant.documentation-entry.accessed',
}
