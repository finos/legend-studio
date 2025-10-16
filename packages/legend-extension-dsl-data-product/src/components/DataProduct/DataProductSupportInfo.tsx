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
  EnvelopeOutlineIcon,
  ExternalLinkIcon,
  HeadsetIcon,
  QuestionCircleOutlineIcon,
  WorldOutlineIcon,
} from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import { Fragment, useEffect, useRef } from 'react';
import { Box, Grid2 as Grid, Link } from '@mui/material';
import type { DataProductViewerState } from '../../stores/DataProduct/DataProductViewerState.js';
import {
  generateAnchorForSection,
  DATA_PRODUCT_VIEWER_SECTION,
} from '../../stores/ProductViewerNavigation.js';
import { ProductWikiPlaceholder } from '../ProductWiki.js';

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
      <div ref={sectionRef} className="data-product__viewer__wiki__section">
        <div className="data-product__viewer__wiki__section__header">
          <div className="data-product__viewer__wiki__section__header__label">
            Support
            <button
              className="data-product__viewer__wiki__section__header__anchor"
              tabIndex={-1}
              onClick={() => dataProductViewerState.changeZone(anchor, true)}
            >
              <AnchorLinkIcon />
            </button>
          </div>
        </div>
        <div className="data-product__viewer__wiki__section__content">
          {doesSupportInfoExist ? (
            <Grid
              container={true}
              spacing={3}
              columns={2}
              className="data-product__viewer__support-info_container"
            >
              {supportInfo.emails.length > 0 && (
                <Grid
                  size={1}
                  className="data-product__viewer__support-info__section"
                >
                  <Box className="data-product__viewer__support-info__section__icon">
                    <EnvelopeOutlineIcon />
                  </Box>
                  {supportInfo.emails.map((email, index) => (
                    <Fragment key={email.hashCode}>
                      <Link
                        key={email.address}
                        className="data-product__viewer__support-info__link"
                        href={`mailto:${email.address}`}
                      >
                        {email.title}
                        <ExternalLinkIcon />
                      </Link>
                      {index < supportInfo.emails.length - 1 ? ', ' : null}
                    </Fragment>
                  ))}
                </Grid>
              )}
              {supportInfo.documentation !== undefined && (
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
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {supportInfo.documentation.label ??
                      supportInfo.documentation.url}
                    <ExternalLinkIcon />
                  </Link>
                </Grid>
              )}
              {supportInfo.supportUrl !== undefined && (
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
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {supportInfo.supportUrl.label ?? supportInfo.supportUrl.url}
                    <ExternalLinkIcon />
                  </Link>
                </Grid>
              )}
              {supportInfo.website !== undefined && (
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
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {supportInfo.website.label ?? supportInfo.website.url}
                    <ExternalLinkIcon />
                  </Link>
                </Grid>
              )}
              {supportInfo.faqUrl !== undefined && (
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
                    target="_blank"
                    rel="noopener noreferrer"
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
