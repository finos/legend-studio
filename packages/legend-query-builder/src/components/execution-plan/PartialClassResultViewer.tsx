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

import { observer } from 'mobx-react-lite';
import { PanelListItem, PanelDivider } from '@finos/legend-art';
import { type PartialClassResultType } from '@finos/legend-graph';

export const PartialClassResultTypeViewer: React.FC<{
  resultType: PartialClassResultType;
}> = observer((props) => {
  const { resultType } = props;

  return (
    <div className="query-builder__result__container">
      <PanelListItem className="query-builder__result__container__item__partial-class">
        Result type: PartialClass[{resultType.type.valueForSerialization ?? ''}]
      </PanelListItem>
      <PanelDivider />
      {
        <table className="query-builder__result__container__table--partial-class table">
          <thead>
            <tr>
              <th className="table__cell--left">Property</th>
              <th className="table__cell--left">Parameters</th>
            </tr>
          </thead>
          <tbody>
            {resultType.propertiesWithParameters.map((column) => (
              <tr key={column.property}>
                <td className="table__cell--left">{column.property}</td>
                <td className="table__cell--left">
                  {column.parameters.toString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      }
      <PanelDivider />
    </div>
  );
});
