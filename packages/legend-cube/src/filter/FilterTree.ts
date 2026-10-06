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

import { validate, validateAllItems } from '../inference/ValidationUtils.js';
import {
  BLANK_PLACEHOLDER,
  MESSAGE_COMPOSITE_FILTER_EMPTY,
  MESSAGE_DOES_NOT_HAVE_A_NAME,
  MESSAGE_FILTER_OPERATOR_UNSUPPORTED,
  MESSAGE_FILTER_UNSUPPORTED,
  MESSAGE_FILTER_VALUE_BACKSLASH,
  MESSAGE_FILTER_VALUE_INVALID,
  MESSAGE_FILTER_VALUE_OUT_OF_RANGE,
  MESSAGE_FILTER_VALUE_REQUIRED,
  MESSAGE_NOT_IN_INPUT_SCHEMA,
} from '../messages/CubeMessages.js';
import type { Schema } from '../schema/Schema.js';
import type { CubeType } from '../types/CubeType.js';
import {
  getLiteralText,
  type InvalidValue,
  type LiteralValue,
} from '../values/LiteralValue.js';
import { checkValue } from '../values/ValueEntry.js';
import { assertUnreachable } from '../utils/AssertionUtils.js';
import { copyJson, type JsonValue } from '../utils/Json.js';
import {
  FILTER_OPERATOR_DESCRIPTIONS,
  FilterOperator,
  getFilterValueShape,
  hasUnescapedPatternCharacter,
  isFilterOperator,
  isOperatorAvailable,
} from './FilterOperator.js';

const FILTER_COLUMN = 'Filter column';

/** Stands for a value in the redacted description of a filter */
const REDACTED_VALUE = '?';

/** How a rule this version can't read describes itself */
const UNSUPPORTED_FILTER_DESCRIPTION = '(unsupported filter)';

/** One value of a comparison: a literal, or text that is not a value of the column type, kept to be fixed */
export type FilterValueItem = LiteralValue | InvalidValue;

/** One value, or a list of values for the In and NotIn operators */
export type FilterValue = FilterValueItem | readonly FilterValueItem[];

const LITERAL_KINDS: readonly string[] = [
  'string',
  'boolean',
  'integer',
  'float',
  'decimal',
  'strictDate',
  'dateTime',
  'enum',
];

const isFilterValueItem = (value: unknown): value is FilterValueItem => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const { kind, value: literal, text } = value as Record<string, unknown>;
  if (kind === 'invalid') {
    return typeof text === 'string';
  }
  return (
    typeof kind === 'string' &&
    LITERAL_KINDS.includes(kind) &&
    (kind === 'boolean'
      ? typeof literal === 'boolean'
      : typeof literal === 'string')
  );
};

export const isFilterValueList = (
  value: FilterValue | undefined,
): value is readonly FilterValueItem[] => Array.isArray(value);

let nextKey = 1;

/** What a filter rule is: a comparison, an And/Or group, or a negation */
export type FilterRuleKind = 'comparison' | 'composite' | 'not' | 'unsupported';

/**
 * A node of a filter tree: a comparison, an And/Or group of rules, or the
 * negation of a rule. Rules are immutable. A rule's `key` identifies it in the
 * editor: an edit keeps it, a new rule gets a fresh one.
 */
export abstract class FilterRule {
  readonly key: number;

  constructor(key?: number) {
    if (key === undefined) {
      this.key = nextKey;
      nextKey += 1;
    } else {
      this.key = key;
    }
  }

  abstract get kind(): FilterRuleKind;

  /** Checks the rule against the input schema, appending a message to `errors` for each problem */
  abstract validate(schema: Schema, errors?: string[]): boolean;

  /** The rule in words, values included, e.g. `SHIP_COUNTRY is "France"` */
  abstract toString(): string;

  /** The rule in words without its values, for logs and telemetry, e.g. `SHIP_COUNTRY is ?` */
  abstract toRedactedString(): string;
}

const FILTER_RULE_KINDS: readonly string[] = [
  'comparison',
  'composite',
  'not',
  'unsupported',
];

/** Whether the value is a filter rule: by shape, not `instanceof`, so rules from another copy of the module work */
export const isFilterRule = (value: unknown): value is FilterRule =>
  typeof value === 'object' &&
  value !== null &&
  FILTER_RULE_KINDS.includes((value as FilterRule).kind) &&
  typeof (value as FilterRule).validate === 'function' &&
  typeof (value as FilterRule).toRedactedString === 'function';

const formatValueItem = (item: FilterValueItem): string => {
  if (item.kind === 'invalid') {
    return `"${item.text}"`;
  }
  return item.kind === 'string' ? `"${item.value}"` : getLiteralText(item);
};

const formatValue = (value: FilterValue | undefined): string => {
  if (value === undefined) {
    return BLANK_PLACEHOLDER;
  }
  return isFilterValueList(value)
    ? `(${value.map(formatValueItem).join(', ')})`
    : formatValueItem(value);
};

