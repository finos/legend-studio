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
  changeFilterColumn,
  changeFilterOperator,
  ColumnComparisonFilter,
  CompositeFilter,
  CompositeFilterOperator,
  type Filter,
  type FilterOperator,
  type FilterRule,
  type FilterValue,
  negateFilter,
  normalizeFilter,
  NotFilter,
  type Schema,
  unwrapFilter,
} from '@finos/legend-cube';
import { action, makeObservable, observable } from 'mobx';
import { CubeNodeDraft } from './CubeNodeDraft.js';

/** A condition with no column picked and no value: what Add puts in a group */
export const isBlankFilterRow = (rule: FilterRule): boolean =>
  rule instanceof ColumnComparisonFilter &&
  rule.columnName === '' &&
  rule.value === undefined;

/**
 * The rule without its blank conditions, and without the groups and
 * negations left empty by that; `undefined` when nothing else is left
 */
export const pruneBlankFilterRows = (
  rule: FilterRule,
): FilterRule | undefined => {
  if (isBlankFilterRow(rule)) {
    return undefined;
  }
  if (rule instanceof CompositeFilter) {
    const rules = rule.rules
      .map(pruneBlankFilterRows)
      .filter((child): child is FilterRule => child !== undefined);
    if (!rules.length) {
      return undefined;
    }
    return rules.length === rule.rules.length &&
      rules.every((child, index) => child === rule.rules[index])
      ? rule
      : rule.withRules(rules);
  }
  if (rule instanceof NotFilter) {
    const inner = pruneBlankFilterRows(rule.rule);
    return inner === undefined
      ? undefined
      : inner === rule.rule
        ? rule
        : rule.withRule(inner);
  }
  return rule;
};

/**
 * The tree with the rule of `key` replaced by what `replace` gives, or
 * removed when it gives `undefined`; a negation whose rule is removed goes
 * too. Rules that don't change stay the same objects.
 */
const replaceRule = (
  rule: FilterRule,
  key: number,
  replace: (found: FilterRule) => FilterRule | undefined,
): FilterRule | undefined => {
  if (rule.key === key) {
    return replace(rule);
  }
  if (rule instanceof CompositeFilter) {
    const rules = rule.rules
      .map((child) => replaceRule(child, key, replace))
      .filter((child): child is FilterRule => child !== undefined);
    return rules.length === rule.rules.length &&
      rules.every((child, index) => child === rule.rules[index])
      ? rule
      : rule.withRules(rules);
  }
  if (rule instanceof NotFilter) {
    const inner = replaceRule(rule.rule, key, replace);
    return inner === undefined
      ? undefined
      : inner === rule.rule
        ? rule
        : rule.withRule(inner);
  }
  return rule;
};

const blankRow = (): ColumnComparisonFilter => new ColumnComparisonFilter('');

/**
 * The Filter editor's draft (spec §8.5, §17.6): the filter as a tree that
 * always has an And/Or group at its top, so rows can be added to it. Each
 * rule keeps its key across edits, so the editor's rows keep theirs.
 *
 * When built, blank conditions are left out, and a tree of nothing else
 * stores no filter at all (user's choice, 2026-10-07): an Apply with an
 * untouched blank row changes nothing. Rules this version can't read are
 * kept as they were.
 */
export class CubeFilterDraft extends CubeNodeDraft<Filter> {
  tree: CompositeFilter;
  /** Anything was changed; until then, `build()` gives the original back */
  private touched = false;

  constructor(original: Filter) {
    super(original);
    makeObservable<CubeFilterDraft, 'touched'>(this, {
      tree: observable.ref,
      touched: observable,
      setGroupOperator: action,
      addCondition: action,
      addGroup: action,
      removeRule: action,
      toggleNegation: action,
      setColumn: action,
      setOperator: action,
      setValue: action,
    });
    this.tree = normalizeFilter(original.filter);
  }

  private update(
    key: number,
    replace: (rule: FilterRule) => FilterRule | undefined,
  ): void {
    const tree = replaceRule(this.tree, key, replace);
    // the top group stays a group
    if (tree instanceof CompositeFilter && tree !== this.tree) {
      this.tree = tree;
      this.touched = true;
    }
  }

  setGroupOperator(groupKey: number, operator: CompositeFilterOperator): void {
    this.update(groupKey, (rule) =>
      rule instanceof CompositeFilter ? rule.withOperator(operator) : rule,
    );
  }

  /** Adds a blank condition at the end of the group */
  addCondition(groupKey: number): void {
    this.update(groupKey, (rule) =>
      rule instanceof CompositeFilter
        ? rule.withRules([...rule.rules, blankRow()])
        : rule,
    );
  }

  /** Adds a group holding one blank condition at the end of the group */
  addGroup(groupKey: number): void {
    this.update(groupKey, (rule) =>
      rule instanceof CompositeFilter
        ? rule.withRules([
            ...rule.rules,
            new CompositeFilter(CompositeFilterOperator.AND, [blankRow()]),
          ])
        : rule,
    );
  }

  /** Removes a rule; the top group stays */
  removeRule(key: number): void {
    if (key !== this.tree.key) {
      this.update(key, () => undefined);
    }
  }

  /**
   * Negates a rule as simply as it can (`negateFilter`): a comparison takes
   * its negated operator, e.g. `is` and `is not`, a negation gives back its
   * rule, anything else is wrapped in Not. The top group can't be negated.
   */
  toggleNegation(key: number): void {
    if (key !== this.tree.key) {
      this.update(key, negateFilter);
    }
  }

  /** Changes a condition's column, keeping its operator and value when they still fit */
  setColumn(key: number, columnName: string, schema: Schema): void {
    this.update(key, (rule) =>
      rule instanceof ColumnComparisonFilter
        ? changeFilterColumn(rule, columnName, schema)
        : rule,
    );
  }

  /** Changes a condition's operator, dropping its value when the operator takes another shape */
  setOperator(key: number, operator: FilterOperator): void {
    this.update(key, (rule) =>
      rule instanceof ColumnComparisonFilter
        ? changeFilterOperator(rule, operator)
        : rule,
    );
  }

  setValue(key: number, value: FilterValue | undefined): void {
    this.update(key, (rule) =>
      rule instanceof ColumnComparisonFilter ? rule.withValue(value) : rule,
    );
  }

  build(): Filter {
    if (!this.touched) {
      return this.original;
    }
    const pruned = pruneBlankFilterRows(this.tree);
    return this.original.withFilter(
      pruned === undefined ? undefined : unwrapFilter(pruned),
    );
  }
}
