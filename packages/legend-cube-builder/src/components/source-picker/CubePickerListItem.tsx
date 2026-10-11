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

import { CheckIcon, clsx } from '@finos/legend-art';
import { createContext, useContext } from 'react';

/**
 * The source dialog's Add, for a list row that adds what it picks on a
 * double-click or Enter; nothing outside the dialog
 */
export const CubePickerConfirmContext = createContext<(() => void) | undefined>(
  undefined,
);

/** A list of the source dialog: rows on the input background, so hover shows */
export const CUBE_PICKER_LIST_CLASS =
  'rounded-sm border border-[var(--color-border-subtle)] bg-[var(--color-bg-input)]';

/**
 * A row of a list in the source dialog: a table, a data set, an access
 * point, or a step towards one (a data product, an ingest definition).
 * The picked row shows an accent bar, a check and a stronger background,
 * which hovering doesn't hide. A row that picks what Add adds (`adds`) adds
 * it on a double-click, or on Enter once picked (UX audit A1-A3, 2026-10-11).
 */
export const CubePickerListItem: React.FC<{
  picked: boolean;
  disabled?: boolean | undefined;
  title?: string | undefined;
  /** Whether picking this row is the last choice before Add */
  adds?: boolean | undefined;
  onPick: () => void;
  children: React.ReactNode;
}> = (props) => {
  const { picked, disabled, title, adds, onPick, children } = props;
  const confirm = useContext(CubePickerConfirmContext);
  return (
    <li>
      <button
        type="button"
        className={clsx(
          'flex w-full items-center gap-2 border-l-[3px] px-2 py-1 text-left text-base disabled:cursor-not-allowed disabled:text-[var(--color-text-disabled)]',
          picked
            ? 'border-[var(--color-accent)] bg-[var(--color-bg-selected)] font-medium'
            : 'border-transparent enabled:hover:bg-[var(--color-bg-hover)]',
        )}
        aria-pressed={picked}
        disabled={disabled}
        title={title}
        onClick={onPick}
        onDoubleClick={() => {
          if (adds && !disabled) {
            onPick();
            confirm?.();
          }
        }}
        onKeyDown={(event) => {
          // Enter on the picked row adds it; on another row, it picks it
          if (event.key === 'Enter' && adds && picked && confirm) {
            event.preventDefault();
            confirm();
          }
        }}
      >
        {children}
        <span className="flex w-4 shrink-0 justify-center text-[var(--color-accent)]">
          {picked && <CheckIcon aria-hidden={true} />}
        </span>
      </button>
    </li>
  );
};
