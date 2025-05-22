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

import type { LegendUser } from '@finos/legend-shared';
import { Avatar } from '@mui/material';
import { Box } from '@mui/system';

export const UserDisplay = (props: {
  user: LegendUser;
  imgSrc?: string | undefined;
  onClick?: () => void;
}) => {
  const { user, imgSrc, onClick } = props;

  return (
    <Box className="legend-user-display" onClick={onClick}>
      {imgSrc ? (
        <Avatar
          className="legend-user-display__avatar legend-user-display__avatar--image"
          src={imgSrc}
          alt={user.displayName ?? ''}
        />
      ) : (
        <Avatar className="legend-user-display__avatar legend-user-display__avatar--text">
          {user.firstName || user.lastName
            ? `${user.firstName?.charAt(0)}${user.lastName?.charAt(0)}`
            : user.displayName?.charAt(0)}
        </Avatar>
      )}
      <div className="legend-user-display__name">{user.displayName}</div>
    </Box>
  );
};
