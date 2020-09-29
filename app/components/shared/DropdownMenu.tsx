/**
 * Copyright 2020 Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import React, { useRef, useState } from 'react';
import Menu, { MenuProps } from '@material-ui/core/Menu';

export const DropdownMenu: React.FC<{
  menuProps?: Partial<MenuProps>;
  content?: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onClose?: () => void;
}> = props => {
  const { className, children, menuProps, content, onClose, disabled } = props;
  const triggerRef = useRef<HTMLDivElement>(null);
  const [anchorEl, setAnchorEl] = useState<Element>();
  const onClick: React.MouseEventHandler = event => {
    event.stopPropagation();
    event.preventDefault();
    if (disabled) {
      return;
    }
    if (anchorEl) {
      onClose?.();
      setAnchorEl(undefined);
    } else if (triggerRef.current) {
      setAnchorEl(triggerRef.current);
    }
  };
  return (
    <div ref={triggerRef} className={className} onClick={onClick}>
      {children}
      <Menu
        elevation={0}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        getContentAnchorEl={null}
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        BackdropProps={{
          invisible: true,
        }}
        marginThreshold={0}
        disableRestoreFocus={true}
        {...menuProps}
      >
        {content}
      </Menu>
    </div>
  );
};

DropdownMenu.displayName = 'DropdownMenu';

