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

import type { UserDataService } from '@finos/legend-application';
import { isString } from '@finos/legend-shared';

/**
 * Keys of what Marketplace keeps for the user in this browser, in Legend's user
 * data storage.
 */
export enum LEGEND_MARKETPLACE_USER_DATA_KEY {
  // The ids of the home page banners the user closed, newest first, so a closed
  // banner stays closed on later visits.
  HOME_PAGE_DISMISSED_BANNER_IDS = 'marketplace.home-page.dismissedBannerIds',
}

/**
 * How many closed banner ids to keep: past this, the oldest ones are dropped, so
 * the stored list can't grow without bound as banners come and go.
 */
export const USER_DATA_HOME_PAGE_DISMISSED_BANNER_IDS_LIMIT = 50;

/**
 * Reads a stored list of ids. A stored value that isn't a list counts as no ids,
 * and entries that aren't text are skipped.
 */
const getIdList = (
  service: UserDataService,
  key: LEGEND_MARKETPLACE_USER_DATA_KEY,
): string[] => {
  const data = service.getObjectValue(key);
  return Array.isArray(data) ? data.filter(isString) : [];
};

/**
 * Puts an id first in a stored list of ids, moving it if it's there already, and
 * drops the oldest ids past the limit. Returns the saved list.
 */
const addToIdList = (
  service: UserDataService,
  key: LEGEND_MARKETPLACE_USER_DATA_KEY,
  id: string,
  limit: number,
): string[] => {
  const ids = [
    id,
    ...getIdList(service, key).filter((each) => each !== id),
  ].slice(0, limit);
  service.persistValue(key, ids);
  return ids;
};

export class LegendMarketplaceUserDataHelper {
  static homePage_getDismissedBannerIds(service: UserDataService): string[] {
    return getIdList(
      service,
      LEGEND_MARKETPLACE_USER_DATA_KEY.HOME_PAGE_DISMISSED_BANNER_IDS,
    );
  }

  /**
   * Remembers that the user closed the home page banner with this id. Returns the
   * ids of all the closed banners, newest first.
   */
  static homePage_addDismissedBannerId(
    service: UserDataService,
    bannerId: string,
  ): string[] {
    return addToIdList(
      service,
      LEGEND_MARKETPLACE_USER_DATA_KEY.HOME_PAGE_DISMISSED_BANNER_IDS,
      bannerId,
      USER_DATA_HOME_PAGE_DISMISSED_BANNER_IDS_LIMIT,
    );
  }
}
