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
import type { GenericLegendApplicationStore } from '../../ApplicationStore.js';
import { StorageService, StorageStore } from '../StorageService.js';

const APPLICATION_STORAGE_KEY = 'test-application';
const SETTINGS_INDEX = 'settings';
const USER_DATA_INDEX = 'user-data';

// Each service stands for the application open in one browser tab: they all
// share the same `localStorage`, as tabs of the same origin do.
const createTab = (): {
  settings: StorageStore;
  userData: StorageStore;
} => {
  const service = new StorageService({
    config: { applicationStorageKey: APPLICATION_STORAGE_KEY },
  } as unknown as GenericLegendApplicationStore);
  return {
    settings: new StorageStore(service, SETTINGS_INDEX),
    userData: new StorageStore(service, USER_DATA_INDEX),
  };
};

const readStoredData = (): Record<string, Record<string, unknown>> =>
  JSON.parse(
    window.localStorage.getItem(APPLICATION_STORAGE_KEY) ?? '{}',
  ) as Record<string, Record<string, unknown>>;

// The browser fires this in the other tabs when one tab writes to
// `localStorage` (jsdom, like browsers, does not fire it in the writing window)
const fireStorageEventFromAnotherTab = (key: string | null): void => {
  window.dispatchEvent(
    new StorageEvent('storage', {
      key,
      newValue:
        key === null
          ? null
          : window.localStorage.getItem(APPLICATION_STORAGE_KEY),
      storageArea: window.localStorage,
    }),
  );
};

beforeEach(() => {
  window.localStorage.clear();
});

describe('StorageService with the application open in several tabs', () => {
  test(
    unitTest('a save in one tab keeps the values saved by another tab'),
    () => {
      const tabA = createTab();
      const tabB = createTab();

      tabA.userData.persistValue('recents', ['a']);
      tabA.settings.persistValue('theme', 'dark');
      tabB.userData.persistValue('panel-open', true);

      expect(readStoredData()).toEqual({
        [SETTINGS_INDEX]: { theme: 'dark' },
        [USER_DATA_INDEX]: { recents: ['a'], 'panel-open': true },
      });
      // a tab opened afterwards sees all of them
      const tabC = createTab();
      expect(tabC.userData.getValue('recents')).toEqual(['a']);
      expect(tabC.userData.getBooleanValue('panel-open')).toBe(true);
      expect(tabC.settings.getStringValue('theme')).toBe('dark');
    },
  );

  test(unitTest('removing a value in one tab only removes that value'), () => {
    const tabA = createTab();
    tabA.userData.persistValue('panel-open', true);
    const tabB = createTab();

    tabA.userData.persistValue('recents', ['a']);
    tabB.userData.persistValue('panel-open', undefined);

    expect(readStoredData()).toEqual({
      [USER_DATA_INDEX]: { recents: ['a'] },
    });
  });

  test(
    unitTest(
      'a tab sees the values saved by another tab once it is told of the change',
    ),
    () => {
      const tabA = createTab();
      const tabB = createTab();

      tabA.userData.persistValue('recents', ['a']);
      fireStorageEventFromAnotherTab(APPLICATION_STORAGE_KEY);

      const recents = tabB.userData.getValue('recents') as string[] | undefined;
      expect(recents).toEqual(['a']);
      tabB.userData.persistValue('recents', [...(recents ?? []), 'b']);

      expect(readStoredData()[USER_DATA_INDEX]?.recents).toEqual(['a', 'b']);
      expect(tabB.userData.getValue('recents')).toEqual(['a', 'b']);
    },
  );

  test(
    unitTest(
      'a tab drops its values when another tab clears the local storage',
    ),
    () => {
      const tabA = createTab();
      tabA.userData.persistValue('recents', ['a']);

      window.localStorage.clear();
      fireStorageEventFromAnotherTab(null);

      expect(tabA.userData.getValue('recents')).toBeUndefined();
      expect(tabA.userData.hasValue('recents')).toBe(false);
    },
  );
});

describe('StorageService in a single tab', () => {
  test(unitTest('reads back the values it saves'), () => {
    const tab = createTab();

    tab.userData.persistValue('count', 3);
    tab.userData.persistValue('name', 'x');
    tab.userData.persistValue('recents', [{ id: 1 }]);

    expect(tab.userData.getNumericValue('count')).toBe(3);
    expect(tab.userData.getStringValue('name')).toBe('x');
    expect(tab.userData.getObjectValue('recents')).toEqual([{ id: 1 }]);
    expect(tab.userData.hasValue('count')).toBe(true);
    expect(tab.userData.hasValue('missing')).toBe(false);
  });

  test(unitTest('removes an index once its last value is removed'), () => {
    const tab = createTab();

    tab.settings.persistValue('theme', 'dark');
    tab.userData.persistValue('recents', ['a']);
    tab.userData.persistValue('recents', undefined);

    expect(readStoredData()).toEqual({
      [SETTINGS_INDEX]: { theme: 'dark' },
    });
    expect(tab.userData.getValue('recents')).toBeUndefined();
  });

  test(unitTest('starts empty when the stored entry is not valid JSON'), () => {
    window.localStorage.setItem(APPLICATION_STORAGE_KEY, '{not json');
    const tab = createTab();

    expect(tab.userData.getValue('recents')).toBeUndefined();
    tab.userData.persistValue('recents', ['a']);

    expect(readStoredData()).toEqual({
      [USER_DATA_INDEX]: { recents: ['a'] },
    });
  });
});
