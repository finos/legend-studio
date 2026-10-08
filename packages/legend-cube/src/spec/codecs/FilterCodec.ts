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

import { isFilterOperator } from '../../filter/FilterOperator.js';
import {
  ColumnComparisonFilter,
  CompositeFilter,
  CompositeFilterOperator,
  type FilterRule,
  type FilterValue,
  type FilterValueItem,
  isFilterValueList,
  NotFilter,
  UnsupportedFilter,
} from '../../filter/FilterTree.js';
import { Filter } from '../../nodes/transforms/Filter.js';
import { assertUnreachable } from '../../utils/AssertionUtils.js';
import {
  EMPTY_JSON_OBJECT,
  isJsonObject,
  type JsonObject,
  type JsonValue,
} from '../../utils/Json.js';
import type { LiteralKind } from '../../values/LiteralValue.js';
import type { NodeSpecCodec } from '../NodeSpecCodec.js';
import { fail, hasOnlyKeys, pathTo } from '../SpecReader.js';

/** The group operators as saved, which are lowercase unlike the code's */
const GROUP_OPS: Readonly<Record<CompositeFilterOperator, string>> =
  Object.freeze({
    [CompositeFilterOperator.AND]: 'and',
    [CompositeFilterOperator.OR]: 'or',
  });

const NOT_OP = 'not';

const STRING_LITERAL_KINDS: readonly LiteralKind[] = [
  'string',
  'integer',
  'float',
  'decimal',
  'strictDate',
  'dateTime',
  'enum',
];

// ---------------------------------------- encode ----------------------------------------

const encodeValueItem = (item: FilterValueItem): JsonObject =>
  item.kind === 'invalid'
    ? { kind: 'invalid', text: item.text }
    : { kind: item.kind, value: item.value };

const encodeValue = (value: FilterValue): JsonValue =>
  isFilterValueList(value)
    ? value.map(encodeValueItem)
    : encodeValueItem(value);

/**
 * A filter rule as saved, exactly as the node holds it (never normalized):
 * a comparison `{column, operator, value?}`, a group `{op: 'and' | 'or',
 * rules}`, a negation `{op: 'not', rule}`, or the JSON of a rule this
 * version couldn't read.
 */
export const encodeFilterRule = (rule: FilterRule): JsonValue => {
  switch (rule.kind) {
    case 'comparison': {
      const { columnName, operator, value } = rule as ColumnComparisonFilter;
      return value === undefined
        ? { column: columnName, operator }
        : { column: columnName, operator, value: encodeValue(value) };
    }
    case 'composite': {
      const group = rule as CompositeFilter;
      return {
        op: GROUP_OPS[group.operator],
        rules: group.rules.map(encodeFilterRule),
      };
    }
    case 'not':
      return { op: NOT_OP, rule: encodeFilterRule((rule as NotFilter).rule) };
    case 'unsupported':
      return (rule as UnsupportedFilter).json;
    default:
      return assertUnreachable(rule.kind);
  }
};

// ---------------------------------------- decode ----------------------------------------

/** Signals a rule this version can't read, which is kept as an unsupported rule */
class UnreadableRule extends Error {}

const unreadable = (): never => {
  throw new UnreadableRule();
};

const decodeValueItem = (value: JsonValue): FilterValueItem => {
  if (!isJsonObject(value)) {
    return unreadable();
  }
  const { kind } = value;
  if (kind === 'invalid') {
    return hasOnlyKeys(value, ['kind', 'text']) &&
      typeof value.text === 'string'
      ? { kind: 'invalid', text: value.text }
      : unreadable();
  }
  if (!hasOnlyKeys(value, ['kind', 'value'])) {
    return unreadable();
  }
  if (kind === 'boolean') {
    return typeof value.value === 'boolean'
      ? { kind, value: value.value }
      : unreadable();
  }
  // a literal kind with a string value; values are checked by validation, not here
  return STRING_LITERAL_KINDS.includes(kind as LiteralKind) &&
    typeof value.value === 'string'
    ? ({ kind, value: value.value } as FilterValueItem)
    : unreadable();
};

const decodeRule = (
  json: JsonValue,
  decodeChild: (child: JsonValue) => FilterRule,
): FilterRule => {
  if (!isJsonObject(json)) {
    return unreadable();
  }
  const { op } = json;
  if (op === undefined) {
    if (
      !hasOnlyKeys(json, ['column', 'operator', 'value']) ||
      typeof json.column !== 'string' ||
      !isFilterOperator(json.operator)
    ) {
      return unreadable();
    }
    const { value } = json;
    return new ColumnComparisonFilter(
      json.column,
      json.operator,
      value === undefined
        ? undefined
        : Array.isArray(value)
          ? (value as readonly JsonValue[]).map(decodeValueItem)
          : decodeValueItem(value),
    );
  }
  if (op === NOT_OP) {
    return hasOnlyKeys(json, ['op', 'rule']) && json.rule !== undefined
      ? new NotFilter(decodeChild(json.rule))
      : unreadable();
  }
  const operator = Object.values(CompositeFilterOperator).find(
    (candidate) => GROUP_OPS[candidate] === op,
  );
  return operator !== undefined &&
    hasOnlyKeys(json, ['op', 'rules']) &&
    Array.isArray(json.rules)
    ? new CompositeFilter(
        operator,
        (json.rules as readonly JsonValue[]).map(decodeChild),
      )
    : unreadable();
};

/**
 * A filter rule from its saved JSON. What this version can't read (an
 * unknown op or operator, an unknown value kind, a malformed value, an
 * unknown key) becomes an unsupported rule at the smallest level: the rest
 * of the filter stays editable (PLAN §10.3, Settled in M1.6). Values are
 * kept as written, valid or not: validation reports them.
 */
export const decodeFilterRule = (json: JsonValue): FilterRule => {
  try {
    return decodeRule(json, decodeFilterRule);
  } catch (error) {
    if (error instanceof UnreadableRule) {
      return new UnsupportedFilter(json);
    }
    throw error;
  }
};

/** A filter node: its rule tree, left out while it has none */
export const FILTER_CODEC: NodeSpecCodec<Filter> = {
  keys: ['filter'],
  encode: (node) =>
    node.filter ? { filter: encodeFilterRule(node.filter) } : EMPTY_JSON_OBJECT,
  decode: (id, json, path, rest) =>
    new Filter(
      id,
      json.filter === undefined
        ? undefined
        : json.filter === null
          ? fail(pathTo(path, 'filter'), 'must not be null')
          : decodeFilterRule(json.filter),
      rest,
    ),
};
