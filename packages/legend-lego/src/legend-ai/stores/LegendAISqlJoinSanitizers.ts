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

import { escapeRegExp, isNonNullable } from '@finos/legend-shared';
import type { TDSServiceSchema } from '../LegendAITypes.js';
import {
  accessPointCalls,
  HAS_LIMIT_PATTERN,
  buildColumnByNameIndex,
  buildServiceByPIdIndex,
  findServiceForPId,
} from './LegendAISqlHelpers.js';

const JOIN_PATTERN = /\bJOIN\b/i;
const ORDER_BY_SPLIT = /\bORDER\s+BY\b/i;
const SELECT_ALIAS_PATTERN =
  /\b(?<tbl>[a-z]\w*)\s*\.\s*"(?<col>[^"]+)"\s+AS\s+(?:"(?<qAlias>[^"]+)"|(?<uAlias>\w+))/gi;
const ALIAS_DOT_COL_PATTERN = /\b(?<tbl>[a-z]\w*)\s*\.\s*"(?<col>[^"]+)"/gi;
const JOIN_DRIVING_SIDE_SAMPLE_LIMIT = 1000;
const P_WITH_ALIAS_PATTERN =
  /p\(\s*'(?<pId>[^']+)'\s*\)\s+AS\s+(?<alias>[a-z]\w*)/gi;
const COMPLEX_SQL_SHAPE_PATTERN =
  /\bGROUP\s+BY\b|\bOVER\s*\(|\bWITH\b|\bUNION\b/i;
const PLAIN_ALIASED_COLUMN_PATTERN =
  /^(?<alias>[a-z]\w*)\s*\.\s*"(?<col>[^"]+)"$/i;
const STAR_COLUMN_PATTERN = /^(?<alias>[a-z]\w*)\s*\.\s*\*$/i;
const AS_ALIAS_PATTERN = /\bAS\s+(?:"(?<q>[^"]+)"|(?<u>\w+))\s*$/i;
const BARE_QUOTED_COLUMN_PATTERN = /^"(?<col>[^"]+)"$/;

export function sanitizeJoinOrderBy(sql: string): string {
  if (!JOIN_PATTERN.test(sql)) {
    return sql;
  }
  const parts = sql.split(ORDER_BY_SPLIT);
  if (parts.length < 2) {
    return sql;
  }

  const beforeOrderBy = parts[0] ?? '';
  const afterOrderBy = parts.slice(1).join('ORDER BY').replace(/^\s+/, '');

  const selectAliases = new Map<string, string>();
  for (const m of beforeOrderBy.matchAll(SELECT_ALIAS_PATTERN)) {
    const tableAlias = (m.groups?.tbl ?? '').toLowerCase();
    const colName = (m.groups?.col ?? '').toLowerCase();
    const asAlias = m.groups?.qAlias ?? m.groups?.uAlias ?? '';
    selectAliases.set(`${tableAlias}.${colName}`, asAlias);
  }

  if (selectAliases.size === 0) {
    return sql;
  }

  const replacements = new Map<string, string>();
  for (const m of afterOrderBy.matchAll(ALIAS_DOT_COL_PATTERN)) {
    const tbl = (m.groups?.tbl ?? '').toLowerCase();
    const col = (m.groups?.col ?? '').toLowerCase();
    const alias = selectAliases.get(`${tbl}.${col}`);
    if (alias) {
      replacements.set(m[0], `"${alias}"`);
    }
  }

  if (replacements.size === 0) {
    return sql;
  }

  const rewritten = afterOrderBy.replaceAll(
    ALIAS_DOT_COL_PATTERN,
    (match) => replacements.get(match) ?? match,
  );

  if (rewritten === afterOrderBy) {
    return sql;
  }
  return `${beforeOrderBy}ORDER BY ${rewritten}`;
}

