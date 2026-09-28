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
  Availability,
  DataProduct,
  FunctionActivator,
  GRAPH_MANAGER_EVENT,
  IngestDefinition,
  Mapping,
  MultiExecutionServiceTestResult,
  PackageableElement,
  Service,
  TestError,
  TestExecuted,
  TestExecutionStatus,
  type GraphInitializationReport,
  type GraphManagerOperationReport,
  type TestResult,
  type Testable,
} from '@finos/legend-graph';
import {
  APPLICATION_EVENT,
  type TelemetryService,
  type VirtualAssistantSearchResultAccessed_TelemetryData,
} from '@finos/legend-application';
import { LEGEND_STUDIO_APP_EVENT } from './LegendStudioEvent.js';
import type { LegendSourceInfo } from '@finos/legend-storage';

/**
 * All Studio telemetry events consistently carry an optional `sourceInfo`
 * so downstream analytics can slice by workspace edit vs project viewer vs
 * GAV viewer vs showcase without inferring from URLs. Non-editor events
 * (virtual assistant, showcase manager) do not attach `sourceInfo` because
 * they may fire outside any editor context.
 */
type WithSourceInfo = {
  sourceInfo?: LegendSourceInfo | undefined;
};

type Compilation_TelemetryData = GraphManagerOperationReport & {
  dependenciesCount: number;
} & WithSourceInfo;

type TestDataGeneration_TelemetryData = GraphManagerOperationReport & {
  dependenciesCount: number;
} & WithSourceInfo;

type ShowcaseSearchInitiated_TelemetryData = {
  searchText: string;
};

export type ShowcaseSearchCompleted_TelemetryData = {
  searchText: string;
  resultCount: number;
  showcaseMatchCount: number;
  textMatchCount: number;
  durationMs: number;
  hadResults: boolean;
};

export enum SHOWCASE_MANAGER_ENTRY_POINT {
  ACTIVITY_BAR = 'activity-bar',
  WORKSPACE_SETUP = 'workspace-setup',
}

export enum SHOWCASE_LAUNCH_ENTRY_POINT {
  EXPLORER = 'explorer',
  SEARCH_SHOWCASE_MATCH = 'search-showcase-match',
  SEARCH_CODE_MATCH = 'search-code-match',
  DEEP_LINK = 'deep-link',
}

export type ShowcaseMetadata_TelemetryData = {
  showcasesTotalCount: number;
  showcasesDevelopmentCount: number;
  entryPoint: SHOWCASE_MANAGER_ENTRY_POINT;
};

export type ShowcaseProject_TelemetryData = {
  showcasePath: string;
  title?: string | undefined;
  isDevelopment?: boolean | undefined;
  entryPoint?: SHOWCASE_LAUNCH_ENTRY_POINT | undefined;
  lineNumber?: number | undefined;
};

export type ShowcaseViewerClose_TelemetryData = {
  showcasePath: string;
  dwellMs: number;
};

export enum SHOWCASE_FEEDBACK_VOTE {
  UP = 'up',
  DOWN = 'down',
}

export enum SHOWCASE_FEEDBACK_SURFACE {
  DEEP_LINK_VIEWER = 'deep-link-viewer',
  ASSISTANT_PANEL = 'assistant-panel',
}

export type ShowcaseFeedback_TelemetryData = {
  showcasePath: string;
  title?: string | undefined;
  vote: SHOWCASE_FEEDBACK_VOTE;
  surface: SHOWCASE_FEEDBACK_SURFACE;
};

export type ShowcaseFailure_TelemetryData = {
  errorMessage: string;
  showcasePath?: string | undefined;
  searchText?: string | undefined;
};

export enum TEXT_MODE_ENTER_TRIGGER {
  MANUAL_TOGGLE = 'manual-toggle',
  FALLBACK_GRAPH_BUILD_FAILURE = 'fallback-graph-build-failure',
  FALLBACK_FORM_COMPILATION_FAILURE = 'fallback-form-compilation-failure',
  INITIAL_LAZY = 'initial-lazy',
}

export enum TEXT_MODE_LEAVE_OUTCOME {
  COMPILED_AND_LEFT = 'compiled-and-left',
  DISCARDED = 'discarded',
}

export enum TEXT_MODE_COMPILATION_ERROR_KIND {
  PARSER = 'parser',
  COMPILER = 'compiler',
  OTHER = 'other',
}

export enum TEXT_MODE_TOGGLE_SOURCE {
  BUTTON = 'button',
  KEYBOARD_SHORTCUT = 'keyboard-shortcut',
  CONTEXT_MENU = 'context-menu',
}

export enum TEXT_MODE_TOGGLE_DIRECTION {
  TO_TEXT = 'to-text',
  TO_FORM = 'to-form',
}

export enum TEXT_MODE_ACTION {
  GO_TO_DEFINITION = 'go-to-definition',
}

export enum TEXT_MODE_ACTION_STATUS {
  LAUNCH = 'launch',
  SUCCESS = 'success',
  ERROR = 'error',
}

export enum GRAPH_EDITOR_MODE_LABEL {
  FORM = 'form',
  TEXT = 'text',
  STRICT_TEXT = 'strict-text',
}

export enum FORM_MODE_COMPILATION_ERROR_KIND {
  COMPILATION = 'compilation',
  ENGINE = 'engine',
}

export enum GRAPH_INITIALIZATION_ERROR_KIND {
  DEPENDENCY = 'dependency',
  DESERIALIZATION = 'deserialization',
  NETWORK = 'network',
  OTHER = 'other',
}

export enum SERVICE_REGISTRATION_TRIGGER {
  SINGLE = 'single',
  BULK = 'bulk',
  SERVICE_QUERY_EDITOR = 'service-query-editor',
}

export type ServiceRegistrationCommonData = {
  trigger: SERVICE_REGISTRATION_TRIGGER;
  executionMode: string | undefined;
  serviceCount: number;
  activatePostRegistration: boolean;
};

export type ServiceRegistrationCheckCommonData = {
  servicePath: string;
  envCount: number;
};

/**
 * Discriminates the entry-point of `editor.generation.*` events.
 * - `global`: sidebar "Generate" action, spans the whole project's generation spec
 *   (models + artifacts).
 * - `element-schema`: per-element external-format schema regeneration from an
 *   element editor's "Generate" button.
 */
export enum GENERATION_MODE {
  GLOBAL = 'global',
  ELEMENT_SCHEMA = 'element-schema',
}

export type GenerationCommonData = {
  mode: GENERATION_MODE;
  elementPath?: string | undefined;
  generationType?: string | undefined;
  /**
   * Only meaningful for `global` runs — reflects whether artifact generation
   * was enabled at the time the run was launched.
   */
  enableArtifactGeneration?: boolean | undefined;
};

/**
 * High-level bucket for a Studio tab so dashboards can slice tab activity
 * across element editors vs. sidecar tabs (diff viewers, artifact viewers,
 * model importer, etc.) without depending on the element metamodel.
 */
export enum EDITOR_TAB_KIND {
  ELEMENT = 'element',
  ENTITY_DIFF = 'entity-diff',
  ARTIFACT_GENERATION = 'artifact-generation',
  MODEL_IMPORTER = 'model-importer',
  PROJECT_CONFIGURATION = 'project-configuration',
  END_TO_END_WORKFLOW = 'end-to-end-workflow',
  OTHER = 'other',
}

/**
 * Sub-bucket for `EDITOR_TAB_KIND.ELEMENT` tabs — carried as the raw
 * `PACKAGEABLE_ELEMENT_TYPE` string (e.g. `'CLASS'`, `'MAPPING'`,
 * `'SERVICE'`, `'BETA_DATA_PRODUCT'`) resolved by
 * `EditorGraphState.getPackageableElementType`. That classifier is
 * plugin-aware, so extension-provided element kinds (DataSpace, Diagram,
 * DataQuality, ...) come through with their extension-declared labels
 * rather than falling into a generic `other` bucket.
 */
export type EditorElementKind = string;

export enum EDITOR_TAB_OPEN_TRIGGER {
  /** Default when the caller did not surface intent. */
  PROGRAMMATIC = 'programmatic',
  /** Tab was recreated after graph rebuild via cachedTabs recovery. */
  RESTORE = 'restore',
}

