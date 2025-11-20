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
  StackOverflowIcon,
  UserCircleIcon,
  WorldOutlineIcon,
} from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import { Fragment, useEffect, useRef, useState } from 'react';
import { Avatar, Box, Grid, Link, Stack } from '@mui/material';
import type { DataProductViewerState } from '../../stores/DataProduct/DataProductViewerState.js';
import {
  generateAnchorForSection,
  DATA_PRODUCT_VIEWER_SECTION,
} from '../../stores/ProductViewerNavigation.js';
import { ProductWikiPlaceholder } from '../ProductWiki.js';

enum SUPPORT_TYPE {
  DOCUMENTATION = 'DOCUMENTATION',
  WEBSITE = 'WEBSITE',
  SUPPORT = 'SUPPORT',
  FAQ = 'FAQ',
  EMAILS = 'EMAILS',
}

enum KNOWN_SUPPORT_SITES {
  STACK_OVERFLOW = 'stackenterprise.co',
}

const getIconFromUrlandSupportType = (
  type: SUPPORT_TYPE,
  url: string | undefined,
) => {
  if (url?.includes(KNOWN_SUPPORT_SITES.STACK_OVERFLOW)) {
    return <StackOverflowIcon />;
  }
  switch (type) {
    case SUPPORT_TYPE.DOCUMENTATION:
      return <DocumentIcon />;
    case SUPPORT_TYPE.WEBSITE:
      return <WorldOutlineIcon />;
    case SUPPORT_TYPE.SUPPORT:
      return <HeadsetIcon />;
    case SUPPORT_TYPE.FAQ:
      return <QuestionCircleOutlineIcon />;
    case SUPPORT_TYPE.EMAILS:
      return <EnvelopeOutlineIcon />;
    default:
      return <HeadsetIcon />;
  }
};
import { assertErrorThrown, LegendUser } from '@finos/legend-shared';

const ExpertDisplay = observer(
  (props: {
    dataproductViewerState: DataProductViewerState;
    expertId: string;
  }) => {
    const { dataproductViewerState, expertId } = props;
    const [userInfo, setUserInfo] = useState<LegendUser | null>(null);
    const imgSrc =
      dataproductViewerState.userSearchService?.userProfileImageUrl?.replace(
        '{userId}',
        expertId,
      );

    useEffect(() => {
      const fetchEmail = async () => {
        try {
          const userData =
            await dataproductViewerState.userSearchService?.getOrFetchUser(
              expertId,
            );
          if (userData instanceof LegendUser) {
            setUserInfo(userData);
          }
        } catch (error) {
          assertErrorThrown(error);
          dataproductViewerState.applicationStore.notificationService.notifyError(
            `Failed to fetch user data: ${error}`,
          );
        }
      };

      // eslint-disable-next-line no-void
      void fetchEmail();
    }, [expertId, dataproductViewerState]);

    return (
      <>
        {userInfo !== null && (
          <div className="data-product__viewer__wiki__expert-contact">
            {imgSrc ? (
              <Avatar
                className="legend-user-display__avatar legend-user-display__avatar--image"
                src={imgSrc}
                alt={expertId}
              />
            ) : (
              <UserCircleIcon />
            )}
            <div className="data-product__viewer__wiki__expert-contact__info">
              <a
                className="data-product__viewer__wiki__expert-contact__info__id"
                href={`mailto:${userInfo.email}`}
              >
                {userInfo.firstName} {userInfo.lastName} <EnvelopeOutlineIcon />
              </a>
              <div className="data-product__viewer__wiki__expert-contact__info__subtitle">
                {userInfo.divisionName}
              </div>
            </div>
          </div>
        )}
      </>
    );
  },
);

export const DataProductSupportInfo = observer(
  (props: { dataProductViewerState: DataProductViewerState }) => {
    const { dataProductViewerState } = props;
    const sectionRef = useRef<HTMLDivElement>(null);

    const anchor = generateAnchorForSection(
      DATA_PRODUCT_VIEWER_SECTION.SUPPORT_INFO,
    );

    const supportInfo = dataProductViewerState.product.supportInfo;
    const expertise = supportInfo?.expertise;
    const doesSupportInfoExist =
      (supportInfo !== undefined &&
        (supportInfo.emails.length > 0 ||
          supportInfo.documentation ||
          supportInfo.website ||
          supportInfo.faqUrl ||
          supportInfo.supportUrl)) ||
      (expertise !== undefined && expertise.length > 0);

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
              {supportInfo?.emails && supportInfo.emails.length > 0 && (
                <Grid
                  size={1}
                  className="data-product__viewer__support-info__section"
                >
                  <Box className="data-product__viewer__support-info__section__icon">
                    {getIconFromUrlandSupportType(
                      SUPPORT_TYPE.EMAILS,
                      undefined,
                    )}
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
              {supportInfo?.documentation !== undefined && (
                <Grid
                  size={1}
                  className="data-product__viewer__support-info__section"
                >
                  <Box className="data-product__viewer__support-info__section__icon">
                    {getIconFromUrlandSupportType(
                      SUPPORT_TYPE.DOCUMENTATION,
                      supportInfo.documentation.url,
                    )}
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
              {supportInfo?.supportUrl !== undefined && (
                <Grid
                  size={1}
                  className="data-product__viewer__support-info__section"
                >
                  <Box className="data-product__viewer__support-info__section__icon">
                    {getIconFromUrlandSupportType(
                      SUPPORT_TYPE.SUPPORT,
                      supportInfo.supportUrl.url,
                    )}
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
              {supportInfo?.website !== undefined && (
                <Grid
                  size={1}
                  className="data-product__viewer__support-info__section"
                >
                  <Box className="data-product__viewer__support-info__section__icon">
                    {getIconFromUrlandSupportType(
                      SUPPORT_TYPE.WEBSITE,
                      supportInfo.website.url,
                    )}
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
              {supportInfo?.faqUrl !== undefined && (
                <Grid
                  size={1}
                  className="data-product__viewer__support-info__section"
                >
                  <Box className="data-product__viewer__support-info__section__icon">
                    {getIconFromUrlandSupportType(
                      SUPPORT_TYPE.FAQ,
                      supportInfo.faqUrl.url,
                    )}
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
              {expertise !== undefined && expertise.length > 0 && (
                <Grid
                  size={2}
                  className="data-product__viewer__support-info__expertise"
                >
                  <div className="data-product__viewer__wiki__section__header__subtitle">
                    Expertise
                  </div>
                  {expertise.map((exp) => (
                    <div
                      className="data-product__viewer__wiki__expertise"
                      key={exp.uuid}
                    >
                      {exp.description}
                      <Stack direction="row" spacing={2}>
                        {exp.expertIds?.map((expertId) => (
                          <ExpertDisplay
                            dataproductViewerState={dataProductViewerState}
                            expertId={expertId}
                            key={expertId}
                          />
                        ))}
                      </Stack>
                    </div>
                  ))}
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
