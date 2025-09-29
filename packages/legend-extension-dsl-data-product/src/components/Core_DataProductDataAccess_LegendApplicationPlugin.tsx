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

import packageJson from '../../package.json' with { type: 'json' };
import {
  type V1_OrganizationalScope,
  V1_UserType,
  V1_AdhocTeam,
  V1_ProducerScope,
  V1_User,
} from '@finos/legend-graph';
import { LegendUser } from '@finos/legend-shared';
import { useEffect, useState, type ChangeEvent } from 'react';
import {
  AccessPointGroupAccess,
  type DataProductAPGState,
} from '../stores/DataProduct/DataProductAPGState.js';
import { type ContractConsumerTypeRendererConfig } from '../stores/DataProduct/DataProductDataAccessState.js';
import type { DataProductDataAccess_LegendApplicationPlugin_Extension } from '../stores/DataProductDataAccess_LegendApplicationPlugin_Extension.js';
import { UserSearchInput } from '@finos/legend-art';
import { TextField } from '@mui/material';
import {
  type LegendApplicationPluginManager,
  LegendApplicationPlugin,
} from '@finos/legend-application';

export class Core_DataProductDataAccess_LegendApplicationPlugin
  extends LegendApplicationPlugin
  implements DataProductDataAccess_LegendApplicationPlugin_Extension
{
  static NAME = packageJson.extensions.dataProductDataAccessApplicationPlugin;

  constructor() {
    super(
      Core_DataProductDataAccess_LegendApplicationPlugin.NAME,
      packageJson.version,
    );
  }

  install(
    pluginManager: LegendApplicationPluginManager<LegendApplicationPlugin>,
  ): void {
    pluginManager.registerApplicationPlugin(this);
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

    const buildProducerScope = (deploymentId: string): V1_ProducerScope => {
      const producerScope = new V1_ProducerScope();
      producerScope.did = deploymentId;
      return producerScope;
    };

    const CommonRenderer = (props: {
      type: 'user' | 'system-account' | 'producer';
      label: string;
      apgState: DataProductAPGState;
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
        apgState,
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
        if (type === 'producer') {
          const deploymentId = user.id;
          if (deploymentId) {
            handleOrganizationalScopeChange(buildProducerScope(deploymentId));
          }
        } else {
          handleOrganizationalScopeChange(
            buildAdhocUser(
              user.id,
              type === 'system-account'
                ? V1_UserType.SYSTEM_ACCOUNT
                : V1_UserType.WORKFORCE_USER,
            ),
          );
        }

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
          if (apgState.dataProductViewerState.userSearchService) {
            setLoadingCurrentUser(true);
            try {
              const currentUser =
                await apgState.dataProductViewerState.userSearchService.getOrFetchUser(
                  apgState.applicationStore.identityService.currentUser,
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
        if (apgState.access === AccessPointGroupAccess.NO_ACCESS) {
          // eslint-disable-next-line no-void
          void fetchCurrentUser();
        }
      }, [
        apgState.access,
        apgState.applicationStore.identityService.currentUser,
        apgState.dataProductViewerState.userSearchService,
      ]);

      return (
        <>
          {apgState.access === AccessPointGroupAccess.ENTERPRISE && (
            <p className="marketplace-lakehouse-entitlements__data-contract-creator__enterprise-apg-notice">
              Note: Enterprise APGs only require contracts for System Accounts.
              Regular users do not need to request access.
            </p>
          )}
          {type === 'producer' ? (
            <TextField
              className="marketplace-lakehouse-entitlements__data-contract-creator__business-justification-input"
              key={label}
              value={user.id}
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                const value = event.target.value.replace(/\D/g, '');
                const updatedUser = new LegendUser();
                updatedUser.id = value;
                setUser(updatedUser);
              }}
              label={label}
              required={true}
              variant="outlined"
              fullWidth={true}
            />
          ) : (
            <UserSearchInput
              className="marketplace-lakehouse-entitlements__data-contract-creator__user-input"
              key={label}
              userValue={user}
              setUserValue={(_user: LegendUser): void => setUser(_user)}
              userSearchService={
                enableUserSearch
                  ? apgState.dataProductViewerState.userSearchService
                  : undefined
              }
              label={label}
              required={true}
              variant="outlined"
              fullWidth={true}
              initializing={loadingCurrentUser}
            />
          )}
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
          apgState: DataProductAPGState,
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
            apgState={apgState}
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
          apgState: DataProductAPGState,
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
            apgState={apgState}
            handleOrganizationalScopeChange={handleOrganizationalScopeChange}
            handleDescriptionChange={handleDescriptionChange}
            handleIsValidChange={handleIsValidChange}
            enableUserSearch={false}
          />
        ),
      },
      {
        type: 'Producer',
        createContractRenderer: (
          apgState: DataProductAPGState,
          handleOrganizationalScopeChange: (
            consumer: V1_OrganizationalScope,
          ) => void,
          handleDescriptionChange: (description: string | undefined) => void,
          handleIsValidChange: (isValid: boolean) => void,
        ) => (
          <CommonRenderer
            key="producer"
            type="producer"
            label="Producer"
            apgState={apgState}
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
