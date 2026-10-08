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

import { clsx, TimesIcon } from '@finos/legend-art';
import {
  ColumnComparisonFilter,
  CompositeFilter,
  CompositeFilterOperator,
  FILTER_OPERATOR_DESCRIPTIONS,
  type FilterRule,
  getAvailableOperators,
  getFilterValueShape,
  isExactFloatComparison,
  isFilterOperator,
  MESSAGE_FILTER_UNSUPPORTED,
  NEGATIVE_OPERATORS,
  NotFilter,
  type Schema,
} from '@finos/legend-cube';
import { guaranteeType } from '@finos/legend-shared';
import { observer } from 'mobx-react-lite';
import {
  FILTER_FLOAT_COMPARISON_HINT,
  FILTER_NULL_NOTE,
} from '../../__lib__/LegendCubeLabels.js';
import { LEGEND_CUBE_TEST_ID } from '../../__lib__/LegendCubeTesting.js';
import { CubeFilterDraft } from '../../stores/editors/CubeFilterDraft.js';
import { CubeButton } from '../CubeButton.js';
import { CubeColumnPicker } from './CubeColumnPicker.js';
import type { CubeNodeEditorProps } from './CubeNodeEditorRegistry.js';
import { CubeValueEditor } from './CubeValueEditor.js';

const SMALL_BUTTON =
  'flex h-6 shrink-0 items-center justify-center rounded-sm px-1 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] disabled:text-[var(--color-text-disabled)]';

interface CubeFilterRuleProps {
  readonly draft: CubeFilterDraft;
  readonly schema: Schema;
  readonly readOnly: boolean;
}

const CubeRemoveRuleButton: React.FC<
  CubeFilterRuleProps & { rule: FilterRule; label: string }
> = (props) => (
  <button
    className={SMALL_BUTTON}
    aria-label={props.label}
    title={props.label}
    disabled={props.readOnly}
    onClick={() => props.draft.removeRule(props.rule.key)}
  >
    <TimesIcon />
  </button>
);

/** A condition: column, operator, value, and its negation and removal */
const CubeFilterCondition = observer(
  (props: CubeFilterRuleProps & { rule: ColumnComparisonFilter }) => {
    const { draft, schema, readOnly, rule } = props;
    const type = schema.type(rule.columnName);
    const operators = type ? getAvailableOperators(type) : [];
    const isNegated = NEGATIVE_OPERATORS.includes(rule.operator);
    return (
      <li
        className="flex flex-col gap-1 py-1"
        data-testid={LEGEND_CUBE_TEST_ID.FILTER_CONDITION}
      >
        <div className="flex items-center gap-1">
          <div className="w-2/5 min-w-0">
            <CubeColumnPicker
              label="Filter column"
              schema={schema}
              value={rule.columnName}
              disabled={readOnly}
              onChange={(name) => draft.setColumn(rule.key, name, schema)}
            />
          </div>
          <select
            aria-label="Filter operator"
            className="h-6 shrink-0 rounded-sm border border-[var(--color-border-default)] bg-[var(--color-bg-input)] px-1 text-base"
            value={rule.operator}
            disabled={readOnly || !type}
            onChange={(event) => {
              if (isFilterOperator(event.target.value)) {
                draft.setOperator(rule.key, event.target.value);
              }
            }}
          >
            {!operators.includes(rule.operator) && (
              <option value={rule.operator} disabled={true}>
                {FILTER_OPERATOR_DESCRIPTIONS[rule.operator]}
              </option>
            )}
            {operators.map((operator) => (
              <option key={operator} value={operator}>
                {FILTER_OPERATOR_DESCRIPTIONS[operator]}
              </option>
            ))}
          </select>
          {type && (
            <CubeValueEditor
              label="Filter value"
              type={type}
              shape={getFilterValueShape(rule.operator)}
              value={rule.value}
              disabled={readOnly}
              onChange={(value) => draft.setValue(rule.key, value)}
            />
          )}
          <span className="flex-1" />
          <button
            className={clsx(SMALL_BUTTON, {
              'text-[var(--color-accent)]': isNegated,
            })}
            aria-label="Negate the condition"
            aria-pressed={isNegated}
            title="Negate the condition, e.g. is and is not"
            disabled={readOnly || !type}
            onClick={() => draft.toggleNegation(rule.key)}
          >
            Not
          </button>
          <CubeRemoveRuleButton {...props} label="Remove the condition" />
        </div>
        {type && isExactFloatComparison(rule.operator, type) && (
          <div className="text-sm text-[var(--color-text-secondary)]">
            {FILTER_FLOAT_COMPARISON_HINT}
          </div>
        )}
      </li>
    );
  },
);

