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

import {
  Enumeration,
  PRIMITIVE_TYPE,
  RelationalDatabaseTableSpecification,
  type MappingModelCoverageAnalysisResult,
  type FunctionAnalysisInfo,
  type GraphManagerState,
} from '@finos/legend-graph';
import {
  extractParameterSchemas,
  buildPropertyDocIndex,
  enrichColumnsFromElementDocs,
  inferServiceRelationshipsFromAssociations,
  extractServicePreFilters,
  extractModelContext,
  type TDSColumnSchema,
  type TDSServiceSchema,
  type LegendAIProductMetadata,
  type LegendAIServiceSummary,
  type LegendAIModelContext,
  type LegendAIModelEntity,
  type LegendAIModelProperty,
  type LegendAIModelAssociation,
  type LegendAIExecutableInfo,
  type LegendAIColumnPropertyMapping,
  type LegendAIParameterInfo,
  type LegendAIFunctionInfo,
} from '@finos/legend-lego/legend-ai';
import { type DiagramAnalysisResult } from '@finos/legend-extension-dsl-diagram';
import type { DataSpaceViewerState } from '../stores/DataSpaceViewerState.js';
import {
  DataSpaceServiceExecutableInfo,
  DataSpaceMultiExecutionServiceExecutableInfo,
  DataSpaceExecutableTDSResult,
  type DataSpaceExecutableAnalysisResult,
  type DataSpaceAnalysisResult,
  type DataSpaceExecutionContextAnalysisResult,
} from '../graph-manager/action/analytics/DataSpaceAnalysis.js';
import {
  DataSpaceSupportEmail,
  DataSpaceSupportCombinedInfo,
} from '../graph/metamodel/pure/model/packageableElements/dataSpace/DSL_DataSpace_DataSpace.js';

const MAX_QUERY_SCAN_LENGTH = 5_000;
const MAX_QUERY_TEMPLATE_LENGTH = 1000;
const MAX_DATASPACE_FUNCTIONS = 20;

const ENTITY_PATH_PATTERN =
  /(?<entityPath>[A-Za-z_]\w{0,63}(?:::[A-Za-z_]\w{0,63}){0,10})\.all\(\)/g;

// ────────────────────────────────────────────────────────────────────────────
// Diagram-based model context extraction (fallback when elementDocs is sparse)
// ────────────────────────────────────────────────────────────────────────────

/**
 * Extracts a {@link LegendAIModelContext} from diagram metamodel objects.
 * Works even when elementDocs documentation is empty or incomplete.
 */
