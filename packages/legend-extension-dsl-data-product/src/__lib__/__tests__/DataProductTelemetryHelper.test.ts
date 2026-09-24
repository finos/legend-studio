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

import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import type { TelemetryService } from '@finos/legend-application';
import { guaranteeNonNullable } from '@finos/legend-shared';
import {
  DATA_PRODUCT_EVENT,
  DataProductTelemetryHelper,
  TELEMETRY_EVENT_STATUS,
} from '../DataProductTelemetryHelper.js';

type LoggedCall = { event: string; data: Record<string, unknown> };

const getLoggedCall = (calls: LoggedCall[], index = 0): LoggedCall =>
  guaranteeNonNullable(
    calls[index],
    `Expected a logged telemetry call at index ${index}`,
  );

const buildTelemetryStub = (): {
  service: TelemetryService;
  calls: LoggedCall[];
} => {
  const calls: LoggedCall[] = [];
  const service = {
    logEvent: jest.fn((event: string, data: unknown) => {
      calls.push({ event, data: data as Record<string, unknown> });
    }),
  } as unknown as TelemetryService;
  return { service, calls };
};

beforeEach(() => {
  localStorage.clear();
});

describe('logEvent_requestContract', () => {
  test('logs success status with the data product and access point group', () => {
    const { service, calls } = buildTelemetryStub();

    DataProductTelemetryHelper.logEvent_requestContract(
      service,
      'my-data-product',
      'my-apg',
    );

    expect(getLoggedCall(calls).event).toBe(
      DATA_PRODUCT_EVENT.REQUEST_DATA_CONTRACT,
    );
    const payload = getLoggedCall(calls).data;
    expect(payload).toMatchObject({
      dataProduct: 'my-data-product',
      accessPointGroup: 'my-apg',
      status: TELEMETRY_EVENT_STATUS.SUCCESS,
    });
    expect(payload.groupId).toBeUndefined();
  });

  test('includes SDLC origin coordinates when provided', () => {
    const { service, calls } = buildTelemetryStub();

    DataProductTelemetryHelper.logEvent_requestContract(
      service,
      'my-data-product',
      'my-apg',
      { groupId: 'com.example', artifactId: 'my-artifact', versionId: '1.0.0' },
    );

    const payload = getLoggedCall(calls).data;
    expect(payload).toMatchObject({
      dataProduct: 'my-data-product',
      accessPointGroup: 'my-apg',
      groupId: 'com.example',
      artifactId: 'my-artifact',
      versionId: '1.0.0',
    });
  });
});

describe('logEvent_OpenSubscriptionsModal', () => {
  test('logs the data product and access point group', () => {
    const { service, calls } = buildTelemetryStub();

    DataProductTelemetryHelper.logEvent_OpenSubscriptionsModal(
      service,
      'my-data-product',
      'my-apg',
    );

    expect(getLoggedCall(calls).event).toBe(
      DATA_PRODUCT_EVENT.OPEN_SUBSCRIPTIONS_MODAL,
    );
    const payload = getLoggedCall(calls).data;
    expect(payload).toMatchObject({
      dataProduct: 'my-data-product',
      accessPointGroup: 'my-apg',
    });
  });
});

describe('logEvent_OpenCreateSubscriptionDialog', () => {
  test('logs the data product and access point group', () => {
    const { service, calls } = buildTelemetryStub();

    DataProductTelemetryHelper.logEvent_OpenCreateSubscriptionDialog(
      service,
      'my-data-product',
      'my-apg',
    );

    expect(getLoggedCall(calls).event).toBe(
      DATA_PRODUCT_EVENT.OPEN_CREATE_SUBSCRIPTION_DIALOG,
    );
    const payload = getLoggedCall(calls).data;
    expect(payload).toMatchObject({
      dataProduct: 'my-data-product',
      accessPointGroup: 'my-apg',
    });
  });
});

describe('logEvent_ChangeContractConsumerType', () => {
  test('logs the selected consumer type with data product context', () => {
    const { service, calls } = buildTelemetryStub();

    DataProductTelemetryHelper.logEvent_ChangeContractConsumerType(
      service,
      'Person',
      'my-data-product',
      'my-apg',
    );

    expect(getLoggedCall(calls).event).toBe(
      DATA_PRODUCT_EVENT.CHANGE_CONTRACT_CONSUMER_TYPE,
    );
    const payload = getLoggedCall(calls).data;
    expect(payload).toMatchObject({
      consumerType: 'Person',
      dataProduct: 'my-data-product',
      accessPointGroup: 'my-apg',
    });
  });
});

