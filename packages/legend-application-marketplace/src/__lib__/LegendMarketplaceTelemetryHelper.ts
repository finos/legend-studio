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

export enum PRODUCT_INTEGRATION_TYPE {
  DATA_CUBE = 'dataCube',
  POWER_BI = 'powerBI',
  REGISTRY = 'registry',
}

export enum ICON_TOOLBAR_TYPE {
  USER = 'User Icon',
  HELP = 'Help Icon',
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

type MarketPlaceDataProductIntegration_TemeletryData =
  MarketplaceDataProduct_TelemetryData & {
    productIntegrationType?: PRODUCT_INTEGRATION_TYPE | undefined;
    accessPointGroup?: string | undefined;
    accessPointPath?: string | undefined;
  };

export type MarketplaceUserSession = {
  eventId: number;
  searchSessionId: string | undefined;
};

export const SEARCH_SESSION_KEY = 'marketplace_user_session';

export class LegendMarketplaceTelemetryHelper {
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

  private static updateSearchSessionId(
    searchSessionId: string,
  ): MarketplaceUserSession {
    const currentSession = this.getOrCreateUserSession();
    const newSearchSession: MarketplaceUserSession = {
      ...currentSession,
      searchSessionId: searchSessionId,
    };

    localStorage.setItem(SEARCH_SESSION_KEY, JSON.stringify(newSearchSession));
    return newSearchSession;
  }

  static clearSearchSessionId(): MarketplaceUserSession {
    const currentSession = this.getOrCreateUserSession();
    const newSearchSession: MarketplaceUserSession = {
      ...currentSession,
      searchSessionId: undefined,
    };

    if (currentSession.eventId !== 0) {
      localStorage.setItem(
        SEARCH_SESSION_KEY,
        JSON.stringify(newSearchSession),
      );
    }
    return newSearchSession;
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

  static logEvent_ClickingDataProductCard(
    telemetryService: TelemetryService,
    dataProductData: MarketplaceDataProduct_TelemetryData,
    clickedFrom: LEGEND_MARKETPLACE_PAGE,
  ): void {
    this.updateEventId();
    const session = this.getOrCreateUserSession();
    telemetryService.logEvent(
      LEGEND_MARKETPLACE_APP_EVENT.CLICK_DATA_PRODUCT_CARD,
      {
        ...dataProductData,
        clickedFrom: clickedFrom,
        ...session,
      },
    );
  }

  static logEvent_SearchQuery(
    telemetryService: TelemetryService,
    query: string | undefined,
    useProducerSearch: boolean,
    searchedFrom: LEGEND_MARKETPLACE_PAGE,
  ): void {
    this.updateSearchSessionId(telemetryService.applicationStore.uuid);
    this.updateEventId();
    const session = this.getOrCreateUserSession();
    telemetryService.logEvent(LEGEND_MARKETPLACE_APP_EVENT.SEARCH_QUERY, {
      query,
      useProducerSearch,
      searchedFrom,
      ...session,
    });
  }

  static logEvent_ActionDataContracts(
    telemetryService: TelemetryService,
    selectedContracts: V1_ContractUserEventRecord[],
    pendingTaskContracts: V1_LiteDataContract[] | undefined,
    action: CONTRACT_ACTION,
    actionTakenBy: string,
    errors: string[] | undefined,
  ): void {
    this.updateEventId();
    const session = this.getOrCreateUserSession();
    const actionedContractsDetails = selectedContracts.map((contract) => {
      const dataContract = pendingTaskContracts?.find(
        (c) => c.guid === contract.dataContractId,
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
        ...session,
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

  static logEvent_OpenIntegratedProduct(
    telemetryService: TelemetryService,
    intTelemetryData: MarketPlaceDataProductIntegration_TemeletryData,
    error: string | undefined,
  ): void {
    this.updateEventId();
    const session = this.getOrCreateUserSession();
    const telemetryData =
      error === undefined
        ? {
            ...intTelemetryData,
            status: MARKETPLACE_EVENT_STATUS.SUCCESS,
            ...session,
          }
        : {
            ...intTelemetryData,
            status: MARKETPLACE_EVENT_STATUS.FAILURE,
            error: error,
            ...session,
          };
    telemetryService.logEvent(
      LEGEND_MARKETPLACE_APP_EVENT.OPEN_INTEGRATED_PRODUCT,
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
    this.updateEventId();
    const session = this.getOrCreateUserSession();
    telemetryService.logEvent(LEGEND_MARKETPLACE_APP_EVENT.CLICK_HEADER_TAB, {
      tabTitle: tabTitle,
      ...session,
    });
  }

  static logEvent_ToggleProducerSearch(
    telemetryService: TelemetryService,
    isEnabled: boolean,
  ): void {
    this.updateEventId();
    const session = this.getOrCreateUserSession();
    telemetryService.logEvent(
      LEGEND_MARKETPLACE_APP_EVENT.PRODUCER_SEARCH_TOGGLE,
      {
        isEnabled: isEnabled,
        toggleAction: isEnabled ? 'enabled' : 'disabled',
        ...session,
      },
    );
  }

  static logEvent_ToggleThemeMode(
    telemetryService: TelemetryService,
    isDarkMode: boolean,
  ): void {
    this.updateEventId();
    const session = this.getOrCreateUserSession();
    telemetryService.logEvent(LEGEND_MARKETPLACE_APP_EVENT.TOGGLE_THEME_MODE, {
      currentTheme: isDarkMode ? 'dark' : 'light',
      ...session,
    });
  }

  static logEvent_ClickToolbarMenu(
    telemetryService: TelemetryService,
    iconSource: ICON_TOOLBAR_TYPE,
    menuTitle: string,
  ): void {
    this.updateEventId();
    const session = this.getOrCreateUserSession();
    telemetryService.logEvent(LEGEND_MARKETPLACE_APP_EVENT.CLICK_TOOLBAR_MENU, {
      iconSource: iconSource,
      menuTitle: menuTitle,
      ...session,
    });
  }
}
