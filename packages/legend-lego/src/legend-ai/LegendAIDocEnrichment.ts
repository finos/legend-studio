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

import type { Multiplicity } from '@finos/legend-graph';
import {
  ClassDocumentationEntry,
  AssociationDocumentationEntry,
  PropertyDocumentationEntry,
  type NormalizedDocumentationEntry,
} from '../model-documentation/index.js';
import type {
  TDSColumnSchema,
  TDSServiceSchema,
  TDSServicePreFilter,
  LegendAIServiceRelationship,
} from './LegendAITypes.js';

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
