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
  CubesLoadingIndicator,
  CubesLoadingIndicatorIcon,
} from '@finos/legend-art';
import { Box, ClickAwayListener, Tooltip, Typography } from '@mui/material';
import { observer } from 'mobx-react-lite';
import { useEffect, useState, useCallback } from 'react';
import type { ActionState, UserSearchService } from '@finos/legend-shared';
import type { GenericLegendApplicationStore } from '@finos/legend-application';
import { UserRenderer } from '../UserRenderer/UserRenderer.js';

const TooltipContent = observer(
  (props: {
    owners: string[];
    fetchingOwnersState: ActionState;
    fetchOwners?: (() => Promise<void>) | undefined;
    applicationStore: GenericLegendApplicationStore;
    userSearchService: UserSearchService | undefined;
  }) => {
    const {
      owners,
      fetchingOwnersState,
      fetchOwners,
      applicationStore,
      userSearchService,
    } = props;

    useEffect(() => {
      if (fetchingOwnersState.isInInitialState) {
        // eslint-disable-next-line no-void
        void fetchOwners?.();
      }
    }, [fetchOwners, fetchingOwnersState.isInInitialState]);

    // In order to ensure the popover is properly resized after we load
    // all the target user data, track how many users have finished loading
    // so that we can trigger a window resize event once all the user data is loaded.
    const [, setNumUsersLoaded] = useState(0);
    const finishedLoadingUserCallback = useCallback(() => {
      if (fetchingOwnersState.hasCompleted) {
        setNumUsersLoaded((prev) => {
          if (prev + 1 === owners.length) {
            // Trigger a window resize event to ensure the Select menu is properly resized
            window.dispatchEvent(new Event('resize'));
          }
          return prev + 1;
        });
      }
    }, [fetchingOwnersState.hasCompleted, owners.length]);

    return (
      <Box className="lakehouse-data-product-owners-tooltip">
        <Typography variant="h5" gutterBottom={true}>
          Owners
        </Typography>
        {fetchingOwnersState.isInInitialState ||
        fetchingOwnersState.isInProgress ? (
          <CubesLoadingIndicator isLoading={true}>
            <CubesLoadingIndicatorIcon />
          </CubesLoadingIndicator>
        ) : (
          owners.map((owner) => (
            <UserRenderer
              key={owner}
              userId={owner}
              applicationStore={applicationStore}
              userSearchService={userSearchService}
              onFinishedLoadingCallback={finishedLoadingUserCallback}
            />
          ))
        )}
      </Box>
    );
  },
);

export const LakehouseDataProductOwnersTooltip = observer(
  (props: {
    open: boolean;
    setIsOpen: (val: boolean) => void;
    owners: string[];
    fetchingOwnersState: ActionState;
    fetchOwners?: () => Promise<void>;
    applicationStore: GenericLegendApplicationStore;
    userSearchService: UserSearchService | undefined;
    children: React.ReactElement;
  }) => {
    const {
      open,
      setIsOpen,
      owners,
      fetchingOwnersState,
      fetchOwners,
      applicationStore,
      userSearchService,
      children,
    } = props;

    return (
      <ClickAwayListener onClickAway={() => setIsOpen(false)}>
        <Tooltip
          open={open}
          onClose={() => setIsOpen(false)}
          placement="bottom"
          disableFocusListener={true}
          disableHoverListener={true}
          disableTouchListener={true}
          title={
            <TooltipContent
              owners={owners}
              fetchingOwnersState={fetchingOwnersState}
              fetchOwners={fetchOwners}
              applicationStore={applicationStore}
              userSearchService={userSearchService}
            />
          }
          slotProps={{
            tooltip: {
              className: 'lakehouse-data-product-owners-tooltip__wrapper',
            },
          }}
        >
          {children}
        </Tooltip>
      </ClickAwayListener>
    );
  },
);
