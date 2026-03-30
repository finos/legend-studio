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

import type { JSX } from 'react';
import {
  clsx,
  deserializeIcon,
  CubesLoadingIndicator,
  CubesLoadingIndicatorIcon,
} from '@finos/legend-art';
import {
  type V1_DataProductIcon,
  V1_DataProductEmbeddedImageIcon,
  V1_DataProductLibraryIcon,
} from '@finos/legend-graph';

export const LegendMarketplaceListItem = (props: {
  content: JSX.Element;
  actions?: JSX.Element;
  onClick?: () => void;
  className?: string;
  cardMedia?: V1_DataProductIcon | string | undefined;
  loadingMedia?: boolean;
}): JSX.Element => {
  const { content, actions, onClick, className, cardMedia, loadingMedia } =
    props;

  const cardImage =
    cardMedia instanceof V1_DataProductEmbeddedImageIcon
      ? cardMedia.imageUrl
      : typeof cardMedia === 'string'
        ? cardMedia
        : undefined;
  const cardIcon =
    cardMedia instanceof V1_DataProductLibraryIcon ? cardMedia : undefined;

  return (
    <div
      className={clsx('legend-marketplace-list-item', className)}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          onClick?.();
        }
      }}
    >
      {(loadingMedia || cardMedia !== undefined) && (
        <div className="legend-marketplace-list-item__thumbnail">
          {loadingMedia ? (
            <div className="legend-marketplace-list-item__thumbnail__loading">
              <CubesLoadingIndicator isLoading={true}>
                <CubesLoadingIndicatorIcon />
              </CubesLoadingIndicator>
            </div>
          ) : cardIcon ? (
            <div className="legend-marketplace-list-item__thumbnail__icon">
              {deserializeIcon(cardIcon.libraryId, cardIcon.iconId)}
            </div>
          ) : (
            <div
              className="legend-marketplace-list-item__thumbnail__image"
              style={
                cardImage ? { backgroundImage: `url(${cardImage})` } : undefined
              }
            />
          )}
        </div>
      )}
      <div className="legend-marketplace-list-item__body">{content}</div>
      {actions && (
        <div className="legend-marketplace-list-item__actions">{actions}</div>
      )}
    </div>
  );
};
