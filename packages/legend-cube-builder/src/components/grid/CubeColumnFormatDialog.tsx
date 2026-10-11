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
  Dialog,
  Modal,
  ModalBody,
  ModalFooter,
  ModalFooterButton,
  ModalHeader,
} from '@finos/legend-art';
import {
  type ColumnFormat,
  ColumnFormatStyle,
  foldColumnName,
  getColumnFormat,
} from '@finos/legend-cube';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { LEGEND_CUBE_TEST_ID } from '../../__lib__/LegendCubeTesting.js';
import type { CubeEditorState } from '../../stores/CubeEditorState.js';
import {
  formatColumnValue,
  getColumnFormatProblem,
  getCubeCurrencyCodes,
} from './CubeGridValues.js';

const STYLE_LABELS: Readonly<Record<ColumnFormatStyle, string>> = {
  [ColumnFormatStyle.NUMBER]: 'Number',
  [ColumnFormatStyle.CURRENCY]: 'Currency',
  [ColumnFormatStyle.PERCENT]: 'Percent',
};

/** The values the preview formats: a negative and a fraction */
const PREVIEW_VALUES = ['-1234567.891', '0.25'];

const DEFAULT_FORMAT: ColumnFormat = {
  style: ColumnFormatStyle.NUMBER,
  grouping: true,
  redIfNegative: false,
  parenthesesIfNegative: false,
};

const inputClass =
  'h-6 rounded-sm border border-[var(--color-border-default)] bg-[var(--color-bg-input)] px-1 text-base text-[var(--color-text-primary)]';

