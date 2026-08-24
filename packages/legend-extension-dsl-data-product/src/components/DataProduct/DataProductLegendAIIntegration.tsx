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
import {
  V1_ExecutableTDSResult,
  type QueryExplicitExecutionContextInfo,
} from '@finos/legend-graph';
import {
  LegendAIChat,
  LegendAIErrorBoundary,
  findLegendAIPlugin,
  inferServiceRelationshipsFromAssociations,
  extractModelContext,
  LegendAIChatTelemetryEventType,
  bridgeLegendAIServices,
  useLegendAIChatTelemetryLogger,
  LegendAIMessageFeedbackRating,
  DATA_PRODUCT_ACCESSOR_PREFIX,
  type TDSServiceSchema,
  type LegendAIConfig,
  type LegendAIAccessPointGroupInfo,
  type LegendAIProductMetadata,
  type LegendAIOrchestratorDataProductCoordinates,
  type LegendAIServiceSummary,
  type LegendAIAccessPointInfo,
  type LegendAIModelContext,
  type LegendAIMessageFeedback,
} from '@finos/legend-lego/legend-ai';
import {
  assertErrorThrown,
  guaranteeNonNullable,
  LogEvent,
} from '@finos/legend-shared';
import type { DataProductViewerState } from '../../stores/DataProduct/DataProductViewerState.js';
import type { DataProductDataAccessState } from '../../stores/DataProduct/DataProductDataAccessState.js';
import { type DataProductAPGState } from '../../stores/DataProduct/DataProductAPGState.js';
import {
  extractTDSServicesFromDataProduct,
  inferAccessPointRelationships,
} from '../../stores/DataProduct/DataProductLegendAISchema.js';
import { DSL_DATAPRODUCT_EVENT } from '../../__lib__/DSL_DataProduct_Event.js';
import { EntitlementsDataContractCreator } from './DataContract/EntitlementsDataContractCreator.js';
import { useAuth } from 'react-oidc-context';
import { getIngestDeploymentServerConfigName } from '@finos/legend-server-lakehouse';

const DATA_PRODUCT_TELEMETRY_EVENT_KEYS: Record<
  LegendAIChatTelemetryEventType,
  string
> = {
  [LegendAIChatTelemetryEventType.QUESTION_ASKED]:
    DSL_DATAPRODUCT_EVENT.LEGEND_AI_QUESTION_ASKED,
  [LegendAIChatTelemetryEventType.RESPONSE_RECEIVED]:
    DSL_DATAPRODUCT_EVENT.LEGEND_AI_RESPONSE_RECEIVED,
  [LegendAIChatTelemetryEventType.ASSISTANT_CLOSED]:
    DSL_DATAPRODUCT_EVENT.LEGEND_AI_ASSISTANT_CLOSED,
  [LegendAIChatTelemetryEventType.SUGGESTED_QUERY_CLICKED]:
    DSL_DATAPRODUCT_EVENT.LEGEND_AI_SUGGESTED_QUERY_CLICKED,
  [LegendAIChatTelemetryEventType.SCOPE_CHANGED]:
    DSL_DATAPRODUCT_EVENT.LEGEND_AI_SCOPE_CHANGED,
  [LegendAIChatTelemetryEventType.MODEL_CHANGED]:
    DSL_DATAPRODUCT_EVENT.LEGEND_AI_MODEL_CHANGED,
  [LegendAIChatTelemetryEventType.SQL_DETAILS_TOGGLED]:
    DSL_DATAPRODUCT_EVENT.LEGEND_AI_SQL_DETAILS_TOGGLED,
  [LegendAIChatTelemetryEventType.ARTIFACT_COPIED]:
    DSL_DATAPRODUCT_EVENT.LEGEND_AI_ARTIFACT_COPIED,
  [LegendAIChatTelemetryEventType.PYTHON_CODE_REQUESTED]:
    DSL_DATAPRODUCT_EVENT.LEGEND_AI_PYTHON_CODE_REQUESTED,
  [LegendAIChatTelemetryEventType.PYTHON_CODE_TOGGLED]:
    DSL_DATAPRODUCT_EVENT.LEGEND_AI_PYTHON_CODE_TOGGLED,
  [LegendAIChatTelemetryEventType.OPEN_IN_DATACUBE_CLICKED]:
    DSL_DATAPRODUCT_EVENT.LEGEND_AI_OPEN_IN_DATACUBE_CLICKED,
};

