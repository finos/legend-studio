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
  V1_ServiceExecutableInfo,
  V1_MultiExecutionServiceExecutableInfo,
  V1_ExecutableTDSResult,
  type V1_ExecutableTDSResultColumn,
  V1_ExecutableRelationResult,
  V1_RelationType,
  V1_DatabaseDDL,
  V1_LakehouseAccessPoint,
  type V1_AccessPoint,
  type V1_AccessPointGroupInfo,
  type V1_DataProductArtifact,
  type V1_RelationElement,
  type V1_RelationRowTestData,
  type V1_SampleQuery,
  type GraphManagerState,
  extractElementNameFromPath,
  V1_getGenericTypeFullPath,
  V1_CInteger,
} from '@finos/legend-graph';
import type { NormalizedDocumentationEntry } from '@finos/legend-lego/model-documentation';
import {
  TDSServiceSourceType,
  parseTDSColumnDoc,
  extractParameterSchemas,
  buildPropertyDocIndex,
  enrichColumnsFromElementDocs,
  extractServicePreFilters,
  sharedColumnNames,
  type TDSColumnSchema,
  type TDSServiceSchema,
  type LegendAIAccessPointRelationship,
} from '@finos/legend-lego/legend-ai';
import { guaranteeNonNullable } from '@finos/legend-shared';
import { getRelationColumnDescription } from '../../utils/LakehouseUtils.js';
import { findArtifactRelationType } from '../../utils/DataProductIngestUtils.js';
import type { DataProductViewerState } from './DataProductViewerState.js';

const LAKEHOUSE_SYSTEM_COLUMN_PREFIX = '__lake';
const METADATA_AP_SUFFIX = '_AP_LH_MIGRATION_METADATA';
const MAX_SAMPLE_VALUES_PER_COLUMN = 5;
const MAX_ACCESS_POINT_RELATIONSHIPS = 25;
const MAX_SHARED_COLUMNS_PER_RELATIONSHIP = 8;
const MAX_CANDIDATE_RELATIONSHIP_PAIRS = 500;
const UNIVERSAL_COLUMN_SHARE = 0.5;
const UNIVERSAL_COLUMN_MIN_ACCESS_POINTS = 10;

// Lakehouse system columns exist in the physical table but are not queryable
// through the p() abstraction — selecting them fails in Snowflake.
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
      const intArgs = col.genericType.typeVariableValues
        .filter((v): v is V1_CInteger => v instanceof V1_CInteger)
        .map((v) => String(v.value));
      if (intArgs.length > 0) {
        column.relationalType = `${column.type.toUpperCase()}(${intArgs.join(',')})`;
      }
      if (col.multiplicity.lowerBound === 0) {
        column.nullable = true;
      }
      const description = getRelationColumnDescription(col);
      if (description !== undefined) {
        column.documentation = description;
      }
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

function buildTDSColumn(col: V1_ExecutableTDSResultColumn): TDSColumnSchema {
  const column: TDSColumnSchema = { name: col.name };
  if (col.type !== undefined) {
    column.type = col.type;
  }
  if (col.doc !== undefined) {
    const parsed = parseTDSColumnDoc(col.doc);
    if (parsed.documentation) {
      column.documentation = parsed.documentation;
    }
    if (parsed.sampleValues) {
      column.sampleValues = parsed.sampleValues;
    }
  }
  if (col.relationalType !== undefined) {
    column.relationalType = col.relationalType;
  }
  return column;
}

// Only a column carrying docs, sample values or a relational type can enrich a
// relationType-derived column; otherwise there is nothing to merge.
function buildColumnEntry(
  col: V1_ExecutableTDSResultColumn,
): TDSColumnSchema | undefined {
  const entry = buildTDSColumn(col);
  return entry.documentation !== undefined ||
    entry.sampleValues !== undefined ||
    entry.relationalType !== undefined
    ? entry
    : undefined;
}

/**
 * Builds a lookup map of column metadata from all sample queries so AP
 * columns derived from relationType can be enriched with docs/sampleValues.
 */
function buildColumnMetadataLookup(
  sampleQueries: V1_SampleQuery[],
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

function isMetadataAccessPoint(ap: V1_AccessPoint): boolean {
  return ap.id.endsWith(METADATA_AP_SUFFIX);
}

function collectDistinctValues(
  rows: V1_RelationRowTestData[],
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
  relationElement: V1_RelationElement | undefined,
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
    const distinct = collectDistinctValues(
      relationElement.rows,
      colIdx,
      MAX_SAMPLE_VALUES_PER_COLUMN,
    );
    if (distinct.size > 0) {
      col.sampleValues = Array.from(distinct).join(', ');
    }
  }
}

