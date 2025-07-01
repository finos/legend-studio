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
  ELEMENT_PATH_DELIMITER,
  type V1_OrganizationalScope,
} from '@finos/legend-graph';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { useAuth } from 'react-oidc-context';
import { flowResult } from 'mobx';
import {
  Button,
  ButtonGroup,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from '@mui/material';
import {
  CubesLoadingIndicator,
  CubesLoadingIndicatorIcon,
} from '@finos/legend-art';
import { useLegendMarketplaceBaseStore } from '../../../application/LegendMarketplaceFrameworkProvider.js';
import { guaranteeNonNullable, isNonNullable } from '@finos/legend-shared';
import { type DataProductGroupAccessState } from '../../../stores/lakehouse/DataProductDataAccessState.js';
import type { ContractConsumerTypeRendererConfig } from '../../../application/LegendMarketplaceApplicationPlugin.js';
import { useMarketplaceLakehouseStore } from '../MarketplaceLakehouseStoreProvider.js';

export const EntitlementsDataContractCreator = observer(
  (props: {
    open: boolean;
    onClose: () => void;
    accessGroupState: DataProductGroupAccessState;
  }) => {
    const { open, onClose, accessGroupState } = props;
    const viewerState = accessGroupState.accessState.viewerState;
    const accessPointGroup = guaranteeNonNullable(
      viewerState.dataContractAccessPointGroup,
      'Cannot show DataContractCreator. No access point group is selected.',
    );
    const legendMarketplaceStore = useLegendMarketplaceBaseStore();
    const marketplaceLakehouseStore = useMarketplaceLakehouseStore();
    const auth = useAuth();
    const consumerTypeRendererConfigs: ContractConsumerTypeRendererConfig[] =
      legendMarketplaceStore.pluginManager
        .getApplicationPlugins()
        .map((plugin) => plugin.getContractConsumerTypeRenderers?.())
        .flat()
        .filter(isNonNullable);
    const [selectedConsumerType, setSelectedConsumerType] = useState<string>(
      consumerTypeRendererConfigs?.[0]?.type ?? '',
    );
    const [consumer, setConsumer] = useState<
      V1_OrganizationalScope | undefined
    >();
    const [description, setDescription] = useState<string | undefined>();
    const [isValid, setIsValid] = useState<boolean>(false);

    const onCreate = (): void => {
      if (isValid && consumer && description) {
        flowResult(
          viewerState.createContract(
            consumer,
            description,
            accessPointGroup,
            auth.user?.access_token,
          ),
        ).catch(viewerState.applicationStore.alertUnhandledError);
      }
    };

    const dataProductTitle =
      viewerState.product.title ??
      viewerState.product.path.split(ELEMENT_PATH_DELIMITER).pop();

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
                {consumerTypeRendererConfigs.map((config) => (
                  <Button
                    key={config.type}
                    variant={
                      selectedConsumerType === config.type
                        ? 'contained'
                        : 'outlined'
                    }
                    onClick={(): void => {
                      if (config.type !== selectedConsumerType) {
                        setSelectedConsumerType(config.type);
                      }
                    }}
                  >
                    {config.type}
                  </Button>
                ))}
              </ButtonGroup>
              {consumerTypeRendererConfigs
                .find((config) => config.type === selectedConsumerType)
                ?.renderer(
                  marketplaceLakehouseStore,
                  accessGroupState,
                  setConsumer,
                  setDescription,
                  setIsValid,
                )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={onCreate}
            variant="contained"
            disabled={
              viewerState.creatingContractState.isInProgress || !isValid
            }
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
