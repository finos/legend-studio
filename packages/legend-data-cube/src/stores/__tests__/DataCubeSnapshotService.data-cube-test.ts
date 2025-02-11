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

import { createSpy, unitTest } from '@finos/legend-shared/test';
import { expect, test } from '@jest/globals';
import { TEST__DataCubeEngine } from './DataCubeTestUtils.js';
import { DataCubeSettingService } from '../services/DataCubeSettingService.js';
import { DataCubeLogService } from '../services/DataCubeLogService.js';
import { DataCubeLayoutService } from '../services/DataCubeLayoutService.js';
import { DataCubeSnapshotService } from '../services/DataCubeSnapshotService.js';
import { DataCubeSnapshot } from '../core/DataCubeSnapshot.js';
import type { Writable } from '@finos/legend-shared';

test(unitTest(`Snapshot Service: undo/redo works properly`), () => {
  const service = _newService();
  const s1 = _newSnapshot('s1');
  const s2 = _newSnapshot('s2');
  const s3 = _newSnapshot('s3');
  const s4 = _newSnapshot('s4');
  const s5 = _newSnapshot('s5');
  const s6 = _newSnapshot('s6');
  const s7 = _newSnapshot('s7');
  const s8 = _newSnapshot('s8');
  const s9 = _newSnapshot('s9');
  const s10 = _newSnapshot('s10');
  const s11 = _newSnapshot('s11');
  const s12 = _newSnapshot('s12');
  const s13 = _newSnapshot('s13');
  const s14 = _newSnapshot('s14');

  expect(service.canUndo).toBe(false);
  expect(service.canRedo).toBe(false);

  // cannot undo when there is no more than 1 snapshot
  // this snapshot is the initial snapshot and always kept around
  service.broadcastSnapshot(s1);
  _matchCurrentSnapshot(service, s1);
  expect(service.canUndo).toBe(false);
  expect(service.canRedo).toBe(false);

  service.broadcastSnapshot(s2);
  _matchCurrentSnapshot(service, s2);
  expect(service.canUndo).toBe(true);
  expect(service.canRedo).toBe(false);

  service.broadcastSnapshot(s3);
  _matchCurrentSnapshot(service, s3);
  expect(service.canUndo).toBe(true);
  expect(service.canRedo).toBe(false);

  service.broadcastSnapshot(s4);
  _matchCurrentSnapshot(service, s4);
  expect(service.canUndo).toBe(true);
  expect(service.canRedo).toBe(false);

  // check when redo is possible
  service.undo();
  _matchCurrentSnapshot(service, s3);
  expect(service.canUndo).toBe(true);
  expect(service.canRedo).toBe(true);

  service.undo();
  _matchCurrentSnapshot(service, s2);
  expect(service.canUndo).toBe(true);
  expect(service.canRedo).toBe(true);

  service.undo();
  _matchCurrentSnapshot(service, s1);
  expect(service.canUndo).toBe(false);
  expect(service.canRedo).toBe(true);

  // undoing the first snapshot does nothing
  service.undo();
  _matchCurrentSnapshot(service, s1);
  expect(service.canUndo).toBe(false);
  expect(service.canRedo).toBe(true);

  service.redo();
  _matchCurrentSnapshot(service, s2);
  expect(service.canUndo).toBe(true);
  expect(service.canRedo).toBe(true);
  _matchHistory(service, [s1, s2]);
  _matchFullHistory(service, [s1, s2, s3, s4]);

  // when new snapshot is pushed, the redo history is cleared
  service.broadcastSnapshot(s5);
  _matchCurrentSnapshot(service, s5);
  expect(service.canUndo).toBe(true);
  expect(service.canRedo).toBe(false);
  _matchHistory(service, [s1, s2, s5]);
  _matchFullHistory(service, [s1, s2, s5]);

  // when more snapshots are recorded than history size limit, the oldest snapshots are removed
  service.broadcastSnapshot(s6);
  service.broadcastSnapshot(s7);
  service.broadcastSnapshot(s8);
  service.broadcastSnapshot(s9);
  service.broadcastSnapshot(s10);
  service.broadcastSnapshot(s11);
  service.broadcastSnapshot(s12);
  expect(service.canUndo).toBe(true);
  expect(service.canRedo).toBe(false);
  _matchHistory(service, [s1, s2, s5, s6, s7, s8, s9, s10, s11, s12]);

  service.broadcastSnapshot(s13);
  _matchCurrentSnapshot(service, s13);
  expect(service.canUndo).toBe(true);
  expect(service.canRedo).toBe(false);
  _matchHistory(service, [s2, s5, s6, s7, s8, s9, s10, s11, s12, s13]);

  service.broadcastSnapshot(s14);
  _matchCurrentSnapshot(service, s14);
  expect(service.canUndo).toBe(true);
  expect(service.canRedo).toBe(false);
  _matchHistory(service, [s5, s6, s7, s8, s9, s10, s11, s12, s13, s14]);
});

