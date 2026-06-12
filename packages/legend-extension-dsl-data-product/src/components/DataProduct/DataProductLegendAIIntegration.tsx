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
  type V1_ExecutableTDSResultColumn,
  V1_ExecutableRelationResult,
  V1_RelationType,
  V1_DatabaseDDL,
  V1_LakehouseAccessPoint,
  type V1_AccessPointGroupInfo,
  type V1_SampleQuery,
  type QueryExplicitExecutionContextInfo,
  extractElementNameFromPath,
  V1_getGenericTypeFullPath,
} from '@finos/legend-graph';
import {
  LegendAIChat,
  LegendAIErrorBoundary,
  findLegendAIPlugin,
  TDSServiceSourceType,
  TDS_SAMPLE_VALUES_DELIMITER,
  extractParameterSchemas,
  buildPropertyDocIndex,
  enrichColumnsFromElementDocs,
  inferServiceRelationshipsFromAssociations,
  extractLambdaPreFilters,
  type TDSColumnSchema,
  type TDSServiceSchema,
  type LegendAIConfig,
  type LegendAIAccessPointGroupInfo,
  type LegendAIProductMetadata,
  type LegendAIOrchestratorDataProductCoordinates,
  type LegendAIServiceSummary,
  type LegendAIAccessPointInfo,
  type LegendAIAccessPointRelationship,
} from '@finos/legend-lego/legend-ai';
import type { DataProductViewerState } from '../../stores/DataProduct/DataProductViewerState.js';
import type { DataProductAccessPointState } from '../../stores/DataProduct/DataProductAccessPointState.js';
import type { DataProductDataAccessState } from '../../stores/DataProduct/DataProductDataAccessState.js';
import { getIngestDeploymentServerConfigName } from '@finos/legend-server-lakehouse';

/**
 * Lakehouse system columns that exist in the physical table but are not
 * queryable through the `p()` access-point abstraction.  Including them
 * in `SELECT *` causes SnowflakeSQLException ("invalid identifier").
 */
const LAKEHOUSE_SYSTEM_COLUMN_PREFIX = '__lake';
const METADATA_AP_SUFFIX = '_AP_LH_MIGRATION_METADATA';

function isLakehouseSystemColumn(name: string): boolean {
  return name.startsWith(LAKEHOUSE_SYSTEM_COLUMN_PREFIX);
}

function extractColumnsFromRelationType(
  relationType: V1_RelationType,
  columnMetadataLookup?: Map<string, TDSColumnSchema>,
): TDSColumnSchema[] {
  return relationType.columns
    .filter((col) => !isLakehouseSystemColumn(col.name))
    .map((col) => {
      const column: TDSColumnSchema = { name: col.name };
      column.type = extractElementNameFromPath(
        V1_getGenericTypeFullPath(col.genericType),
      );
      if (col.multiplicity.lowerBound === 0) {
        column.nullable = true;
      }
      // Enrich with documentation/sampleValues from sample queries when available
      const enrichment = columnMetadataLookup?.get(col.name);
      if (enrichment?.documentation !== undefined) {
        column.documentation = enrichment.documentation;
      }
      if (enrichment?.sampleValues !== undefined) {
        column.sampleValues = enrichment.sampleValues;
      }
      if (enrichment?.relationalType !== undefined) {
        column.relationalType = enrichment.relationalType;
      }
      return column;
    });
}

function parseColumnDoc(doc: string): {
  documentation?: string;
  sampleValues?: string;
} {
  const delimIdx = doc.indexOf(TDS_SAMPLE_VALUES_DELIMITER);
  if (delimIdx === -1) {
    return { documentation: doc };
  }
  const result: { documentation?: string; sampleValues?: string } = {};
  const docPart = doc.substring(0, delimIdx).trim();
  const samplePart = doc
    .substring(delimIdx + TDS_SAMPLE_VALUES_DELIMITER.length)
    .trim();
  if (docPart) {
    result.documentation = docPart;
  }
  if (samplePart) {
    result.sampleValues = samplePart;
  }
  return result;
}

function buildColumnEntry(
  col: V1_ExecutableTDSResultColumn,
): TDSColumnSchema | undefined {
  const entry: TDSColumnSchema = { name: col.name };
  if (col.type !== undefined) {
    entry.type = col.type;
  }
  if (col.doc !== undefined) {
    const parsed = parseColumnDoc(col.doc);
    if (parsed.documentation) {
      entry.documentation = parsed.documentation;
    }
    if (parsed.sampleValues) {
      entry.sampleValues = parsed.sampleValues;
    }
  }
  if (col.relationalType !== undefined) {
    entry.relationalType = col.relationalType;
  }
  if (
    entry.documentation !== undefined ||
    entry.sampleValues !== undefined ||
    entry.relationalType !== undefined
  ) {
    return entry;
  }
  return undefined;
}

/**
 * Builds a lookup map of column metadata (documentation, sampleValues)
 * from all sample queries including templates. This allows AP columns
 * derived from relationType (which lack docs) to be enriched with
 * metadata from richer executable definitions.
 */
