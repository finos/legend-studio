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
import { ServiceDetail } from '@finos/legend-graph';
import { NetworkClientError } from '@finos/legend-shared';
import {
  V1_CUBE_NO_SERVICE_REGISTRY_MESSAGE,
  V1_LegendCubeServiceCatalog,
} from '../V1_LegendCubeServiceCatalog.js';

const REGISTRY = [
  {
    name: 'trading::services::TradesByDesk',
    title: ' Trades by desk ',
    pattern: '/trades/byDesk',
    documentation: 'Every trade, by desk',
    ownership: { _type: 'userListOwnership', users: ['alice', 'bob'] },
  },
  {
    name: 'trading::services::Desks',
    pattern: '/desks',
    documentation: '',
    ownership: { _type: 'deploymentOwnership', identifier: '1234' },
  },
  {
    name: 'trading::services::Archived',
    title: '',
    pattern: '/archived',
    documentation: '',
    owners: ['carol'],
  },
].map((json) => ServiceDetail.fromJson(json));

describe('The service catalog over the engine registry', () => {
  test('Lists each service by title, else name, with its pattern, documentation and owners', async () => {
    const catalog = new V1_LegendCubeServiceCatalog(async () =>
      Promise.resolve(REGISTRY),
    );
    // by the text the list shows: "Trades by desk" before "trading::…"
    expect(await catalog.listServices()).toEqual([
      {
        name: 'trading::services::TradesByDesk',
        title: 'Trades by desk',
        pattern: '/trades/byDesk',
        documentation: 'Every trade, by desk',
        owners: ['alice', 'bob'],
      },
      {
        name: 'trading::services::Archived',
        title: undefined,
        pattern: '/archived',
        documentation: '',
        owners: ['carol'],
      },
      {
        name: 'trading::services::Desks',
        title: undefined,
        pattern: '/desks',
        documentation: '',
        owners: ['Deployment 1234'],
      },
    ]);
  });

  test('Reads the registry once, and again after a failed read', async () => {
    const read = jest
      .fn<() => Promise<ServiceDetail[]>>()
      .mockRejectedValueOnce(new Error('The registry is down'))
      .mockResolvedValue(REGISTRY);
    const catalog = new V1_LegendCubeServiceCatalog(read);
    await expect(catalog.listServices()).rejects.toThrow(
      'The registry is down',
    );
    expect(await catalog.listServices()).toHaveLength(3);
    expect(await catalog.listServices()).toHaveLength(3);
    expect(read).toHaveBeenCalledTimes(2);
  });

  test('Says so in plain words when the engine has no registry, as the open-source one', async () => {
    const catalog = new V1_LegendCubeServiceCatalog(async () =>
      Promise.reject(
        new NetworkClientError(
          { status: 404, statusText: 'Not Found' } as Response,
          undefined,
        ),
      ),
    );
    await expect(catalog.listServices()).rejects.toThrow(
      V1_CUBE_NO_SERVICE_REGISTRY_MESSAGE,
    );
  });
});
