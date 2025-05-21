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
  type V1_AccessPointGroup,
  V1_AccessPointGroupReference,
  V1_AdhocTeam,
  V1_AppDirOrganizationalScope,
  V1_ContractState,
  type V1_ContractUserEventRecord,
  type V1_DataContract,
  type V1_DataProduct,
  V1_UserApprovalStatus,
} from '@finos/legend-graph';
import { prettyCONSTName } from '@finos/legend-shared';

export enum GridTiemStatus {
  SUCCESS = 'success',
  ERROR = 'error',
  INFO = 'info',
}

export type GridItemDetail = {
  name: string;
  value: string | number;
  onClick?: (() => void) | undefined;
  status?: GridTiemStatus | undefined;
};
const inValidContractState = [
  V1_ContractState.DRAFT,
  V1_ContractState.REJECTED,
  V1_ContractState.CLOSED,
];

const idxLabel = (idx: number): string => {
  return ` (${idx + 1})`;
};

export const convertMutilGridItemDetail = (
  details: GridItemDetail[][],
): GridItemDetail[] => {
  if (details.length > 1) {
    details.forEach((gridItems, idx) => {
      gridItems.forEach((item) => {
        item.name = `${item.name}${idxLabel(idx)}`;
      });
    });
  }
  return details.flat();
};

export const dataContractContainsDataProduct = (
  dataProduct: V1_DataProduct,
  dataProdcutDeploymentID: string | undefined,
  dataContract: V1_DataContract,
): boolean => {
  if (inValidContractState.includes(dataContract.state)) {
    return false;
  }
  const contractResource = dataContract.resource;
  if (
    contractResource instanceof V1_AccessPointGroupReference &&
    dataProdcutDeploymentID
  ) {
    const sameDID =
      Number(dataProdcutDeploymentID) ===
      contractResource.dataProduct.owner.appDirId;
    // revisit name
    const isName = contractResource.dataProduct.name === dataProduct.name;
    const hasGroup = dataProduct.accessPointGroups
      .map((e) => e.id)
      .includes(contractResource.accessPointGroup);
    return sameDID && isName && hasGroup;
  }

  return false;
};

// Assume contract already part of data product
export const dataContractContainsAccessGroup = (
  group: V1_AccessPointGroup,
  dataContract: V1_DataContract,
): boolean => {
  const contractResource = dataContract.resource;
  if (contractResource instanceof V1_AccessPointGroupReference) {
    return contractResource.accessPointGroup === group.id;
  }
  return false;
};

export const isMemberOfContract = (
  user: string,
  contract: V1_DataContract,
): boolean => {
  const consumer = contract.consumer;
  if (consumer instanceof V1_AdhocTeam) {
    return consumer.users.some((e) => e.name === user);
  }
  return false;
};

export const isContractCompleted = (contract: V1_DataContract): boolean => {
  return contract.state === V1_ContractState.COMPLETED;
};

type ContractDetailOptions = {
  openApplicationIdHandler?: ((user: string) => void) | undefined;
  openDirectoryHandler?: ((id: string) => void) | undefined;
  externalReference?:
    | {
        openContractHandler: ((id: string) => void) | undefined;
      }
    | undefined;
};

const CONTRACT_GRID_NAME = Object.freeze({
  CONTRACT_ID: 'Contract ID',
  CONTRACT_DESCRIPTION: 'Contract Description',
  CONTRACT_VERSION: 'Contract Version',
  CONTRACT_STATE: 'Contract State',
  CONTRACT_DATA_PRODUCT_ID: 'Contract Data Product ID',
  CONTRACT_DATA_PRODUCT: 'Contract Data Product',
  CONTRACT_DATA_PRODUCT_DID: 'Contract Data Product DID',
  CONTRACT_ACCESS_GROUP: 'Contract Access Group',
  CONTRACT_ACCESS_POINTS: 'Contract Access Points',
  CONTRACT_CONSUMER_NAME: 'Contract Consumer Name',
  CONTRACT_CONSUMER_LEVEL: 'Contract Consumer Level',
  CONTRACT_MEMBER_ID: 'Contract Member ID',
  CONTRACT_MEMBER_TYPE: 'Contract Member Type',
  CONTRACT_MEMBER_STATUS: 'Contract Member Status',
  CONTRACT_MEMBER_NAME: 'Contract Member Name',
  CONTRACT_APP_DID: 'Contract App DID',
  CONTRACT_APP_LEVEL: 'Contract App Level',
});

