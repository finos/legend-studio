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
  type V1_ContractUserMembership,
  type V1_DataSubscription,
  type V1_OrganizationalScope,
  type V1_UserType,
} from '@finos/legend-graph';
import {
  type GeneratorFn,
  type UserSearchService,
  type ActionState,
} from '@finos/legend-shared';
import type { GenericLegendApplicationStore } from '@finos/legend-application';

export type TimelineStep = {
  key: string;
  label: {
    title: string;
    link?: string | undefined;
    showEscalateButton?: boolean | undefined;
    isEscalatable?: boolean | undefined;
    isEscalated?: boolean | undefined;
  };
  status: 'active' | 'complete' | 'denied' | 'skipped' | 'upcoming';
  description?: React.ReactNode;
  assignees?: string[] | undefined;
  approvalPayload?:
    | {
        status: string;
        approvalTimestamp?: string;
        approverId?: string;
      }
    | undefined;
};

export enum DataAccessRequestStatus {
  DRAFT = 'DRAFT',
  PENDING_DATA_OWNER_APPROVAL = 'PENDING_DATA_OWNER_APPROVAL',
  OPEN_FOR_PRIVILEGE_MANAGER_APPROVAL = 'OPEN_FOR_PRIVILEGE_MANAGER_APPROVAL',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
  CLOSED = 'CLOSED',
}

export interface DataAccessRequestState {
  // Identity
  readonly guid: string;
  readonly description: string;
  readonly createdBy: string;
  readonly createdAt: string;

  // Resource info
  readonly resourceId: string;
  readonly resourceType: string;
  readonly accessPointGroup: string | undefined;
  readonly deploymentId: number;

  // Consumer info
  readonly consumer: V1_OrganizationalScope;

  // Status
  readonly status: DataAccessRequestStatus;
  readonly isInTerminalState: boolean;
  readonly isInProgress: boolean;

  // Subscription
  readonly subscription: V1_DataSubscription | undefined;

  // Services
  readonly applicationStore: GenericLegendApplicationStore;
  readonly userSearchService: UserSearchService | undefined;

  // Action states
  readonly initializationState: ActionState;
  readonly escalatingState: ActionState;
  readonly invalidatingState: ActionState;

  // Data
  readonly contractMembers: V1_ContractUserMembership[];
  readonly targetUsers: string[] | undefined;

  // Timeline
  getTimelineSteps(selectedTargetUser: string | undefined): TimelineStep[];

  // Actions
  init(token: string | undefined): GeneratorFn<void>;
  getContractUserType(userId: string): V1_UserType | undefined;
  escalateRequest?(user: string, token: string | undefined): GeneratorFn<void>;
  invalidateRequest?(token: string | undefined): GeneratorFn<void>;
}
