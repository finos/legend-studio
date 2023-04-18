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

import { test, expect } from '@jest/globals';
import { type Clazz, UnsupportedOperationError } from '@finos/legend-shared';
import { unitTest } from '@finos/legend-shared/test';
import {
  type PackageableElementVisitor,
  PackageableElement,
} from '../../../../../../../../graph/metamodel/pure/packageableElements/PackageableElement.js';
import { PureProtocolProcessorPlugin } from '../../../../../PureProtocolProcessorPlugin.js';
import {
  type V1_PackageableElementVisitor,
  V1_PackageableElement,
} from '../../../../model/packageableElements/V1_PackageableElement.js';
import { V1_ElementBuilder } from '../V1_ElementBuilder.js';
import type { V1_GraphBuilderContext } from '../V1_GraphBuilderContext.js';
import { V1_GraphBuilderExtensions } from '../V1_GraphBuilderExtensions.js';

class TestElement extends V1_PackageableElement {
  accept_PackageableElementVisitor<T>(
    visitor: V1_PackageableElementVisitor<T>,
  ): T {
    return visitor.visit_PackageableElement(this);
  }
}

class TestElement12 extends TestElement {}
class TestElement345 extends TestElement {}
class TestElement1 extends TestElement12 {}
class TestElement2 extends TestElement12 {}
class TestElement3 extends TestElement345 {}
class TestElement4 extends TestElement345 {}
class TestElement5 extends TestElement345 {}

class StubPackageableElement extends PackageableElement {
  accept_PackageableElementVisitor<T>(
    visitor: PackageableElementVisitor<T>,
  ): T {
    throw new UnsupportedOperationError();
  }
}

class StubGraphManagerPlugin extends PureProtocolProcessorPlugin {
  builders: V1_ElementBuilder<V1_PackageableElement>[] = [];

  constructor(builders: V1_ElementBuilder<V1_PackageableElement>[]) {
    super('stub-graph-manager-plugin', '0.0.0');
    this.builders = builders;
  }

  override V1_getExtraElementBuilders(): V1_ElementBuilder<V1_PackageableElement>[] {
    return this.builders;
  }
}

const stubFirstPass = (
  element: V1_PackageableElement,
  context: V1_GraphBuilderContext,
): PackageableElement => new StubPackageableElement('');

const stubElementBuilder = (
  elementClassName: string,
  _class: Clazz<V1_PackageableElement>,
  prerequisites?: Clazz<V1_PackageableElement>[],
): V1_ElementBuilder<V1_PackageableElement> =>
  new V1_ElementBuilder({
    elementClassName,
    _class,
    prerequisites,
    firstPass: stubFirstPass,
  });

test(unitTest('Test sort empty extra element builders'), () => {
  const graphBuilderExtensions = new V1_GraphBuilderExtensions([]);
  expect(graphBuilderExtensions.sortedExtraElementBuilders).toEqual([]);
  expect(() =>
    graphBuilderExtensions.getExtraBuilderForProtocolClassOrThrow(TestElement1),
  ).toThrow();
});

test(
  unitTest('Test sort extra element builders with no pre-requisites'),
  () => {
    const builder1 = stubElementBuilder('TestElement1', TestElement1);
    const builder2 = stubElementBuilder('TestElement2', TestElement2);
    const graphBuilderExtensions = new V1_GraphBuilderExtensions([
      new StubGraphManagerPlugin([builder1, builder2]),
    ]);
    expect(graphBuilderExtensions.sortedExtraElementBuilders).toEqual([
      builder1,
      builder2,
    ]);
    expect(
      graphBuilderExtensions.getExtraBuilderForProtocolClassOrThrow(
        TestElement1,
      ),
    ).toEqual(builder1);
    expect(
      graphBuilderExtensions.getExtraBuilderForProtocolClassOrThrow(
        TestElement2,
      ),
    ).toEqual(builder2);
    expect(() =>
      graphBuilderExtensions.getExtraBuilderForProtocolClassOrThrow(
        TestElement12,
      ),
    ).toThrow();
    expect(() =>
      graphBuilderExtensions.getExtraBuilderForProtocolClassOrThrow(
        TestElement3,
      ),
    ).toThrow();
  },
);

