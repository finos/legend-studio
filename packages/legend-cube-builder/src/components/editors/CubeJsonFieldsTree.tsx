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

import { CaretDownIcon, CaretRightIcon, clsx } from '@finos/legend-art';
import { type SchemaColumn, TypeFamily } from '@finos/legend-cube';
import { flowResult } from 'mobx';
import { observer } from 'mobx-react-lite';
import {
  CUBE_JSON_FIELDS_TITLE,
  getCubeJsonFieldsStatus,
} from '../../__lib__/LegendCubeLabels.js';
import type { CubeJsonFieldsState } from '../../stores/variant/CubeJsonFieldsState.js';
import {
  type CubeJsonField,
  getCubeJsonFieldDefault,
  getCubeJsonOfferExpression,
} from '../../stores/variant/CubeJsonOffers.js';
import { CubeButton } from '../CubeButton.js';

/** Whether a column holds JSON, whose fields an expression editor can open */
export const isCubeJsonColumn = (column: SchemaColumn): boolean =>
  column.type.family === TypeFamily.VARIANT;

/**
 * The caret beside a Variant column's chip, which opens or closes its fields;
 * greyed, with the reason, on a database without JSON functions
 */
export const CubeJsonFieldsToggle = observer(
  (props: {
    fields: CubeJsonFieldsState;
    column: SchemaColumn;
    disabled: boolean;
  }) => {
    const { fields, column, disabled } = props;
    const open = fields.isOpen(column.name);
    const problem = fields.databaseProblem;
    return (
      <button
        type="button"
        className={clsx(
          'flex h-full items-center rounded-sm border px-0.5 disabled:text-[var(--color-text-disabled)]',
          open
            ? 'border-[var(--color-accent)] text-[var(--color-accent)]'
            : 'border-[var(--color-border-subtle)] hover:bg-[var(--color-bg-hover)]',
        )}
        aria-label={`Fields of ${column.name}`}
        aria-expanded={open}
        title={problem ?? (open ? undefined : CUBE_JSON_FIELDS_TITLE.OPEN)}
        disabled={disabled || problem !== undefined}
        onClick={() => {
          // a failed read shows its message under the chips
          flowResult(fields.toggle(column)).catch(() => undefined);
        }}
      >
        <span className="font-mono text-xs">{'{}'}</span>
        {open ? <CaretDownIcon /> : <CaretRightIcon />}
      </button>
    );
  },
);

