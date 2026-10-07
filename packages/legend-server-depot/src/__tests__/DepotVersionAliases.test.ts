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

import { test, expect } from '@jest/globals';
import { unitTest } from '@finos/legend-shared/test';
import {
  LATEST_VERSION_ALIAS,
  MASTER_SNAPSHOT_ALIAS,
  SNAPSHOT_ALIAS,
  SNAPSHOT_VERSION_ALIAS,
  isSnapshotVersion,
  resolveVersion,
} from '../DepotVersionAliases.js';

test(unitTest('Resolve version alias'), () => {
  // `HEAD` is the only alias the depot server does not understand, so it is
  // the only one translated
  expect(resolveVersion(SNAPSHOT_VERSION_ALIAS)).toEqual(MASTER_SNAPSHOT_ALIAS);
  expect(resolveVersion('HEAD')).toEqual('master-SNAPSHOT');

  // `latest` is a real depot alias and is deliberately passed through untouched
  expect(resolveVersion(LATEST_VERSION_ALIAS)).toEqual('latest');

  // the match is exact and case-sensitive
  expect(resolveVersion('head')).toEqual('head');
  expect(resolveVersion('HEAD-1')).toEqual('HEAD-1');

  // concrete versions are passed through
  expect(resolveVersion('1.0.0')).toEqual('1.0.0');
  expect(resolveVersion(MASTER_SNAPSHOT_ALIAS)).toEqual(MASTER_SNAPSHOT_ALIAS);
  expect(resolveVersion('')).toEqual('');
});

test(unitTest('Detect snapshot version'), () => {
  expect(isSnapshotVersion(MASTER_SNAPSHOT_ALIAS)).toBe(true);
  expect(isSnapshotVersion(SNAPSHOT_ALIAS)).toBe(true);
  expect(isSnapshotVersion('my-branch-SNAPSHOT')).toBe(true);

  expect(isSnapshotVersion('1.0.0')).toBe(false);
  expect(isSnapshotVersion('')).toBe(false);
  // the check is a suffix match, so it is case-sensitive and does not require
  // a separator before the suffix
  expect(isSnapshotVersion('master-snapshot')).toBe(false);
  expect(isSnapshotVersion('SNAPSHOT-1')).toBe(false);
  expect(isSnapshotVersion('NOTASNAPSHOT')).toBe(true);

  // `HEAD` is our alias for a snapshot but is not itself in snapshot form --
  // it must be resolved first
  expect(isSnapshotVersion(SNAPSHOT_VERSION_ALIAS)).toBe(false);
  expect(isSnapshotVersion(resolveVersion(SNAPSHOT_VERSION_ALIAS))).toBe(true);
});