export enum EDITOR_TAB_CLOSE_TRIGGER {
  /** User clicked the "x" on the tab, or middle-clicked the tab strip. */
  USER_CLOSE = 'user-close',
  /** User invoked "Close Others" from the tab context menu. */
  CLOSE_OTHERS = 'close-others',
  /** User invoked "Close All" from the tab context menu. */
  CLOSE_ALL = 'close-all',
  /** Tabs were flushed as part of a graph rebuild (cacheAndClose). */
  NAVIGATE_AWAY = 'navigate-away',
  /** Programmatic close from a store method. */
  PROGRAMMATIC = 'programmatic',
}

export type EditorTabCommonData = {
  tabKind: EDITOR_TAB_KIND;
  elementKind?: EditorElementKind | undefined;
  elementPath?: string | undefined;
};

export enum WORKFLOW_MANAGER_SCOPE {
  WORKSPACE = 'workspace',
  PROJECT = 'project',
  PROJECT_VERSION = 'project-version',
}

export enum WORKFLOW_MANAGER_JOB_ACTION {
  RETRY = 'retry',
  CANCEL = 'cancel',
  RUN_MANUAL = 'run-manual',
}

export type WorkflowManagerStatusBreakdown = Record<string, number>;

/**
 * SDLC review actions. `create` only fires from the author side;
 * `approve` / `reopen` fire only from the reviewer side; `commit` and
 * `close` fire from both.
 */
export enum SDLC_REVIEW_ACTION {
  CREATE = 'create',
  COMMIT = 'commit',
  CLOSE = 'close',
  REOPEN = 'reopen',
  APPROVE = 'approve',
}

/**
 * Which side of the review the event fires from — the workspace author
 * committing/closing their own review, or a reviewer approving / committing
 * / reopening / closing someone else's review.
 */
export enum SDLC_REVIEW_ROLE {
  AUTHOR = 'author',
  REVIEWER = 'reviewer',
}

type SdlcReviewIdentityData = {
  action: SDLC_REVIEW_ACTION;
  role: SDLC_REVIEW_ROLE;
  projectId: string;
  patchReleaseVersionId?: string | undefined;
};

export type SdlcReviewActionLaunchData = SdlcReviewIdentityData & {
  // Undefined on `create` launches (no id yet); populated for the other
  // actions.
  reviewId?: string | undefined;
};

export type SdlcReviewActionSuccessData = SdlcReviewIdentityData & {
  reviewId: string;
  durationMs: number;
};

export type SdlcReviewActionFailureData = SdlcReviewIdentityData & {
  // Undefined on `create` failures (the server may have failed before
  // assigning an id); populated for the other actions.
  reviewId?: string | undefined;
  errorMessage: string;
};

/**
 * Workspace setup screen actions — user-triggered writes from the setup /
 * project picker route. Structured replacement for the
 * WORKSPACE_SETUP_FAILURE bucket plus previously-unlogged create-project
 * and import-project flows.
 */
export enum SETUP_ACTION {
  CREATE_SANDBOX_PROJECT = 'create-sandbox-project',
  CREATE_PROJECT = 'create-project',
  IMPORT_PROJECT = 'import-project',
  CREATE_WORKSPACE = 'create-workspace',
}

type SetupActionIdentityData = {
  action: SETUP_ACTION;
  // Populated for `create-workspace` (the caller passes the target project
  // and workspace up front) and for `*` success events once the id is
  // known; undefined otherwise.
  projectId?: string | undefined;
  // Only meaningful for `create-workspace` — USER / GROUP. Serialized as
  // string so the enum value doesn't need to be re-exported here.
  workspaceType?: string | undefined;
  // Only meaningful for `create-workspace` — true when the workspace
  // targets a patch branch rather than main.
  hasPatchReleaseVersion?: boolean | undefined;
};

export type SetupActionLaunchData = SetupActionIdentityData;

export type SetupActionSuccessData = SetupActionIdentityData & {
  durationMs: number;
};

export type SetupActionFailureData = SetupActionIdentityData & {
  errorMessage: string;
};

/**
 * Project configuration editor actions — user-triggered writes from the
 * project configuration editor. Structured replacement for the
 * SDLC_MANAGER_FAILURE bucket around config updates.
 *
 * The three actions map to the three top-level editor buttons; they all
 * funnel through the same `updateProjectConfiguration` SDLC call, and the
 * `action` field records which entry point the user came from.
 */
export enum PROJECT_CONFIG_UPDATE_ACTION {
  // "Update" button on the config editor: dependency add/remove, platform
  // configurations, run-dependency-tests toggle.
  UPDATE_CONFIGS = 'update-configs',
  // "Upgrade to latest project structure" button.
  UPDATE_TO_LATEST_STRUCTURE = 'update-to-latest-structure',
  // "Change project type" (managed / embedded) toggle.
  CHANGE_PROJECT_TYPE = 'change-project-type',
}

type ProjectConfigUpdateIdentityData = {
  action: PROJECT_CONFIG_UPDATE_ACTION;
};

export type ProjectConfigUpdateLaunchData = ProjectConfigUpdateIdentityData;

export type ProjectConfigUpdateSuccessData = ProjectConfigUpdateIdentityData & {
  durationMs: number;
};

export type ProjectConfigUpdateFailureData = ProjectConfigUpdateIdentityData & {
  errorMessage: string;
};

/**
 * Project overview sidebar SDLC writes — user-triggered actions from the
 * project overview panel. Structured replacement for the
 * SDLC_MANAGER_FAILURE bucket around ProjectOverviewState.
 */
export enum PROJECT_OVERVIEW_ACTION {
  // Delete another workspace from the overview list.
  DELETE_WORKSPACE = 'delete-workspace',
  // Edit project name / description / tags.
  UPDATE_PROJECT = 'update-project',
  // Cut a new release version (major / minor / patch semver).
  CREATE_VERSION = 'create-version',
  // Close out a patch branch and release it as a version.
  RELEASE_PATCH = 'release-patch',
  // Open a new patch branch (also creates the initial workspace on it).
  CREATE_PATCH = 'create-patch',
}

type ProjectOverviewActionIdentityData = {
  action: PROJECT_OVERVIEW_ACTION;
  projectId: string;
  // Only meaningful for `release-patch` (the patch being released) and for
  // `create-patch` (the source version the patch branches from).
  patchReleaseVersionId?: string | undefined;
  // Only meaningful for `create-patch` (the workspace being created on the
  // new patch branch) — USER / GROUP. Serialized as string so the enum
  // value doesn't need to be re-exported here.
  workspaceType?: string | undefined;
};

export type ProjectOverviewActionLaunchData = ProjectOverviewActionIdentityData;

export type ProjectOverviewActionSuccessData =
  ProjectOverviewActionIdentityData & { durationMs: number };

export type ProjectOverviewActionFailureData =
  ProjectOverviewActionIdentityData & { errorMessage: string };

/**
 * Ad-hoc workspace creation from the editor bootstrap — fires when the
 * user deep-links to a workspace that doesn't exist and accepts the
 * "Create workspace" recovery prompt. Distinct from the setup screen's
 * `SETUP_ACTION.CREATE_WORKSPACE` because it runs from a different
 * surface (in-editor recovery, not the setup route) with its own
 * error-handling and legacy log bucket (`WORKSPACE_SETUP_FAILURE`).
 *
 * No editor mode is active yet at this point, so `sourceInfo` is
 * omitted — the payload carries `projectId`, `workspaceId`,
 * `workspaceType`, and `hasPatchReleaseVersion` explicitly.
 */
type SdlcWorkspaceCreateIdentityData = {
  projectId: string;
  workspaceId: string;
  workspaceType: string;
  hasPatchReleaseVersion: boolean;
};

export type SdlcWorkspaceCreateLaunchData = SdlcWorkspaceCreateIdentityData;

export type SdlcWorkspaceCreateSuccessData = SdlcWorkspaceCreateIdentityData & {
  durationMs: number;
};

export type SdlcWorkspaceCreateFailureData = SdlcWorkspaceCreateIdentityData & {
  errorMessage: string;
};

export enum SERVICE_TEST_SUITE_RUN_MODE {
  RUN_SUITE = 'run-suite',
  RUN_FAILING = 'run-failing',
}

export type ServiceTestSuiteRunCommonData = {
  servicePath: string;
  suiteId: string;
  mode: SERVICE_TEST_SUITE_RUN_MODE;
  testCount: number;
};

/**
 * Categorises the element behind a `Testable` for the unified TESTABLE_RUN
 * telemetry so downstream analytics can slice per element kind without
 * relying on the element path.
 */
