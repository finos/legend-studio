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

import { test, describe, expect } from '@jest/globals';
import { unitTest } from '@finos/legend-shared/test';
import { TEST__getTestLegendMarketplaceApplicationConfig } from '../__test-utils__/LegendMarketplaceApplicationTestUtils.js';
import { LegendMarketplaceSDLCConfig } from '../LegendMarketplaceApplicationConfig.js';

const CLIENT_NAME = 'test-client';

describe(
  unitTest('LegendMarketplaceApplicationConfig - engine client name'),
  () => {
    test('a configured client name is read as-is', () => {
      expect(
        TEST__getTestLegendMarketplaceApplicationConfig({
          engineClientName: CLIENT_NAME,
        }).engineClientName,
      ).toBe(CLIENT_NAME);
    });

    test('no client name is defaulted when none is configured', () => {
      expect(
        TEST__getTestLegendMarketplaceApplicationConfig().engineClientName,
      ).toBeUndefined();
    });
  },
);

describe(unitTest('LegendMarketplaceApplicationConfig - sdlc'), () => {
  test('sdlc is not configured when the sdlc section is missing', () => {
    expect(
      TEST__getTestLegendMarketplaceApplicationConfig().sdlcConfig,
    ).toBeUndefined();
  });

  test('a configured sdlc section is read as-is', () => {
    const config = TEST__getTestLegendMarketplaceApplicationConfig({
      sdlc: {
        url: 'https://testSdlcUrl/api',
        baseHeaders: { 'x-test-header': 'value' },
        client: 'gitlab',
        useCookieAuthOnly: true,
      },
    });
    expect(config.sdlcConfig).toEqual(
      new LegendMarketplaceSDLCConfig(
        'https://testSdlcUrl/api',
        { 'x-test-header': 'value' },
        'gitlab',
        true,
      ),
    );
  });

  test('a relative sdlc url is resolved against the application origin', () => {
    const config = TEST__getTestLegendMarketplaceApplicationConfig({
      sdlc: { url: '/sdlc/api' },
    });
    expect(config.sdlcConfig?.url).toBe(`${window.location.origin}/sdlc/api`);
    expect(config.sdlcConfig?.useCookieAuthOnly).toBe(false);
  });

  test('an empty sdlc url leaves sdlc unconfigured', () => {
    expect(
      TEST__getTestLegendMarketplaceApplicationConfig({ sdlc: { url: '' } })
        .sdlcConfig,
    ).toBeUndefined();
  });
});

describe(
  unitTest('LegendMarketplaceApplicationConfig - Studio instance'),
  () => {
    test("a project is served by the Studio instance of its id's prefix", () => {
      const config = TEST__getTestLegendMarketplaceApplicationConfig();
      const [instance] = config.studioInstances;

      expect(
        config.getStudioInstanceUrl(`${instance?.sdlcProjectIDPrefix}-1234`),
      ).toBe(instance?.url);
      expect(config.getStudioInstanceUrl('UNKNOWN-1234')).toBeUndefined();
    });
  },
);
