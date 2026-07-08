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
import { type UserSearchService, LegendUser } from '@finos/legend-shared';
import { Box, CircularProgress } from '@mui/material';
import { useEffect, useState } from 'react';
import type { GenericLegendApplicationStore } from '@finos/legend-application';

export interface UserRendererOptions {
  className?: string | undefined;
  appendComma?: boolean | undefined;
  disableOnClick?: boolean | undefined;
  hideIfNotFound?: boolean | undefined;
  onFinishedLoadingCallback?: (() => void) | undefined;
}

export const UserRenderer = (props: {
  userId: string;
  applicationStore: GenericLegendApplicationStore;
  userSearchService: UserSearchService | undefined;
  options?: UserRendererOptions | undefined;
}): React.ReactNode => {
  const { userId, applicationStore, userSearchService, options } = props;
  const {
    className,
    appendComma,
    disableOnClick,
    hideIfNotFound,
    onFinishedLoadingCallback,
  } = options ?? {};
  const [userData, setUserData] = useState<LegendUser | string | undefined>();
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchUserData = async (): Promise<void> => {
      setLoading(true);
      try {
        const user = await userSearchService?.getOrFetchUser(userId);
        setUserData(user);
      } finally {
        setLoading(false);
        onFinishedLoadingCallback?.();
      }
    };
    // eslint-disable-next-line no-void
    void fetchUserData();
  }, [onFinishedLoadingCallback, userId, userSearchService]);

  if (loading) {
    return (
      <Box>
        <CircularProgress size={20} />
      </Box>
    );
  } else if (userData instanceof LegendUser) {
    const imgSrc = userSearchService?.userProfileImageUrl?.replace(
      '{userId}',
      userData.id,
    );
    const openUserDirectoryLink = (): void =>
      applicationStore.navigationService.navigator.visitAddress(
        `${userSearchService?.applicationDirectoryUrl}/${userId}`,
      );

    return (
      <UserDisplay
        user={userData}
        imgSrc={imgSrc}
        onClick={disableOnClick ? undefined : () => openUserDirectoryLink()}
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
  } else if (hideIfNotFound) {
    return null;
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
