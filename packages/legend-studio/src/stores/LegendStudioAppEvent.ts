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

export enum LEGEND_STUDIO_APP_EVENT {
  // SETUP

  // FAILURE
  WORKSPACE_SETUP_FAILURE = 'EDITOR_SETUP_FAILURE', // TODO: consider to split this generic errors into more specific events
  PACKAGE_TREE_BUILDER_FAILURE = 'PACKAGE_TREE_BUILDER_FAILURE', // TODO: consider to split this generic errors into more specific events
  MODEL_LOADER_FAILURE = 'MODEL_LOADER_FAILURE', // TODO: consider to split this generic errors into more specific events
  DATABASE_BUILDER_FAILURE = 'DATABASE_BUILDER_FAILURE', // TODO: consider to split this generic errors into more specific events
  SERVICE_REGISTRATION_FAILURE = 'SERVICE_REGISTRATION_FAILURE', // TODO: consider to split this generic errors into more specific events
  SERVICE_TEST_RUNNER_FAILURE = 'SERVICE_TEST_RUNNER_FAILURE', // TODO: consider to split this generic errors into more specific events
  GENERATION_FAILURE = 'GENERATION_FAILURE', // TODO: consider to split this generic errors into more specific events
  EXTERNAL_FORMAT_FAILURE = 'EXTERNAL_FORMAT_FAILURE', // TODO: consider to split this generic errors into more specific events

  // SDLC
  SDLC_MANAGER_FAILURE = 'SDLC_MANAGER_FAILURE', // TODO: consider to split this generic errors into more specific events
  WORKSPACE_UPDATED = 'WORKSPACE_UPDATED',
  WORKSPACE_LOCAL_CHANGES_PUSHED = 'WORKSPACE_LOCAL_CHANGES_PUSHED',
}
