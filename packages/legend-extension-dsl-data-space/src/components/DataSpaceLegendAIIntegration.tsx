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
  type QueryExplicitExecutionContextInfo,
  type MappingModelCoverageAnalysisResult,
  Enumeration,
  getAllSuperclasses,
  PRIMITIVE_TYPE,
} from '@finos/legend-graph';
import {
  LegendAIChat,
  LegendAIErrorBoundary,
  findLegendAIPlugin,
  extractParameterSchemas,
  buildPropertyDocIndex,
  enrichColumnsFromElementDocs,
  inferServiceRelationshipsFromAssociations,
  extractLambdaPreFilters,
  extractModelContext,
  type TDSColumnSchema,
  type TDSServiceSchema,
  type LegendAIConfig,
  type LegendAIProductMetadata,
  type LegendAIOrchestratorDataProductCoordinates,
  type LegendAIServiceSummary,
  type LegendAIModelContext,
  type LegendAIModelEntity,
  type LegendAIModelProperty,
  type LegendAIModelAssociation,
  type LegendAIExecutableInfo,
  type LegendAIColumnPropertyMapping,
  type LegendAIParameterInfo,
} from '@finos/legend-lego/legend-ai';
import { type DiagramAnalysisResult } from '@finos/legend-extension-dsl-diagram';
import { assertErrorThrown, LogEvent } from '@finos/legend-shared';
import type { DataSpaceViewerState } from '../stores/DataSpaceViewerState.js';
import { DSL_DATASPACE_EVENT } from '../__lib__/DSL_DataSpace_Event.js';
import {
  DataSpaceServiceExecutableInfo,
  DataSpaceMultiExecutionServiceExecutableInfo,
  DataSpaceExecutableTDSResult,
  type DataSpaceExecutableAnalysisResult,
} from '../graph-manager/action/analytics/DataSpaceAnalysis.js';
import {
  DataSpaceSupportEmail,
  DataSpaceSupportCombinedInfo,
} from '../graph/metamodel/pure/model/packageableElements/dataSpace/DSL_DataSpace_DataSpace.js';

const MAX_QUERY_SCAN_LENGTH = 5_000;
const MAX_QUERY_TEMPLATE_LENGTH = 1000;
const ENTITY_PATH_PATTERN =
  /(?<entityPath>[A-Za-z_]\w{0,63}(?:::[A-Za-z_]\w{0,63}){0,10})\.all\(\)/g;

// ────────────────────────────────────────────────────────────────────────────
// Diagram-based model context extraction (fallback when elementDocs is sparse)
// ────────────────────────────────────────────────────────────────────────────

/**
 * Extracts a {@link LegendAIModelContext} from diagram metamodel objects.
 * Diagrams always contain the actual Class metamodel references so this
 * works even when elementDocs documentation is empty or incomplete.
 */
export function extractModelContextFromDiagrams(
  diagrams: DiagramAnalysisResult[],
): LegendAIModelContext {
  const entityMap = new Map<string, LegendAIModelEntity>();
  const associations: LegendAIModelAssociation[] = [];
  const enumPaths = new Map<
    string,
    { path: string; name: string; values: string[] }
  >();

  for (const { diagram } of diagrams) {
    for (const classView of diagram.classViews) {
      const cls = classView.class.value;
      if (entityMap.has(cls.path)) {
        continue;
      }
      const properties: LegendAIModelProperty[] = cls.properties.map((prop) => {
        const rawType = prop.genericType.value.rawType;
        const typePath = rawType.path;
        if (rawType instanceof Enumeration && !enumPaths.has(typePath)) {
          enumPaths.set(typePath, {
            path: typePath,
            name: rawType.name,
            values: rawType.values.map((v) => v.name),
          });
        }
        return {
          name: prop.name,
          type: typePath,
          isCollection:
            prop.multiplicity.upperBound === undefined ||
            prop.multiplicity.upperBound > 1,
          isOptional: prop.multiplicity.lowerBound === 0,
        };
      });
      const entity: LegendAIModelEntity = {
        path: cls.path,
        name: cls.name,
        properties,
      };
      const superTypes = getAllSuperclasses(cls).map((c) => c.path);
      if (superTypes.length > 0) {
        entity.superTypes = superTypes;
      }
      entityMap.set(cls.path, entity);
    }

    for (const assocView of diagram.associationViews) {
      const assoc = assocView.association.value;
      const [propA, propB] = assoc.properties;
      associations.push({
        name: assoc.name,
        leftEntity: assocView.from.classView.value.class.value.path,
        leftProperty: propA.name,
        rightEntity: assocView.to.classView.value.class.value.path,
        rightProperty: propB.name,
      });
    }
  }

  const result: LegendAIModelContext = {
    entities: Array.from(entityMap.values()),
    associations,
  };
  if (enumPaths.size > 0) {
    result.enumerations = Array.from(enumPaths.values());
  }
  return result;
}

/**
 * Enriches a {@link LegendAIModelContext} with mapping coverage data.
 * Marks entities that are root-mapped (directly queryable by the orchestrator)
 * so entity resolution can prefer them.
 */
