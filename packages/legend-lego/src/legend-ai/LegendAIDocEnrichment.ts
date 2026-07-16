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
  type Multiplicity,
  extractElementNameFromPath,
  PRIMITIVE_TYPE,
} from '@finos/legend-graph';
import {
  ClassDocumentationEntry,
  AssociationDocumentationEntry,
  EnumerationDocumentationEntry,
  PropertyDocumentationEntry,
  type NormalizedDocumentationEntry,
} from '../model-documentation/index.js';
import type {
  TDSColumnSchema,
  TDSServiceSchema,
  TDSServicePreFilter,
  LegendAIServiceRelationship,
  LegendAIModelContext,
  LegendAIModelEntity,
  LegendAIModelAssociation,
  LegendAIModelProperty,
} from './LegendAITypes.js';
import type {
  LegendAIEnrichedBusinessContext,
  LegendAIBusinessContextProperty,
  LegendAIAdditionalNlModelContext,
} from './LegendAI_LegendApplicationPlugin_Extension.js';

/**
 * Builds a lookup map from lowercase property name to its documentation entry.
 * Used to enrich TDS columns with business descriptions and nullability
 * from the PURE model's class properties.
 */
export function buildPropertyDocIndex(
  elementDocs: NormalizedDocumentationEntry[],
): Map<string, PropertyDocumentationEntry> {
  const index = new Map<string, PropertyDocumentationEntry>();
  for (const entry of elementDocs) {
    if (
      entry.elementEntry instanceof ClassDocumentationEntry &&
      entry.entry instanceof PropertyDocumentationEntry
    ) {
      if (entry.entry.name) {
        index.set(entry.entry.name.toLowerCase(), entry.entry);
      }
    }
  }
  return index;
}

/**
 * Enriches TDS columns with documentation and nullability from model
 * class property docs. Matches columns to properties case-insensitively.
 */
export function enrichColumnsFromElementDocs(
  columns: TDSColumnSchema[],
  propIndex: Map<string, PropertyDocumentationEntry>,
): void {
  for (const col of columns) {
    const prop = propIndex.get(col.name.toLowerCase());
    if (prop) {
      if (!col.documentation && prop.docs.length > 0) {
        col.documentation = prop.docs.join('; ');
      }
      if (col.nullable === undefined && prop.multiplicity) {
        col.nullable = prop.multiplicity.lowerBound === 0;
      }
    }
  }
}

function extractClassNamesFromPattern(pattern: string): string[] {
  return pattern
    .split('/')
    .filter(Boolean)
    .flatMap((part) => {
      const match = /^get(?<name>.+)$/i.exec(part);
      return match?.groups?.name ? [match.groups.name] : [part];
    });
}

function formatMultiplicity(multiplicity: Multiplicity | undefined): string {
  if (!multiplicity) {
    return '*';
  }
  const upper =
    multiplicity.upperBound === undefined ? '*' : `${multiplicity.upperBound}`;
  return `${multiplicity.lowerBound}..${upper}`;
}

function extractUniqueAssociations(
  elementDocs: NormalizedDocumentationEntry[],
): Map<string, AssociationDocumentationEntry> {
  const assocEntries = elementDocs
    .map((e) => e.elementEntry)
    .filter(
      (e): e is AssociationDocumentationEntry =>
        e instanceof AssociationDocumentationEntry,
    );
  const uniqueAssocs = new Map<string, AssociationDocumentationEntry>();
  for (const a of assocEntries) {
    if (!uniqueAssocs.has(a.path)) {
      uniqueAssocs.set(a.path, a);
    }
  }
  return uniqueAssocs;
}

function addAdjacencyEdge(
  adjacency: Map<string, { target: string; multiplicity: string }[]>,
  from: string,
  to: string,
  multiplicity: string,
): void {
  let edges = adjacency.get(from);
  if (!edges) {
    edges = [];
    adjacency.set(from, edges);
  }
  edges.push({ target: to, multiplicity });
}

function buildAssociationAdjacency(
  uniqueAssocs: Map<string, AssociationDocumentationEntry>,
): Map<string, { target: string; multiplicity: string }[]> {
  const adjacency = new Map<
    string,
    { target: string; multiplicity: string }[]
  >();
  for (const assoc of uniqueAssocs.values()) {
    if (assoc.properties.length === 2) {
      const [propA, propB] = assoc.properties;
      if (propA && propB) {
        const nameA = propA.name.toLowerCase();
        const nameB = propB.name.toLowerCase();
        addAdjacencyEdge(
          adjacency,
          nameA,
          nameB,
          formatMultiplicity(propB.multiplicity),
        );
        addAdjacencyEdge(
          adjacency,
          nameB,
          nameA,
          formatMultiplicity(propA.multiplicity),
        );
      }
    }
  }
  return adjacency;
}

function findSharedColumns(
  svcA: TDSServiceSchema,
  svcB: TDSServiceSchema,
): string[] {
  const colsA = new Set(svcA.columns.map((c) => c.name.toLowerCase()));
  return svcB.columns
    .filter((c) => colsA.has(c.name.toLowerCase()))
    .map((c) => c.name);
}

function findViaConnectionFromClass(
  clsA: string,
  classNamesB: string[],
  adjacency: Map<string, { target: string; multiplicity: string }[]>,
): { viaEntity: string; leftMult: string; rightMult: string } | undefined {
  const edgesA = adjacency.get(clsA.toLowerCase());
  if (!edgesA) {
    return undefined;
  }
  for (const edgeA of edgesA) {
    const edgesFromVia = adjacency.get(edgeA.target);
    if (!edgesFromVia) {
      continue;
    }
    for (const clsB of classNamesB) {
      const edgeB = edgesFromVia.find((e) => e.target === clsB.toLowerCase());
      if (edgeB) {
        return {
          viaEntity: edgeA.target,
          leftMult: edgeA.multiplicity,
          rightMult: edgeB.multiplicity,
        };
      }
    }
  }
  return undefined;
}

function findViaRelationship(
  svcA: TDSServiceSchema,
  svcB: TDSServiceSchema,
  adjacency: Map<string, { target: string; multiplicity: string }[]>,
): LegendAIServiceRelationship | undefined {
  const classNamesA = extractClassNamesFromPattern(svcA.pattern);
  const classNamesB = extractClassNamesFromPattern(svcB.pattern);
  for (const clsA of classNamesA) {
    const via = findViaConnectionFromClass(clsA, classNamesB, adjacency);
    if (via) {
      return {
        leftService: svcA.title,
        rightService: svcB.title,
        joinColumns: findSharedColumns(svcA, svcB),
        viaEntity: via.viaEntity,
        leftCardinality: via.leftMult,
        rightCardinality: via.rightMult,
      };
    }
  }
  return undefined;
}

