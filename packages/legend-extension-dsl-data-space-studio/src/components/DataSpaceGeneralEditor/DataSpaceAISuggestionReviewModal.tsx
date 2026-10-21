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
  CheckSquareIcon,
  clsx,
  Dialog,
  EmptySquareIcon,
  MinusSquareIcon,
  Modal,
  ModalBody,
  ModalFooter,
  ModalFooterButton,
  ModalFooterStatus,
  ModalHeader,
  ModalTitle,
  PanelLoadingIndicator,
  SparkleIcon,
} from '@finos/legend-art';
import { useApplicationStore } from '@finos/legend-application';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import {
  isDataSpaceAISuggestionRowSelectedByDefault,
  type DataSpaceAISuggestionRow,
} from '../../stores/DataSpaceAISuggestion.js';

export type DataSpaceAISuggestionSelection = {
  row: DataSpaceAISuggestionRow;
  value: string;
}[];

type CheckboxState = 'all' | 'some' | 'none';

const getCheckboxState = (
  selectedCount: number,
  totalCount: number,
): CheckboxState =>
  totalCount > 0 && selectedCount === totalCount
    ? 'all'
    : selectedCount
      ? 'some'
      : 'none';

const DataSpaceAISuggestionCheckbox = observer(
  (props: { state: CheckboxState; onToggle: () => void; title: string }) => {
    const { state, onToggle, title } = props;

    return (
      <button
        className={clsx('dataSpace-editor__ai-review__checkbox', {
          'dataSpace-editor__ai-review__checkbox--checked': state !== 'none',
        })}
        onClick={onToggle}
        title={title}
        type="button"
      >
        {state === 'all' ? (
          <CheckSquareIcon />
        ) : state === 'some' ? (
          <MinusSquareIcon />
        ) : (
          <EmptySquareIcon />
        )}
      </button>
    );
  },
);

const DataSpaceAISuggestionRowEditor = observer(
  (props: {
    row: DataSpaceAISuggestionRow;
    value: string;
    isSelected: boolean;
    setSelected: (selected: boolean) => void;
    setValue: (value: string) => void;
  }) => {
    const { row, value, isSelected, setSelected, setValue } = props;
    const hasCurrentValue = Boolean(row.currentValue?.trim());

    return (
      <div
        className={clsx('dataSpace-editor__ai-review__row', {
          'dataSpace-editor__ai-review__row--selected': isSelected,
        })}
      >
        <div className="dataSpace-editor__ai-review__row__header">
          <DataSpaceAISuggestionCheckbox
            state={isSelected ? 'all' : 'none'}
            onToggle={(): void => setSelected(!isSelected)}
            title={
              isSelected ? 'Keep the current value' : 'Use the suggested value'
            }
          />
          <span className="dataSpace-editor__ai-review__row__label">
            {row.fieldLabel}
          </span>
        </div>
        <div className="dataSpace-editor__ai-review__row__compare">
          <div className="dataSpace-editor__ai-review__row__side">
            <div className="dataSpace-editor__ai-review__row__side__label">
              Current
            </div>
            <div
              className={clsx('dataSpace-editor__ai-review__row__current', {
                'dataSpace-editor__ai-review__row__current--empty':
                  !hasCurrentValue,
                'dataSpace-editor__ai-review__row__current--replaced':
                  isSelected && hasCurrentValue,
              })}
            >
              {hasCurrentValue ? row.currentValue : '(empty)'}
            </div>
          </div>
          <div className="dataSpace-editor__ai-review__row__side">
            <div className="dataSpace-editor__ai-review__row__side__label">
              <SparkleIcon />
              Suggested
            </div>
            <textarea
              className="dataSpace-editor__ai-review__row__suggested"
              spellCheck={false}
              rows={row.fieldLabel === 'Title' ? 1 : 3}
              value={value}
              onChange={(event): void => setValue(event.target.value)}
            />
          </div>
        </div>
      </div>
    );
  },
);

/**
 * Lays the suggested titles and descriptions next to the current ones so the
 * user can pick (and tweak) which to fill into the form.
 */
