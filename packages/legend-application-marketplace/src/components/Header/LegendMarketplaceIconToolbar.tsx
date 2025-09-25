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
  HelpOutlineIcon,
  MenuContentDivider,
  ShoppingCartOutlineIcon,
  UserCircleIcon,
} from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import { Avatar, Box, IconButton, Link, Menu, MenuItem } from '@mui/material';
import { useEffect, useState } from 'react';
import { assertErrorThrown, LegendUser } from '@finos/legend-shared';
import { LEGEND_MARKETPLACE_ROUTE_PATTERN } from '../../__lib__/LegendMarketplaceNavigation.js';
import { LegendMarketplaceAppInfo } from './LegendMarketplaceAppInfo.js';
import { useLegendMarketplaceBaseStore } from '../../application/providers/LegendMarketplaceFrameworkProvider.js';

export const LegendMarketplaceIconToolbar = observer(() => {
  const applicationStore = useApplicationStore();
  const marketplaceStore = useLegendMarketplaceBaseStore();
  const userId = applicationStore.identityService.currentUser;
  const [userData, setUserData] = useState<LegendUser | string | undefined>();
  const showDevFeatures =
    marketplaceStore.applicationStore.config.options.showDevFeatures;
  useEffect(() => {
    const fetchUserData = async (): Promise<void> => {
      if (userId) {
        try {
          const user =
            await marketplaceStore.userSearchService?.getOrFetchUser(userId);
          setUserData(user);
        } catch (error) {
          assertErrorThrown(error);
          applicationStore.notificationService.notifyError(
            `Failed to fetch user data: ${error.message}`,
          );
        }
      }
    };
    // eslint-disable-next-line no-void
    void fetchUserData();
  }, [
    userId,
    applicationStore.notificationService,
    marketplaceStore.userSearchService,
  ]);

  const imgSrc =
    marketplaceStore.applicationStore.config.marketplaceUserProfileImageUrl?.replace(
      '{userId}',
      userId,
    );
  const userDirectoryLink = `${marketplaceStore.applicationStore.config.lakehouseEntitlementsConfig?.applicationDirectoryUrl}/${userId}`;

  const userName =
    userData instanceof LegendUser && userData.displayName
      ? userData.displayName
      : userId;

  const UserIconRenderer = () => {
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

    const open = Boolean(anchorEl);

    return (
      <>
        <IconButton
          onClick={(event) => setAnchorEl(event.currentTarget)}
          className="legend-marketplace-header__menu__icon"
        >
          {imgSrc ? (
            <Avatar
              className="legend-user-display__avatar legend-user-display__avatar--image"
              src={imgSrc}
              alt={userName}
            />
          ) : (
            <UserCircleIcon />
          )}
        </IconButton>
        <Menu anchorEl={anchorEl} open={open} onClose={() => setAnchorEl(null)}>
          <MenuItem>
            <Box>
              Hello,{' '}
              <Link
                href={userDirectoryLink}
                target="_blank"
                rel="noopener noreferrer"
              >
                {userName}
              </Link>
            </Box>
          </MenuItem>
          <MenuContentDivider />
          <MenuItem
            component="a"
            href={applicationStore.navigationService.navigator.generateAddress(
              LEGEND_MARKETPLACE_ROUTE_PATTERN.LAKEHOUSE_ENTITLEMENTS,
            )}
          >
            View Lakehouse Entitlements
          </MenuItem>
        </Menu>
      </>
    );
  };

  const CartIconRenderer = () => {
    return (
      <>
        <IconButton className="legend-marketplace-header__menu__icon">
          <ShoppingCartOutlineIcon />
        </IconButton>
      </>
    );
  };

  const HelpIconRenderer = () => {
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const [openAppInfo, setOpenAppInfo] = useState(false);

    const open = Boolean(anchorEl);

    return (
      <>
        <IconButton
          onClick={(event) => setAnchorEl(event.currentTarget)}
          className="legend-marketplace-header__menu__icon"
        >
          <HelpOutlineIcon />
        </IconButton>
        <Menu anchorEl={anchorEl} open={open} onClose={() => setAnchorEl(null)}>
          <MenuItem
            onClick={() => {
              setOpenAppInfo(true);
              setAnchorEl(null);
            }}
          >
            About
          </MenuItem>
          <MenuItem
            component="a"
            href={applicationStore.navigationService.navigator.generateAddress(
              LEGEND_MARKETPLACE_ROUTE_PATTERN.LAKEHOUSE_ADMIN,
            )}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setAnchorEl(null)}
          >
            Admin
          </MenuItem>
        </Menu>
        <LegendMarketplaceAppInfo
          open={openAppInfo}
          closeModal={() => setOpenAppInfo(false)}
        />
      </>
    );
  };

  const toolbarIcons = [
    {
      title: 'Profile',
      renderer: UserIconRenderer,
    },
    {
      title: 'Cart',
      renderer: CartIconRenderer,
      disable: !showDevFeatures,
    },
    {
      title: 'Help',
      renderer: HelpIconRenderer,
    },
  ].filter((item) => !item.disable);

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
