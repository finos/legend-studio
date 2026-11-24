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

import { Avatar } from '@mui/material';
import { Box } from '@mui/system';
import { RobotIcon } from '../icon/Icon.js';
import { clsx } from '../utils/ComponentUtils.js';

/**
 * The avatar of a system account (a non-human user, e.g. a service or
 * application account), which has no profile to show: a robot icon on a
 * distinct background, so it can be told apart from a human user's avatar.
 */
export const SystemAccountAvatar = (props: {
  className?: string | undefined;
}) => (
  <Avatar
    className={clsx('legend-system-account-avatar', props.className)}
    alt="System account"
  >
    <RobotIcon />
  </Avatar>
);

/**
 * The counterpart of `UserDisplay` for system accounts: there is no
 * directory entry to look up, so it shows the account's id with a robot
 * avatar and a "System" tag.
 */
export const SystemAccountDisplay = (props: {
  id: string;
  className?: string | undefined;
}) => {
  const { id, className } = props;

  return (
    <Box className={clsx('legend-user-display', className)}>
      <SystemAccountAvatar className="legend-user-display__avatar" />
      <div className="legend-user-display__name legend-system-account-display__name">
        {id}
      </div>
      <span className="legend-system-account-display__tag">System</span>
    </Box>
  );
};
