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
import type { Connection } from '../../../../graph/metamodel/pure/packageableElements/connection/Connection.js';
import type { Mapping } from '../../../../graph/metamodel/pure/packageableElements/mapping/Mapping.js';
import type { MappingInclude } from '../../../../graph/metamodel/pure/packageableElements/mapping/MappingInclude.js';
import type { InstanceSetImplementation } from '../../../../graph/metamodel/pure/packageableElements/mapping/InstanceSetImplementation.js';
import type { PureProtocolProcessorPlugin } from '../PureProtocolProcessorPlugin.js';
import type { V1_Connection } from '../../pure/v1/model/packageableElements/connection/V1_Connection.js';
import type { V1_GraphTransformerContext } from '../v1/transformation/pureGraph/from/V1_GraphTransformerContext.js';
import type { V1_ClassMapping } from '../../pure/v1/model/packageableElements/mapping/V1_ClassMapping.js';
import type { V1_MappingInclude } from '../../pure/v1/model/packageableElements/mapping/V1_MappingInclude.js';
import type { V1_GraphBuilderContext } from '../v1/transformation/pureGraph/to/V1_GraphBuilderContext.js';
import type { Store } from '../../../../graph/metamodel/pure/packageableElements/store/Store.js';
import type { PackageableElementReference } from '../../../../graph/metamodel/pure/packageableElements/PackageableElementReference.js';
import type { V1_PropertyMapping } from '../v1/model/packageableElements/mapping/V1_PropertyMapping.js';
import type { PropertyMapping } from '../../../../graph/metamodel/pure/packageableElements/mapping/PropertyMapping.js';

export type V1_ClassMappingFirstPassBuilder = (
  classMapping: V1_ClassMapping,
  context: V1_GraphBuilderContext,
  parent: Mapping,
) => InstanceSetImplementation | undefined;

export type V1_ClassMappingSecondPassBuilder = (
  classMapping: V1_ClassMapping,
  context: V1_GraphBuilderContext,
  parent: Mapping,
) => void;

export type V1_ClassMappingTransformer = (
  setImplementation: InstanceSetImplementation,
  context: V1_GraphTransformerContext,
) => V1_ClassMapping | undefined;

export type PropertyMappingTransformationExcludabilityChecker = (
  propertyMapping: PropertyMapping,
) => boolean | undefined;

export type V1_ClassMappingSerializer = (
  value: V1_ClassMapping,
) => PlainObject<V1_ClassMapping> | undefined;

export type V1_ClassMappingDeserializer = (
  json: PlainObject<V1_ClassMapping>,
) => V1_ClassMapping | undefined;

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

export type V1_PropertyMappingBuilder = (
  connection: V1_PropertyMapping,
  context: V1_GraphBuilderContext,
) => PropertyMapping | undefined;

export type V1_PropertyMappingTransformer = (
  metamodel: PropertyMapping,
  context: V1_GraphTransformerContext,
) => V1_PropertyMapping | undefined;

export type V1_MappingIncludeBuilder = (
  protocol: V1_MappingInclude,
  parentMapping: Mapping,
  context: V1_GraphBuilderContext,
) => MappingInclude | undefined;

export type V1_MappingIncludeTransformer = (
  metamodel: MappingInclude,
  context: V1_GraphTransformerContext,
) => V1_MappingInclude | undefined;

export type V1_MappingIncludeProtocolSerializer = (
  protocol: V1_MappingInclude,
) => PlainObject<V1_MappingInclude> | undefined;

export type V1_MappingIncludeProtocolDeserializer = (
  json: PlainObject<V1_MappingInclude>,
) => V1_MappingInclude | undefined;

export type V1_MappingIncludeIdentifierBuilder = (
  protocol: V1_MappingInclude,
) => string | undefined;

export interface DSL_Mapping_PureProtocolProcessorPlugin_Extension
  extends PureProtocolProcessorPlugin {
  /**
   * Get the list of checkers which can be used to verify if the
   * specified property mapping can be excluded from transformation
   */
  getExtraPropertyMappingTransformationExcludabilityCheckers?(): PropertyMappingTransformationExcludabilityChecker[];

  V1_getExtraPropertyMappingBuilders?(): V1_PropertyMappingBuilder[];

  V1_getExtraPropertyMappingTransformers?(): V1_PropertyMappingTransformer[];

  V1_getExtraClassMappingFirstPassBuilders?(): V1_ClassMappingFirstPassBuilder[];

  V1_getExtraClassMappingSecondPassBuilders?(): V1_ClassMappingSecondPassBuilder[];

  V1_getExtraClassMappingTransformers?(): V1_ClassMappingTransformer[];

  V1_getExtraClassMappingSerializers?(): V1_ClassMappingSerializer[];

  V1_getExtraClassMappingDeserializers?(): V1_ClassMappingDeserializer[];

  V1_getExtraConnectionBuilders?(): V1_ConnectionBuilder[];

  V1_getExtraConnectionTransformers?(): V1_ConnectionTransformer[];

  V1_getExtraConnectionProtocolSerializers?(): V1_ConnectionProtocolSerializer[];

  V1_getExtraConnectionProtocolDeserializers?(): V1_ConnectionProtocolDeserializer[];

  V1_getExtraMappingIncludeBuilders?(): V1_MappingIncludeBuilder[];

  V1_getExtraMappingIncludeTransformers?(): V1_MappingIncludeTransformer[];

  V1_getExtraMappingIncludeProtocolSerializers?(): V1_MappingIncludeProtocolSerializer[];

  V1_getExtraMappingIncludeProtocolDeserializers?(): V1_MappingIncludeProtocolDeserializer[];

  V1_getExtraMappingIncludeIdentifierBuilders?(): V1_MappingIncludeIdentifierBuilder[];
}
