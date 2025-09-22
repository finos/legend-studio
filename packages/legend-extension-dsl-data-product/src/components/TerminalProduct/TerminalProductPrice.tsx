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
import { ProductWikiPlaceholder } from '../ProductWiki.js';
import { useState } from 'react';
import type { TerminalProductViewerState } from '../../stores/TerminalProduct/TerminalProductViewerState.js';

export const TerminalProductPrice = observer(
  (props: { terminalProductViewerState: TerminalProductViewerState }) => {
    const { terminalProductViewerState } = props;
    const terminal = terminalProductViewerState.product;
    const [isAnnual, setIsAnnual] = useState(true);

    const availablePrice =
      // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
      terminal.price || terminal.tieredPrice || terminal.totalFirmPrice;

    if (!availablePrice) {
      return (
        <ProductWikiPlaceholder message="No price information available." />
      );
    }

    const getDisplayPrice = () => {
      const price = Number(availablePrice);
      return isAnnual ? Number(price).toFixed(2) : (price / 12).toFixed(2);
    };

    const handlePricingToggle = () => {
      setIsAnnual((prev) => !prev);
    };

    return (
      <button
        className="data-space__viewer__wiki__section__pricing"
        onClick={handlePricingToggle}
      >
        ${getDisplayPrice()} {isAnnual ? 'ANNUALLY' : 'MONTHLY'} PER LICENSE
      </button>
    );
  },
);
