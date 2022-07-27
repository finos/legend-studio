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
  // FAILURE
  // TODO: consider to spliting all of these generic errors into more specific events
  WORKSPACE_SETUP_FAILURE = 'setup.workspace.failure',
  PACKAGE_TREE_BUILDER_FAILURE = 'editor.package-tree-build.failure',
  MODEL_LOADER_FAILURE = 'editor.model-loader.failure',
  DATABASE_BUILDER_FAILURE = 'editor.database-builder.failure',
  SERVICE_REGISTRATION_FAILURE = 'editor.service-editor.registration.failure',
  SERVICE_TEST_RUNNER_FAILURE = 'editor.service-editor.test-runner.failure',
  GENERATION_FAILURE = 'editor.generation.failure',
  EXTERNAL_FORMAT_FAILURE = 'editor.external-format.failure',

  // SDLC
  // TODO: consider to split this generic errors into more specific events
  SDLC_MANAGER_FAILURE = 'sdlc.manager.failure',

  WORKSPACE_UPDATED = 'sdlc.workspace-update.success',
  WORKSPACE_LOCAL_CHANGES_PUSHED = 'sdlc.local-changes-push.success',
}