// Splits a SELECT projection list on top-level commas, ignoring commas inside
// parentheses or quoted identifiers/string literals.
function splitTopLevelColumns(selectList: string): string[] {
  const items: string[] = [];
  let depth = 0;
  let inDoubleQuote = false;
  let inSingleQuote = false;
  let current = '';
  for (const ch of selectList) {
    const inQuote = inDoubleQuote || inSingleQuote;
    if (ch === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
    } else if (ch === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
    } else if (!inQuote && ch === '(') {
      depth += 1;
    } else if (!inQuote && ch === ')') {
      depth = Math.max(0, depth - 1);
    }
    if (!inQuote && depth === 0 && ch === ',') {
      items.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim().length > 0) {
    items.push(current);
  }
  return items;
}

// Maps each access-point table alias (`p('...') AS a`) to its schema column
// names, so `alias.*` projections can be expanded deterministically.
function buildAliasColumnMap(
  sql: string,
  services: TDSServiceSchema[] | undefined,
): Map<string, string[]> {
  const serviceByPId = buildServiceByPIdIndex(services);
  const aliasColumns = new Map<string, string[]>();
  for (const match of sql.matchAll(P_WITH_ALIAS_PATTERN)) {
    const alias = match.groups?.alias?.toLowerCase();
    const pId = match.groups?.pId;
    if (alias === undefined || pId === undefined) {
      continue;
    }
    const svc = serviceByPId.get(pId);
    if (svc && svc.columns.length > 0) {
      aliasColumns.set(
        alias,
        svc.columns.map((c) => c.name),
      );
    }
  }
  return aliasColumns;
}

// Resolves a projection item's output name: the `AS` alias when present, else
// the plain column name. Returns undefined for expressions we can't reason about.
function resolveOutputColumnName(item: string): string | undefined {
  const asMatch = AS_ALIAS_PATTERN.exec(item);
  if (asMatch) {
    return (asMatch.groups?.q ?? asMatch.groups?.u ?? '').toLowerCase();
  }
  const plain = PLAIN_ALIASED_COLUMN_PATTERN.exec(item);
  if (plain?.groups?.col !== undefined) {
    return plain.groups.col.toLowerCase();
  }
  const bare = BARE_QUOTED_COLUMN_PATTERN.exec(item);
  if (bare?.groups?.col !== undefined) {
    return bare.groups.col.toLowerCase();
  }
  return undefined;
}

// Expands `alias.*` projection items into explicit `alias."col"` items using the
// access-point schema. Returns undefined when a `*` alias can't be resolved.
function expandStarColumns(
  items: string[],
  aliasColumns: Map<string, string[]>,
): string[] | undefined {
  const expanded: string[] = [];
  for (const item of items) {
    const star = STAR_COLUMN_PATTERN.exec(item);
    const alias = star?.groups?.alias?.toLowerCase();
    const starColumns = alias ? aliasColumns.get(alias) : undefined;
    if (star && !starColumns) {
      return undefined;
    }
    if (star && starColumns) {
      for (const col of starColumns) {
        expanded.push(`${star.groups?.alias ?? ''}."${col}"`);
      }
    } else {
      expanded.push(item);
    }
  }
  return expanded;
}

// Aliases any projection column whose output name collides with another, so the
// engine sees unique output names. Reports whether any column was renamed.
function rewriteDuplicateColumnNames(expanded: string[]): {
  rewritten: string[];
  anyRenamed: boolean;
} {
  const nameCounts = new Map<string, number>();
  for (const item of expanded) {
    const name = resolveOutputColumnName(item);
    if (name !== undefined) {
      nameCounts.set(name, (nameCounts.get(name) ?? 0) + 1);
    }
  }
  let anyRenamed = false;
  const rewritten = expanded.map((item) => {
    const plain = PLAIN_ALIASED_COLUMN_PATTERN.exec(item);
    const col = plain?.groups?.col;
    const alias = plain?.groups?.alias;
    if (col === undefined || alias === undefined) {
      return item;
    }
    if ((nameCounts.get(col.toLowerCase()) ?? 0) <= 1) {
      return item;
    }
    anyRenamed = true;
    return `${alias}."${col}" AS "${alias}_${col}"`;
  });
  return { rewritten, anyRenamed };
}

// Guarantees a unique output projection for flat cross-access-point joins by
// expanding `alias.*` and aliasing colliding column names (the engine rejects
// duplicate output names). Aggregation/window/CTE/set-op shapes are untouched.
export function sanitizeJoinDuplicateColumns(
  sql: string,
  services?: TDSServiceSchema[],
): string {
  if (!JOIN_PATTERN.test(sql) || COMPLEX_SQL_SHAPE_PATTERN.test(sql)) {
    return sql;
  }
  if (accessPointCalls(sql).length < 2) {
    return sql;
  }

  const leadMatch = /^\s*SELECT\s+(?:DISTINCT\s+)?/i.exec(sql);
  const fromMatch = /\bFROM\b/i.exec(sql);
  if (!leadMatch || !fromMatch || fromMatch.index <= leadMatch[0].length) {
    return sql;
  }
  const lead = leadMatch[0];
  const selectList = sql.slice(lead.length, fromMatch.index);
  const rest = sql.slice(fromMatch.index);

  const aliasColumns = buildAliasColumnMap(sql, services);
  const items = splitTopLevelColumns(selectList)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  if (items.length === 0) {
    return sql;
  }

  const expanded = expandStarColumns(items, aliasColumns);
  if (!expanded) {
    return sql;
  }

  const { rewritten, anyRenamed } = rewriteDuplicateColumnNames(expanded);
  const changed = anyRenamed || expanded.length !== items.length;
  if (!changed) {
    return sql;
  }

  const finalNames = rewritten
    .map((item) => resolveOutputColumnName(item))
    .filter(isNonNullable);
  if (new Set(finalNames).size !== finalNames.length) {
    return sql;
  }
  return `${lead}${rewritten.join(', ')} ${rest}`;
}

// Rewrites a join that equates same-named keys from both inputs into a renaming
// subquery on the right side, so the engine sees distinct key names.
export function sanitizeJoinSameKeyColumns(
  sql: string,
  services?: TDSServiceSchema[],
): string {
  if (!JOIN_PATTERN.test(sql)) {
    return sql;
  }

  const joinRegex =
    /\bJOIN\s{1,5}p\(\s{0,5}'(?<pId>[^']{1,200})'\s{0,5}\)\s{1,5}AS\s{1,5}(?<rAlias>[a-z]\w{0,63})\s{1,5}ON\s{1,5}(?<onClause>[^\n]{1,500})/gi;

  let result = sql;
  let match: RegExpExecArray | null;

  while ((match = joinRegex.exec(sql)) !== null) {
    const pId = match.groups?.pId ?? '';
    const rightAlias = match.groups?.rAlias ?? '';
    const onClause = (match.groups?.onClause ?? '').slice(0, 500);

    const sameKeyMatch =
      /[a-z]\w{0,63} {0,5}\. {0,5}"(?<lCol>[^"]{1,200})" {0,5}= {0,5}(?<rAl>[a-z]\w{0,63}) {0,5}\. {0,5}"(?<rCol>[^"]{1,200})"/i.exec(
        onClause,
      );
    if (!sameKeyMatch) {
      continue;
    }

    const leftCol = sameKeyMatch.groups?.lCol ?? '';
    const rightCol = sameKeyMatch.groups?.rCol ?? '';
    const matchedRightAlias = sameKeyMatch.groups?.rAl ?? '';

    if (
      leftCol.toLowerCase() !== rightCol.toLowerCase() ||
      matchedRightAlias.toLowerCase() !== rightAlias.toLowerCase()
    ) {
      continue;
    }

    const renamedKey = `${rightAlias}_${rightCol}`;
    const columnList = buildSubqueryColumnList(
      pId,
      rightCol,
      renamedKey,
      services,
    );
    const subqueryFragment = `(SELECT ${columnList} FROM p('${pId}')) AS ${rightAlias}`;
    const newOnRef = `${rightAlias}."${renamedKey}"`;

    const originalFragmentPattern = new RegExp(
      String.raw`p\(\s{0,5}'${escapeRegExp(pId)}'\s{0,5}\)\s{1,5}AS\s{1,5}${escapeRegExp(rightAlias)}`,
      'u',
    );
    const onRefPattern = new RegExp(
      String.raw`(?<!\w)${escapeRegExp(rightAlias)}\s{0,5}\.\s{0,5}"${escapeRegExp(rightCol)}"`,
      'gu',
    );

    result = result.replace(originalFragmentPattern, () => subqueryFragment);
    result = result.replace(onRefPattern, () => newOnRef);
  }

  return result;
}

