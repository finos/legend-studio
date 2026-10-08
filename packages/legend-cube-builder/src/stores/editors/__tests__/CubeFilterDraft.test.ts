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

import { describe, expect, test } from '@jest/globals';
import {
  ColumnComparisonFilter,
  CompositeFilter,
  CompositeFilterOperator,
  Filter,
  FilterOperator,
  NotFilter,
  Schema,
  UnsupportedFilter,
} from '@finos/legend-cube';
import {
  ORDERS_COLUMNS,
  SLICE_FILTER,
} from '../../../__test-utils__/CubeNorthwindTestQueries.js';
import { CubeFilterDraft, pruneBlankFilterRows } from '../CubeFilterDraft.js';

const ORDERS = new Schema(ORDERS_COLUMNS);
const france = (): ColumnComparisonFilter =>
  new ColumnComparisonFilter('SHIP_COUNTRY', FilterOperator.EQUAL, {
    kind: 'string',
    value: 'France',
  });

/** The rules of the draft's top group */
const topRules = (draft: CubeFilterDraft): readonly unknown[] =>
  draft.tree.rules;

describe('Filter draft', () => {
  test('Starts a filter without a rule as a group of one blank condition, which builds nothing', () => {
    const original = new Filter('filter101');
    const draft = new CubeFilterDraft(original);
    expect(draft.tree.operator).toBe(CompositeFilterOperator.AND);
    expect(draft.tree.rules).toHaveLength(1);
    expect((draft.tree.rules[0] as ColumnComparisonFilter).columnName).toBe('');
    expect(draft.build()).toBe(original);
    // touched, but still only blank: no filter is stored
    draft.addCondition(draft.tree.key);
    expect(draft.build().filter).toBeUndefined();
  });

  test('Builds the original filter until something changes, and a single rule unwrapped', () => {
    const original = new Filter('filter101', france());
    const draft = new CubeFilterDraft(original);
    expect(draft.build()).toBe(original);
    const [rule] = draft.tree.rules;
    draft.setOperator(rule?.key ?? 0, FilterOperator.NOT_EQUAL);
    const built = draft.build();
    expect(built.id).toBe('filter101');
    expect(built.filter?.toString()).toBe('SHIP_COUNTRY is not "France"');
    expect(built.filter).toBeInstanceOf(ColumnComparisonFilter);
  });

  test('Builds the original when a saved group of one rule is touched and set back, and still builds real changes', () => {
    const groupOfOne = new Filter(
      'filter101',
      new CompositeFilter(CompositeFilterOperator.AND, [france()]),
    );
    const draft = new CubeFilterDraft(groupOfOne);
    // normalized as it was saved: the group itself
    draft.setGroupOperator(draft.tree.key, CompositeFilterOperator.OR);
    draft.setGroupOperator(draft.tree.key, CompositeFilterOperator.AND);
    expect(draft.build()).toBe(groupOfOne);
    draft.addCondition(draft.tree.key);
    expect(draft.build()).toBe(groupOfOne);
    const key = (draft.tree.rules[0] as ColumnComparisonFilter).key;
    draft.setOperator(key, FilterOperator.NOT_EQUAL);
    expect(draft.build().filter?.toString()).toBe(
      'SHIP_COUNTRY is not "France"',
    );
  });

  test('Counts dropping a saved blank condition as a change', () => {
    const withBlank = new Filter(
      'filter101',
      new CompositeFilter(CompositeFilterOperator.AND, [
        france(),
        new ColumnComparisonFilter(''),
      ]),
    );
    const draft = new CubeFilterDraft(withBlank);
    draft.setGroupOperator(draft.tree.key, CompositeFilterOperator.OR);
    draft.setGroupOperator(draft.tree.key, CompositeFilterOperator.AND);
    const built = draft.build();
    expect(built).not.toBe(withBlank);
    expect(built.filter?.toString()).toBe('SHIP_COUNTRY is "France"');
  });

  test('Leaves out blank conditions anywhere, and the groups they leave empty', () => {
    const draft = new CubeFilterDraft(new Filter('filter101', france()));
    draft.addCondition(draft.tree.key);
    draft.addGroup(draft.tree.key);
    expect(topRules(draft)).toHaveLength(3);
    expect(draft.build().filter?.toString()).toBe('SHIP_COUNTRY is "France"');
    const group = draft.tree.rules[2] as CompositeFilter;
    const [inner] = group.rules;
    draft.setColumn(inner?.key ?? 0, 'SHIP_CITY', ORDERS);
    // a condition with a column is kept, even without its value
    expect(draft.build().filter?.toString()).toBe(
      'SHIP_COUNTRY is "France" and SHIP_CITY is (blank)',
    );
  });

  test('Keeps each rule its key while it is edited', () => {
    const draft = new CubeFilterDraft(new Filter('filter101'));
    const [row] = draft.tree.rules;
    const key = row?.key ?? 0;
    draft.setColumn(key, 'SHIP_COUNTRY', ORDERS);
    draft.setValue(key, { kind: 'string', value: 'France' });
    draft.setOperator(key, FilterOperator.CONTAINS);
    expect(draft.tree.rules[0]?.key).toBe(key);
    expect(draft.tree.rules[0]?.toString()).toBe(
      'SHIP_COUNTRY contains "France"',
    );
  });

  test('Resets the operator and value when the new column takes other values, keeps them otherwise', () => {
    const draft = new CubeFilterDraft(new Filter('filter101', france()));
    const key = draft.tree.rules[0]?.key ?? 0;
    draft.setColumn(key, 'SHIP_CITY', ORDERS);
    expect(draft.tree.rules[0]?.toString()).toBe('SHIP_CITY is "France"');
    draft.setColumn(key, 'EMPLOYEE_ID', ORDERS);
    expect(draft.tree.rules[0]?.toString()).toBe('EMPLOYEE_ID is (blank)');
  });

  test('Drops the value when the new operator takes another shape', () => {
    const draft = new CubeFilterDraft(new Filter('filter101', france()));
    const key = draft.tree.rules[0]?.key ?? 0;
    draft.setOperator(key, FilterOperator.IN);
    expect((draft.tree.rules[0] as ColumnComparisonFilter).value).toBe(
      undefined,
    );
  });

  test('Negates a condition through its operator, and anything else with Not, back and forth', () => {
    const draft = new CubeFilterDraft(new Filter('filter101', france()));
    const key = draft.tree.rules[0]?.key ?? 0;
    draft.toggleNegation(key);
    expect(draft.tree.rules[0]?.toString()).toBe(
      'SHIP_COUNTRY is not "France"',
    );
    draft.toggleNegation(key);
    expect(draft.tree.rules[0]?.toString()).toBe('SHIP_COUNTRY is "France"');
    draft.addGroup(draft.tree.key);
    const group = draft.tree.rules[1] as CompositeFilter;
    draft.toggleNegation(group.key);
    const negated = draft.tree.rules[1] as NotFilter;
    expect(negated).toBeInstanceOf(NotFilter);
    draft.toggleNegation(negated.key);
    expect(draft.tree.rules[1]).toBe(group);
  });

  test('Never removes or negates the top group', () => {
    const draft = new CubeFilterDraft(new Filter('filter101', france()));
    const { tree } = draft;
    draft.removeRule(tree.key);
    draft.toggleNegation(tree.key);
    expect(draft.tree).toBe(tree);
    expect(draft.build()).toBe(draft.original);
  });

  test('Removes a rule, and a negation with its rule', () => {
    const draft = new CubeFilterDraft(new Filter('filter101', SLICE_FILTER));
    const [first, second] = draft.tree.rules;
    draft.toggleNegation(second?.key ?? 0);
    // a comparison without a negated operator is wrapped in Not
    const negated = draft.tree.rules[1] as NotFilter;
    expect(negated).toBeInstanceOf(NotFilter);
    draft.removeRule(second?.key ?? 0);
    expect(draft.tree.rules).toHaveLength(2);
    draft.removeRule(first?.key ?? 0);
    expect(draft.build().filter?.toString()).toBe(
      'EMPLOYEE_ID is in list of (1, 4)',
    );
  });

  test('Keeps a rule this version cannot read as it was', () => {
    const unsupported = new UnsupportedFilter({ op: 'between', low: 1 });
    const original = new Filter(
      'filter101',
      new CompositeFilter(CompositeFilterOperator.AND, [france(), unsupported]),
    );
    const draft = new CubeFilterDraft(original);
    draft.setGroupOperator(draft.tree.key, CompositeFilterOperator.OR);
    const built = draft.build().filter as CompositeFilter;
    expect(built.operator).toBe(CompositeFilterOperator.OR);
    expect(built.rules[1]).toBe(unsupported);
  });
});

describe('Leaving out blank conditions', () => {
  test('Gives the rule itself when it has none, and nothing for a tree of nothing else', () => {
    const rule = france();
    expect(pruneBlankFilterRows(rule)).toBe(rule);
    const group = new CompositeFilter(CompositeFilterOperator.OR, [
      rule,
      new NotFilter(france()),
    ]);
    expect(pruneBlankFilterRows(group)).toBe(group);
    expect(
      pruneBlankFilterRows(
        new CompositeFilter(CompositeFilterOperator.AND, [
          new ColumnComparisonFilter(''),
          new NotFilter(new ColumnComparisonFilter('')),
          new CompositeFilter(CompositeFilterOperator.OR, [
            new ColumnComparisonFilter(''),
          ]),
        ]),
      ),
    ).toBeUndefined();
  });

  test('Keeps a condition with a value but no column, to be reported', () => {
    const row = new ColumnComparisonFilter('', FilterOperator.EQUAL, {
      kind: 'string',
      value: 'x',
    });
    expect(pruneBlankFilterRows(row)).toBe(row);
  });
});
