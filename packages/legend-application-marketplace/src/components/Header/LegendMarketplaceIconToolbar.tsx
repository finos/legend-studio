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
import {
  BellIcon,
  ControlledDropdownMenu,
  HelpOutlineIcon,
  MenuContent,
  MenuContentDivider,
  MenuContentItem,
  ShoppingCartOutlineIcon,
  UserCircleIcon,
} from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import { LEGEND_MARKETPLACE_ROUTE_PATTERN } from '../../__lib__/LegendMarketplaceNavigation.js';
import { Box } from '@mui/material';

export const LegendMarketplaceIconToolbar = observer(() => {
  const applicationStore = useApplicationStore();
  const username =
    applicationStore.identityService.currentUser === '(unknown)'
      ? 'user'
      : applicationStore.identityService.currentUser;

  const userIconRenderer = () => {
    return (
      <ControlledDropdownMenu
        className="legend-marketplace-header__menu-item"
        menuProps={{
          anchorOrigin: { vertical: 'bottom', horizontal: 'center' },
          transformOrigin: { vertical: 'top', horizontal: 'center' },
          elevation: 7,
        }}
        content={
          <MenuContent>
            <MenuContentItem disabled={true}>Hello, {username}</MenuContentItem>
            <MenuContentDivider />

            <MenuContentItem
              onClick={() =>
                applicationStore.navigationService.navigator.goToLocation(
                  LEGEND_MARKETPLACE_ROUTE_PATTERN.SUBSCRIPTIONS,
                )
              }
            >
              View Subscriptions
            </MenuContentItem>
            <MenuContentItem
              onClick={() =>
                applicationStore.navigationService.navigator.goToLocation(
                  LEGEND_MARKETPLACE_ROUTE_PATTERN.ORDERS,
                )
              }
            >
              View Orders
            </MenuContentItem>
          </MenuContent>
        }
      >
        <UserCircleIcon />
      </ControlledDropdownMenu>
    );
  };

  const toolbarIcons = [
    {
      icon: <UserCircleIcon />,
      title: 'Profile',
      renderer: userIconRenderer,
    },
    {
      icon: <ShoppingCartOutlineIcon />,
      title: 'Shopping Cart',
      renderer: () => {
        return <ShoppingCartOutlineIcon />;
      },
    },
    {
      icon: <BellIcon />,
      title: 'Notifications',
      renderer: () => {
        return <BellIcon />;
      },
    },
    {
      icon: <HelpOutlineIcon />,
      title: 'Help',
      renderer: () => {
        return <HelpOutlineIcon />;
      },
    },
  ];

  return (
    <Box className="legend-marketplace-header__icons">
      {toolbarIcons.map((item) => (
        <div key={item.title} className="legend-marketplace-header__icon">
          {item.renderer()}
        </div>
      ))}
    </Box>
  );
});
