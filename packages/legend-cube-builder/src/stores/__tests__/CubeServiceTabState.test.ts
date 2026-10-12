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

import { describe, expect, test } from '@jest/globals';
import {
  MESSAGE_SERVICE_NOT_READABLE,
  Query,
  ServiceSource,
} from '@finos/legend-cube';
import { flowResult } from 'mobx';
import { TEST__createCubeHost } from '../../__test-utils__/CubeTestApplication.js';
import {
  createFakeCubeServiceCatalog,
  FAKE_DESKS_SERVICE,
  FAKE_TRADES_SERVICE,
  type FakeCubeServiceCatalog,
} from '../../__test-utils__/FakeCubeServiceCatalog.js';
import { CUBE_SERVICE_MESSAGE } from '../../__lib__/LegendCubeServiceLabels.js';
import {
  createCubeServiceModel,
  CUBE_SERVICE_MODEL_TYPE,
} from '../../graph-manager/CubeService.js';
import { CubeEditorState } from '../CubeEditorState.js';
import { CubeSourcePickerTabKey } from '../source-picker/CubeSourcePickerTab.js';
import { CUBE_SERVICE_LIST_LIMIT } from '../source-picker/CubeServiceTabState.js';

/** Lets the flows an action started finish */
const settle = async (): Promise<void> => {
  for (let i = 0; i < 5; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
};

const setUp = (
  withCatalog = true,
  services?: Parameters<typeof createFakeCubeServiceCatalog>[0],
): { state: CubeEditorState; registry: FakeCubeServiceCatalog } => {
  const { host } = TEST__createCubeHost();
  const registry = createFakeCubeServiceCatalog(services);
  const state = new CubeEditorState(
    withCatalog ? { ...host, serviceCatalog: registry.catalog } : host,
  );
  return { state, registry };
};

describe('The Service tab', () => {
  test('Is offered, with its palette item, only by a host with a service catalog', () => {
    const offered = (state: CubeEditorState): boolean =>
      state.offeredSources.some(
        (definition) => definition.type === ServiceSource.TYPE,
      );
    const without = setUp(false).state;
    expect(without.sourcePicker.serviceTab.isAvailable).toBe(false);
    expect(without.sourcePicker.tabs.map((tab) => tab.key)).not.toContain(
      CubeSourcePickerTabKey.SERVICE,
    );
    expect(offered(without)).toBe(false);
    const { state } = setUp();
    expect(state.sourcePicker.tabs.map((tab) => tab.key)).toContain(
      CubeSourcePickerTabKey.SERVICE,
    );
    expect(offered(state)).toBe(true);
  });

  test('Opens from its palette item and lists the services once', async () => {
    const { state, registry } = setUp();
    state.addNode(ServiceSource.TYPE);
    expect(state.sourcePicker.isOpen).toBe(true);
    expect(state.sourcePicker.activeTabKey).toBe(
      CubeSourcePickerTabKey.SERVICE,
    );
    await settle();
    const tab = state.sourcePicker.serviceTab;
    expect(tab.services).toEqual([FAKE_DESKS_SERVICE, FAKE_TRADES_SERVICE]);
    state.sourcePicker.close();
    state.sourcePicker.open(CubeSourcePickerTabKey.SERVICE);
    await settle();
    expect(registry.listServices).toHaveBeenCalledTimes(1);
  });

  test('Searches by title, name and pattern, and shows at most its limit', async () => {
    const { state } = setUp();
    state.addNode(ServiceSource.TYPE);
    await settle();
    const tab = state.sourcePicker.serviceTab;
    tab.setSearch('BY DESK');
    expect(tab.shownServices).toEqual([FAKE_TRADES_SERVICE]);
    tab.setSearch('services::desks');
    expect(tab.shownServices).toEqual([FAKE_DESKS_SERVICE]);
    tab.setSearch('/trades/');
    expect(tab.shownServices).toEqual([FAKE_TRADES_SERVICE]);
    tab.setSearch('nothing');
    expect(tab.shownServices).toEqual([]);

    const many = Array.from(
      { length: CUBE_SERVICE_LIST_LIMIT + 5 },
      (_, index) => ({
        ...FAKE_DESKS_SERVICE,
        name: `trading::services::S${index}`,
        pattern: `/s${index}`,
      }),
    );
    const large = setUp(true, many).state;
    large.addNode(ServiceSource.TYPE);
    await settle();
    expect(large.sourcePicker.serviceTab.shownServices).toHaveLength(
      CUBE_SERVICE_LIST_LIMIT,
    );
    expect(large.sourcePicker.serviceTab.matchingServices).toHaveLength(
      CUBE_SERVICE_LIST_LIMIT + 5,
    );
  });

  test("Adds the picked service, invalid since Cube can't read it yet, with a service model and no runtime, in one undo step", async () => {
    const { state } = setUp();
    state.addNode(ServiceSource.TYPE);
    await settle();
    const tab = state.sourcePicker.serviceTab;
    expect(tab.canConfirm).toBe(false);
    tab.selectService('/unknown');
    expect(tab.pattern).toBeUndefined();
    tab.selectService(FAKE_TRADES_SERVICE.pattern);
    expect(tab.canConfirm).toBe(true);
    await flowResult(state.sourcePicker.confirm());
    expect(state.sourcePicker.isOpen).toBe(false);
    const [node] = state.document.query.nodes;
    expect(node).toBeInstanceOf(ServiceSource);
    const service = node as ServiceSource;
    expect(service.pattern).toBe('/trades/byDesk');
    expect(service.service).toBe('trading::services::TradesByDesk');
    expect(service.resolution).toEqual({
      kind: 'failed',
      message: CUBE_SERVICE_MESSAGE.NOT_READABLE,
    });
    expect(state.analysis.validity.get(service.id)).toEqual([
      MESSAGE_SERVICE_NOT_READABLE,
    ]);
    expect(state.document.context).toEqual({
      model: { _type: CUBE_SERVICE_MODEL_TYPE },
    });
    expect(state.canUndo).toBe(true);
    state.undo();
    expect(state.document.query.nodes).toEqual([]);
    expect(state.document.context).toBeUndefined();
  });

  test('Is the only tab of a cube on services, and adds to it', async () => {
    const { state } = setUp();
    state.addNode(ServiceSource.TYPE);
    await settle();
    state.sourcePicker.serviceTab.selectService(FAKE_TRADES_SERVICE.pattern);
    await flowResult(state.sourcePicker.confirm());
    expect(state.sourcePicker.fixedTab?.key).toBe(
      CubeSourcePickerTabKey.SERVICE,
    );
    expect(state.sourcePicker.isTabEnabled(state.sourcePicker.modelTab)).toBe(
      false,
    );
    state.addNode(ServiceSource.TYPE);
    await settle();
    state.sourcePicker.serviceTab.selectService(FAKE_DESKS_SERVICE.pattern);
    await flowResult(state.sourcePicker.confirm());
    expect(
      state.document.query.nodes.map((node) => (node as ServiceSource).pattern),
    ).toEqual(['/trades/byDesk', '/desks']);
  });

  test('Types an opened service, and again on Refresh: still unreadable', async () => {
    const { state } = setUp();
    const saved = new ServiceSource('service101', {
      pattern: FAKE_TRADES_SERVICE.pattern,
      service: FAKE_TRADES_SERVICE.name,
    });
    state.importDocument(
      state.document
        .withContext({ model: createCubeServiceModel() })
        .withQuery(new Query([saved], [], saved.id)),
      false,
    );
    await settle();
    const typed = state.document.query.getNode('service101') as ServiceSource;
    expect(typed.resolution).toEqual({
      kind: 'failed',
      message: CUBE_SERVICE_MESSAGE.NOT_READABLE,
    });
    await flowResult(state.refreshSource('service101'));
    // failing as before, it is left as it is
    expect(state.document.query.getNode('service101')).toBe(typed);
  });

  test('Shows a failed list with a retry, and a cube of tables keeps the tab disabled', async () => {
    const { state, registry } = setUp();
    registry.listServices.mockRejectedValueOnce(
      new Error('The registry is down'),
    );
    state.addNode(ServiceSource.TYPE);
    await settle();
    const tab = state.sourcePicker.serviceTab;
    expect(tab.error).toEqual({ message: 'The registry is down' });
    tab.retry();
    await settle();
    expect(tab.error).toBeUndefined();
    expect(tab.services).toHaveLength(2);

    const tables = setUp().state;
    tables.importDocument(
      tables.document.withContext({
        model: { _type: 'text', code: '' },
        runtime: 'r::R',
      }),
      false,
    );
    expect(
      tables.sourcePicker.isTabEnabled(tables.sourcePicker.serviceTab),
    ).toBe(false);
  });
});
