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

import { UnsupportedOperationError } from 'Utilities/GeneralUtil';
import { CLIENT_VERSION } from 'MetaModelConst';
import { AbstractPureGraphManager } from 'MM/AbstractPureGraphManager';
import { PureGraphManager as V1_PureGraphManager } from 'V1/transformation/pureGraph/PureGraphManager';

export const getGraphManager = (protocolVersion: CLIENT_VERSION): AbstractPureGraphManager => {
  switch (protocolVersion) {
    case CLIENT_VERSION.V1_0_0: return new V1_PureGraphManager();
    default: throw new UnsupportedOperationError(`Unsupported PURE protocol ${protocolVersion}`);
  }
};
