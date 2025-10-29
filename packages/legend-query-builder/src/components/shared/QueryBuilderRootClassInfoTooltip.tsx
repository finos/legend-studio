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

import { type TooltipPlacement, Tooltip } from '@finos/legend-art';
import { type Class } from '@finos/legend-graph';
import { QueryBuilderTaggedValueInfoTooltip } from './QueryBuilderPropertyInfoTooltip.js';

export const QueryBuilderRootClassInfoTooltip: React.FC<{
  _class: Class;
  children: React.ReactElement;
  placement?: TooltipPlacement | undefined;
}> = (props) => {
  const { _class, children, placement } = props;

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
            <div className="query-builder__tooltip__item__label">Type</div>
            <div className="query-builder__tooltip__item__value">Unknown</div>
          </div>
          <div className="query-builder__tooltip__item">
            <div className="query-builder__tooltip__item__label">Path</div>
            <div className="query-builder__tooltip__item__value">
              {_class.path}
            </div>
          </div>
          <QueryBuilderTaggedValueInfoTooltip
            taggedValues={_class.taggedValues}
          />
        </div>
      }
    >
      {children}
    </Tooltip>
  );
};
