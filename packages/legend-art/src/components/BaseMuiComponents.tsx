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

import {
  type MenuProps as MuiMenuProps,
  type PopoverProps as MuiPopoverProps,
  Menu as MuiMenu,
  Popover as MuiPopover,
} from '@mui/material';

export const BaseMenu: React.FC<MuiMenuProps> = (props) => {
  const { children, ...otherProps } = props;

  return (
    <MuiMenu
      classes={{
        paper: 'mui-menu__paper',
      }}
      MenuListProps={{
        classes: {
          padding: 'mui-menu__list',
        },
      }}
      transitionDuration={0}
      {...otherProps}
    >
      {props.children}
    </MuiMenu>
  );
};

export const BasePopover: React.FC<MuiPopoverProps> = (props) => {
  const { children, ...otherProps } = props;

  return (
    <MuiPopover
      classes={{
        paper: 'mui-popover__paper',
      }}
      transitionDuration={0}
      {...otherProps}
    >
      {props.children}
    </MuiPopover>
  );
};

// TODO: create base Mui components for Dialog, MuiTooltip, etc so we can eliminate usage of `ThemeProvider`
