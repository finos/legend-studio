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
import { useState } from 'react';
import type { LegendMarketplaceBaseStore } from '../../stores/LegendMarketplaceBaseStore.js';
import { UserRenderer } from '../UserRenderer/UserRenderer.js';

export const MultiUserCellRenderer = (props: {
  userIds: string[];
  marketplaceStore: LegendMarketplaceBaseStore;
}): React.ReactNode => {
  const { userIds, marketplaceStore } = props;
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  if (userIds.length === 1) {
    return (
      <UserRenderer
        userId={userIds[0]}
        marketplaceStore={marketplaceStore}
        className="marketplace-lakehouse-entitlements__grid__user-display"
      />
    );
  } else {
    return (
      <>
        <Link
          onClick={(event) => setAnchorEl(event.currentTarget)}
          className="marketplace-lakehouse-entitlements__grid__multi-user__link"
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
          <Box className="marketplace-lakehouse-entitlements__grid__multi-user__popover">
            {userIds.map((userId) => (
              <UserRenderer
                key={userId}
                userId={userId}
                marketplaceStore={marketplaceStore}
              />
            ))}
          </Box>
        </Popover>
      </>
    );
  }
};