interface QuoteScanState {
  inSingle: boolean;
  inDouble: boolean;
}

// Advances single/double-quote tracking for one char. `structural` is true when
// the char sits outside any quoted string (so callers may interpret parens etc.).
function advanceQuoteState(
  ch: string,
  state: QuoteScanState,
): { state: QuoteScanState; structural: boolean } {
  if (ch === "'" && !state.inDouble) {
    return {
      state: { inSingle: !state.inSingle, inDouble: state.inDouble },
      structural: false,
    };
  }
  if (ch === '"' && !state.inSingle) {
    return {
      state: { inSingle: state.inSingle, inDouble: !state.inDouble },
      structural: false,
    };
  }
  return { state, structural: !state.inSingle && !state.inDouble };
}

// Finds the index of the parenthesis that closes the `(` at `openIdx`,
// respecting single/double-quoted string content. Returns -1 if unbalanced.
function matchingCloseParen(sql: string, openIdx: number): number {
  let depth = 0;
  let quotes: QuoteScanState = { inSingle: false, inDouble: false };
  for (let i = openIdx; i < sql.length; i++) {
    const ch = sql[i] ?? '';
    const step = advanceQuoteState(ch, quotes);
    quotes = step.state;
    if (!step.structural) {
      continue;
    }
    if (ch === '(') {
      depth += 1;
    } else if (ch === ')') {
      depth -= 1;
      if (depth === 0) {
        return i;
      }
    }
  }
  return -1;
}

