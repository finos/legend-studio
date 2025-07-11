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

import { Container, Typography } from '@mui/material';
import { LegendMarketplacePage } from '../LegendMarketplacePage.js';

export const LegendMarketplaceComingSoon = () => {
  return (
    <LegendMarketplacePage className="legend-marketplace-coming-soon">
      <Container
        maxWidth="xxl"
        className="legend-marketplace-coming-soon__content"
      >
        <Typography variant="h1" gutterBottom={true}>
          Legend Marketplace
        </Typography>
        <Typography variant="h3">Coming Soon</Typography>
      </Container>
    </LegendMarketplacePage>
  );
};