test(
  unitTest('Test simple sort extra element builders with pre-requisites'),
  () => {
    const builder1 = stubElementBuilder('TestElement1', TestElement1);
    const builder2 = stubElementBuilder('TestElement2', TestElement2, [
      TestElement1,
    ]);
    const builder3 = stubElementBuilder('TestElement3', TestElement3, [
      TestElement1,
    ]);
    const graphBuilderExtensions = new V1_GraphBuilderExtensions([
      new StubGraphManagerPlugin([builder3, builder2, builder1]),
    ]);
    const sortedAll = graphBuilderExtensions.sortedExtraElementBuilders;
    expect(sortedAll).toEqual([builder1, builder3, builder2]);
  },
);

test(
  unitTest('Test complex sort extra element builders with pre-requisites'),
  () => {
    const builder1 = stubElementBuilder('TestElement1', TestElement1, [
      TestElement345,
    ]);
    const builder2 = stubElementBuilder('TestElement2', TestElement2, [
      TestElement1,
      TestElement3,
    ]);
    const builder3 = stubElementBuilder('TestElement3', TestElement3);
    const builder4 = stubElementBuilder('TestElement4', TestElement4, [
      TestElement3,
    ]);
    const builder5 = stubElementBuilder('TestElement5', TestElement5, [
      TestElement4,
    ]);
    const graphBuilderExtensions = new V1_GraphBuilderExtensions([
      new StubGraphManagerPlugin([
        builder1,
        builder2,
        builder3,
        builder4,
        builder5,
      ]),
    ]);
    expect(graphBuilderExtensions.sortedExtraElementBuilders).toEqual([
      builder3,
      builder4,
      builder5,
      builder1,
      builder2,
    ]);
  },
);

test(
  unitTest('Test sort extra element builders with simple pre-requisites loop'),
  () => {
    const builder1 = stubElementBuilder('TestElement1', TestElement1, [
      TestElement2,
    ]);
    const builder2 = stubElementBuilder('TestElement2', TestElement2, [
      TestElement1,
      TestElement3,
    ]);
    const builder3 = stubElementBuilder('TestElement3', TestElement3);
    expect(
      () =>
        new V1_GraphBuilderExtensions([
          new StubGraphManagerPlugin([builder1, builder2, builder3]),
        ]),
    ).toThrowError(
      `Can't consistently sort element builders for protocol classes [TestElement1, TestElement2]: this implies presence of loop(s) in the pre-requite chain between these builders`,
    );
  },
);

test(
  unitTest('Test sort extra element builders with complex pre-requisites loop'),
  () => {
    const builder1 = stubElementBuilder('TestElement1', TestElement1, [
      TestElement345,
    ]);
    const builder2 = stubElementBuilder('TestElement2', TestElement2, [
      TestElement1,
      TestElement3,
    ]);
    const builder3 = stubElementBuilder('TestElement3', TestElement3);
    const builder4 = stubElementBuilder('TestElement4', TestElement4, [
      TestElement2,
    ]);
    const builder5 = stubElementBuilder('TestElement5', TestElement5, [
      TestElement12,
    ]);
    expect(
      () =>
        new V1_GraphBuilderExtensions([
          new StubGraphManagerPlugin([
            builder1,
            builder2,
            builder3,
            builder4,
            builder5,
          ]),
        ]),
    ).toThrowError(
      `Can't consistently sort element builders for protocol classes [TestElement1, TestElement2, TestElement4, TestElement5]: this implies presence of loop(s) in the pre-requite chain between these builders`,
    );
  },
);
