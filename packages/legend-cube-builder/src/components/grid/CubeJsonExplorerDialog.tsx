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
  clsx,
  Dialog,
  Modal,
  ModalBody,
  ModalFooter,
  ModalFooterButton,
  ModalHeader,
} from '@finos/legend-art';
import { flowResult } from 'mobx';
import { observer } from 'mobx-react-lite';
import { LEGEND_CUBE_TEST_ID } from '../../__lib__/LegendCubeTesting.js';
import type { CubeEditorState } from '../../stores/CubeEditorState.js';
import type { CubeJsonExplorerState } from '../../stores/variant/CubeJsonExplorerState.js';
import type { CubeJsonField } from '../../stores/variant/CubeJsonOffers.js';
import { CubeButton } from '../CubeButton.js';
import { CUBE_PRIMARY_BUTTON_DARK_MODE } from '../CubeDialogTheme.js';

const format = (count: number): string => count.toLocaleString('en-US');

/** A share, 0 to 1, as a whole percentage */
const percentOf = (share: number): number => Math.round(share * 100);

/** A field's name: its last key, or the column's for the column itself */
const nameOf = (
  explorer: CubeJsonExplorerState,
  field: CubeJsonField,
): string => field.path.at(-1) ?? explorer.column?.name ?? '';

/** The fields whose path matches the search, with the fields they are in; all without a search */
const filterFields = (
  field: CubeJsonField,
  search: string,
): CubeJsonField | undefined => {
  const needle = search.trim().toLowerCase();
  if (!needle) {
    return field;
  }
  const children = field.children
    .map((child) => filterFields(child, search))
    .filter((child): child is CubeJsonField => child !== undefined);
  return children.length ||
    field.path.some((key) => key.toLowerCase().includes(needle))
    ? { ...field, children }
    : undefined;
};

/** What was read, on one line: the first values or every row, and why it stopped */
const CubeJsonExplorerStatus = observer(
  (props: { explorer: CubeJsonExplorerState }) => {
    const { explorer } = props;
    const { sample, column } = explorer;
    let text: string;
    if (explorer.isReading) {
      text = `Reading ${column?.name ?? ''}…`;
    } else if (!sample) {
      text = '';
    } else {
      const values = sample.rows - sample.unreadable;
      const unreadable = sample.unreadable
        ? ` (${format(sample.unreadable)} not JSON)`
        : '';
      text = sample.complete
        ? `All ${format(sample.rows)} values read${unreadable}: the fields, their types and shares cover the whole column.`
        : `The first ${format(sample.rows)} values read${unreadable}: the types and shares are from this sample.`;
      if (values === 0) {
        text = `No JSON in the ${format(sample.rows)} values read.`;
      }
    }
    return (
      <div className="mb-2 flex min-h-6 items-center gap-2 text-sm text-[var(--color-text-secondary)]">
        <span role="status">{text}</span>
        {explorer.isReading ? (
          <CubeButton onClick={() => explorer.stop()}>Stop</CubeButton>
        ) : (
          sample &&
          !sample.complete && (
            <CubeButton
              title="Read every value of the column, for the shape of the whole column: listed in Runs, and it can be stopped"
              onClick={() => {
                // a failed read shows its message in the dialog
                flowResult(explorer.read(true)).catch(() => undefined);
              }}
            >
              Read every row
            </CubeButton>
          )
        )}
      </div>
    );
  },
);

/** A field of the tree, and its fields, indented */
const CubeJsonFieldRow = observer(
  (props: {
    explorer: CubeJsonExplorerState;
    field: CubeJsonField;
    depth: number;
  }) => {
    const { explorer, field, depth } = props;
    const selected =
      JSON.stringify(field.path) === JSON.stringify(explorer.selectedPath);
    const share = percentOf(field.presence);
    return (
      <>
        <button
          type="button"
          className={clsx(
            'flex w-full items-baseline gap-2 py-0.5 pr-2 text-left hover:bg-[var(--color-bg-hover)]',
            { 'bg-[var(--color-bg-selected)]': selected },
          )}
          style={{ paddingLeft: `${8 + depth * 16}px` }}
          aria-pressed={selected}
          aria-label={`Field ${[explorer.column?.name ?? '', ...field.path].join('.')}`}
          onClick={() => explorer.select(field.path)}
        >
          <span className="break-all font-mono text-sm text-[var(--color-text-primary)]">
            {nameOf(explorer, field)}
          </span>
          <span className="text-xs text-[var(--color-text-secondary)]">
            {field.description}
          </span>
          {share < 100 && (
            <span
              className="ml-auto text-xs text-[var(--color-text-muted)]"
              title={
                field.path.length
                  ? `In ${share}% of the objects it could be in`
                  : `In ${share}% of the rows read`
              }
            >
              {share}%
            </span>
          )}
        </button>
        {field.children.map((child) => (
          <CubeJsonFieldRow
            key={JSON.stringify(child.path)}
            explorer={explorer}
            field={child}
            depth={depth + 1}
          />
        ))}
      </>
    );
  },
);

