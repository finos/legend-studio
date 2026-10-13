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

import { describe, expect, jest, test } from '@jest/globals';
import type { NavigationService } from '@finos/legend-application';
import {
  readLegendQueryCubeEntry,
  readLegendQueryCubeId,
  showLegendQueryCubeInAddress,
  stripLegendQueryCubeEntry,
} from '../LegendQueryCubeEntry.js';

/** A navigator on the Cube page at the address's search, which a link writes encoded */
const createNavigator = (
  search: string,
  location = '/cube',
): {
  navigator: NavigationService['navigator'];
  updateCurrentLocation: jest.Mock<
    (location: string, options?: { replace?: boolean }) => void
  >;
} => {
  const updateCurrentLocation =
    jest.fn<(location: string, options?: { replace?: boolean }) => void>();
  const navigator = {
    getCurrentAddress: () => `http://localhost/query${location}${search}`,
    getCurrentLocation: () => location,
    updateCurrentLocation,
  } as unknown as NavigationService['navigator'];
  return { navigator, updateCurrentLocation };
};

const ID = 'PRODUCTION/my_dp/11/default/ap';

describe("The Cube page's entry link", () => {
  test('Reads the linked source, and the strip takes it out of the address', () => {
    const { navigator, updateCurrentLocation } = createNavigator(
      `?sourceType=dataProductAccessPoint&sourceId=${encodeURIComponent(ID)}`,
    );
    expect(readLegendQueryCubeEntry(navigator)).toEqual({
      sourceType: 'dataProductAccessPoint',
      sourceId: ID,
    });
    expect(updateCurrentLocation).not.toHaveBeenCalled();
    stripLegendQueryCubeEntry(navigator);
    expect(updateCurrentLocation).toHaveBeenCalledTimes(1);
    expect(updateCurrentLocation).toHaveBeenCalledWith('/cube', {
      replace: true,
    });
  });

  test("Decodes the id once, so a part's own encoding reaches the cube", () => {
    // a data product id with a '/', encoded in the id, then the id encoded as the parameter
    const id = 'PRODUCTION/A%2FB/11/default/ap';
    const { navigator } = createNavigator(
      `?sourceType=dataProductAccessPoint&sourceId=${encodeURIComponent(id)}`,
    );
    expect(readLegendQueryCubeEntry(navigator)?.sourceId).toBe(id);
  });

  test.each([
    ['sourceType', '?sourceType=dataProductAccessPoint'],
    ['sourceId', `?sourceId=${encodeURIComponent(ID)}`],
  ])(
    'Opens no source when the link carries only %s, and still strips it',
    (_name, search) => {
      const { navigator, updateCurrentLocation } = createNavigator(search);
      expect(readLegendQueryCubeEntry(navigator)).toBeUndefined();
      stripLegendQueryCubeEntry(navigator);
      expect(updateCurrentLocation).toHaveBeenCalledWith('/cube', {
        replace: true,
      });
    },
  );

  test('A saved query wins over a linked source and stays in the address', () => {
    const { navigator, updateCurrentLocation } = createNavigator(
      `?sourceType=dataProductAccessPoint&sourceId=${encodeURIComponent(ID)}&queryId=${encodeURIComponent('my query&id')}`,
    );
    expect(readLegendQueryCubeEntry(navigator)).toBeUndefined();
    stripLegendQueryCubeEntry(navigator);
    expect(updateCurrentLocation).toHaveBeenCalledTimes(1);
    const location = new URL(
      String(updateCurrentLocation.mock.calls[0]?.[0]),
      'http://localhost',
    );
    expect(location.pathname).toBe('/cube');
    expect([...location.searchParams]).toEqual([['queryId', 'my query&id']]);
  });

  test("Strips only the source's parameters, keeping the others and the hash", () => {
    const { navigator, updateCurrentLocation } = createNavigator(
      '?a=1&sourceType=x&sourceId=y#zone',
    );
    stripLegendQueryCubeEntry(navigator);
    expect(updateCurrentLocation).toHaveBeenCalledWith('/cube?a=1#zone', {
      replace: true,
    });
  });

  test('Keeps a saved query among the other parameters it keeps', () => {
    const { navigator, updateCurrentLocation } = createNavigator(
      '?a=1&sourceType=x&sourceId=y&queryId=q&b=2#zone',
    );
    stripLegendQueryCubeEntry(navigator);
    expect(updateCurrentLocation).toHaveBeenCalledWith(
      '/cube?a=1&queryId=q&b=2#zone',
      { replace: true },
    );
  });

  test.each([
    ['only a saved query', '?queryId=my-query'],
    ['no parameter', ''],
  ])('Leaves the address alone when it carries %s', (_name, search) => {
    const { navigator, updateCurrentLocation } = createNavigator(search);
    expect(readLegendQueryCubeEntry(navigator)).toBeUndefined();
    stripLegendQueryCubeEntry(navigator);
    expect(updateCurrentLocation).not.toHaveBeenCalled();
  });
});

describe("The Cube page's address for a saved cube (PLAN §11.13)", () => {
  test('Reads the cube from the path, else from ?queryId=', () => {
    expect(readLegendQueryCubeId(createNavigator('').navigator, 'cube-1')).toBe(
      'cube-1',
    );
    expect(
      readLegendQueryCubeId(
        createNavigator('?queryId=cube-2').navigator,
        'cube-1',
      ),
    ).toBe('cube-1');
    expect(
      readLegendQueryCubeId(
        createNavigator(`?queryId=${encodeURIComponent('a b&c')}`).navigator,
        undefined,
      ),
    ).toBe('a b&c');
    expect(
      readLegendQueryCubeId(createNavigator('?queryId=%20').navigator, ' '),
    ).toBeUndefined();
    expect(
      readLegendQueryCubeId(createNavigator('').navigator, undefined),
    ).toBeUndefined();
  });

  test('Shows the saved cube in the path, replacing the history entry, and drops ?queryId=', () => {
    const fromQueryId = createNavigator('?queryId=cube-1&a=1#zone');
    showLegendQueryCubeInAddress(fromQueryId.navigator, 'cube-1');
    expect(fromQueryId.updateCurrentLocation).toHaveBeenCalledWith(
      '/cube/cube-1?a=1#zone',
      { replace: true },
    );

    const newCube = createNavigator('', '/cube/cube-1');
    showLegendQueryCubeInAddress(newCube.navigator, undefined);
    expect(newCube.updateCurrentLocation).toHaveBeenCalledWith('/cube', {
      replace: true,
    });

    const encoded = createNavigator('');
    showLegendQueryCubeInAddress(encoded.navigator, 'a/b c');
    expect(encoded.updateCurrentLocation).toHaveBeenCalledWith(
      '/cube/a%2Fb%20c',
      { replace: true },
    );
  });

  test('Leaves an address that already shows the cube alone', () => {
    const { navigator, updateCurrentLocation } = createNavigator(
      '?a=1',
      '/cube/cube-1',
    );
    showLegendQueryCubeInAddress(navigator, 'cube-1');
    expect(updateCurrentLocation).not.toHaveBeenCalled();
  });
});
