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
  ControlledDropdownMenu,
  MenuContent,
  MenuContentItem,
  MenuIcon,
} from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { LegendMarketplaceAppInfo } from './LegendMarketplaceAppInfo.js';
import { LEGEND_MARKETPLACE_TEST_ID } from '../../__lib__/LegendMarketplaceTesting.js';

const LegendMarketplaceHeaderMenu = observer(() => {
  // about modal
  const [openAppInfo, setOpenAppInfo] = useState(false);
  const showAppInfo = (): void => setOpenAppInfo(true);
  const hideAppInfo = (): void => setOpenAppInfo(false);

  return (
    <>
      <div className="legend-marketplace-header__menu">
        <ControlledDropdownMenu
          className="legend-marketplace-header__menu-item"
          menuProps={{
            anchorOrigin: { vertical: 'top', horizontal: 'right' },
            transformOrigin: { vertical: 'top', horizontal: 'left' },
            elevation: 7,
          }}
          content={
            <MenuContent>
              <MenuContentItem onClick={showAppInfo}>About</MenuContentItem>
            </MenuContent>
          }
        >
          <MenuIcon />
        </ControlledDropdownMenu>
      </div>
      <LegendMarketplaceAppInfo open={openAppInfo} closeModal={hideAppInfo} />
    </>
  );
});

export const LegendMarketplaceHeader = observer(() => {
  return (
    <div
      className="legend-marketplace-header"
      data-testid={LEGEND_MARKETPLACE_TEST_ID.HEADER}
    >
      <LegendMarketplaceHeaderMenu />
      <div className="legend-marketplace-header__name">Legend Marketplace</div>
    </div>
  );
});
