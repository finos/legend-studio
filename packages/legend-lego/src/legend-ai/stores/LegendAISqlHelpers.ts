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

import type { TDSColumnSchema, TDSServiceSchema } from '../LegendAITypes.js';

export const AP_CALL_PATTERN = /(?<!\w)p\(\s*'(?<pId>[^']+)'\s*\)/g;
export const HAS_LIMIT_PATTERN = /\bLIMIT\s+\d+/i;

export function servicePId(service: TDSServiceSchema): string | undefined {
  return service.dataProductPath === undefined
    ? undefined
    : `${service.dataProductPath}.${service.pattern.replace(/^\//, '')}`;
}

export function pureRelationColumnRef(column: string): string {
  if (/^[A-Za-z_]\w*$/u.test(column)) {
    return column;
  }
  const escaped = column.replaceAll("'", String.raw`\'`);
  return `'${escaped}'`;
}

// Resolves the access-point schema whose `p('...')` identifier matches `pId`
// (`<dataProductPath>.<pattern>`). Shared by the join sanitizers and analysis.
export function findServiceForPId(
  pId: string,
  services: TDSServiceSchema[] | undefined,
): TDSServiceSchema | undefined {
  return services?.find((s) => servicePId(s) === pId);
}

// Builds a `pId → service` index for callers that resolve many `p('...')`
// accessors in a loop, avoiding a linear scan (and per-call path strip) per
// accessor.
export function buildServiceByPIdIndex(
  services: TDSServiceSchema[] | undefined,
): Map<string, TDSServiceSchema> {
  const index = new Map<string, TDSServiceSchema>();
  for (const service of services ?? []) {
    const pId = servicePId(service);
    if (pId !== undefined) {
      index.set(pId, service);
    }
  }
  return index;
}

// Case-insensitive intersection of two access points' column names, returning
// the names as cased in `apA`.
export function sharedColumnNames(
  apA: TDSServiceSchema,
  apB: TDSServiceSchema,
): string[] {
  const bColumns = new Set(apB.columns.map((c) => c.name.toLowerCase()));
  return apA.columns
    .map((c) => c.name)
    .filter((name) => bColumns.has(name.toLowerCase()));
}

// Indexes a column list by lowercased name for O(1) case-insensitive lookup.
export function buildColumnByNameIndex(
  columns: readonly TDSColumnSchema[],
): Map<string, TDSColumnSchema> {
  const index = new Map<string, TDSColumnSchema>();
  for (const column of columns) {
    index.set(column.name.toLowerCase(), column);
  }
  return index;
}