export enum TESTABLE_KIND {
  MAPPING = 'mapping',
  DATA_PRODUCT = 'data-product',
  INGEST = 'ingest',
  FUNCTION_ACTIVATOR = 'function-activator',
  AVAILABILITY = 'availability',
  SERVICE = 'service',
  OTHER = 'other',
}

/**
 * Which kind of run was invoked from the testable editors. This mirrors the
 * distinct UI actions surfaced to the user (run suite, run failing tests,
 * run entire testable, run all failing suites).
 */
export enum TESTABLE_RUN_MODE {
  RUN_SUITE = 'run-suite',
  RUN_FAILING = 'run-failing',
  RUN_TESTABLE = 'run-testable',
  RUN_ALL_FAILING = 'run-all-failing',
  RUN_TEST = 'run-test',
}

export type TestableRunCommonData = {
  testableKind: TESTABLE_KIND;
  testablePath: string;
  suiteId: string | undefined;
  mode: TESTABLE_RUN_MODE;
  testCount: number;
};

/**
 * Resolves the {@link TESTABLE_KIND} label for a testable element instance.
 * Falls back to `OTHER` so telemetry never blocks on an unknown subtype.
 */
export const getTestableKind = (testable: Testable): TESTABLE_KIND => {
  if (testable instanceof Service) {
    return TESTABLE_KIND.SERVICE;
  }
  if (testable instanceof Mapping) {
    return TESTABLE_KIND.MAPPING;
  }
  if (testable instanceof DataProduct) {
    return TESTABLE_KIND.DATA_PRODUCT;
  }
  if (testable instanceof IngestDefinition) {
    return TESTABLE_KIND.INGEST;
  }
  if (testable instanceof FunctionActivator) {
    return TESTABLE_KIND.FUNCTION_ACTIVATOR;
  }
  if (testable instanceof Availability) {
    return TESTABLE_KIND.AVAILABILITY;
  }
  return TESTABLE_KIND.OTHER;
};

/**
 * Reads `.path` from a testable, which all real packageable-element testables
 * expose. Returns an empty string if unavailable to keep telemetry non-fatal.
 */
export const getTestablePath = (testable: Testable): string =>
  testable instanceof PackageableElement ? testable.path : '';

/**
 * Bucketises test results into passed/failed/errored counts for the unified
 * TESTABLE_RUN__SUCCESS payload. Handles {@link MultiExecutionServiceTestResult}
 * by tallying each key-indexed sub-result so service multi-execution runs count
 * every execution rather than the wrapper.
 */
export const summarizeTestResults = (
  results: TestResult[],
): { passedCount: number; failedCount: number; erroredCount: number } => {
  let passedCount = 0;
  let failedCount = 0;
  let erroredCount = 0;
  const tally = (result: TestResult): void => {
    if (result instanceof TestError) {
      erroredCount += 1;
    } else if (result instanceof TestExecuted) {
      if (result.testExecutionStatus === TestExecutionStatus.PASS) {
        passedCount += 1;
      } else {
        failedCount += 1;
      }
    }
  };
  for (const result of results) {
    if (result instanceof MultiExecutionServiceTestResult) {
      result.keyIndexedTestResults.forEach(tally);
    } else {
      tally(result);
    }
  }
  return { passedCount, failedCount, erroredCount };
};

/**
 * Scope of a global test runner invocation from the sidebar.
 */
export enum GLOBAL_TEST_RUN_SCOPE {
  ALL = 'all',
  DEPENDENCIES = 'dependencies',
}

export type GlobalTestRunCommonData = {
  scope: GLOBAL_TEST_RUN_SCOPE;
  testableCount: number;
};

export class LegendStudioTelemetryHelper {
  static logEvent_GraphCompilationLaunched(
    service: TelemetryService,
    sourceInfo?: LegendSourceInfo | undefined,
  ): void {
    service.logEvent(LEGEND_STUDIO_APP_EVENT.COMPILE_GRAPH__LAUNCH, {
      sourceInfo,
    });
  }

  static logEvent_TextCompilationLaunched(
    service: TelemetryService,
    sourceInfo?: LegendSourceInfo | undefined,
  ): void {
    service.logEvent(LEGEND_STUDIO_APP_EVENT.COMPILE_TEXT__LAUNCH, {
      sourceInfo,
    });
  }

  static logEvent_TestDataGenerationLaunched(
    service: TelemetryService,
    sourceInfo?: LegendSourceInfo | undefined,
  ): void {
    service.logEvent(LEGEND_STUDIO_APP_EVENT.TEST_DATA_GENERATION__LAUNCH, {
      sourceInfo,
    });
  }

  static logEvent_GraphCompilationSucceeded(
    service: TelemetryService,
    data: Compilation_TelemetryData,
    sourceInfo?: LegendSourceInfo | undefined,
  ): void {
    service.logEvent(LEGEND_STUDIO_APP_EVENT.FORM_MODE_COMPILATION__SUCCESS, {
      ...data,
      sourceInfo,
    });
  }

  static logEvent_TextCompilationSucceeded(
    service: TelemetryService,
    data: Compilation_TelemetryData,
    sourceInfo?: LegendSourceInfo | undefined,
  ): void {
    service.logEvent(LEGEND_STUDIO_APP_EVENT.TEXT_MODE_COMPILATION__SUCCESS, {
      ...data,
      sourceInfo,
    });
  }

  static logEvent_TestDataGenerationSucceeded(
    service: TelemetryService,
    data: TestDataGeneration_TelemetryData,
    sourceInfo?: LegendSourceInfo | undefined,
  ): void {
    service.logEvent(LEGEND_STUDIO_APP_EVENT.TEST_DATA_GENERATION__SUCCESS, {
      ...data,
      sourceInfo,
    });
  }

  static logEvent_GraphInitializationSucceeded(
    service: TelemetryService,
    data: GraphInitializationReport,
    sourceInfo?: LegendSourceInfo | undefined,
  ): void {
    service.logEvent(GRAPH_MANAGER_EVENT.INITIALIZE_GRAPH__SUCCESS, {
      ...data,
      sourceInfo,
    });
  }

  static logEvent_GraphInitializationLaunched(
    service: TelemetryService,
    sourceInfo?: LegendSourceInfo | undefined,
  ): void {
    service.logEvent(LEGEND_STUDIO_APP_EVENT.INITIALIZE_GRAPH__LAUNCH, {
      sourceInfo,
    });
  }

  static logEvent_GraphInitializationFailure(
    service: TelemetryService,
    sourceInfo: LegendSourceInfo | undefined,
    data: {
      errorKind: GRAPH_INITIALIZATION_ERROR_KIND;
      errorMessage: string;
      fallbackToTextMode: boolean;
    },
  ): void {
    service.logEvent(LEGEND_STUDIO_APP_EVENT.INITIALIZE_GRAPH__FAILURE, {
      sourceInfo,
      ...data,
    });
  }

  static logEvent_GraphCompilationFailure(
    service: TelemetryService,
    sourceInfo: LegendSourceInfo | undefined,
    data: {
      errorKind: FORM_MODE_COMPILATION_ERROR_KIND;
      errorMessage: string;
      fallbackToTextMode: boolean;
    },
  ): void {
    service.logEvent(LEGEND_STUDIO_APP_EVENT.FORM_MODE_COMPILATION__FAILURE, {
      sourceInfo,
      ...data,
    });
  }

  static logEvent_TestDataGenerationFailure(
    service: TelemetryService,
    sourceInfo: LegendSourceInfo | undefined,
    errorMessage: string,
  ): void {
    service.logEvent(LEGEND_STUDIO_APP_EVENT.TEST_DATA_GENERATION__FAILURE, {
      sourceInfo,
      errorMessage,
    });
  }

  // Service registration
  static logEvent_ServiceRegistrationLaunched(
    service: TelemetryService,
    sourceInfo: LegendSourceInfo | undefined,
    data: ServiceRegistrationCommonData,
  ): void {
    service.logEvent(LEGEND_STUDIO_APP_EVENT.SERVICE_REGISTRATION_LAUNCH, {
      sourceInfo,
      ...data,
    });
  }

  static logEvent_ServiceRegistrationSucceeded(
    service: TelemetryService,
    sourceInfo: LegendSourceInfo | undefined,
    data: ServiceRegistrationCommonData & { durationMs: number },
  ): void {
    service.logEvent(LEGEND_STUDIO_APP_EVENT.SERVICE_REGISTRATION_SUCCESS, {
      sourceInfo,
      ...data,
    });
  }

