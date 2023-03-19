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
import type { TestAssertion } from '../../../../graph/metamodel/pure/test/assertion/TestAssertion.js';
import type { AtomicTest } from '../../../../graph/metamodel/pure/test/Test.js';
import type { PureProtocolProcessorPlugin } from '../PureProtocolProcessorPlugin.js';
import type { V1_AssertionStatus } from '../v1/model/test/assertion/status/V1_AssertionStatus.js';
import type { V1_AtomicTest } from '../v1/model/test/V1_AtomicTest.js';
import type { V1_GraphTransformerContext } from '../v1/transformation/pureGraph/from/V1_GraphTransformerContext.js';
import type { V1_GraphBuilderContext } from '../v1/transformation/pureGraph/to/V1_GraphBuilderContext.js';

export type V1_AtomicTestBuilder = (
  protocol: V1_AtomicTest,
  context: V1_GraphBuilderContext,
) => AtomicTest | undefined;

export type V1_TestableAssertion = (
  testable: AtomicTest,
  element: V1_AssertionStatus,
) => TestAssertion | undefined;

export type V1_AtomicTestTransformer = (
  metamodel: AtomicTest,
  context: V1_GraphTransformerContext,
) => V1_AtomicTest | undefined;

export type V1_AtomicTestProtocolSerializer = (
  protocol: V1_AtomicTest,
  plugins: PureProtocolProcessorPlugin[],
) => PlainObject<V1_AtomicTest> | undefined;

export type V1_AtomicTestProtocolDeserializer = (
  json: PlainObject<V1_AtomicTest>,
  plugins: PureProtocolProcessorPlugin[],
) => V1_AtomicTest | undefined;

export interface Testable_PureProtocolProcessorPlugin_Extension
  extends PureProtocolProcessorPlugin {
  /**
   * Get the list of Atomic test builders.
   */
  V1_getExtraAtomicTestBuilders?(): V1_AtomicTestBuilder[];

  /**
   * Get the list of Atomic test transformers.
   */
  V1_getExtraAtomicTestTransformers?(): V1_AtomicTestTransformer[];

  /**
   * Get the list of Atomic test protocol serializers.
   */
  V1_getExtraAtomicTestProtocolSerializers?(): V1_AtomicTestProtocolSerializer[];

  /**
   * Get the list of Atomic test protocol deserializers.
   */
  V1_getExtraAtomicTestProtocolDeserializers?(): V1_AtomicTestProtocolDeserializer[];

  /**
   * Get the list of Testable assertion builders.
   */
  V1_getExtraTestableAssertionBuilders?(): V1_TestableAssertion[];
}
