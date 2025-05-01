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

export class V1_OrganizationalScope {}

export class V1_AppDirNode {
  appDirId!: number;
  level!: V1_AppDirLevel;
}

export enum V1_AppDirLevel {
  BUSINESS_UNIT,
  SUB_BUSINESS_UNIT,
  FAMILY,
  APPLICATION,
  DEPLOYMENT,
}

export class V1_AppDirOrganizationalScope extends V1_OrganizationalScope {
  appDirNode!: V1_AppDirNode[];
}

export class V1_AdhocTeam extends V1_OrganizationalScope {
  users: V1_User[] = [];
}

export class V1_LogicalEntitlements {
  roleUniverse: V1_Role[] = [];
  roleMemberships: V1_RoleMembership[] = [];
  privileges: V1_Privilege[] = [];
}

export class V1_Role {
  name!: string;
}

export class V1_RoleMembership {
  user!: V1_User;
  role!: V1_Role;
}

export class V1_User {
  name!: string;
  userType!: V1_UserType;
}

export enum V1_UserType {
  WORKFORCE_USER,
  SYSTEM_ACCOUNT,
}

export class V1_Privilege {
  subject!: V1_Role;
  action!: V1_Action;
  resource!: V1_Resource;
}

export enum V1_Action {
  READ,
}

export class V1_Resource {}