  static logEvent_ServiceRegistrationFailure(
    service: TelemetryService,
    sourceInfo: LegendSourceInfo | undefined,
    data: ServiceRegistrationCommonData & { errorMessage: string },
  ): void {
    service.logEvent(LEGEND_STUDIO_APP_EVENT.SERVICE_REGISTRATION_FAILURE, {
      sourceInfo,
      ...data,
    });
  }

  // Service registration precheck (per-env "is this service already deployed?")
  static logEvent_ServiceRegistrationCheckLaunched(
    service: TelemetryService,
    sourceInfo: LegendSourceInfo | undefined,
    data: ServiceRegistrationCheckCommonData,
  ): void {
    service.logEvent(
      LEGEND_STUDIO_APP_EVENT.SERVICE_REGISTRATION_CHECK_LAUNCH,
      { sourceInfo, ...data },
    );
  }

  static logEvent_ServiceRegistrationCheckSucceeded(
    service: TelemetryService,
    sourceInfo: LegendSourceInfo | undefined,
    data: ServiceRegistrationCheckCommonData & {
      durationMs: number;
      registeredEnvCount: number;
      errorCount: number;
    },
  ): void {
    service.logEvent(
      LEGEND_STUDIO_APP_EVENT.SERVICE_REGISTRATION_CHECK_SUCCESS,
      { sourceInfo, ...data },
    );
  }

  static logEvent_ServiceRegistrationCheckFailure(
    service: TelemetryService,
    sourceInfo: LegendSourceInfo | undefined,
    data: { servicePath: string; env: string; errorMessage: string },
  ): void {
    service.logEvent(
      LEGEND_STUDIO_APP_EVENT.SERVICE_REGISTRATION_CHECK_FAILURE,
      { sourceInfo, ...data },
    );
  }

  // Model / artifact / element-schema generation
  static logEvent_GenerationLaunched(
    service: TelemetryService,
    sourceInfo: LegendSourceInfo | undefined,
    data: GenerationCommonData,
  ): void {
    service.logEvent(LEGEND_STUDIO_APP_EVENT.GENERATION_LAUNCH, {
      sourceInfo,
      ...data,
    });
  }

  static logEvent_GenerationSucceeded(
    service: TelemetryService,
    sourceInfo: LegendSourceInfo | undefined,
    data: GenerationCommonData & { durationMs: number },
  ): void {
    service.logEvent(LEGEND_STUDIO_APP_EVENT.GENERATION_SUCCESS, {
      sourceInfo,
      ...data,
    });
  }

  static logEvent_GenerationFailure(
    service: TelemetryService,
    sourceInfo: LegendSourceInfo | undefined,
    data: GenerationCommonData & { errorMessage: string },
  ): void {
    service.logEvent(LEGEND_STUDIO_APP_EVENT.GENERATION_FAILURE, {
      sourceInfo,
      ...data,
    });
  }

  // Editor tab lifecycle
  static logEvent_EditorTabOpened(
    service: TelemetryService,
    sourceInfo: LegendSourceInfo | undefined,
    data: EditorTabCommonData & { trigger: EDITOR_TAB_OPEN_TRIGGER },
  ): void {
    service.logEvent(LEGEND_STUDIO_APP_EVENT.EDITOR_TAB__OPEN, {
      sourceInfo,
      ...data,
    });
  }

  static logEvent_EditorTabClosed(
    service: TelemetryService,
    sourceInfo: LegendSourceInfo | undefined,
    data: EditorTabCommonData & {
      dwellMs: number;
      trigger: EDITOR_TAB_CLOSE_TRIGGER;
    },
  ): void {
    service.logEvent(LEGEND_STUDIO_APP_EVENT.EDITOR_TAB__CLOSE, {
      sourceInfo,
      ...data,
    });
  }

  // showcase manager
  static logEvent_ShowcaseManagerLaunch(
    service: TelemetryService,
    data: ShowcaseMetadata_TelemetryData,
  ): void {
    service.logEvent(LEGEND_STUDIO_APP_EVENT.SHOWCASE_MANAGER_LAUNCH, data);
  }
  static logEvent_ShowcaseManagerShowcaseProjectLaunch(
    service: TelemetryService,
    data: ShowcaseProject_TelemetryData,
  ): void {
    service.logEvent(
      LEGEND_STUDIO_APP_EVENT.SHOWCASE_MANAGER_SHOWCASE_PROJECT_LAUNCH,
      data,
    );
  }
  static logEvent_ShowcaseViewerLaunch(
    service: TelemetryService,
    data: ShowcaseProject_TelemetryData,
  ): void {
    service.logEvent(LEGEND_STUDIO_APP_EVENT.SHOWCASE_VIEWER_LAUNCH, data);
  }

  static logEvent_ShowcaseSearchInitiated(
    service: TelemetryService,
    data: ShowcaseSearchInitiated_TelemetryData,
  ): void {
    service.logEvent(
      LEGEND_STUDIO_APP_EVENT.SHOWCASE_MANAGER_SEARCH__INITIATED,
      data,
    );
  }

  static logEvent_ShowcaseSearchCompleted(
    service: TelemetryService,
    data: ShowcaseSearchCompleted_TelemetryData,
  ): void {
    service.logEvent(
      LEGEND_STUDIO_APP_EVENT.SHOWCASE_MANAGER_SEARCH__COMPLETED,
      data,
    );
  }

  static logEvent_ShowcaseViewerClose(
    service: TelemetryService,
    data: ShowcaseViewerClose_TelemetryData,
  ): void {
    service.logEvent(LEGEND_STUDIO_APP_EVENT.SHOWCASE_VIEWER_CLOSE, data);
  }

  static logEvent_ShowcaseFeedbackSubmit(
    service: TelemetryService,
    data: ShowcaseFeedback_TelemetryData,
  ): void {
    service.logEvent(
      LEGEND_STUDIO_APP_EVENT.SHOWCASE_VIEWER_FEEDBACK__SUBMIT,
      data,
    );
  }

  static logEvent_ShowcaseManagerInitFailure(
    service: TelemetryService,
    data: ShowcaseFailure_TelemetryData,
  ): void {
    service.logEvent(
      LEGEND_STUDIO_APP_EVENT.SHOWCASE_MANAGER_INIT__FAILURE,
      data,
    );
  }

  static logEvent_ShowcaseManagerOpenFailure(
    service: TelemetryService,
    data: ShowcaseFailure_TelemetryData,
  ): void {
    service.logEvent(
      LEGEND_STUDIO_APP_EVENT.SHOWCASE_MANAGER_OPEN__FAILURE,
      data,
    );
  }

  static logEvent_ShowcaseManagerSearchFailure(
    service: TelemetryService,
    data: ShowcaseFailure_TelemetryData,
  ): void {
    service.logEvent(
      LEGEND_STUDIO_APP_EVENT.SHOWCASE_MANAGER_SEARCH__FAILURE,
      data,
    );
  }

  // virtual assistant
  static logEvent_VirtualAssistantPanelOpened(service: TelemetryService): void {
    service.logEvent(APPLICATION_EVENT.VIRTUAL_ASSISTANT_PANEL__OPEN, {});
  }

  static logEvent_VirtualAssistantPanelClosed(service: TelemetryService): void {
    service.logEvent(APPLICATION_EVENT.VIRTUAL_ASSISTANT_PANEL__CLOSE, {});
  }

  static logEvent_VirtualAssistantTabAccessed(
    service: TelemetryService,
    tab: string,
  ): void {
    service.logEvent(APPLICATION_EVENT.VIRTUAL_ASSISTANT_TAB__ACCESS, { tab });
  }

  static logEvent_VirtualAssistantDocumentationSearchInitiated(
    service: TelemetryService,
    searchText: string,
  ): void {
    service.logEvent(
      APPLICATION_EVENT.VIRTUAL_ASSISTANT_DOCUMENTATION_SEARCH__INITIATED,
      { searchText },
    );
  }

  static logEvent_VirtualAssistantContextualInfoPresent(
    service: TelemetryService,
    contextKey: string,
  ): void {
    service.logEvent(
      APPLICATION_EVENT.VIRTUAL_ASSISTANT_CONTEXTUAL_INFO__PRESENT,
      { contextKey },
    );
  }

