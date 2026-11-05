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
import { useCallback, useEffect, useRef, useState } from 'react';
import { IconButton } from '@mui/material';
import {
  ArrowRightCircleOutlineIcon,
  EmptyStarIcon,
  ExternalLinkIcon,
  MinusIcon,
  PlusIcon,
  RocketTakeoffOutlineIcon,
  StarIcon,
  clsx,
  useResizeDetector,
} from '@finos/legend-art';
import type {
  LegendMarketplaceDataAPIsStore,
  LegendServiceCardState,
} from '../../stores/dataAPIs/LegendMarketplaceDataAPIsStore.js';
import type { LegendServiceTreeNode } from '../../stores/dataAPIs/LegendServiceTree.js';

const ROW_HEIGHT_PX = 34;
const INDENT_PX = 20;
const OVERSCAN_ROWS = 10;
const FALLBACK_VIEWPORT_PX = 600;

const LegendServiceTreeRow = observer(
  (props: {
    node: LegendServiceTreeNode;
    top: number;
    store: LegendMarketplaceDataAPIsStore;
    onServiceClick: (serviceCardState: LegendServiceCardState) => void;
    onOpenGroup: (groupPath: string) => void;
    onLaunchService: ((service: LegendServiceCardState) => void) | undefined;
  }) => {
    const { node, top, store, onServiceClick, onOpenGroup, onLaunchService } =
      props;
    const isGroup = node.isGroup;
    const isExpanded = isGroup && store.isTreeGroupExpanded(node.path);

    const renderFavoriteButton = (
      service: LegendServiceCardState,
      idx: number,
    ): React.ReactNode => {
      const pattern = service.service.pattern;
      const isFavorite = store.isFavorite(pattern);
      return (
        <IconButton
          key={`${pattern}#${idx}`}
          className={clsx(
            'marketplace-legend-service-tree__action-btn marketplace-legend-service-tree__action-btn--favorite',
            isFavorite && 'marketplace-legend-service-tree__action-btn--active',
          )}
          onClick={() => store.toggleFavorite(pattern)}
          title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          aria-label={`${
            isFavorite ? 'Remove from favorites' : 'Add to favorites'
          }: ${service.title}`}
          aria-pressed={isFavorite}
          size="small"
        >
          {isFavorite ? <StarIcon /> : <EmptyStarIcon />}
        </IconButton>
      );
    };

    const renderServiceActions = (
      service: LegendServiceCardState,
      idx: number,
    ): React.ReactNode => (
      <span
        key={`${service.service.pattern}#${idx}`}
        className="marketplace-legend-service-tree__service"
      >
        {service.title !== node.label && (
          <span className="marketplace-legend-service-tree__title">
            {service.title}
          </span>
        )}
        <IconButton
          className="marketplace-legend-service-tree__action-btn marketplace-legend-service-tree__action-btn--details"
          onClick={() => onServiceClick(service)}
          title="View service details"
          aria-label={`View details: ${service.title}`}
          size="small"
        >
          <ExternalLinkIcon />
        </IconButton>
        {onLaunchService && (
          <IconButton
            className="marketplace-legend-service-tree__action-btn marketplace-legend-service-tree__action-btn--launch"
            onClick={() => onLaunchService(service)}
            title="Launch service"
            aria-label={`Launch service: ${service.title}`}
            size="small"
          >
            <RocketTakeoffOutlineIcon />
          </IconButton>
        )}
      </span>
    );

    return (
      <div
        role="treeitem"
        aria-expanded={isGroup ? isExpanded : undefined}
        aria-level={node.depth + 1}
        aria-posinset={node.siblingIndex + 1}
        aria-setsize={node.siblingCount}
        className={clsx('marketplace-legend-service-tree__row', {
          'marketplace-legend-service-tree__row--group': isGroup,
        })}
        style={{
          top,
          height: ROW_HEIGHT_PX,
          paddingLeft: node.depth * INDENT_PX,
        }}
      >
        {isGroup ? (
          <span className="marketplace-legend-service-tree__toggle">
            <button
              className="marketplace-legend-service-tree__toggle-btn"
              onClick={() => store.toggleTreeGroup(node.path)}
              title={isExpanded ? 'Collapse' : 'Expand'}
              aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${node.label}`}
            >
              <span className="marketplace-legend-service-tree__expander">
                {isExpanded ? <MinusIcon /> : <PlusIcon />}
              </span>
              <span className="marketplace-legend-service-tree__label">
                {node.label}
              </span>
            </button>
            <span className="marketplace-legend-service-tree__count">
              {node.serviceCount}
            </span>
          </span>
        ) : (
          <span className="marketplace-legend-service-tree__leaf">
            <span className="marketplace-legend-service-tree__label">
              {node.path}
            </span>
            {node.services.map(renderFavoriteButton)}
          </span>
        )}
        <span className="marketplace-legend-service-tree__actions">
          {isGroup && (
            <IconButton
              className="marketplace-legend-service-tree__action-btn marketplace-legend-service-tree__action-btn--open-group"
              onClick={() => onOpenGroup(node.path)}
              title="Show only this group"
              aria-label={`Go to ${node.label}`}
              size="small"
            >
              <ArrowRightCircleOutlineIcon />
            </IconButton>
          )}
          {node.services.map(renderServiceActions)}
        </span>
      </div>
    );
  },
);

/**
 * Only the rows inside the scroll viewport (plus a small overscan) are
 * mounted, so the cost of any click does not depend on how many services
 * are expanded.
 */
export const LegendServiceTreeView = observer(
  (props: {
    store: LegendMarketplaceDataAPIsStore;
    onServiceClick: (serviceCardState: LegendServiceCardState) => void;
    onOpenGroup: (groupPath: string) => void;
    onLaunchService?: ((service: LegendServiceCardState) => void) | undefined;
  }) => {
    const { store, onServiceClick, onOpenGroup, onLaunchService } = props;
    const rows = store.visibleTreeRows;
    const frameRef = useRef<number>(0);
    const { ref: scrollRef, height } = useResizeDetector<HTMLDivElement>();
    const [scrollTop, setScrollTop] = useState(0);
    const viewportHeight =
      height !== undefined && height > 0 ? height : FALLBACK_VIEWPORT_PX;

    useEffect(() => () => cancelAnimationFrame(frameRef.current), []);

    const onScroll = useCallback(() => {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = requestAnimationFrame(() =>
        setScrollTop(scrollRef.current?.scrollTop ?? 0),
      );
    }, [scrollRef]);

    const maxScrollTop = Math.max(
      0,
      rows.length * ROW_HEIGHT_PX - viewportHeight,
    );
    const effectiveScrollTop = Math.min(scrollTop, maxScrollTop);

    const first = Math.max(
      0,
      Math.floor(effectiveScrollTop / ROW_HEIGHT_PX) - OVERSCAN_ROWS,
    );
    const last = Math.min(
      rows.length,
      Math.ceil((effectiveScrollTop + viewportHeight) / ROW_HEIGHT_PX) +
        OVERSCAN_ROWS,
    );

    return (
      <div className="marketplace-legend-service-tree">
        <div className="marketplace-legend-service-tree__toolbar">
          <button
            className="marketplace-legend-service-tree__toolbar-btn"
            onClick={() => store.expandAllTreeGroups()}
          >
            Expand All
          </button>
          <button
            className="marketplace-legend-service-tree__toolbar-btn"
            onClick={() => store.collapseAllTreeGroups()}
          >
            Collapse All
          </button>
        </div>
        <div
          ref={scrollRef}
          role="tree"
          aria-label="Legend services"
          className="marketplace-legend-service-tree__viewport"
          onScroll={onScroll}
        >
          <div
            className="marketplace-legend-service-tree__canvas"
            style={{ height: rows.length * ROW_HEIGHT_PX }}
          >
            {rows.slice(first, last).map((node, idx) => (
              <LegendServiceTreeRow
                key={node.key}
                node={node}
                top={(first + idx) * ROW_HEIGHT_PX}
                store={store}
                onServiceClick={onServiceClick}
                onOpenGroup={onOpenGroup}
                onLaunchService={onLaunchService}
              />
            ))}
          </div>
        </div>
      </div>
    );
  },
);
