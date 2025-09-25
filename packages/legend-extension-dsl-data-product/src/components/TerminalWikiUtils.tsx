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

import { PencilEditIcon } from '@finos/legend-art';
import { Divider } from '@mui/material';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import type { TerminalProductViewerState } from '../stores/TerminalProduct/TerminalProductViewerState.js';
import { ProductWikiPlaceholder } from './ProductWiki.js';

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
        className="data-product__viewer__wiki__section__pricing"
        onClick={handlePricingToggle}
      >
        ${getDisplayPrice()} {isAnnual ? 'ANNUALLY' : 'MONTHLY'} PER LICENSE
      </button>
    );
  },
);

export interface TerminalAccessSectionProps {
  userImageUrl: string;
  userImageAlt?: string;
  onButtonClick?: () => void;
  buttonText?: string;
  className?: string;
}

export const TerminalAccessSection: React.FC<TerminalAccessSectionProps> = ({
  userImageUrl,
  userImageAlt = 'User',
  onButtonClick,
  buttonText = 'Change User',
}) => {
  return (
    <div className="data-product__viewer__content__access-section">
      <h1 className="data-product__viewer__content__access-section__heading">
        Access
      </h1>
      <Divider className="data-product__divider" />

      <div className="data-product__viewer__content__access-section__container">
        <span className="data-product__viewer__content__access-section__span">
          Showing access for
        </span>

        <div className="data-product__viewer__content__access-section__image-container">
          <img
            src={''}
            alt={userImageAlt}
            className="data-product__viewer__content__access-section__image"
          />
        </div>

        <span className="data-product__viewer__content__access-section__span">
          Last, First [Engineering]
        </span>

        <PencilEditIcon
          className="data-product__viewer__content__access-section__icon"
          onClick={onButtonClick}
        />
      </div>
    </div>
  );
};

export const TerminalProductTable = observer(
  (props: { terminalProductViewerState: TerminalProductViewerState }) => {
    const { terminalProductViewerState } = props;
    const terminal = terminalProductViewerState.product;

    const getProductName = () => {
      return (
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        terminal.productName || terminal.applicationName || 'Unknown Product'
      );
    };

    const getAnnualPrice = () => {
      const prices = [
        Number(terminal.price),
        Number(terminal.tieredPrice),
        Number(terminal.totalFirmPrice),
      ];
      const validPrice = prices.find((price) => price > 0);
      return Number(validPrice) || 0;
    };

    const formatPrice = (price: number) => {
      return `$${price.toFixed(2)}/year`;
    };

    return (
      <div className="data-product__viewer__content__">
        <table className="data-product__viewer__content__table">
          <thead>
            <tr className="data-product__viewer__content__table--row">
              <th className="data-product__viewer__content__table--header">
                Entity
              </th>
              <th className="data-product__viewer__content__table--header">
                Cost
              </th>
              <th className="data-product__viewer__content__table--header">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="data-product__viewer__content__table--row">
              <td className="data-product__viewer__content__table--cell data-product__viewer__content__table--cell--entity">
                {getProductName()}
              </td>
              <td className="data-product__viewer__content__table--cell data-product__viewer__content__table--cell--cost">
                {formatPrice(getAnnualPrice())}
              </td>
              <td className="data-product__viewer__content__table--cell data-product__viewer__content__table--cell--status">
                Button
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  },
);