function extractModelContextFromDiagrams(
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
 * Marks root-mapped entities so entity resolution can prefer them.
 */
function enrichModelContextWithMappingCoverage(
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
 * to root-entity property names (case-insensitive, separator-normalized).
 */
function buildColumnPropertyMappings(
  columns: string[],
  rootEntity: LegendAIModelEntity | undefined,
): LegendAIColumnPropertyMapping[] | undefined {
  if (!rootEntity || rootEntity.properties.length === 0) {
    return undefined;
  }

  const normalizeName = (name: string): string =>
    name.toLowerCase().replaceAll(/[\s_]/g, '');

  const propLookup = new Map<string, string>();
  for (const prop of rootEntity.properties) {
    propLookup.set(normalizeName(prop.name), prop.name);
  }

  const mappings: LegendAIColumnPropertyMapping[] = [];
  for (const colName of columns) {
    const propName = propLookup.get(normalizeName(colName));
    if (propName && propName !== colName) {
      mappings.push({ columnName: colName, propertyPath: propName });
    }
  }

  return mappings.length > 0 ? mappings : undefined;
}

// Scans a query string for referenced entity paths; resets the shared regex's
// lastIndex first since ENTITY_PATH_PATTERN is module-scoped and reused.
function collectReferencedEntityPaths(queryStr: string): string[] {
  const safeQuery = queryStr.slice(0, MAX_QUERY_SCAN_LENGTH);
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
    const columnNames = exec.result.columns.map((c) => c.name);
    const colMappings = buildColumnPropertyMappings(
      columnNames,
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

/**
 * Everything data space extraction needs, with no UI state involved. The
 * execution context supplies the mapping and datasets the viewer would project.
 */
export interface DataSpaceSchemaSource {
  analysisResult: DataSpaceAnalysisResult;
  executionContext: DataSpaceExecutionContextAnalysisResult;
  graphManagerState: GraphManagerState;
}

export async function extractTDSServicesFromDataSpaceSource(
  source: DataSpaceSchemaSource,
): Promise<TDSServiceSchema[]> {
  const executables = source.analysisResult.executables;
  const graphManager = source.graphManagerState.graphManager;

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
          source.graphManagerState,
        );

      const preFilters = await extractServicePreFilters(
        info.query,
        graphManager,
      );

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

  const propIndex = buildPropertyDocIndex(source.analysisResult.elementDocs);
  if (propIndex.size > 0) {
    for (const svc of services) {
      enrichColumnsFromElementDocs(svc.columns, propIndex);
    }
  }

  return services;
}

export function extractMetadataFromDataSpaceAnalysis(
  result: DataSpaceAnalysisResult,
  coordinates: string,
  services: TDSServiceSchema[],
): LegendAIProductMetadata {
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

// Maps the dataspace's own callable functions to model-context function hints.
function extractFunctionInfo(
  functionInfos: Map<string, FunctionAnalysisInfo> | undefined,
): LegendAIFunctionInfo[] {
  if (!functionInfos || functionInfos.size === 0) {
    return [];
  }
  const functions: LegendAIFunctionInfo[] = [];
  for (const fn of functionInfos.values()) {
    if (functions.length >= MAX_DATASPACE_FUNCTIONS) {
      break;
    }
    functions.push({
      name: fn.functionName,
      functionPath: fn.functionPath,
      returnType: fn.returnType,
      parameters: fn.parameterInfoList.map((p) => ({
        name: p.name,
        type: p.type,
      })),
    });
  }
  return functions;
}

/**
 * Builds the orchestrator model context for a dataspace from element docs or
 * diagrams, enriched with mapping coverage, executables, datasets, and functions.
 */
export function buildDataSpaceModelContextFromSource(
  source: DataSpaceSchemaSource,
  services: TDSServiceSchema[],
): LegendAIModelContext | undefined {
  const result = source.analysisResult;
  let ctx: LegendAIModelContext | undefined;
  if (result.elementDocs.length > 0) {
    const docsCtx = extractModelContext(result.elementDocs);
    if (docsCtx.entities.length > 0) {
      ctx = docsCtx;
    }
  }
  if (!ctx && result.diagrams.length > 0) {
    const diagramCtx = extractModelContextFromDiagrams(result.diagrams);
    if (diagramCtx.entities.length > 0) {
      ctx = diagramCtx;
    }
  }
  if (!ctx) {
    return undefined;
  }
  const mappingPath = source.executionContext.mapping.path;
  enrichModelContextWithMappingCoverage(
    ctx,
    result.mappingToMappingCoverageResult?.get(mappingPath),
  );
  if (result.executables.length > 0) {
    const execInfos = extractExecutableInfo(result.executables, ctx, services);
    if (execInfos.length > 0) {
      ctx.executables = execInfos;
    }
  }
  const functions = extractFunctionInfo(result.functionInfos);
  if (functions.length > 0) {
    ctx.functions = functions;
  }
  const physicalDatasets = source.executionContext.datasets;
  if (physicalDatasets.length > 0) {
    ctx.datasets = physicalDatasets.map((ds) =>
      ds instanceof RelationalDatabaseTableSpecification
        ? {
            name: ds.name,
            database: ds.database,
            schema: ds.schema,
            table: ds.table,
          }
        : { name: ds.name },
    );
  }
  if (result.description) {
    ctx.dataspaceDescription = result.description;
  }
  return ctx;
}

/** Adapts an open data space viewer to {@link extractTDSServicesFromDataSpaceSource}. */
export async function extractTDSServicesFromDataSpace(
  viewerState: DataSpaceViewerState,
): Promise<TDSServiceSchema[]> {
  return extractTDSServicesFromDataSpaceSource(
    buildDataSpaceSchemaSource(viewerState),
  );
}

/** Adapts an open data space viewer to {@link extractMetadataFromDataSpaceAnalysis}. */
export function extractMetadataFromDataSpace(
  viewerState: DataSpaceViewerState,
  coordinates: string,
  services: TDSServiceSchema[],
): LegendAIProductMetadata {
  return extractMetadataFromDataSpaceAnalysis(
    viewerState.dataSpaceAnalysisResult,
    coordinates,
    services,
  );
}

/** Adapts an open data space viewer to {@link buildDataSpaceModelContextFromSource}. */
export function buildDataSpaceModelContext(
  viewerState: DataSpaceViewerState,
  services: TDSServiceSchema[],
): LegendAIModelContext | undefined {
  return buildDataSpaceModelContextFromSource(
    buildDataSpaceSchemaSource(viewerState),
    services,
  );
}

// The viewer's execution context is observable, so it is read per call rather
// than captured once.
function buildDataSpaceSchemaSource(
  viewerState: DataSpaceViewerState,
): DataSpaceSchemaSource {
  return {
    analysisResult: viewerState.dataSpaceAnalysisResult,
    executionContext: viewerState.currentExecutionContext,
    graphManagerState: viewerState.graphManagerState,
  };
}
