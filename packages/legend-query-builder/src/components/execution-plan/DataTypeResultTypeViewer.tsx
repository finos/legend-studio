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
  type DataTypeResultType,
} from '@finos/legend-graph';

export const DataTypeResultTypeViewer: React.FC<{
  resultType: DataTypeResultType;
}> = observer((props) => {
  const { resultType } = props;
  let type = '';
  if (resultType.type instanceof PackageableElementImplicitReference) {
    type = resultType.type.input ?? '';
  }

  if (type === '') {
    return <></>;
  }

  return (
    <div className="query-builder__result__container">
      <PanelListItem className="query-builder__result__container__item__data-type">
        <>
          <div className="query-builder__result__container__item__data-type__type">
            Result type:
          </div>
          <div className="query-builder__result__container__item__data-type__value">
            {type}
          </div>
        </>
      </PanelListItem>
      <PanelDivider />
    </div>
  );
});
