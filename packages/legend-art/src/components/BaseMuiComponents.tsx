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

import type { MenuProps, PopoverProps } from '@material-ui/core';
import { makeStyles, Menu, Popover } from '@material-ui/core';

const useBaseMenuStyles = makeStyles({
  listPadding: {
    paddingTop: 0,
    paddingBottom: 0,
  },
  paper: {
    background: 'var(--color-dark-grey-100)',
  },
});

export const BaseMenu: React.FC<MenuProps> = (props) => {
  const classes = useBaseMenuStyles();
  const { children, ...otherProps } = props;

  return (
    <Menu
      classes={{
        paper: classes.paper,
      }}
      MenuListProps={{
        classes: {
          padding: classes.listPadding,
        },
      }}
      transitionDuration={0}
      {...otherProps}
    >
      {props.children}
    </Menu>
  );
};

const useBasePopoverStyles = makeStyles({
  paper: {
    background: 'var(--color-dark-grey-100)',
    // NOTE: this is needed in order to have elements display go beyond
    // the boundary of the popover, e.g. elements shown with `display: relative`
    // such as validation error for inputs
    overflow: 'unset',
  },
});

export const BasePopover: React.FC<PopoverProps> = (props) => {
  const classes = useBasePopoverStyles();
  const { children, ...otherProps } = props;

  return (
    <Popover
      classes={{
        paper: classes.paper,
      }}
      transitionDuration={0}
      {...otherProps}
    >
      {props.children}
    </Popover>
  );
};

// TODO: create base Mui components for Dialog, MuiTooltip, etc so we can eliminate usage of `ThemeProvider`