// Returns the index of the top-level `FROM (` open paren (the driving-side
// subquery), or -1. Ignores `FROM (` nested in a SELECT-list subquery.
function topLevelFromOpenParenIndex(sql: string): number {
  let depth = 0;
  let quotes: QuoteScanState = { inSingle: false, inDouble: false };
  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i] ?? '';
    const step = advanceQuoteState(ch, quotes);
    quotes = step.state;
    if (!step.structural) {
      continue;
    }
    if (ch === '(') {
      depth += 1;
    } else if (ch === ')') {
      depth = Math.max(0, depth - 1);
    } else if (depth === 0 && (ch === 'F' || ch === 'f')) {
      const boundary = i === 0 || !/\w/u.test(sql[i - 1] ?? '');
      const fromOpen = /^FROM\s*\(/iu.exec(sql.slice(i));
      if (boundary && fromOpen) {
        return i + fromOpen[0].length - 1;
      }
    }
  }
  return -1;
}

// Bounds the driving (left) side of a cross-access-point join with an inner
// LIMIT so the engine samples one feed instead of scanning both fully. Only
// applies when the driving side is a subquery lacking its own LIMIT.
export function boundCrossAccessPointJoinDrivingSide(sql: string): string {
  if (!JOIN_PATTERN.test(sql) || COMPLEX_SQL_SHAPE_PATTERN.test(sql)) {
    return sql;
  }
  if (accessPointCalls(sql).length < 2) {
    return sql;
  }
  const openIdx = topLevelFromOpenParenIndex(sql);
  if (openIdx === -1) {
    return sql;
  }
  const closeIdx = matchingCloseParen(sql, openIdx);
  if (closeIdx === -1) {
    return sql;
  }
  const subquery = sql.slice(openIdx, closeIdx + 1);
  if (HAS_LIMIT_PATTERN.test(subquery)) {
    return sql;
  }
  return `${sql.slice(0, closeIdx)} LIMIT ${JOIN_DRIVING_SIDE_SAMPLE_LIMIT}${sql.slice(closeIdx)}`;
}

// Wraps any bare `p('...') AS x` join input in a subquery that prefixes its
// columns per-alias, so the two inputs share no names (the SQL→Pure transpiler
// fails on bare overlapping p() inputs). No-op for non-cross-AP-join shapes.
export function wrapBareJoinAccessPoints(
  sql: string,
  services?: TDSServiceSchema[],
): string {
  if (!JOIN_PATTERN.test(sql) || COMPLEX_SQL_SHAPE_PATTERN.test(sql)) {
    return sql;
  }
  if (accessPointCalls(sql).length < 2) {
    return sql;
  }
  const bareInputPattern =
    /\b(?<kw>FROM|JOIN)\s+p\(\s*'(?<pId>[^']+)'\s*\)\s+AS\s+(?<alias>[a-z]\w*)/gi;
  const serviceByPId = buildServiceByPIdIndex(services);
  let result = sql;
  for (const match of sql.matchAll(bareInputPattern)) {
    const kw = match.groups?.kw ?? '';
    const pId = match.groups?.pId;
    const alias = match.groups?.alias;
    if (pId === undefined || alias === undefined) {
      continue;
    }
    const svc = serviceByPId.get(pId);
    if (!svc || svc.columns.length === 0) {
      continue;
    }
    const projection = svc.columns
      .map((c) => `"${c.name}" AS "${alias}_${c.name}"`)
      .join(', ');
    const limit =
      kw.toUpperCase() === 'FROM'
        ? ` LIMIT ${JOIN_DRIVING_SIDE_SAMPLE_LIMIT}`
        : '';
    const columnByName = buildColumnByNameIndex(svc.columns);
    const columnAlternation = svc.columns
      .map((c) => escapeRegExp(c.name))
      .join('|');
    const refPattern = new RegExp(
      String.raw`(?<!\w)${escapeRegExp(alias)}\s*\.\s*"(?<col>${columnAlternation})"`,
      'giu',
    );
    result = result.replace(refPattern, (matched: string, col: string) => {
      const schemaColumn = columnByName.get(col.toLowerCase());
      return schemaColumn
        ? `${alias}."${alias}_${schemaColumn.name}"`
        : matched;
    });
    result = result.replace(
      match[0],
      () => `${kw} (SELECT ${projection} FROM p('${pId}')${limit}) AS ${alias}`,
    );
  }
  return result;
}

function buildSubqueryColumnList(
  pId: string,
  originalKey: string,
  renamedKey: string,
  services?: TDSServiceSchema[],
): string {
  const svc = findServiceForPId(pId, services);
  if (!svc || svc.columns.length === 0) {
    return `"${originalKey}" AS "${renamedKey}", *`;
  }
  return svc.columns
    .map((c) =>
      c.name.toLowerCase() === originalKey.toLowerCase()
        ? `"${c.name}" AS "${renamedKey}"`
        : `"${c.name}"`,
    )
    .join(', ');
}
