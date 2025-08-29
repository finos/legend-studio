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
  AnchorLinkIcon,
  DocumentIcon,
  EnvelopIcon,
  HeadsetIcon,
  QuestionCircleOutlineIcon,
  ShareIcon,
  WorldOutlineIcon,
} from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import {
  DATA_PRODUCT_VIEWER_SECTION,
  generateAnchorForSection,
} from '../../../stores/lakehouse/ProductViewerNavigation.js';
import { useEffect, useRef } from 'react';
import type { DataProductViewerState } from '../../../stores/lakehouse/DataProductViewerState.js';
import { Grid2 as Grid, Link } from '@mui/material';

export const DataProductSupportInfo = observer(
  (props: { dataProductViewerState: DataProductViewerState }) => {
    const { dataProductViewerState } = props;
    const sectionRef = useRef<HTMLDivElement>(null);

    const anchor = generateAnchorForSection(
      DATA_PRODUCT_VIEWER_SECTION.SUPPORT_INFO,
    );

    useEffect(() => {
      if (sectionRef.current) {
        dataProductViewerState.layoutState.setWikiPageAnchor(
          anchor,
          sectionRef.current,
        );
      }
      return () =>
        dataProductViewerState.layoutState.unsetWikiPageAnchor(anchor);
    }, [dataProductViewerState, anchor]);

    return (
      <div ref={sectionRef} className="data-space__viewer__wiki__section">
        <div className="data-space__viewer__wiki__section__header">
          <div className="data-space__viewer__wiki__section__header__label">
            Support
            <button
              className="data-space__viewer__wiki__section__header__anchor"
              tabIndex={-1}
              onClick={() => dataProductViewerState.changeZone(anchor, true)}
            >
              <AnchorLinkIcon />
            </button>
          </div>
        </div>
        <div className="data-space__viewer__wiki__section__content">
          <Grid container={true} spacing={3} columns={2}>
            {dataProductViewerState.product.supportInfo?.emails !== undefined &&
              dataProductViewerState.product.supportInfo.emails.length > 0 && (
                <Grid size={1}>
                  <EnvelopIcon />
                  {dataProductViewerState.product.supportInfo?.emails.map(
                    (email) => (
                      <Link
                        key={email.address}
                        className="data-product__viewer__support-info__email"
                        href={`mailto:${email.address}`}
                      >
                        {email.title}
                        <ShareIcon />
                      </Link>
                    ),
                  )}
                </Grid>
              )}
            {dataProductViewerState.product.supportInfo?.documentation !==
              undefined && (
              <Grid size={1}>
                <DocumentIcon />
                <Link
                  className="data-product__viewer__support-info__link"
                  href={
                    dataProductViewerState.product.supportInfo.documentation.url
                  }
                >
                  {
                    dataProductViewerState.product.supportInfo.documentation
                      .label
                  }
                  <ShareIcon />
                </Link>
              </Grid>
            )}
            {dataProductViewerState.product.supportInfo?.supportUrl !==
              undefined && (
              <Grid size={1}>
                <HeadsetIcon />
                <Link
                  className="data-product__viewer__support-info__link"
                  href={
                    dataProductViewerState.product.supportInfo.supportUrl.url
                  }
                >
                  {dataProductViewerState.product.supportInfo.supportUrl.label}
                  <ShareIcon />
                </Link>
              </Grid>
            )}
            {dataProductViewerState.product.supportInfo?.website !==
              undefined && (
              <Grid size={1}>
                <WorldOutlineIcon />
                <Link
                  className="data-product__viewer__support-info__link"
                  href={dataProductViewerState.product.supportInfo.website.url}
                >
                  {dataProductViewerState.product.supportInfo.website.label}
                  <ShareIcon />
                </Link>
              </Grid>
            )}
            {dataProductViewerState.product.supportInfo?.faqUrl !==
              undefined && (
              <Grid size={1}>
                <QuestionCircleOutlineIcon />
                <Link
                  className="data-product__viewer__support-info__link"
                  href={dataProductViewerState.product.supportInfo.faqUrl.url}
                >
                  {dataProductViewerState.product.supportInfo.faqUrl.label}
                  <ShareIcon />
                </Link>
              </Grid>
            )}
          </Grid>
        </div>
      </div>
    );
  },
);
