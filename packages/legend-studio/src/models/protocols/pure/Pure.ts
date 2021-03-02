/**
 * Copyright 2020 Goldman Sachs
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

import type { Logger } from '../../../utils/Logger';
import type { AbstractPureGraphManager } from '../../metamodels/pure/graph/AbstractPureGraphManager';
import { V1_PureGraphManager } from './v1/V1_PureGraphManager';
import type { PureProtocolProcessorPlugin } from './PureProtocolProcessorPlugin';
import type { PureGraphManagerPlugin } from '../../metamodels/pure/graph/PureGraphManagerPlugin';
import type { ServerClientConfig } from '@finos/legend-studio-network';

export const getGraphManager = (
  pureGraphManagerPlugins: PureGraphManagerPlugin[],
  pureProtocolProcessorPlugins: PureProtocolProcessorPlugin[],
  logger: Logger,
  engineClientConfig?: ServerClientConfig,
): AbstractPureGraphManager =>
  // NOTE: until we support more client versions, we always default to return V1
  new V1_PureGraphManager(
    pureGraphManagerPlugins,
    pureProtocolProcessorPlugins,
    logger,
    engineClientConfig ?? {},
  );