function buildColumnMetadataLookup(
  sampleQueries: { result: unknown }[],
): Map<string, TDSColumnSchema> {
  const lookup = new Map<string, TDSColumnSchema>();
  for (const sq of sampleQueries) {
    if (sq.result instanceof V1_ExecutableTDSResult) {
      for (const col of sq.result.tdsResult.tdsColumns) {
        if (lookup.has(col.name)) {
          continue;
        }
        const entry = buildColumnEntry(col);
        if (entry) {
          lookup.set(col.name, entry);
        }
      }
    }
  }
  return lookup;
}

function isMetadataAccessPoint(ap: { id: string }): boolean {
  return ap.id.endsWith(METADATA_AP_SUFFIX);
}

function collectDistinctValues(
  rows: { values: string[] }[],
  colIdx: number,
  maxCount: number,
): Set<string> {
  const distinct = new Set<string>();
  for (const row of rows) {
    const val = row.values[colIdx];
    if (val !== undefined && val !== '') {
      distinct.add(val);
    }
    if (distinct.size >= maxCount) {
      break;
    }
  }
  return distinct;
}

function enrichColumnsWithSampleData(
  columns: TDSColumnSchema[],
  relationElement:
    | { columns: string[]; rows: { values: string[] }[] }
    | undefined,
): void {
  if (!relationElement || relationElement.rows.length === 0) {
    return;
  }
  for (const col of columns) {
    if (col.sampleValues !== undefined) {
      continue;
    }
    const colIdx = relationElement.columns.indexOf(col.name);
    if (colIdx === -1) {
      continue;
    }
    const distinct = collectDistinctValues(relationElement.rows, colIdx, 5);
    if (distinct.size > 0) {
      col.sampleValues = Array.from(distinct).join(', ');
    }
  }
}

function extractColumnsFromSampleQuery(sq: V1_SampleQuery): TDSColumnSchema[] {
  if (sq.result instanceof V1_ExecutableTDSResult) {
    return sq.result.tdsResult.tdsColumns.map((col) => {
      const column: TDSColumnSchema = { name: col.name };
      if (col.type !== undefined) {
        column.type = col.type;
      }
      if (col.doc !== undefined) {
        const parsed = parseColumnDoc(col.doc);
        if (parsed.documentation) {
          column.documentation = parsed.documentation;
        }
        if (parsed.sampleValues) {
          column.sampleValues = parsed.sampleValues;
        }
      }
      return column;
    });
  }
  if (sq.result instanceof V1_ExecutableRelationResult) {
    const rawType = sq.result.genericType.typeArguments
      .map((ta) => ta.rawType)
      .find((rt): rt is V1_RelationType => rt instanceof V1_RelationType);
    if (rawType) {
      return extractColumnsFromRelationType(rawType);
    }
  }
  return [];
}

function buildAccessPointService(
  apState: DataProductAccessPointState,
  artifactApg: V1_AccessPointGroupInfo | undefined,
  columnMetadataLookup: Map<string, TDSColumnSchema>,
  productPath: string,
  groupTitle: string,
): TDSServiceSchema | undefined {
  const ap = apState.accessPoint;
  if (isMetadataAccessPoint(ap)) {
    return undefined;
  }
  const relationType =
    apState.relationType ??
    artifactApg?.accessPointImplementations
      .find((ai) => ai.id === ap.id)
      ?.lambdaGenericType?.typeArguments.map((ta) => ta.rawType)
      .find((rt): rt is V1_RelationType => rt instanceof V1_RelationType);
  if (!relationType || relationType.columns.length === 0) {
    return undefined;
  }
  const apTitle = ap.title ?? ap.id;
  const columns = extractColumnsFromRelationType(
    relationType,
    columnMetadataLookup,
  );
  enrichColumnsWithSampleData(columns, apState.relationElement);
  const entry: TDSServiceSchema = {
    title: apTitle,
    ...(ap.description === undefined ? {} : { description: ap.description }),
    pattern: `/${ap.id}`,
    columns,
    parameters: [],
    sourceType: TDSServiceSourceType.ACCESS_POINT,
    dataProductPath: productPath,
    accessPointGroupTitle: groupTitle,
  };
  const impl = artifactApg?.accessPointImplementations.find(
    (ai) => ai.id === ap.id,
  );
  if (impl?.resourceBuilder instanceof V1_DatabaseDDL) {
    entry.ddlScript = impl.resourceBuilder.script;
  }
  if (
    ap instanceof V1_LakehouseAccessPoint &&
    ap.classification !== undefined
  ) {
    const classificationTag = `[Classification: ${ap.classification}]`;
    entry.description = entry.description
      ? `${entry.description} ${classificationTag}`
      : classificationTag;
  }
  return entry;
}

