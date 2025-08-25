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

import { useState } from 'react';
import { IconSelectorIcons, WarningIcon } from './Icon.js';
import { observer } from 'mobx-react-lite';
import { Button } from '../button/Button.js';
import { BasePopover } from '../popover/BasePopover.js';
import { isNonEmptyString } from '@finos/legend-shared';
import { IconSelectorGrid } from './IconSelectorGrid.js';

export const IconSelector = observer(
  (props: {
    iconId: string | undefined;
    onChange: (value: string | undefined) => void;
    isReadOnly: boolean;
  }): React.ReactNode => {
    const { iconId, onChange, isReadOnly } = props;

    const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);

    const IconComponent =
      iconId !== undefined ? IconSelectorIcons[iconId] : undefined;

    const handleButtonClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
      setAnchorEl(null);
    };

    const handleIconClick = (_iconId: string | undefined) => {
      onChange(_iconId);
      handleClose();
    };

    const open = Boolean(anchorEl);

    return (
      <>
        <Button
          className="icon-selector__button"
          onClick={handleButtonClick}
          disabled={isReadOnly}
        >
          {IconComponent ? <IconComponent /> : 'Select Icon'}
          {IconComponent === undefined && isNonEmptyString(iconId) && (
            <span className="icon-selector__unknown-icon">
              <WarningIcon />
              Icon not recognized
            </span>
          )}
        </Button>
        <BasePopover
          open={open}
          onClose={handleClose}
          anchorEl={anchorEl}
          slotProps={{
            paper: {
              className: 'icon-selector__popover',
            },
          }}
        >
          <IconSelectorGrid
            iconId={iconId}
            onChange={handleIconClick}
            isReadOnly={isReadOnly}
          />
        </BasePopover>
      </>
    );
  },
);
