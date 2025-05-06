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

import {
  NAVIGATION_ZONE_SEPARATOR,
  type GenericLegendApplicationStore,
  type NavigationZone,
} from '@finos/legend-application';
import {
  type DataProductArtifactGeneration,
  type V1_DataContract,
  type V1_DataContractsRecord,
  V1_AccessPointGroupReference,
  V1_AppDirLevel,
  V1_AppDirNode,
  V1_AppDirNodeModelSchema,
  type GraphData,
  type GraphManagerState,
  type V1_DataProduct,
  type V1_AccessPointGroup,
  V1_User,
  V1_UserType,
  V1_AdhocTeam,
  V1_AdhocTeamModelSchema,
  V1_DataContractsRecordModelSchemaToContracts,
} from '@finos/legend-graph';
import type { VersionedProjectData } from '@finos/legend-server-depot';
import { action, computed, flow, makeObservable, observable } from 'mobx';
import {
  DATA_PRODUCT_WIKI_PAGE_SECTIONS,
  DataProductLayoutState,
} from './DataProductLayoutState.js';
import {
  DATA_PRODUCT_VIEWER_ACTIVITY_MODE,
  generateAnchorForActivity,
} from './DataProductViewerNavigation.js';
import { DataProductDataAccessState } from './DataProductDataAccessState.js';
import {
  ActionState,
  assertErrorThrown,
  guaranteeNonEmptyString,
  guaranteeNonNullable,
  type GeneratorFn,
  type PlainObject,
} from '@finos/legend-shared';
import type { LakehouseContractServerClient } from '../LakehouseContractServerClient.js';
import { serialize } from 'serializr';
import { dataContractContainsDataProduct } from './LakehouseUtils.js';

const buildAdhocUser = (user: string): V1_AdhocTeam => {
  const _user = new V1_User();
  _user.name = user;
  _user.userType = V1_UserType.WORKFORCE_USER;
  const _adhocTeam = new V1_AdhocTeam();
  _adhocTeam.users = [_user];
  return _adhocTeam;
};

export class DataProductViewerState {
  readonly applicationStore: GenericLegendApplicationStore;
  readonly graphManagerState: GraphManagerState;
  readonly layoutState: DataProductLayoutState;

  readonly product: V1_DataProduct;
  readonly project: VersionedProjectData;
  readonly retrieveGraphData: () => GraphData;
  readonly viewSDLCProject: (path: string | undefined) => Promise<void>;
  readonly onZoneChange?:
    | ((zone: NavigationZone | undefined) => void)
    | undefined;

  // we may want to move this out eventually
  readonly lakeServerClient: LakehouseContractServerClient;
  currentActivity = DATA_PRODUCT_VIEWER_ACTIVITY_MODE.DESCRIPTION;
  accessState: DataProductDataAccessState;
  generation: DataProductArtifactGeneration | undefined;
  associatedContracts: V1_DataContract[] | undefined;
  dataContractAccessPointGroup: V1_AccessPointGroup | undefined;
  // actions

  creatingContractState = ActionState.create();

  constructor(
    applicationStore: GenericLegendApplicationStore,
    graphManagerState: GraphManagerState,
    lakeServerClient: LakehouseContractServerClient,
    project: VersionedProjectData,
    product: V1_DataProduct,
    generation: DataProductArtifactGeneration | undefined,
    actions: {
      retrieveGraphData: () => GraphData;
      viewSDLCProject: (path: string | undefined) => Promise<void>;
      onZoneChange?: ((zone: NavigationZone | undefined) => void) | undefined;
    },
  ) {
    makeObservable(this, {
      currentActivity: observable,
      setCurrentActivity: action,
      isVerified: computed,
      accessState: observable,
      fetchContracts: flow,
      associatedContracts: observable,
      dataContractAccessPointGroup: observable,
      setDataContractAccessPointGroup: action,
      setAssociatedContracts: action,
      create: flow,
      creatingContractState: observable,
    });

    this.applicationStore = applicationStore;
    this.graphManagerState = graphManagerState;

    this.project = project;
    this.product = product;
    this.generation = generation;
    this.retrieveGraphData = actions.retrieveGraphData;
    this.viewSDLCProject = actions.viewSDLCProject;
    this.onZoneChange = actions.onZoneChange;
    this.layoutState = new DataProductLayoutState(this);
    this.accessState = new DataProductDataAccessState(this);
    this.lakeServerClient = lakeServerClient;
  }

  setAssociatedContracts(val: V1_DataContract[] | undefined): void {
    this.associatedContracts = val;
  }