/** Any rule of the tree, by kind */
const CubeFilterRuleEditor = observer(
  (props: CubeFilterRuleProps & { rule: FilterRule }) => {
    const { rule } = props;
    if (rule instanceof ColumnComparisonFilter) {
      return <CubeFilterCondition {...props} rule={rule} />;
    }
    if (rule instanceof CompositeFilter) {
      return (
        <li>
          {/* a group holds rules, so the two render each other */}
          {/* eslint-disable-next-line @typescript-eslint/no-use-before-define */}
          <CubeFilterGroup {...props} group={rule} isTop={false} />
        </li>
      );
    }
    if (rule instanceof NotFilter) {
      return (
        <li className="flex items-start gap-1">
          <button
            className={clsx(SMALL_BUTTON, 'text-[var(--color-accent)]')}
            aria-label="Remove the negation"
            aria-pressed={true}
            title="Remove the negation"
            disabled={props.readOnly}
            onClick={() => props.draft.toggleNegation(rule.key)}
          >
            Not
          </button>
          <ul className="min-w-0 flex-1">
            <CubeFilterRuleEditor {...props} rule={rule.rule} />
          </ul>
        </li>
      );
    }
    // a rule this version can't read stays as it is
    return (
      <li className="flex items-center gap-1 py-1 text-base text-[var(--color-status-warn)]">
        <span className="flex-1">{MESSAGE_FILTER_UNSUPPORTED}</span>
        <CubeRemoveRuleButton {...props} label="Remove the filter" />
      </li>
    );
  },
);

/** An And/Or group: its rules, and buttons to add to it */
const CubeFilterGroup = observer(
  (props: CubeFilterRuleProps & { group: CompositeFilter; isTop: boolean }) => {
    const { draft, readOnly, group, isTop } = props;
    return (
      <div
        className={clsx('flex flex-col gap-1', {
          'rounded-sm border border-[var(--color-border-subtle)] p-1': !isTop,
        })}
      >
        <div className="flex items-center gap-1 text-sm">
          <select
            aria-label={
              isTop ? 'Combine the conditions with' : 'Combine the group with'
            }
            className="h-6 rounded-sm border border-[var(--color-border-default)] bg-[var(--color-bg-input)] px-1 text-base"
            value={group.operator}
            disabled={readOnly}
            onChange={(event) =>
              draft.setGroupOperator(
                group.key,
                event.target.value === CompositeFilterOperator.OR
                  ? CompositeFilterOperator.OR
                  : CompositeFilterOperator.AND,
              )
            }
          >
            <option value={CompositeFilterOperator.AND}>All of (and)</option>
            <option value={CompositeFilterOperator.OR}>Any of (or)</option>
          </select>
          <span className="flex-1" />
          {!isTop && (
            <>
              <button
                className={SMALL_BUTTON}
                aria-label="Negate the group"
                title="Keep the rows the group doesn't match"
                disabled={readOnly}
                onClick={() => draft.toggleNegation(group.key)}
              >
                Not
              </button>
              <CubeRemoveRuleButton
                {...props}
                rule={group}
                label="Remove the group"
              />
            </>
          )}
        </div>
        <ul className="flex flex-col pl-2">
          {group.rules.map((rule) => (
            <CubeFilterRuleEditor key={rule.key} {...props} rule={rule} />
          ))}
        </ul>
        <div className="flex gap-1">
          <CubeButton
            disabled={readOnly}
            onClick={() => draft.addCondition(group.key)}
          >
            {isTop ? 'Add condition' : 'Add condition to the group'}
          </CubeButton>
          <CubeButton
            disabled={readOnly}
            onClick={() => draft.addGroup(group.key)}
          >
            {isTop ? 'Add group' : 'Add group to the group'}
          </CubeButton>
        </div>
      </div>
    );
  },
);

/**
 * The Filter editor (spec §8.5): conditions of a column, an operator and a
 * value, in And/Or groups, each of which can be negated. Operators follow
 * the column's type; values are read as its type, and text that isn't one is
 * kept, marked, to be fixed. Blank conditions are not stored.
 */
export const CubeFilterEditor = observer((props: CubeNodeEditorProps) => {
  const draft = guaranteeType(props.draft, CubeFilterDraft);
  const [schema] = props.inputSchemas as [Schema];
  return (
    <div className="flex flex-col gap-2">
      <CubeFilterGroup
        draft={draft}
        schema={schema}
        readOnly={props.readOnly}
        group={draft.tree}
        isTop={true}
      />
      <div className="text-sm text-[var(--color-text-secondary)]">
        {FILTER_NULL_NOTE}
      </div>
    </div>
  );
});
