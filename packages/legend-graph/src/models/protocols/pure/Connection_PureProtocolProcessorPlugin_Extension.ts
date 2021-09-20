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

import type { PlainObject } from '@finos/legend-shared';
import type { Connection } from '../../metamodels/pure/packageableElements/connection/Connection';
import { PureProtocolProcessorPlugin } from './PureProtocolProcessorPlugin';
import type { V1_Connection } from '../pure/v1/model/packageableElements/connection/V1_Connection';
import type { V1_GraphTransformerContext } from './v1/transformation/pureGraph/from/V1_GraphTransformerContext';
import type { V1_GraphBuilderContext } from './v1/transformation/pureGraph/to/V1_GraphBuilderContext';
import type { Store } from '../../metamodels/pure/packageableElements/store/Store';
import type { PackageableElementReference } from '../../metamodels/pure/packageableElements/PackageableElementReference';

export type V1_ConnectionBuilder = (
  connection: V1_Connection,
  context: V1_GraphBuilderContext,
  store?: PackageableElementReference<Store> | undefined,
) => Connection | undefined;

export type V1_ConnectionTransformer = (
  metamodel: Connection,
  context: V1_GraphTransformerContext,
) => V1_Connection | undefined;

export type V1_ConnectionProtocolSerializer = (
  connection: V1_Connection,
) => PlainObject<V1_Connection> | undefined;

export type V1_ConnectionProtocolDeserializer = (
  json: PlainObject<V1_Connection>,
) => V1_Connection | undefined;

export abstract class Connection_PureProtocolProcessorPlugin_Extension
  extends PureProtocolProcessorPlugin {
  V1_getExtraConnectionBuilders?(): V1_ConnectionBuilder[];

  V1_getExtraConnectionTransformers?(): V1_ConnectionTransformer[];

  V1_getExtraConnectionProtocolSerializers?(): V1_ConnectionProtocolSerializer[];

  V1_getExtraConnectionProtocolDeserializers?(): V1_ConnectionProtocolDeserializer[];
}
