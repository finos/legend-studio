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

import { type LegendApplicationSetup } from '@finos/legend-application';
import { setupPureLanguageService } from '@finos/legend-code-editor';
import { configureCodeEditorComponent } from '@finos/legend-lego/code-editor';
import {
  V1_AdhocTeam,
  V1_User,
  V1_UserType,
  type V1_OrganizationalScope,
} from '@finos/legend-graph';
import packageJson from '../../../package.json' with { type: 'json' };
import { LegendMarketplaceApplicationPlugin } from '../LegendMarketplaceApplicationPlugin.js';
import { UserSearchInput } from '@finos/legend-art';
import React, { useEffect, useState, type ChangeEvent } from 'react';
import { type UserSearchService, LegendUser } from '@finos/legend-shared';
import { TextField } from '@mui/material';
import {
  AccessPointGroupAccess,
  type ContractConsumerTypeRendererConfig,
  type DataProductGroupAccessState,
  type DataProductViewer_LegendApplicationPlugin_Extension,
  type ProductViewerLegendApplicationStore,
} from '@finos/legend-extension-dsl-data-product';

export class Core_LegendMarketplaceApplicationPlugin
  extends LegendMarketplaceApplicationPlugin
  implements DataProductViewer_LegendApplicationPlugin_Extension
{
  static NAME = packageJson.extensions.applicationMarketplacePlugin;

  constructor() {
    super(Core_LegendMarketplaceApplicationPlugin.NAME, packageJson.version);
  }

  override getExtraApplicationSetups(): LegendApplicationSetup[] {
    return [
      async (applicationStore) => {
        await configureCodeEditorComponent(applicationStore);
        setupPureLanguageService({});
      },
    ];
  }

  getContractConsumerTypeRendererConfigs(): ContractConsumerTypeRendererConfig[] {
    const buildAdhocUser = (
      userName: string,
      type?: V1_UserType,
    ): V1_AdhocTeam => {
      const _user = new V1_User();
      _user.name = userName;
      _user.userType = type ?? V1_UserType.WORKFORCE_USER;
      const _adhocTeam = new V1_AdhocTeam();
      _adhocTeam.users = [_user];
      return _adhocTeam;
    };

    const CommonRenderer = (props: {
      type: 'user' | 'system-account';
      label: string;
      applicationStore: ProductViewerLegendApplicationStore;
      userSearchService: UserSearchService | undefined;
      accessGroupState: DataProductGroupAccessState;
      handleOrganizationalScopeChange: (
        consumer: V1_OrganizationalScope,
      ) => void;
      handleDescriptionChange: (description: string | undefined) => void;
      handleIsValidChange: (isValid: boolean) => void;
      enableUserSearch: boolean;
    }): React.ReactElement => {
      const {
        type,
        label,
        applicationStore,
        userSearchService,
        accessGroupState,
        handleOrganizationalScopeChange,
        handleDescriptionChange,
        handleIsValidChange,
        enableUserSearch,
      } = props;
      const [description, setDescription] = useState<string>('');
      const [user, setUser] = useState<LegendUser>(new LegendUser());
      const [loadingCurrentUser, setLoadingCurrentUser] = useState(false);

      // Update parent state whenever local state changes
      useEffect(() => {
        handleOrganizationalScopeChange(
          buildAdhocUser(
            user.id,
            type === 'system-account'
              ? V1_UserType.SYSTEM_ACCOUNT
              : V1_UserType.WORKFORCE_USER,
          ),
        );
        handleDescriptionChange(description);
        handleIsValidChange(user.id !== '' && description.trim() !== '');
      }, [
        type,
        user,
        description,
        handleOrganizationalScopeChange,
        handleDescriptionChange,
        handleIsValidChange,
      ]);

      useEffect(() => {
        const fetchCurrentUser = async () => {
          if (userSearchService) {
            setLoadingCurrentUser(true);
            try {
              const currentUser = await userSearchService.getOrFetchUser(
                applicationStore.identityService.currentUser,
              );
              if (currentUser instanceof LegendUser) {
                setUser(currentUser);
              }
            } finally {
              setLoadingCurrentUser(false);
            }
          }
        };
        // We should only fetch the current user if the current user is not already entitled.
        // If the current user is already entitled, we can assume they are requesting access for another user or system account.
        if (accessGroupState.access === AccessPointGroupAccess.NO_ACCESS) {
          // eslint-disable-next-line no-void
          void fetchCurrentUser();
        }
      }, [
        accessGroupState.access,
        applicationStore.identityService.currentUser,
        userSearchService,
      ]);

      return (
        <>
          {accessGroupState.access === AccessPointGroupAccess.ENTERPRISE && (
            <p className="marketplace-lakehouse-entitlements__data-contract-creator__enterprise-apg-notice">
              Note: Enterprise APGs only require contracts for System Accounts.
              Regular users do not need to request access.
            </p>
          )}
          <UserSearchInput
            className="marketplace-lakehouse-entitlements__data-contract-creator__user-input"
            key={label}
            userValue={user}
            setUserValue={(_user: LegendUser): void => setUser(_user)}
            userSearchService={enableUserSearch ? userSearchService : undefined}
            label={label}
            required={true}
            variant="outlined"
            fullWidth={true}
            initializing={loadingCurrentUser}
          />
          <TextField
            className="marketplace-lakehouse-entitlements__data-contract-creator__business-justification-input"
            required={true}
            name="business-justification"
            label="Business Justification"
            variant="outlined"
            fullWidth={true}
            value={description}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setDescription(event.target.value)
            }
          />
        </>
      );
    };

    return [
      {
        type: 'User',
        createContractRenderer: (
          applicationStore: ProductViewerLegendApplicationStore,
          userSearchService: UserSearchService | undefined,
          accessGroupState: DataProductGroupAccessState,
          handleOrganizationalScopeChange: (
            consumer: V1_OrganizationalScope,
          ) => void,
          handleDescriptionChange: (description: string | undefined) => void,
          handleIsValidChange: (isValid: boolean) => void,
        ) => (
          <CommonRenderer
            key="user"
            type="user"
            label="User"
            applicationStore={applicationStore}
            userSearchService={userSearchService}
            accessGroupState={accessGroupState}
            handleOrganizationalScopeChange={handleOrganizationalScopeChange}
            handleDescriptionChange={handleDescriptionChange}
            handleIsValidChange={handleIsValidChange}
            enableUserSearch={true}
          />
        ),
      },
      {
        type: 'System Account',
        enableForEnterpriseAPGs: true,
        createContractRenderer: (
          applicationStore: ProductViewerLegendApplicationStore,
          userSearchService: UserSearchService | undefined,
          accessGroupState: DataProductGroupAccessState,
          handleOrganizationalScopeChange: (
            consumer: V1_OrganizationalScope,
          ) => void,
          handleDescriptionChange: (description: string | undefined) => void,
          handleIsValidChange: (isValid: boolean) => void,
        ) => (
          <CommonRenderer
            key="system-account"
            type="system-account"
            label="System Account"
            applicationStore={applicationStore}
            userSearchService={userSearchService}
            accessGroupState={accessGroupState}
            handleOrganizationalScopeChange={handleOrganizationalScopeChange}
            handleDescriptionChange={handleDescriptionChange}
            handleIsValidChange={handleIsValidChange}
            enableUserSearch={false}
          />
        ),
      },
    ];
  }
}
