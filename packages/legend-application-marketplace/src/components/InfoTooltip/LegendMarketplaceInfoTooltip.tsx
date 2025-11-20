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

import { clsx, InfoCircleIcon } from '@finos/legend-art';
import { Tooltip } from '@mui/material';

export const LegendMarketplaceInfoTooltip = (props: {
  title: string;
  className?: string | undefined;
}) => {
  const { title, className } = props;

  return (
    <Tooltip
      className={clsx('legend-marketplace__info-tooltip__icon', className)}
      title={title}
      slotProps={{
        tooltip: {
          className: 'legend-marketplace__info-tooltip__content',
        },
      }}
    >
      <InfoCircleIcon />
    </Tooltip>
  );
};