function findDirectRelationship(
  svcA: TDSServiceSchema,
  svcB: TDSServiceSchema,
  adjacency: Map<string, { target: string; multiplicity: string }[]>,
): LegendAIServiceRelationship | undefined {
  const classNamesA = extractClassNamesFromPattern(svcA.pattern);
  const classNamesB = extractClassNamesFromPattern(svcB.pattern);
  for (const clsA of classNamesA) {
    const edges = adjacency.get(clsA.toLowerCase());
    if (!edges) {
      continue;
    }
    for (const clsB of classNamesB) {
      const edge = edges.find((e) => e.target === clsB.toLowerCase());
      if (edge) {
        return {
          leftService: svcA.title,
          rightService: svcB.title,
          joinColumns: findSharedColumns(svcA, svcB),
        };
      }
    }
  }
  return undefined;
}

/**
 * Infers cross-service relationships from association documentation entries.
 *
 * Associations in the PURE model define how classes connect (e.g.,
 * `Trade ──(1:*)──→ Instrument`). By finding associations that link
 * classes backing different services, we determine:
 * - Which services share a common parent entity (the via entity)
 * - The cardinality of each side (1:1, 1:*, etc.)
 * - Which columns to JOIN on (shared column names)
 *
 * Used by both Data Space and Data Product AI integrations.
 */
export function inferServiceRelationshipsFromAssociations(
  services: TDSServiceSchema[],
  elementDocs: NormalizedDocumentationEntry[],
): LegendAIServiceRelationship[] {
  const uniqueAssocs = extractUniqueAssociations(elementDocs);
  const adjacency = buildAssociationAdjacency(uniqueAssocs);
  const relationships: LegendAIServiceRelationship[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < services.length; i++) {
    for (let j = i + 1; j < services.length; j++) {
      const svcA = services[i];
      const svcB = services[j];
      if (!svcA || !svcB) {
        continue;
      }
      const key = `${svcA.title}|${svcB.title}`;
      if (seen.has(key)) {
        continue;
      }
      const relationship =
        findViaRelationship(svcA, svcB, adjacency) ??
        findDirectRelationship(svcA, svcB, adjacency);
      if (relationship) {
        seen.add(key);
        relationships.push(relationship);
      }
    }
  }
  return relationships;
}

// ────────────────────────────────────────────────────────────────────────────
// Lambda pre-filter extraction
// ────────────────────────────────────────────────────────────────────────────

interface LambdaNode {
  _type?: string;
  function?: string;
  parameters?: LambdaNode[];
  property?: string;
  name?: string;
  value?: string | number | boolean;
  body?: LambdaNode[];
  values?: LambdaNode[];
}

