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

import {
  type GenericClazz,
  assertNonEmptyString,
  AssertionError,
  guaranteeNonNullable,
} from '@finos/legend-shared';
import type { BasicModel } from '../../../../../../../graph/BasicModel.js';
import { DependencyModel } from '../../../../../../../graph/DependencyManager.js';
import { LegendSDLC } from '../../../../../../../graph/GraphDataOrigin.js';
import {
  addElementToPackage,
  getElementOrigin,
  getOrCreateGraphPackage,
} from '../../../../../../../graph/helpers/DomainHelper.js';
import type { Package } from '../../../../../../../graph/metamodel/pure/packageableElements/domain/Package.js';
import type { PackageableElement } from '../../../../../../../graph/metamodel/pure/packageableElements/PackageableElement.js';
import {
  GenerationModel,
  SystemModel,
} from '../../../../../../../graph/PureModel.js';
import type { V1_PackageableElement } from '../../../model/packageableElements/V1_PackageableElement.js';
import {
  V1_buildFullPath,
  type V1_GraphBuilderContext,
} from './V1_GraphBuilderContext.js';
import { GAV_DELIMITER } from '@finos/legend-storage';

export type V1_ElementBuilderPass = (
  elementProtocol: V1_PackageableElement,
  context: V1_GraphBuilderContext,
) => void;

export type V1_ElementFirstPassBuilder = (
  elementProtocol: V1_PackageableElement,
  context: V1_GraphBuilderContext,
) => PackageableElement;
export type V1_ElementSecondPassBuilder = V1_ElementBuilderPass;
export type V1_ElementThirdPassBuilder = V1_ElementBuilderPass;
export type V1_ElementFourthPassBuilder = V1_ElementBuilderPass;
export type V1_ElementFifthPassBuilder = V1_ElementBuilderPass;

const currentSubGraphOrigin = (graph: BasicModel): string => {
  if (graph instanceof SystemModel) {
    return 'System elements';
  } else if (graph instanceof GenerationModel) {
    return 'Generation elements';
  } else if (
    graph instanceof DependencyModel &&
    graph.origin instanceof LegendSDLC
  ) {
    return `Project dependency ${graph.origin.groupId}${GAV_DELIMITER}${graph.origin.artifactId} `;
  }
  return '';
};

export const V1_checkDuplicatedElement = (
  path: string,
  context: V1_GraphBuilderContext,
  cache: Set<string> | undefined,
): void => {
  if (cache) {
    if (cache.has(path)) {
      const element = context.graph.getNullableElement(path);
      const _origin = getElementOrigin(
        guaranteeNonNullable(element),
        context.graph,
      );
      throw new AssertionError(
        `${currentSubGraphOrigin(
          context.currentSubGraph,
        )}Element '${path}' already exists${_origin ? ` in ${_origin}` : ''}`,
      );
    } else {
      cache.add(path);
    }
  } else {
    const element = context.graph.getNullableElement(path);
    if (element) {
      const _origin = getElementOrigin(element, context.graph);
      throw new AssertionError(
        `${currentSubGraphOrigin(
          context.currentSubGraph,
        )}Element '${path}' already exists${_origin ? ` in ${_origin}` : ''}`,
      );
    }
  }
};

/**
 * Element builder is a mechanism to handling the building process of
 * element.
 *  - Each builder focuses on only 1 element type.
 *  - Each builder specifies prerequisites element types so that while
 *    building the Pure graph, we can order the builders appropriately.
 *  - Each builder has 5 passes. NOTE: not all elements require 5-pass
 *    building process. But this should give enough flexibility on how
 *    elements can be processed.
 *
 * NOTE: we aim to have the first pass to be relatively simple: just build
 * the basic element, index it and put it in the element tree based on its
 * path. Since this common task is required by many other builder processes,
 * the first pass will be run first and separately from other passes.
 *
 * Also note that as of right now we will run build pass 2-5 of each element
 * consecutively so there is no opportunity to `interleave` build passes of
 * different elements. That definitely seems more flexible, but also incur
 * a fair amount of complexity we don't see the need for right now.
 */
export class V1_ElementBuilder<T extends V1_PackageableElement> {
  readonly elementClassName: string;
  private _class: GenericClazz<T>;
  private prerequisites: GenericClazz<V1_PackageableElement>[] = [];
  private firstPass: V1_ElementFirstPassBuilder;
  private secondPass?: V1_ElementSecondPassBuilder | undefined;
  private thirdPass?: V1_ElementThirdPassBuilder | undefined;
  private fourthPass?: V1_ElementFourthPassBuilder | undefined;
  private fifthPass?: V1_ElementFifthPassBuilder | undefined;

  constructor(props: {
    elementClassName: string;
    _class: GenericClazz<T>;
    prerequisites?: GenericClazz<V1_PackageableElement>[] | undefined;
    /**
     * We aim to build the basic element and index it.
     *
     * NOTE: aim to put specialized build logic in the second pass and beyond.
     */
    firstPass: V1_ElementFirstPassBuilder;
    secondPass?: V1_ElementSecondPassBuilder;
    thirdPass?: V1_ElementThirdPassBuilder;
    fourthPass?: V1_ElementFourthPassBuilder;
    fifthPass?: V1_ElementFifthPassBuilder;
  }) {
    this.elementClassName = props.elementClassName;
    this._class = props._class;
    this.prerequisites = props.prerequisites ?? [];
    this.firstPass = props.firstPass;
    this.secondPass = props.secondPass;
    this.thirdPass = props.thirdPass;
    this.fourthPass = props.fourthPass;
    this.fifthPass = props.fifthPass;
  }

  getElementProtocolClass(): GenericClazz<T> {
    return this._class;
  }

  getPrerequisiteElementProtocolClasses(): GenericClazz<V1_PackageableElement>[] {
    return this.prerequisites;
  }

  runFirstPass(
    elementProtocol: T,
    context: V1_GraphBuilderContext,
    packageCache: Map<string, Package> | undefined,
    elementPathCache: Set<string> | undefined,
  ): PackageableElement {
    assertNonEmptyString(
      elementProtocol.package,
      `Element 'package' field is missing or empty`,
    );
    assertNonEmptyString(
      elementProtocol.name,
      `Element 'name' field is missing or empty`,
    );
    const path = V1_buildFullPath(
      elementProtocol.package,
      elementProtocol.name,
    );
    V1_checkDuplicatedElement(path, context, elementPathCache);
    const element = this.firstPass(elementProtocol, context);
    addElementToPackage(
      getOrCreateGraphPackage(
        context.currentSubGraph,
        elementProtocol.package,
        packageCache,
      ),
      element,
    );
    return element;
  }

  runSecondPass(elementProtocol: T, context: V1_GraphBuilderContext): void {
    this.secondPass?.(elementProtocol, context);
  }

  runThirdPass(elementProtocol: T, context: V1_GraphBuilderContext): void {
    this.thirdPass?.(elementProtocol, context);
  }

  runFourthPass(elementProtocol: T, context: V1_GraphBuilderContext): void {
    this.fourthPass?.(elementProtocol, context);
  }

  runFifthPass(elementProtocol: T, context: V1_GraphBuilderContext): void {
    this.fifthPass?.(elementProtocol, context);
  }
}
