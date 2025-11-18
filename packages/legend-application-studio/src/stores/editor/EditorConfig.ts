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

export enum EDITOR_MODE {
  STANDARD = 'STANDARD',
  CONFLICT_RESOLUTION = 'CONFLICT_RESOLUTION',
  REVIEW = 'REVIEW',
  VIEWER = 'VIEWER',
  LAZY_TEXT_EDITOR = 'LAZY_TEXT_EDITOR',
}

export enum TEST_RUNNER_TABS {
  TEST_RUNNER = 'Test Runner',
}

export enum ACTIVITY_MODE {
  EXPLORER = 'EXPLORER',
  LOCAL_CHANGES = 'LOCAL_CHANGES',
  WORKSPACE_REVIEW = 'WORKSPACE_REVIEW',
  WORKSPACE_UPDATER = 'WORKSPACE_UPDATER',
  CONFLICT_RESOLUTION = 'CONFLICT_RESOLUTION',
  SETTINGS = 'SETTINGS',
  REVIEW = 'REVIEW',
  PROJECT_OVERVIEW = 'PROJECT_OVERVIEW',
  WORKFLOW_MANAGER = 'WORKFLOW_MANAGER',
  TEST_RUNNER = 'TEST_RUNNER',
  DEV_MODE = 'DEV_MODE',
  REGISTER_SERVICES = 'REGISTER_SERVICES',
}

export enum USER_JOURNEYS {
  END_TO_END_WORKFLOWS = 'END_TO_END_WORKFLOWS',
}

export enum PANEL_MODE {
  CONSOLE = 'COMPILE',
  DEV_TOOL = 'DEV_TOOL',
  PROBLEMS = 'PROBLEMS',
  SQL_PLAYGROUND = 'SQL_PLAYGROUND',
}

export enum ELEMENT_NATIVE_VIEW_MODE {
  FORM = 'Form',
  JSON = 'JSON',
  GRAMMAR = 'Grammar',
}

export enum GRAPH_EDITOR_MODE {
  FORM = 'FORM',
  GRAMMAR_TEXT = 'GRAMMAR_TEXT',
}
