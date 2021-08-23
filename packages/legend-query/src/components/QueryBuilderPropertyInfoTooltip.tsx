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

import type { TooltipProps } from '@material-ui/core';
import { Tooltip } from '@material-ui/core';
import { StubTransition } from '@finos/legend-art';
import type { AbstractProperty, Multiplicity } from '@finos/legend-graph';
import { DerivedProperty, MULTIPLICITY_INFINITE } from '@finos/legend-graph';

const getMultiplicityDescription = (multiplicity: Multiplicity): string => {
  if (multiplicity.lowerBound === multiplicity.upperBound) {
    return `[${multiplicity.lowerBound.toString()}] - Must have exactly ${multiplicity.lowerBound.toString()} value(s)`;
  } else if (
    multiplicity.lowerBound === 0 &&
    multiplicity.upperBound === undefined
  ) {
    return `[${MULTIPLICITY_INFINITE}] - May have many values`;
  }
  return `[${multiplicity.lowerBound}..${
    multiplicity.upperBound ?? MULTIPLICITY_INFINITE
  }] - ${
    multiplicity.upperBound
      ? `Must have from ${multiplicity.lowerBound} to ${multiplicity.upperBound} value(s)`
      : `Must have at least ${multiplicity.lowerBound} values(s)`
  }`;
};

export const QueryBuilderPropertyInfoTooltip: React.FC<{
  property: AbstractProperty;
  path: string;
  isMapped: boolean;
  children: React.ReactElement;
  placement: TooltipProps['placement'];
}> = (props) => {
  const { property, path, isMapped, children, placement } = props;
  return (
    <Tooltip
      arrow={true}
      placement={placement}
      classes={{
        tooltip: 'query-builder__tooltip',
        arrow: 'query-builder__tooltip__arrow',
        tooltipPlacementRight: 'query-builder__tooltip--right',
      }}
      TransitionComponent={StubTransition}
      title={
        <div className="query-builder__tooltip__content">
          <div className="query-builder__tooltip__item">
            <div className="query-builder__tooltip__item__label">Type</div>
            <div className="query-builder__tooltip__item__value">
              {property.genericType.value.rawType.path}
            </div>
          </div>
          <div className="query-builder__tooltip__item">
            <div className="query-builder__tooltip__item__label">Path</div>
            <div className="query-builder__tooltip__item__value">{path}</div>
          </div>
          <div className="query-builder__tooltip__item">
            <div className="query-builder__tooltip__item__label">
              Multiplicity
            </div>
            <div className="query-builder__tooltip__item__value">
              {getMultiplicityDescription(property.multiplicity)}
            </div>
          </div>
          <div className="query-builder__tooltip__item">
            <div className="query-builder__tooltip__item__label">
              Derived Property
            </div>
            <div className="query-builder__tooltip__item__value">
              {property instanceof DerivedProperty ? 'Yes' : 'No'}
            </div>
          </div>
          <div className="query-builder__tooltip__item">
            <div className="query-builder__tooltip__item__label">Mapped</div>
            <div className="query-builder__tooltip__item__value">
              {isMapped ? 'Yes' : 'No'}
            </div>
          </div>
        </div>
      }
    >
      {children}
    </Tooltip>
  );
};
