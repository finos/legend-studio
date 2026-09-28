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

import {
  describe,
  test,
  expect,
  jest,
  beforeEach,
  afterEach,
} from '@jest/globals';
import { TabState } from '@finos/legend-lego/application';
import {
  EDITOR_TAB_CLOSE_TRIGGER,
  EDITOR_TAB_KIND,
  EDITOR_TAB_OPEN_TRIGGER,
  LegendStudioTelemetryHelper,
} from '../../../__lib__/LegendStudioTelemetryHelper.js';
import { TEST__getTestEditorStore } from '../__test-utils__/EditorStoreTestUtils.js';
import type { EditorTabManagerState } from '../EditorTabManagerState.js';

/**
 * Lightweight `TabState` used to drive the manager without pulling any
 * real editor state (which requires a live graph). This is enough for
 * `getEditorTabTelemetryData` to route through the `OTHER` bucket, which
 * keeps this test focused on the manager's wiring rather than the
 * classifier (covered separately in `EditorTabTelemetryHelper.test.ts`).
 */
class FakeTab extends TabState {
  constructor(private readonly _label: string) {
    super();
  }
  override get label(): string {
    return this._label;
  }
}

type OpenCall = Parameters<
  typeof LegendStudioTelemetryHelper.logEvent_EditorTabOpened
>;
type CloseCall = Parameters<
  typeof LegendStudioTelemetryHelper.logEvent_EditorTabClosed
>;

const setup = (): {
  manager: EditorTabManagerState;
  openSpy: jest.SpiedFunction<
    typeof LegendStudioTelemetryHelper.logEvent_EditorTabOpened
  >;
  closeSpy: jest.SpiedFunction<
    typeof LegendStudioTelemetryHelper.logEvent_EditorTabClosed
  >;
  openCalls: () => OpenCall[];
  closeCalls: () => CloseCall[];
} => {
  const editorStore = TEST__getTestEditorStore();
  const openSpy = jest
    .spyOn(LegendStudioTelemetryHelper, 'logEvent_EditorTabOpened')
    .mockImplementation(() => {});
  const closeSpy = jest
    .spyOn(LegendStudioTelemetryHelper, 'logEvent_EditorTabClosed')
    .mockImplementation(() => {});
  return {
    manager: editorStore.tabManagerState,
    openSpy,
    closeSpy,
    openCalls: () => openSpy.mock.calls,
    closeCalls: () => closeSpy.mock.calls,
  };
};

describe('EditorTabManagerState telemetry wiring', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: 1_000_000 });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  test('openTab emits EDITOR_TAB__OPEN once per tab, even when reopened', () => {
    const { manager, openSpy, openCalls } = setup();
    const tab = new FakeTab('t1');

    manager.openTab(tab);
    expect(openSpy).toHaveBeenCalledTimes(1);
    expect(openCalls()[0]?.[2]).toMatchObject({
      tabKind: EDITOR_TAB_KIND.OTHER,
      trigger: EDITOR_TAB_OPEN_TRIGGER.PROGRAMMATIC,
    });

    // Reopening the same tab is a focus, not a new open.
    manager.openTab(tab);
    expect(openSpy).toHaveBeenCalledTimes(1);
  });

  test('closing a tab emits EDITOR_TAB__CLOSE with accumulated focus dwell', () => {
    const { manager, closeSpy, closeCalls } = setup();
    const tab = new FakeTab('t1');

    manager.openTab(tab); // starts dwell at now
    jest.advanceTimersByTime(5_000);
    manager.closeTab(tab);

    expect(closeSpy).toHaveBeenCalledTimes(1);
    const payload = closeCalls()[0]?.[2];
    expect(payload).toMatchObject({
      tabKind: EDITOR_TAB_KIND.OTHER,
      dwellMs: 5_000,
      trigger: EDITOR_TAB_CLOSE_TRIGGER.USER_CLOSE,
    });
  });

  test('dwell counts only focused time across tab switches', () => {
    const { manager, closeCalls } = setup();
    const tabA = new FakeTab('A');
    const tabB = new FakeTab('B');

    manager.openTab(tabA); // A becomes current
    jest.advanceTimersByTime(3_000); // A focused 3s
    manager.openTab(tabB); // A pauses, B becomes current
    jest.advanceTimersByTime(4_000); // B focused 4s, A idle
    manager.setCurrentTab(tabA); // A resumes
    jest.advanceTimersByTime(2_000); // A focused +2s (total 5s)

    manager.closeTab(tabA);
    manager.closeTab(tabB);

    const [aClose, bClose] = closeCalls();
    expect(aClose?.[2]).toMatchObject({ dwellMs: 5_000 });
    expect(bClose?.[2]).toMatchObject({ dwellMs: 4_000 });
  });

  test('closeAllOtherTabs emits CLOSE_OTHERS only for the other tabs', () => {
    const { manager, closeSpy, closeCalls } = setup();
    const tabA = new FakeTab('A');
    const tabB = new FakeTab('B');
    const tabC = new FakeTab('C');
    manager.openTab(tabA);
    manager.openTab(tabB);
    manager.openTab(tabC);

    manager.closeAllOtherTabs(tabB);

    expect(closeSpy).toHaveBeenCalledTimes(2);
    for (const [, , payload] of closeCalls()) {
      expect(payload.trigger).toBe(EDITOR_TAB_CLOSE_TRIGGER.CLOSE_OTHERS);
    }
    expect(manager.tabs).toEqual([tabB]);
  });

  test('closeAllTabs emits CLOSE_ALL and skips pinned tabs', () => {
    const { manager, closeSpy, closeCalls } = setup();
    const pinned = new FakeTab('pinned');
    const unpinned = new FakeTab('unpinned');
    manager.openTab(pinned);
    manager.openTab(unpinned);
    manager.pinTab(pinned);

    manager.closeAllTabs();

    expect(closeSpy).toHaveBeenCalledTimes(1);
    expect(closeCalls()[0]?.[2]).toMatchObject({
      trigger: EDITOR_TAB_CLOSE_TRIGGER.CLOSE_ALL,
    });
    expect(manager.tabs).toEqual([pinned]);
  });

  test('closeTab on a pinned tab is a no-op and does not emit CLOSE', () => {
    const { manager, closeSpy } = setup();
    const tab = new FakeTab('t');
    manager.openTab(tab);
    manager.pinTab(tab);

    manager.closeTab(tab);

    expect(closeSpy).not.toHaveBeenCalled();
    expect(manager.tabs).toEqual([tab]);
  });
});