function extractMetadataFromDataProduct(
  viewerState: DataProductViewerState,
  coordinates: string,
  services: TDSServiceSchema[],
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
      if (sq.result instanceof V1_ExecutableTDSResult) {
        summary.columnNames = sq.result.tdsResult.tdsColumns.map(
          (col) => col.name,
        );
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
    tags: product.taggedValues.map((tv) => ({
      profile: tv.tag.profile,
      value: tv.value,
    })),
  };
  if (product.description !== undefined) {
    metadata.description = product.description;
  }
  if (product.supportInfo?.emails && product.supportInfo.emails.length > 0) {
    metadata.supportInfo = product.supportInfo.emails
      .map((e) => e.address)
      .join(', ');
  }
  const relationships = inferAccessPointRelationships(services);
  if (relationships.length > 0) {
    metadata.accessPointRelationships = relationships;
  }
  // Infer cross-service relationships from model association docs
  const elementDocs =
    viewerState.nativeModelAccessDocumentationState?.elementDocs ?? [];
  if (services.length >= 2 && elementDocs.length > 0) {
    const serviceRels = inferServiceRelationshipsFromAssociations(
      services,
      elementDocs,
    );
    if (serviceRels.length > 0) {
      metadata.serviceRelationships = serviceRels;
    }
  }
  return metadata;
}