export const buildDataContractDetail = (
  dataContract: V1_DataContract,
  options?: ContractDetailOptions | undefined,
): GridItemDetail[] => {
  const applicationIdUrlCallBack = options?.openApplicationIdHandler;
  const directoryUrl = options?.openDirectoryHandler;
  const openContractHandler = options?.externalReference?.openContractHandler;
  const contractDetails = [
    {
      name: CONTRACT_GRID_NAME.CONTRACT_ID,
      value: dataContract.guid,
      onClick: openContractHandler
        ? () => openContractHandler(dataContract.guid)
        : undefined,
    },
    {
      name: CONTRACT_GRID_NAME.CONTRACT_DESCRIPTION,
      value: dataContract.description,
    },
    {
      name: CONTRACT_GRID_NAME.CONTRACT_VERSION,
      value: dataContract.version,
    },
    {
      name: CONTRACT_GRID_NAME.CONTRACT_STATE,
      value: prettyCONSTName(dataContract.state),
    },
  ];
  const accessPointGroupRef = dataContract.resource;
  let dataProductDetails: GridItemDetail[] = [];
  if (accessPointGroupRef instanceof V1_AccessPointGroupReference) {
    dataProductDetails = [
      {
        name: CONTRACT_GRID_NAME.CONTRACT_DATA_PRODUCT_ID,
        value: accessPointGroupRef.dataProduct.guid,
      },
      {
        name: CONTRACT_GRID_NAME.CONTRACT_DATA_PRODUCT,
        value: accessPointGroupRef.dataProduct.name,
      },
      {
        name: CONTRACT_GRID_NAME.CONTRACT_DATA_PRODUCT_DID,
        value: accessPointGroupRef.dataProduct.owner.appDirId,
        onClick: applicationIdUrlCallBack
          ? () =>
              applicationIdUrlCallBack(
                accessPointGroupRef.dataProduct.owner.appDirId.toString(),
              )
          : undefined,
      },
      {
        name: CONTRACT_GRID_NAME.CONTRACT_ACCESS_GROUP,
        value: accessPointGroupRef.accessPointGroup,
      },
      {
        name: CONTRACT_GRID_NAME.CONTRACT_ACCESS_POINTS,
        value: accessPointGroupRef.dataProduct.accessPoints
          .map((ap) => ap.name)
          .join(', '),
      },
    ];
  }
  const org = dataContract.consumer;
  let orgDetails: GridItemDetail[] = [];
  if (org instanceof V1_AppDirOrganizationalScope) {
    orgDetails = convertMutilGridItemDetail(
      org.appDirNode.map((value) => [
        {
          name: CONTRACT_GRID_NAME.CONTRACT_APP_DID,
          value: value.appDirId.toString(),
        },
        {
          name: CONTRACT_GRID_NAME.CONTRACT_APP_LEVEL,
          value: value.level.toString(),
        },
      ]),
    );
  } else if (org instanceof V1_AdhocTeam) {
    orgDetails = convertMutilGridItemDetail(
      org.users.map((user) => {
        return [
          {
            name: CONTRACT_GRID_NAME.CONTRACT_CONSUMER_NAME,
            value: user.name,
            onClick: directoryUrl ? () => directoryUrl(user.name) : undefined,
          },
        ];
      }),
    );
  }
  const contractMembers = convertMutilGridItemDetail(
    dataContract.members.map((member) => [
      {
        name: CONTRACT_GRID_NAME.CONTRACT_MEMBER_ID,
        value: member.guid,
      },
      {
        name: CONTRACT_GRID_NAME.CONTRACT_MEMBER_NAME,
        value: member.user.name,
      },
      {
        name: CONTRACT_GRID_NAME.CONTRACT_MEMBER_TYPE,
        value: member.user.userType.toString(),
      },
      {
        name: CONTRACT_GRID_NAME.CONTRACT_MEMBER_STATUS,
        value: member.status.toString(),
      },
    ]),
  );
  return [
    ...contractDetails,
    ...dataProductDetails,
    ...orgDetails,
    ...contractMembers,
  ];
};

const getGridInfoFromTaskStatus = (
  status: V1_UserApprovalStatus,
): GridTiemStatus | undefined => {
  switch (status) {
    case V1_UserApprovalStatus.APPROVED:
      return GridTiemStatus.SUCCESS;
    case V1_UserApprovalStatus.DENIED:
      return GridTiemStatus.ERROR;
    case V1_UserApprovalStatus.PENDING:
      return GridTiemStatus.INFO;
    default:
      return undefined;
  }
};

export const TYPE_GRID_ITEM = Object.freeze({
  TASK_ID: 'Task ID',
  TASK_STATUS: 'Task Status',
  TASK_CONSUMER: 'Task Consumer',
  TASK_ASSIGNEE: 'Task Assignee',
});

export const buildTaskGridItemDetail = (
  task: V1_ContractUserEventRecord,
  assignees?: string[] | undefined,
  contract?: V1_DataContract | undefined,
  openContractHandler?: ((id: string) => void) | undefined,
  openDirectoryHandler?: ((id: string) => void) | undefined,
  openApplicationIdHandler?: ((user: string) => void) | undefined,
): GridItemDetail[] => {
  const taskAssignees = convertMutilGridItemDetail(
    assignees?.map((name) => [
      {
        name: TYPE_GRID_ITEM.TASK_ASSIGNEE,
        value: name,
        onClick: openDirectoryHandler
          ? () => openDirectoryHandler(name)
          : undefined,
      },
    ]) ?? [],
  );
  return [
    {
      name: TYPE_GRID_ITEM.TASK_ID,
      value: task.taskId,
    },
    {
      name: TYPE_GRID_ITEM.TASK_STATUS,
      value: task.status.toString(),
      status: getGridInfoFromTaskStatus(task.status),
    },
    {
      name: TYPE_GRID_ITEM.TASK_CONSUMER,
      value: task.consumer,
      onClick: openDirectoryHandler
        ? () => openDirectoryHandler(task.consumer)
        : undefined,
    },
    ...taskAssignees,
    ...(contract && openContractHandler
      ? buildDataContractDetail(contract, {
          openDirectoryHandler,
          openApplicationIdHandler,
          externalReference: {
            openContractHandler,
          },
        })
      : []),
  ];
};
