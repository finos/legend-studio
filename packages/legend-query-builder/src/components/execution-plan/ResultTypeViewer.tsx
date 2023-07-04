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
import {
  type ResultType,
  TDSResultType,
  DataTypeResultType,
} from '@finos/legend-graph';
import { DataTypeResultTypeViewer } from './DataTypeResultTypeViewer.js';
import { TDSResultTypeViewer } from './TDSResultTypeViewer.js';

export const ResultTypeViewer: React.FC<{
  resultType: ResultType;
}> = observer((props) => {
  const { resultType } = props;
  if (resultType instanceof DataTypeResultType) {
    return <DataTypeResultTypeViewer resultType={resultType} />;
  } else if (resultType instanceof TDSResultType) {
    return <TDSResultTypeViewer resultType={resultType} />;
  } else {
    return <></>;
  }
});
