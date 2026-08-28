/**
 * Copyright (c) 2026-present, Goldman Sachs
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

import { useState, useEffect, useMemo, useCallback } from 'react';
import { observer } from 'mobx-react-lite';
import { type QueryExplicitExecutionContextInfo } from '@finos/legend-graph';
import {
  LegendAIChat,
  LegendAIErrorBoundary,
  findLegendAIPlugin,
  LegendAIChatTelemetryEventType,
  bridgeLegendAIServices,
  useLegendAIChatTelemetryLogger,
  LegendAIMessageFeedbackRating,
  type TDSServiceSchema,
  type LegendAIConfig,
  type LegendAIOrchestratorDataProductCoordinates,
  type LegendAIModelContext,
  type LegendAIMessageFeedback,
} from '@finos/legend-lego/legend-ai';
import { LogEvent } from '@finos/legend-shared';
import type { DataSpaceViewerState } from '../stores/DataSpaceViewerState.js';
import { DSL_DATASPACE_EVENT } from '../__lib__/DSL_DataSpace_Event.js';
import {
  buildDataSpaceModelContext,
  extractTDSServicesFromDataSpace,
  extractMetadataFromDataSpace,
} from './DataSpaceLegendAISchema.js';

const DATA_SPACE_TELEMETRY_EVENT_KEYS: Record<
  LegendAIChatTelemetryEventType,
  string
> = {
  [LegendAIChatTelemetryEventType.QUESTION_ASKED]:
    DSL_DATASPACE_EVENT.LEGEND_AI_QUESTION_ASKED,
  [LegendAIChatTelemetryEventType.RESPONSE_RECEIVED]:
    DSL_DATASPACE_EVENT.LEGEND_AI_RESPONSE_RECEIVED,
  [LegendAIChatTelemetryEventType.ASSISTANT_CLOSED]:
    DSL_DATASPACE_EVENT.LEGEND_AI_ASSISTANT_CLOSED,
  [LegendAIChatTelemetryEventType.SUGGESTED_QUERY_CLICKED]:
    DSL_DATASPACE_EVENT.LEGEND_AI_SUGGESTED_QUERY_CLICKED,
  [LegendAIChatTelemetryEventType.SCOPE_CHANGED]:
    DSL_DATASPACE_EVENT.LEGEND_AI_SCOPE_CHANGED,
  [LegendAIChatTelemetryEventType.MODEL_CHANGED]:
    DSL_DATASPACE_EVENT.LEGEND_AI_MODEL_CHANGED,
  [LegendAIChatTelemetryEventType.SQL_DETAILS_TOGGLED]:
    DSL_DATASPACE_EVENT.LEGEND_AI_SQL_DETAILS_TOGGLED,
  [LegendAIChatTelemetryEventType.ARTIFACT_COPIED]:
    DSL_DATASPACE_EVENT.LEGEND_AI_ARTIFACT_COPIED,
  [LegendAIChatTelemetryEventType.PYTHON_CODE_REQUESTED]:
    DSL_DATASPACE_EVENT.LEGEND_AI_PYTHON_CODE_REQUESTED,
  [LegendAIChatTelemetryEventType.PYTHON_CODE_TOGGLED]:
    DSL_DATASPACE_EVENT.LEGEND_AI_PYTHON_CODE_TOGGLED,
  [LegendAIChatTelemetryEventType.OPEN_IN_DATACUBE_CLICKED]:
    DSL_DATASPACE_EVENT.LEGEND_AI_OPEN_IN_DATACUBE_CLICKED,
};
const DataSpaceLegendAIIntegrationInner = observer(
  (props: {
    dataSpaceViewerState: DataSpaceViewerState;
    config: LegendAIConfig;
    onClose?: () => void;
    onMinimize?: () => void;
  }) => {
    const { dataSpaceViewerState, config, onClose, onMinimize } = props;

    const legendAIPlugin = useMemo(
      () =>
        findLegendAIPlugin(
          dataSpaceViewerState.applicationStore.pluginManager.getApplicationPlugins(),
        ),
      [dataSpaceViewerState],
    );

    const [services, setServices] = useState<TDSServiceSchema[]>([]);
    useEffect(
      () =>
        bridgeLegendAIServices(
          () => extractTDSServicesFromDataSpace(dataSpaceViewerState),
          setServices,
          (error) =>
            dataSpaceViewerState.applicationStore.logService.warn(
              LogEvent.create(
                DSL_DATASPACE_EVENT.ERROR_EXTRACT_LEGEND_AI_SERVICES,
              ),
              error,
            ),
        ),
      [dataSpaceViewerState],
    );

    const coordinates = `${dataSpaceViewerState.groupId}:${dataSpaceViewerState.artifactId}:${dataSpaceViewerState.versionId}`;

    const dataProductCoordinates = useMemo(
      (): LegendAIOrchestratorDataProductCoordinates => ({
        data_product: dataSpaceViewerState.dataSpaceAnalysisResult.path,
        group_id: dataSpaceViewerState.groupId,
        artifact_id: dataSpaceViewerState.artifactId,
        version: dataSpaceViewerState.versionId,
      }),
      [
        dataSpaceViewerState.dataSpaceAnalysisResult.path,
        dataSpaceViewerState.groupId,
        dataSpaceViewerState.artifactId,
        dataSpaceViewerState.versionId,
      ],
    );

    const pureExecutionContext = useMemo(():
      | QueryExplicitExecutionContextInfo
      | undefined => {
      const executionContext = dataSpaceViewerState.currentExecutionContext;
      const runtime = dataSpaceViewerState.currentRuntime;
      return executionContext && runtime
        ? {
            mapping: executionContext.mapping.path,
            runtime: runtime.path,
          }
        : undefined;
    }, [
      dataSpaceViewerState.currentExecutionContext,
      dataSpaceViewerState.currentRuntime,
    ]);

    const metadata = useMemo(
      () =>
        extractMetadataFromDataSpace(
          dataSpaceViewerState,
          coordinates,
          services,
        ),
      [dataSpaceViewerState, coordinates, services],
    );

    const modelContext: LegendAIModelContext | undefined = useMemo(
      () => buildDataSpaceModelContext(dataSpaceViewerState, services),
      // Deps are the observable inputs the builder reads; the viewer state
      // identity itself is stable for the lifetime of the panel.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [
        dataSpaceViewerState.dataSpaceAnalysisResult,
        dataSpaceViewerState.currentExecutionContext?.mapping,
        dataSpaceViewerState.currentExecutionContext?.datasets,
        services,
      ],
    );

    const telemetryService =
      dataSpaceViewerState.applicationStore.telemetryService;
    const dataSpacePath = dataSpaceViewerState.dataSpaceAnalysisResult.path;
    const handleLogTelemetryEvent = useLegendAIChatTelemetryLogger(
      DATA_SPACE_TELEMETRY_EVENT_KEYS,
      'data-space',
      dataSpacePath,
      telemetryService,
    );
    const handleMessageFeedback = useCallback(
      (feedback: LegendAIMessageFeedback): void => {
        telemetryService.logEvent(
          DSL_DATASPACE_EVENT.LEGEND_AI_FEEDBACK_SUBMITTED,
          {
            context: 'data-space',
            data_product: dataSpacePath,
            rating:
              feedback.rating === LegendAIMessageFeedbackRating.THUMBS_UP
                ? 'up'
                : 'down',
          },
        );
      },
      [telemetryService, dataSpacePath],
    );

    if (!config.enabled || !legendAIPlugin) {
      return null;
    }

    const dsTitle =
      dataSpaceViewerState.dataSpaceAnalysisResult.title ??
      dataSpaceViewerState.dataSpaceAnalysisResult.name;

    return (
      <LegendAIChat
        services={services}
        coordinates={coordinates}
        config={config}
        metadata={metadata}
        title={`Ask ${dsTitle}`}
        plugin={legendAIPlugin}
        onLogTelemetryEvent={handleLogTelemetryEvent}
        onMessageFeedback={handleMessageFeedback}
        contextBannerMessage="You can query available TDS Executables within Data Space, or use Legend AI MCP for Pure queries on models."
        dataProductCoordinates={dataProductCoordinates}
        {...(pureExecutionContext ? { pureExecutionContext } : {})}
        {...(modelContext ? { modelContext } : {})}
        {...(onClose ? { onClose } : {})}
        {...(onMinimize ? { onMinimize } : {})}
      />
    );
  },
);

export const DataSpaceLegendAIIntegration = observer(
  (props: {
    dataSpaceViewerState: DataSpaceViewerState;
    config: LegendAIConfig;
    onClose?: () => void;
    onMinimize?: () => void;
  }) => (
    <LegendAIErrorBoundary>
      <DataSpaceLegendAIIntegrationInner {...props} />
    </LegendAIErrorBoundary>
  ),
);