  setDataContractAccessPointGroup(val: V1_AccessPointGroup | undefined) {
    this.dataContractAccessPointGroup = val;
  }

  *fetchContracts(token: string | undefined): GeneratorFn<void> {
    try {
      const did = guaranteeNonEmptyString(
        this.generation?.dataProduct.deploymentId,
        'did required to get contracts',
      );
      const didNode = new V1_AppDirNode();
      didNode.appDirId = Number(did);
      didNode.level = V1_AppDirLevel.DEPLOYMENT;
      const _contracts = (yield this.lakeServerClient.getDataContractsFromDID(
        [serialize(V1_AppDirNodeModelSchema, didNode)],
        token,
      )) as PlainObject<V1_DataContractsRecord>;
      const dataProductContracts = V1_DataContractsRecordModelSchemaToContracts(
        _contracts,
      ).filter((_contract) =>
        dataContractContainsDataProduct(
          this.product,
          this.deploymentId,
          _contract,
        ),
      );
      this.setAssociatedContracts(dataProductContracts);
      this.accessState.accessGroupStates.forEach((e) =>
        e.handleDataProductContracts(dataProductContracts),
      );
    } catch (error) {
      assertErrorThrown(error);
      this.accessState.viewerState.applicationStore.notificationService.notifyError(
        `${error.message}`,
      );
    }
  }

  *create(
    description: string,
    group: V1_AccessPointGroup,
    token: string | undefined,
  ): GeneratorFn<void> {
    try {
      this.creatingContractState.inProgress();
      const request: PlainObject<V1_DataContractsRecord> = {
        description,
        product: guaranteeNonNullable(this.generation?.content),
        accessPointGroup: group.id,
        consumer: serialize(
          V1_AdhocTeamModelSchema,
          buildAdhocUser(this.applicationStore.identityService.currentUser),
        ),
      };
      const contracts = V1_DataContractsRecordModelSchemaToContracts(
        (yield this.lakeServerClient.createContract(
          request,
          token,
        )) as unknown as PlainObject<V1_DataContractsRecord>,
      );
      const associatedContracts = contracts[0];
      const findGroup = this.accessState.accessGroupStates.find(
        (e) => e.group === group,
      );
      findGroup?.setAssociatedContract(associatedContracts);
      this.setDataContractAccessPointGroup(undefined);
      this.applicationStore.notificationService.notifySuccess(
        `Contract created, please go to contract view for pending tasks`,
      );
    } catch (error) {
      assertErrorThrown(error);
      this.accessState.viewerState.applicationStore.notificationService.notifyError(
        `${error.message}`,
      );
    } finally {
      this.creatingContractState.complete();
    }
  }

  syncContracts(): void {
    this.associatedContracts?.forEach((c) => {
      const _resource = c.resource;
      if (_resource instanceof V1_AccessPointGroupReference) {
        const groupId = _resource.accessPointGroup;
        this.accessState.accessGroupStates.find((e) => e.id === groupId);
      }
    });
  }

  setCurrentActivity(val: DATA_PRODUCT_VIEWER_ACTIVITY_MODE): void {
    this.currentActivity = val;
  }

  get isVerified(): boolean {
    // TODO what does it mean if data product is vertified ?
    return true;
  }

  get deploymentId(): string | undefined {
    return this.generation?.dataProduct.deploymentId;
  }

  changeZone(zone: NavigationZone, force = false): void {
    if (force) {
      this.layoutState.setCurrentNavigationZone('');
    }
    if (zone !== this.layoutState.currentNavigationZone) {
      const zoneChunks = zone.split(NAVIGATION_ZONE_SEPARATOR);
      const activityChunk = zoneChunks[0];
      const matchingActivity = Object.values(
        DATA_PRODUCT_VIEWER_ACTIVITY_MODE,
      ).find(
        (activity) => generateAnchorForActivity(activity) === activityChunk,
      );
      if (activityChunk && matchingActivity) {
        if (DATA_PRODUCT_WIKI_PAGE_SECTIONS.includes(matchingActivity)) {
          this.layoutState.setWikiPageAnchorToNavigate({
            anchor: zone,
          });
        }
        this.setCurrentActivity(matchingActivity);
        this.onZoneChange?.(zone);
        this.layoutState.setCurrentNavigationZone(zone);
      } else {
        this.setCurrentActivity(DATA_PRODUCT_VIEWER_ACTIVITY_MODE.DESCRIPTION);
        this.layoutState.setCurrentNavigationZone('');
      }
    }
  }
}
