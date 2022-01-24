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
  type PopoverProps as MuiPopoverProps,
  Popover as MuiPopover,
} from '@mui/material';

export const BasePopover: React.FC<MuiPopoverProps> = (props) => {
  const { children, ...otherProps } = props;

  return (
    <MuiPopover
      classes={{
        paper: 'mui-popover__paper',
      }}
      transitionDuration={0} // disable transition
      {...otherProps}
    >
      {props.children}
    </MuiPopover>
  );
};
