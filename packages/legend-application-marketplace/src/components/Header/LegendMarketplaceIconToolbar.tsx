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
  HelpOutlineIcon,
  MenuContentDivider,
  MoonIcon,
  OpenNewTabIcon,
  ShoppingCartOutlineIcon,
  SimpleCalendarIcon,
  SunFilledIcon,
  UserCircleIcon,
} from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import { Avatar, Box, IconButton, Link, Menu, MenuItem } from '@mui/material';
import { useEffect, useState } from 'react';
import {
  assertErrorThrown,
  isNonNullable,
  LegendUser,
  LogEvent,
} from '@finos/legend-shared';
import { LEGEND_APPLICATION_COLOR_THEME } from '@finos/legend-application';
import { LEGEND_MARKETPLACE_ROUTE_PATTERN } from '../../__lib__/LegendMarketplaceNavigation.js';
import { LegendMarketplaceAppInfo } from './LegendMarketplaceAppInfo.js';
import { useLegendMarketplaceBaseStore } from '../../application/providers/LegendMarketplaceFrameworkProvider.js';
import { CartDrawer } from '../AddToCart/CartDrawer.js';
import { CartBadge } from './CartBadge.js';
import { useAuth } from 'react-oidc-context';
import { V1_pendingTasksResponseModelSchema } from '@finos/legend-graph';
import { LEGEND_MARKETPLACE_APP_EVENT } from '../../__lib__/LegendMarketplaceAppEvent.js';
import { deserialize } from 'serializr';
import {
  ICON_TOOLBAR_TYPE,
  LegendMarketplaceTelemetryHelper,
} from '../../__lib__/LegendMarketplaceTelemetryHelper.js';