test(
  unitTest(`Snapshot Service: history size adjustment works properly`),
  () => {
    const service = _newService();
    const s1 = _newSnapshot('s1');
    const s2 = _newSnapshot('s2');
    const s3 = _newSnapshot('s3');
    const s4 = _newSnapshot('s4');
    const s5 = _newSnapshot('s5');
    const s6 = _newSnapshot('s6');
    const s7 = _newSnapshot('s7');
    const s8 = _newSnapshot('s8');
    const s9 = _newSnapshot('s9');
    const s10 = _newSnapshot('s10');
    const s11 = _newSnapshot('s11');
    const s12 = _newSnapshot('s12');
    const s13 = _newSnapshot('s13');
    const s14 = _newSnapshot('s14');

    service.broadcastSnapshot(s1);
    service.broadcastSnapshot(s2);
    service.broadcastSnapshot(s3);
    service.broadcastSnapshot(s4);
    service.broadcastSnapshot(s5);
    service.broadcastSnapshot(s6);
    service.broadcastSnapshot(s7);
    service.broadcastSnapshot(s8);
    service.broadcastSnapshot(s9);
    service.broadcastSnapshot(s10);
    _matchCurrentSnapshot(service, s10);
    _matchFullHistory(service, [s1, s2, s3, s4, s5, s6, s7, s8, s9, s10]);

    // cannot adjust history size to less than minimum size (10)
    service.adjustHistorySize(5);
    _matchCurrentSnapshot(service, s10);
    _matchFullHistory(service, [s1, s2, s3, s4, s5, s6, s7, s8, s9, s10]);

    // adjust history size to greater than current size changes nothing
    service.adjustHistorySize(12);
    _matchCurrentSnapshot(service, s10);
    _matchFullHistory(service, [s1, s2, s3, s4, s5, s6, s7, s8, s9, s10]);

    // reducing history size works properly when current snapshot is the latest
    service.broadcastSnapshot(s11);
    service.broadcastSnapshot(s12);
    _matchCurrentSnapshot(service, s12);
    _matchFullHistory(service, [
      s1,
      s2,
      s3,
      s4,
      s5,
      s6,
      s7,
      s8,
      s9,
      s10,
      s11,
      s12,
    ]);

    service.adjustHistorySize(10);
    _matchCurrentSnapshot(service, s12);
    _matchFullHistory(service, [s3, s4, s5, s6, s7, s8, s9, s10, s11, s12]);

    // reducing history size works properly when current snapshot is not the latest
    service.adjustHistorySize(12);
    service.broadcastSnapshot(s13);
    service.broadcastSnapshot(s14);
    _matchCurrentSnapshot(service, s14);
    _matchFullHistory(service, [
      s3,
      s4,
      s5,
      s6,
      s7,
      s8,
      s9,
      s10,
      s11,
      s12,
      s13,
      s14,
    ]);

    service.undo();
    service.undo();
    service.undo();
    service.undo();
    _matchCurrentSnapshot(service, s10);
    _matchFullHistory(service, [
      s3,
      s4,
      s5,
      s6,
      s7,
      s8,
      s9,
      s10,
      s11,
      s12,
      s13,
      s14,
    ]);

    service.adjustHistorySize(10);
    _matchCurrentSnapshot(service, s10);
    // redo snapshots are properly pruned
    _matchFullHistory(service, [s3, s4, s5, s6, s7, s8, s9, s10]);
  },
);

function _newService() {
  const engine = new TEST__DataCubeEngine();
  const logService = new DataCubeLogService(engine);
  const layoutService = new DataCubeLayoutService();
  const settingService = new DataCubeSettingService(
    engine,
    logService,
    layoutService,
  );
  createSpy(settingService, 'getNumericValue').mockImplementationOnce(() => 10);
  return new DataCubeSnapshotService(logService, settingService);
}

function _newSnapshot(id: string) {
  const snapshot = DataCubeSnapshot.create({});
  (snapshot as Writable<DataCubeSnapshot>).uuid = id;
  snapshot.finalize();
  return snapshot;
}

function _matchCurrentSnapshot(
  service: DataCubeSnapshotService,
  snapshot: DataCubeSnapshot,
) {
  expect(service.getCurrentSnapshot().uuid).toBe(snapshot.uuid);
}

function _matchHistory(
  service: DataCubeSnapshotService,
  history: DataCubeSnapshot[],
) {
  expect(service.getHistory().map((s) => s.uuid)).toEqual(
    history.map((s) => s.uuid),
  );
}

function _matchFullHistory(
  service: DataCubeSnapshotService,
  history: DataCubeSnapshot[],
) {
  expect(service.getHistory({ full: true }).map((s) => s.uuid)).toEqual(
    history.map((s) => s.uuid),
  );
}
