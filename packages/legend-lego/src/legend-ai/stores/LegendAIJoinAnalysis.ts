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
  type TDSServiceSchema,
  TDSServiceSourceType,
} from '../LegendAITypes.js';
import {
  accessPointCalls,
  buildColumnByNameIndex,
  buildServiceByPIdIndex,
  sharedColumnNames,
} from './LegendAISqlHelpers.js';

const MAX_JOINABLE_SUGGESTIONS = 3;
const SAMPLE_VALUE_PREVIEW_COUNT = 3;
const SUGGESTED_ROW_COUNT = 20;

/** Parses a comma-separated `sampleValues` string into a lowercased value set. */
export function parseSampleValueSet(
  sampleValues: string | undefined,
): Set<string> {
  if (sampleValues === undefined) {
    return new Set();
  }
  return new Set(
    sampleValues
      .split(',')
      .map((v) => v.trim().toLowerCase())
      .filter((v) => v.length > 0),
  );
}

// True when the two access points share a required (non-nullable) column — a
// candidate cross-access-point join key.
function hasSharedRequiredKey(
  apA: TDSServiceSchema,
  apB: TDSServiceSchema,
): boolean {
  const colsA = buildColumnByNameIndex(apA.columns);
  const colsB = buildColumnByNameIndex(apB.columns);
  return sharedColumnNames(apA, apB).some((name) => {
    const key = name.toLowerCase();
    return (
      colsA.get(key)?.nullable === false && colsB.get(key)?.nullable === false
    );
  });
}

// Resolves the access points referenced by a cross-`p()` join SQL to their
// schemas via `findServiceForPId`, de-duplicated by pId.
export function resolveJoinedAccessPoints(
  sql: string,
  services: TDSServiceSchema[],
): TDSServiceSchema[] {
  const serviceByPId = buildServiceByPIdIndex(services);
  const resolved: TDSServiceSchema[] = [];
  const seenPIds = new Set<string>();
  for (const match of accessPointCalls(sql)) {
    const pId = match.groups?.pId;
    if (pId === undefined || seenPIds.has(pId)) {
      continue;
    }
    seenPIds.add(pId);
    const svc = serviceByPId.get(pId);
    if (svc?.sourceType === TDSServiceSourceType.ACCESS_POINT) {
      resolved.push(svc);
    }
  }
  return resolved;
}

// Previews the first few of a column's values for a message, so the grounded
// and live-probe paths show the same number of examples.
export function previewValues(values: string[]): string {
  return values.slice(0, SAMPLE_VALUE_PREVIEW_COUNT).join(', ');
}

function previewSampleValues(sampleValues: string | undefined): string {
  return previewValues(
    (sampleValues ?? '')
      .split(',')
      .map((value) => value.trim())
      .filter((value) => value.length > 0),
  );
}

// The shared "disjoint join" explanation, used for both grounded-sample and
// live-probe disjointness so the two paths phrase the finding identically.
export function buildDisjointJoinMessage(
  apATitle: string,
  apBTitle: string,
  column: string,
  previewA: string,
  previewB: string,
): string {
  return `**${apATitle}** and **${apBTitle}** cover different data. Their shared column "${column}" has no values in common (e.g. ${previewA} vs ${previewB}), so there are no rows to join.`;
}

/**
 * Explains a cross-access-point join proven empty by disjoint sample values.
 * `requireComplete` + `restrictToColumns` (the join keys) make it safe pre-execution.
 */
export function detectDisjointJoinUniverses(
  sql: string,
  services: TDSServiceSchema[],
  options?: { requireComplete?: boolean; restrictToColumns?: Set<string> },
): string | undefined {
  const involved = resolveJoinedAccessPoints(sql, services);
  return detectDisjointJoinUniversesFor(involved[0], involved[1], options);
}

// Takes the already resolved pair so a caller that needs it as well does not
// scan the statement twice.
function detectDisjointJoinUniversesFor(
  apA: TDSServiceSchema | undefined,
  apB: TDSServiceSchema | undefined,
  options?: { requireComplete?: boolean; restrictToColumns?: Set<string> },
): string | undefined {
  const requireComplete = options?.requireComplete ?? false;
  const restrictToColumns = options?.restrictToColumns;
  if (apA === undefined || apB === undefined) {
    return undefined;
  }
  const colsA = buildColumnByNameIndex(apA.columns);
  const colsB = buildColumnByNameIndex(apB.columns);
  for (const name of sharedColumnNames(apA, apB)) {
    const key = name.toLowerCase();
    if (restrictToColumns !== undefined && !restrictToColumns.has(key)) {
      continue;
    }
    const colA = colsA.get(key);
    const colB = colsB.get(key);
    if (
      requireComplete &&
      (colA?.sampleValuesComplete !== true ||
        colB?.sampleValuesComplete !== true)
    ) {
      continue;
    }
    const setA = parseSampleValueSet(colA?.sampleValues);
    const setB = parseSampleValueSet(colB?.sampleValues);
    if (setA.size === 0 || setB.size === 0) {
      continue;
    }
    if (![...setA].some((v) => setB.has(v))) {
      return buildDisjointJoinMessage(
        apA.title,
        apB.title,
        name,
        previewSampleValues(colA?.sampleValues),
        previewSampleValues(colB?.sampleValues),
      );
    }
  }
  return undefined;
}

/**
 * Explains why a cross-access-point join returned 0 rows from grounded sample
 * values. Returns undefined when this is not a cross-access-point join.
 */
export function buildCrossJoinZeroRowExplanation(
  sql: string,
  services: TDSServiceSchema[],
): string | undefined {
  const [apA, apB] = resolveJoinedAccessPoints(sql, services);
  const disjoint = detectDisjointJoinUniversesFor(apA, apB);
  if (disjoint !== undefined) {
    return `The join executed successfully but returned **0 rows**: ${disjoint}`;
  }
  if (apA === undefined || apB === undefined) {
    return undefined;
  }
  return `The join executed successfully but returned **0 rows**: no rows share the join key between **${apA.title}** and **${apB.title}**. These access points may cover different products or time periods.`;
}

/**
 * Suggests alternative joins likely to return rows: same-group access points
 * sharing a required key, plus a guaranteed single-access-point query.
 */
export function buildJoinablePairSuggestions(
  selectedAPs: TDSServiceSchema[],
  allAccessPoints: TDSServiceSchema[],
): string[] {
  const involved = selectedAPs.filter(
    (s) => s.sourceType === TDSServiceSourceType.ACCESS_POINT,
  );
  const involvedPatterns = new Set(involved.map((s) => s.pattern));
  const others = allAccessPoints.filter(
    (s) =>
      s.sourceType === TDSServiceSourceType.ACCESS_POINT &&
      !involvedPatterns.has(s.pattern),
  );
  const candidates: string[] = [];
  for (const base of involved) {
    for (const other of others) {
      if (
        base.accessPointGroupTitle !== undefined &&
        base.accessPointGroupTitle === other.accessPointGroupTitle &&
        hasSharedRequiredKey(base, other)
      ) {
        candidates.push(
          `Join "${base.title}" and "${other.title}" and show ${SUGGESTED_ROW_COUNT} rows`,
        );
      }
    }
  }
  const suggestions = candidates.slice(0, MAX_JOINABLE_SUGGESTIONS - 1);
  const first = involved[0];
  if (first !== undefined) {
    suggestions.push(`Show ${SUGGESTED_ROW_COUNT} rows from "${first.title}"`);
  }
  return suggestions.slice(0, MAX_JOINABLE_SUGGESTIONS);
}