/** The dialog's form, for the column whose format it edits */
const CubeColumnFormatForm = observer(
  (props: { editorState: CubeEditorState; column: string }) => {
    const { editorState, column } = props;
    const { grid } = editorState;
    const hints = editorState.document.meta.presentation.columnHints ?? [];
    const current = getColumnFormat(hints, column);
    const ownFormat = hints.some(
      (hint) =>
        hint.column !== undefined &&
        foldColumnName(hint.column) === foldColumnName(column),
    );
    // the column shows the format of every number column (review of M7)
    const sharedFormat =
      !ownFormat && hints.some((hint) => hint.column === undefined);
    const [format, setFormat] = useState<ColumnFormat>(
      current ?? DEFAULT_FORMAT,
    );
    const [places, setPlaces] = useState(
      current?.decimalPlaces === undefined ? '' : String(current.decimalPlaces),
    );
    const [applyToAll, setApplyToAll] = useState(false);
    const darkMode =
      !editorState.host.applicationStore.layoutService
        .TEMPORARY__isLightColorThemeEnabled;
    const placesError =
      places.trim() === '' || /^(?:1?\d|20)$/u.test(places.trim())
        ? undefined
        : 'Decimal places are a whole number from 0 to 20, or blank for all.';
    const edited: ColumnFormat = {
      ...format,
      ...(format.style === ColumnFormatStyle.CURRENCY
        ? { currency: format.currency ?? 'USD' }
        : { currency: undefined }),
      decimalPlaces:
        places.trim() === '' || placesError ? undefined : Number(places),
    };
    const problem = getColumnFormatProblem(edited);
    const flag = (
      key: 'grouping' | 'redIfNegative' | 'parenthesesIfNegative',
      label: string,
    ) => (
      <label className="flex items-center gap-2 text-base">
        <input
          type="checkbox"
          checked={format[key]}
          onChange={(event) =>
            setFormat({ ...format, [key]: event.target.checked })
          }
        />
        {label}
      </label>
    );
    const close = (): void => grid.closeFormat();
    return (
      <Modal darkMode={darkMode} className="w-[460px] max-w-full">
        <ModalHeader>
          <div className="modal__title">{`Format ${column}`}</div>
        </ModalHeader>
        <ModalBody>
          <div
            className="flex flex-col gap-2"
            data-testid={LEGEND_CUBE_TEST_ID.COLUMN_FORMAT}
          >
            <label className="flex items-center justify-between gap-2 text-base">
              Style
              <select
                className={inputClass}
                aria-label="Style"
                value={format.style}
                onChange={(event) =>
                  setFormat({ ...format, style: event.target.value })
                }
              >
                {Object.values(ColumnFormatStyle).map((style) => (
                  <option key={style} value={style}>
                    {STYLE_LABELS[style]}
                  </option>
                ))}
              </select>
            </label>
            {format.style === ColumnFormatStyle.CURRENCY && (
              <label className="flex items-center justify-between gap-2 text-base">
                Currency
                <select
                  className={inputClass}
                  aria-label="Currency"
                  value={edited.currency}
                  onChange={(event) =>
                    setFormat({ ...format, currency: event.target.value })
                  }
                >
                  {getCubeCurrencyCodes().map((code) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="flex items-center justify-between gap-2 text-base">
              Decimal places
              <input
                className={`${inputClass} w-20 text-right`}
                aria-label="Decimal places"
                aria-invalid={placesError !== undefined}
                placeholder="All"
                value={places}
                onChange={(event) => setPlaces(event.target.value)}
              />
            </label>
            {placesError && (
              <div
                className="text-sm text-[var(--color-status-error)]"
                role="alert"
              >
                {placesError}
              </div>
            )}
            {flag('grouping', 'Thousands separators')}
            {flag('redIfNegative', 'Red if negative')}
            {flag('parenthesesIfNegative', 'Parentheses if negative')}
            <label className="flex items-center gap-2 text-base">
              <input
                type="checkbox"
                checked={applyToAll}
                onChange={(event) => setApplyToAll(event.target.checked)}
              />
              Apply to every number column
            </label>
            <div className="text-base" aria-label="Preview">
              <span className="text-[var(--color-text-secondary)]">
                Preview:{' '}
              </span>
              {problem ??
                PREVIEW_VALUES.map((value) => {
                  const shown = formatColumnValue(value, edited);
                  return (
                    <span
                      key={value}
                      className={
                        edited.redIfNegative && shown?.negative
                          ? 'mr-3 text-[var(--color-status-error)]'
                          : 'mr-3'
                      }
                    >
                      {shown?.text ?? value}
                    </span>
                  );
                })}
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          {ownFormat && (
            <ModalFooterButton
              darkMode={darkMode}
              formatText={false}
              type="secondary"
              text="Remove Format"
              onClick={() => {
                grid.setColumnFormat(column, undefined);
                close();
              }}
            />
          )}
          {sharedFormat && (
            <ModalFooterButton
              darkMode={darkMode}
              formatText={false}
              type="secondary"
              text="Remove Format of Every Number Column"
              onClick={() => {
                grid.setColumnFormat(undefined, undefined);
                close();
              }}
            />
          )}
          <ModalFooterButton
            darkMode={darkMode}
            formatText={false}
            text="Apply"
            disabled={placesError !== undefined || problem !== undefined}
            onClick={() => {
              grid.setColumnFormat(applyToAll ? undefined : column, edited);
              close();
            }}
          />
          <ModalFooterButton
            darkMode={darkMode}
            formatText={false}
            type="secondary"
            text="Cancel"
            onClick={close}
          />
        </ModalFooter>
      </Modal>
    );
  },
);

/**
 * Formats a number column (spec §13.1, PLAN §11.10): a number, a currency by
 * its ISO 4217 code, or a percent; its decimal places, thousands separators,
 * and negatives in red or in parentheses; for the column, or every number
 * column. An undo step that leaves the rows current.
 */
export const CubeColumnFormatDialog = observer(
  (props: { editorState: CubeEditorState }) => {
    const { editorState } = props;
    const column = editorState.grid.formatColumn;
    return (
      <Dialog
        open={column !== undefined}
        onClose={() => editorState.grid.closeFormat()}
      >
        {column !== undefined ? (
          <CubeColumnFormatForm
            key={column}
            editorState={editorState}
            column={column}
          />
        ) : (
          <div />
        )}
      </Dialog>
    );
  },
);