/** A field of the tree: its key, kind and share, what a click writes, its other forms, then its fields */
const CubeJsonFieldsRow = observer(
  (props: {
    fields: CubeJsonFieldsState;
    column: string;
    field: CubeJsonField;
    depth: number;
    disabled: boolean;
    onInsert: (expression: string) => void;
    onAddColumn: ((name: string, code: string) => void) | undefined;
  }) => {
    const { fields, column, field, depth, disabled, onInsert, onAddColumn } =
      props;
    const label = [column, ...field.path].join('.');
    const share = Math.round(field.presence * 100);
    const folded = fields.isFolded(field.path);
    const byDefault = getCubeJsonFieldDefault(column, field);
    const defaultKey = field.offers.find(
      ({ key }) => key === 'value' || key === 'json',
    )?.key;
    const forms = field.offers.filter((offer) => offer.key !== defaultKey);
    const formsShown = fields.areFormsShown(field.path);
    return (
      <li>
        <div
          className="flex items-center gap-1 py-0.5 pr-1"
          style={{ paddingLeft: `${4 + depth * 14}px` }}
        >
          {field.children.length ? (
            <button
              type="button"
              className="flex w-4 shrink-0 items-center justify-center text-[var(--color-text-secondary)]"
              aria-label={`${folded ? 'Unfold' : 'Fold'} ${label}`}
              onClick={() => fields.toggleFolded(field.path)}
            >
              {folded ? <CaretRightIcon /> : <CaretDownIcon />}
            </button>
          ) : (
            <span className="w-4 shrink-0" />
          )}
          <button
            type="button"
            className="flex min-w-0 flex-1 items-baseline gap-2 rounded-sm px-1 text-left enabled:hover:bg-[var(--color-bg-hover)] disabled:text-[var(--color-text-disabled)]"
            aria-label={`Write ${label}`}
            title={`Write ${byDefault.expression}`}
            disabled={disabled}
            onClick={() => onInsert(byDefault.expression)}
          >
            <span className="break-all font-mono text-sm">
              {field.path.at(-1) ?? column}
            </span>
            <span className="shrink-0 text-xs text-[var(--color-text-secondary)]">
              {field.description}
            </span>
            {share < 100 && (
              <span className="ml-auto shrink-0 text-xs text-[var(--color-text-muted)]">
                {share}%
              </span>
            )}
          </button>
          {onAddColumn && byDefault.column && (
            <button
              type="button"
              className="shrink-0 rounded-sm border border-[var(--color-border-subtle)] px-1 text-sm enabled:hover:bg-[var(--color-bg-hover)] disabled:text-[var(--color-text-disabled)]"
              aria-label={`Add ${label} as a column`}
              title={`A new column ${byDefault.column.name}: ${byDefault.column.code}`}
              disabled={disabled}
              onClick={() => {
                if (byDefault.column) {
                  onAddColumn(byDefault.column.name, byDefault.column.code);
                }
              }}
            >
              + column
            </button>
          )}
          {forms.length > 0 && (
            <button
              type="button"
              className={clsx(
                'shrink-0 rounded-sm border px-1 text-sm enabled:hover:bg-[var(--color-bg-hover)]',
                formsShown
                  ? 'border-[var(--color-accent)]'
                  : 'border-[var(--color-border-subtle)]',
              )}
              aria-label={`Other forms of ${label}`}
              aria-expanded={formsShown}
              title={CUBE_JSON_FIELDS_TITLE.FORMS}
              onClick={() => fields.toggleForms(field.path)}
            >
              ···
            </button>
          )}
        </div>
        {formsShown && (
          <ul
            aria-label={`Forms of ${label}`}
            className="my-0.5 rounded-sm border border-[var(--color-border-subtle)]"
            style={{ marginLeft: `${22 + depth * 14}px` }}
          >
            {forms.map((offer) => {
              const expression = getCubeJsonOfferExpression(offer);
              return (
                <li key={offer.key}>
                  <button
                    type="button"
                    className="flex w-full items-baseline gap-2 px-2 py-0.5 text-left text-sm enabled:hover:bg-[var(--color-bg-hover)] disabled:text-[var(--color-text-disabled)]"
                    title={
                      expression === undefined
                        ? CUBE_JSON_FIELDS_TITLE.EXPLODE
                        : `Write ${expression}`
                    }
                    disabled={disabled || expression === undefined}
                    onClick={() => {
                      if (expression !== undefined) {
                        onInsert(expression);
                      }
                    }}
                  >
                    {offer.label}
                    <span className="text-xs text-[var(--color-text-muted)]">
                      {offer.explode ? 'Explode Array' : offer.type}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {!folded && field.children.length > 0 && (
          <ul>
            {field.children.map((child) => (
              <CubeJsonFieldsRow
                key={JSON.stringify(child.path)}
                {...props}
                field={child}
                depth={depth + 1}
              />
            ))}
          </ul>
        )}
      </li>
    );
  },
);

/**
 * A Variant input column's fields in an expression editor (PLAN §11.20, V.9),
 * under the input columns while its caret is open: what was read, a search,
 * and the field tree. A field clicked writes its expression where the
 * editor's chips write; "+ column", where the editor has rows, adds one; its
 * other forms write theirs, one row per element being a step of its own.
 */
export const CubeJsonFieldsTree = observer(
  (props: {
    fields: CubeJsonFieldsState;
    disabled: boolean;
    onInsert: (expression: string) => void;
    onAddColumn?: ((name: string, code: string) => void) | undefined;
  }) => {
    const { fields, disabled, onInsert, onAddColumn } = props;
    const { column } = fields;
    if (!column) {
      return null;
    }
    const sample =
      fields.sample?.column === column.name ? fields.sample.sample : undefined;
    const shown = fields.shownFields;
    return (
      <div
        aria-label={`Fields of ${column.name}, read`}
        className="flex flex-col gap-1 rounded-sm border border-[var(--color-accent)] p-1"
      >
        <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
          <span role="status" className="min-w-0 flex-1">
            {fields.isReading
              ? `Reading ${column.name}…`
              : sample
                ? getCubeJsonFieldsStatus(sample)
                : ''}
          </span>
          {fields.isReading ? (
            <CubeButton onClick={() => fields.stop()}>Stop</CubeButton>
          ) : (
            sample && (
              <CubeButton
                title={
                  sample.complete
                    ? CUBE_JSON_FIELDS_TITLE.READ_AGAIN
                    : CUBE_JSON_FIELDS_TITLE.EVERY_ROW
                }
                onClick={() => {
                  flowResult(fields.read(!sample.complete)).catch(
                    () => undefined,
                  );
                }}
              >
                {sample.complete ? 'Read again' : 'Read every row'}
              </CubeButton>
            )
          )}
        </div>
        {fields.error && (
          <div
            role="alert"
            className="break-words text-sm text-[var(--color-status-error)]"
          >
            {fields.error}
          </div>
        )}
        {fields.fields && (
          <>
            <input
              className="h-6 rounded-sm border border-[var(--color-border-default)] bg-[var(--color-bg-input)] px-1 text-sm"
              placeholder="Find a field"
              aria-label="Find a field"
              value={fields.search}
              onChange={(event) => fields.setSearch(event.target.value)}
            />
            {shown ? (
              <ul aria-label={`Fields of ${column.name}`}>
                <CubeJsonFieldsRow
                  fields={fields}
                  column={column.name}
                  field={shown}
                  depth={0}
                  disabled={disabled}
                  onInsert={onInsert}
                  onAddColumn={onAddColumn}
                />
              </ul>
            ) : (
              <div className="px-1 text-sm text-[var(--color-text-muted)]">
                No field matches.
              </div>
            )}
          </>
        )}
      </div>
    );
  },
);
