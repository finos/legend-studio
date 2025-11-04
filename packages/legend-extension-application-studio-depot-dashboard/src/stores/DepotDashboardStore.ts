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

import type { LegendStudioApplicationStore } from '@finos/legend-application-studio';
import {
  BasicGraphManagerState,
  CORE_PURE_PATH,
  resolvePackagePathAndElementName,
  type V1_DataProduct,
  V1_dataProductModelSchema,
} from '@finos/legend-graph';
import {
  DepotScope,
  StoredSummaryEntity,
  type StoreProjectData,
  type DepotServerClient,
} from '@finos/legend-server-depot';
import {
  ActionState,
  assertErrorThrown,
  guaranteeNonNullable,
  type GeneratorFn,
  type PlainObject,
} from '@finos/legend-shared';
import { type Entity, generateGAVCoordinates } from '@finos/legend-storage';
import { deserialize } from 'serializr';
import {
  action,
  computed,
  flow,
  flowResult,
  makeObservable,
  observable,
} from 'mobx';
import type { GridApi } from 'ag-grid-community';

export enum DATA_PRODUCT_DASHBOARD_HEADER {
  PROJECT_GAV = 'GroupdId:ArtifactId',
  PROJECT_VERSION = 'Project Version',
  PROJECT_ID = 'Project ID',
  DATA_PRODUCT_NAME = 'Name',
  DATA_PRODUCT_PACKAGE = 'Package',
  // title/description checks
  DATA_PRODUCT_HAS_TITLE_DESCRIPTION = 'Has Title/Description',
  DATA_PRODUCT_HAS_ACESS_POINT_GROUP_TITLE_DESCRIPTION = 'APG Has Title/Description',
  DATA_PRODUCT_HAS_ACCESS_POINT_TITLE_DESCRIPTION = 'Acess Point Has Title/Description',
  // title/description
  DATA_PRODUCT_TITLE = 'Title',
  DATA_PRODUCT_DESCRIPTION = 'Description',
  // access point groups / access points
  DATA_PRODUCT_APG_Number = 'Access Point Group Number',
  DATA_PRODUCT_APG_IDS = 'Access Point Group Ids',
  DATA_PRODUCT_APG_TITLE = 'Access Point Group Titles',
  DATA_PRODUCT_APG_DESCRIPTION = 'Access Point Group Descriptionss',
  DATA_PRODUCT_APG_NUMBER_OF_APS = 'Access Point Group AP Number',
  // metadata
  Data_PRODUCT_TYPE = 'Internal/External',
  DATA_PRODUCT_HAS_ENTERPRISE_GROUP = 'Enterprise Group (Y/N)',
  DATA_PRODUCT_REGIONS = 'Regions',
  DATA_PRODUCT_DELIVERY_FREQUENCY = 'Delivery Frequency',
  DATA_PRODUCT_HAS_ICON = 'Icon (Y/N)',
  DATA_PRODUCT_HAS_SAMPLE_VALUES = 'Sample Values (Y/N)',
  DATA_PRODUCT_HAS_EXPERTISE = 'Experise (Y/N)',
  DATA_PRODUCT_STEREOTYPES = 'Stereotypes',
  DATA_PRODUCT_TAGGED_VALUES = 'Tagged Values',
  DATA_PRODUCT_SUPPORT_INFO = 'Support Info (Emails/Doc/FAQ/Support/Website)',
}

