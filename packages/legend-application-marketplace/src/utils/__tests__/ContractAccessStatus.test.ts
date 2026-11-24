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
import { deserialize } from 'serializr';
import type { PlainObject } from '@finos/legend-shared';
import {
  buildAccessStatusErrorLayer,
  ContractAccessStatus,
  ContractSyncStatusResponse,
  ContractSyncStatusResponseModelSchema,
  deriveContractAccessStatus,
} from '../EntitlementsUtils.js';

// What the endpoint returns: the lists that are empty are left out
const SUBSCRIPTION = {
  guid: 'sub-1',
  dataContractId: 'contract-1',
  target: { _type: 'Snowflake', snowflakeAccountId: 'TEST_SNOWFLAKE_ACCOUNT' },
};

const toResponse = (json: PlainObject): ContractSyncStatusResponse =>
  deserialize(ContractSyncStatusResponseModelSchema, json);

describe('ContractSyncStatusResponse', () => {
  test('is built from the response of the endpoint, with the lists that are left out empty', () => {
    const response = toResponse({
      status: 'FULLY_SYNCED',
      contractId: 'contract-1',
      syncedAccessPoints: [{ accessPointName: 'AP1', lastSynced: 'x' }],
    });

    expect(response).toBeInstanceOf(ContractSyncStatusResponse);
    expect(response.status).toBe('FULLY_SYNCED');
    expect(response.subscriptions).toEqual([]);
    expect(response.syncFailures).toEqual([]);
    expect(response.unsyncedUsers).toEqual([]);
    expect(response.unsyncedAccessPoints).toEqual([]);
    expect(response.unsyncedTargetAccounts).toEqual([]);
  });

  test('reads the subscriptions, failures and unsynced entities', () => {
    const response = toResponse({
      status: 'NOT_FULLY_SYNCED',
      subscriptions: [SUBSCRIPTION],
      syncFailures: [{ sqlStatement: 'GRANT ...', exception: 'boom' }],
      unsyncedUsers: [{ username: 'USER1', targetAccount: 'x' }],
      unsyncedAccessPoints: [{ accessPointName: 'AP1' }],
      unsyncedTargetAccounts: ['test_snowflake_account'],
    });

    expect(response.subscriptions.map((s) => s.guid)).toEqual(['sub-1']);
    expect(response.syncFailures[0]?.exception).toBe('boom');
    expect(response.unsyncedUsers.map((u) => u.username)).toEqual(['USER1']);
    expect(response.unsyncedAccessPoints.map((a) => a.accessPointName)).toEqual(
      ['AP1'],
    );
    expect(response.unsyncedTargetAccounts).toEqual(['test_snowflake_account']);
  });
});

describe('deriveContractAccessStatus', () => {
  test('FULLY_SYNCED is Active', () => {
    expect(
      deriveContractAccessStatus(
        toResponse({ status: 'FULLY_SYNCED', subscriptions: [SUBSCRIPTION] }),
      ),
    ).toEqual({ status: ContractAccessStatus.ACTIVE });
  });

  test('the status text is matched case-insensitively', () => {
    expect(
      deriveContractAccessStatus(toResponse({ status: 'fully_synced' })).status,
    ).toBe(ContractAccessStatus.ACTIVE);
  });

  test('NEVER_SYNCED with a subscription and no failures is Setting up', () => {
    const detail = deriveContractAccessStatus(
      toResponse({ status: 'NEVER_SYNCED', subscriptions: [SUBSCRIPTION] }),
    );
    expect(detail.status).toBe(ContractAccessStatus.SETTING_UP);
  });

  test('NOT_FULLY_SYNCED with a subscription and no failures is Setting up and says what is pending', () => {
    const detail = deriveContractAccessStatus(
      toResponse({
        status: 'NOT_FULLY_SYNCED',
        subscriptions: [SUBSCRIPTION],
        unsyncedUsers: [{ username: 'USER1' }, { username: 'USER2' }],
        unsyncedAccessPoints: [{ accessPointName: 'AP1' }],
        unsyncedTargetAccounts: ['test_snowflake_account'],
      }),
    );
    expect(detail.status).toBe(ContractAccessStatus.SETTING_UP);
    expect(detail.reason).toContain('2 users');
    expect(detail.reason).toContain('1 access point');
    expect(detail.reason).toContain('1 target account');
  });

  test('not fully synced with sync failures is Needs attention', () => {
    const detail = deriveContractAccessStatus(
      toResponse({
        status: 'NOT_FULLY_SYNCED',
        subscriptions: [SUBSCRIPTION],
        syncFailures: [{ sqlStatement: 'GRANT ...', exception: 'boom' }],
      }),
    );
    expect(detail.status).toBe(ContractAccessStatus.NEEDS_ATTENTION);
    expect(detail.reason).toContain('1 sync failure');
  });

  test.each(['NEVER_SYNCED', 'NOT_FULLY_SYNCED'])(
    '%s with no subscription Needs attention',
    (status) => {
      const detail = deriveContractAccessStatus(toResponse({ status }));
      expect(detail.status).toBe(ContractAccessStatus.NEEDS_ATTENTION);
      expect(detail.reason).toContain('no subscription');
    },
  );

  test('a missing subscription never turns a FULLY_SYNCED contract into an alert', () => {
    expect(
      deriveContractAccessStatus(toResponse({ status: 'FULLY_SYNCED' })).status,
    ).toBe(ContractAccessStatus.ACTIVE);
  });

  test('no response is Not checked, never Active', () => {
    expect(deriveContractAccessStatus(undefined).status).toBe(
      ContractAccessStatus.NOT_CHECKED,
    );
  });

  test('an unknown status is Not checked, never Active', () => {
    expect(
      deriveContractAccessStatus(toResponse({ status: 'SOMETHING_NEW' }))
        .status,
    ).toBe(ContractAccessStatus.NOT_CHECKED);
  });
});

describe('buildAccessStatusErrorLayer', () => {
  test.each([
    [ContractAccessStatus.SETTING_UP, 'Approved. Waiting for access.'],
    [ContractAccessStatus.NEEDS_ATTENTION, 'No subscription.'],
  ])('%s is explained by its reason', (status, reason) => {
    expect(buildAccessStatusErrorLayer({ status, reason })).toEqual({
      title: reason,
    });
  });

  test('falls back to the status when there is no reason', () => {
    expect(
      buildAccessStatusErrorLayer({ status: ContractAccessStatus.SETTING_UP }),
    ).toEqual({ title: ContractAccessStatus.SETTING_UP });
  });

  test.each([ContractAccessStatus.ACTIVE, ContractAccessStatus.NOT_CHECKED])(
    '%s is not an error to show',
    (status) => {
      expect(buildAccessStatusErrorLayer({ status })).toBeUndefined();
    },
  );
});
