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

import type { MenuProps } from '@material-ui/core';
import { makeStyles, Menu } from '@material-ui/core';

const useBaseMenuStyles = makeStyles({
  listPadding: {
    paddingTop: 0,
    paddingBottom: 0,
  },
  paper: {
    background: 'var(--color-dark-grey-100)',
  },
});

export const BaseMenu: React.FC<MenuProps> = (props: MenuProps) => {
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

// TODO: create base Mui components for Dialog, MuiTooltip, etc so we can eliminate usage of `ThemeProvider`
