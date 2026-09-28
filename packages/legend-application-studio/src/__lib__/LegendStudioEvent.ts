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
  COMPILE_GRAPH__LAUNCH = 'editor.compilation.compile-graph.launch',
  COMPILE_TEXT__LAUNCH = 'editor.compilation.compile-text.launch',
  TEST_DATA_GENERATION__LAUNCH = 'editor.test.test-data-generation.launch',

  TEXT_MODE_COMPILATION__SUCCESS = 'editor.text-mode.compilation.success',
  FORM_MODE_COMPILATION__SUCCESS = 'editor.form-mode.compilation.success',
  FORM_MODE_COMPILATION__FAILURE = 'editor.form-mode.compilation.failure',
  TEST_DATA_GENERATION__SUCCESS = 'editor.test.test-data-generation.success',
  TEST_DATA_GENERATION__FAILURE = 'editor.test.test-data-generation.failure',

  INITIALIZE_GRAPH__LAUNCH = 'graph-manager.initialize-graph.launch',
  INITIALIZE_GRAPH__FAILURE = 'graph-manager.initialize-graph.failure',

  // FAILURE
  // TODO: consider to spliting all of these generic errors into more specific events
  GENERIC_FAILURE = 'application.failure.generic',
  WORKSPACE_SETUP_FAILURE = 'setup.workspace.failure',
  PACKAGE_TREE_BUILDER_FAILURE = 'editor.package-tree-build.failure',
  MODEL_LOADER_FAILURE = 'editor.model-loader.failure',
  DATABASE_BUILDER_FAILURE = 'editor.database-builder.failure',
  DATABASE_MODEL_BUILDER_FAILURE = 'editor.database-model-builder.failure',
  SERVICE_REGISTRATION_FAILURE = 'editor.service-editor.registration.failure',
  SERVICE_REGISTRATION_LAUNCH = 'editor.service-editor.registration.launch',
  SERVICE_REGISTRATION_SUCCESS = 'editor.service-editor.registration.success',
  SERVICE_REGISTRATION_CHECK_LAUNCH = 'editor.service-editor.registration-check.launch',
  SERVICE_REGISTRATION_CHECK_SUCCESS = 'editor.service-editor.registration-check.success',
  SERVICE_REGISTRATION_CHECK_FAILURE = 'editor.service-editor.registration-check.failure',
  SERVICE_TEST_RUNNER_FAILURE = 'editor.service-editor.test-runner.failure',
  SERVICE_TEST_SETUP_FAILURE = 'editor.service-editor.test-setup.failure',
  GENERATION_LAUNCH = 'editor.generation.launch',
  GENERATION_SUCCESS = 'editor.generation.success',
  GENERATION_FAILURE = 'editor.generation.failure',
  EXTERNAL_FORMAT_FAILURE = 'editor.external-format.failure',
  MAPPING_TEST_FAILURE = 'editor.mapping-editor.test-runner.failure',

  ENGINE_MANAGER_FAILURE = 'engine.manager.failure',
  // SDLC
  // TODO: consider to split this generic errors into more specific events
  SDLC_MANAGER_FAILURE = 'sdlc.manager.failure',

  SHOWCASE_MANAGER_FAILURE = 'showcase.manager.failure',
  SHOWCASE_MANAGER_INIT__FAILURE = 'showcase.manager.init.failure',
  SHOWCASE_MANAGER_OPEN__FAILURE = 'showcase.manager.open.failure',
  SHOWCASE_MANAGER_SEARCH__FAILURE = 'showcase.manager.search.failure',
  // showcase manager
  SHOWCASE_MANAGER_LAUNCH = 'showcase.manager.launch',
  SHOWCASE_MANAGER_SHOWCASE_PROJECT_LAUNCH = 'showcase.manager.showcase.project.launch',
  SHOWCASE_MANAGER_SEARCH__INITIATED = 'showcase.manager.search.initiated',
  SHOWCASE_MANAGER_SEARCH__COMPLETED = 'showcase.manager.search.completed',
  SHOWCASE_VIEWER_LAUNCH = 'showcase.viewer.launch',
  SHOWCASE_VIEWER_CLOSE = 'showcase.viewer.close',
  SHOWCASE_VIEWER_FEEDBACK__SUBMIT = 'showcase.viewer.feedback.submit',

  UPDATE_WORKSPACE__LAUNCH = 'sdlc.workspace-update.launch',
  UPDATE_WORKSPACE__SUCCESS = 'sdlc.workspace-update.success',
  UPDATE_WORKSPACE__FAILURE = 'sdlc.workspace-update.failure',
  PUSH_LOCAL_CHANGES__LAUNCH = 'sdlc.local-changes-push.launch',
  PUSH_LOCAL_CHANGES__SUCCESS = 'sdlc.local-changes-push.success',
  PUSH_LOCAL_CHANGES__FAILURE = 'sdlc.local-changes-push.failure',

  // text mode session
  TEXT_MODE__ENTER = 'editor.text-mode.enter',
  TEXT_MODE__LEAVE = 'editor.text-mode.leave',
  TEXT_MODE__FIRST_EDIT = 'editor.text-mode.first-edit',
  TEXT_MODE_COMPILATION__FAILURE = 'editor.text-mode.compilation.failure',
  TEXT_MODE__STRICT_LAUNCH = 'editor.text-mode.strict.launch',
  TEXT_MODE__TOGGLE_SHORTCUT_INVOKED = 'editor.text-mode.toggle-shortcut.invoked',
  TEXT_MODE__ACTION = 'editor.text-mode.action',

  // save-side friction
  PUSH_LOCAL_CHANGES__EMPTY = 'sdlc.local-changes-push.empty',

  // editor tabs
  EDITOR_TAB__OPEN = 'editor.tab.open',
  EDITOR_TAB__CLOSE = 'editor.tab.close',

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

  // data product
  DATA_PRODUCT_LEGENDAI_SUGGEST__LAUNCH = 'editor.data-product.legendai-suggest.launch',
  DATA_PRODUCT_LEGENDAI_SUGGEST__APPLY = 'editor.data-product.legendai-suggest.apply',
  DATA_PRODUCT_LEGENDAI_SUGGEST__DISCARD = 'editor.data-product.legendai-suggest.discard',
  DATA_PRODUCT_LEGENDAI_SUGGEST__FAILURE = 'editor.data-product.legendai-suggest.failure',

  // dataspace
  DATASPACE_LEGENDAI_SUGGEST__LAUNCH = 'editor.dataspace.legendai-suggest.launch',
  DATASPACE_LEGENDAI_SUGGEST__APPLY = 'editor.dataspace.legendai-suggest.apply',
  DATASPACE_LEGENDAI_SUGGEST__DISCARD = 'editor.dataspace.legendai-suggest.discard',
  DATASPACE_LEGENDAI_SUGGEST__FAILURE = 'editor.dataspace.legendai-suggest.failure',

  // service
  SERVICE_LEGENDAI_SUGGEST__LAUNCH = 'editor.service-editor.legendai-suggest.launch',
  SERVICE_LEGENDAI_SUGGEST__APPLY = 'editor.service-editor.legendai-suggest.apply',
  SERVICE_LEGENDAI_SUGGEST__DISCARD = 'editor.service-editor.legendai-suggest.discard',
  SERVICE_LEGENDAI_SUGGEST__FAILURE = 'editor.service-editor.legendai-suggest.failure',

  // push to dev
  METADATA_PUSH_TO_METADATA = 'editor.metadata.push-to-metadata',
  METADATA_PUSH_TO_METADATA__LAUNCH = 'editor.metadata.push-to-metadata.launch',
  METADATA_PUSH_TO_METADATA__SUCCESS = 'editor.metadata.push-to-metadata.success',
  METADATA_PUSH_TO_METADATA__FAILURE = 'editor.metadata.push-to-metadata.failure',

  // workflow manager (SDLC pipeline sidebar / project viewer surfaces)
  WORKFLOW_MANAGER_PANEL__OPEN = 'workflow-manager.panel.open',
  WORKFLOW_MANAGER_PANEL__CLOSE = 'workflow-manager.panel.close',
  WORKFLOW_MANAGER_FETCH_WORKFLOWS__LAUNCH = 'workflow-manager.fetch-workflows.launch',
  WORKFLOW_MANAGER_FETCH_WORKFLOWS__SUCCESS = 'workflow-manager.fetch-workflows.success',
  WORKFLOW_MANAGER_FETCH_WORKFLOWS__FAILURE = 'workflow-manager.fetch-workflows.failure',
  WORKFLOW_MANAGER_WORKFLOW__EXPAND = 'workflow-manager.workflow.expand',
  WORKFLOW_MANAGER_WORKFLOW__REFRESH = 'workflow-manager.workflow.refresh',
  WORKFLOW_MANAGER_FETCH_JOBS__LAUNCH = 'workflow-manager.fetch-jobs.launch',
  WORKFLOW_MANAGER_FETCH_JOBS__SUCCESS = 'workflow-manager.fetch-jobs.success',
  WORKFLOW_MANAGER_FETCH_JOBS__FAILURE = 'workflow-manager.fetch-jobs.failure',
  WORKFLOW_MANAGER_JOB_ACTION__LAUNCH = 'workflow-manager.job-action.launch',
  WORKFLOW_MANAGER_JOB_ACTION__SUCCESS = 'workflow-manager.job-action.success',
  WORKFLOW_MANAGER_JOB_ACTION__FAILURE = 'workflow-manager.job-action.failure',
  WORKFLOW_MANAGER_JOB_LOGS__OPEN = 'workflow-manager.job-logs.open',
  WORKFLOW_MANAGER_JOB_LOGS__CLOSE = 'workflow-manager.job-logs.close',
  WORKFLOW_MANAGER_JOB_LOGS__REFRESH = 'workflow-manager.job-logs.refresh',
  WORKFLOW_MANAGER_JOB_LOGS_FETCH__SUCCESS = 'workflow-manager.job-logs.fetch.success',
  WORKFLOW_MANAGER_JOB_LOGS_FETCH__FAILURE = 'workflow-manager.job-logs.fetch.failure',

  // service test suite run (structured lifecycle around the existing SERVICE_TEST_RUNNER_FAILURE bucket)
  SERVICE_TEST_SUITE_RUN__LAUNCH = 'editor.service-editor.test-suite-run.launch',
  SERVICE_TEST_SUITE_RUN__SUCCESS = 'editor.service-editor.test-suite-run.success',
  SERVICE_TEST_SUITE_RUN__FAILURE = 'editor.service-editor.test-suite-run.failure',

  // unified testable run lifecycle (mapping / data product / ingest / function activator / availability)
  TESTABLE_RUN__LAUNCH = 'editor.testable.run.launch',
  TESTABLE_RUN__SUCCESS = 'editor.testable.run.success',
  TESTABLE_RUN__FAILURE = 'editor.testable.run.failure',

  // global test runner (sidebar): run-all / run-dependencies across many testables at once
  GLOBAL_TEST_RUN__LAUNCH = 'global-test-runner.run.launch',
  GLOBAL_TEST_RUN__SUCCESS = 'global-test-runner.run.success',
  GLOBAL_TEST_RUN__FAILURE = 'global-test-runner.run.failure',

  // sdlc review lifecycle (author + reviewer roles) — structured replacement
  // for the SDLC_MANAGER_FAILURE bucket that used to hide review actions
  SDLC_REVIEW_ACTION__LAUNCH = 'sdlc.review.action.launch',
  SDLC_REVIEW_ACTION__SUCCESS = 'sdlc.review.action.success',
  SDLC_REVIEW_ACTION__FAILURE = 'sdlc.review.action.failure',

  // workspace setup screen — create sandbox project / create project /
  // import project / create workspace. Structured replacement for the
  // WORKSPACE_SETUP_FAILURE bucket plus previously-unlogged create/import
  // project flows. No sourceInfo (setup runs before any editor mode).
  SETUP_ACTION__LAUNCH = 'setup.action.launch',
  SETUP_ACTION__SUCCESS = 'setup.action.success',
  SETUP_ACTION__FAILURE = 'setup.action.failure',

  // project configuration update lifecycle (deps / platform / structure
  // version bump / project type toggle). Structured replacement for the
  // SDLC_MANAGER_FAILURE bucket around the config editor's writes.
  PROJECT_CONFIG_UPDATE__LAUNCH = 'editor.project-config.update.launch',
  PROJECT_CONFIG_UPDATE__SUCCESS = 'editor.project-config.update.success',
  PROJECT_CONFIG_UPDATE__FAILURE = 'editor.project-config.update.failure',

  // project overview sidebar SDLC writes — delete workspace, update
  // project metadata, cut a release version, release a patch branch, open
  // a new patch branch (which also creates the initial workspace on it).
  // Structured replacement for the SDLC_MANAGER_FAILURE bucket around
  // ProjectOverviewState's user-triggered writes.
  PROJECT_OVERVIEW_ACTION__LAUNCH = 'editor.project-overview.action.launch',
  PROJECT_OVERVIEW_ACTION__SUCCESS = 'editor.project-overview.action.success',
  PROJECT_OVERVIEW_ACTION__FAILURE = 'editor.project-overview.action.failure',

  // ad-hoc workspace creation from the editor bootstrap — fires when a
  // user deep-links to a workspace that doesn't exist yet and picks
  // "Create workspace" from the recovery prompt. Distinct from
  // SETUP_ACTION.CREATE_WORKSPACE (setup screen callsite).
  SDLC_WORKSPACE_CREATE__LAUNCH = 'sdlc.workspace-create.launch',
  SDLC_WORKSPACE_CREATE__SUCCESS = 'sdlc.workspace-create.success',
  SDLC_WORKSPACE_CREATE__FAILURE = 'sdlc.workspace-create.failure',
}
