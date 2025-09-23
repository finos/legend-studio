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

import { Link, Popover, Box } from '@mui/material';
import { useCallback, useState } from 'react';
import { UserRenderer } from './UserRenderer.js';
import type { GenericLegendApplicationStore } from '@finos/legend-application';
import type { UserSearchService } from '@finos/legend-shared';

export const MultiUserRenderer = (props: {
  userIds: string[];
  applicationStore: GenericLegendApplicationStore;
  userSearchService: UserSearchService | undefined;
  singleUserClassName?: string;
}): React.ReactNode => {
  const { userIds, applicationStore, userSearchService, singleUserClassName } =
    props;
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  // In order to ensure the popover is properly resized after we load
  // all the target user data, track how many users have finished loading
  // so that we can trigger a window resize event once all the user data is loaded.
  const [, setNumUsersLoaded] = useState(0);
  const finishedLoadingUserCallback = useCallback(() => {
    setNumUsersLoaded((prev) => {
      if (prev + 1 === userIds.length) {
        // Trigger a window resize event to ensure the Select menu is properly resized
        window.dispatchEvent(new Event('resize'));
      }
      return prev + 1;
    });
  }, [userIds]);

  if (userIds.length === 1) {
    return (
      <UserRenderer
        userId={userIds[0]}
        className={singleUserClassName}
        applicationStore={applicationStore}
        userSearchService={userSearchService}
      />
    );
  } else {
    return (
      <>
        <Link
          onClick={(event) => setAnchorEl(event.currentTarget)}
          className="legend-marketplace-multi-user-cell-renderer__link"
        >
          {userIds.length} Users
        </Link>
        <Popover
          open={Boolean(anchorEl)}
          anchorEl={anchorEl}
          onClose={() => setAnchorEl(null)}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'left',
          }}
        >
          <Box className="legend-marketplace-multi-user-cell-renderer__popover">
            {userIds.map((userId) => (
              <UserRenderer
                key={userId}
                userId={userId}
                applicationStore={applicationStore}
                userSearchService={userSearchService}
                onFinishedLoadingCallback={finishedLoadingUserCallback}
              />
            ))}
          </Box>
        </Popover>
      </>
    );
  }
};
