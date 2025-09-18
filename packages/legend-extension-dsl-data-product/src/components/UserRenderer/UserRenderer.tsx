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
import { LegendUser, type UserSearchService } from '@finos/legend-shared';
import { Box, CircularProgress } from '@mui/material';
import type { ProductViewerLegendApplicationStore } from '@finos/legend-extension-dsl-data-product';
import { useEffect, useState } from 'react';

export const UserRenderer = (props: {
  userId: string | undefined;
  applicationStore: ProductViewerLegendApplicationStore;
  userSearchService: UserSearchService | undefined;
  userProfileImageUrl?: string | undefined;
  applicationDirectoryUrl?: string | undefined;
  className?: string | undefined;
  appendComma?: boolean;
  disableOnClick?: boolean;
  onFinishedLoadingCallback?: () => void;
}): React.ReactNode => {
  const {
    userId,
    applicationStore,
    userSearchService,
    userProfileImageUrl,
    applicationDirectoryUrl,
    className,
    appendComma,
    disableOnClick,
    onFinishedLoadingCallback,
  } = props;
  const [userData, setUserData] = useState<LegendUser | string | undefined>();
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchUserData = async (): Promise<void> => {
      if (userId) {
        setLoading(true);
        try {
          const user = await userSearchService?.getOrFetchUser(userId);
          setUserData(user);
        } finally {
          setLoading(false);
          onFinishedLoadingCallback?.();
        }
      }
    };
    // eslint-disable-next-line no-void
    void fetchUserData();
  }, [userSearchService, userId, onFinishedLoadingCallback]);

  if (loading) {
    return <CircularProgress size={20} />;
  } else if (userData instanceof LegendUser) {
    const imgSrc = userProfileImageUrl?.replace('{userId}', userData.id);
    const openUserDirectoryLink = (): void =>
      applicationStore.navigationService.navigator.visitAddress(
        `${applicationDirectoryUrl}/${userId}`,
      );

    return (
      <UserDisplay
        user={userData}
        imgSrc={imgSrc}
        onClick={() => (disableOnClick ? undefined : openUserDirectoryLink())}
        className={className}
      />
    );
  } else if (userData) {
    return appendComma ? (
      <>
        {userData}
        {', '}
      </>
    ) : (
      <Box>{userData}</Box>
    );
  } else {
    return appendComma ? (
      <>
        {userId}
        {', '}
      </>
    ) : (
      <Box>{userId}</Box>
    );
  }
};
