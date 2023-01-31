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
import type { TestAssertion } from '../../../graph/metamodel/pure/test/assertion/TestAssertion.js';
import type { AssertionStatus } from '../../../graph/metamodel/pure/test/assertion/status/AssertionStatus.js';
import type { AtomicTest } from '../../../graph/metamodel/pure/test/Test.js';
import type { PureProtocolProcessorPlugin } from './PureProtocolProcessorPlugin.js';
import type { V1_TestAssertion } from './v1/model/test/assertion/V1_TestAssertion.js';
import type { V1_AssertionStatus } from './v1/model/test/assertion/status/V1_AssertionStatus.js';
import type { V1_AtomicTest } from './v1/model/test/V1_AtomicTest.js';
import type { V1_GraphTransformerContext } from './v1/transformation/pureGraph/from/V1_GraphTransformerContext.js';
import type { V1_GraphBuilderContext } from './v1/transformation/pureGraph/to/V1_GraphBuilderContext.js';

export type V1_AtomicTestBuilder = (
  protocol: V1_AtomicTest,
  context: V1_GraphBuilderContext,
) => AtomicTest | undefined;

export type V1_TestableAssertion = (
  testable: AtomicTest,
  element: V1_AssertionStatus,
) => TestAssertion | undefined;

export type V1_AssertionStatusBuilder = (
  element: V1_AssertionStatus,
  atomicTest: AtomicTest,
  plugins: PureProtocolProcessorPlugin[],
) => AssertionStatus | undefined;

export type V1_AssertionStatusProtocolSerializer = (
  protocol: V1_AssertionStatus,
  plugins: PureProtocolProcessorPlugin[],
) => PlainObject<V1_AssertionStatus> | undefined;

export type V1_AssertionStatusProtocolDeserializer = (
  json: PlainObject<V1_AssertionStatus>,
  plugins: PureProtocolProcessorPlugin[],
) => V1_AssertionStatus | undefined;

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

export type V1_TestAssertionBuilder = (
  protocol: V1_TestAssertion,
  parentTest: AtomicTest | undefined,
  context: V1_GraphBuilderContext,
) => TestAssertion | undefined;

export type V1_TestAssertionTransformer = (
  metamodel: TestAssertion,
  context: V1_GraphTransformerContext,
) => V1_TestAssertion | undefined;

export type V1_TestAssertionProtocolSerializer = (
  protocol: V1_TestAssertion,
  plugins: PureProtocolProcessorPlugin[],
) => PlainObject<V1_TestAssertion> | undefined;

export type V1_TestAssertionProtocolDeserializer = (
  json: PlainObject<V1_TestAssertion>,
  plugins: PureProtocolProcessorPlugin[],
) => V1_TestAssertion | undefined;

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

  /**
   * Get the list of Assertion status builders.
   */
  V1_getExtraAssertionStatusBuilders?(): V1_AssertionStatusBuilder[];

  /**
   * Get the list of Assertion status protocol serializers.
   */
  V1_getExtraAssertionStatusProtocolSerializers?(): V1_AssertionStatusProtocolSerializer[];

  /**
   * Get the list of Assertion status protocol deserializers.
   */
  V1_getExtraAssertionStatusProtocolDeserializers?(): V1_AssertionStatusProtocolDeserializer[];

  /**
   * Get the list of Test assertion builders.
   */
  V1_getExtraTestAssertionBuilders?(): V1_TestAssertionBuilder[];

  /**
   * Get the list of Test assertion transformers.
   */
  V1_getExtraTestAssertionTransformers?(): V1_TestAssertionTransformer[];

  /**
   * Get the list of Test assertion protocol serializers.
   */
  V1_getExtraTestAssertionProtocolSerializers?(): V1_TestAssertionProtocolSerializer[];

  /**
   * Get the list of Test assertion protocol deserializers.
   */
  V1_getExtraTestAssertionProtocolDeserializers?(): V1_TestAssertionProtocolDeserializer[];
}
