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
import { LegendCatalogAppInfo } from './LegendCatalogAppInfo.js';
import { LEGEND_CATALOG_TEST_ID } from '../../__lib__/LegendCatalogTesting.js';

const LegendCatalogHeaderMenu = observer(() => {
  // about modal
  const [openAppInfo, setOpenAppInfo] = useState(false);
  const showAppInfo = (): void => setOpenAppInfo(true);
  const hideAppInfo = (): void => setOpenAppInfo(false);

  return (
    <>
      <div className="legend-catalog-header__menu">
        <ControlledDropdownMenu
          className="legend-catalog-header__menu-item"
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
      <LegendCatalogAppInfo open={openAppInfo} closeModal={hideAppInfo} />
    </>
  );
});

export const LegendCatalogHeader = observer(() => {
  return (
    <div
      className="legend-catalog-header"
      data-testid={LEGEND_CATALOG_TEST_ID.HEADER}
    >
      <LegendCatalogHeaderMenu />
      <div className="legend-catalog-header__name">Legend Marketplace</div>
    </div>
  );
});