  static logEvent_VirtualAssistantSearchResultAccessed(
    service: TelemetryService,
    data: VirtualAssistantSearchResultAccessed_TelemetryData,
  ): void {
    service.logEvent(
      APPLICATION_EVENT.VIRTUAL_ASSISTANT_SEARCH_RESULT__ACCESS,
      data,
    );
  }

  // Legend AI
  static logEvent_ServiceLegendAISuggestLaunched(
    telemetryService: TelemetryService,
    servicePath: string,
    sourceInfo?: LegendSourceInfo | undefined,
  ): void {
    telemetryService.logEvent(
      LEGEND_STUDIO_APP_EVENT.SERVICE_LEGENDAI_SUGGEST__LAUNCH,
      { servicePath, sourceInfo },
    );
  }

  static logEvent_ServiceLegendAISuggestApplied(
    telemetryService: TelemetryService,
    servicePath: string,
    sourceInfo?: LegendSourceInfo | undefined,
  ): void {
    telemetryService.logEvent(
      LEGEND_STUDIO_APP_EVENT.SERVICE_LEGENDAI_SUGGEST__APPLY,
      { servicePath, sourceInfo },
    );
  }

  static logEvent_ServiceLegendAISuggestDiscarded(
    telemetryService: TelemetryService,
    servicePath: string,
    sourceInfo?: LegendSourceInfo | undefined,
  ): void {
    telemetryService.logEvent(
      LEGEND_STUDIO_APP_EVENT.SERVICE_LEGENDAI_SUGGEST__DISCARD,
      { servicePath, sourceInfo },
    );
  }

  static logEvent_ServiceLegendAISuggestFailure(
    telemetryService: TelemetryService,
    servicePath: string,
    errorMessage: string,
    sourceInfo?: LegendSourceInfo | undefined,
  ): void {
    telemetryService.logEvent(
      LEGEND_STUDIO_APP_EVENT.SERVICE_LEGENDAI_SUGGEST__FAILURE,
      { servicePath, errorMessage, sourceInfo },
    );
  }

  // DataSpace Legend AI
  static logEvent_DataSpaceLegendAISuggestLaunched(
    telemetryService: TelemetryService,
    dataSpacePath: string,
    sourceInfo?: LegendSourceInfo | undefined,
  ): void {
    telemetryService.logEvent(
      LEGEND_STUDIO_APP_EVENT.DATASPACE_LEGENDAI_SUGGEST__LAUNCH,
      { dataSpacePath, sourceInfo },
    );
  }

  static logEvent_DataSpaceLegendAISuggestApplied(
    telemetryService: TelemetryService,
    dataSpacePath: string,
    sourceInfo?: LegendSourceInfo | undefined,
  ): void {
    telemetryService.logEvent(
      LEGEND_STUDIO_APP_EVENT.DATASPACE_LEGENDAI_SUGGEST__APPLY,
      { dataSpacePath, sourceInfo },
    );
  }

  static logEvent_DataSpaceLegendAISuggestDiscarded(
    telemetryService: TelemetryService,
    dataSpacePath: string,
    sourceInfo?: LegendSourceInfo | undefined,
  ): void {
    telemetryService.logEvent(
      LEGEND_STUDIO_APP_EVENT.DATASPACE_LEGENDAI_SUGGEST__DISCARD,
      { dataSpacePath, sourceInfo },
    );
  }

  static logEvent_DataSpaceLegendAISuggestFailure(
    telemetryService: TelemetryService,
    dataSpacePath: string,
    errorMessage: string,
    sourceInfo?: LegendSourceInfo | undefined,
  ): void {
    telemetryService.logEvent(
      LEGEND_STUDIO_APP_EVENT.DATASPACE_LEGENDAI_SUGGEST__FAILURE,
      { dataSpacePath, errorMessage, sourceInfo },
    );
  }

  static logEvent_DataProductLegendAISuggestLaunched(
    telemetryService: TelemetryService,
    dataProductPath: string,
    sourceInfo?: LegendSourceInfo | undefined,
  ): void {
    telemetryService.logEvent(
      LEGEND_STUDIO_APP_EVENT.DATA_PRODUCT_LEGENDAI_SUGGEST__LAUNCH,
      { dataProductPath, sourceInfo },
    );
  }

  static logEvent_DataProductLegendAISuggestApplied(
    telemetryService: TelemetryService,
    dataProductPath: string,
    sourceInfo?: LegendSourceInfo | undefined,
  ): void {
    telemetryService.logEvent(
      LEGEND_STUDIO_APP_EVENT.DATA_PRODUCT_LEGENDAI_SUGGEST__APPLY,
      { dataProductPath, sourceInfo },
    );
  }

  static logEvent_DataProductLegendAISuggestDiscarded(
    telemetryService: TelemetryService,
    dataProductPath: string,
    sourceInfo?: LegendSourceInfo | undefined,
  ): void {
    telemetryService.logEvent(
      LEGEND_STUDIO_APP_EVENT.DATA_PRODUCT_LEGENDAI_SUGGEST__DISCARD,
      { dataProductPath, sourceInfo },
    );
  }

  static logEvent_DataProductLegendAISuggestFailure(
    telemetryService: TelemetryService,
    dataProductPath: string,
    errorMessage: string,
    sourceInfo?: LegendSourceInfo | undefined,
  ): void {
    telemetryService.logEvent(
      LEGEND_STUDIO_APP_EVENT.DATA_PRODUCT_LEGENDAI_SUGGEST__FAILURE,
      { dataProductPath, errorMessage, sourceInfo },
    );
  }

  // Push to Dev Metadata
  static logEvent_DevMetadataPushLaunched(
    service: TelemetryService,
    sourceInfo: LegendSourceInfo | undefined,
    groupId: string,
    artifactId: string,
    versionId: string | undefined,
    lakehouseElementCounts: {
      ingestCount: number;
      dataProductCount: number;
    },
  ): void {
    service.logEvent(
      LEGEND_STUDIO_APP_EVENT.METADATA_PUSH_TO_METADATA__LAUNCH,
      {
        sourceInfo,
        groupId,
        artifactId,
        versionId,
        ...lakehouseElementCounts,
      },
    );
  }

  static logEvent_DevMetadataPushSucceeded(
    service: TelemetryService,
    sourceInfo: LegendSourceInfo | undefined,
    groupId: string,
    artifactId: string,
    versionId: string | undefined,
    status: string,
    lakehouseElementCounts: {
      ingestCount: number;
      dataProductCount: number;
    },
  ): void {
    service.logEvent(
      LEGEND_STUDIO_APP_EVENT.METADATA_PUSH_TO_METADATA__SUCCESS,
      {
        sourceInfo,
        groupId,
        artifactId,
        versionId,
        status,
        ...lakehouseElementCounts,
      },
    );
  }

  static logEvent_DevMetadataPushFailure(
    service: TelemetryService,
    sourceInfo: LegendSourceInfo | undefined,
    errorMessage: string,
  ): void {
    service.logEvent(
      LEGEND_STUDIO_APP_EVENT.METADATA_PUSH_TO_METADATA__FAILURE,
      {
        sourceInfo,
        errorMessage,
      },
    );
  }

  // Text mode session
  static logEvent_TextModeEntered(
    service: TelemetryService,
    sourceInfo: LegendSourceInfo | undefined,
    data: {
      trigger: TEXT_MODE_ENTER_TRIGGER;
      strict: boolean;
      elementPath?: string | undefined;
    },
  ): void {
    service.logEvent(LEGEND_STUDIO_APP_EVENT.TEXT_MODE__ENTER, {
      sourceInfo,
      ...data,
    });
  }

  static logEvent_TextModeLeft(
    service: TelemetryService,
    sourceInfo: LegendSourceInfo | undefined,
    data: {
      outcome: TEXT_MODE_LEAVE_OUTCOME;
      durationMs: number;
      editCount: number;
      compilationCount: number;
    },
  ): void {
    service.logEvent(LEGEND_STUDIO_APP_EVENT.TEXT_MODE__LEAVE, {
      sourceInfo,
      ...data,
    });
  }

  static logEvent_TextModeFirstEdit(
    service: TelemetryService,
    sourceInfo: LegendSourceInfo | undefined,
    timeToFirstEditMs: number,
  ): void {
    service.logEvent(LEGEND_STUDIO_APP_EVENT.TEXT_MODE__FIRST_EDIT, {
      sourceInfo,
      timeToFirstEditMs,
    });
  }

