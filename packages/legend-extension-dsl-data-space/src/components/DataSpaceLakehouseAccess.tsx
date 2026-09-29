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

import { observer } from 'mobx-react-lite';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Button,
  ButtonGroup,
  IconButton,
  Menu,
  MenuItem,
  Tooltip,
} from '@mui/material';
import {
  CaretDownIcon,
  ExpandMoreIcon,
  RefreshIcon,
  clsx,
} from '@finos/legend-art';
import {
  extractElementNameFromPath,
  type V1_AccessPointGroup,
} from '@finos/legend-graph';
import {
  AccessPointGroupAccess,
  CollapsibleWikiSection,
  DataProductAPGAccessRequestControl,
  EntitlementsDataContractCreator,
  type DataProductAPGState,
} from '@finos/legend-extension-dsl-data-product';
import { type DataSpaceViewerState } from '../stores/DataSpaceViewerState.js';
import type { DataSpaceDataProductAccessState } from '../stores/DataSpaceDataProductAccessState.js';
import { DataSpaceMarkdownTextViewer } from './DataSpaceMarkdownTextViewer.js';
import { resolveOpenDataProductAction } from './DataSpaceExecutionContextViewer.js';
import {
  DATA_SPACE_VIEWER_ACTIVITY_MODE,
  generateAnchorForActivity,
} from '../stores/DataSpaceViewerNavigation.js';

const isEntitled = (access: AccessPointGroupAccess): boolean =>
  access === AccessPointGroupAccess.APPROVED ||
  access === AccessPointGroupAccess.ENTERPRISE;

const getBulkRequestTargetApgStates = (
  accessState: DataSpaceDataProductAccessState,
): DataProductAPGState[] => {
  const apgStates = accessState.dataProductViewerState?.apgStates ?? [];
  return apgStates.filter((state) => !isEntitled(state.access));
};

const getContractableApgStates = (
  accessState: DataSpaceDataProductAccessState,
): DataProductAPGState[] => {
  const apgStates = accessState.dataProductViewerState?.apgStates ?? [];
  return apgStates.filter(
    (state) => state.access !== AccessPointGroupAccess.ENTERPRISE,
  );
};

const DataSpaceLakehouseAccessRequestButton = observer(
  (props: {
    accessState: DataSpaceDataProductAccessState;
    onRequestForSelf: () => void;
    onRequestForOthers: () => void;
  }) => {
    const { accessState, onRequestForSelf, onRequestForOthers } = props;
    const buttonGroupRef = useRef<HTMLDivElement>(null);
    const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
    const apgStates = accessState.dataProductViewerState?.apgStates;
    if (!apgStates || apgStates.length === 0) {
      return null;
    }
    const total = apgStates.length;
    const entitled = apgStates.filter((state) =>
      isEntitled(state.access),
    ).length;
    const pending = apgStates.filter(
      (state) =>
        state.access === AccessPointGroupAccess.SUBMITTED_FOR_APPROVALS ||
        state.access === AccessPointGroupAccess.PENDING_MANAGER_APPROVAL ||
        state.access === AccessPointGroupAccess.PENDING_DATA_OWNER_APPROVAL,
    ).length;
    const hasAllAccess = entitled >= total;
    const requestableTargets = getBulkRequestTargetApgStates(accessState);
    const primaryDisabled = hasAllAccess || requestableTargets.length === 0;
    const forOthersTargets = getContractableApgStates(accessState);
    const showForOthers = forOthersTargets.length > 0;
    const primaryTooltip = hasAllAccess
      ? `You have access to all ${total} Access Point Group${total === 1 ? '' : 's'} under this Data Product required to access this DataSpace.`
      : `Request access to the Access Point Groups under this Data Product required to access this DataSpace. ${entitled} of ${total} granted${pending > 0 ? `, ${pending} pending approval` : ''}.`;
    return (
      <>
        <ButtonGroup
          variant="contained"
          color={hasAllAccess ? 'success' : 'primary'}
          ref={buttonGroupRef}
          className="data-space__viewer__lakehouse-access__group__request-btn"
        >
          <Tooltip title={primaryTooltip} arrow={true}>
            <span>
              <Button
                disabled={!hasAllAccess && primaryDisabled}
                onClick={hasAllAccess ? undefined : onRequestForSelf}
                sx={{
                  height: '100%',
                  cursor: hasAllAccess ? 'default' : undefined,
                  borderTopRightRadius: showForOthers ? 0 : undefined,
                  borderBottomRightRadius: showForOthers ? 0 : undefined,
                }}
              >
                {hasAllAccess
                  ? 'Access Granted'
                  : `Request Access (${entitled} / ${total})`}
              </Button>
            </span>
          </Tooltip>
          {showForOthers && (
            <Button
              size="small"
              onClick={() => setIsMenuOpen((prev) => !prev)}
              title="More options"
            >
              <CaretDownIcon />
            </Button>
          )}
        </ButtonGroup>
        {showForOthers && (
          <Menu
            anchorEl={buttonGroupRef.current}
            open={isMenuOpen}
            onClose={() => setIsMenuOpen(false)}
          >
            <MenuItem
              onClick={() => {
                onRequestForOthers();
                setIsMenuOpen(false);
              }}
            >
              Request Access for Others
            </MenuItem>
          </Menu>
        )}
      </>
    );
  },
);

