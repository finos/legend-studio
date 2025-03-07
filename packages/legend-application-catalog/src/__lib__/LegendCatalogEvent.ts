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

export enum LEGEND_CATALOG_APP_EVENT {
  COMPILE_GRAPH__LAUNCH = 'editor.compilation.compile-graph.launch',
  COMPILE_TEXT__LAUNCH = 'editor.compilation.compile-text.launch',
  TEST_DATA_GENERATION__LAUNCH = 'editor.test.test-data-generation.launch',

  TEXT_MODE_COMPILATION__SUCCESS = 'editor.text-mode.compilation.success',
  FORM_MODE_COMPILATION__SUCCESS = 'editor.form-mode.compilation.success',
  TEST_DATA_GENERATION__SUCCESS = 'editor.test.test-data-generation.success',

  // FAILURE
  // TODO: consider to spliting all of these generic errors into more specific events
  GENERIC_FAILURE = 'application.failure.generic',
  WORKSPACE_SETUP_FAILURE = 'setup.workspace.failure',
  PACKAGE_TREE_BUILDER_FAILURE = 'editor.package-tree-build.failure',
  MODEL_LOADER_FAILURE = 'editor.model-loader.failure',
  DATABASE_BUILDER_FAILURE = 'editor.database-builder.failure',
  DATABASE_MODEL_BUILDER_FAILURE = 'editor.database-model-builder.failure',
  SERVICE_REGISTRATION_FAILURE = 'editor.service-editor.registration.failure',
  SERVICE_TEST_RUNNER_FAILURE = 'editor.service-editor.test-runner.failure',
  SERVICE_TEST_SETUP_FAILURE = 'editor.service-editor.test-setup.failure',
  GENERATION_FAILURE = 'editor.generation.failure',
  EXTERNAL_FORMAT_FAILURE = 'editor.external-format.failure',
  MAPPING_TEST_FAILURE = 'editor.mapping-editor.test-runner.failure',

  ENGINE_MANAGER_FAILURE = 'engine.manager.failure',
  // SDLC
  // TODO: consider to split this generic errors into more specific events
  SDLC_MANAGER_FAILURE = 'sdlc.manager.failure',

  SHOWCASE_MANAGER_FAILURE = 'showcase.manager.failure',
  // showcase manager
  SHOWCASE_MANAGER_LAUNCH = 'showcase.manager.launch',
  SHOWCASE_MANAGER_SHOWCASE_PROJECT_LAUNCH = 'showcase.manager.showcase.project.launch',
  SHOWCASE_VIEWER_LAUNCH = 'showcase.viewer.launch',

  UPDATE_WORKSPACE__SUCCESS = 'sdlc.workspace-update.success',
  PUSH_LOCAL_CHANGES__SUCCESS = 'sdlc.local-changes-push.success',

  // Depot
  // TODO: consider to split this generic errors into more specific events
  DEPOT_MANAGER_FAILURE = 'depot.manager.failure',

  // TODO: split this into specific events
  CHANGE_DETECTION__FAILURE = 'change-detection.failure',

  CHANGE_DETECTION_RESTART__SUCCESS = 'change-detection.restart.success',

  CHANGE_DETECTION_COMPUTE_CHANGES__SUCCESS = 'change-detection.computation.changes.success',
  CHANGE_DETECTION_COMPUTE_CONFLICT_RESOLUTION_CONFLICTS__SUCCESS = 'change-detection.computation.conflicts.success',

  CHANGE_DETECTION_BUILD_GRAPH_HASHES_INDEX__SUCCESS = 'change-detection.hash-indexing.graph.success',
  CHANGE_DETECTION_BUILD_LOCAL_HASHES_INDEX__SUCCESS = 'change-detection.hash-indexing.local.success',
  CHANGE_DETECTION_BUILD_WORKSPACE_HASHES_INDEX__SUCCESS = 'change-detection.hash-indexing.workspace.success',
  CHANGE_DETECTION_BUILD_PROJECT_LATEST_HASHES_INDEX__SUCCESS = 'change-detection.hash-indexing.project-latest.success',
  CHANGE_DETECTION_COMPUTE_WORKSPACE_UPDATE_CONFLICTS__SUCCESS = 'change-detection.hash-indexing.workspace-update.success',

  CHANGE_DETECTION_PRECOMPUTE_GRAPH_HASHES__SUCCESS = 'change-detection.graph.pre-hash.success',
  CHANGE_DETECTION_OBSERVE_GRAPH__SUCCESS = 'change-detection.graph.observation.success',

  // text editor
  TEXT_MODE_ACTION_KEYBOARD_SHORTCUT_GO_TO_DEFINITION__LAUNCH = 'editor.text-mode.action.keyboard.shortcut.go-to-element.launch',
  TEXT_MODE_ACTION_KEYBOARD_SHORTCUT_GO_TO_DEFINITION__ERROR = 'editor.text-mode.action.keyboard.shortcut.go-to-element.error',
  TEXT_MODE_ACTION_KEYBOARD_SHORTCUT_GO_TO_DEFINITION__SUCCESS = 'editor.text-mode.action.keyboard.shortcut.go-to-element.success',
}
