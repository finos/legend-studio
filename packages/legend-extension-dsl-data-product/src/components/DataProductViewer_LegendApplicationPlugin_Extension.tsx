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

import type { LegendApplicationPlugin } from '@finos/legend-application';
import type {
  AccessPointGroupAccess,
  DataProductGroupAccessState,
} from '../stores/DataProduct/DataProductDataAccessState.js';
import type { ProductViewerLegendApplicationStore } from '../stores/BaseViewerState.js';
import type { UserSearchService } from '@finos/legend-shared';
import type { V1_OrganizationalScope } from '@finos/legend-graph';

export type ContractConsumerTypeRendererConfig = {
  type: string;
  createContractRenderer: (
    applicationStore: ProductViewerLegendApplicationStore,
    userSearchService: UserSearchService | undefined,
    accessGroupState: DataProductGroupAccessState,
    handleOrganizationalScopeChange: (consumer: V1_OrganizationalScope) => void,
    handleDescriptionChange: (description: string | undefined) => void,
    handleIsValidChange: (isValid: boolean) => void,
  ) => React.ReactNode;
  organizationalScopeTypeName?: (
    consumer: V1_OrganizationalScope,
  ) => string | undefined;
  organizationalScopeTypeDetailsRenderer?: (
    consumer: V1_OrganizationalScope,
  ) => React.ReactNode | undefined;
  enableForEnterpriseAPGs?: boolean;
};

export interface DataProductViewer_LegendApplicationPlugin_Extension
  extends LegendApplicationPlugin {
  /**
   * Returns additional details about a given access point group access type.
   *
   * @param access the AccessPointGroupAccess value for a given Access Point Group
   */
  getExtraAccessPointGroupAccessInfo?(
    access: AccessPointGroupAccess,
  ): string | undefined;

  /**
   * Config to handle different types of contract consumers, including configuration for:
   * - Contract creation dialog renderer
   * - Organizational scope type details renderer
   */
  getContractConsumerTypeRendererConfigs?(): ContractConsumerTypeRendererConfig[];
}
