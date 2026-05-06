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

import { useState, useEffect, useMemo } from 'react';
import { observer } from 'mobx-react-lite';
import {
  buildLambdaVariableExpressions,
  VariableExpression,
  type QueryExplicitExecutionContextInfo,
} from '@finos/legend-graph';
import { filterByType } from '@finos/legend-shared';
import {
  LegendAIChat,
  LegendAIErrorBoundary,
  findLegendAIPlugin,
  type TDSColumnSchema,
  type TDSServiceSchema,
  type LegendAIConfig,
  type LegendAIProductMetadata,
  type LegendAIOrchestratorDataProductCoordinates,
  type LegendAIServiceSummary,
} from '@finos/legend-lego/legend-ai';
import type { DataSpaceViewerState } from '../stores/DataSpaceViewerState.js';
import {
  DataSpaceServiceExecutableInfo,
  DataSpaceMultiExecutionServiceExecutableInfo,
  DataSpaceExecutableTDSResult,
} from '../graph-manager/action/analytics/DataSpaceAnalysis.js';
import {
  DataSpaceSupportEmail,
  DataSpaceSupportCombinedInfo,
} from '../graph/metamodel/pure/model/packageableElements/dataSpace/DSL_DataSpace_DataSpace.js';

export async function extractTDSServicesFromDataSpace(
  viewerState: DataSpaceViewerState,
): Promise<TDSServiceSchema[]> {
  const executables = viewerState.dataSpaceAnalysisResult.executables;
  const graphManager = viewerState.graphManagerState.graphManager;

  const nested = await Promise.all(
    executables.map(async (exec): Promise<TDSServiceSchema[]> => {
      if (
        !(
          exec.info instanceof DataSpaceServiceExecutableInfo ||
          exec.info instanceof DataSpaceMultiExecutionServiceExecutableInfo
        ) ||
        !(exec.result instanceof DataSpaceExecutableTDSResult)
      ) {
        return [];
      }
      const info = exec.info;
      const tdsResult = exec.result;

      let parameters: string[] = [];
      try {
        const rawLambda = await graphManager.pureCodeToLambda(info.query);
        parameters = buildLambdaVariableExpressions(
          rawLambda,
          viewerState.graphManagerState,
        )
          .filter(filterByType(VariableExpression))
          .map((v) => v.name);
      } catch {
        /* empty */
      }

      const entry: TDSServiceSchema = {
        title: exec.title,
        pattern: info.pattern,
        columns: tdsResult.columns.map((col) => {
          const column: TDSColumnSchema = { name: col.name };
          if (col.type !== undefined) {
            column.type = col.type;
          }
          if (col.documentation !== undefined) {
            column.documentation = col.documentation;
          }
          if (col.sampleValues !== undefined) {
            column.sampleValues = col.sampleValues;
          }
          return column;
        }),
        parameters,
      };
      if (exec.description !== undefined) {
        entry.description = exec.description;
      }
      return [entry];
    }),
  );
  return nested.flat();
}

function extractMetadataFromDataSpace(
  viewerState: DataSpaceViewerState,
  coordinates: string,
): LegendAIProductMetadata {
  const result = viewerState.dataSpaceAnalysisResult;

  let supportInfoText: string | undefined;
  if (result.supportInfo instanceof DataSpaceSupportEmail) {
    supportInfoText = result.supportInfo.address;
  } else if (result.supportInfo instanceof DataSpaceSupportCombinedInfo) {
    supportInfoText = (result.supportInfo.emails ?? []).join(', ');
  }

  const metadata: LegendAIProductMetadata = {
    name: result.title ?? result.name,
    coordinates,
    serviceSummaries: result.executables.map((exec) => {
      const summary: LegendAIServiceSummary = {
        title: exec.title,
      };
      if (exec.description !== undefined) {
        summary.description = exec.description;
      }
      return summary;
    }),
    tags: result.taggedValues.map((tv) => ({
      profile: tv.profile,
      value: tv.value,
    })),
  };
  if (result.description !== undefined) {
    metadata.description = result.description;
  }
  if (supportInfoText !== undefined) {
    metadata.supportInfo = supportInfoText;
  }
  return metadata;
}

const DataSpaceLegendAIIntegrationInner = observer(
  (props: {
    dataSpaceViewerState: DataSpaceViewerState;
    config: LegendAIConfig;
  }) => {
    const { dataSpaceViewerState, config } = props;

    const legendAIPlugin = useMemo(
      () =>
        findLegendAIPlugin(
          dataSpaceViewerState.applicationStore.pluginManager.getApplicationPlugins(),
        ),
      [dataSpaceViewerState],
    );

    const [services, setServices] = useState<TDSServiceSchema[]>([]);
    useEffect(() => {
      let cancelled = false;
      extractTDSServicesFromDataSpace(dataSpaceViewerState)
        .then((result) => {
          if (!cancelled) {
            setServices(result);
          }
        })
        .catch(() => {
          /* empty */
        });
      return () => {
        cancelled = true;
      };
    }, [dataSpaceViewerState]);

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

    const pureExecutionContext = useMemo(
      (): QueryExplicitExecutionContextInfo => ({
        mapping: dataSpaceViewerState.currentExecutionContext.mapping.path,
        runtime: dataSpaceViewerState.currentRuntime.path,
      }),
      [
        dataSpaceViewerState.currentExecutionContext.mapping,
        dataSpaceViewerState.currentRuntime,
      ],
    );

    const metadata = useMemo(() => {
      try {
        return extractMetadataFromDataSpace(dataSpaceViewerState, coordinates);
      } catch {
        return {
          name: 'Unknown',
          coordinates,
          serviceSummaries: [],
        };
      }
    }, [dataSpaceViewerState, coordinates]);

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
        dataProductCoordinates={dataProductCoordinates}
        pureExecutionContext={pureExecutionContext}
      />
    );
  },
);

export const DataSpaceLegendAIIntegration = observer(
  (props: {
    dataSpaceViewerState: DataSpaceViewerState;
    config: LegendAIConfig;
  }) => (
    <LegendAIErrorBoundary>
      <DataSpaceLegendAIIntegrationInner {...props} />
    </LegendAIErrorBoundary>
  ),
);
