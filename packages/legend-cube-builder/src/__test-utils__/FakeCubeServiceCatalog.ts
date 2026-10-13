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

import { jest } from '@jest/globals';
import type {
  CubeServiceCatalog,
  CubeServiceSummary,
} from '../graph-manager/CubeServiceCatalog.js';

// A fake of the engine's service registry, for the Service tab's and the
// editor's tests: two trading services, one without a title

export const FAKE_TRADES_SERVICE: CubeServiceSummary = {
  name: 'trading::services::TradesByDesk',
  title: 'Trades by desk',
  pattern: '/trades/byDesk',
  documentation: 'Every trade, by desk',
  owners: ['alice', 'bob'],
};

export const FAKE_DESKS_SERVICE: CubeServiceSummary = {
  name: 'trading::services::Desks',
  pattern: '/desks',
  documentation: '',
  owners: ['Deployment 1234'],
};

export interface FakeCubeServiceCatalog {
  readonly catalog: CubeServiceCatalog;
  readonly listServices: jest.Mock<CubeServiceCatalog['listServices']>;
}

/** A fresh fake: build one per test, since jest.fn keeps its calls across tests */
export const createFakeCubeServiceCatalog = (
  services: readonly CubeServiceSummary[] = [
    FAKE_DESKS_SERVICE,
    FAKE_TRADES_SERVICE,
  ],
): FakeCubeServiceCatalog => {
  const listServices = jest.fn<CubeServiceCatalog['listServices']>(async () =>
    Promise.resolve(services),
  );
  return { catalog: { listServices }, listServices };
};
