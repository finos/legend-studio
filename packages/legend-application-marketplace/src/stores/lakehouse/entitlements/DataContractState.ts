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
  V1_AccessPointGroupReference,
  V1_AppDirOrganizationalScope,
  type V1_DataContract,
} from '@finos/legend-graph';
import type {
  GridItemDetail,
  LakehouseEntitlementsStore,
} from './LakehouseEntitlementsStore.js';

export const buildDataContractDetail = (
  dataContract: V1_DataContract,
): GridItemDetail[] => {
  const details = [
    {
      name: 'Contract ID',
      value: dataContract.guid,
    },
    {
      name: 'Contract Description',
      value: dataContract.description,
    },
    {
      name: 'Contract Version',
      value: dataContract.version,
    },
    {
      name: 'Contract State',
      value: dataContract.state,
    },
  ];
  const accessPointGroupRef = dataContract.resource;
  let dataProductDetails: GridItemDetail[] = [];
  if (accessPointGroupRef instanceof V1_AccessPointGroupReference) {
    dataProductDetails = [
      {
        name: 'Contract Data ID',
        value: accessPointGroupRef.dataProduct.guid,
      },
      {
        name: 'Contract Data Product',
        value: accessPointGroupRef.dataProduct.name,
      },
      {
        name: 'Contract Data Product DID',
        value: accessPointGroupRef.dataProduct.owner.appDirId,
      },
      {
        name: 'Contract Access Group',
        value: accessPointGroupRef.accessPointGroup,
      },
      {
        name: 'Contract Access Points',
        value: accessPointGroupRef.dataProduct.accessPoints
          .map((e) => e.name)
          .join(','),
      },
    ];
  }
  const org = dataContract.consumer;
  let orgDetails: GridItemDetail[] = [];
  if (org instanceof V1_AppDirOrganizationalScope) {
    orgDetails = org.appDirNode
      .map((value, idx) => [
        {
          name: `App Dir DID (${idx})`,
          value: value.appDirId.toString(),
        },
        {
          name: `App Dir Level (${idx})`,
          value: value.level.toString(),
        },
      ])
      .flat();
  }

  const members = dataContract.members
    .map((member, idx) => [
      {
        name: `Member ID (${idx})`,
        value: member.guid,
      },
      {
        name: `Member Name (${idx})`,
        value: member.user.name,
      },
      {
        name: `Member Type (${idx})`,
        value: member.user.userType.toString(),
      },
      {
        name: `Member Status (${idx})`,
        value: member.status.toString(),
      },
    ])
    .flat();

  return [...details, ...dataProductDetails, ...orgDetails, ...members];
};

export class DataContractState {
  readonly state: LakehouseEntitlementsStore;
  readonly value: V1_DataContract;
  canApprove: boolean | undefined;
  dataContract: V1_DataContract | undefined;

  constructor(value: V1_DataContract, state: LakehouseEntitlementsStore) {
    this.value = value;
    this.state = state;
  }

  get taskDetails(): GridItemDetail[] {
    return buildDataContractDetail(this.value);
  }
}
