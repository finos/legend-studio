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
  V1_AdhocTeam,
  V1_User,
  V1_UserType,
  type V1_OrganizationalScope,
} from '@finos/legend-graph';
import packageJson from '../../../package.json' with { type: 'json' };
import {
  LegendMarketplaceApplicationPlugin,
  type ContractConsumerTypeRendererConfig,
} from '../LegendMarketplaceApplicationPlugin.js';
import { UserSearchInput } from '@finos/legend-art';
import React, { useEffect, useState, type ChangeEvent } from 'react';
import { LegendUser } from '@finos/legend-shared';
import {
  AccessPointGroupAccess,
  type DataProductGroupAccessState,
} from '../../stores/lakehouse/DataProductDataAccessState.js';
import { TextField } from '@mui/material';
import type { LegendMarketplaceBaseStore } from '../../stores/LegendMarketplaceBaseStore.js';

export class Core_LegendMarketplaceApplicationPlugin extends LegendMarketplaceApplicationPlugin {
  static NAME = packageJson.extensions.applicationMarketplacePlugin;

  constructor() {
    super(Core_LegendMarketplaceApplicationPlugin.NAME, packageJson.version);
  }

  override getContractConsumerTypeRendererConfigs(): ContractConsumerTypeRendererConfig[] {
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
      marketplaceBaseStore: LegendMarketplaceBaseStore;
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
        marketplaceBaseStore,
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
          if (marketplaceBaseStore.userSearchService) {
            setLoadingCurrentUser(true);
            try {
              const currentUser =
                await marketplaceBaseStore.userSearchService.getOrFetchUser(
                  marketplaceBaseStore.applicationStore.identityService
                    .currentUser,
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
        marketplaceBaseStore.applicationStore.identityService.currentUser,
        marketplaceBaseStore.userSearchService,
      ]);

      return (
        <>
          <UserSearchInput
            className="marketplace-lakehouse-entitlements__data-contract-creator__user-input"
            key={label}
            userValue={user}
            setUserValue={(_user: LegendUser): void => setUser(_user)}
            userSearchService={
              enableUserSearch
                ? marketplaceBaseStore.userSearchService
                : undefined
            }
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
          marketplaceBaseStore: LegendMarketplaceBaseStore,
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
            marketplaceBaseStore={marketplaceBaseStore}
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
        createContractRenderer: (
          marketplaceBaseStore: LegendMarketplaceBaseStore,
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
            marketplaceBaseStore={marketplaceBaseStore}
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
