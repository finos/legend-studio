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

import { useApplicationStore } from '@finos/legend-application';
import { observer } from 'mobx-react-lite';
import { LEGEND_MARKETPLACE_ROUTE_PATTERN } from '../../__lib__/LegendMarketplaceNavigation.js';
import {
  ControlledDropdownMenu,
  MenuContent,
  MenuContentItem,
  MenuIcon,
} from '@finos/legend-art';
import { LegendMarketplaceAppInfo } from '../../components/Header/LegendMarketplaceAppInfo.js';
import { useState } from 'react';

const LakehouseHeaderMenu = observer(() => {
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

const LakehousePlaceHeaderTabs = observer(() => {
  const applicationStore = useApplicationStore();
  const pageTabs = [
    {
      title: 'Entitlements',
      urlRoute: LEGEND_MARKETPLACE_ROUTE_PATTERN.LAKEHOUSE_ENTITLEMENTS,
    },
    {
      title: 'Subscriptions',
      urlRoute: LEGEND_MARKETPLACE_ROUTE_PATTERN.LAKEHOUSE_SUBSCRIPTIONS,
    },
  ];
  const navigateToPage = (route: string): void => {
    applicationStore.navigationService.navigator.goToLocation(route);
  };

  return (
    <div className="legend-marketplace-header__container">
      {pageTabs.map((tab) => (
        <div
          key={tab.title}
          className="legend-marketplace-header__tab"
          onClick={() => navigateToPage(tab.urlRoute)}
        >
          {tab.title}
        </div>
      ))}
    </div>
  );
});

export const MarketplaceLakehouseHeader = observer(() => {
  const applicationStore = useApplicationStore();

  const navigateToHome = (): void => {
    applicationStore.navigationService.navigator.goToLocation(
      LEGEND_MARKETPLACE_ROUTE_PATTERN.LAKEHOUSE,
    );
  };

  return (
    <div className="legend-marketplace-header">
      <LakehouseHeaderMenu />
      <div
        className="legend-marketplace-header__name"
        onClick={() => navigateToHome()}
      >
        Legend Lakehouse
      </div>
      <LakehousePlaceHeaderTabs />
    </div>
  );
});
