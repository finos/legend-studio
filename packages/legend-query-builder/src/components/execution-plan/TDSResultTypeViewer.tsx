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
import {
  PackageableElementImplicitReference,
  type TDSResultType,
} from '@finos/legend-graph';

export const TDSResultTypeViewer: React.FC<{
  resultType: TDSResultType;
}> = observer((props) => {
  const { resultType } = props;

  return (
    <div className="query-builder__result__container">
      <PanelListItem className="query-builder__result__container__item__tds">
        Result type: TDS
      </PanelListItem>
      <PanelDivider />
      {
        <table className="query-builder__result__container__table table">
          <thead>
            <tr>
              <th className="table__cell--left">Label</th>
              <th className="table__cell--left">Result DataType</th>
            </tr>
          </thead>
          <tbody>
            {resultType.tdsColumns.map((column) => (
              <tr key={column.name}>
                <td className="table__cell--left">{column.name}</td>
                <td className="table__cell--left">
                  {column.type instanceof PackageableElementImplicitReference &&
                    (column.type.input ?? '')}
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