  // Push local changes (workspace save/commit)
  static logEvent_PushLocalChangesLaunched(
    service: TelemetryService,
    sourceInfo: LegendSourceInfo | undefined,
    data: { mode: GRAPH_EDITOR_MODE_LABEL; changeCount: number },
  ): void {
    service.logEvent(LEGEND_STUDIO_APP_EVENT.PUSH_LOCAL_CHANGES__LAUNCH, {
      sourceInfo,
      ...data,
    });
  }

  static logEvent_PushLocalChangesSucceeded(
    service: TelemetryService,
    sourceInfo: LegendSourceInfo | undefined,
    data: {
      mode: GRAPH_EDITOR_MODE_LABEL;
      changeCount: number;
      durationMs: number;
      revisionId: string | undefined;
    },
  ): void {
    service.logEvent(LEGEND_STUDIO_APP_EVENT.PUSH_LOCAL_CHANGES__SUCCESS, {
      sourceInfo,
      ...data,
    });
  }

  static logEvent_PushLocalChangesFailure(
    service: TelemetryService,
    sourceInfo: LegendSourceInfo | undefined,
    data: {
      mode: GRAPH_EDITOR_MODE_LABEL;
      changeCount: number;
      errorMessage: string;
    },
  ): void {
    service.logEvent(LEGEND_STUDIO_APP_EVENT.PUSH_LOCAL_CHANGES__FAILURE, {
      sourceInfo,
      ...data,
    });
  }

  // Workspace update (pull)
  static logEvent_WorkspaceUpdateLaunched(
    service: TelemetryService,
    sourceInfo: LegendSourceInfo | undefined,
  ): void {
    service.logEvent(LEGEND_STUDIO_APP_EVENT.UPDATE_WORKSPACE__LAUNCH, {
      sourceInfo,
    });
  }

  static logEvent_WorkspaceUpdateSucceeded(
    service: TelemetryService,
    sourceInfo: LegendSourceInfo | undefined,
    data: { status: string; durationMs: number },
  ): void {
    service.logEvent(LEGEND_STUDIO_APP_EVENT.UPDATE_WORKSPACE__SUCCESS, {
      sourceInfo,
      ...data,
    });
  }

  static logEvent_WorkspaceUpdateFailure(
    service: TelemetryService,
    sourceInfo: LegendSourceInfo | undefined,
    errorMessage: string,
  ): void {
    service.logEvent(LEGEND_STUDIO_APP_EVENT.UPDATE_WORKSPACE__FAILURE, {
      sourceInfo,
      errorMessage,
    });
  }

  // Text mode - Phase 2
  static logEvent_TextModeCompilationFailure(
    service: TelemetryService,
    sourceInfo: LegendSourceInfo | undefined,
    data: {
      errorKind: TEXT_MODE_COMPILATION_ERROR_KIND;
      errorMessage: string;
    },
  ): void {
    service.logEvent(LEGEND_STUDIO_APP_EVENT.TEXT_MODE_COMPILATION__FAILURE, {
      sourceInfo,
      ...data,
    });
  }

  static logEvent_TextModeStrictLaunch(
    service: TelemetryService,
    sourceInfo: LegendSourceInfo | undefined,
  ): void {
    service.logEvent(LEGEND_STUDIO_APP_EVENT.TEXT_MODE__STRICT_LAUNCH, {
      sourceInfo,
    });
  }

  static logEvent_TextModeToggleShortcutInvoked(
    service: TelemetryService,
    sourceInfo: LegendSourceInfo | undefined,
    data: {
      source: TEXT_MODE_TOGGLE_SOURCE;
      direction: TEXT_MODE_TOGGLE_DIRECTION;
    },
  ): void {
    service.logEvent(
      LEGEND_STUDIO_APP_EVENT.TEXT_MODE__TOGGLE_SHORTCUT_INVOKED,
      { sourceInfo, ...data },
    );
  }

  static logEvent_TextModeAction(
    service: TelemetryService,
    sourceInfo: LegendSourceInfo | undefined,
    data: {
      action: TEXT_MODE_ACTION;
      status: TEXT_MODE_ACTION_STATUS;
      errorMessage?: string | undefined;
    },
  ): void {
    service.logEvent(LEGEND_STUDIO_APP_EVENT.TEXT_MODE__ACTION, {
      sourceInfo,
      ...data,
    });
  }

  // Push local changes - Phase 2
  static logEvent_PushLocalChangesEmpty(
    service: TelemetryService,
    sourceInfo: LegendSourceInfo | undefined,
    data: { mode: GRAPH_EDITOR_MODE_LABEL },
  ): void {
    service.logEvent(LEGEND_STUDIO_APP_EVENT.PUSH_LOCAL_CHANGES__EMPTY, {
      sourceInfo,
      ...data,
    });
  }

  // Workflow manager
  static logEvent_WorkflowManagerPanelOpened(
    service: TelemetryService,
    sourceInfo: LegendSourceInfo | undefined,
    data: { scope: WORKFLOW_MANAGER_SCOPE },
  ): void {
    service.logEvent(LEGEND_STUDIO_APP_EVENT.WORKFLOW_MANAGER_PANEL__OPEN, {
      sourceInfo,
      ...data,
    });
  }

  static logEvent_WorkflowManagerPanelClosed(
    service: TelemetryService,
    sourceInfo: LegendSourceInfo | undefined,
    data: { scope: WORKFLOW_MANAGER_SCOPE; dwellMs: number },
  ): void {
    service.logEvent(LEGEND_STUDIO_APP_EVENT.WORKFLOW_MANAGER_PANEL__CLOSE, {
      sourceInfo,
      ...data,
    });
  }

  static logEvent_WorkflowManagerFetchWorkflowsLaunched(
    service: TelemetryService,
    sourceInfo: LegendSourceInfo | undefined,
    data: { scope: WORKFLOW_MANAGER_SCOPE },
  ): void {
    service.logEvent(
      LEGEND_STUDIO_APP_EVENT.WORKFLOW_MANAGER_FETCH_WORKFLOWS__LAUNCH,
      { sourceInfo, ...data },
    );
  }

  static logEvent_WorkflowManagerFetchWorkflowsSucceeded(
    service: TelemetryService,
    sourceInfo: LegendSourceInfo | undefined,
    data: {
      scope: WORKFLOW_MANAGER_SCOPE;
      durationMs: number;
      workflowCount: number;
      statusBreakdown: WorkflowManagerStatusBreakdown;
    },
  ): void {
    service.logEvent(
      LEGEND_STUDIO_APP_EVENT.WORKFLOW_MANAGER_FETCH_WORKFLOWS__SUCCESS,
      { sourceInfo, ...data },
    );
  }

  static logEvent_WorkflowManagerFetchWorkflowsFailure(
    service: TelemetryService,
    sourceInfo: LegendSourceInfo | undefined,
    data: { scope: WORKFLOW_MANAGER_SCOPE; errorMessage: string },
  ): void {
    service.logEvent(
      LEGEND_STUDIO_APP_EVENT.WORKFLOW_MANAGER_FETCH_WORKFLOWS__FAILURE,
      { sourceInfo, ...data },
    );
  }

  static logEvent_WorkflowManagerWorkflowExpand(
    service: TelemetryService,
    sourceInfo: LegendSourceInfo | undefined,
    data: { scope: WORKFLOW_MANAGER_SCOPE; workflowStatus: string },
  ): void {
    service.logEvent(
      LEGEND_STUDIO_APP_EVENT.WORKFLOW_MANAGER_WORKFLOW__EXPAND,
      { sourceInfo, ...data },
    );
  }

  static logEvent_WorkflowManagerWorkflowRefresh(
    service: TelemetryService,
    sourceInfo: LegendSourceInfo | undefined,
    data: { scope: WORKFLOW_MANAGER_SCOPE; workflowStatus: string },
  ): void {
    service.logEvent(
      LEGEND_STUDIO_APP_EVENT.WORKFLOW_MANAGER_WORKFLOW__REFRESH,
      { sourceInfo, ...data },
    );
  }

  static logEvent_WorkflowManagerFetchJobsLaunched(
    service: TelemetryService,
    sourceInfo: LegendSourceInfo | undefined,
    data: { scope: WORKFLOW_MANAGER_SCOPE },
  ): void {
    service.logEvent(
      LEGEND_STUDIO_APP_EVENT.WORKFLOW_MANAGER_FETCH_JOBS__LAUNCH,
      { sourceInfo, ...data },
    );
  }

