/**
 * Copyright (c) 2026-present, Goldman Sachs
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
  CubesLoadingIndicator,
  CubesLoadingIndicatorIcon,
} from '@finos/legend-art';
import {
  Avatar,
  AvatarGroup,
  Box,
  CircularProgress,
  Popover,
  Typography,
} from '@mui/material';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import type { ActionState, UserSearchService } from '@finos/legend-shared';
import type { GenericLegendApplicationStore } from '@finos/legend-application';
import { UserRenderer } from '../UserRenderer/UserRenderer.js';

export const UserAvatarGroupWithPopover = observer(
  (props: {
    users: string[];
    fetchingUsersState: ActionState;
    label: string;
    userSearchService: UserSearchService | undefined;
    applicationStore: GenericLegendApplicationStore;
    title?: string;
    popoverContentClassName?: string;
  }) => {
    const {
      users,
      fetchingUsersState,
      label,
      userSearchService,
      applicationStore,
      title,
      popoverContentClassName,
    } = props;
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

    const togglePopover = (target: HTMLElement) => {
      setAnchorEl(anchorEl ? null : target);
    };

    return (
      <>
        <div
          className="data-product__viewer__header__type__owners"
          onClick={(e) => togglePopover(e.currentTarget)}
          role="button"
          tabIndex={0}
          title={title}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              togglePopover(e.currentTarget);
            }
          }}
        >
          {fetchingUsersState.isInInitialState ||
          fetchingUsersState.isInProgress ? (
            <CircularProgress size={16} />
          ) : (
            <AvatarGroup
              max={3}
              className="data-product__viewer__header__type__owners__avatars"
            >
              {users.map((user) => {
                const imgUrl = userSearchService?.userProfileImageUrl?.replace(
                  '{userId}',
                  user,
                );
                return (
                  <Avatar
                    key={user}
                    {...(imgUrl ? { src: imgUrl } : {})}
                    alt={user}
                  >
                    {user.substring(0, 2).toUpperCase()}
                  </Avatar>
                );
              })}
            </AvatarGroup>
          )}
          <Typography
            variant="caption"
            className="data-product__viewer__header__type__owners__label"
          >
            {label}
          </Typography>
        </div>
        <Popover
          open={Boolean(anchorEl)}
          anchorEl={anchorEl}
          onClose={() => setAnchorEl(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          transformOrigin={{ vertical: 'top', horizontal: 'left' }}
          disableScrollLock={true}
        >
          <Box
            className={`lakehouse-data-product-owners-tooltip${popoverContentClassName ? ` ${popoverContentClassName}` : ''}`}
          >
            {fetchingUsersState.isInInitialState ||
            fetchingUsersState.isInProgress ? (
              <CubesLoadingIndicator isLoading={true}>
                <CubesLoadingIndicatorIcon />
              </CubesLoadingIndicator>
            ) : (
              users.map((user) => (
                <UserRenderer
                  key={user}
                  userId={user}
                  applicationStore={applicationStore}
                  userSearchService={userSearchService}
                />
              ))
            )}
          </Box>
        </Popover>
      </>
    );
  },
);