export const LegendMarketplaceIconToolbar = observer(() => {
  const marketplaceStore = useLegendMarketplaceBaseStore();
  const applicationStore = marketplaceStore.applicationStore;
  const auth = useAuth();
  const userId = applicationStore.identityService.currentUser;
  const [userData, setUserData] = useState<LegendUser | string | undefined>();
  const [pendingTasksCount, setPendingTasksCount] = useState<number>(0);
  const showDevFeatures = applicationStore.config.options.showDevFeatures;

  useEffect(() => {
    const fetchUserData = async (): Promise<void> => {
      if (userId) {
        try {
          const user =
            await marketplaceStore.userSearchService?.getOrFetchUser(userId);
          setUserData(user);
        } catch (error) {
          assertErrorThrown(error);
          if (applicationStore.config.options.showDevFeatures) {
            applicationStore.notificationService.notifyError(
              error,
              `Failed to fetch user data: ${error.name}\n${error.message}\n${error.cause}\n${error.stack}`,
            );
          } else {
            applicationStore.notificationService.notifyError(
              `Failed to fetch user data: ${error.message}`,
            );
          }
        }
      }
    };
    // eslint-disable-next-line no-void
    void fetchUserData();
    const fetchPendingTasks = async (): Promise<void> => {
      if (userId) {
        try {
          const pendingTasks =
            await marketplaceStore.lakehouseContractServerClient.getPendingTasks(
              userId,
              auth.user?.access_token,
            );
          const tasks = deserialize(
            V1_pendingTasksResponseModelSchema,
            pendingTasks,
          );
          const privilegeManagerCount = tasks.privilegeManager.length;
          const dataOwnerCount = tasks.dataOwner.length;
          const totalPendingTasksCount = privilegeManagerCount + dataOwnerCount;
          setPendingTasksCount(totalPendingTasksCount);
        } catch (error) {
          assertErrorThrown(error);
          applicationStore.logService.error(
            LogEvent.create(
              LEGEND_MARKETPLACE_APP_EVENT.FETCH_PENDING_TASKS_FAILURE,
            ),
            error,
          );
        }
      }
    };
    // eslint-disable-next-line no-void
    void fetchPendingTasks();
  }, [
    userId,
    applicationStore.notificationService,
    marketplaceStore.userSearchService,
    auth.user?.access_token,
    marketplaceStore.lakehouseContractServerClient,
    applicationStore.logService,
    applicationStore.config.options.showDevFeatures,
  ]);

  const imgSrc =
    applicationStore.config.marketplaceUserProfileImageUrl?.replace(
      '{userId}',
      userId,
    );
  const userDirectoryLink = `${applicationStore.config.lakehouseEntitlementsConfig?.applicationDirectoryUrl}/${userId}`;

  const userName =
    userData instanceof LegendUser && userData.displayName
      ? userData.displayName
      : userId;
  const adjacentEnvState = marketplaceStore.adjacentEnvState;
  const adjacentUrl = applicationStore.config.adjacentEnvUrl;

  const UserIconRenderer = () => {
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const open = Boolean(anchorEl);

    return (
      <>
        <IconButton
          onClick={(event) => setAnchorEl(event.currentTarget)}
          className="legend-marketplace-header__menu__icon"
        >
          <div className="legend-marketplace-header__task__count">
            {imgSrc ? (
              <Avatar
                className="legend-user-display__avatar legend-user-display__avatar--image"
                src={imgSrc}
                alt={userName}
              />
            ) : (
              <UserCircleIcon />
            )}
            {pendingTasksCount > 0 && (
              <span className="legend-marketplace-header__task__badge__avatar">
                {pendingTasksCount}
              </span>
            )}
          </div>
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
          {adjacentEnvState && adjacentUrl && (
            <MenuItem component="a" target="_blank" href={adjacentUrl}>
              {`${adjacentEnvState.label} Env`}
            </MenuItem>
          )}
          {adjacentEnvState && adjacentUrl && <MenuContentDivider />}
          <MenuItem
            component="a"
            href={applicationStore.navigationService.navigator.generateAddress(
              LEGEND_MARKETPLACE_ROUTE_PATTERN.SUBSCRIPTIONS,
            )}
            onClick={() => {
              LegendMarketplaceTelemetryHelper.logEvent_ClickToolbarMenu(
                applicationStore.telemetryService,
                ICON_TOOLBAR_TYPE.USER,
                'View Terminal Subscriptions',
              );
            }}
          >
            View Terminal Subscriptions
          </MenuItem>
          <MenuItem
            component="a"
            href={applicationStore.navigationService.navigator.generateAddress(
              LEGEND_MARKETPLACE_ROUTE_PATTERN.ORDERS,
            )}
            onClick={() => {
              LegendMarketplaceTelemetryHelper.logEvent_ClickToolbarMenu(
                applicationStore.telemetryService,
                ICON_TOOLBAR_TYPE.USER,
                'View Orders',
              );
            }}
          >
            View Orders
          </MenuItem>
          <MenuContentDivider />
          <MenuItem
            component="a"
            href={applicationStore.navigationService.navigator.generateAddress(
              LEGEND_MARKETPLACE_ROUTE_PATTERN.LAKEHOUSE_ENTITLEMENTS,
            )}
            onClick={() => {
              LegendMarketplaceTelemetryHelper.logEvent_ClickToolbarMenu(
                applicationStore.telemetryService,
                ICON_TOOLBAR_TYPE.USER,
                'View Lakehouse Entitlements',
              );
            }}
          >
            <span>View Lakehouse Entitlements</span>
            {pendingTasksCount > 0 && (
              <span className="legend-marketplace-header__task__badge__menu__item">
                {pendingTasksCount}
              </span>
            )}
          </MenuItem>
        </Menu>
      </>
    );
  };

  const CartIconRenderer = () => {
    const cartStore = marketplaceStore.cartStore;
    return (
      <IconButton
        className="legend-marketplace-header__menu__icon"
        onClick={() => {
          // eslint-disable-next-line no-void
          void cartStore.initialize();
          cartStore.setOpen(true);
        }}
      >
        <CartBadge cartStore={cartStore}>
          <ShoppingCartOutlineIcon />
        </CartBadge>
      </IconButton>
    );
  };

  const HelpIconRenderer = () => {
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const [openAppInfo, setOpenAppInfo] = useState(false);

    const open = Boolean(anchorEl);

    const additionalHelpMenuItems = applicationStore.pluginManager
      .getApplicationPlugins()
      .flatMap((plugin) =>
        plugin.getAdditionalHelpMenuItemConfigs?.(marketplaceStore),
      )
      .filter(isNonNullable);

    const handleShowDemo = (): void => {
      marketplaceStore.setDemoModal(true);
      setAnchorEl(null);
    };

    const handleNewsletterClick = (): void => {
      applicationStore.navigationService.navigator.visitAddress(
        applicationStore.config.options.newsletterUrl,
      );
      applicationStore.telemetryService.logEvent(
        LEGEND_MARKETPLACE_APP_EVENT.CLICK_SUBSCRIBE_TO_NEWSLETTER,
        {},
      );
      setAnchorEl(null);
    };

    return (
      <>
        <IconButton
          onClick={(event) => setAnchorEl(event.currentTarget)}
          className="legend-marketplace-header__menu__icon"
        >
          <HelpOutlineIcon />
        </IconButton>
        <Menu anchorEl={anchorEl} open={open} onClose={() => setAnchorEl(null)}>
          {showDevFeatures && (
            <MenuItem onClick={handleShowDemo}>
              <SimpleCalendarIcon style={{ marginRight: '8px' }} />
              Schedule a Demo
            </MenuItem>
          )}
          <MenuItem onClick={handleNewsletterClick}>
            <OpenNewTabIcon style={{ marginRight: '8px' }} />
            Subscribe to our Newsletter
          </MenuItem>
          <MenuContentDivider />
          <MenuItem
            onClick={() => {
              setOpenAppInfo(true);
              setAnchorEl(null);
              LegendMarketplaceTelemetryHelper.logEvent_ClickToolbarMenu(
                applicationStore.telemetryService,
                ICON_TOOLBAR_TYPE.HELP,
                'About',
              );
            }}
          >
            About
          </MenuItem>
          {adjacentEnvState && adjacentUrl && (
            <MenuItem
              component="a"
              target="_blank"
              href={adjacentUrl}
              onClick={() => {
                LegendMarketplaceTelemetryHelper.logEvent_ClickToolbarMenu(
                  applicationStore.telemetryService,
                  ICON_TOOLBAR_TYPE.HELP,
                  adjacentEnvState.label,
                );
              }}
            >
              {`${adjacentEnvState.label} Env`}
            </MenuItem>
          )}
          {adjacentEnvState && adjacentUrl && <MenuContentDivider />}
          <MenuItem
            component="a"
            href={applicationStore.navigationService.navigator.generateAddress(
              LEGEND_MARKETPLACE_ROUTE_PATTERN.LAKEHOUSE_ADMIN,
            )}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              setAnchorEl(null);
              LegendMarketplaceTelemetryHelper.logEvent_ClickToolbarMenu(
                applicationStore.telemetryService,
                ICON_TOOLBAR_TYPE.HELP,
                'Admin',
              );
            }}
          >
            Admin
          </MenuItem>
          {additionalHelpMenuItems.length > 0 && <MenuContentDivider />}
          {additionalHelpMenuItems.length > 0 &&
            additionalHelpMenuItems.map((item) => (
              <MenuItem
                key={item.label}
                onClick={() => {
                  setAnchorEl(null);
                  item.onClick?.();
                }}
                component={item.href ? 'a' : 'li'}
                href={item.href}
                target={item.href ? '_blank' : undefined}
                rel={item.href ? 'noopener noreferrer' : undefined}
              >
                {item.label}
              </MenuItem>
            ))}
        </Menu>
        <LegendMarketplaceAppInfo
          open={openAppInfo}
          closeModal={() => setOpenAppInfo(false)}
        />
      </>
    );
  };

  const layoutService = applicationStore.layoutService;
  const isDarkMode = !layoutService.TEMPORARY__isLightColorThemeEnabled;

  const handleThemeToggle = () => {
    const newTheme = isDarkMode
      ? LEGEND_APPLICATION_COLOR_THEME.HIGH_CONTRAST_LIGHT
      : LEGEND_APPLICATION_COLOR_THEME.HIGH_CONTRAST_DARK;

    layoutService.setColorTheme(newTheme, { persist: true });
    LegendMarketplaceTelemetryHelper.logEvent_ToggleThemeMode(
      applicationStore.telemetryService,
      newTheme === LEGEND_APPLICATION_COLOR_THEME.HIGH_CONTRAST_DARK,
    );
  };

  const renderThemeToggle = () => {
    return (
      <IconButton
        onClick={handleThemeToggle}
        className="legend-marketplace-header__menu__icon legend-marketplace-header__theme-toggle"
        data-tooltip={
          isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'
        }
      >
        {isDarkMode ? <MoonIcon /> : <SunFilledIcon />}
      </IconButton>
    );
  };

  const toolbarIcons = [
    {
      title: 'Theme',
      renderer: renderThemeToggle,
    },
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
    <>
      <Box className="legend-marketplace-header__icons">
        {toolbarIcons.map((item) => (
          <div key={item.title} className="legend-marketplace-header__icon">
            {item.renderer()}
          </div>
        ))}
      </Box>
      <CartDrawer />
    </>
  );
});
