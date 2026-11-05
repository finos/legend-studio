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

import { BasePopper, CaretRightIcon } from '@finos/legend-art';
import { useRef, useState } from 'react';

/** The z-index of a menu opened from a menu: above MUI's menus, which are modals (1300) */
const CUBE_SUBMENU_Z_INDEX = 1400;

/**
 * A menu item with a menu of its own beside it, e.g. Join Another Input's
 * nodes to join with: hovering the item, or the right arrow key on it,
 * opens it; the left arrow key or Escape go back to the item, and the up and
 * down arrow keys move between its items. With `opensOnClick`, a click on the
 * item opens it too, and leaves the menu open; else the item's own click
 * does what it does.
 */
export const CubeSubmenu: React.FC<{
  /** The menu item it opens from */
  children: React.ReactNode;
  /** Its name, for assistive technology */
  label: string;
  /** Whether it has items, so opens: else the item is a plain one */
  hasItems: boolean;
  opensOnClick?: boolean | undefined;
  /** Its items, menu items and the lines that head them */
  items: React.ReactNode;
}> = (props) => {
  const { children, label, hasItems, opensOnClick, items } = props;
  const anchorRef = useRef<HTMLDivElement>(null);
  const submenuRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const open = (): void => {
    clearTimeout(closeTimer.current);
    setIsOpen(hasItems);
  };
  // leaving the item for its submenu crosses a gap: wait before closing
  const closeSoon = (): void => {
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setIsOpen(false), 150);
  };
  const openAndFocus = (): void => {
    setIsOpen(true);
    setTimeout(
      () =>
        submenuRef.current
          ?.querySelector<HTMLButtonElement>('button:not(:disabled)')
          ?.focus(),
      0,
    );
  };
  const back = (): void => {
    setIsOpen(false);
    anchorRef.current?.querySelector('button')?.focus();
  };
  return (
    <div
      ref={anchorRef}
      className="relative"
      onMouseEnter={open}
      onMouseLeave={closeSoon}
      onClick={(event) => {
        // the menu closes on a click; one on the item opens the submenu
        // instead, and one on the submenu's items, which React passes up
        // through here, closes it
        if (
          opensOnClick &&
          hasItems &&
          !submenuRef.current?.contains(event.target as Node)
        ) {
          event.stopPropagation();
          openAndFocus();
        }
      }}
      onKeyDown={(event) => {
        if (event.key === 'ArrowRight' && hasItems) {
          event.preventDefault();
          event.stopPropagation();
          openAndFocus();
        }
      }}
    >
      {children}
      {hasItems && (
        <span
          className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]"
          aria-hidden={true}
        >
          <CaretRightIcon />
        </span>
      )}
      <BasePopper
        open={isOpen && anchorRef.current !== null}
        anchorEl={anchorRef.current}
        placement="right-start"
        style={{ zIndex: CUBE_SUBMENU_Z_INDEX }}
      >
        <div
          ref={submenuRef}
          className="menu"
          role="menu"
          aria-label={label}
          onMouseEnter={open}
          onMouseLeave={closeSoon}
          onKeyDown={(event) => {
            if (event.key === 'ArrowLeft' || event.key === 'Escape') {
              event.preventDefault();
              event.stopPropagation();
              back();
            } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault();
              event.stopPropagation();
              const buttons = Array.from(
                event.currentTarget.querySelectorAll<HTMLButtonElement>(
                  'button:not(:disabled)',
                ),
              );
              const index = buttons.indexOf(
                document.activeElement as HTMLButtonElement,
              );
              buttons[
                (index + (event.key === 'ArrowDown' ? 1 : buttons.length - 1)) %
                  buttons.length
              ]?.focus();
            }
          }}
        >
          {items}
        </div>
      </BasePopper>
    </div>
  );
};
