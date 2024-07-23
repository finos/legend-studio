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
  ShareBoxIcon,
  type TooltipPlacement,
  Tooltip,
  ClickAwayListener,
} from '@finos/legend-art';
import {
  type AbstractProperty,
  type Type,
  type TaggedValue,
  DerivedProperty,
  getMultiplicityDescription,
  CORE_PURE_PATH,
  PURE_DOC_TAG,
} from '@finos/legend-graph';
import { useState } from 'react';
import type { QueryBuilderExplorerState } from '../../stores/explorer/QueryBuilderExplorerState.js';

export const QueryBuilderTaggedValueInfoTooltip: React.FC<{
  taggedValues: TaggedValue[];
}> = (props) => {
  const { taggedValues } = props;
  const [showMore, setShowMore] = useState(false);
  const toggleShowMoreButton: React.MouseEventHandler = (event) => {
    event.stopPropagation();
    setShowMore(!showMore);
  };
  const isDocTaggedValue = (val: TaggedValue): boolean =>
    val.tag.ownerReference.value.path === CORE_PURE_PATH.PROFILE_DOC &&
    val.tag.value.value === PURE_DOC_TAG;
  const documentation = taggedValues
    .filter((taggedValue) => isDocTaggedValue(taggedValue))
    .map((taggedValue) => taggedValue.value);
  const tagValuesExceptDoc = taggedValues.filter(
    (taggedValue) => !isDocTaggedValue(taggedValue),
  );

  const taggedValueCellRender = (taggedValue: TaggedValue): React.ReactNode => (
    <div
      className="query-builder__tooltip__item"
      key={`${taggedValue.tag.ownerReference.value.name}.${taggedValue.value}`}
    >
      <div className="query-builder__tooltip__item__label">
        {`${taggedValue.tag.ownerReference.value.name}.${taggedValue.tag.value.value}`}
      </div>
      <div className="query-builder__tooltip__item__value">
        {taggedValue.value}
      </div>
    </div>
  );

  return (
    <div>
      {tagValuesExceptDoc.length > 0 ? (
        <div className="query-builder__tooltip__item">
          <div className="query-builder__tooltip__item__label">
            Tagged Values
          </div>
          <div className="query-builder__tooltip__taggedValues">
            {taggedValues.slice(0, 1).map((taggedValue) => (
              <div
                className="query-builder__tooltip__combo"
                key={`${taggedValue.tag.ownerReference.value.name}.${taggedValue.value}`}
              >
                {taggedValueCellRender(taggedValue)}
                {taggedValues.length > 3 && (
                  <button
                    className="btn btn--dark query-builder__tooltip__taggedValues__show-btn"
                    onClick={toggleShowMoreButton}
                    title="Toggle button to show more/less"
                  >
                    {showMore ? 'Show Less' : 'Show More'}
                  </button>
                )}
              </div>
            ))}
            {taggedValues
              .slice(1, 3)
              .map((taggedValue) => taggedValueCellRender(taggedValue))}
            {showMore &&
              taggedValues
                .slice(3)
                .map((taggedValue) => taggedValueCellRender(taggedValue))}
          </div>
        </div>
      ) : (
        <>
          {Boolean(documentation.length) && (
            <div className="query-builder__tooltip__item">
              <div className="query-builder__tooltip__item__label">
                Documentation
              </div>
              <div className="query-builder__tooltip__item__value">
                {documentation.join('\n\n')}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

const QueryBuilderBaseInfoTooltip: React.FC<{
  title: string;
  data: {
    label: string;
    value: string;
    actionButton?: JSX.Element | undefined;
  }[];
  placement?: TooltipPlacement | undefined;
  children: React.ReactElement;
  footerElement?: React.ReactElement;
}> = (props) => {
  const { title, data, placement, children, footerElement } = props;

  const [open, setIsOpen] = useState(false);

  return (
    <ClickAwayListener onClickAway={() => setIsOpen(false)}>
      <div>
        <Tooltip
          arrow={true}
          {...(placement !== undefined ? { placement } : {})}
          classes={{
            tooltip: 'query-builder__tooltip',
            arrow: 'query-builder__tooltip__arrow',
            tooltipPlacementRight: 'query-builder__tooltip--right',
          }}
          open={open}
          onClose={() => setIsOpen(false)}
          TransitionProps={{
            // disable transition
            // NOTE: somehow, this is the only workaround we have, if for example
            // we set `appear = true`, the tooltip will jump out of position
            timeout: 0,
          }}
          disableFocusListener={true}
          disableHoverListener={true}
          disableTouchListener={true}
          title={
            <div className="query-builder__tooltip__content">
              <div className="query-builder__tooltip__header">{title}</div>
              {data.map((elem) => (
                <div key={elem.label} className="query-builder__tooltip__item">
                  <div className="query-builder__tooltip__item__label">
                    {elem.label}
                  </div>
                  <div className="query-builder__tooltip__item__value">
                    {elem.value}
                  </div>
                  {elem.actionButton}
                </div>
              ))}
              {footerElement}
            </div>
          }
        >
          <div
            onClick={(event: React.MouseEvent) => {
              setIsOpen(true);
              event.stopPropagation();
            }}
          >
            {children}
          </div>
        </Tooltip>
      </div>
    </ClickAwayListener>
  );
};

export const QueryBuilderPropertyInfoTooltip: React.FC<{
  title: string;
  property: AbstractProperty;
  path: string;
  isMapped: boolean;
  children: React.ReactElement;
  placement?: TooltipPlacement | undefined;
  type?: Type | undefined;
  explorerState?: QueryBuilderExplorerState | undefined;
}> = (props) => {
  const {
    title,
    property,
    path,
    isMapped,
    children,
    placement,
    type,
    explorerState,
  } = props;

  const data = [
    {
      label: 'Type',
      value: type?.path ?? property.genericType.value.rawType.path,
    },
    {
      label: 'Path',
      value: path,
      actionButton: explorerState ? (
        <div className="query-builder__tooltip__item__action">
          <button
            onClick={() => explorerState.highlightTreeNode(path)}
            title="Show in tree"
          >
            <ShareBoxIcon />
          </button>
        </div>
      ) : undefined,
    },
    {
      label: 'Multiplicity',
      value: getMultiplicityDescription(property.multiplicity),
    },
    {
      label: 'Derived Property',
      value: property instanceof DerivedProperty ? 'Yes' : 'No',
    },
    {
      label: 'Mapped',
      value: isMapped ? 'Yes' : 'No',
    },
  ];

  return (
    <QueryBuilderBaseInfoTooltip
      title={title}
      data={data}
      placement={placement}
      footerElement={
        <QueryBuilderTaggedValueInfoTooltip
          taggedValues={property.taggedValues}
        />
      }
    >
      {children}
    </QueryBuilderBaseInfoTooltip>
  );
};

export const QueryBuilderDerivationInfoTooltip: React.FC<{
  title: string;
  children: React.ReactElement;
  placement?: TooltipPlacement | undefined;
  type?: Type | undefined;
}> = (props) => {
  const { title, children, placement, type } = props;

  const data = [
    {
      label: 'Type',
      value: type?.path ?? 'undefined',
    },
  ];

  return (
    <QueryBuilderBaseInfoTooltip
      title={title}
      data={data}
      placement={placement}
    >
      {children}
    </QueryBuilderBaseInfoTooltip>
  );
};