export function enrichModelContextWithMappingCoverage(
  modelContext: LegendAIModelContext,
  mappingCoverage: MappingModelCoverageAnalysisResult | undefined,
): void {
  if (!mappingCoverage) {
    return;
  }
  for (const entity of modelContext.entities) {
    const mapped = mappingCoverage.mappedEntities.find(
      (me) => me.path === entity.path,
    );
    if (mapped?.info?.isRootEntity) {
      entity.isRootMapped = true;
    }
  }
}

/**
 * Builds column-to-property mappings by matching TDS result column names
 * to model property names on the root entity.
 * Uses case-insensitive, whitespace/underscore-normalized comparison.
 */
function buildColumnPropertyMappings(
  columns: string[],
  rootEntity: { properties: { name: string }[] } | undefined,
): LegendAIColumnPropertyMapping[] | undefined {
  if (!rootEntity || rootEntity.properties.length === 0) {
    return undefined;
  }

  const propLookup = new Map<string, string>();
  for (const prop of rootEntity.properties) {
    const normalized = prop.name.toLowerCase().replaceAll('_', '');
    propLookup.set(normalized, prop.name);
  }

  const mappings: LegendAIColumnPropertyMapping[] = [];
  for (const colName of columns) {
    const normalized = colName.toLowerCase().replaceAll(/[\s_]/g, '');
    const propName = propLookup.get(normalized);
    if (propName && propName !== colName) {
      mappings.push({ columnName: colName, propertyPath: propName });
    }
  }

  return mappings.length > 0 ? mappings : undefined;
}

function collectReferencedEntityPaths(queryStr: string): string[] {
  const safeQuery = queryStr.slice(0, MAX_QUERY_SCAN_LENGTH);
  // Reset lastIndex defensively — the regex is module-scoped and reused.
  ENTITY_PATH_PATTERN.lastIndex = 0;
  const paths: string[] = [];
  const seen = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = ENTITY_PATH_PATTERN.exec(safeQuery)) !== null) {
    const path = match.groups?.entityPath;
    if (path && !seen.has(path)) {
      seen.add(path);
      paths.push(path);
    }
  }
  return paths;
}

function buildExecutableInfo(
  exec: DataSpaceExecutableAnalysisResult,
  entityMap: Map<string, LegendAIModelEntity>,
  serviceParameters: Map<string, LegendAIParameterInfo[]>,
): LegendAIExecutableInfo | undefined {
  if (
    !(
      exec.info instanceof DataSpaceServiceExecutableInfo ||
      exec.info instanceof DataSpaceMultiExecutionServiceExecutableInfo
    )
  ) {
    return undefined;
  }
  const queryStr = exec.info.query;
  const referencedEntityPaths = collectReferencedEntityPaths(queryStr);
  const rootEntityPath = referencedEntityPaths[0];
  if (!rootEntityPath) {
    return undefined;
  }
  const info: LegendAIExecutableInfo = {
    title: exec.title,
    rootEntityPath,
    queryTemplate:
      queryStr.length > MAX_QUERY_TEMPLATE_LENGTH
        ? `${queryStr.slice(0, MAX_QUERY_TEMPLATE_LENGTH)}...`
        : queryStr,
  };
  if (referencedEntityPaths.length > 1) {
    info.referencedEntityPaths = referencedEntityPaths;
  }
  if (exec.description !== undefined) {
    info.description = exec.description;
  }
  const reqParams = serviceParameters.get(exec.title);
  if (reqParams && reqParams.length > 0) {
    info.requiredParameters = reqParams;
  }
  if (exec.result instanceof DataSpaceExecutableTDSResult) {
    info.columns = exec.result.columns.map((c) => c.name);
    const colMappings = buildColumnPropertyMappings(
      info.columns,
      entityMap.get(rootEntityPath),
    );
    if (colMappings) {
      info.columnPropertyMappings = colMappings;
    }
  }
  return info;
}

