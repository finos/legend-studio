/**
 * Copyright 2020 Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import React from 'react';
import Tooltip from '@material-ui/core/Tooltip';
import { FaAsterisk } from 'react-icons/fa';
import { MULTIPLICITY_INFINITE } from 'MetaModelConst';
import { Multiplicity } from 'MM/model/packageableElements/domain/Multiplicity';

export const MultiplicityBadge: React.FC<{
  multiplicity: Multiplicity;
}> = props => {
  const { multiplicity } = props;
  const isRequired = multiplicity.lowerBound && multiplicity.lowerBound > 0;
  const tooltipText = `${isRequired ? '[required]' : '[optional]'}${isRequired ? ` minimum: ${multiplicity.lowerBound}` : ''} maximum: ${multiplicity.upperBound ?? MULTIPLICITY_INFINITE}`;

  return (
    <Tooltip
      enterDelay={500}
      title={tooltipText}
      placement="top-end"
    >
      <div className={`multiplicity-badge ${isRequired ? 'multiplicity-badge--required' : ''}`}>
        {multiplicity.upperBound ? null : <FaAsterisk />}
      </div>
    </Tooltip>
  );
};
