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
  Router,
  Route,
  Switch,
  Redirect,
  matchPath,
  generatePath,
  MemoryRouter,
  useParams,
  useLocation,
} from 'react-router';
import {
  NAVIGATION_ZONE_PREFIX,
  type NavigationZone,
} from './NavigationService.js';

export { BrowserRouter } from 'react-router-dom';
export {
  Router,
  Route,
  Switch,
  Redirect,
  useParams,
  matchPath,
  generatePath,
  MemoryRouter,
};
export { createMemoryHistory } from 'history';

export const useNavigationZone = (): NavigationZone => {
  const location = useLocation() as { hash: string }; // TODO: this is a temporary hack until we upgrade react-router
  return location.hash.substring(NAVIGATION_ZONE_PREFIX.length);
};