export const getDataProductValue = (
  type: DATA_PRODUCT_DASHBOARD_HEADER,
  dataProduct: V1_DataProduct,
): string | number | false => {
  switch (type) {
    case DATA_PRODUCT_DASHBOARD_HEADER.DATA_PRODUCT_TITLE:
      return dataProduct.title ?? false;
    case DATA_PRODUCT_DASHBOARD_HEADER.DATA_PRODUCT_DESCRIPTION:
      return dataProduct.description ?? false;
    // access point groups / access points
    case DATA_PRODUCT_DASHBOARD_HEADER.DATA_PRODUCT_APG_Number:
      return dataProduct.accessPointGroups.length;
    case DATA_PRODUCT_DASHBOARD_HEADER.DATA_PRODUCT_APG_IDS:
      return dataProduct.accessPointGroups.map((apg) => apg.id).join(',');
    case DATA_PRODUCT_DASHBOARD_HEADER.DATA_PRODUCT_APG_TITLE:
      return dataProduct.accessPointGroups.map((apg) => apg.title).join(',');
    case DATA_PRODUCT_DASHBOARD_HEADER.DATA_PRODUCT_APG_DESCRIPTION:
      return dataProduct.accessPointGroups
        .map((apg) => apg.description)
        .join(',');
    case DATA_PRODUCT_DASHBOARD_HEADER.DATA_PRODUCT_APG_NUMBER_OF_APS:
      return dataProduct.accessPointGroups
        .map((apg) => apg.accessPoints.length)
        .join(',');
    case DATA_PRODUCT_DASHBOARD_HEADER.DATA_PRODUCT_REGIONS:
      return dataProduct.coverageRegions?.length ? 'Y' : false;
    case DATA_PRODUCT_DASHBOARD_HEADER.DATA_PRODUCT_DELIVERY_FREQUENCY:
      return dataProduct.deliveryFrequency ?? false;
    case DATA_PRODUCT_DASHBOARD_HEADER.DATA_PRODUCT_HAS_ICON:
      return dataProduct.icon !== undefined ? 'Y' : false;
    case DATA_PRODUCT_DASHBOARD_HEADER.DATA_PRODUCT_HAS_SAMPLE_VALUES:
      return dataProduct.sampleValues?.length ? 'Y' : false;
    case DATA_PRODUCT_DASHBOARD_HEADER.DATA_PRODUCT_HAS_EXPERTISE:
      return dataProduct.expertise?.length ? 'Y' : false;
    case DATA_PRODUCT_DASHBOARD_HEADER.DATA_PRODUCT_STEREOTYPES:
      return dataProduct.stereotypes.length
        ? dataProduct.stereotypes
            .map((s) => `${s.profile}.${s.value}`)
            .join(',')
        : false;
    case DATA_PRODUCT_DASHBOARD_HEADER.DATA_PRODUCT_TAGGED_VALUES:
      return dataProduct.taggedValues.length
        ? dataProduct.taggedValues
            .map((s) => `${s.tag.profile}.${s.tag}.${s.value}`)
            .join(',')
        : false;

    default:
      throw new Error(
        `Unsupported data product dashboard header type: ${type}`,
      );
  }
};
export const getDataProductGridValue = (
  dataProduct: V1_DataProduct | undefined,
  header: DATA_PRODUCT_DASHBOARD_HEADER,
): string | number | false | undefined => {
  if (!dataProduct) {
    return undefined;
  }
  return getDataProductValue(header, dataProduct);
};

export class DataProductEntityState {
  readonly store: DepotDashboardStore;
  summary: StoredSummaryEntity;
  fetchingElementState = ActionState.create();
  dataProduct: V1_DataProduct | undefined;
  projectId: string | undefined;

  constructor(summary: StoredSummaryEntity, store: DepotDashboardStore) {
    this.summary = summary;
    this.store = store;

    makeObservable(this, {
      dataProduct: observable,
      fetchingElementState: observable,
      fetchElement: flow,
      infoFetched: computed,
    });
  }

  get infoFetched(): boolean {
    return this.dataProduct !== undefined && this.projectId !== undefined;
  }

  get id(): string {
    return `${generateGAVCoordinates(this.summary.groupId, this.summary.artifactId, this.summary.versionId)}:${this.summary.path}`;
  }

  get project(): string {
    return `${generateGAVCoordinates(this.summary.groupId, this.summary.artifactId, this.summary.versionId)}`;
  }

  get gaProject(): string {
    return `${generateGAVCoordinates(this.summary.groupId, this.summary.artifactId, undefined)}`;
  }

  get name(): string {
    return resolvePackagePathAndElementName(this.summary.path)[1];
  }

  get package(): string {
    return resolvePackagePathAndElementName(this.summary.path)[0];
  }

  *fetchElement(): GeneratorFn<void> {
    try {
      this.fetchingElementState.inProgress();

      // fetch entity
      const entity = (yield this.store.depotServerClient.getVersionEntity(
        this.summary.groupId,
        this.summary.artifactId,
        this.summary.versionId,
        this.summary.path,
      )) as Entity;
      const product = deserialize(
        V1_dataProductModelSchema(
          this.store.graphManagerState.graphManager.pluginManager.getPureProtocolProcessorPlugins(),
        ),
        entity.content,
      );
      const projectData = (yield this.store.depotServerClient.getProject(
        this.summary.groupId,
        this.summary.artifactId,
      )) as StoreProjectData;
      this.projectId = projectData.projectId;
      this.dataProduct = product;
      this.store.dataProductDepotState.updateRow(this);
      this.fetchingElementState.complete();
    } catch (error) {
      assertErrorThrown(error);
      this.fetchingElementState.fail();
    }
  }
}

export class DataProductDepotDashboardState {
  readonly depotServerClient: DepotServerClient;
  readonly store: DepotDashboardStore;
  gridApi: GridApi | undefined;

  MAX_CALLS = 3000;
  fetchingProductsState = ActionState.create();
  scope = DepotScope.RELEASES;
  entitiesSummary: StoredSummaryEntity[] | undefined;
  dataProductEntitiesStates: DataProductEntityState[] | undefined;

