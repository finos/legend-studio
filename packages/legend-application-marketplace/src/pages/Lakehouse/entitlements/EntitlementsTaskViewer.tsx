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

import { withAuth, type AuthContextProps } from 'react-oidc-context';
import type { EntitlementsTaskViewerState } from '../../../stores/lakehouse/entitlements/EntitlementsTaskViewerState.js';
import { observer } from 'mobx-react-lite';
import { GridItemsViewer } from '../shared/GridItemViewer.js';
import { Button, Divider, Stack } from '@mui/material';

export const EntitlementsTaskViewer = withAuth(
  observer((props: { currentViewer: EntitlementsTaskViewerState }) => {
    const auth = (props as unknown as { auth: AuthContextProps }).auth;
    const { currentViewer } = props;
    const handleApprove = (): void => {
      currentViewer.approve(auth.user?.access_token);
    };

    const handleDeny = (): void => {
      currentViewer.deny(auth.user?.access_token);
    };

    return (
      <div className="marketplace-lakehouse-entitlements-grid-viewer">
        {currentViewer.canApprove && (
          <div className="marketplace-lakehouse-entitlements-grid-viewer__action-header">
            <Stack
              className="marketplace-lakehouse-entitlements-grid-viewer__action"
              direction={'row'}
              spacing={1}
            >
              <Button
                variant="contained"
                size="small"
                onClick={handleApprove}
                color="success"
                sx={{ fontSize: '10px' }}
              >
                Approve
              </Button>
              <Button
                color="error"
                variant="contained"
                size="small"
                onClick={handleDeny}
                sx={{ fontSize: '10px' }}
              >
                Deny
              </Button>
            </Stack>
            <Divider />
          </div>
        )}
        <GridItemsViewer
          details={currentViewer.taskDetails}
          title="Task Metadata"
        />
      </div>
    );
  }),
);