const DataProductLegendAIIntegrationInner = observer(
  (props: {
    dataProductViewerState: DataProductViewerState;
    config: LegendAIConfig;
    dataProductDataAccessState?: DataProductDataAccessState;
    onClose?: () => void;
    onMinimize?: () => void;
  }) => {
    const {
      dataProductViewerState,
      config,
      dataProductDataAccessState,
      onClose,
      onMinimize,
    } = props;
    const projectGAV = dataProductViewerState.projectGAV;

    const legendAIPlugin = useMemo(
      () =>
        findLegendAIPlugin(
          dataProductViewerState.applicationStore.pluginManager.getApplicationPlugins(),
        ),
      [dataProductViewerState],
    );

    const [services, setServices] = useState<TDSServiceSchema[]>([]);

    // Track how many access points have loaded sample data so the effect
    // re-runs once relationElement is populated (fixes the race where
    // extractTDSServicesFromDataProduct runs before fetchSampleData
    // completes, causing enrichColumnsWithSampleData to be a no-op).
    const sampleDataReadyCount = dataProductViewerState.apgStates.reduce(
      (count, apg) =>
        count +
        apg.accessPointStates.filter((ap) => ap.relationElement !== undefined)
          .length,
      0,
    );

    useEffect(
      () =>
        bridgeLegendAIServices(
          () => extractTDSServicesFromDataProduct(dataProductViewerState),
          setServices,
          (error) =>
            dataProductViewerState.applicationStore.logService.warn(
              LogEvent.create(
                DSL_DATAPRODUCT_EVENT.ERROR_EXTRACT_LEGEND_AI_SERVICES,
              ),
              error,
            ),
        ),
      [
        dataProductViewerState,
        dataProductViewerState.dataProductArtifact,
        sampleDataReadyCount,
      ],
    );

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

    const metadata = useMemo(
      () =>
        extractMetadataFromDataProduct(
          dataProductViewerState,
          coordinates,
          services,
        ),
      [dataProductViewerState, coordinates, services],
    );

    const pureExecutionContext = useMemo(():
      | QueryExplicitExecutionContextInfo
      | undefined => {
      const nativeModelAccess =
        dataProductViewerState.dataProductArtifact?.nativeModelAccess;
      if (!nativeModelAccess) {
        return undefined;
      }
      const defaultCtx = nativeModelAccess.nativeModelExecutionContexts.find(
        (ctx) => ctx.key === nativeModelAccess.defaultExecutionContext,
      );
      const mapping = defaultCtx?.mapping;
      const runtime = defaultCtx?.runtimeGeneration?.path;
      if (!mapping || !runtime) {
        return undefined;
      }
      return { mapping, runtime };
    }, [dataProductViewerState.dataProductArtifact]);

    const modelContext: LegendAIModelContext | undefined = useMemo(() => {
      const elementDocs =
        dataProductViewerState.nativeModelAccessDocumentationState
          ?.elementDocs ?? [];
      if (elementDocs.length === 0) {
        return undefined;
      }
      const ctx = extractModelContext(elementDocs);
      return ctx.entities.length > 0 ? ctx : undefined;
    }, [dataProductViewerState.nativeModelAccessDocumentationState]);

    const resolvedUserEnv = dataProductDataAccessState?.resolvedUserEnv;
    const resolvedConfig = useMemo((): LegendAIConfig => {
      if (!resolvedUserEnv) {
        return config;
      }
      const envName = getIngestDeploymentServerConfigName(resolvedUserEnv);
      return {
        ...config,
        ...(envName ? { lakehouseEnvironment: envName } : {}),
        lakehouseEnvironmentClassification:
          resolvedUserEnv.environmentClassification,
      };
    }, [config, resolvedUserEnv]);

    const auth = useAuth();

    const findApgStateByTitle = useCallback(
      (title: string): DataProductAPGState | undefined =>
        dataProductViewerState.apgStates.find(
          (s) => (s.apg.title ?? s.apg.id) === title,
        ),
      [dataProductViewerState.apgStates],
    );

    const handleRequestAccess = useCallback(
      (accessPointGroupTitle: string): void => {
        if (!dataProductDataAccessState) {
          return;
        }
        const apgState = findApgStateByTitle(accessPointGroupTitle);
        if (apgState) {
          dataProductDataAccessState.setContractCreatorAPG(apgState.apg);
        }
      },
      [findApgStateByTitle, dataProductDataAccessState],
    );

    const handleOpenInDataCube = useCallback(
      (accessPointName: string, pureQuery: string | undefined): void => {
        if (
          !dataProductDataAccessState ||
          !dataProductViewerState.openDataCube
        ) {
          return;
        }
        const dataCubeEnv = dataProductDataAccessState.resolvedUserEnv;
        if (!dataCubeEnv) {
          dataProductViewerState.applicationStore.notificationService.notifyWarning(
            'Unable to open DataCube: no resolved lakehouse environment. Open the access point tab to pick one.',
          );
          return;
        }
        const environmentName = guaranteeNonNullable(
          getIngestDeploymentServerConfigName(dataCubeEnv),
          `Can't open DataCube: unable to resolve the lakehouse environment name`,
        );
        let extraSourceData: Record<string, unknown> | undefined;
        if (pureQuery?.startsWith(DATA_PRODUCT_ACCESSOR_PREFIX)) {
          extraSourceData = { query: pureQuery };
        } else {
          dataProductViewerState.applicationStore.logService.debug(
            LogEvent.create(
              DSL_DATAPRODUCT_EVENT.LEGEND_AI_OPEN_IN_DATACUBE_PREFILL_DROPPED,
            ),
            pureQuery === undefined
              ? `Open in DataCube: no translated query available; opening the default access point`
              : `Open in DataCube: dropped translated query with accessor '${pureQuery.slice(0, DATA_PRODUCT_ACCESSOR_PREFIX.length)}' (expected '${DATA_PRODUCT_ACCESSOR_PREFIX}'); opening the default access point`,
          );
        }
        try {
          dataProductDataAccessState.openAccessPointInDataCube(
            accessPointName,
            environmentName,
            extraSourceData,
          );
        } catch (error) {
          assertErrorThrown(error);
          dataProductViewerState.applicationStore.notificationService.notifyError(
            error,
          );
        }
      },
      [dataProductViewerState, dataProductDataAccessState],
    );

    // Resolve which APG state the currently-open contract dialog belongs to
    const contractCreatorApgState: DataProductAPGState | undefined =
      useMemo(() => {
        const creatorAPG = dataProductDataAccessState?.contractCreatorAPG;
        if (!creatorAPG) {
          return undefined;
        }
        return dataProductViewerState.apgStates.find(
          (s) => s.apg === creatorAPG,
        );
      }, [
        dataProductDataAccessState?.contractCreatorAPG,
        dataProductViewerState.apgStates,
      ]);

    const telemetryService =
      dataProductViewerState.applicationStore.telemetryService;
    const dataProductPath = dataProductViewerState.product.path;
    const handleLogTelemetryEvent = useLegendAIChatTelemetryLogger(
      DATA_PRODUCT_TELEMETRY_EVENT_KEYS,
      'data-product',
      dataProductPath,
      telemetryService,
    );
    const handleMessageFeedback = useCallback(
      (feedback: LegendAIMessageFeedback): void => {
        telemetryService.logEvent(
          DSL_DATAPRODUCT_EVENT.LEGEND_AI_FEEDBACK_SUBMITTED,
          {
            context: 'data-product',
            data_product: dataProductPath,
            rating:
              feedback.rating === LegendAIMessageFeedbackRating.THUMBS_UP
                ? 'up'
                : 'down',
          },
        );
      },
      [telemetryService, dataProductPath],
    );

    if (!config.enabled || !legendAIPlugin) {
      return null;
    }

    const productTitle =
      dataProductViewerState.product.title ?? 'this Data Product';

    return (
      <>
        <LegendAIChat
          services={services}
          coordinates={coordinates}
          config={resolvedConfig}
          metadata={metadata}
          title={`Ask ${productTitle}`}
          plugin={legendAIPlugin}
          onLogTelemetryEvent={handleLogTelemetryEvent}
          onMessageFeedback={handleMessageFeedback}
          contextBannerMessage="You can query data from the available access points in this data product."
          {...(dataProductCoordinates ? { dataProductCoordinates } : {})}
          {...(pureExecutionContext ? { pureExecutionContext } : {})}
          {...(modelContext ? { modelContext } : {})}
          {...(onClose ? { onClose } : {})}
          {...(onMinimize ? { onMinimize } : {})}
          {...(dataProductDataAccessState
            ? { onRequestAccess: handleRequestAccess }
            : {})}
          {...(dataProductDataAccessState && dataProductViewerState.openDataCube
            ? { onOpenInDataCube: handleOpenInDataCube }
            : {})}
        />
        {dataProductDataAccessState && contractCreatorApgState && (
          <EntitlementsDataContractCreator
            open={true}
            onClose={() =>
              dataProductDataAccessState.setContractCreatorAPG(undefined)
            }
            apgState={contractCreatorApgState}
            dataAccessState={dataProductDataAccessState}
            tokenProvider={() => auth.user?.access_token}
          />
        )}
      </>
    );
  },
);

export const DataProductLegendAIIntegration = observer(
  (props: {
    dataProductViewerState: DataProductViewerState;
    config: LegendAIConfig;
    dataProductDataAccessState?: DataProductDataAccessState;
    onClose?: () => void;
    onMinimize?: () => void;
  }) => (
    <LegendAIErrorBoundary>
      <DataProductLegendAIIntegrationInner {...props} />
    </LegendAIErrorBoundary>
  ),
);