const validateValueItem = (
  item: FilterValueItem,
  type: CubeType,
  errors?: string[],
): boolean => {
  const problem = checkValue(item, type);
  if (!problem) {
    return true;
  }
  switch (problem.reason) {
    case 'required':
      return validate(false, MESSAGE_FILTER_VALUE_REQUIRED, errors);
    case 'invalid':
      return validate(
        false,
        MESSAGE_FILTER_VALUE_INVALID(problem.text, type.displayName),
        errors,
      );
    case 'outOfRange':
      return validate(
        false,
        MESSAGE_FILTER_VALUE_OUT_OF_RANGE(problem.text, type.displayName),
        errors,
      );
    default:
      return assertUnreachable(problem);
  }
};

/** Compares a column with a value, a list of values, or nothing (for IsEmpty and IsNotEmpty) */
export class ColumnComparisonFilter extends FilterRule {
  /** The column, or `''` until one is picked */
  readonly columnName: string;
  readonly operator: FilterOperator;
  readonly value: FilterValue | undefined;

  constructor(
    columnName: string,
    operator: FilterOperator = FilterOperator.EQUAL,
    value?: FilterValue,
    key?: number,
  ) {
    super(key);
    if (typeof columnName !== 'string') {
      throw new Error(`A filter column must be a column name`);
    }
    if (!isFilterOperator(operator)) {
      throw new Error(`Unknown filter operator "${String(operator)}"`);
    }
    if (
      value !== undefined &&
      !(isFilterValueList(value)
        ? // `Array.from` turns holes into `undefined`, which `every` would skip
          Array.from(value).every(isFilterValueItem)
        : isFilterValueItem(value))
    ) {
      throw new Error(`A filter value must be a value or a list of values`);
    }
    this.columnName = columnName;
    this.operator = operator;
    this.value = isFilterValueList(value)
      ? Object.freeze(value.map((item) => Object.freeze({ ...item })))
      : value && Object.freeze({ ...value });
  }

  get kind(): 'comparison' {
    return 'comparison';
  }

  /** The same rule (same key) on another column */
  withColumn(columnName: string): ColumnComparisonFilter {
    return new ColumnComparisonFilter(
      columnName,
      this.operator,
      this.value,
      this.key,
    );
  }

  /** The same rule (same key) with another operator */
  withOperator(operator: FilterOperator): ColumnComparisonFilter {
    return new ColumnComparisonFilter(
      this.columnName,
      operator,
      this.value,
      this.key,
    );
  }

  /** The same rule (same key) with another value */
  withValue(value: FilterValue | undefined): ColumnComparisonFilter {
    return new ColumnComparisonFilter(
      this.columnName,
      this.operator,
      value,
      this.key,
    );
  }

  /**
   * Checks, stopping at the first failure: the column exists, the operator is
   * available for its type, the value has the operator's shape, and each value
   * is valid for the type (every item of a list is checked).
   */
  validate(schema: Schema, errors?: string[]): boolean {
    const type = schema.type(this.columnName);
    if (!type) {
      return validate(
        false,
        this.columnName
          ? MESSAGE_NOT_IN_INPUT_SCHEMA(FILTER_COLUMN, this.columnName)
          : MESSAGE_DOES_NOT_HAVE_A_NAME(FILTER_COLUMN),
        errors,
      );
    }
    return (
      validate(
        isOperatorAvailable(this.operator, type),
        MESSAGE_FILTER_OPERATOR_UNSUPPORTED(
          FILTER_OPERATOR_DESCRIPTIONS[this.operator],
          this.columnName,
          type.displayName,
        ),
        errors,
      ) && this.validateValue(type, errors)
    );
  }

  private validateValue(type: CubeType, errors?: string[]): boolean {
    const shape = getFilterValueShape(this.operator);
    const { value } = this;
    switch (shape) {
      case 'none':
        return true;
      case 'single':
        return (
          validate(
            value !== undefined && !isFilterValueList(value),
            MESSAGE_FILTER_VALUE_REQUIRED,
            errors,
          ) &&
          validateValueItem(value as FilterValueItem, type, errors) &&
          this.validatePattern(value as FilterValueItem, errors)
        );
      case 'list':
        return (
          validate(
            isFilterValueList(value) && value.length > 0,
            MESSAGE_FILTER_VALUE_REQUIRED,
            errors,
          ) &&
          validateAllItems(value as readonly FilterValueItem[], (item) =>
            validateValueItem(item, type, errors),
          )
        );
      default:
        return assertUnreachable(shape);
    }
  }

  // a backslash changes what a `LIKE` pattern matches (engine defect, PLAN Appendix B)
  private validatePattern(item: FilterValueItem, errors?: string[]): boolean {
    return validate(
      item.kind !== 'string' ||
        !hasUnescapedPatternCharacter(this.operator, item.value),
      MESSAGE_FILTER_VALUE_BACKSLASH(
        FILTER_OPERATOR_DESCRIPTIONS[this.operator],
      ),
      errors,
    );
  }

