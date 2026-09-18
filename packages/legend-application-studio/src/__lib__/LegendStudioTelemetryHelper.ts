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
  GRAPH_MANAGER_EVENT,
  type GraphInitializationReport,
  type GraphManagerOperationReport,
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

export type ShowcaseMetadata_TelemetryData = {
  showcasesTotalCount: number;
  showcasesDevelopmentCount: number;
};

export type ShowcaseProject_TelemetryData = {
  showcasePath: string;
};

export type IngestDefinitionDeployment_TelemetryData = {
  sourceInfo: LegendSourceInfo | undefined;
  ingestUrn: string;
  ingestDefinitionPath: string;
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

  // Lakehouse
  static logEvent_LakehouseDeployIngest(
    service: TelemetryService,
    sourceInfo: LegendSourceInfo | undefined,
    ingestUrn: string,
    ingestDefinitionPath: string,
  ): void {
    const eventData: IngestDefinitionDeployment_TelemetryData = {
      sourceInfo,
      ingestUrn,
      ingestDefinitionPath,
    };
    service.logEvent(
      LEGEND_STUDIO_APP_EVENT.INGESTION_DEPLOY_SUCCESS_URN,
      eventData,
    );
  }

  static logEvent_LakehouseDeployIngestFailure(
    service: TelemetryService,
    sourceInfo: LegendSourceInfo | undefined,
    ingestDefinitionPath: string,
    errorMessage: string,
  ): void {
    const eventData = {
      sourceInfo,
      ingestDefinitionPath,
      errorMessage,
    };
    service.logEvent(
      LEGEND_STUDIO_APP_EVENT.INGESTION_DEPLOY_FAILURE,
      eventData,
    );
  }

  static logEvent_LakehouseDeployDataProduct(
    service: TelemetryService,
    sourceInfo: LegendSourceInfo | undefined,
    dataProductPath: string,
  ): void {
    const eventData = {
      sourceInfo,
      dataProductPath,
    };
    service.logEvent(
      LEGEND_STUDIO_APP_EVENT.DATA_PRODUCT_DEPLOY_SUCCESS,
      eventData,
    );
  }

  static logEvent_LakehouseDeployDataProductFailure(
    service: TelemetryService,
    sourceInfo: LegendSourceInfo | undefined,
    dataProductPath: string,
    errorMessage: string,
  ): void {
    const eventData = {
      sourceInfo,
      dataProductPath,
      errorMessage,
    };
    service.logEvent(
      LEGEND_STUDIO_APP_EVENT.DATA_PRODUCT_DEPLOY_FAILURE,
      eventData,
    );
  }

  // Push to Dev Metadata
  static logEvent_DevMetadataPushLaunched(
    service: TelemetryService,
    sourceInfo: LegendSourceInfo | undefined,
    groupId: string,
    artifactId: string,
    versionId: string | undefined,
  ): void {
    service.logEvent(
      LEGEND_STUDIO_APP_EVENT.METADATA_PUSH_TO_METADATA__LAUNCH,
      {
        sourceInfo,
        groupId,
        artifactId,
        versionId,
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
  ): void {
    service.logEvent(
      LEGEND_STUDIO_APP_EVENT.METADATA_PUSH_TO_METADATA__SUCCESS,
      {
        sourceInfo,
        groupId,
        artifactId,
        versionId,
        status,
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
}
