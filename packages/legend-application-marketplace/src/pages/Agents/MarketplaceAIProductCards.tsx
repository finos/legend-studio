/**
 * Copyright (c) 2026-present, Goldman Sachs
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

import type { DataProductSearchResult } from '@finos/legend-server-marketplace';
import { CheckIcon, TimesIcon, CaretRightIcon } from '@finos/legend-art';
import {
  type ScoredProductCandidate,
  unwrapProductDetails,
} from '../../stores/ai/LegendMarketplaceAIChatStore.js';

const DESCRIPTION_TRUNCATION_LENGTH = 120;
const UNKNOWN_PRODUCT_LABEL = 'Unknown Product';

export const MarketplaceAIProductCards = (props: {
  products: DataProductSearchResult[];
  scoredCandidates?: ScoredProductCandidate[];
  onSelect: (product: DataProductSearchResult) => void;
}): React.ReactNode => {
  const { products, scoredCandidates, onSelect } = props;

  return (
    <div className="legend-ai__product-cards">
      {products.map((product, idx) => {
        const candidate = scoredCandidates?.[idx];
        const hasFieldInfo =
          candidate &&
          (candidate.matchedFields.length > 0 ||
            candidate.missingFields.length > 0);

        const { groupId, artifactId } = unwrapProductDetails(product);

        return (
          <button
            key={`${groupId}:${artifactId}`}
            type="button"
            className="legend-ai__product-card"
            onClick={(): void => onSelect(product)}
          >
            <div className="legend-ai__product-card-title">
              {product.dataProductTitle ?? UNKNOWN_PRODUCT_LABEL}
            </div>
            {product.dataProductDescription && (
              <div className="legend-ai__product-card-desc">
                {product.dataProductDescription.length >
                DESCRIPTION_TRUNCATION_LENGTH
                  ? `${product.dataProductDescription.slice(0, DESCRIPTION_TRUNCATION_LENGTH)}...`
                  : product.dataProductDescription}
              </div>
            )}

            {hasFieldInfo && (
              <div className="legend-ai__product-card-fields">
                {candidate.matchedFields.map((f) => (
                  <span
                    key={f}
                    className="legend-ai__product-card-field legend-ai__product-card-field--matched"
                  >
                    {f} <CheckIcon />
                  </span>
                ))}
                {candidate.missingFields.map((f) => (
                  <span
                    key={f}
                    className="legend-ai__product-card-field legend-ai__product-card-field--missing"
                  >
                    {f} <TimesIcon />
                  </span>
                ))}
              </div>
            )}

            <div className="legend-ai__product-card-meta">
              {candidate ? (
                <span className="legend-ai__product-card-score">
                  Score: {(candidate.compositeScore * 100).toFixed(0)}%
                </span>
              ) : (
                product.similarity > 0 && (
                  <span className="legend-ai__product-card-score">
                    Match: {(product.similarity * 100).toFixed(0)}%
                  </span>
                )
              )}
              {product.tags1.length > 0 && (
                <span className="legend-ai__product-card-tags">
                  {product.tags1.slice(0, 3).join(', ')}
                </span>
              )}
            </div>
            <div className="legend-ai__product-card-action">
              Use this product <CaretRightIcon />
            </div>
          </button>
        );
      })}
    </div>
  );
};
