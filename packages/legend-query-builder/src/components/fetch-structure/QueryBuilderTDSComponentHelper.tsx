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
  StringTypeIcon,
  ToggleIcon,
  HashtagIcon,
  ClockIcon,
  type TooltipPlacement,
  Tooltip,
} from '@finos/legend-art';
import {
  type Type,
  Enumeration,
  PrimitiveType,
  PRIMITIVE_TYPE,
  getMultiplicityDescription,
} from '@finos/legend-graph';
import { returnUndefOnError } from '@finos/legend-shared';
import type { QueryBuilderAggregateColumnState } from '../../stores/fetch-structure/tds/aggregation/QueryBuilderAggregationState.js';
import { getColumnMultiplicity } from '../../stores/fetch-structure/tds/post-filter/operators/QueryBuilderPostFilterOperatorHelper.js';
import type { QueryBuilderTDSColumnState } from '../../stores/fetch-structure/tds/QueryBuilderTDSColumnState.js';

export const renderPropertyTypeIcon = (type: Type): React.ReactNode => {
  if (type instanceof PrimitiveType) {
    if (type.name === PRIMITIVE_TYPE.STRING) {
      return <StringTypeIcon className="query-builder-column-badge__icon" />;
    } else if (type.name === PRIMITIVE_TYPE.BOOLEAN) {
      return <ToggleIcon className="query-builder-column-badge__icon" />;
    } else if (
      type.name === PRIMITIVE_TYPE.NUMBER ||
      type.name === PRIMITIVE_TYPE.INTEGER ||
      type.name === PRIMITIVE_TYPE.FLOAT ||
      type.name === PRIMITIVE_TYPE.DECIMAL
    ) {
      return <HashtagIcon className="query-builder-column-badge__icon" />;
    } else if (
      type.name === PRIMITIVE_TYPE.DATE ||
      type.name === PRIMITIVE_TYPE.DATETIME ||
      type.name === PRIMITIVE_TYPE.STRICTDATE
    ) {
      return <ClockIcon className="query-builder-column-badge__icon" />;
    }
  } else if (type instanceof Enumeration) {
    return <div className="icon query-builder-column-badge__icon">E</div>;
  }
  return null;
};

export const QueryBuilderColumnInfoTooltip: React.FC<{
  columnState: QueryBuilderTDSColumnState | QueryBuilderAggregateColumnState;
  children: React.ReactElement;
  placement?: TooltipPlacement | undefined;
}> = (props) => {
  const { columnState, placement, children } = props;
  const type = columnState.getColumnType();
  const multiplicity = returnUndefOnError(() =>
    getColumnMultiplicity(columnState),
  );
  return (
    <Tooltip
      arrow={true}
      {...(placement !== undefined ? { placement } : {})}
      classes={{
        tooltip: 'query-builder__tooltip',
        arrow: 'query-builder__tooltip__arrow',
        tooltipPlacementRight: 'query-builder__tooltip--right',
      }}
      slotProps={{
        transition: {
          // disable transition
          // NOTE: somehow, this is the only workaround we have, if for example
          // we set `appear = true`, the tooltip will jump out of position
          timeout: 0,
        },
      }}
      title={
        <div className="query-builder__tooltip__content">
          <div className="query-builder__tooltip__item">
            <div className="query-builder__tooltip__item__label">Name</div>
            <div className="query-builder__tooltip__item__value">
              {columnState.columnName}
            </div>
          </div>
          <div className="query-builder__tooltip__item">
            <div className="query-builder__tooltip__item__label">Type</div>
            <div className="query-builder__tooltip__item__value">
              {type?.path}
            </div>
          </div>
          {multiplicity && (
            <div className="query-builder__tooltip__item">
              <div className="query-builder__tooltip__item__label">
                Multiplicity
              </div>
              <div className="query-builder__tooltip__item__value">
                {getMultiplicityDescription(multiplicity)}
              </div>
            </div>
          )}
        </div>
      }
    >
      {children}
    </Tooltip>
  );
};
