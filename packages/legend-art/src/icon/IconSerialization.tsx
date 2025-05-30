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
  UserIcon,
  HackerIcon,
  DollarIcon,
  ShoppingCartIcon,
  ServerIcon,
  FileUnknownIcon,
} from './Icon.js';

export const deserializeIcon = (
  iconId: string | undefined,
): React.ReactNode | undefined => {
  switch (iconId) {
    case 'FaUser':
      return <UserIcon />;
    case 'FaUserSecret':
      return <HackerIcon />;
    case 'FaDollarSign':
      return <DollarIcon />;
    case 'FaShoppingCart':
      return <ShoppingCartIcon />;
    case 'FaServer':
      return <ServerIcon />;
    default:
      return <FileUnknownIcon />;
  }
};
