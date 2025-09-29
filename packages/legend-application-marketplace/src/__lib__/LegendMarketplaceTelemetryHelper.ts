/**
 * Copyright (c) 2025-present, Goldman Sachs
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
import {
  type V1_LiteDataContract,
  V1_ResourceType,
  type V1_ContractUserEventRecord,
  type V1_EntitlementsLakehouseEnvironmentType,
} from '@finos/legend-graph';
import type { LegacyDataProductCardState } from '../stores/lakehouse/dataProducts/LegacyDataProductCardState.js';
import { LEGEND_MARKETPLACE_APP_EVENT } from './LegendMarketplaceAppEvent.js';

export enum LEGEND_MARKETPLACE_PAGE {
  HOME_PAGE = 'Home Page',
  SEARCH_RESULTS_PAGE = 'Search Results Page',
}

export enum MARKETPLACE_EVENT_STATUS {
  SUCCESS = 'success',
  FAILURE = 'failure',
}

export enum DATAPRODUCT_TYPE {
  ADHOC = 'adhoc',
  SDLC = 'sdlc',
}

export enum CONTRACT_ACTION {
  APPROVED = 'approved',
  DENIED = 'denied',
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

export class LegendMarketplaceTelemetryHelper {
  static logEvent_ClickingDataProductCard(
    telemetryService: TelemetryService,
    dataProductData: MarketplaceDataProduct_TelemetryData,
    clickedFrom: LEGEND_MARKETPLACE_PAGE,
  ): void {
    telemetryService.logEvent(
      LEGEND_MARKETPLACE_APP_EVENT.CLICK_DATA_PRODUCT_CARD,
      {
        ...dataProductData,
        clickedFrom: clickedFrom,
      },
    );
  }

  static logEvent_ClickingLegacyDataProductCard(
    telemetryService: TelemetryService,
    productCardState: LegacyDataProductCardState,
    clickedFrom: LEGEND_MARKETPLACE_PAGE,
  ): void {
    telemetryService.logEvent(
      LEGEND_MARKETPLACE_APP_EVENT.CLICK_LEGACY_DATA_PRODUCT_CARD,
      {
        name: productCardState.dataSpace.name,
        groupId: productCardState.groupId,
        artifactId: productCardState.artifactId,
        versionId: productCardState.versionId,
        clickedFrom: clickedFrom,
      },
    );
  }

  static logEvent_SearchQuery(
    telemetryService: TelemetryService,
    query: string | undefined,
    searchedFrom: LEGEND_MARKETPLACE_PAGE,
  ): void {
    telemetryService.logEvent(LEGEND_MARKETPLACE_APP_EVENT.SEARCH_QUERY, {
      query: query,
      searchedFrom: searchedFrom,
    });
  }

  static logEvent_ActionDataContracts(
    telemetryService: TelemetryService,
    selectedContracts: V1_ContractUserEventRecord[],
    allContracts: V1_LiteDataContract[] | undefined,
    action: CONTRACT_ACTION,
    actionTakenBy: string,
    errors: string[] | undefined,
  ): void {
    const actionedContractsDetails = selectedContracts.map((contract) => {
      const dataContract = allContracts?.find(
        (_contract) => _contract.guid === contract.dataContractId,
      );
      const accessPointGroup =
        dataContract?.resourceType === V1_ResourceType.ACCESS_POINT_GROUP
          ? dataContract.accessPointGroup
          : `${dataContract?.accessPointGroup ?? 'Unknown'} (${dataContract?.resourceType ?? 'Unknown Type'})`;
      return {
        taskId: contract.taskId,
        dataContractId: contract.dataContractId,
        consumer: contract.consumer,
        type: contract.type,
        targetDataProduct: dataContract?.resourceId ?? 'Unknown',
        targetAccessPointGroup: accessPointGroup ?? 'Unknown',
        requester: dataContract?.createdBy,
      };
    });
    const data =
      errors === undefined
        ? {
            actionedContractsDetails: actionedContractsDetails,
            action: action,
            actionTakenBy: actionTakenBy,
            status: MARKETPLACE_EVENT_STATUS.SUCCESS,
          }
        : {
            actionedContractsDetails: actionedContractsDetails,
            action: action,
            actionTakenBy: actionTakenBy,
            status: MARKETPLACE_EVENT_STATUS.FAILURE,
            errors: errors,
          };
    telemetryService.logEvent(
      LEGEND_MARKETPLACE_APP_EVENT.ACTION_DATA_CONTRACTS,
      data,
    );
  }

  static logEvent_LoadDataProduct(
    telemetryService: TelemetryService,
    dataProductData: MarketplaceDataProduct_TelemetryData,
    error: string | undefined,
  ): void {
    const telemetryData =
      error === undefined
        ? { ...dataProductData, status: MARKETPLACE_EVENT_STATUS.SUCCESS }
        : {
            ...dataProductData,
            status: MARKETPLACE_EVENT_STATUS.FAILURE,
            error: error,
          };
    telemetryService.logEvent(
      LEGEND_MARKETPLACE_APP_EVENT.LOAD_DATA_PRODUCT,
      telemetryData,
    );
  }

  static logEvent_LoadSDLCDataProduct(
    telemetryService: TelemetryService,
    dataProductData: MarketplaceDataProduct_TelemetryData,
    error: string | undefined,
  ): void {
    const telemetryData =
      error === undefined
        ? { ...dataProductData, status: MARKETPLACE_EVENT_STATUS.SUCCESS }
        : {
            ...dataProductData,
            status: MARKETPLACE_EVENT_STATUS.FAILURE,
            error: error,
          };
    telemetryService.logEvent(
      LEGEND_MARKETPLACE_APP_EVENT.LOAD_SDLC_DATA_PRODUCT,
      telemetryData,
    );
  }

  static logEvent_LoadTerminal(
    telemetryService: TelemetryService,
    terminalId: string,
    error: string | undefined,
  ): void {
    const telemetryData =
      error === undefined
        ? { terminalId: terminalId, status: MARKETPLACE_EVENT_STATUS.SUCCESS }
        : {
            terminalId: terminalId,
            status: MARKETPLACE_EVENT_STATUS.FAILURE,
            error: error,
          };
    telemetryService.logEvent(
      LEGEND_MARKETPLACE_APP_EVENT.LOAD_TERMINAL,
      telemetryData,
    );
  }

  static logEvent_LoadLegacyDataProduct(
    telemetryService: TelemetryService,
    groupId: string,
    artifactId: string,
    versionId: string,
    path: string,
    error: string | undefined,
  ): void {
    const telemetryData =
      error === undefined
        ? {
            groupId: groupId,
            artifactId: artifactId,
            versionId: versionId,
            path: path,
            status: MARKETPLACE_EVENT_STATUS.SUCCESS,
          }
        : {
            groupId: groupId,
            artifactId: artifactId,
            versionId: versionId,
            path: path,
            status: MARKETPLACE_EVENT_STATUS.FAILURE,
            error: error,
          };
    telemetryService.logEvent(
      LEGEND_MARKETPLACE_APP_EVENT.LOAD_LEGACY_DATA_PRODUCT,
      telemetryData,
    );
  }

  static logEvent_ClickHeadertab(
    telemetryService: TelemetryService,
    tabTitle: string,
  ): void {
    telemetryService.logEvent(LEGEND_MARKETPLACE_APP_EVENT.CLICK_HEADER_TAB, {
      tabTitle: tabTitle,
    });
  }
}