function extractColumnsFromSampleQuery(sq: V1_SampleQuery): TDSColumnSchema[] {
  if (sq.result instanceof V1_ExecutableTDSResult) {
    return sq.result.tdsResult.tdsColumns.map(buildTDSColumn);
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

/**
 * An access point plus whatever the caller already resolved for it. Engine
 * results win over the artifact, which is what the product page relies on.
 */
export interface AccessPointSchemaSource {
  accessPoint: V1_AccessPoint;
  relationType?: V1_RelationType | undefined;
  relationElement?: V1_RelationElement | undefined;
}

function buildAccessPointService(
  source: AccessPointSchemaSource,
  artifactApg: V1_AccessPointGroupInfo | undefined,
  columnMetadataLookup: Map<string, TDSColumnSchema>,
  productPath: string,
  groupTitle: string,
): TDSServiceSchema | undefined {
  const ap = source.accessPoint;
  if (isMetadataAccessPoint(ap)) {
    return undefined;
  }
  const impl = artifactApg?.accessPointImplementations.find(
    (ai) => ai.id === ap.id,
  );
  const relationType = source.relationType ?? findArtifactRelationType(impl);
  if (!relationType || relationType.columns.length === 0) {
    return undefined;
  }
  const apTitle = ap.title ?? ap.id;
  const columns = extractColumnsFromRelationType(
    relationType,
    columnMetadataLookup,
  );
  enrichColumnsWithSampleData(
    columns,
    source.relationElement ?? impl?.relationElement,
  );
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

/** An access point group and the access points the caller resolved for it. */
export interface AccessPointGroupSchemaSource {
  id: string;
  title: string | undefined;
  accessPoints: AccessPointSchemaSource[];
}

/**
 * Everything schema extraction needs, with no UI state involved. The graph
 * manager state parses sample query lambdas for parameters and pre-filters.
 */
export interface DataProductSchemaSource {
  productPath: string;
  accessPointGroups: AccessPointGroupSchemaSource[];
  artifact: V1_DataProductArtifact | undefined;
  sampleQueries: V1_SampleQuery[];
  elementDocs: NormalizedDocumentationEntry[];
  graphManagerState: GraphManagerState;
}

// Sample query parameters and pre-filters both need the query lambda parsed;
// a lambda that will not parse still yields a service, flagged as incomplete.
async function buildSampleQueryService(
  sq: V1_SampleQuery,
  graphManagerState: GraphManagerState,
): Promise<TDSServiceSchema[]> {
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
  const graphManager = graphManagerState.graphManager;
  const { parameters, parameterSchemas, parameterExtractionFailed } =
    await extractParameterSchemas(queryText, graphManager, graphManagerState);
  const preFilters = await extractServicePreFilters(queryText, graphManager);

  const entry: TDSServiceSchema = {
    title: sq.title,
    pattern: sq.info.pattern,
    columns,
    parameters,
    ...(parameterSchemas.length > 0 ? { parameterSchemas } : {}),
    ...(parameterExtractionFailed ? { parameterExtractionFailed: true } : {}),
    ...(preFilters ? { preFilters } : {}),
  };
  if (sq.description !== undefined) {
    entry.description = sq.description;
  }
  return [entry];
}

export async function extractTDSServicesFromDataProductSource(
  source: DataProductSchemaSource,
): Promise<TDSServiceSchema[]> {
  const { productPath, accessPointGroups, artifact, sampleQueries } = source;
  const services: TDSServiceSchema[] = [];

  const sampleQueryServices = await Promise.all(
    sampleQueries.map((sq) =>
      buildSampleQueryService(sq, source.graphManagerState),
    ),
  );
  services.push(...sampleQueryServices.flat());

  const columnMetadataLookup = buildColumnMetadataLookup(sampleQueries);
  for (const apg of accessPointGroups) {
    const groupTitle = apg.title ?? apg.id;
    const artifactApg = artifact?.accessPointGroups.find(
      (ag) => ag.id === apg.id,
    );
    for (const accessPointSource of apg.accessPoints) {
      const entry = buildAccessPointService(
        accessPointSource,
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

  if (source.elementDocs.length > 0) {
    const propIndex = buildPropertyDocIndex(source.elementDocs);
    if (propIndex.size > 0) {
      for (const svc of services) {
        enrichColumnsFromElementDocs(svc.columns, propIndex);
      }
    }
  }

  return services;
}

/**
 * Adapts an open product viewer to {@link extractTDSServicesFromDataProductSource},
 * carrying over relation types and sample rows the viewer resolved from the engine.
 */
export async function extractTDSServicesFromDataProduct(
  viewerState: DataProductViewerState,
): Promise<TDSServiceSchema[]> {
  return extractTDSServicesFromDataProductSource({
    productPath: viewerState.product.path,
    accessPointGroups: viewerState.apgStates.map((apgState) => ({
      id: apgState.apg.id,
      title: apgState.apg.title,
      accessPoints: apgState.accessPointStates.map((apState) => ({
        accessPoint: apState.accessPoint,
        relationType: apState.relationType,
        relationElement: apState.relationElement,
      })),
    })),
    artifact: viewerState.dataProductArtifact,
    sampleQueries: viewerState.getSampleQueries(),
    elementDocs:
      viewerState.nativeModelAccessDocumentationState?.elementDocs ?? [],
    graphManagerState: viewerState.graphManagerState,
  });
}

interface AccessPointRelationshipCandidate {
  left: TDSServiceSchema;
  right: TDSServiceSchema;
  leftIndex: number;
  rightIndex: number;
  joinKeys: Set<string>;
}

// Maps each lowercased column name to the access points that carry it.
function buildColumnPostings(
  apServices: TDSServiceSchema[],
): Map<string, number[]> {
  const postings = new Map<string, number[]>();
  for (const [index, service] of apServices.entries()) {
    const seen = new Set<string>();
    for (const column of service.columns) {
      const key = column.name.toLowerCase();
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      const carriers = postings.get(key);
      if (carriers) {
        carriers.push(index);
      } else {
        postings.set(key, [index]);
      }
    }
  }
  return postings;
}

/**
 * Keeps the columns selective enough to be a join key, most selective first.
 * Below {@link UNIVERSAL_COLUMN_MIN_ACCESS_POINTS} every shared column qualifies.
 */
function selectJoinKeyPostings(
  apServices: TDSServiceSchema[],
): [string, number[]][] {
  const maxCarriers =
    apServices.length < UNIVERSAL_COLUMN_MIN_ACCESS_POINTS
      ? apServices.length
      : apServices.length * UNIVERSAL_COLUMN_SHARE;
  return Array.from(buildColumnPostings(apServices).entries())
    .filter(
      ([, carriers]) => carriers.length > 1 && carriers.length <= maxCarriers,
    )
    .sort(([, a], [, b]) => a.length - b.length);
}

function isSameAccessPointGroup(
  left: TDSServiceSchema,
  right: TDSServiceSchema,
): boolean {
  return (
    left.accessPointGroupTitle !== undefined &&
    left.accessPointGroupTitle === right.accessPointGroupTitle
  );
}

// Records that two access points share one more join key.
function registerJoinKey(
  byPair: Map<string, AccessPointRelationshipCandidate>,
  apServices: TDSServiceSchema[],
  joinKey: string,
  leftIndex: number,
  rightIndex: number,
): void {
  const pairKey = `${leftIndex}|${rightIndex}`;
  const candidate = byPair.get(pairKey);
  if (candidate) {
    candidate.joinKeys.add(joinKey);
    return;
  }
  byPair.set(pairKey, {
    left: guaranteeNonNullable(apServices[leftIndex]),
    right: guaranteeNonNullable(apServices[rightIndex]),
    leftIndex,
    rightIndex,
    joinKeys: new Set([joinKey]),
  });
}

// Enumerates pairs only within each join key, so the candidate count is bounded
// by key selectivity rather than by the number of access points.
function collectRelationshipCandidates(
  apServices: TDSServiceSchema[],
): AccessPointRelationshipCandidate[] {
  const byPair = new Map<string, AccessPointRelationshipCandidate>();
  for (const [joinKey, carriers] of selectJoinKeyPostings(apServices)) {
    for (const [position, leftIndex] of carriers.entries()) {
      for (const rightIndex of carriers.slice(position + 1)) {
        registerJoinKey(byPair, apServices, joinKey, leftIndex, rightIndex);
      }
    }
    if (byPair.size >= MAX_CANDIDATE_RELATIONSHIP_PAIRS) {
      break;
    }
  }
  return Array.from(byPair.values());
}

// Access points in one group describe the same universe, so they are the
// likelier join; among equals, more shared keys is the stronger hint.
function compareRelationshipCandidates(
  a: AccessPointRelationshipCandidate,
  b: AccessPointRelationshipCandidate,
): number {
  const aSameGroup = isSameAccessPointGroup(a.left, a.right);
  const bSameGroup = isSameAccessPointGroup(b.left, b.right);
  if (aSameGroup !== bSameGroup) {
    return aSameGroup ? -1 : 1;
  }
  return b.joinKeys.size - a.joinKeys.size;
}

/**
 * Lists the keys that made the pair a candidate ahead of the columns the two
 * access points merely happen to share, so the hint names a usable key.
 */
function orderSharedColumns(
  candidate: AccessPointRelationshipCandidate,
): string[] {
  const shared = sharedColumnNames(candidate.right, candidate.left);
  const isJoinKey = (name: string): boolean =>
    candidate.joinKeys.has(name.toLowerCase());
  return [
    ...shared.filter(isJoinKey),
    ...shared.filter((name) => !isJoinKey(name)),
  ].slice(0, MAX_SHARED_COLUMNS_PER_RELATIONSHIP);
}

/**
 * Infers cross-access-point relationships from selective shared columns.
 * Capped: every entry is rendered into the metadata prompt.
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
  return collectRelationshipCandidates(apServices)
    .sort(compareRelationshipCandidates)
    .slice(0, MAX_ACCESS_POINT_RELATIONSHIPS)
    .sort((a, b) => a.leftIndex - b.leftIndex || a.rightIndex - b.rightIndex)
    .map((candidate) => ({
      leftAccessPoint: candidate.left.title,
      rightAccessPoint: candidate.right.title,
      sharedColumns: orderSharedColumns(candidate),
    }));
}
