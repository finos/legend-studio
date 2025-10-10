/**
 * Copyright (c) 2025-present, Goldman Sachs
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

import { observer } from 'mobx-react-lite';
import { LegendMarketplaceSearchBar } from '../../components/SearchBar/LegendMarketplaceSearchBar.js';
import {
  Button,
  ButtonGroup,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Tooltip,
  Typography,
  List,
  ListItem,
} from '@mui/material';
import type { Filter, TerminalResult } from '@finos/legend-server-marketplace';
import { LegendMarketplaceTerminalCard } from '../../components/ProviderCard/LegendMarketplaceTerminalCard.js';
import {
  type LegendMarketPlaceVendorDataStore,
  VendorDataProviderType,
} from '../../stores/LegendMarketPlaceVendorDataStore.js';
import { LegendMarketplacePage } from '../LegendMarketplacePage.js';
import { useEffect } from 'react';
import {
  useLegendMarketPlaceVendorDataStore,
  withLegendMarketplaceVendorDataStore,
} from '../../application/providers/LegendMarketplaceVendorDataProvider.js';
import { useParams } from '@finos/legend-application/browser';
import { InfoCircleIcon } from '@finos/legend-art';

export const RefinedVendorRadioSelector = observer(
  (props: { vendorDataState: LegendMarketPlaceVendorDataStore }) => {
    const { vendorDataState } = props;
    const radioOptions = [
      VendorDataProviderType.ALL,
      VendorDataProviderType.TERMINAL_LICENSE,
      VendorDataProviderType.ADD_ONS,
    ];

    const onRadioChange = (value: VendorDataProviderType) => {
      vendorDataState.setProviderDisplayState(value);
      if (value === VendorDataProviderType.TERMINAL_LICENSE) {
        vendorDataState.setProviders('desktop');
      } else {
        vendorDataState.setProviders('addon');
      }
    };

    return (
      <ButtonGroup variant="outlined">
        {radioOptions.map((option) => (
          <Button
            key={option}
            onClick={() => onRadioChange(option)}
            variant={
              vendorDataState.providerDisplayState === option
                ? 'contained'
                : 'outlined'
            }
            sx={{
              fontSize: '12px',
              backgroundColor:
                vendorDataState.providerDisplayState === option
                  ? 'primary'
                  : 'white',
            }}
          >
            {option}
          </Button>
        ))}
      </ButtonGroup>
    );
  },
);

const SearchResultsRenderer = observer(
  (props: {
    vendorDataState: LegendMarketPlaceVendorDataStore;
    terminalResults: TerminalResult[];
    sectionTitle: VendorDataProviderType;
    seeAll?: boolean;
    tooltip?: string;
  }) => {
    const { vendorDataState, terminalResults, sectionTitle, seeAll, tooltip } =
      props;

    return (
      <div>
        <div className="legend-marketplace-vendordata-main-search-results__category">
          <div className="legend-marketplace-vendordata-main-sidebar__title">
            {sectionTitle}
          </div>
          {tooltip && (
            <Tooltip title={tooltip} placement={'right'} arrow={true}>
              <InfoCircleIcon />
            </Tooltip>
          )}
          {seeAll && (
            <a
              href="#"
              className="see-all"
              onClick={() => {
                vendorDataState.setProviderDisplayState(sectionTitle);
              }}
            >
              <strong>See All&gt;</strong>
            </a>
          )}
        </div>
        <div className="legend-marketplace-vendordata-main-search-results__card-group">
          {terminalResults.map((terminal) => (
            <LegendMarketplaceTerminalCard
              key={terminal.id}
              terminalResult={terminal}
            />
          ))}
        </div>
      </div>
    );
  },
);

export const VendorDataMainContent = observer(
  (props: { marketPlaceVendorDataState: LegendMarketPlaceVendorDataStore }) => {
    const { marketPlaceVendorDataState } = props;

    const addOnsInfoMessage =
      'Add-ons cannot be ordered standalone. You must order terminal license with them.';

    return (
      <div className="legend-marketplace-vendordata-main">
        <div className="legend-marketplace-vendordata-main-sidebar">
          <div className="legend-marketplace-vendordata-main-sidebar__title">
            Filters
          </div>
          <hr></hr>
          <div className="legend-marketplace-vendordata-main-sidebar__subtitle">
            Providers
          </div>
          <div className="legend-marketplace-vendordata-main-content__sidebar__checkbox-filter-group">
            <FormGroup sx={{ gap: '1rem' }}>
              {marketPlaceVendorDataState.terminalProviders.map((vendor) => (
                <FormControlLabel
                  key={vendor.id}
                  control={<Checkbox color={'primary'} />}
                  label={
                    <Typography sx={{ fontSize: '14px' }}>
                      {vendor.providerName}
                    </Typography>
                  }
                />
              ))}
            </FormGroup>
          </div>
        </div>
        <div className="legend-marketplace-vendordata-main-search-results">
          {marketPlaceVendorDataState.providerDisplayState ===
            VendorDataProviderType.ALL && (
            <>
              <SearchResultsRenderer
                vendorDataState={marketPlaceVendorDataState}
                terminalResults={marketPlaceVendorDataState.terminalProviders}
                sectionTitle={VendorDataProviderType.TERMINAL_LICENSE}
                seeAll={true}
              />
              <hr />
              <SearchResultsRenderer
                vendorDataState={marketPlaceVendorDataState}
                terminalResults={marketPlaceVendorDataState.addOnProviders}
                sectionTitle={VendorDataProviderType.ADD_ONS}
                seeAll={true}
                tooltip={addOnsInfoMessage}
              />
            </>
          )}
          {marketPlaceVendorDataState.providerDisplayState ===
            VendorDataProviderType.TERMINAL_LICENSE && (
            <SearchResultsRenderer
              vendorDataState={marketPlaceVendorDataState}
              terminalResults={marketPlaceVendorDataState.providers}
              sectionTitle={VendorDataProviderType.TERMINAL_LICENSE}
              seeAll={false}
            />
          )}
          {marketPlaceVendorDataState.providerDisplayState ===
            VendorDataProviderType.ADD_ONS && (
            <SearchResultsRenderer
              vendorDataState={marketPlaceVendorDataState}
              terminalResults={marketPlaceVendorDataState.providers}
              sectionTitle={VendorDataProviderType.ADD_ONS}
              seeAll={false}
              tooltip={addOnsInfoMessage}
            />
          )}
        </div>
      </div>
    );
  },
);

export const LegendMarketplaceVendorData = withLegendMarketplaceVendorDataStore(
  observer(() => {
    const marketPlaceVendorDataStore = useLegendMarketPlaceVendorDataStore();

    const onChange = (query: string | undefined) => {
      marketPlaceVendorDataStore.setProvidersFilters([
        { label: 'query', value: query },
      ] as Filter[]);
    };

    useEffect(() => {
      marketPlaceVendorDataStore.init();
    }, [marketPlaceVendorDataStore]);

    return (
      <LegendMarketplacePage className="legend-marketplace-vendor-data">
        <div className="legend-marketplace-banner">
          <div className="legend-marketplace-banner__search-bar">
            <LegendMarketplaceSearchBar onSearch={onChange} />
          </div>
        </div>

        <div className="legend-marketplace-body__content">
          <div className="legend-marketplace-body__tab">
            <RefinedVendorRadioSelector
              vendorDataState={marketPlaceVendorDataStore}
            />
          </div>
          <VendorDataMainContent
            marketPlaceVendorDataState={marketPlaceVendorDataStore}
          />
        </div>
      </LegendMarketplacePage>
    );
  }),
);

export const LegendMarketplaceVendorDetails =
  withLegendMarketplaceVendorDataStore(
    observer(() => {
      const { vendorName } = useParams<Record<string, string | undefined>>();

      const vendorDatasets = ['Dataset 1', 'Dataset 2', 'Dataset 3'];

      return (
        <LegendMarketplacePage className="legend-marketplace-vendor-data">
          <div className="legend-marketplace-vendor-data__content">
            <Typography variant="h3" fontWeight="bold">
              {vendorName}
            </Typography>
            <List sx={{ listStyleType: 'disc', paddingLeft: '16px' }}>
              {vendorDatasets.map((dataset) => (
                <ListItem
                  key={dataset}
                  sx={{ display: 'list-item', padding: 'unset' }}
                >
                  {dataset}
                </ListItem>
              ))}
            </List>
          </div>
        </LegendMarketplacePage>
      );
    }),
  );