function isLambdaNode(value: unknown): value is LambdaNode {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function collectPropertyPath(node: LambdaNode): string | undefined {
  if (node._type !== 'property' || !node.property) {
    return undefined;
  }
  const params = node.parameters;
  if (!params || params.length === 0) {
    return node.property;
  }
  const firstParam = params[0];
  if (!firstParam) {
    return node.property;
  }
  if (firstParam._type === 'var') {
    return node.property;
  }
  const parentPath = collectPropertyPath(firstParam);
  if (parentPath) {
    return `${parentPath}.${node.property}`;
  }
  return node.property;
}

function extractLiteralValue(
  node: LambdaNode,
): string | number | boolean | undefined {
  if (
    node._type === 'string' &&
    (typeof node.value === 'string' || typeof node.value === 'number')
  ) {
    return node.value;
  }
  if (node._type === 'integer' && typeof node.value === 'number') {
    return node.value;
  }
  if (node._type === 'float' && typeof node.value === 'number') {
    return node.value;
  }
  if (node._type === 'boolean' && typeof node.value === 'boolean') {
    return node.value;
  }
  if (node._type === 'strictDate' && typeof node.value === 'string') {
    return node.value;
  }
  return undefined;
}

function tryExtractEqualFilter(
  node: LambdaNode,
): TDSServicePreFilter | undefined {
  if (node.parameters?.length !== 2) {
    return undefined;
  }
  const [left, right] = node.parameters;
  if (!left || !right) {
    return undefined;
  }
  const propPath = collectPropertyPath(left);
  const literal = extractLiteralValue(right);
  if (propPath && literal !== undefined) {
    return { property: propPath, operator: 'equal', value: literal };
  }
  return undefined;
}

function tryExtractUnaryFilter(
  node: LambdaNode,
  operator: 'isEmpty' | 'isNotEmpty',
): TDSServicePreFilter | undefined {
  if (node.parameters?.length !== 1) {
    return undefined;
  }
  const [arg] = node.parameters;
  const propPath = arg ? collectPropertyPath(arg) : undefined;
  if (propPath) {
    return { property: propPath, operator };
  }
  return undefined;
}

function extractFiltersFromExpression(
  node: LambdaNode,
  results: TDSServicePreFilter[],
): void {
  if (node._type !== 'func' || !node.parameters) {
    return;
  }

  if (node.function === 'equal') {
    const filter = tryExtractEqualFilter(node);
    if (filter) {
      results.push(filter);
      return;
    }
  }

  if (node.function === 'isEmpty' || node.function === 'isNotEmpty') {
    const filter = tryExtractUnaryFilter(node, node.function);
    if (filter) {
      results.push(filter);
      return;
    }
  }

  for (const param of node.parameters) {
    extractFiltersFromExpression(param, results);
  }
}

function extractFiltersFromFilterCall(
  filterLambda: LambdaNode,
  results: TDSServicePreFilter[],
): void {
  const body = filterLambda.body;
  if (!body || !Array.isArray(body)) {
    return;
  }
  for (const expr of body) {
    extractFiltersFromExpression(expr, results);
  }
}

function processFilterNode(
  node: LambdaNode,
  results: TDSServicePreFilter[],
): void {
  const params = node.parameters;
  if (params?.length === 2) {
    const filterLambdaParam = params[1];
    if (filterLambdaParam?._type === 'lambda') {
      extractFiltersFromFilterCall(filterLambdaParam, results);
    }
  }
  if (params) {
    walkLambdaBody(params, results);
  }
}

function walkLambdaBody(
  nodes: unknown[],
  results: TDSServicePreFilter[],
): void {
  for (const rawNode of nodes) {
    if (!isLambdaNode(rawNode)) {
      continue;
    }
    if (rawNode._type === 'func' && rawNode.function === 'filter') {
      processFilterNode(rawNode, results);
    } else if (rawNode._type === 'func' && rawNode.parameters) {
      walkLambdaBody(rawNode.parameters, results);
    }
  }
}

function processPostFilterNode(
  rawNode: LambdaNode,
  results: TDSServicePreFilter[],
): void {
  if (rawNode.function === 'filter' && rawNode.parameters?.length === 2) {
    const innerLambda = rawNode.parameters[1];
    if (innerLambda?._type === 'lambda' && innerLambda.body) {
      for (const bodyNode of innerLambda.body) {
        collectIsNotNullChecks(bodyNode, results);
      }
    }
    extractIsNotNullPostFilters(rawNode.parameters, results);
  } else if (rawNode.parameters) {
    extractIsNotNullPostFilters(rawNode.parameters, results);
  }
}

function extractIsNotNullPostFilters(
  nodes: unknown[],
  results: TDSServicePreFilter[],
): void {
  for (const rawNode of nodes) {
    if (!isLambdaNode(rawNode)) {
      continue;
    }
    if (rawNode._type !== 'func') {
      continue;
    }
    processPostFilterNode(rawNode, results);
  }
}

function collectIsNotNullChecks(
  node: LambdaNode,
  results: TDSServicePreFilter[],
): void {
  if (node._type === 'property' && node.property === 'isNotNull') {
    const colNameNode = node.parameters?.[1];
    if (
      colNameNode?._type === 'string' &&
      typeof colNameNode.value === 'string'
    ) {
      results.push({
        property: colNameNode.value,
        operator: 'isNotNull',
      });
    }
    return;
  }
  if (node._type === 'func' && node.function === 'and' && node.parameters) {
    for (const param of node.parameters) {
      collectIsNotNullChecks(param, results);
    }
  }
}

/**
 * Extracts hardcoded pre-filter constraints from a raw lambda body.
 *
 * Walks the lambda JSON tree to find:
 * - `equal` comparisons with literal values (e.g. `fsymId == 'D7HG0X-S'`)
 * - `isEmpty` checks (e.g. `consEndDate->isEmpty()`)
 * - `isNotNull` post-projection TDS row checks (e.g. `row.isNotNull('Fe Mean')`)
 *
 * The `rawLambdaBody` parameter is `RawLambda.body` — the raw JSON array
 * from the PURE protocol.
 */
export function extractLambdaPreFilters(
  rawLambdaBody: object | undefined,
): TDSServicePreFilter[] {
  if (!rawLambdaBody || !Array.isArray(rawLambdaBody)) {
    return [];
  }
  const results: TDSServicePreFilter[] = [];
  walkLambdaBody(rawLambdaBody, results);
  extractIsNotNullPostFilters(rawLambdaBody, results);
  return results;
}

/**
 * Formats pre-filter constraints into a human-readable summary for LLM context.
 * This generates a concise description of what's hardcoded in the service lambda
 * so the AI avoids generating contradictory WHERE clauses.
 */
export function formatPreFiltersForContext(
  preFilters: TDSServicePreFilter[],
): string {
  if (preFilters.length === 0) {
    return '';
  }
  const parts: string[] = [];
  for (const pf of preFilters) {
    const shortProp = pf.property.includes('.')
      ? (pf.property.split('.').pop() ?? pf.property)
      : pf.property;
    switch (pf.operator) {
      case 'equal':
        parts.push(`${shortProp} = '${String(pf.value)}'`);
        break;
      case 'isEmpty':
        parts.push(`${shortProp} IS NULL (always)`);
        break;
      case 'isNotEmpty':
        parts.push(`${shortProp} IS NOT NULL (always)`);
        break;
      case 'isNotNull':
        parts.push(`${shortProp} IS NOT NULL (post-filter)`);
        break;
      default:
        break;
    }
  }
  return `Pre-applied filters: ${parts.join('; ')}`;
}

// ────────────────────────────────────────────────────────────────────────────
// Model context extraction from DataSpace elementDocs
// ────────────────────────────────────────────────────────────────────────────

/**
 * Extracts a structured model context from DataSpace elementDocs.
 * The resulting {@link LegendAIModelContext} provides all class entities,
 * associations, and enumerations needed for local entity resolution in the
 * orchestrator flow — eliminating the need for a marketplace search API call.
 *
 * Only applicable to DataSpaces (not DataProducts, which lack elementDocs).
 */
function collectClassEntities(
  classMap: Map<string, ClassDocumentationEntry>,
): LegendAIModelEntity[] {
  return Array.from(classMap.values()).map((cls) => {
    const properties: LegendAIModelProperty[] = cls.properties.map((prop) => {
      const upperBound = prop.multiplicity?.upperBound;
      return {
        name: prop.name,
        type: prop.type ?? 'Unknown',
        isCollection: upperBound === undefined || upperBound > 1,
        isOptional: (prop.multiplicity?.lowerBound ?? 0) === 0,
      };
    });
    const entity: LegendAIModelEntity = {
      path: cls.path,
      name: cls.name,
      properties,
    };
    if (cls.docs.length > 0) {
      entity.description = cls.docs.join('; ');
    }
    return entity;
  });
}

function collectAssociations(
  assocMap: Map<string, AssociationDocumentationEntry>,
): LegendAIModelAssociation[] {
  const associations: LegendAIModelAssociation[] = [];
  for (const assoc of assocMap.values()) {
    if (assoc.properties.length !== 2) {
      continue;
    }
    const [propA, propB] = assoc.properties;
    if (propA?.type && propB?.type) {
      associations.push({
        name: assoc.name,
        leftEntity: propA.type,
        leftProperty: propA.name,
        rightEntity: propB.type,
        rightProperty: propB.name,
      });
    }
  }
  return associations;
}

function buildUniqueEntryMap<T extends { path: string }>(
  elementDocs: NormalizedDocumentationEntry[],
  EntryClass: new (...args: never[]) => T,
): Map<string, T> {
  const map = new Map<string, T>();
  for (const entry of elementDocs) {
    if (
      entry.elementEntry instanceof EntryClass &&
      !map.has(entry.elementEntry.path)
    ) {
      map.set(entry.elementEntry.path, entry.elementEntry);
    }
  }
  return map;
}

export function extractModelContext(
  elementDocs: NormalizedDocumentationEntry[],
): LegendAIModelContext {
  const entities = collectClassEntities(
    buildUniqueEntryMap(elementDocs, ClassDocumentationEntry),
  );
  const associations = collectAssociations(
    buildUniqueEntryMap(elementDocs, AssociationDocumentationEntry),
  );
  const enumMap = buildUniqueEntryMap(
    elementDocs,
    EnumerationDocumentationEntry,
  );
  const enumerations =
    enumMap.size > 0
      ? Array.from(enumMap.values()).map((e) => ({
          path: e.path,
          name: e.name,
          values: e.enumValues.map((v) => v.name),
        }))
      : undefined;

  const result: LegendAIModelContext = { entities, associations };
  if (enumerations) {
    result.enumerations = enumerations;
  }
  return result;
}

// ────────────────────────────────────────────────────────────────────────────
// Enriched business context for orchestrator payload
// ────────────────────────────────────────────────────────────────────────────

const MAX_BUSINESS_CONTEXT_RELATED_PROPERTIES = 10;

function buildRootEntityProperties(
  rootEntityObj: LegendAIModelEntity | undefined,
  modelContext: LegendAIModelContext,
): LegendAIBusinessContextProperty[] {
  if (!rootEntityObj) {
    return [];
  }
  return rootEntityObj.properties.map((prop) => {
    const entry: LegendAIBusinessContextProperty = { propertyName: prop.name };
    const enumMatch = modelContext.enumerations?.find(
      (e) => e.path === prop.type,
    );
    if (enumMatch) {
      entry.probablePropertyValues = enumMatch.values;
      entry.matchType = ['enumeration'];
    } else if (isPrimitiveType(prop.type)) {
      entry.matchType = [prop.type];
    } else {
      entry.matchType = ['entity'];
    }
    return entry;
  });
}

function buildRelatedEntityProperties(
  relatedEntities: string[],
  entityMap: Map<string, LegendAIModelEntity>,
): LegendAIBusinessContextProperty[] {
  const properties: LegendAIBusinessContextProperty[] = [];
  let relatedPropCount = 0;
  for (const relPath of relatedEntities) {
    if (relatedPropCount >= MAX_BUSINESS_CONTEXT_RELATED_PROPERTIES) {
      break;
    }
    const relEntity = entityMap.get(relPath);
    if (!relEntity) {
      continue;
    }
    for (const prop of relEntity.properties) {
      if (relatedPropCount >= MAX_BUSINESS_CONTEXT_RELATED_PROPERTIES) {
        break;
      }
      if (isPrimitiveType(prop.type)) {
        properties.push({
          propertyName: `${relEntity.name}.${prop.name}`,
          matchType: [prop.type],
        });
        relatedPropCount++;
      }
    }
  }
  return properties;
}

function buildRootEntityNlHints(
  rootEntity: string,
  rootEntityObj: LegendAIModelEntity | undefined,
  modelContext: LegendAIModelContext,
): LegendAIAdditionalNlModelContext[] {
  if (!rootEntityObj) {
    return [];
  }
  const entries: LegendAIAdditionalNlModelContext[] = [];
  if (rootEntityObj.description) {
    entries.push({
      id: rootEntity,
      description: rootEntityObj.description,
      category: 'root_entity',
    });
  }
  if (rootEntityObj.isRootMapped) {
    entries.push({
      id: rootEntity,
      description: `${rootEntityObj.name} is a directly mapped root entity — it can be queried directly without navigating from another entity`,
      category: 'mapping_hint',
    });
  }
  if (rootEntityObj.isQueryable) {
    const matchingExec = modelContext.executables?.find(
      (ex) => ex.rootEntityPath === rootEntity,
    );
    const execHint = matchingExec ? ` (service: "${matchingExec.title}")` : '';
    entries.push({
      id: rootEntity,
      description: `${rootEntityObj.name} is queryable via a service executable${execHint} — this entity can be queried with .all()`,
      category: 'queryable_hint',
    });
  }
  return entries;
}

function buildAssociationNlHints(
  rootEntity: string,
  relatedEntities: string[],
  modelContext: LegendAIModelContext,
): LegendAIAdditionalNlModelContext[] {
  const involvedPaths = new Set([rootEntity, ...relatedEntities]);
  return modelContext.associations
    .filter(
      (assoc) =>
        involvedPaths.has(assoc.leftEntity) ||
        involvedPaths.has(assoc.rightEntity),
    )
    .map((assoc) => ({
      id: assoc.name,
      description: `${extractElementNameFromPath(assoc.leftEntity)} has property '${assoc.leftProperty}' linking to ${extractElementNameFromPath(assoc.rightEntity)}, and ${extractElementNameFromPath(assoc.rightEntity)} has property '${assoc.rightProperty}' linking back to ${extractElementNameFromPath(assoc.leftEntity)}`,
      category: 'association' as const,
    }));
}

function buildExecutableNlHints(
  rootEntity: string,
  rootEntityObj: LegendAIModelEntity | undefined,
  modelContext: LegendAIModelContext,
): LegendAIAdditionalNlModelContext[] {
  if (!modelContext.executables) {
    return [];
  }
  const entries: LegendAIAdditionalNlModelContext[] = [];
  const matchingExecs = modelContext.executables.filter(
    (ex) => ex.rootEntityPath === rootEntity,
  );
  for (const exec of matchingExecs) {
    if (exec.queryTemplate) {
      entries.push({
        id: `query_template:${exec.title}`,
        description: `Example Pure query for ${rootEntityObj?.name ?? rootEntity}: ${exec.queryTemplate}`,
        category: 'query_template',
      });
    }
    if (exec.requiredParameters && exec.requiredParameters.length > 0) {
      const paramList = exec.requiredParameters
        .map((p) => `${p.name} (${p.type})`)
        .join(', ');
      entries.push({
        id: `required_params:${exec.title}`,
        description: `This entity requires the following filter parameters: ${paramList}. The generated query MUST include filters for these parameters.`,
        category: 'required_parameters',
      });
    }
    if (exec.columnPropertyMappings && exec.columnPropertyMappings.length > 0) {
      entries.push({
        id: `column_mappings:${exec.title}`,
        description: `Property name mappings (human-readable → model property): ${exec.columnPropertyMappings
          .slice(0, 20)
          .map((m) => `"${m.columnName}" → ${m.propertyPath}`)
          .join(', ')}`,
        category: 'column_mappings',
      });
    }
  }
  const execSummary = modelContext.executables
    .map((ex) => {
      const entityName = extractElementNameFromPath(ex.rootEntityPath);
      const paramHint =
        ex.requiredParameters && ex.requiredParameters.length > 0
          ? ` (requires: ${ex.requiredParameters.map((p) => p.name).join(', ')})`
          : '';
      return `"${ex.title}" → ${entityName}${paramHint}`;
    })
    .join('; ');
  entries.push({
    id: 'executable_summary',
    description: `Available service executables: ${execSummary}`,
    category: 'executable_summary',
  });
  return entries;
}

function findCrossClassPropertyHints(
  entity: LegendAIModelEntity,
  rootEntityObj: LegendAIModelEntity,
  rootPropNames: Set<string>,
  questionTokens: Set<string>,
  questionLower: string,
): string[] {
  const hints: string[] = [];
  for (const prop of entity.properties) {
    const propTokens = splitIdentifierTokens(prop.name).filter(
      (t) => t.length > 2,
    );
    const matchScore = propTokens.filter(
      (t) =>
        questionTokens.has(t) || (t.length >= 4 && questionLower.includes(t)),
    ).length;
    if (matchScore < 1 || (matchScore < 2 && propTokens.length > 2)) {
      continue;
    }
    const rootHasSimilar = rootEntityObj.properties.some((rp) => {
      const rpTokens = splitIdentifierTokens(rp.name).filter(
        (t) => t.length > 2,
      );
      return (
        rpTokens.filter((t) => propTokens.includes(t)).length >=
        Math.max(1, propTokens.length - 1)
      );
    });
    if (!rootHasSimilar && !rootPropNames.has(prop.name.toLowerCase())) {
      hints.push(
        `"${prop.name}" exists on ${entity.name} but NOT on ${rootEntityObj.name}`,
      );
    }
  }
  return hints;
}

function buildCrossClassNlHints(
  question: string,
  rootEntity: string,
  rootEntityObj: LegendAIModelEntity,
  modelContext: LegendAIModelContext,
): LegendAIAdditionalNlModelContext[] {
  const questionTokens = new Set(tokenizeText(question));
  const rootPropNames = new Set(
    rootEntityObj.properties.map((p) => p.name.toLowerCase()),
  );
  const questionLower = question.toLowerCase();
  const crossClassHints: string[] = [];
  for (const entity of modelContext.entities) {
    if (entity.path === rootEntity) {
      continue;
    }
    crossClassHints.push(
      ...findCrossClassPropertyHints(
        entity,
        rootEntityObj,
        rootPropNames,
        questionTokens,
        questionLower,
      ),
    );
  }
  if (crossClassHints.length === 0) {
    return [];
  }
  return [
    {
      id: 'cross_class_property_warning',
      description: `WARNING: The following properties mentioned in the question are not available on the resolved entity ${rootEntityObj.name}: ${crossClassHints.slice(0, 5).join('; ')}. Please use only properties available on ${rootEntityObj.name}.`,
      category: 'cross_class_warning',
    },
  ];
}

function buildNlContextEntries(
  question: string,
  rootEntity: string,
  rootEntityObj: LegendAIModelEntity | undefined,
  relatedEntities: string[],
  modelContext: LegendAIModelContext,
  entityMap: Map<string, LegendAIModelEntity>,
): LegendAIAdditionalNlModelContext[] {
  const entries: LegendAIAdditionalNlModelContext[] = [
    ...buildRootEntityNlHints(rootEntity, rootEntityObj, modelContext),
  ];
  if (modelContext.dataspaceDescription) {
    const shortDesc = modelContext.dataspaceDescription
      .split('\n')
      .filter((l) => !l.startsWith('#') && l.trim().length > 0)
      .slice(0, 3)
      .join(' ')
      .slice(0, 500);
    if (shortDesc.length > 0) {
      entries.push({
        id: 'dataspace',
        description: shortDesc,
        category: 'product_context',
      });
    }
  }
  for (const relPath of relatedEntities) {
    const relEntity = entityMap.get(relPath);
    if (relEntity?.description) {
      entries.push({
        id: relPath,
        description: relEntity.description,
        category: 'related_entity',
      });
    }
  }
  entries.push(
    ...buildAssociationNlHints(rootEntity, relatedEntities, modelContext),
    ...buildExecutableNlHints(rootEntity, rootEntityObj, modelContext),
  );
  if (rootEntityObj) {
    entries.push(
      ...buildCrossClassNlHints(
        question,
        rootEntity,
        rootEntityObj,
        modelContext,
      ),
    );
  }
  return entries;
}

export function buildEnrichedBusinessContext(
  question: string,
  rootEntity: string,
  relatedEntities: string[],
  modelContext: LegendAIModelContext,
): LegendAIEnrichedBusinessContext {
  const entityMap = new Map(modelContext.entities.map((e) => [e.path, e]));
  const rootEntityObj = entityMap.get(rootEntity);
  const properties = [
    ...buildRootEntityProperties(rootEntityObj, modelContext),
    ...buildRelatedEntityProperties(relatedEntities, entityMap),
  ];
  const additionalNlModelContext = buildNlContextEntries(
    question,
    rootEntity,
    rootEntityObj,
    relatedEntities,
    modelContext,
    entityMap,
  );
  const context: LegendAIEnrichedBusinessContext = {
    naturalLanguageQuery: question,
  };
  if (properties.length > 0 || additionalNlModelContext.length > 0) {
    context.businessContextMatch = {};
    if (properties.length > 0) {
      context.businessContextMatch.properties = properties;
    }
    if (additionalNlModelContext.length > 0) {
      context.businessContextMatch.additionalNlModelContext =
        additionalNlModelContext;
    }
  }
  return context;
}

const PRIMITIVE_TYPE_NAMES: ReadonlySet<string> = new Set([
  PRIMITIVE_TYPE.STRING,
  PRIMITIVE_TYPE.INTEGER,
  PRIMITIVE_TYPE.FLOAT,
  PRIMITIVE_TYPE.DECIMAL,
  PRIMITIVE_TYPE.BOOLEAN,
  PRIMITIVE_TYPE.DATE,
  PRIMITIVE_TYPE.STRICTDATE,
  PRIMITIVE_TYPE.DATETIME,
  PRIMITIVE_TYPE.NUMBER,
]);

function isPrimitiveType(type: string): boolean {
  return PRIMITIVE_TYPE_NAMES.has(type);
}

// Acronym boundary regex (bounded repetition to prevent catastrophic backtracking
// on adversarial inputs). Inserts a space before the last uppercase letter of an
// acronym when followed by a lowercase letter — e.g. "XMLParser" → "XML Parser".
const ACRONYM_BOUNDARY_PATTERN = /(?<acr>[A-Z]{1,32})(?<head>[A-Z][a-z])/g;

/**
 * Splits a camelCase, PascalCase, or snake_case identifier into lowercase
 * tokens for fuzzy matching. e.g. "taxIDTypeCD" → ["tax", "id", "type", "cd"],
 * "FISCAL_YEAR_START" → ["fiscal", "year", "start"].
 */
export function splitIdentifierTokens(name: string): string[] {
  return name
    .replaceAll(/(?<lower>[a-z])(?<upper>[A-Z])/g, '$<lower> $<upper>')
    .replaceAll(/[_\-./]+/g, ' ')
    .replaceAll(ACRONYM_BOUNDARY_PATTERN, '$<acr> $<head>')
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

const TEXT_TOKEN_SPLIT = /[\s,.:;!?'"()\-/]+/;
const DEFAULT_MIN_TOKEN_LENGTH = 3;

/**
 * Canonical natural-language tokenizer for the Legend AI pipeline. Splits on
 * standard punctuation/whitespace, lowercases, drops short tokens, and
 * optionally filters a stopword set. Used by BM25 indexing, coverage
 * checks, and cross-class hint matching to keep tokenization consistent.
 */
export function tokenizeText(
  text: string,
  options?: {
    minLength?: number;
    stopwords?: ReadonlySet<string>;
  },
): string[] {
  const minLength = options?.minLength ?? DEFAULT_MIN_TOKEN_LENGTH;
  const stopwords = options?.stopwords;
  return text
    .toLowerCase()
    .split(TEXT_TOKEN_SPLIT)
    .filter((t) => t.length >= minLength && !(stopwords?.has(t) ?? false));
}

// ────────────────────────────────────────────────────────────────────────────
// Association-aware alternate root selection (Phase 3)
// ────────────────────────────────────────────────────────────────────────────

/**
 * Picks the best alternate root entity when a query returns zero results.
 * Ranks candidates by their association connectivity — entities with more
 * connections to other model entities are more likely to have queryable data.
 * A direct association with the failed root gets a bonus so closely-related
 * entities are preferred.
 */
export function findBestAlternateRoot(
  failedRoot: string,
  relatedEntities: string[],
  modelContext: LegendAIModelContext,
): string | undefined {
  if (relatedEntities.length === 0) {
    return undefined;
  }
  if (relatedEntities.length === 1 || modelContext.associations.length === 0) {
    return relatedEntities[0];
  }

  const scores = relatedEntities.map((entity) => {
    let score = 0;
    for (const assoc of modelContext.associations) {
      const isInvolved =
        assoc.leftEntity === entity || assoc.rightEntity === entity;
      if (isInvolved) {
        score += 1;
        if (
          assoc.leftEntity === failedRoot ||
          assoc.rightEntity === failedRoot
        ) {
          score += 2;
        }
      }
    }
    return { entity, score };
  });

  scores.sort((a, b) => b.score - a.score);
  return scores[0]?.entity ?? relatedEntities[0];
}

// ────────────────────────────────────────────────────────────────────────────
// Semantic property-doc index for RAG-like matching
// ────────────────────────────────────────────────────────────────────────────

function addTokensToIndex(
  index: Map<string, Set<string>>,
  tokens: string[],
  entityPath: string,
): void {
  for (const token of tokens) {
    let set = index.get(token);
    if (!set) {
      set = new Set();
      index.set(token, set);
    }
    set.add(entityPath);
  }
}

export function buildSemanticPropertyIndex(
  modelContext: LegendAIModelContext,
): Map<string, Set<string>> {
  const index = new Map<string, Set<string>>();
  for (const entity of modelContext.entities) {
    for (const prop of entity.properties) {
      const nameTokens = prop.name
        .replaceAll(/(?<lower>[a-z])(?<upper>[A-Z])/g, '$<lower> $<upper>')
        .toLowerCase()
        .split(/[\s_]+/)
        .filter((t) => t.length > 2);
      addTokensToIndex(index, nameTokens, entity.path);
    }
    if (entity.description) {
      const descTokens = entity.description
        .toLowerCase()
        .split(/[\s,.;:!?'"()\-/]+/)
        .filter((t) => t.length > 2);
      addTokensToIndex(index, descTokens, entity.path);
    }
  }
  return index;
}

// ────────────────────────────────────────────────────────────────────────────
// Deterministic entity resolution (no LLM required)
// ────────────────────────────────────────────────────────────────────────────

/**
 * Resolves root and related entities using keyword matching against the model
 * context. This works without any LLM call and is used as the final fallback
 * when both LLM-based resolution and marketplace search are unavailable.
 *
 * Scoring:
 *  - entity name match (+5)
 *  - property name match (+2)
 *  - isQueryable bonus (+10) — entity is directly queried by a service
 *  - isRootMapped bonus (+3)
 *  - description keyword match (+1)
 *  - executable title/description match (+4)
 *  - semantic property-doc match (+1 per token hit)
 *
 * When queryable entities exist, only they are eligible as root.
 */
function pickFallbackEntity(
  queryableEntities: LegendAIModelEntity[],
  entities: LegendAIModelEntity[],
): { rootEntity: string; relatedEntities: string[] } | undefined {
  const preferred =
    queryableEntities[0] ?? entities.find((e) => e.isRootMapped) ?? entities[0];
  return preferred
    ? { rootEntity: preferred.path, relatedEntities: [] }
    : undefined;
}

function buildExecutableByRootIndex(
  modelContext: LegendAIModelContext,
): Map<string, string[]> {
  const index = new Map<string, string[]>();
  for (const exec of modelContext.executables ?? []) {
    let words = index.get(exec.rootEntityPath);
    if (!words) {
      words = [];
      index.set(exec.rootEntityPath, words);
    }
    words.push(
      ...`${exec.title} ${exec.description ?? ''}`
        .toLowerCase()
        .split(/[\s,.;:!?'"()\-/]+/)
        .filter((t) => t.length > 2),
    );
  }
  return index;
}

function scoreEntityByProperties(
  entity: LegendAIModelEntity,
  tokens: string[],
): number {
  let score = 0;
  for (const prop of entity.properties) {
    const propLower = prop.name.toLowerCase();
    for (const token of tokens) {
      if (propLower === token || propLower.includes(token)) {
        score += 2;
        break;
      }
    }
  }
  return score;
}

function scoreEntity(
  entity: LegendAIModelEntity,
  tokens: string[],
  semanticIndex: Map<string, Set<string>>,
  executableByRoot: Map<string, string[]>,
): number {
  const nameLower = entity.name.toLowerCase();
  let score =
    tokens.filter((t) => nameLower === t || nameLower.includes(t)).length * 5;
  score += scoreEntityByProperties(entity, tokens);
  if (entity.isQueryable) {
    score += 10;
  }
  if (entity.isRootMapped) {
    score += 3;
  }
  if (entity.description) {
    const descLower = entity.description.toLowerCase();
    score += tokens.filter((t) => descLower.includes(t)).length;
  }
  const execWords = executableByRoot.get(entity.path);
  if (execWords) {
    score +=
      tokens.filter((t) => execWords.some((w) => w === t || w.includes(t)))
        .length * 4;
  }
  score += tokens.filter((t) => semanticIndex.get(t)?.has(entity.path)).length;
  return score;
}

export function resolveEntitiesDeterministic(
  question: string,
  modelContext: LegendAIModelContext,
): { rootEntity: string; relatedEntities: string[] } | undefined {
  if (modelContext.entities.length === 0) {
    return undefined;
  }
  if (modelContext.entities.length === 1) {
    const singleEntity = modelContext.entities[0];
    if (singleEntity) {
      return { rootEntity: singleEntity.path, relatedEntities: [] };
    }
  }

  const queryableEntities = modelContext.entities.filter((e) => e.isQueryable);
  const executableByRoot = buildExecutableByRootIndex(modelContext);
  const semanticIndex = buildSemanticPropertyIndex(modelContext);

  const tokens = question
    .toLowerCase()
    .split(/[\s,.;:!?'"()\-/]+/)
    .filter((t) => t.length > 2);

  if (tokens.length === 0) {
    return pickFallbackEntity(queryableEntities, modelContext.entities);
  }

  const scored = modelContext.entities
    .map((entity) => ({
      entity,
      score: scoreEntity(entity, tokens, semanticIndex, executableByRoot),
    }))
    .sort((a, b) => b.score - a.score);

  const rootCandidates =
    queryableEntities.length > 0
      ? scored.filter((s) => s.entity.isQueryable)
      : scored;

  const winner = rootCandidates[0];
  if (!winner || winner.score === 0) {
    return pickFallbackEntity(queryableEntities, modelContext.entities);
  }

  const rootPath = winner.entity.path;
  const relatedSet = new Set<string>();
  for (const assoc of modelContext.associations) {
    if (assoc.leftEntity === rootPath) {
      relatedSet.add(assoc.rightEntity);
    } else if (assoc.rightEntity === rootPath) {
      relatedSet.add(assoc.leftEntity);
    }
  }
  for (const s of scored.slice(1)) {
    if (s.score > 0 && relatedSet.size < 5) {
      relatedSet.add(s.entity.path);
    }
  }

  return {
    rootEntity: rootPath,
    relatedEntities: Array.from(relatedSet).slice(0, 5),
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Model context enrichment for SQL / metadata prompts
// ────────────────────────────────────────────────────────────────────────────

const MAX_ENRICHMENT_ENTITIES = 8;
const MAX_ENRICHMENT_PROPS_PER_ENTITY = 15;
const MAX_ENRICHMENT_ENUMS = 10;
const MAX_ENRICHMENT_ENUM_VALUES = 20;
const MAX_ENRICHMENT_ASSOCIATIONS = 10;

/**
 * Maps each TDS service to the model entity whose properties best match
 * the service's column names. Uses a simple overlap-scoring approach:
 * for each (service, entity) pair, count how many service column names
 * match entity property names (case-insensitive). The entity with the
 * highest overlap wins, provided it exceeds a minimum threshold.
 *
 * Returns a Map<serviceTitle, entityPath>.
 */
function inferServiceEntityMapping(
  services: TDSServiceSchema[],
  modelContext: LegendAIModelContext,
): Map<string, string> {
  const result = new Map<string, string>();
  const MIN_OVERLAP = 2; // require at least 2 matching columns

  const entityPropSets = modelContext.entities.map((entity) => ({
    path: entity.path,
    props: new Set(entity.properties.map((p) => p.name.toLowerCase())),
  }));

  for (const svc of services) {
    const colNames = svc.columns.map((c) => c.name.toLowerCase());
    let bestEntity = '';
    let bestScore = 0;

    for (const { path, props } of entityPropSets) {
      const overlap = colNames.filter((c) => props.has(c)).length;
      if (overlap > bestScore) {
        bestScore = overlap;
        bestEntity = path;
      }
    }

    if (bestScore >= MIN_OVERLAP && bestEntity) {
      result.set(svc.title, bestEntity);
    }
  }

  return result;
}

function buildProductDescriptionSection(
  modelContext: LegendAIModelContext,
): string | undefined {
  if (!modelContext.dataspaceDescription) {
    return undefined;
  }
  const shortDesc = modelContext.dataspaceDescription
    .split('\n')
    .filter((l) => !l.startsWith('#') && l.trim().length > 0)
    .slice(0, 3)
    .join(' ')
    .slice(0, 500);
  return shortDesc.length > 0
    ? `## Data Model Overview\n${shortDesc}`
    : undefined;
}

function buildEntitySection(
  modelContext: LegendAIModelContext,
): string | undefined {
  if (modelContext.entities.length === 0) {
    return undefined;
  }
  const sorted = [...modelContext.entities].sort((a, b) => {
    const aScore = (a.isQueryable ? 10 : 0) + (a.isRootMapped ? 3 : 0);
    const bScore = (b.isQueryable ? 10 : 0) + (b.isRootMapped ? 3 : 0);
    return bScore - aScore;
  });
  const lines: string[] = ['## Model Entities'];
  for (const entity of sorted.slice(0, MAX_ENRICHMENT_ENTITIES)) {
    const tags: string[] = [];
    if (entity.isQueryable) {
      tags.push('QUERYABLE');
    }
    if (entity.isRootMapped) {
      tags.push('ROOT_MAPPED');
    }
    const tagStr = tags.length > 0 ? ` [${tags.join(', ')}]` : '';
    lines.push(`\n### ${entity.name}${tagStr}`);
    if (entity.description) {
      lines.push(entity.description.slice(0, 300));
    }
    const propLines = entity.properties
      .slice(0, MAX_ENRICHMENT_PROPS_PER_ENTITY)
      .map((p) => `- ${p.name}: ${p.type}${p.isCollection ? ' (many)' : ''}`);
    if (propLines.length > 0) {
      lines.push('Properties:', ...propLines);
    }
  }
  if (modelContext.entities.length > MAX_ENRICHMENT_ENTITIES) {
    lines.push(
      `\n(${modelContext.entities.length - MAX_ENRICHMENT_ENTITIES} additional entities omitted)`,
    );
  }
  return lines.join('\n');
}

function buildEnumerationSection(
  modelContext: LegendAIModelContext,
): string | undefined {
  if (!modelContext.enumerations?.length) {
    return undefined;
  }
  const lines = ['## Enumerations (valid filter values)'];
  for (const en of modelContext.enumerations.slice(0, MAX_ENRICHMENT_ENUMS)) {
    const vals = en.values.slice(0, MAX_ENRICHMENT_ENUM_VALUES).join(', ');
    const suffix =
      en.values.length > MAX_ENRICHMENT_ENUM_VALUES
        ? `, ... (${en.values.length} total)`
        : '';
    lines.push(`- ${extractElementNameFromPath(en.path)}: ${vals}${suffix}`);
  }
  return lines.join('\n');
}

function buildAssociationSection(
  modelContext: LegendAIModelContext,
): string | undefined {
  if (modelContext.associations.length === 0) {
    return undefined;
  }
  const lines = ['## Entity Relationships'];
  for (const assoc of modelContext.associations.slice(
    0,
    MAX_ENRICHMENT_ASSOCIATIONS,
  )) {
    const l = extractElementNameFromPath(assoc.leftEntity);
    const r = extractElementNameFromPath(assoc.rightEntity);
    lines.push(
      `- ${l}.${assoc.leftProperty} → ${r}, ${r}.${assoc.rightProperty} → ${l}`,
    );
  }
  return lines.join('\n');
}

function buildExecutableSection(
  modelContext: LegendAIModelContext,
): string | undefined {
  if (!modelContext.executables?.length) {
    return undefined;
  }
  const lines = ['## Available Executables'];
  for (const exec of modelContext.executables) {
    lines.push(
      `\n- "${exec.title}" → ${extractElementNameFromPath(exec.rootEntityPath)}`,
    );
    if (exec.description) {
      lines.push(`  ${exec.description.slice(0, 200)}`);
    }
    if (exec.requiredParameters && exec.requiredParameters.length > 0) {
      const paramList = exec.requiredParameters
        .map((p) => `${p.name} (${p.type})`)
        .join(', ');
      lines.push(`  Required parameters: ${paramList}`);
    }
  }
  return lines.join('\n');
}

function buildPropToEnumPathMap(
  modelContext: LegendAIModelContext,
  enumPathMap: Map<string, string[]>,
): Map<string, string> {
  const propToEnumPath = new Map<string, string>();
  for (const entity of modelContext.entities) {
    for (const prop of entity.properties) {
      if (enumPathMap.has(prop.type)) {
        propToEnumPath.set(prop.name.toLowerCase(), prop.type);
      }
    }
  }
  return propToEnumPath;
}

function buildColumnEnumLine(
  col: TDSColumnSchema,
  propToEnumPath: Map<string, string>,
  enumPathMap: Map<string, string[]>,
): string | undefined {
  const enumPath = propToEnumPath.get(col.name.toLowerCase());
  if (!enumPath) {
    return undefined;
  }
  const enumValues = enumPathMap.get(enumPath);
  if (!enumValues?.length) {
    return undefined;
  }
  const vals = enumValues.slice(0, MAX_ENRICHMENT_ENUM_VALUES).join(', ');
  const suffix =
    enumValues.length > MAX_ENRICHMENT_ENUM_VALUES
      ? `, ... (${enumValues.length} total)`
      : '';
  return `- Column "${col.name}" accepts: ${vals}${suffix}`;
}

function buildColumnEnumMappingSection(
  modelContext: LegendAIModelContext,
  services: TDSServiceSchema[] | undefined,
): string | undefined {
  if (!services?.length || !modelContext.enumerations?.length) {
    return undefined;
  }
  const enumPathMap = new Map(
    modelContext.enumerations.map((en) => [en.path, en.values]),
  );
  const propToEnumPath = buildPropToEnumPathMap(modelContext, enumPathMap);
  if (propToEnumPath.size === 0) {
    return undefined;
  }
  const seen = new Set<string>();
  const mappingLines: string[] = [];
  for (const svc of services) {
    for (const col of svc.columns) {
      const colLower = col.name.toLowerCase();
      if (seen.has(colLower)) {
        continue;
      }
      const line = buildColumnEnumLine(col, propToEnumPath, enumPathMap);
      if (line) {
        mappingLines.push(line);
        seen.add(colLower);
      }
    }
  }
  if (mappingLines.length === 0) {
    return undefined;
  }
  return [
    '## Column Filter Value Mappings',
    'When filtering on these columns, use ONLY the exact values listed below:',
    ...mappingLines,
  ].join('\n');
}

function buildPropTypeDescMap(
  modelContext: LegendAIModelContext,
): Map<string, string> {
  const map = new Map<string, string>();
  for (const entity of modelContext.entities) {
    for (const prop of entity.properties) {
      if (!map.has(prop.name.toLowerCase())) {
        map.set(
          prop.name.toLowerCase(),
          isPrimitiveType(prop.type)
            ? prop.type
            : extractElementNameFromPath(prop.type),
        );
      }
    }
  }
  return map;
}

function buildColumnDescriptionSection(
  modelContext: LegendAIModelContext,
  services: TDSServiceSchema[] | undefined,
): string | undefined {
  if (!services?.length || !modelContext.entities.length) {
    return undefined;
  }
  const propDescMap = buildPropTypeDescMap(modelContext);
  const seen = new Set<string>();
  const undocumented: string[] = [];
  for (const svc of services) {
    for (const col of svc.columns) {
      const colLower = col.name.toLowerCase();
      if (col.documentation || seen.has(colLower)) {
        continue;
      }
      const modelType = propDescMap.get(colLower);
      if (modelType && modelType !== (col.type ?? '')) {
        undocumented.push(
          `- "${col.name}" corresponds to model property type ${modelType}`,
        );
        seen.add(colLower);
      }
    }
  }
  if (undocumented.length === 0) {
    return undefined;
  }
  return [
    '## Column-to-Model Property Hints',
    ...undocumented.slice(0, 20),
  ].join('\n');
}

function buildServicePairHint(
  svcA: string,
  entityA: string,
  svcB: string,
  entityB: string,
  modelContext: LegendAIModelContext,
  services: TDSServiceSchema[],
): string | undefined {
  if (entityA === entityB) {
    return `\n- **${svcA}** and **${svcB}** query the SAME entity — JOIN on any shared identifier column.`;
  }
  const assoc = modelContext.associations.find(
    (a) =>
      (a.leftEntity === entityA && a.rightEntity === entityB) ||
      (a.leftEntity === entityB && a.rightEntity === entityA),
  );
  if (!assoc) {
    return undefined;
  }
  const leftName = extractElementNameFromPath(assoc.leftEntity);
  const rightName = extractElementNameFromPath(assoc.rightEntity);
  const colsA = new Set(
    services
      .find((s) => s.title === svcA)
      ?.columns.map((c) => c.name.toLowerCase()) ?? [],
  );
  const svcBCols = services.find((s) => s.title === svcB)?.columns ?? [];
  const shared = svcBCols
    .filter((c) => colsA.has(c.name.toLowerCase()))
    .map((c) => c.name);
  const joinKeyHint =
    shared.length > 0
      ? `JOIN ON shared columns: ${shared.join(', ')}`
      : `No shared columns by name — match on equivalent business keys (e.g. ${leftName} ID ↔ ${rightName} foreign key)`;
  return `\n- **${svcA}** ↔ **${svcB}**: Related via ${leftName}.${assoc.leftProperty} → ${rightName}. ${joinKeyHint}`;
}

function buildServicePairHints(
  serviceEntityMap: Map<string, string>,
  modelContext: LegendAIModelContext,
  services: TDSServiceSchema[],
): string[] {
  const svcEntries = Array.from(serviceEntityMap.entries());
  const pairHints: string[] = [];
  for (let i = 0; i < svcEntries.length; i++) {
    for (let j = i + 1; j < svcEntries.length; j++) {
      const entryA = svcEntries[i];
      const entryB = svcEntries[j];
      if (!entryA || !entryB) {
        continue;
      }
      const [svcA, entityA] = entryA;
      const [svcB, entityB] = entryB;
      const hint = buildServicePairHint(
        svcA,
        entityA,
        svcB,
        entityB,
        modelContext,
        services,
      );
      if (hint) {
        pairHints.push(hint);
      }
    }
  }
  return pairHints;
}

function buildServiceJoinSection(
  modelContext: LegendAIModelContext,
  services: TDSServiceSchema[] | undefined,
): string | undefined {
  if (!services || services.length < 2) {
    return undefined;
  }
  if (!modelContext.entities.length || !modelContext.associations.length) {
    return undefined;
  }
  const serviceEntityMap = inferServiceEntityMapping(services, modelContext);
  if (serviceEntityMap.size === 0) {
    return undefined;
  }
  const joinLines: string[] = [
    '## Model-Aware Service JOIN Guide',
    'Each service below is mapped to the data model entity whose properties best match its columns.',
    'Use the entity relationships to determine correct JOIN keys and semantics.',
    '',
  ];
  for (const [svcTitle, entityPath] of serviceEntityMap) {
    joinLines.push(
      `- **${svcTitle}** → entity ${extractElementNameFromPath(entityPath)}`,
    );
  }
  const pairHints = buildServicePairHints(
    serviceEntityMap,
    modelContext,
    services,
  );
  if (pairHints.length > 0) {
    joinLines.push('', '### Inter-Service Relationships', ...pairHints);
  }
  return joinLines.join('\n');
}

export function buildModelContextEnrichmentText(
  modelContext: LegendAIModelContext,
  services?: TDSServiceSchema[],
): string | undefined {
  const sections = [
    buildProductDescriptionSection(modelContext),
    buildEntitySection(modelContext),
    buildEnumerationSection(modelContext),
    buildAssociationSection(modelContext),
    buildExecutableSection(modelContext),
    buildColumnEnumMappingSection(modelContext, services),
    buildColumnDescriptionSection(modelContext, services),
    buildServiceJoinSection(modelContext, services),
  ].filter((s): s is string => s !== undefined);

  if (sections.length === 0) {
    return undefined;
  }

  return `# DATA MODEL CONTEXT
The following describes the underlying data model — entities, properties, enumerations, and relationships. Use this to understand column semantics, valid filter values, and how entities relate to each other.

${sections.join('\n\n')}`;
}
