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

import { observer } from 'mobx-react-lite';
import { useParams } from '@finos/legend-application/browser';
import { List, ListItem, Typography } from '@mui/material';
import { LegendMarketplacePage } from '../LegendMarketplacePage.js';
import { withLegendMarketplaceVendorDataStore } from '../../application/providers/LegendMarketplaceVendorDataProvider.js';
import {
  CompassIcon,
  AnalyticsIcon,
  SparkleStarsIcon,
  DatabaseIcon,
} from '@finos/legend-art';
import { ComingSoonDisplay } from '../../components/ComingSoon/ComingSoonDisplay.js';

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

export const LegendMarketplaceTerminalsAddOnsComingSoon = observer(() => {
  const featuresPreviewItems = [
    {
      icon: <CompassIcon />,
      title: 'Vendor Data',
    },
    {
      icon: <AnalyticsIcon />,
      title: 'Terminals',
    },
    {
      icon: <SparkleStarsIcon />,
      title: 'Add Ons',
    },
  ];

  return (
    <LegendMarketplacePage className="vendor-data-coming-soon">
      <ComingSoonDisplay
        loadingIcon={<DatabaseIcon />}
        title="Terminals and Add Ons"
        description="Discover quality vendor data available for use"
        featuresPreviewItems={featuresPreviewItems}
      />
    </LegendMarketplacePage>
  );
});
