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

import { beforeEach, describe, expect, test } from '@jest/globals';
import { unitTest } from '@finos/legend-shared/test';
import {
  ApplicationStore,
  type UserDataService,
} from '@finos/legend-application';
import { TEST__getTestLegendMarketplaceApplicationConfig } from '../../application/__test-utils__/LegendMarketplaceApplicationTestUtils.js';
import { LegendMarketplacePluginManager } from '../../application/LegendMarketplacePluginManager.js';
import {
  LEGEND_MARKETPLACE_USER_DATA_KEY,
  LegendMarketplaceUserDataHelper,
  USER_DATA_HOME_PAGE_DISMISSED_BANNER_IDS_LIMIT,
} from '../LegendMarketplaceUserDataHelper.js';

const KEY = LEGEND_MARKETPLACE_USER_DATA_KEY.HOME_PAGE_DISMISSED_BANNER_IDS;
const LIMIT = USER_DATA_HOME_PAGE_DISMISSED_BANNER_IDS_LIMIT;
const getClosed = (service: UserDataService): string[] =>
  LegendMarketplaceUserDataHelper.homePage_getDismissedBannerIds(service);
const close = (service: UserDataService, bannerId: string): string[] =>
  LegendMarketplaceUserDataHelper.homePage_addDismissedBannerId(
    service,
    bannerId,
  );

// A new application store reads the browser's storage, as Marketplace does when
// a page loads.
const createUserDataService = (): UserDataService =>
  new ApplicationStore(
    TEST__getTestLegendMarketplaceApplicationConfig(),
    LegendMarketplacePluginManager.create(),
  ).userDataService;

beforeEach(() => {
  window.localStorage.clear();
});

describe(unitTest('Home page banners the user closed'), () => {
  test('none at first', () => {
    expect(getClosed(createUserDataService())).toEqual([]);
  });

  test('kept newest first, and still there on the next page load', () => {
    const service = createUserDataService();
    close(service, 'banner-a');
    expect(close(service, 'banner-b')).toEqual(['banner-b', 'banner-a']);

    expect(getClosed(createUserDataService())).toEqual([
      'banner-b',
      'banner-a',
    ]);
  });

  test('a banner closed again moves to the front, without a duplicate', () => {
    const service = createUserDataService();
    close(service, 'banner-a');
    close(service, 'banner-b');
    close(service, 'banner-a');
    expect(getClosed(service)).toEqual(['banner-a', 'banner-b']);
  });

  test('at most the limit: the oldest ids are dropped', () => {
    const service = createUserDataService();
    for (let index = 0; index <= LIMIT; index++) {
      close(service, `banner-${index}`);
    }
    const closed = getClosed(service);
    expect(closed).toHaveLength(LIMIT);
    expect(closed[0]).toBe(`banner-${LIMIT}`);
    expect(closed).not.toContain('banner-0');
  });

  test('a stored value that is not a list counts as no closed banners', () => {
    const service = createUserDataService();
    for (const value of ['banner-a', 42, { id: 'banner-a' }]) {
      service.persistValue(KEY, value);
      expect(getClosed(service)).toEqual([]);
    }
  });

  test('stored ids that are not text are skipped, and dropped when saving', () => {
    const service = createUserDataService();
    service.persistValue(KEY, [42, true, 'banner-a', { id: 'banner-x' }]);
    expect(getClosed(service)).toEqual(['banner-a']);

    expect(close(service, 'banner-b')).toEqual(['banner-b', 'banner-a']);
  });
});
