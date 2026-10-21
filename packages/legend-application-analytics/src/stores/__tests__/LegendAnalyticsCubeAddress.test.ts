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
  readLegendAnalyticsCubeId,
  showLegendAnalyticsCubeInAddress,
} from '../LegendAnalyticsCubeAddress.js';

/** A navigator on the Cube page at a location and search, as a link writes them */
const createNavigator = (
  search: string,
  location = '/',
): {
  navigator: NavigationService['navigator'];
  updateCurrentLocation: jest.Mock<
    (location: string, options?: { replace?: boolean }) => void
  >;
} => {
  const updateCurrentLocation =
    jest.fn<(location: string, options?: { replace?: boolean }) => void>();
  const navigator = {
    getCurrentAddress: () => `http://localhost/analytics${location}${search}`,
    getCurrentLocation: () => location,
    updateCurrentLocation,
  } as unknown as NavigationService['navigator'];
  return { navigator, updateCurrentLocation };
};

describe("The Cube page's address for a saved cube (PLAN §11.13)", () => {
  test('Reads the cube from the path, else from ?queryId=', () => {
    expect(
      readLegendAnalyticsCubeId(createNavigator('').navigator, 'cube-1'),
    ).toBe('cube-1');
    expect(
      readLegendAnalyticsCubeId(
        createNavigator('?queryId=cube-2').navigator,
        'cube-1',
      ),
    ).toBe('cube-1');
    expect(
      readLegendAnalyticsCubeId(
        createNavigator(`?queryId=${encodeURIComponent('a b&c')}`).navigator,
        undefined,
      ),
    ).toBe('a b&c');
    expect(
      readLegendAnalyticsCubeId(createNavigator('?queryId=%20').navigator, ' '),
    ).toBeUndefined();
    expect(
      readLegendAnalyticsCubeId(createNavigator('').navigator, undefined),
    ).toBeUndefined();
  });

  test('Shows the saved cube in the path, replacing the history entry, and drops ?queryId=', () => {
    const fromQueryId = createNavigator('?queryId=cube-1&a=1#zone');
    showLegendAnalyticsCubeInAddress(fromQueryId.navigator, 'cube-1');
    expect(fromQueryId.updateCurrentLocation).toHaveBeenCalledWith(
      '/cube/cube-1?a=1#zone',
      { replace: true },
    );

    const newCube = createNavigator('', '/cube/cube-1');
    showLegendAnalyticsCubeInAddress(newCube.navigator, undefined);
    expect(newCube.updateCurrentLocation).toHaveBeenCalledWith('/', {
      replace: true,
    });

    const encoded = createNavigator('');
    showLegendAnalyticsCubeInAddress(encoded.navigator, 'a/b c');
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
    showLegendAnalyticsCubeInAddress(navigator, 'cube-1');
    expect(updateCurrentLocation).not.toHaveBeenCalled();

    // the root, which reads as '' without its trailing slash
    const root = createNavigator('', '');
    showLegendAnalyticsCubeInAddress(root.navigator, undefined);
    expect(root.updateCurrentLocation).not.toHaveBeenCalled();
  });
});
