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

import type { TelemetryService } from '@finos/legend-application';
import type { V1_EntitlementsLakehouseEnvironmentType } from '@finos/legend-graph';

export enum DATA_PRODUCT_EVENT {
  REQUEST_DATA_CONTRACT = 'marketplace.request.data.contract',
  OPEN_INTEGRATED_PRODUCT = 'marketplace.open.integrated.product',
  ESCALATE_DATA_ACCESS_REQUEST = 'marketplace.escalate.data-access-request',
  INVALIDATE_DATA_ACCESS_REQUEST = 'marketplace.invalidate.data-access-request',
  REFRESH_DATA_ACCESS_REQUEST = 'marketplace.refresh.data-access-request',
  COPY_DATA_ACCESS_REQUEST_FIELD = 'marketplace.copy.data-access-request-field',
  OPEN_SUBSCRIPTIONS_MODAL = 'marketplace.open.subscriptions-modal',
  OPEN_CREATE_SUBSCRIPTION_DIALOG = 'marketplace.open.create-subscription-dialog',
  CHANGE_CONTRACT_CONSUMER_TYPE = 'marketplace.change.contract-consumer-type',
}

export enum PRODUCT_INTEGRATION_TYPE {
  DATA_CUBE = 'dataCube',
  LEGEND_QUERY = 'legendQuery',
  POWER_BI = 'powerBI',
  REGISTRY_LINEAGE = 'registryLineage',
  REGISTRY_GOVERNANCE = 'registryGovernance',
  SQL = 'sql',
}

export enum DATAPRODUCT_TYPE {
  ADHOC = 'adhoc',
  SDLC = 'sdlc',
}

export enum TELEMETRY_EVENT_STATUS {
  SUCCESS = 'success',
  FAILURE = 'failure',
}

type MarketplaceDataProductOrigin_TelemetryData = {
  type: DATAPRODUCT_TYPE;
  groupId?: string | undefined;
  artifactId?: string | undefined;
  versionId?: string | undefined;
};

type MarketplaceDataProduct_TelemetryData = {
  origin?: MarketplaceDataProductOrigin_TelemetryData | undefined;
  dataProductId?: string | undefined;
  deploymentId?: number | undefined;
  path?: string | undefined;
  name?: string | undefined;
  environmentClassification?:
    | V1_EntitlementsLakehouseEnvironmentType
    | undefined;
};

type MarketPlaceDataProductIntegration_TelemetryData =
  MarketplaceDataProduct_TelemetryData & {
    productIntegrationType?: PRODUCT_INTEGRATION_TYPE | string | undefined;
    accessPointGroup?: string | undefined;
    accessPointPath?: string | undefined;
  };

export type MarketplaceUserSession = {
  eventId: number;
  searchSessionId: string | undefined;
};

export const SEARCH_SESSION_KEY = 'marketplace_user_session';

export class DataProductTelemetryHelper {
  private static getOrCreateUserSession(): MarketplaceUserSession {
    const stored = localStorage.getItem(SEARCH_SESSION_KEY);

    if (stored) {
      const session = JSON.parse(stored) as MarketplaceUserSession;
      return session;
    } else {
      const initialSession: MarketplaceUserSession = {
        eventId: 0,
        searchSessionId: undefined,
      };
      localStorage.setItem(SEARCH_SESSION_KEY, JSON.stringify(initialSession));
      return initialSession;
    }
  }

  private static updateEventId() {
    const currentSession = this.getOrCreateUserSession();
    const updatedSession: MarketplaceUserSession = {
      ...currentSession,
      eventId: currentSession.eventId + 1,
    };

    localStorage.setItem(SEARCH_SESSION_KEY, JSON.stringify(updatedSession));
    return updatedSession;
  }

  static logEvent_requestContract(
    telemetryService: TelemetryService,
    dataProduct: string,
    accessPointGroup: string,
    origin?:
      | {
          groupId?: string | undefined;
          artifactId?: string | undefined;
          versionId?: string | undefined;
        }
      | undefined,
  ): void {
    this.updateEventId();
    const session = this.getOrCreateUserSession();
    telemetryService.logEvent(DATA_PRODUCT_EVENT.REQUEST_DATA_CONTRACT, {
      status: TELEMETRY_EVENT_STATUS.SUCCESS,
      dataProduct: dataProduct,
      accessPointGroup: accessPointGroup,
      ...origin,
      ...session,
    });
  }