export const DataSpaceAISuggestionReviewModal = observer(
  (props: {
    rows: DataSpaceAISuggestionRow[];
    overwrite: boolean;
    isRegenerating: boolean;
    onApply: (selection: DataSpaceAISuggestionSelection) => void;
    onDismiss: () => void;
    onRegenerate: () => void;
  }) => {
    const {
      rows,
      overwrite,
      isRegenerating,
      onApply,
      onDismiss,
      onRegenerate,
    } = props;
    const applicationStore = useApplicationStore();
    const darkMode =
      !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled;
    const [selectedKeys, setSelectedKeys] = useState(
      () =>
        new Set(
          rows
            .filter((row) =>
              isDataSpaceAISuggestionRowSelectedByDefault(row, overwrite),
            )
            .map((row) => row.key),
        ),
    );
    const [editedValues, setEditedValues] = useState<Map<string, string>>(
      () => new Map(),
    );

    const valueOf = (row: DataSpaceAISuggestionRow): string =>
      editedValues.get(row.key) ?? row.suggestedValue;
    const setSelected = (keys: string[], selected: boolean): void => {
      setSelectedKeys((prev) => {
        const next = new Set(prev);
        keys.forEach((key) => (selected ? next.add(key) : next.delete(key)));
        return next;
      });
    };
    const selectedCount = rows.filter((row) =>
      selectedKeys.has(row.key),
    ).length;
    const allSelected = rows.length > 0 && selectedCount === rows.length;

    const groups = rows.reduce((acc, row) => {
      const group = acc.get(row.groupKey);
      if (group) {
        group.rows.push(row);
      } else {
        acc.set(row.groupKey, { label: row.groupLabel, rows: [row] });
      }
      return acc;
    }, new Map<string, { label: string; rows: DataSpaceAISuggestionRow[] }>());

    const apply = (): void =>
      onApply(
        rows
          .filter((row) => selectedKeys.has(row.key))
          .map((row) => ({ row, value: valueOf(row) })),
      );

    return (
      <Dialog
        open={true}
        onClose={onDismiss}
        classes={{ container: 'search-modal__container' }}
        slotProps={{
          paper: { classes: { root: 'search-modal__inner-container' } },
        }}
      >
        <Modal darkMode={darkMode} className="dataSpace-editor__ai-review">
          <ModalHeader>
            <ModalTitle icon={<SparkleIcon />} title="Review AI Suggestions" />
          </ModalHeader>
          <PanelLoadingIndicator isLoading={isRegenerating} />
          <ModalBody className="dataSpace-editor__ai-review__body">
            {rows.length === 0 ? (
              <div className="dataSpace-editor__ai-review__empty">
                {overwrite
                  ? 'LegendAI did not suggest any changes for this data space.'
                  : 'LegendAI kept all existing titles and descriptions, so there is nothing new to fill in. Use Regenerate All to get fresh suggestions for every field.'}
              </div>
            ) : (
              <>
                <div className="dataSpace-editor__ai-review__toolbar">
                  <DataSpaceAISuggestionCheckbox
                    state={getCheckboxState(selectedCount, rows.length)}
                    onToggle={(): void =>
                      setSelected(
                        rows.map((row) => row.key),
                        !allSelected,
                      )
                    }
                    title={allSelected ? 'Deselect all' : 'Select all'}
                  />
                  <span>
                    {selectedCount} of {rows.length} suggestion
                    {rows.length === 1 ? '' : 's'} selected
                  </span>
                </div>
                {Array.from(groups.entries()).map(([groupKey, group]) => {
                  const groupKeys = group.rows.map((row) => row.key);
                  const groupSelectedCount = groupKeys.filter((key) =>
                    selectedKeys.has(key),
                  ).length;
                  const groupAllSelected =
                    groupSelectedCount === groupKeys.length;
                  return (
                    <div
                      key={groupKey}
                      className="dataSpace-editor__ai-review__group"
                    >
                      <div className="dataSpace-editor__ai-review__group__header">
                        <DataSpaceAISuggestionCheckbox
                          state={getCheckboxState(
                            groupSelectedCount,
                            groupKeys.length,
                          )}
                          onToggle={(): void =>
                            setSelected(groupKeys, !groupAllSelected)
                          }
                          title={
                            groupAllSelected ? 'Deselect group' : 'Select group'
                          }
                        />
                        <span className="dataSpace-editor__ai-review__group__label">
                          {group.label}
                        </span>
                      </div>
                      {group.rows.map((row) => (
                        <DataSpaceAISuggestionRowEditor
                          key={row.key}
                          row={row}
                          value={valueOf(row)}
                          isSelected={selectedKeys.has(row.key)}
                          setSelected={(selected): void =>
                            setSelected([row.key], selected)
                          }
                          setValue={(value): void => {
                            setEditedValues((prev) =>
                              new Map(prev).set(row.key, value),
                            );
                            setSelected([row.key], true);
                          }}
                        />
                      ))}
                    </div>
                  );
                })}
              </>
            )}
          </ModalBody>
          <ModalFooter>
            <ModalFooterStatus className="dataSpace-editor__ai-review__footer-status">
              Applied values are filled into the form and can still be edited.
            </ModalFooterStatus>
            <ModalFooterButton
              darkMode={darkMode}
              type="secondary"
              text="Regenerate All"
              title="Ask LegendAI for fresh suggestions for every field, including ones that already have a value"
              inProgressText={isRegenerating ? 'Regenerating...' : undefined}
              onClick={onRegenerate}
              formatText={false}
            />
            <ModalFooterButton
              darkMode={darkMode}
              type="secondary"
              text="Dismiss"
              onClick={onDismiss}
              formatText={false}
            />
            <ModalFooterButton
              darkMode={darkMode}
              text={`Apply ${selectedCount} Selected`}
              disabled={selectedCount === 0 || isRegenerating}
              onClick={apply}
              formatText={false}
            />
          </ModalFooter>
        </Modal>
      </Dialog>
    );
  },
);
