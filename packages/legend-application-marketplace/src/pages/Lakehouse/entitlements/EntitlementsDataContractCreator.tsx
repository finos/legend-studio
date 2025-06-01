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

import type { V1_AccessPointGroup } from '@finos/legend-graph';
import { observer } from 'mobx-react-lite';
import { useEffect, useState, type ChangeEvent } from 'react';
import type { DataProductViewerState } from '../../../stores/lakehouse/DataProductViewerState.js';
import { useAuth } from 'react-oidc-context';
import { flowResult } from 'mobx';
import {
  Button,
  ButtonGroup,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from '@mui/material';
import {
  CubesLoadingIndicator,
  CubesLoadingIndicatorIcon,
  UserSearchInput,
} from '@finos/legend-art';
import { useLegendMarketplaceBaseStore } from '../../../application/LegendMarketplaceFrameworkProvider.js';
import { LegendUser } from '@finos/legend-shared';
import { getUserById } from '../../../stores/lakehouse/LakehouseUtils.js';

enum DataContractCreatorConsumerType {
  USER = 'User',
  SYSTEM_ACCOUNT = 'System Account',
}

export const DataContractCreator = observer(
  (props: {
    open: boolean;
    onClose: () => void;
    accessPointGroup: V1_AccessPointGroup;
    viewerState: DataProductViewerState;
  }) => {
    const { open, onClose, viewerState, accessPointGroup } = props;
    const legendMarketplaceStore = useLegendMarketplaceBaseStore();
    const auth = useAuth();
    const [description, setDescription] = useState<string | undefined>(
      undefined,
    );
    const [consumerType, setConsumerType] =
      useState<DataContractCreatorConsumerType>(
        DataContractCreatorConsumerType.USER,
      );
    const [user, setUser] = useState<LegendUser>(new LegendUser());
    const [loadingCurrentUser, setLoadingCurrentUser] = useState(false);

    useEffect(() => {
      const fetchCurrentUser = async () => {
        if (legendMarketplaceStore.userSearchService) {
          setLoadingCurrentUser(true);
          try {
            const currentUser = await getUserById(
              viewerState.applicationStore.identityService.currentUser,
              legendMarketplaceStore.userSearchService,
            );
            if (currentUser) {
              setUser(currentUser);
            }
          } finally {
            setLoadingCurrentUser(false);
          }
        }
      };
      // eslint-disable-next-line no-void
      void fetchCurrentUser();
    }, [
      legendMarketplaceStore.userSearchService,
      viewerState.applicationStore.identityService.currentUser,
    ]);

    const onCreate = (): void => {
      if (user.id && description) {
        flowResult(
          viewerState.createContract(
            user.id,
            description,
            accessPointGroup,
            auth.user?.access_token,
          ),
        ).catch(viewerState.applicationStore.alertUnhandledError);
      }
    };

    const dataProductTitle =
      viewerState.product.title ?? viewerState.product.path.split('::').pop();

    return (
      <Dialog open={open} onClose={onClose} fullWidth={true} maxWidth="md">
        <DialogTitle>Data Contract Request</DialogTitle>
        <DialogContent className="marketplace-lakehouse-entitlements__data-contract-creator__content">
          <CubesLoadingIndicator
            isLoading={viewerState.creatingContractState.isInProgress}
          >
            <CubesLoadingIndicatorIcon />
          </CubesLoadingIndicator>
          {!viewerState.creatingContractState.isInProgress && (
            <>
              <div>
                Submit access request for{' '}
                <span className="marketplace-lakehouse-text__emphasis">
                  {accessPointGroup.id}
                </span>{' '}
                Access Point Group in{' '}
                <span className="marketplace-lakehouse-text__emphasis">
                  {dataProductTitle}
                </span>{' '}
                Data Product
              </div>
              <ButtonGroup
                className="marketplace-lakehouse-entitlements__data-contract-creator__consumer-type-btn-group"
                variant="contained"
              >
                {Object.values(DataContractCreatorConsumerType).map((value) => (
                  <Button
                    key={value}
                    variant={consumerType === value ? 'contained' : 'outlined'}
                    onClick={(): void => {
                      if (value !== consumerType) {
                        setConsumerType(value);
                        setUser(new LegendUser());
                      }
                    }}
                  >
                    {value}
                  </Button>
                ))}
              </ButtonGroup>
              <UserSearchInput
                className="marketplace-lakehouse-entitlements__data-contract-creator__user-input"
                key={consumerType}
                userValue={user}
                setUserValue={(_user: LegendUser): void => setUser(_user)}
                userSearchService={
                  consumerType === DataContractCreatorConsumerType.USER
                    ? legendMarketplaceStore.userSearchService
                    : undefined
                }
                label={consumerType}
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
                onChange={(event: ChangeEvent<HTMLInputElement>) => {
                  setDescription(event.target.value);
                }}
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={onCreate}
            variant="contained"
            disabled={viewerState.creatingContractState.isInProgress}
          >
            Create
          </Button>
          <Button
            onClick={onClose}
            variant="outlined"
            disabled={viewerState.creatingContractState.isInProgress}
          >
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    );
  },
);
