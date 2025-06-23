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

import { UserDisplay } from '@finos/legend-art';
import { LegendUser } from '@finos/legend-shared';
import { CircularProgress } from '@mui/material';
import type { LegendMarketplaceBaseStore } from '../../stores/LegendMarketplaceBaseStore.js';
import { useEffect, useState } from 'react';

export const UserRenderer = (props: {
  userId: string | undefined;
  marketplaceStore: LegendMarketplaceBaseStore;
  className?: string | undefined;
  appendComma?: boolean;
}): React.ReactNode => {
  const { userId, marketplaceStore, className, appendComma } = props;
  const [userData, setUserData] = useState<LegendUser | string | undefined>();
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchUserData = async (): Promise<void> => {
      if (userId) {
        setLoading(true);
        try {
          const user =
            await marketplaceStore.userSearchService?.getOrFetchUser(userId);
          setUserData(user);
        } finally {
          setLoading(false);
        }
      }
    };
    // eslint-disable-next-line no-void
    void fetchUserData();
  }, [marketplaceStore.userSearchService, userId]);

  if (loading) {
    return <CircularProgress size={20} />;
  } else if (userData instanceof LegendUser) {
    const imgSrc =
      marketplaceStore.applicationStore.config.marketplaceUserProfileImageUrl?.replace(
        '{userId}',
        userData.id,
      );
    const openUserDirectoryLink = (): void =>
      marketplaceStore.applicationStore.navigationService.navigator.visitAddress(
        `${marketplaceStore.applicationStore.config.lakehouseEntitlementsConfig?.applicationDirectoryUrl}/${userId}`,
      );

    return (
      <UserDisplay
        user={userData}
        imgSrc={imgSrc}
        onClick={() => openUserDirectoryLink()}
        className={className}
      />
    );
  } else if (userData) {
    return (
      <>
        {userData}
        {appendComma ? ', ' : ''}
      </>
    );
  } else {
    return (
      <>
        {userId}
        {appendComma ? ', ' : ''}
      </>
    );
  }
};