  private describeWith(value: string): string {
    const column = this.columnName || BLANK_PLACEHOLDER;
    const operator = FILTER_OPERATOR_DESCRIPTIONS[this.operator];
    return getFilterValueShape(this.operator) === 'none'
      ? `${column} ${operator}`
      : `${column} ${operator} ${value}`;
  }

  override toString(): string {
    return this.describeWith(formatValue(this.value));
  }

  toRedactedString(): string {
    return this.describeWith(REDACTED_VALUE);
  }
}

export enum CompositeFilterOperator {
  AND = 'And',
  OR = 'Or',
}

const isCompositeFilterOperator = (
  value: unknown,
): value is CompositeFilterOperator =>
  value === CompositeFilterOperator.AND || value === CompositeFilterOperator.OR;

/** Rules joined with And or Or */
export class CompositeFilter extends FilterRule {
  readonly operator: CompositeFilterOperator;
  readonly rules: readonly FilterRule[];

  constructor(
    operator: CompositeFilterOperator,
    rules: readonly FilterRule[],
    key?: number,
  ) {
    super(key);
    if (!isCompositeFilterOperator(operator)) {
      throw new Error(`Unknown filter group operator "${String(operator)}"`);
    }
    // decoded rules arrive as `unknown`; `Array.from` turns holes into
    // `undefined`, which `every` would skip
    const list: unknown = rules;
    if (
      !Array.isArray(list) ||
      !Array.from(list as unknown[]).every(isFilterRule)
    ) {
      throw new Error(`A filter group must have a list of rules`);
    }
    this.operator = operator;
    this.rules = Object.freeze(Array.from(rules));
  }

  get kind(): 'composite' {
    return 'composite';
  }

  /** The same group (same key) with other rules */
  withRules(rules: readonly FilterRule[]): CompositeFilter {
    return new CompositeFilter(this.operator, rules, this.key);
  }

  /** The same group (same key) with the other operator */
  withOperator(operator: CompositeFilterOperator): CompositeFilter {
    return new CompositeFilter(operator, this.rules, this.key);
  }

  /** Needs a rule, and checks every rule */
  validate(schema: Schema, errors?: string[]): boolean {
    return (
      validate(this.rules.length > 0, MESSAGE_COMPOSITE_FILTER_EMPTY, errors) &&
      validateAllItems(this.rules, (rule) => rule.validate(schema, errors))
    );
  }

  // a group inside a group is in parentheses, unless it has a single rule
  private describeWith(describe: (rule: FilterRule) => string): string {
    return this.rules.length
      ? this.rules
          .map((rule) =>
            rule.kind === 'composite' &&
            (rule as CompositeFilter).rules.length > 1
              ? `(${describe(rule)})`
              : describe(rule),
          )
          .join(
            this.operator === CompositeFilterOperator.AND ? ' and ' : ' or ',
          )
      : BLANK_PLACEHOLDER;
  }

  override toString(): string {
    return this.describeWith((rule) => rule.toString());
  }

  toRedactedString(): string {
    return this.describeWith((rule) => rule.toRedactedString());
  }
}

/**
 * The rows its rule doesn't match. A comparison whose operator has a negation
 * (e.g. Equal and NotEqual) is negated through its operator instead; a Not
 * wraps groups and comparisons without one, such as `not (x is greater than 5)`.
 */
export class NotFilter extends FilterRule {
  readonly rule: FilterRule;

  constructor(rule: FilterRule, key?: number) {
    super(key);
    if (!isFilterRule(rule)) {
      throw new Error(`A filter negation must have a rule`);
    }
    this.rule = rule;
  }

  get kind(): 'not' {
    return 'not';
  }

  /** The same negation (same key) of another rule */
  withRule(rule: FilterRule): NotFilter {
    return new NotFilter(rule, this.key);
  }

  validate(schema: Schema, errors?: string[]): boolean {
    return this.rule.validate(schema, errors);
  }

  override toString(): string {
    return `not (${this.rule.toString()})`;
  }

  toRedactedString(): string {
    return `not (${this.rule.toRedactedString()})`;
  }
}

/**
 * A rule this version can't read, e.g. one saved by a newer version with an
 * operator added since (PLAN §10.3, Settled in M1.6). It keeps the JSON it was
 * saved as, so re-saving writes it back as it was, and it is never valid.
 */
export class UnsupportedFilter extends FilterRule {
  /** The saved JSON, as it was read */
  readonly json: JsonValue;

  constructor(json: JsonValue, key?: number) {
    super(key);
    this.json = copyJson(json);
  }

  get kind(): 'unsupported' {
    return 'unsupported';
  }

  validate(schema: Schema, errors?: string[]): boolean {
    return validate(false, MESSAGE_FILTER_UNSUPPORTED, errors);
  }

  // never the JSON, which may hold values users typed
  override toString(): string {
    return UNSUPPORTED_FILTER_DESCRIPTION;
  }

  toRedactedString(): string {
    return UNSUPPORTED_FILTER_DESCRIPTION;
  }
}
