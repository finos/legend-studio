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
import type { MenuProps as MuiMenuProps } from '@mui/material';
import { BaseMenu } from './BaseMenu';

export const DropdownMenu: React.FC<{
  children: React.ReactNode;
  open?: boolean | undefined;
  menuProps?: Partial<MuiMenuProps> | undefined;
  content?: React.ReactNode | undefined;
  className?: string | undefined;
  disabled?: boolean | undefined;
  onOpen?: (() => void) | undefined;
  onClose?: (() => void) | undefined;
}> = (props) => {
  const {
    open,
    className,
    children,
    menuProps,
    content,
    onClose,
    onOpen,
    disabled,
  } = props;
  const triggerRef = useRef<HTMLDivElement>(null);
  const [anchorEl, setAnchorEl] = useState<Element | null>(null);
  const onTriggerClick: React.MouseEventHandler = (event) => {
    event.stopPropagation();
    event.preventDefault();
    if (disabled) {
      return;
    }
    if (anchorEl) {
      // if the trigger is clicked and the menu is already opened, close it
      onClose?.();
      setAnchorEl(null);
    } else if (triggerRef.current) {
      // if the trigger is clicked, open the dropdown menu
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
    <div ref={triggerRef} className={className} onClick={onTriggerClick}>
      {children}
      <BaseMenu
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        anchorEl={anchorEl}
        open={(open === undefined || Boolean(open)) && Boolean(anchorEl)}
        BackdropProps={{
          invisible: true,
        }}
        elevation={0}
        marginThreshold={0}
        disableRestoreFocus={true}
        {...menuProps}
      >
        {content}
      </BaseMenu>
    </div>
  );
};