export async function extractTDSServicesFromDataProduct(
  viewerState: DataProductViewerState,
): Promise<TDSServiceSchema[]> {
  const services: TDSServiceSchema[] = [];

  // Read the artifact synchronously — the useEffect re-triggers via MobX
  // observer() when dataProductArtifact changes from undefined → loaded.
  const artifact = viewerState.dataProductArtifact;

  const sampleQueries = viewerState.getSampleQueries();
  const graphManager = viewerState.graphManagerState.graphManager;

  const sampleQueryServices = await Promise.all(
    sampleQueries.map(async (sq): Promise<TDSServiceSchema[]> => {
      const columns = extractColumnsFromSampleQuery(sq);
      if (columns.length === 0) {
        return [];
      }

      if (
        !(sq.info instanceof V1_ServiceExecutableInfo) &&
        !(sq.info instanceof V1_MultiExecutionServiceExecutableInfo)
      ) {
        return [];
      }

      const queryText = sq.executable ?? sq.info.query;
      const { parameters, parameterSchemas, parameterExtractionFailed } =
        await extractParameterSchemas(
          queryText,
          graphManager,
          viewerState.graphManagerState,
        );

      // Extract hardcoded pre-filter constraints from the lambda
      let preFilters: TDSServiceSchema['preFilters'];
      try {
        const rawLambda = await graphManager.pureCodeToLambda(queryText);
        const extracted = extractLambdaPreFilters(rawLambda.body);
        if (extracted.length > 0) {
          preFilters = extracted;
        }
      } catch {
        /* pre-filter extraction is best-effort */
      }

      const entry: TDSServiceSchema = {
        title: sq.title,
        pattern: sq.info.pattern,
        columns,
        parameters,
        ...(parameterSchemas.length > 0 ? { parameterSchemas } : {}),
        ...(parameterExtractionFailed
          ? { parameterExtractionFailed: true }
          : {}),
        ...(preFilters ? { preFilters } : {}),
      };
      if (sq.description !== undefined) {
        entry.description = sq.description;
      }
      return [entry];
    }),
  );
  services.push(...sampleQueryServices.flat());

  const productPath = viewerState.product.path;
  const columnMetadataLookup = buildColumnMetadataLookup(sampleQueries);
  for (const apgState of viewerState.apgStates) {
    const groupTitle = apgState.apg.title ?? apgState.apg.id;
    const artifactApg = artifact?.accessPointGroups.find(
      (ag) => ag.id === apgState.apg.id,
    );
    for (const apState of apgState.accessPointStates) {
      const entry = buildAccessPointService(
        apState,
        artifactApg,
        columnMetadataLookup,
        productPath,
        groupTitle,
      );
      if (entry) {
        services.push(entry);
      }
    }
  }

  // Enrich columns with documentation and nullability from model elementDocs
  const elementDocs =
    viewerState.nativeModelAccessDocumentationState?.elementDocs ?? [];
  if (elementDocs.length > 0) {
    const propIndex = buildPropertyDocIndex(elementDocs);
    if (propIndex.size > 0) {
      for (const svc of services) {
        enrichColumnsFromElementDocs(svc.columns, propIndex);
      }
    }
  }

  return services;
}

/**
 * Infers cross-access-point relationships by finding shared column names.
 * Only considers access point services (sourceType === ACCESS_POINT).
 * A relationship is created when two APs share at least one column name,
 * which is a strong hint they can be JOINed on that column.
 */
export function inferAccessPointRelationships(
  services: TDSServiceSchema[],
): LegendAIAccessPointRelationship[] {
  const apServices = services.filter(
    (s) => s.sourceType === TDSServiceSourceType.ACCESS_POINT,
  );
  if (apServices.length < 2) {
    return [];
  }
  const relationships: LegendAIAccessPointRelationship[] = [];
  for (let i = 0; i < apServices.length; i++) {
    const left = apServices[i];
    if (!left) {
      continue;
    }
    const leftCols = new Set(left.columns.map((c) => c.name));
    for (let j = i + 1; j < apServices.length; j++) {
      const right = apServices[j];
      if (!right) {
        continue;
      }
      const shared = right.columns
        .map((c) => c.name)
        .filter((name) => leftCols.has(name));
      if (shared.length > 0) {
        relationships.push({
          leftAccessPoint: left.title,
          rightAccessPoint: right.title,
          sharedColumns: shared,
        });
      }
    }
  }
  return relationships;
}

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

    useEffect(() => {
      let cancelled = false;
      extractTDSServicesFromDataProduct(dataProductViewerState)
        .then((result) => {
          if (!cancelled) {
            setServices(result);
          }
        })
        .catch(() => {
          /* noop — services stay empty; AI panel simply won't render */
        });
      return () => {
        cancelled = true;
      };
    }, [
      dataProductViewerState,
      dataProductViewerState.dataProductArtifact,
      sampleDataReadyCount,
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
          services,
        );
      } catch {
        return {
          name: 'Unknown',
          coordinates,
          serviceSummaries: [],
          accessPointGroups: [],
        };
      }
    }, [dataProductViewerState, coordinates, services]);

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
        {...(pureExecutionContext ? { pureExecutionContext } : {})}
        {...(onClose ? { onClose } : {})}
        {...(onMinimize ? { onMinimize } : {})}
      />
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