  static logEvent_WorkflowManagerFetchJobsSucceeded(
    service: TelemetryService,
    sourceInfo: LegendSourceInfo | undefined,
    data: {
      scope: WORKFLOW_MANAGER_SCOPE;
      durationMs: number;
      jobCount: number;
      statusBreakdown: WorkflowManagerStatusBreakdown;
    },
  ): void {
    service.logEvent(
      LEGEND_STUDIO_APP_EVENT.WORKFLOW_MANAGER_FETCH_JOBS__SUCCESS,
      { sourceInfo, ...data },
    );
  }

  static logEvent_WorkflowManagerFetchJobsFailure(
    service: TelemetryService,
    sourceInfo: LegendSourceInfo | undefined,
    data: { scope: WORKFLOW_MANAGER_SCOPE; errorMessage: string },
  ): void {
    service.logEvent(
      LEGEND_STUDIO_APP_EVENT.WORKFLOW_MANAGER_FETCH_JOBS__FAILURE,
      { sourceInfo, ...data },
    );
  }

  static logEvent_WorkflowManagerJobActionLaunched(
    service: TelemetryService,
    sourceInfo: LegendSourceInfo | undefined,
    data: {
      scope: WORKFLOW_MANAGER_SCOPE;
      action: WORKFLOW_MANAGER_JOB_ACTION;
      jobName: string;
      jobStatus: string;
    },
  ): void {
    service.logEvent(
      LEGEND_STUDIO_APP_EVENT.WORKFLOW_MANAGER_JOB_ACTION__LAUNCH,
      { sourceInfo, ...data },
    );
  }

  static logEvent_WorkflowManagerJobActionSucceeded(
    service: TelemetryService,
    sourceInfo: LegendSourceInfo | undefined,
    data: {
      scope: WORKFLOW_MANAGER_SCOPE;
      action: WORKFLOW_MANAGER_JOB_ACTION;
      jobName: string;
      durationMs: number;
    },
  ): void {
    service.logEvent(
      LEGEND_STUDIO_APP_EVENT.WORKFLOW_MANAGER_JOB_ACTION__SUCCESS,
      { sourceInfo, ...data },
    );
  }

  static logEvent_WorkflowManagerJobActionFailure(
    service: TelemetryService,
    sourceInfo: LegendSourceInfo | undefined,
    data: {
      scope: WORKFLOW_MANAGER_SCOPE;
      action: WORKFLOW_MANAGER_JOB_ACTION;
      jobName: string;
      errorMessage: string;
    },
  ): void {
    service.logEvent(
      LEGEND_STUDIO_APP_EVENT.WORKFLOW_MANAGER_JOB_ACTION__FAILURE,
      { sourceInfo, ...data },
    );
  }

  static logEvent_WorkflowManagerJobLogsOpened(
    service: TelemetryService,
    sourceInfo: LegendSourceInfo | undefined,
    data: {
      scope: WORKFLOW_MANAGER_SCOPE;
      jobName: string;
      jobStatus: string;
    },
  ): void {
    service.logEvent(LEGEND_STUDIO_APP_EVENT.WORKFLOW_MANAGER_JOB_LOGS__OPEN, {
      sourceInfo,
      ...data,
    });
  }

  static logEvent_WorkflowManagerJobLogsClosed(
    service: TelemetryService,
    sourceInfo: LegendSourceInfo | undefined,
    data: {
      scope: WORKFLOW_MANAGER_SCOPE;
      jobName: string;
      dwellMs: number;
      refreshCount: number;
    },
  ): void {
    service.logEvent(LEGEND_STUDIO_APP_EVENT.WORKFLOW_MANAGER_JOB_LOGS__CLOSE, {
      sourceInfo,
      ...data,
    });
  }

  static logEvent_WorkflowManagerJobLogsRefresh(
    service: TelemetryService,
    sourceInfo: LegendSourceInfo | undefined,
    data: { scope: WORKFLOW_MANAGER_SCOPE; jobName: string },
  ): void {
    service.logEvent(
      LEGEND_STUDIO_APP_EVENT.WORKFLOW_MANAGER_JOB_LOGS__REFRESH,
      { sourceInfo, ...data },
    );
  }

  static logEvent_WorkflowManagerJobLogsFetchSucceeded(
    service: TelemetryService,
    sourceInfo: LegendSourceInfo | undefined,
    data: {
      scope: WORKFLOW_MANAGER_SCOPE;
      jobName: string;
      durationMs: number;
      logSizeBytes: number;
    },
  ): void {
    service.logEvent(
      LEGEND_STUDIO_APP_EVENT.WORKFLOW_MANAGER_JOB_LOGS_FETCH__SUCCESS,
      { sourceInfo, ...data },
    );
  }

  static logEvent_WorkflowManagerJobLogsFetchFailure(
    service: TelemetryService,
    sourceInfo: LegendSourceInfo | undefined,
    data: {
      scope: WORKFLOW_MANAGER_SCOPE;
      jobName: string;
      errorMessage: string;
    },
  ): void {
    service.logEvent(
      LEGEND_STUDIO_APP_EVENT.WORKFLOW_MANAGER_JOB_LOGS_FETCH__FAILURE,
      { sourceInfo, ...data },
    );
  }

  // Service test suite run
  static logEvent_ServiceTestSuiteRunLaunched(
    service: TelemetryService,
    sourceInfo: LegendSourceInfo | undefined,
    data: ServiceTestSuiteRunCommonData,
  ): void {
    service.logEvent(LEGEND_STUDIO_APP_EVENT.SERVICE_TEST_SUITE_RUN__LAUNCH, {
      sourceInfo,
      ...data,
    });
  }

  static logEvent_ServiceTestSuiteRunSucceeded(
    service: TelemetryService,
    sourceInfo: LegendSourceInfo | undefined,
    data: ServiceTestSuiteRunCommonData & {
      durationMs: number;
      passedCount: number;
      failedCount: number;
      erroredCount: number;
    },
  ): void {
    service.logEvent(LEGEND_STUDIO_APP_EVENT.SERVICE_TEST_SUITE_RUN__SUCCESS, {
      sourceInfo,
      ...data,
    });
  }

  static logEvent_ServiceTestSuiteRunFailure(
    service: TelemetryService,
    sourceInfo: LegendSourceInfo | undefined,
    data: ServiceTestSuiteRunCommonData & { errorMessage: string },
  ): void {
    service.logEvent(LEGEND_STUDIO_APP_EVENT.SERVICE_TEST_SUITE_RUN__FAILURE, {
      sourceInfo,
      ...data,
    });
  }

  // Unified testable run (mapping / data product / ingest / function activator / availability)
  static logEvent_TestableRunLaunched(
    service: TelemetryService,
    sourceInfo: LegendSourceInfo | undefined,
    data: TestableRunCommonData,
  ): void {
    service.logEvent(LEGEND_STUDIO_APP_EVENT.TESTABLE_RUN__LAUNCH, {
      sourceInfo,
      ...data,
    });
  }

  static logEvent_TestableRunSucceeded(
    service: TelemetryService,
    sourceInfo: LegendSourceInfo | undefined,
    data: TestableRunCommonData & {
      durationMs: number;
      passedCount: number;
      failedCount: number;
      erroredCount: number;
    },
  ): void {
    service.logEvent(LEGEND_STUDIO_APP_EVENT.TESTABLE_RUN__SUCCESS, {
      sourceInfo,
      ...data,
    });
  }

  static logEvent_TestableRunFailure(
    service: TelemetryService,
    sourceInfo: LegendSourceInfo | undefined,
    data: TestableRunCommonData & { errorMessage: string },
  ): void {
    service.logEvent(LEGEND_STUDIO_APP_EVENT.TESTABLE_RUN__FAILURE, {
      sourceInfo,
      ...data,
    });
  }

  // Global test runner (sidebar) — cross-testable runs
  static logEvent_GlobalTestRunLaunched(
    service: TelemetryService,
    sourceInfo: LegendSourceInfo | undefined,
    data: GlobalTestRunCommonData,
  ): void {
    service.logEvent(LEGEND_STUDIO_APP_EVENT.GLOBAL_TEST_RUN__LAUNCH, {
      sourceInfo,
      ...data,
    });
  }

