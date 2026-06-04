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
  V1_ServiceExecutableInfo,
  V1_MultiExecutionServiceExecutableInfo,
  V1_ExecutableTDSResult,
  V1_ExecutableRelationResult,
  V1_PackageableType,
  V1_RelationType,
  buildLambdaVariableExpressions,
  VariableExpression,
} from '@finos/legend-graph';
import { filterByType } from '@finos/legend-shared';
import {
  LegendAIChat,
  LegendAIErrorBoundary,
  findLegendAIPlugin,
  TDSServiceSourceType,
  type TDSColumnSchema,
  type TDSServiceSchema,
  type LegendAIConfig,
  type LegendAIAccessPointGroupInfo,
  type LegendAIProductMetadata,
  type LegendAIOrchestratorDataProductCoordinates,
  type LegendAIServiceSummary,
  type LegendAIAccessPointInfo,
} from '@finos/legend-lego/legend-ai';
import type { DataProductViewerState } from '../../stores/DataProduct/DataProductViewerState.js';
import type { DataProductDataAccessState } from '../../stores/DataProduct/DataProductDataAccessState.js';
import { getIngestDeploymentServerConfigName } from '@finos/legend-server-lakehouse';

function extractColumnsFromRelationType(
  relationType: V1_RelationType,
): TDSColumnSchema[] {
  return relationType.columns.map((col) => {
    const column: TDSColumnSchema = { name: col.name };
    const rawType = col.genericType.rawType;
    if (rawType instanceof V1_PackageableType) {
      column.type = rawType.fullPath.split('::').pop() ?? rawType.fullPath;
    }
    return column;
  });
}

export async function extractTDSServicesFromDataProduct(
  viewerState: DataProductViewerState,
): Promise<TDSServiceSchema[]> {
  const services: TDSServiceSchema[] = [];

  const sampleQueries = viewerState.getSampleQueries();
  const graphManager = viewerState.graphManagerState.graphManager;

  const sampleQueryServices = await Promise.all(
    sampleQueries.map(async (sq): Promise<TDSServiceSchema[]> => {
      let columns: TDSColumnSchema[] = [];
      if (sq.result instanceof V1_ExecutableTDSResult) {
        columns = sq.result.tdsResult.tdsColumns.map((col) => {
          const column: TDSColumnSchema = { name: col.name };
          if (col.type !== undefined) {
            column.type = col.type;
          }
          if (col.doc !== undefined) {
            const sampleDelimiter = '-- e.g.';
            const delimIdx = col.doc.indexOf(sampleDelimiter);
            if (delimIdx === -1) {
              column.documentation = col.doc;
            } else {
              const docPart = col.doc.substring(0, delimIdx).trim();
              const samplePart = col.doc
                .substring(delimIdx + sampleDelimiter.length)
                .trim();
              if (docPart) {
                column.documentation = docPart;
              }
              if (samplePart) {
                column.sampleValues = samplePart;
              }
            }
          }
          return column;
        });
      } else if (sq.result instanceof V1_ExecutableRelationResult) {
        const rawType = sq.result.genericType.typeArguments
          .map((ta) => ta.rawType)
          .find((rt): rt is V1_RelationType => rt instanceof V1_RelationType);
        if (rawType) {
          columns = extractColumnsFromRelationType(rawType);
        }
      }

      if (columns.length === 0) {
        return [];
      }

      if (
        !(sq.info instanceof V1_ServiceExecutableInfo) &&
        !(sq.info instanceof V1_MultiExecutionServiceExecutableInfo)
      ) {
        return [];
      }
      const pattern = sq.info.pattern;

      let parameters: string[] = [];
      try {
        const rawLambda = await graphManager.pureCodeToLambda(
          sq.executable ?? sq.info.query,
        );
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
        title: sq.title,
        pattern,
        columns,
        parameters,
      };
      if (sq.description !== undefined) {
        entry.description = sq.description;
      }
      return [entry];
    }),
  );
  services.push(...sampleQueryServices.flat());

  if (services.length === 0) {
    const productPath = viewerState.product.path;
    for (const apgState of viewerState.apgStates) {
      for (const apState of apgState.accessPointStates) {
        const relationType = apState.relationType;
        if (relationType && relationType.columns.length > 0) {
          const apTitle = apState.accessPoint.title ?? apState.accessPoint.id;
          const columns = extractColumnsFromRelationType(relationType);
          services.push({
            title: apTitle,
            pattern: `/${apState.accessPoint.id}`,
            columns,
            parameters: [],
            sourceType: TDSServiceSourceType.ACCESS_POINT,
            dataProductPath: productPath,
          });
        }
      }
    }
  }

  return services;
}

