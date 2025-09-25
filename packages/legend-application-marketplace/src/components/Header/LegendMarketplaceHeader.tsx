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

import { clsx } from '@finos/legend-art';
import { AppBar, Box, Container, Toolbar } from '@mui/material';
import { observer } from 'mobx-react-lite';
import { LEGEND_MARKETPLACE_TEST_ID } from '../../__lib__/LegendMarketplaceTesting.js';
import { useApplicationStore } from '@finos/legend-application';
import { LEGEND_MARKETPLACE_ROUTE_PATTERN } from '../../__lib__/LegendMarketplaceNavigation.js';
import { LegendMarketplaceIconToolbar } from './LegendMarketplaceIconToolbar.js';
import { matchPath } from '@finos/legend-application/browser';
import { useEffect, useState } from 'react';

const HEADER_HEIGHT = 64;
const MIN_HEADER_OPACITY = 0.75;

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
            <a
              key={page.title}
              className={clsx('legend-marketplace-header__tab', {
                'legend-marketplace-header__tab--selected': isSelectedTab,
              })}
              onClick={() => navigateToPage(page.urlRoute)}
            >
              {page.title}
            </a>
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
    const { homeUrl, pages, showIcons } = props;

    const applicationStore = useApplicationStore();

    const [headerBackdropOpacity, setHeaderBackdropOpacity] = useState(1);
    const [headerBlurOpacity, setHeaderBlurOpacity] = useState(0);

    // The below handles the scroll effect for the header's blur effect. When the user is at the top of the page,
    // the header is fully opaque (i.e., no blur), so we hide the blur component and show the backdrop image component
    // (which is rendered behind the header). As the user scrolls down, we increase the opacity of the blur component
    // while reducing the opacity of the backdrop image component until a certain threshold.
    useEffect(() => {
      const appElement = document.querySelector('.app');

      const listenerCallback = () => {
        const scrollTop = appElement?.scrollTop ?? 0;
        const newBackdropOpacity = Math.max(
          MIN_HEADER_OPACITY,
          Math.min(1, 1 - (scrollTop - HEADER_HEIGHT) / HEADER_HEIGHT),
        );
        const newBlurOpacity = Math.max(
          0,
          Math.min(1, (scrollTop - HEADER_HEIGHT) / HEADER_HEIGHT),
        );
        setHeaderBackdropOpacity(newBackdropOpacity);
        setHeaderBlurOpacity(newBlurOpacity);
      };

      if (appElement) {
        appElement.addEventListener('scroll', listenerCallback);
      }
      return () => {
        if (appElement) {
          appElement.removeEventListener('scroll', listenerCallback);
        }
      };
    }, []);

    const navigateToHome = (): void => {
      applicationStore.navigationService.navigator.goToLocation(homeUrl);
    };

    return (
      <AppBar
        position="sticky"
        className="legend-marketplace-header"
        data-testid={LEGEND_MARKETPLACE_TEST_ID.HEADER}
      >
        <div
          className="legend-marketplace-header__backdrop-image"
          style={{ opacity: headerBackdropOpacity }}
        />
        <div
          className="legend-marketplace-header__backdrop"
          style={{ opacity: headerBlurOpacity }}
        />
        <Container
          className="legend-marketplace-header__container"
          maxWidth={false}
        >
          <Toolbar disableGutters={true}>
            <div
              className="legend-marketplace-header__name"
              onClick={() => navigateToHome()}
            >
              <img
                src="/assets/legendmarketplacehomelogo.png"
                alt="Legend Logo"
                className="legend-marketplace-header__logo"
                style={{ height: 35 }}
              />
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
        headerName="Marketplace"
        homeUrl={LEGEND_MARKETPLACE_ROUTE_PATTERN.HOME_PAGE}
        pages={
          enableMarketplacePages
            ? [
                {
                  title: 'Vendor Data',
                  urlRoute: LEGEND_MARKETPLACE_ROUTE_PATTERN.VENDOR_DETAILS,
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
      headerName=""
      homeUrl={LEGEND_MARKETPLACE_ROUTE_PATTERN.HOME_PAGE}
      pages={[
        {
          title: 'Data Products',
          urlRoute: LEGEND_MARKETPLACE_ROUTE_PATTERN.DATA_PRODUCTS,
        },
        {
          title: 'Data APIs',
          urlRoute: LEGEND_MARKETPLACE_ROUTE_PATTERN.DATA_APIS,
        },
        {
          title: 'Intelligence and AI Agents',
          urlRoute: LEGEND_MARKETPLACE_ROUTE_PATTERN.AGENTS,
        },
        {
          title: 'Terminals and Addons',
          urlRoute: LEGEND_MARKETPLACE_ROUTE_PATTERN.VENDOR_DETAILS,
        },
        {
          title: 'GS Inventory',
          urlRoute: LEGEND_MARKETPLACE_ROUTE_PATTERN.INVENTORY,
        },
      ]}
      showIcons={true}
    />
  );
});