  static logEvent_GlobalTestRunSucceeded(
    service: TelemetryService,
    sourceInfo: LegendSourceInfo | undefined,
    data: GlobalTestRunCommonData & {
      durationMs: number;
      passedCount: number;
      failedCount: number;
      erroredCount: number;
    },
  ): void {
    service.logEvent(LEGEND_STUDIO_APP_EVENT.GLOBAL_TEST_RUN__SUCCESS, {
      sourceInfo,
      ...data,
    });
  }

  static logEvent_GlobalTestRunFailure(
    service: TelemetryService,
    sourceInfo: LegendSourceInfo | undefined,
    data: GlobalTestRunCommonData & { errorMessage: string },
  ): void {
    service.logEvent(LEGEND_STUDIO_APP_EVENT.GLOBAL_TEST_RUN__FAILURE, {
      sourceInfo,
      ...data,
    });
  }

  // SDLC review lifecycle
  //
  // Structured replacement for the SDLC_MANAGER_FAILURE bucket around review
  // actions (create / commit / close / reopen / approve). Fires from both the
  // author side (WorkspaceReviewState — carries sourceInfo from the workspace
  // editor) and the reviewer side (ProjectReviewerStore — no editor mode, so
  // sourceInfo is undefined; projectId / patchReleaseVersionId? / reviewId
  // are carried explicitly on the payload).
  //
  // Non-lifecycle SDLC calls in the same files (fetches, refresh, workspace
  // recreation after commit) stay on the generic SDLC_MANAGER_FAILURE bucket.
  static logEvent_SdlcReviewActionLaunched(
    service: TelemetryService,
    sourceInfo: LegendSourceInfo | undefined,
    data: SdlcReviewActionLaunchData,
  ): void {
    service.logEvent(LEGEND_STUDIO_APP_EVENT.SDLC_REVIEW_ACTION__LAUNCH, {
      sourceInfo,
      ...data,
    });
  }

  static logEvent_SdlcReviewActionSucceeded(
    service: TelemetryService,
    sourceInfo: LegendSourceInfo | undefined,
    data: SdlcReviewActionSuccessData,
  ): void {
    service.logEvent(LEGEND_STUDIO_APP_EVENT.SDLC_REVIEW_ACTION__SUCCESS, {
      sourceInfo,
      ...data,
    });
  }

  static logEvent_SdlcReviewActionFailure(
    service: TelemetryService,
    sourceInfo: LegendSourceInfo | undefined,
    data: SdlcReviewActionFailureData,
  ): void {
    service.logEvent(LEGEND_STUDIO_APP_EVENT.SDLC_REVIEW_ACTION__FAILURE, {
      sourceInfo,
      ...data,
    });
  }

  // Workspace setup screen actions
  //
  // Structured replacement for the WORKSPACE_SETUP_FAILURE bucket plus the
  // create-project / import-project flows that previously emitted no
  // telemetry at all. Fires from the setup / project picker route, before
  // any editor mode is active — so `sourceInfo` is always undefined.
  static logEvent_SetupActionLaunched(
    service: TelemetryService,
    data: SetupActionLaunchData,
  ): void {
    service.logEvent(LEGEND_STUDIO_APP_EVENT.SETUP_ACTION__LAUNCH, {
      sourceInfo: undefined,
      ...data,
    });
  }

  static logEvent_SetupActionSucceeded(
    service: TelemetryService,
    data: SetupActionSuccessData,
  ): void {
    service.logEvent(LEGEND_STUDIO_APP_EVENT.SETUP_ACTION__SUCCESS, {
      sourceInfo: undefined,
      ...data,
    });
  }

  static logEvent_SetupActionFailure(
    service: TelemetryService,
    data: SetupActionFailureData,
  ): void {
    service.logEvent(LEGEND_STUDIO_APP_EVENT.SETUP_ACTION__FAILURE, {
      sourceInfo: undefined,
      ...data,
    });
  }

  // Project configuration update lifecycle
  //
  // Structured replacement for the SDLC_MANAGER_FAILURE bucket around the
  // project configuration editor's writes (dependency add/remove, platform
  // configuration, structure version bump, project type toggle). All three
  // top-level flows funnel through `updateProjectConfiguration`, which is
  // the single point where these events are emitted; the `action` field
  // records which entry point the user came from.
  static logEvent_ProjectConfigUpdateLaunched(
    service: TelemetryService,
    sourceInfo: LegendSourceInfo | undefined,
    data: ProjectConfigUpdateLaunchData,
  ): void {
    service.logEvent(LEGEND_STUDIO_APP_EVENT.PROJECT_CONFIG_UPDATE__LAUNCH, {
      sourceInfo,
      ...data,
    });
  }

  static logEvent_ProjectConfigUpdateSucceeded(
    service: TelemetryService,
    sourceInfo: LegendSourceInfo | undefined,
    data: ProjectConfigUpdateSuccessData,
  ): void {
    service.logEvent(LEGEND_STUDIO_APP_EVENT.PROJECT_CONFIG_UPDATE__SUCCESS, {
      sourceInfo,
      ...data,
    });
  }

  static logEvent_ProjectConfigUpdateFailure(
    service: TelemetryService,
    sourceInfo: LegendSourceInfo | undefined,
    data: ProjectConfigUpdateFailureData,
  ): void {
    service.logEvent(LEGEND_STUDIO_APP_EVENT.PROJECT_CONFIG_UPDATE__FAILURE, {
      sourceInfo,
      ...data,
    });
  }

  // Project overview sidebar SDLC writes
  //
  // Structured replacement for the SDLC_MANAGER_FAILURE bucket around
  // ProjectOverviewState's user-triggered writes (delete workspace, update
  // project metadata, create version, release patch, create patch). Fires
  // from inside the workspace editor so `sourceInfo` is populated; the
  // payload also carries `projectId` explicitly so events remain sliceable
  // without unpacking `sourceInfo`.
  static logEvent_ProjectOverviewActionLaunched(
    service: TelemetryService,
    sourceInfo: LegendSourceInfo | undefined,
    data: ProjectOverviewActionLaunchData,
  ): void {
    service.logEvent(LEGEND_STUDIO_APP_EVENT.PROJECT_OVERVIEW_ACTION__LAUNCH, {
      sourceInfo,
      ...data,
    });
  }

  static logEvent_ProjectOverviewActionSucceeded(
    service: TelemetryService,
    sourceInfo: LegendSourceInfo | undefined,
    data: ProjectOverviewActionSuccessData,
  ): void {
    service.logEvent(LEGEND_STUDIO_APP_EVENT.PROJECT_OVERVIEW_ACTION__SUCCESS, {
      sourceInfo,
      ...data,
    });
  }

  static logEvent_ProjectOverviewActionFailure(
    service: TelemetryService,
    sourceInfo: LegendSourceInfo | undefined,
    data: ProjectOverviewActionFailureData,
  ): void {
    service.logEvent(LEGEND_STUDIO_APP_EVENT.PROJECT_OVERVIEW_ACTION__FAILURE, {
      sourceInfo,
      ...data,
    });
  }

  // Ad-hoc workspace creation from the editor bootstrap
  //
  // Fires when a user deep-links to a workspace that doesn't exist and
  // picks "Create workspace" from the recovery prompt in EditorStore.
  // Distinct bucket from SETUP_ACTION.CREATE_WORKSPACE because the
  // callsite, error-handling, and legacy log bucket
  // (WORKSPACE_SETUP_FAILURE) are different. `sourceInfo` is omitted —
  // no editor mode is active yet.
  static logEvent_SdlcWorkspaceCreateLaunched(
    service: TelemetryService,
    data: SdlcWorkspaceCreateLaunchData,
  ): void {
    service.logEvent(LEGEND_STUDIO_APP_EVENT.SDLC_WORKSPACE_CREATE__LAUNCH, {
      sourceInfo: undefined,
      ...data,
    });
  }

  static logEvent_SdlcWorkspaceCreateSucceeded(
    service: TelemetryService,
    data: SdlcWorkspaceCreateSuccessData,
  ): void {
    service.logEvent(LEGEND_STUDIO_APP_EVENT.SDLC_WORKSPACE_CREATE__SUCCESS, {
      sourceInfo: undefined,
      ...data,
    });
  }

  static logEvent_SdlcWorkspaceCreateFailure(
    service: TelemetryService,
    data: SdlcWorkspaceCreateFailureData,
  ): void {
    service.logEvent(LEGEND_STUDIO_APP_EVENT.SDLC_WORKSPACE_CREATE__FAILURE, {
      sourceInfo: undefined,
      ...data,
    });
  }
}