function extractMetadataFromDataProduct(
  viewerState: DataProductViewerState,
  coordinates: string,
): LegendAIProductMetadata {
  const product = viewerState.product;
  const sampleQueries = viewerState.getSampleQueries();

  const metadata: LegendAIProductMetadata = {
    name: product.title ?? product.name,
    coordinates,
    serviceSummaries: sampleQueries.map((sq) => {
      const summary: LegendAIServiceSummary = {
        title: sq.title,
      };
      if (sq.description !== undefined) {
        summary.description = sq.description;
      }
      return summary;
    }),
    accessPointGroups: product.accessPointGroups.map((apg) => {
      const group: LegendAIAccessPointGroupInfo = {
        title: apg.title ?? apg.id,
        accessPoints: apg.accessPoints.map((ap) => {
          const point: LegendAIAccessPointInfo = {
            title: ap.title ?? ap.id,
          };
          if (ap.description !== undefined) {
            point.description = ap.description;
          }
          return point;
        }),
      };
      if (apg.description !== undefined) {
        group.description = apg.description;
      }
      return group;
    }),
  };
  if (product.description !== undefined) {
    metadata.description = product.description;
  }
  return metadata;
}

const DataProductLegendAIIntegrationInner = observer(
  (props: {
    dataProductViewerState: DataProductViewerState;
    config: LegendAIConfig;
    dataProductDataAccessState?: DataProductDataAccessState;
  }) => {
    const { dataProductViewerState, config, dataProductDataAccessState } =
      props;
    const projectGAV = dataProductViewerState.projectGAV;

    const legendAIPlugin = useMemo(
      () =>
        findLegendAIPlugin(
          dataProductViewerState.applicationStore.pluginManager.getApplicationPlugins(),
        ),
      [dataProductViewerState],
    );

    const [services, setServices] = useState<TDSServiceSchema[]>([]);

    const loadedRelationTypeCount = dataProductViewerState.apgStates.reduce(
      (acc, apg) =>
        acc +
        apg.accessPointStates.filter((ap) => ap.relationType !== undefined)
          .length,
      0,
    );

    useEffect(() => {
      let cancelled = false;
      extractTDSServicesFromDataProduct(dataProductViewerState)
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
    }, [
      dataProductViewerState,
      dataProductViewerState.dataProductArtifact,
      loadedRelationTypeCount,
    ]);

    const coordinates = projectGAV
      ? `${projectGAV.groupId}:${projectGAV.artifactId}:${projectGAV.versionId}`
      : '';

    const dataProductCoordinates = useMemo(():
      | LegendAIOrchestratorDataProductCoordinates
      | undefined => {
      if (!projectGAV) {
        return undefined;
      }
      return {
        data_product: dataProductViewerState.product.path,
        group_id: projectGAV.groupId,
        artifact_id: projectGAV.artifactId,
        version: projectGAV.versionId,
      };
    }, [projectGAV, dataProductViewerState.product.path]);

    const metadata = useMemo(() => {
      try {
        return extractMetadataFromDataProduct(
          dataProductViewerState,
          coordinates,
        );
      } catch {
        return {
          name: 'Unknown',
          coordinates,
          serviceSummaries: [],
          accessPointGroups: [],
        };
      }
    }, [dataProductViewerState, coordinates]);

    const resolvedUserEnv = dataProductDataAccessState?.resolvedUserEnv;
    const resolvedConfig = useMemo((): LegendAIConfig => {
      if (!resolvedUserEnv) {
        return config;
      }
      const envName = getIngestDeploymentServerConfigName(resolvedUserEnv);
      if (!envName || envName === config.lakehouseEnvironment) {
        return config;
      }
      return { ...config, lakehouseEnvironment: envName };
    }, [config, resolvedUserEnv]);

    if (!config.enabled || !legendAIPlugin) {
      return null;
    }

    const productTitle =
      dataProductViewerState.product.title ?? 'this Data Product';

    return (
      <LegendAIChat
        services={services}
        coordinates={coordinates}
        config={resolvedConfig}
        metadata={metadata}
        title={`Ask ${productTitle}`}
        plugin={legendAIPlugin}
        {...(dataProductCoordinates ? { dataProductCoordinates } : {})}
      />
    );
  },
);

export const DataProductLegendAIIntegration = observer(
  (props: {
    dataProductViewerState: DataProductViewerState;
    config: LegendAIConfig;
    dataProductDataAccessState?: DataProductDataAccessState;
  }) => (
    <LegendAIErrorBoundary>
      <DataProductLegendAIIntegrationInner {...props} />
    </LegendAIErrorBoundary>
  ),
);