/** The selected field: where it is, what it held, and the columns it can become, to tick */
const CubeJsonFieldOffers = observer(
  (props: { explorer: CubeJsonExplorerState }) => {
    const { explorer } = props;
    const field = explorer.selectedField;
    if (!field) {
      return null;
    }
    // an array's elements as rows: Explode Array, not an Extend column
    const offers = field.offers.filter((offer) => offer.code !== undefined);
    const share = percentOf(field.presence);
    return (
      <div className="flex flex-col gap-2 p-2">
        <div className="break-all font-mono text-sm text-[var(--color-text-primary)]">
          {[explorer.column?.name ?? '', ...field.path].join(' › ')}
        </div>
        <div className="text-sm text-[var(--color-text-secondary)]">
          {field.description}
          {share < 100
            ? ` · in ${share}% of ${field.path.length ? 'the objects it could be in' : 'the rows read'}`
            : ''}
        </div>
        {field.topValues.length > 0 && (
          <div className="break-all text-xs text-[var(--color-text-secondary)]">
            Values seen: {field.topValues.join(', ')}
          </div>
        )}
        {offers.length ? (
          <div role="group" aria-label="Columns it can become">
            {offers.map((offer) => (
              <label
                key={offer.key}
                className="flex cursor-pointer items-baseline gap-2 py-0.5 text-sm"
                title={offer.code}
              >
                <input
                  type="checkbox"
                  checked={explorer.isTicked(field.path, offer)}
                  onChange={() => explorer.toggle(field.path, offer)}
                />
                <span className="text-[var(--color-text-primary)]">
                  {offer.label}
                </span>
                <span className="text-xs text-[var(--color-text-muted)]">
                  {offer.type} · {offer.name}
                </span>
              </label>
            ))}
          </div>
        ) : (
          <div className="text-sm text-[var(--color-text-muted)]">
            {field.children.length
              ? 'Pick one of its fields.'
              : 'Nothing to make of it.'}
          </div>
        )}
      </div>
    );
  },
);

/**
 * Explore JSON (PLAN §11.20): a Variant column's fields, read from its first
 * values or every row, each with what it held and how often; the selected
 * field's offers, ticked and added as one Extend after the node that ran
 */
export const CubeJsonExplorerDialog = observer(
  (props: { editorState: CubeEditorState }) => {
    const { editorState } = props;
    const explorer = editorState.jsonExplorer;
    const { applicationStore } = editorState.host;
    const darkMode =
      !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled;
    const fields = explorer.fields
      ? filterFields(explorer.fields, explorer.search)
      : undefined;
    const count = explorer.tickedOffers.filter(
      (offer) => offer.code !== undefined,
    ).length;
    const add = (): void => {
      flowResult(explorer.add()).catch(applicationStore.alertUnhandledError);
    };
    return (
      <Dialog open={explorer.isOpen} onClose={() => explorer.close()}>
        <Modal darkMode={darkMode} className="w-[960px] max-w-full">
          <ModalHeader>
            <div className="modal__title">{`Explore JSON: ${explorer.column?.name ?? ''}`}</div>
          </ModalHeader>
          <ModalBody>
            <div data-testid={LEGEND_CUBE_TEST_ID.JSON_EXPLORER}>
              <CubeJsonExplorerStatus explorer={explorer} />
              {explorer.error && (
                <div
                  role="alert"
                  className="mb-2 break-words text-sm text-[var(--color-status-error)]"
                >
                  {explorer.error}
                </div>
              )}
              {explorer.fields && (
                <div className="grid h-[50vh] grid-cols-2 gap-2">
                  <div className="flex min-h-0 flex-col rounded-sm border border-[var(--color-border-default)] bg-[var(--color-bg-panel)]">
                    <input
                      className="m-1 rounded-sm border border-[var(--color-border-default)] px-1 text-sm"
                      placeholder="Find a field"
                      aria-label="Find a field"
                      value={explorer.search}
                      onChange={(event) =>
                        explorer.setSearch(event.target.value)
                      }
                    />
                    <div
                      className="min-h-0 flex-1 overflow-auto"
                      aria-label="Fields"
                    >
                      {fields ? (
                        <CubeJsonFieldRow
                          explorer={explorer}
                          field={fields}
                          depth={0}
                        />
                      ) : (
                        <div className="p-2 text-sm text-[var(--color-text-muted)]">
                          No field matches.
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="min-h-0 overflow-auto rounded-sm border border-[var(--color-border-default)] bg-[var(--color-bg-panel)]">
                    <CubeJsonFieldOffers explorer={explorer} />
                  </div>
                </div>
              )}
            </div>
          </ModalBody>
          <ModalFooter>
            <ModalFooterButton
              darkMode={CUBE_PRIMARY_BUTTON_DARK_MODE}
              formatText={false}
              text={count === 1 ? 'Add 1 column' : `Add ${count} columns`}
              disabled={!count || explorer.isAdding || explorer.isReading}
              onClick={add}
            />
            <ModalFooterButton
              darkMode={darkMode}
              formatText={false}
              type="secondary"
              text="Cancel"
              onClick={() => explorer.close()}
            />
          </ModalFooter>
        </Modal>
      </Dialog>
    );
  },
);