  static logEvent_OpenIntegratedProduct(
    telemetryService: TelemetryService,
    intTelemetryData: MarketPlaceDataProductIntegration_TelemetryData,
    error: string | undefined,
  ): void {
    this.updateEventId();
    const session = this.getOrCreateUserSession();
    const telemetryData =
      error === undefined
        ? {
            ...intTelemetryData,
            status: TELEMETRY_EVENT_STATUS.SUCCESS,
            ...session,
          }
        : {
            ...intTelemetryData,
            status: TELEMETRY_EVENT_STATUS.FAILURE,
            error: error,
            ...session,
          };
    telemetryService.logEvent(
      DATA_PRODUCT_EVENT.OPEN_INTEGRATED_PRODUCT,
      telemetryData,
    );
  }

  static logEvent_EscalateDataAccessRequest(
    telemetryService: TelemetryService,
    dataProduct: string,
    accessPointGroup: string | undefined,
    error: string | undefined,
  ): void {
    this.updateEventId();
    const session = this.getOrCreateUserSession();
    const telemetryData =
      error === undefined
        ? {
            dataProduct,
            accessPointGroup,
            status: TELEMETRY_EVENT_STATUS.SUCCESS,
            ...session,
          }
        : {
            dataProduct,
            accessPointGroup,
            status: TELEMETRY_EVENT_STATUS.FAILURE,
            error,
            ...session,
          };
    telemetryService.logEvent(
      DATA_PRODUCT_EVENT.ESCALATE_DATA_ACCESS_REQUEST,
      telemetryData,
    );
  }

  static logEvent_InvalidateDataAccessRequest(
    telemetryService: TelemetryService,
    dataProduct: string,
    accessPointGroup: string | undefined,
    error: string | undefined,
  ): void {
    this.updateEventId();
    const session = this.getOrCreateUserSession();
    const telemetryData =
      error === undefined
        ? {
            dataProduct,
            accessPointGroup,
            status: TELEMETRY_EVENT_STATUS.SUCCESS,
            ...session,
          }
        : {
            dataProduct,
            accessPointGroup,
            status: TELEMETRY_EVENT_STATUS.FAILURE,
            error,
            ...session,
          };
    telemetryService.logEvent(
      DATA_PRODUCT_EVENT.INVALIDATE_DATA_ACCESS_REQUEST,
      telemetryData,
    );
  }

  static logEvent_RefreshDataAccessRequest(
    telemetryService: TelemetryService,
    dataProduct: string,
    accessPointGroup: string | undefined,
  ): void {
    this.updateEventId();
    const session = this.getOrCreateUserSession();
    telemetryService.logEvent(DATA_PRODUCT_EVENT.REFRESH_DATA_ACCESS_REQUEST, {
      dataProduct,
      accessPointGroup,
      ...session,
    });
  }

  static logEvent_CopyDataAccessRequestField(
    telemetryService: TelemetryService,
    field: string,
    dataProduct: string | undefined,
    accessPointGroup: string | undefined,
  ): void {
    this.updateEventId();
    const session = this.getOrCreateUserSession();
    telemetryService.logEvent(
      DATA_PRODUCT_EVENT.COPY_DATA_ACCESS_REQUEST_FIELD,
      {
        field,
        dataProduct,
        accessPointGroup,
        ...session,
      },
    );
  }

  static logEvent_OpenSubscriptionsModal(
    telemetryService: TelemetryService,
    dataProduct: string,
    accessPointGroup: string,
  ): void {
    this.updateEventId();
    const session = this.getOrCreateUserSession();
    telemetryService.logEvent(DATA_PRODUCT_EVENT.OPEN_SUBSCRIPTIONS_MODAL, {
      dataProduct,
      accessPointGroup,
      ...session,
    });
  }

  static logEvent_OpenCreateSubscriptionDialog(
    telemetryService: TelemetryService,
    dataProduct: string,
    accessPointGroup: string,
  ): void {
    this.updateEventId();
    const session = this.getOrCreateUserSession();
    telemetryService.logEvent(
      DATA_PRODUCT_EVENT.OPEN_CREATE_SUBSCRIPTION_DIALOG,
      {
        dataProduct,
        accessPointGroup,
        ...session,
      },
    );
  }

  static logEvent_ChangeContractConsumerType(
    telemetryService: TelemetryService,
    consumerType: string,
    dataProduct: string,
    accessPointGroup: string,
  ): void {
    this.updateEventId();
    const session = this.getOrCreateUserSession();
    telemetryService.logEvent(
      DATA_PRODUCT_EVENT.CHANGE_CONTRACT_CONSUMER_TYPE,
      {
        consumerType,
        dataProduct,
        accessPointGroup,
        ...session,
      },
    );
  }
}
