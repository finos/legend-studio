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
  clsx,
  ControlledDropdownMenu,
  MenuContent,
  MenuContentItem,
  MenuIcon,
} from '@finos/legend-art';
import { AppBar, Box, Button, Container, Toolbar } from '@mui/material';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { LEGEND_MARKETPLACE_TEST_ID } from '../../__lib__/LegendMarketplaceTesting.js';
import { LegendMarketplaceAppInfo } from './LegendMarketplaceAppInfo.js';
import { useApplicationStore } from '@finos/legend-application';
import { LEGEND_MARKETPLACE_ROUTE_PATTERN } from '../../__lib__/LegendMarketplaceNavigation.js';
import { LegendMarketplaceIconToolbar } from './LegendMarketplaceIconToolbar.js';
import { matchPath } from '@finos/legend-application/browser';

const LegendMarketplaceHeaderMenu = observer(() => {
  // about modal
  const [openAppInfo, setOpenAppInfo] = useState(false);
  const showAppInfo = (): void => setOpenAppInfo(true);
  const hideAppInfo = (): void => setOpenAppInfo(false);

  return (
    <>
      <ControlledDropdownMenu
        className="legend-marketplace-header__menu"
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
      <LegendMarketplaceAppInfo open={openAppInfo} closeModal={hideAppInfo} />
    </>
  );
});

const LegendMarketPlaceHeaderTabs = observer(
  (props: { pages: { title: string; urlRoute: string }[] }) => {
    const { pages } = props;

    const applicationStore = useApplicationStore();

    const navigateToPage = (route: string): void => {
      applicationStore.navigationService.navigator.goToLocation(route);
    };

    return (
      <Box className="legend-marketplace-header__tabs">
        {pages.map((page) => {
          const isSelectedTab =
            matchPath(
              page.urlRoute,
              applicationStore.navigationService.navigator.getCurrentLocation(),
            ) !== null;

          return (
            <Button
              key={page.title}
              className={clsx('legend-marketplace-header__tab', {
                'legend-marketplace-header__tab--selected': isSelectedTab,
              })}
              onClick={() => navigateToPage(page.urlRoute)}
            >
              {page.title}
            </Button>
          );
        })}
      </Box>
    );
  },
);

const LegendMarketplaceBaseHeader = observer(
  (props: {
    headerName: string;
    homeUrl: string;
    pages: { title: string; urlRoute: string }[];
    showIcons?: boolean;
  }) => {
    const { headerName, homeUrl, pages, showIcons } = props;

    const applicationStore = useApplicationStore();

    const navigateToHome = (): void => {
      applicationStore.navigationService.navigator.goToLocation(homeUrl);
    };

    return (
      <AppBar
        position="sticky"
        className="legend-marketplace-header"
        data-testid={LEGEND_MARKETPLACE_TEST_ID.HEADER}
      >
        <Container maxWidth="xxl">
          <Toolbar disableGutters={true}>
            <LegendMarketplaceHeaderMenu />
            <div
              className="legend-marketplace-header__name"
              onClick={() => navigateToHome()}
            >
              {headerName}
            </div>
            <LegendMarketPlaceHeaderTabs pages={pages} />
            {showIcons && <LegendMarketplaceIconToolbar />}
          </Toolbar>
        </Container>
      </AppBar>
    );
  },
);

export const LegendMarketplaceHeader = observer(
  (props: { enableMarketplacePages: boolean }) => {
    const { enableMarketplacePages } = props;

    return (
      <LegendMarketplaceBaseHeader
        headerName="Legend Marketplace"
        homeUrl={LEGEND_MARKETPLACE_ROUTE_PATTERN.DEFAULT}
        pages={
          enableMarketplacePages
            ? [
                {
                  title: 'Vendor Data',
                  urlRoute: LEGEND_MARKETPLACE_ROUTE_PATTERN.VENDOR_DATA,
                },
              ]
            : []
        }
        showIcons={enableMarketplacePages}
      />
    );
  },
);

export const MarketplaceLakehouseHeader = observer(() => {
  return (
    <LegendMarketplaceBaseHeader
      headerName="Legend Lakehouse"
      homeUrl={LEGEND_MARKETPLACE_ROUTE_PATTERN.LAKEHOUSE}
      pages={[
        {
          title: 'Entitlements',
          urlRoute: LEGEND_MARKETPLACE_ROUTE_PATTERN.LAKEHOUSE_ENTITLEMENTS,
        },
        {
          title: 'Subscriptions',
          urlRoute: LEGEND_MARKETPLACE_ROUTE_PATTERN.LAKEHOUSE_SUBSCRIPTIONS,
        },
      ]}
      showIcons={false}
    />
  );
});