const DataSpaceLakehouseAccessGroup = observer(
  (props: {
    viewerState: DataSpaceViewerState;
    dataProductPath: string;
    initiallyCollapsed: boolean;
  }) => {
    const { viewerState, dataProductPath, initiallyCollapsed } = props;
    const [isCollapsed, setIsCollapsed] = useState<boolean>(initiallyCollapsed);
    const [bulkRequestMode, setBulkRequestMode] = useState<
      'self' | 'others' | undefined
    >(undefined);
    const accessState = viewerState.getDataProductAccessState(dataProductPath);
    const isReadOnly = accessState === undefined;
    const readOnlyApgIds: string[] = useMemo(() => {
      if (!isReadOnly) {
        return [];
      }
      const dp =
        viewerState.graphManagerState.graph.getOwnNullableDataProduct(
          dataProductPath,
        );
      return dp?.accessPointGroups.map((group) => group.id) ?? [];
    }, [dataProductPath, isReadOnly, viewerState.graphManagerState.graph]);
    const tokenProvider =
      viewerState.mappingProviderAccessConfig?.tokenProvider ??
      ((): undefined => undefined);
    const apgStates = accessState?.dataProductViewerState?.apgStates ?? [];
    const isLoading = accessState?.initializingState.isInProgress ?? false;
    const hasError =
      accessState?.errorMessage !== undefined && apgStates.length === 0;
    const displayedCount = isReadOnly
      ? readOnlyApgIds.length
      : apgStates.length;

    const bulkTargetApgStates = accessState
      ? bulkRequestMode === 'others'
        ? getContractableApgStates(accessState)
        : getBulkRequestTargetApgStates(accessState)
      : [];
    const bulkTargetApgs: V1_AccessPointGroup[] = bulkTargetApgStates.map(
      (state) => state.apg,
    );

    const representativeApgState: DataProductAPGState | undefined =
      bulkTargetApgStates[0];

    const onOpenDataProduct = resolveOpenDataProductAction(
      viewerState,
      dataProductPath,
    );

    return (
      <div className="data-space__viewer__lakehouse-access__group">
        <div className="data-space__viewer__lakehouse-access__group__header-row">
          <button
            className="data-space__viewer__lakehouse-access__group__caret-btn"
            tabIndex={-1}
            onClick={(): void => setIsCollapsed((prev) => !prev)}
            title={isCollapsed ? 'Expand' : 'Collapse'}
          >
            <ExpandMoreIcon
              className={clsx(
                'data-space__viewer__lakehouse-access__group__caret',
                {
                  'data-space__viewer__lakehouse-access__group__caret--collapsed':
                    isCollapsed,
                },
              )}
            />
          </button>
          <div className="data-space__viewer__lakehouse-access__group__header">
            {onOpenDataProduct ? (
              <button
                type="button"
                className="data-space__viewer__lakehouse-access__group__label data-space__viewer__lakehouse-access__group__label--clickable"
                title={`Open Data Product: ${dataProductPath}`}
                onClick={onOpenDataProduct}
              >
                {extractElementNameFromPath(dataProductPath)}
              </button>
            ) : (
              <span
                className="data-space__viewer__lakehouse-access__group__label"
                title={dataProductPath}
              >
                {extractElementNameFromPath(dataProductPath)}
              </span>
            )}
            <span className="data-space__viewer__lakehouse-access__group__count">
              {displayedCount}
            </span>
          </div>
          {!isReadOnly && (
            <div className="data-space__viewer__lakehouse-access__group__actions">
              {!hasError && (
                <DataSpaceLakehouseAccessRequestButton
                  accessState={accessState}
                  onRequestForSelf={(): void => setBulkRequestMode('self')}
                  onRequestForOthers={(): void => setBulkRequestMode('others')}
                />
              )}
              <IconButton
                className="data-space__viewer__lakehouse-access__group__refresh-btn"
                size="small"
                color="primary"
                title="Refresh Data Product access"
                disabled={accessState.initializingState.isInProgress}
                onClick={(): void =>
                  viewerState.refreshDataProductAccessState(dataProductPath)
                }
              >
                <RefreshIcon />
              </IconButton>
            </div>
          )}
        </div>
        {!isCollapsed && (
          <div className="data-space__viewer__lakehouse-access__group__rows">
            {isReadOnly ? (
              readOnlyApgIds.length === 0 ? (
                <div className="data-space__viewer__lakehouse-access__row">
                  <span className="data-space__viewer__lakehouse-access__row__unavailable">
                    Data Product is not available in the local project — Access
                    Point Groups cannot be listed in preview.
                  </span>
                </div>
              ) : (
                readOnlyApgIds.map((apgId) => (
                  <div
                    key={apgId}
                    className="data-space__viewer__lakehouse-access__row"
                  >
                    <span
                      className="data-space__viewer__lakehouse-access__row__apg"
                      title={apgId}
                    >
                      {apgId}
                    </span>
                  </div>
                ))
              )
            ) : hasError ? (
              <div
                className="data-space__viewer__lakehouse-access__row"
                title={accessState.errorMessage}
              >
                <span className="data-space__viewer__lakehouse-access__row__unavailable">
                  Unavailable
                </span>
              </div>
            ) : isLoading && apgStates.length === 0 ? (
              <div className="data-space__viewer__lakehouse-access__row">
                <span className="data-space__viewer__lakehouse-access__row__loading">
                  Loading...
                </span>
              </div>
            ) : (
              apgStates.map((apgState) => (
                <div
                  key={apgState.apg.id}
                  className="data-space__viewer__lakehouse-access__row"
                >
                  <span
                    className="data-space__viewer__lakehouse-access__row__apg"
                    title={apgState.apg.id}
                  >
                    {apgState.apg.id}
                  </span>
                  <div className="data-space__viewer__lakehouse-access__row__actions">
                    {accessState.dataAccessState && (
                      <DataProductAPGAccessRequestControl
                        apgState={apgState}
                        dataAccessState={accessState.dataAccessState}
                        tokenProvider={tokenProvider}
                      />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
        {bulkRequestMode !== undefined &&
          accessState?.dataAccessState &&
          representativeApgState &&
          bulkTargetApgs.length > 0 && (
            <EntitlementsDataContractCreator
              open={true}
              onClose={(): void => setBulkRequestMode(undefined)}
              tokenProvider={tokenProvider}
              apgState={representativeApgState}
              dataAccessState={accessState.dataAccessState}
              overrideTargetApgs={bulkTargetApgs}
              headerContent={
                <>
                  Submit access request for{' '}
                  <span className="marketplace-lakehouse-text__emphasis">
                    {bulkTargetApgs.length}
                  </span>{' '}
                  Access Point Group
                  {bulkTargetApgs.length === 1 ? '' : 's'} in{' '}
                  <span className="marketplace-lakehouse-text__emphasis">
                    {accessState.dataAccessState.dataProductViewerState.product
                      .title ?? extractElementNameFromPath(dataProductPath)}
                  </span>{' '}
                  Data Product
                </>
              }
            />
          )}
      </div>
    );
  },
);

const DataSpaceLakehouseAccessPanel = observer(
  (props: {
    viewerState: DataSpaceViewerState;
    dataProductPaths: string[];
  }) => {
    const { viewerState, dataProductPaths } = props;
    return (
      <>
        <div className="data-space__viewer__lakehouse-access__description">
          <DataSpaceMarkdownTextViewer
            value={
              "The following Data Products are required to access this DataSpace. Products you don't have access to can be requested below."
            }
          />
        </div>
        <div className="data-space__viewer__lakehouse-access">
          <div className="data-space__viewer__lakehouse-access__header">
            Data Product Access
          </div>
          {dataProductPaths.map((dataProductPath) => (
            <DataSpaceLakehouseAccessGroup
              key={dataProductPath}
              viewerState={viewerState}
              dataProductPath={dataProductPath}
              initiallyCollapsed={true}
            />
          ))}
        </div>
      </>
    );
  },
);

export const DataSpaceLakehouseAccess = observer(
  (props: { dataSpaceViewerState: DataSpaceViewerState }) => {
    const { dataSpaceViewerState } = props;
    const sectionRef = useRef<HTMLDivElement>(null);
    const anchor = generateAnchorForActivity(
      DATA_SPACE_VIEWER_ACTIVITY_MODE.DATASPACE_LAKEHOUSE_ACCESS,
    );

    useEffect(() => {
      if (sectionRef.current) {
        dataSpaceViewerState.layoutState.setWikiPageAnchor(
          anchor,
          sectionRef.current,
        );
      }
      return () => dataSpaceViewerState.layoutState.unsetWikiPageAnchor(anchor);
    }, [dataSpaceViewerState, anchor]);

    const dataProductPaths = dataSpaceViewerState.referencedDataProductPaths;

    if (dataProductPaths.length === 0) {
      return null;
    }

    return (
      <div ref={sectionRef} className="viewer__wiki__section">
        <CollapsibleWikiSection
          viewerState={dataSpaceViewerState}
          section={DATA_SPACE_VIEWER_ACTIVITY_MODE.DATASPACE_LAKEHOUSE_ACCESS}
        >
          <div className="viewer__wiki__section__content">
            <DataSpaceLakehouseAccessPanel
              viewerState={dataSpaceViewerState}
              dataProductPaths={dataProductPaths}
            />
          </div>
        </CollapsibleWikiSection>
      </div>
    );
  },
);