export function extractExecutableInfo(
  executables: DataSpaceExecutableAnalysisResult[],
  modelContext: LegendAIModelContext,
  services: TDSServiceSchema[],
): LegendAIExecutableInfo[] {
  const entityMap = new Map(modelContext.entities.map((e) => [e.path, e]));
  const serviceParameters = new Map<string, LegendAIParameterInfo[]>();
  for (const svc of services) {
    if (svc.parameterSchemas && svc.parameterSchemas.length > 0) {
      serviceParameters.set(
        svc.title,
        svc.parameterSchemas.map((p) => ({
          name: p.name,
          type: p.type ?? PRIMITIVE_TYPE.STRING,
        })),
      );
    }
  }
  const result: LegendAIExecutableInfo[] = [];
  for (const exec of executables) {
    const info = buildExecutableInfo(exec, entityMap, serviceParameters);
    if (!info) {
      continue;
    }
    result.push(info);
    const queryableEntityPaths = info.referencedEntityPaths ?? [
      info.rootEntityPath,
    ];
    for (const entityPath of queryableEntityPaths) {
      const entity = entityMap.get(entityPath);
      if (entity) {
        entity.isQueryable = true;
      }
    }
  }
  return result;
}

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

      const { parameters, parameterSchemas, parameterExtractionFailed } =
        await extractParameterSchemas(
          info.query,
          graphManager,
          viewerState.graphManagerState,
        );

      // Extract hardcoded pre-filter constraints from the lambda
      let preFilters: TDSServiceSchema['preFilters'];
      try {
        const rawLambda = await graphManager.pureCodeToLambda(info.query);
        const extracted = extractLambdaPreFilters(rawLambda.body);
        if (extracted.length > 0) {
          preFilters = extracted;
        }
      } catch (error) {
        assertErrorThrown(error);
        // pre-filter extraction is best-effort — a service without pre-filters
        // still works, the AI just won't know about hardcoded constraints.
      }

      const entry: TDSServiceSchema = {
        title: exec.title,
        pattern: info.pattern,
        columns: tdsResult.columns.map((col) => {
          const column: TDSColumnSchema = { name: col.name };
          if (col.type !== undefined) {
            column.type = col.type;
          }
          if (col.relationalType !== undefined) {
            column.relationalType = col.relationalType;
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
        ...(parameterSchemas.length > 0 ? { parameterSchemas } : {}),
        ...(parameterExtractionFailed
          ? { parameterExtractionFailed: true }
          : {}),
        ...(preFilters ? { preFilters } : {}),
      };
      if (exec.description !== undefined) {
        entry.description = exec.description;
      }
      return [entry];
    }),
  );
  const services = nested.flat();

  // Enrich columns with documentation and nullability from elementDocs
  const propIndex = buildPropertyDocIndex(
    viewerState.dataSpaceAnalysisResult.elementDocs,
  );
  if (propIndex.size > 0) {
    for (const svc of services) {
      enrichColumnsFromElementDocs(svc.columns, propIndex);
    }
  }

  return services;
}

function extractMetadataFromDataSpace(
  viewerState: DataSpaceViewerState,
  coordinates: string,
  services: TDSServiceSchema[],
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
      if (exec.result instanceof DataSpaceExecutableTDSResult) {
        summary.columnNames = exec.result.columns.map((col) => col.name);
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
  if (services.length >= 2) {
    const serviceRels = inferServiceRelationshipsFromAssociations(
      services,
      result.elementDocs,
    );
    if (serviceRels.length > 0) {
      metadata.serviceRelationships = serviceRels;
    }
  }
  return metadata;
}

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
    useEffect(() => {
      let cancelled = false;
      extractTDSServicesFromDataSpace(dataSpaceViewerState)
        .then((result) => {
          if (!cancelled) {
            setServices(result);
          }
        })
        .catch((error) => {
          assertErrorThrown(error);
          dataSpaceViewerState.applicationStore.logService.warn(
            LogEvent.create(
              DSL_DATASPACE_EVENT.ERROR_EXTRACT_LEGEND_AI_SERVICES,
            ),
            error,
          );
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

    const metadata = useMemo(
      () =>
        extractMetadataFromDataSpace(
          dataSpaceViewerState,
          coordinates,
          services,
        ),
      [dataSpaceViewerState, coordinates, services],
    );

    const modelContext: LegendAIModelContext | undefined = useMemo(() => {
      const result = dataSpaceViewerState.dataSpaceAnalysisResult;
      let ctx: LegendAIModelContext | undefined;
      if (result.elementDocs.length > 0) {
        const docsCtx = extractModelContext(result.elementDocs);
        if (docsCtx.entities.length > 0) {
          ctx = docsCtx;
        }
      }

      // Fallback: extract from diagram metamodel objects (always available)
      if (!ctx && result.diagrams.length > 0) {
        const diagramCtx = extractModelContextFromDiagrams(result.diagrams);
        if (diagramCtx.entities.length > 0) {
          ctx = diagramCtx;
        }
      }

      if (!ctx) {
        return undefined;
      }

      const mappingPath =
        dataSpaceViewerState.currentExecutionContext.mapping.path;
      const mappingCoverage =
        result.mappingToMappingCoverageResult?.get(mappingPath);
      enrichModelContextWithMappingCoverage(ctx, mappingCoverage);

      if (result.executables.length > 0) {
        const execInfos = extractExecutableInfo(
          result.executables,
          ctx,
          services,
        );
        if (execInfos.length > 0) {
          ctx.executables = execInfos;
        }
      }

      if (result.description) {
        ctx.dataspaceDescription = result.description;
      }

      return ctx;
    }, [
      dataSpaceViewerState.dataSpaceAnalysisResult,
      dataSpaceViewerState.currentExecutionContext.mapping,
      services,
    ]);

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
        contextBannerMessage="You can query available TDS Executables within Data Space, or use Legend AI MCP for Pure queries on models."
        dataProductCoordinates={dataProductCoordinates}
        pureExecutionContext={pureExecutionContext}
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