  constructor(depotStore: DepotServerClient, store: DepotDashboardStore) {
    this.depotServerClient = depotStore;
    this.store = store;
    makeObservable(this, {
      scope: observable,
      entitiesSummary: observable,
      gridApi: observable,
      dataProductEntitiesStates: observable,
      setGridApi: action,
      entitiySummarryCount: computed,
      init: flow,
      fetchedCount: computed,
      totalCount: computed,
      fetchProgress: computed,
      hasMaxCallsWarning: computed,
      maxCallsWarningMessage: computed,
      updateRow: action,
      handleScopeChange: flow,
      fetchEntities: flow,
    });
  }

  get entitiySummarryCount(): number | undefined {
    return this.entitiesSummary?.length;
  }

  get totalCount(): number {
    return this.entitiesSummary?.length ?? 0;
  }

  get fetchedCount(): number {
    return (
      this.dataProductEntitiesStates?.filter((state) => state.infoFetched)
        .length ?? 0
    );
  }

  get fetchProgress(): { fetched: number; total: number; percentage: number } {
    const total = this.totalCount;
    const fetched = this.fetchedCount;
    const percentage = total > 0 ? Math.round((fetched / total) * 100) : 0;
    return { fetched, total, percentage };
  }

  get hasMaxCallsWarning(): boolean {
    const total = this.totalCount;
    return total > this.MAX_CALLS;
  }

  get maxCallsWarningMessage(): string {
    return `Maximum of ${this.MAX_CALLS} data products fetched out of ${this.totalCount} available. This is to prevent hit on depot server.`;
  }

  updateRow(updatedEntity: DataProductEntityState) {
    if (this.gridApi) {
      const rowNode = this.gridApi.getRowNode(updatedEntity.id);
      if (rowNode) {
        this.gridApi.refreshCells({
          rowNodes: [rowNode],
          force: true,
        });
      }
    }
  }

  setGridApi(gridApi: GridApi): void {
    this.gridApi = gridApi;
  }

  *handleScopeChange(scope: DepotScope): GeneratorFn<void> {
    if (this.scope !== scope) {
      this.scope = scope;
      yield flowResult(this.init()).catch((error) => {
        assertErrorThrown(error);
        this.store.applicationStore.notificationService.notifyError(error);
      });
    }
  }

  *init(): GeneratorFn<void> {
    try {
      this.fetchingProductsState.inProgress();
      this.dataProductEntitiesStates = undefined;
      this.entitiesSummary = undefined;
      const _summary =
        (yield this.depotServerClient.getEntitiesSummaryByClassifier(
          CORE_PURE_PATH.DATA_PRODUCT,
          {
            summary: true,
            scope: this.scope,
          },
        )) as unknown as PlainObject<StoredSummaryEntity>[];
      const summary = _summary.map((storeEntity) =>
        StoredSummaryEntity.serialization.fromJson(storeEntity),
      );
      this.entitiesSummary = summary;
      const entities = summary.map(
        (s) => new DataProductEntityState(s, this.store),
      );
      this.dataProductEntitiesStates = entities.sort((a, b) =>
        a.gaProject.localeCompare(b.gaProject),
      );
      flowResult(this.fetchEntities()).catch((error) => {
        assertErrorThrown(error);
        this.store.applicationStore.notificationService.notifyError(error);
      });
      this.fetchingProductsState.complete();
    } catch (error) {
      assertErrorThrown(error);
      this.store.applicationStore.notificationService.notifyError(error);
    }
  }

  // TODO FIX for pagination flow, if needed
  *fetchEntities(): GeneratorFn<void> {
    try {
      const productProductstates = guaranteeNonNullable(
        this.dataProductEntitiesStates,
        `Entities summaries have not been fetched`,
      );
      productProductstates.slice(0, this.MAX_CALLS).forEach((state) => {
        flowResult(state.fetchElement()).catch((error) => {
          assertErrorThrown(error);
          this.store.applicationStore.notificationService.notifyError(error);
        });
      });
    } catch (error) {
      assertErrorThrown(error);
    }
  }
}

export class DepotDashboardStore {
  readonly applicationStore: LegendStudioApplicationStore;
  readonly depotServerClient: DepotServerClient;
  readonly graphManagerState: BasicGraphManagerState;
  dataProductDepotState: DataProductDepotDashboardState;

  constructor(
    applicationStore: LegendStudioApplicationStore,
    depotServerClient: DepotServerClient,
  ) {
    this.applicationStore = applicationStore;
    this.depotServerClient = depotServerClient;
    this.graphManagerState = new BasicGraphManagerState(
      applicationStore.pluginManager,
      applicationStore.logService,
    );
    this.dataProductDepotState = new DataProductDepotDashboardState(
      this.depotServerClient,
      this,
    );
    makeObservable(this, {
      dataProductDepotState: observable,
    });
  }
}