describe('logEvent_EscalateDataAccessRequest', () => {
  test('logs success status when no error is provided', () => {
    const { service, calls } = buildTelemetryStub();

    DataProductTelemetryHelper.logEvent_EscalateDataAccessRequest(
      service,
      'my-data-product',
      'my-apg',
      undefined,
    );

    expect(getLoggedCall(calls).event).toBe(
      DATA_PRODUCT_EVENT.ESCALATE_DATA_ACCESS_REQUEST,
    );
    const payload = getLoggedCall(calls).data;
    expect(payload).toMatchObject({
      dataProduct: 'my-data-product',
      accessPointGroup: 'my-apg',
      status: TELEMETRY_EVENT_STATUS.SUCCESS,
    });
    expect(payload.error).toBeUndefined();
  });

  test('logs failure status with error message when an error is provided', () => {
    const { service, calls } = buildTelemetryStub();

    DataProductTelemetryHelper.logEvent_EscalateDataAccessRequest(
      service,
      'my-data-product',
      undefined,
      'escalation failed',
    );

    const payload = getLoggedCall(calls).data;
    expect(payload).toMatchObject({
      dataProduct: 'my-data-product',
      accessPointGroup: undefined,
      status: TELEMETRY_EVENT_STATUS.FAILURE,
      error: 'escalation failed',
    });
  });
});

describe('logEvent_InvalidateDataAccessRequest', () => {
  test('logs success status when no error is provided', () => {
    const { service, calls } = buildTelemetryStub();

    DataProductTelemetryHelper.logEvent_InvalidateDataAccessRequest(
      service,
      'my-data-product',
      'my-apg',
      undefined,
    );

    expect(getLoggedCall(calls).event).toBe(
      DATA_PRODUCT_EVENT.INVALIDATE_DATA_ACCESS_REQUEST,
    );
    const payload = getLoggedCall(calls).data;
    expect(payload).toMatchObject({
      dataProduct: 'my-data-product',
      accessPointGroup: 'my-apg',
      status: TELEMETRY_EVENT_STATUS.SUCCESS,
    });
  });

  test('logs failure status with error message when an error is provided', () => {
    const { service, calls } = buildTelemetryStub();

    DataProductTelemetryHelper.logEvent_InvalidateDataAccessRequest(
      service,
      'my-data-product',
      'my-apg',
      'close failed',
    );

    const payload = getLoggedCall(calls).data;
    expect(payload).toMatchObject({
      status: TELEMETRY_EVENT_STATUS.FAILURE,
      error: 'close failed',
    });
  });
});

describe('logEvent_RefreshDataAccessRequest', () => {
  test('logs the data product and access point group', () => {
    const { service, calls } = buildTelemetryStub();

    DataProductTelemetryHelper.logEvent_RefreshDataAccessRequest(
      service,
      'my-data-product',
      'my-apg',
    );

    expect(getLoggedCall(calls).event).toBe(
      DATA_PRODUCT_EVENT.REFRESH_DATA_ACCESS_REQUEST,
    );
    const payload = getLoggedCall(calls).data;
    expect(payload).toMatchObject({
      dataProduct: 'my-data-product',
      accessPointGroup: 'my-apg',
    });
  });
});

describe('logEvent_CopyDataAccessRequestField', () => {
  test('logs the copied field name along with data product context', () => {
    const { service, calls } = buildTelemetryStub();

    DataProductTelemetryHelper.logEvent_CopyDataAccessRequestField(
      service,
      'Task Link',
      'my-data-product',
      'my-apg',
    );

    expect(getLoggedCall(calls).event).toBe(
      DATA_PRODUCT_EVENT.COPY_DATA_ACCESS_REQUEST_FIELD,
    );
    const payload = getLoggedCall(calls).data;
    expect(payload).toMatchObject({
      field: 'Task Link',
      dataProduct: 'my-data-product',
      accessPointGroup: 'my-apg',
    });
  });

  test('logs without data product context when unavailable', () => {
    const { service, calls } = buildTelemetryStub();

    DataProductTelemetryHelper.logEvent_CopyDataAccessRequestField(
      service,
      'Missing Ingest Item',
      undefined,
      undefined,
    );

    const payload = getLoggedCall(calls).data;
    expect(payload).toMatchObject({
      field: 'Missing Ingest Item',
      dataProduct: undefined,
      accessPointGroup: undefined,
    });
  });
});
