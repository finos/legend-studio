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
  ExternalLinkIcon,
  HeadsetIcon,
  QuestionCircleOutlineIcon,
  WorldOutlineIcon,
} from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import {
  DATA_PRODUCT_VIEWER_SECTION,
  generateAnchorForSection,
} from '../../../stores/lakehouse/ProductViewerNavigation.js';
import { useEffect, useRef } from 'react';
import type { DataProductViewerState } from '../../../stores/lakehouse/DataProductViewerState.js';
import { Box, Grid2 as Grid, Link } from '@mui/material';
import { ProductWikiPlaceholder } from './DataProductWiki.js';

export const DataProductSupportInfo = observer(
  (props: { dataProductViewerState: DataProductViewerState }) => {
    const { dataProductViewerState } = props;
    const sectionRef = useRef<HTMLDivElement>(null);

    const anchor = generateAnchorForSection(
      DATA_PRODUCT_VIEWER_SECTION.SUPPORT_INFO,
    );

    const supportInfo = dataProductViewerState.product.supportInfo;
    const doesSupportInfoExist =
      supportInfo !== undefined &&
      (supportInfo.emails.length > 0 ||
        supportInfo.documentation ||
        supportInfo.website ||
        supportInfo.faqUrl ||
        supportInfo.supportUrl);

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
          {doesSupportInfoExist ? (
            <Grid container={true} spacing={3} columns={2}>
              {supportInfo?.emails !== undefined &&
                supportInfo.emails.length > 0 && (
                  <Grid
                    size={1}
                    className="data-product__viewer__support-info__section"
                  >
                    <Box className="data-product__viewer__support-info__section__icon">
                      <EnvelopIcon />
                    </Box>
                    {supportInfo?.emails.map((email, index) => (
                      <>
                        <Link
                          key={email.address}
                          className="data-product__viewer__support-info__email"
                          href={`mailto:${email.address}`}
                        >
                          {email.title}
                          <ExternalLinkIcon />
                        </Link>
                        {index < supportInfo.emails.length - 1 ? ', ' : null}
                      </>
                    ))}
                  </Grid>
                )}
              {supportInfo?.documentation !== undefined && (
                <Grid
                  size={1}
                  className="data-product__viewer__support-info__section"
                >
                  <Box className="data-product__viewer__support-info__section__icon">
                    <DocumentIcon />
                  </Box>
                  <Link
                    className="data-product__viewer__support-info__link"
                    href={supportInfo.documentation.url}
                  >
                    {supportInfo.documentation.label ??
                      supportInfo.documentation.url}
                    <ExternalLinkIcon />
                  </Link>
                </Grid>
              )}
              {supportInfo?.supportUrl !== undefined && (
                <Grid
                  size={1}
                  className="data-product__viewer__support-info__section"
                >
                  <Box className="data-product__viewer__support-info__section__icon">
                    <HeadsetIcon />
                  </Box>
                  <Link
                    className="data-product__viewer__support-info__link"
                    href={supportInfo.supportUrl.url}
                  >
                    {supportInfo.supportUrl.label ?? supportInfo.supportUrl.url}
                    <ExternalLinkIcon />
                  </Link>
                </Grid>
              )}
              {supportInfo?.website !== undefined && (
                <Grid
                  size={1}
                  className="data-product__viewer__support-info__section"
                >
                  <Box className="data-product__viewer__support-info__section__icon">
                    <WorldOutlineIcon />
                  </Box>
                  <Link
                    className="data-product__viewer__support-info__link"
                    href={supportInfo.website.url}
                  >
                    {supportInfo.website.label ?? supportInfo.website.url}
                    <ExternalLinkIcon />
                  </Link>
                </Grid>
              )}
              {supportInfo?.faqUrl !== undefined && (
                <Grid
                  size={1}
                  className="data-product__viewer__support-info__section"
                >
                  <Box className="data-product__viewer__support-info__section__icon">
                    <QuestionCircleOutlineIcon />
                  </Box>
                  <Link
                    className="data-product__viewer__support-info__link"
                    href={supportInfo.faqUrl.url}
                  >
                    {supportInfo.faqUrl.label ?? supportInfo.faqUrl.url}
                    <ExternalLinkIcon />
                  </Link>
                </Grid>
              )}
            </Grid>
          ) : (
            <ProductWikiPlaceholder message="(support information not specified)" />
          )}
        </div>
      </div>
    );
  },
);
