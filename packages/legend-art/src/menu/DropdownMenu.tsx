/**
 * Copyright (c) 2020-present, Goldman Sachs
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

import { useEffect, useRef, useState } from 'react';
import type { MenuItemProps, MenuProps as MuiMenuProps } from '@mui/material';
import { BaseMenu, BaseMenuItem, Menu } from './BaseMenu.js';

export const ControlledDropdownMenu: React.FC<{
  children: React.ReactNode;
  open?: boolean | undefined;
  menuProps?: Partial<MuiMenuProps> | undefined;
  content?: React.ReactNode | undefined;
  className?: string | undefined;
  disabled?: boolean | undefined;
  title?: string | undefined;
  onOpen?: (() => void) | undefined;
  onClose?: (() => void) | undefined;
  useCapture?: boolean | undefined;
}> = (props) => {
  const {
    open,
    className,
    children,
    menuProps,
    content,
    title,
    disabled,
    onClose,
    onOpen,
    useCapture,
  } = props;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [anchorEl, setAnchorEl] = useState<Element | null>(null);
  const onTriggerClick: React.MouseEventHandler = (event) => {
    event.stopPropagation();
    event.preventDefault();
    if (disabled) {
      return;
    }
    if (triggerRef.current) {
      onOpen?.();
      setAnchorEl(triggerRef.current);
    }
  };

  // if the menu is forced to open or close, set the anchor accordinly
  // NOTE: unlike normal clicking on the trigger, this way of forcing the menu to open will require
  // to call `onClose` explicitly
  useEffect(() => {
    if (open !== undefined) {
      if (open && !anchorEl && triggerRef.current) {
        setAnchorEl(triggerRef.current);
      } else if (!open && anchorEl) {
        setAnchorEl(null);
      }
    }
  }, [anchorEl, open]);

  return (
    <>
      <button
        ref={triggerRef}
        className={className}
        disabled={disabled}
        {...(useCapture
          ? {
              onClickCapture: onTriggerClick,
              onClick: (event) => {
                event.stopPropagation();
              },
            }
          : { onClick: onTriggerClick })}
        title={title}
      >
        {children}
      </button>
      <Menu
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        anchorEl={anchorEl}
        open={(open === undefined || Boolean(open)) && Boolean(anchorEl)}
        slotProps={{
          root: {
            slotProps: {
              backdrop: {
                invisible: true,
              },
            },
          },
        }}
        elevation={0}
        marginThreshold={0}
        disableRestoreFocus={true}
        hideBackdrop={true}
        transitionDuration={0}
        onClick={() => {
          onClose?.();
          setAnchorEl(null);
        }}
        {...menuProps}
      >
        {content}
      </Menu>
    </>
  );
};

export function useDropdownMenu() {
  const [anchorEl, setAnchorEl] = useState<Element | null>(null);
  return [
    (event: React.MouseEvent) => setAnchorEl(event.currentTarget),
    () => setAnchorEl(null),
    {
      anchorEl,
      onClose: () => setAnchorEl(null),
    },
    Boolean(anchorEl),
  ] as const;
}

export type DropdownMenuProps = {
  children: React.ReactNode;
  anchorEl: Element | null;
  onClose: () => void;
  /**
   * This method will be called after the menu has been closed
   * NOTE: Usually used to imperatively set the focus to some other input box
   * It is important to use `useCallback` to this call to avoid unnecessary calls
   * on the useEffect, which might cause undesired focus behavior
   */
  onClosed?: (() => void) | undefined;
  className?: string | undefined;
  menuProps?: Partial<MuiMenuProps> | undefined;
};

export function DropdownMenu(props: DropdownMenuProps) {
  const { menuProps, children, onClosed, onClose, anchorEl } = props;

  // Make sure the first time the menu is opened, we don't trigger onLeave
  const [hasBeenOpened, setHasBeenOpened] = useState(false);
  useEffect(() => {
    if (hasBeenOpened && !anchorEl) {
      onClosed?.();
    }
  }, [anchorEl, hasBeenOpened, onClosed]);

  if (!anchorEl) {
    return null;
  }
  return (
    <BaseMenu
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      anchorEl={anchorEl}
      open={Boolean(anchorEl)}
      slotProps={{
        root: {
          slotProps: {
            backdrop: {
              invisible: true,
            },
          },
        },
      }}
      elevation={1}
      marginThreshold={0}
      transitionDuration={0}
      TransitionProps={{
        onEnter: () => setHasBeenOpened(true),
      }}
      onClose={onClose}
      {...menuProps}
    >
      {children}
    </BaseMenu>
  );
}

export type DropdownMenuItemProps = MenuItemProps;

export function DropdownMenuItem(props: DropdownMenuItemProps) {
  return (
    <BaseMenuItem
      {...props}
      style={{
        cursor: 'default',
      }}
    />
  );
}
