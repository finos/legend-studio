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
import { LegendMarketplacePage } from '../LegendMarketplacePage.js';
import { ComingSoonDisplay } from '../../components/ComingSoon/ComingSoonDisplay.js';
import {
  AccountTreeIcon,
  CollaborationIcon,
  CompassIcon,
  LibraryBooksIcon,
} from '@finos/legend-art';

export const LegendMarketplaceInventory = observer(() => {
  const featuresPreviewItems = [
    {
      icon: <CompassIcon />,
      title: 'Data Discovery',
    },
    {
      icon: <AccountTreeIcon />,
      title: 'Data Lineage',
    },
    {
      icon: <CollaborationIcon />,
      title: 'Collaboration',
    },
  ];

  return (
    <LegendMarketplacePage className="inventory-coming-soon">
      <ComingSoonDisplay
        loadingIcon={<LibraryBooksIcon />}
        title="Legend Inventory"
        description="Discover and explore our comprehensive inventory of all data assets at Goldman Sachs in a read-only format."
        featuresPreviewItems={featuresPreviewItems}
      />
    </LegendMarketplacePage>
  );
});
