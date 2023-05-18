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
  isClassAssignableFrom,
  isNonNullable,
  getClass,
  getSuperclass,
  UnsupportedOperationError,
  IllegalStateError,
} from '@finos/legend-shared';
import type { PureProtocolProcessorPlugin } from '../../../../PureProtocolProcessorPlugin.js';
import { V1_PackageableConnection } from '../../../model/packageableElements/connection/V1_PackageableConnection.js';
import { V1_Association } from '../../../model/packageableElements/domain/V1_Association.js';
import { V1_Class } from '../../../model/packageableElements/domain/V1_Class.js';
import { V1_Enumeration } from '../../../model/packageableElements/domain/V1_Enumeration.js';
import {
  V1_Measure,
  V1_Unit,
} from '../../../model/packageableElements/domain/V1_Measure.js';
import { V1_Profile } from '../../../model/packageableElements/domain/V1_Profile.js';
import { V1_FileGenerationSpecification } from '../../../model/packageableElements/fileGeneration/V1_FileGenerationSpecification.js';
import { V1_ConcreteFunctionDefinition } from '../../../model/packageableElements/function/V1_ConcreteFunctionDefinition.js';
import { V1_GenerationSpecification } from '../../../model/packageableElements/generationSpecification/V1_GenerationSpecification.js';
import { V1_Mapping } from '../../../model/packageableElements/mapping/V1_Mapping.js';
import { V1_PackageableRuntime } from '../../../model/packageableElements/runtime/V1_PackageableRuntime.js';
import { V1_SectionIndex } from '../../../model/packageableElements/section/V1_SectionIndex.js';
import { V1_Service } from '../../../model/packageableElements/service/V1_Service.js';
import { V1_Store } from '../../../model/packageableElements/store/V1_Store.js';
import { V1_PackageableElement } from '../../../model/packageableElements/V1_PackageableElement.js';
import type { V1_ElementBuilder } from './V1_ElementBuilder.js';
import { V1_FunctionActivator } from '../../../model/packageableElements/function/V1_FunctionActivator.js';

const FORBIDDEN_BUILDER_PROTOCOL_CLASSES = new Set<
  GenericClazz<V1_PackageableElement>
>([
  V1_PackageableElement,
  V1_Class,
  V1_Association,
  V1_Enumeration,
  V1_ConcreteFunctionDefinition,
  V1_Profile,
  V1_Measure,
  V1_Unit,
  V1_SectionIndex,
  V1_Store,
  V1_FunctionActivator,
  V1_Mapping,
  V1_PackageableConnection,
  V1_PackageableRuntime,
  V1_Service,
  V1_FileGenerationSpecification,
  V1_GenerationSpecification,
]);

export class V1_GraphBuilderExtensions {
  plugins: PureProtocolProcessorPlugin[] = [];
  private extraElementBuildersIndex: Map<
    GenericClazz<V1_PackageableElement>,
    V1_ElementBuilder<V1_PackageableElement>
  >;
  sortedExtraElementBuilders: V1_ElementBuilder<V1_PackageableElement>[] = [];

  constructor(graphManagerPlugins: PureProtocolProcessorPlugin[]) {
    this.plugins = graphManagerPlugins;
    this.extraElementBuildersIndex =
      V1_GraphBuilderExtensions.indexElementBuilders(this.plugins);
    this.sortedExtraElementBuilders = this.getSortedExtraElementBuilders();
  }

  private static indexElementBuilders(
    graphManagerPlugins: PureProtocolProcessorPlugin[],
  ): Map<
    GenericClazz<V1_PackageableElement>,
    V1_ElementBuilder<V1_PackageableElement>
  > {
    const index = new Map<
      GenericClazz<V1_PackageableElement>,
      V1_ElementBuilder<V1_PackageableElement>
    >();
    graphManagerPlugins
      .flatMap((plugin) => plugin.V1_getExtraElementBuilders?.() ?? [])
      .forEach((builder) => {
        const _class = builder.getElementProtocolClass();
        if (FORBIDDEN_BUILDER_PROTOCOL_CLASSES.has(_class)) {
          throw new IllegalStateError(
            `Element builder not allowed for protocol class '${builder.elementClassName}'. Consider removing this builder from plugins`,
          );
        } else if (index.has(_class)) {
          throw new IllegalStateError(
            `Conflicting element builders found for protocol class '${builder.elementClassName}'`,
          );
        }
        index.set(_class, builder);
      });
    return index;
  }

  getExtraBuilderOrThrow(
    element: V1_PackageableElement,
  ): V1_ElementBuilder<V1_PackageableElement> {
    const builder = this.getExtraBuilderForProtocolClass(
      getClass<V1_PackageableElement>(element),
    );
    if (!builder) {
      throw new UnsupportedOperationError(
        `Can't find builder for element '${element.path}': no compatible builder available from plugins`,
        element,
      );
    }
    return builder;
  }

  getExtraBuilderForProtocolClassOrThrow(
    _class: GenericClazz<V1_PackageableElement>,
  ): V1_ElementBuilder<V1_PackageableElement> {
    const builder = this.getExtraBuilderForProtocolClass(_class);
    if (!builder) {
      throw new UnsupportedOperationError(
        `Can't find element builder for the specified protocol class: no compatible builder available from plugins`,
      );
    }
    return builder;
  }

  getExtraBuilderForProtocolClass(
    _class: GenericClazz<V1_PackageableElement>,
  ): V1_ElementBuilder<V1_PackageableElement> | undefined {
    return this.extraElementBuildersIndex.size
      ? this.getExtraBuilderForProtocolClass_recursive(_class)
      : undefined;
  }

  private getExtraBuilderForProtocolClass_recursive(
    _class: GenericClazz<V1_PackageableElement>,
  ): V1_ElementBuilder<V1_PackageableElement> | undefined {
    const builder = this.extraElementBuildersIndex.get(_class);
    if (builder) {
      return builder;
    }
    if (FORBIDDEN_BUILDER_PROTOCOL_CLASSES.has(_class)) {
      return undefined;
    }
    // We can ignore interfaces in this search, since V1_PackageableElement is itself a class (not an interface)
    const superclass = getSuperclass<V1_PackageableElement>(_class);
    return superclass
      ? this.getExtraBuilderForProtocolClass_recursive(superclass)
      : undefined;
  }

  /**
   * Sort element builders in near topological manner. A very subtle detail here is
   * that if for a builder's prerequisite class there are builders which support
   * that class or its subclass, those builders will go first as well.
   *
   * e.g. If we have:
   * - class SomeStore extends class Store.
   * - builder1 supports SomeStore
   * - builder2 supports SomeElement, and has SomeStore as a prerequisite
   * Then this sorter makes sure builder2 will be ordered after builder1.
   *
   * NOTE: we can consider using topological sorting if that implementation is cleaner.
   */
  private getSortedExtraElementBuilders(): V1_ElementBuilder<V1_PackageableElement>[] {
    // Collect builder pre-requisites. Those without pre-requisites can go straight into the results list.
    const results = new Set<V1_ElementBuilder<V1_PackageableElement>>();
    const buildersWithPrereqIndex = new Map<
      V1_ElementBuilder<V1_PackageableElement>,
      GenericClazz<V1_PackageableElement>[]
    >();
    Array.from(this.extraElementBuildersIndex.values()).forEach((builder) => {
      const prerequisites = builder.getPrerequisiteElementProtocolClasses();
      if (prerequisites.length > 0) {
        buildersWithPrereqIndex.set(builder, prerequisites);
      } else {
        results.add(builder);
      }
    });

    // If there are builders with pre-requisites, we need to add them to the results list in an appropriate order.
    if (buildersWithPrereqIndex.size > 0) {
      const remaining = new Map<
        V1_ElementBuilder<V1_PackageableElement>,
        V1_ElementBuilder<V1_PackageableElement>[]
      >();

      // We transform the pre-requisite classes into pre-requisite builders.
      buildersWithPrereqIndex.forEach((prerequisiteClasses, builder) => {
        // We only need to be concerned about pre-requisite builders that are not already in the results list,
        // since the ones already in the results list will go before any which are not already in that list.
        // We call these `outstanding` pre-requistes
        const outstandingPrereqs = new Set(
          // First, scan the list of builders with prerequisite, if among the prerequisite classes
          // of the current builder, there's another builder that works for that class or its subclass
          // include that builder as a prerequisite for the current builder. In other words, if a builder
          // has a prerequisite class, all builders for that class and its subclasses should go first
          Array.from(buildersWithPrereqIndex.keys())
            .filter(
              (_builder) =>
                _builder !== builder &&
                prerequisiteClasses.some((_class) =>
                  isClassAssignableFrom(
                    _class,
                    _builder.getElementProtocolClass(),
                  ),
                ),
            )
            .concat(
              // Second, for each prerequisite class, resolve the builder
              // for that class. The resolution goes up the class hierarchy chain.
              prerequisiteClasses
                .map((_class) => this.getExtraBuilderForProtocolClass(_class))
                .filter(isNonNullable)
                .filter(
                  (_builder) =>
                    _builder !== _builder &&
                    buildersWithPrereqIndex.has(_builder),
                ),
            ),
        );

        if (outstandingPrereqs.size > 0) {
          remaining.set(builder, Array.from(outstandingPrereqs.values()));
        } else {
          // If the builder itself does not have any outstanding prerequisites, it can be safely added to the the results list.
          results.add(builder);
        }
      });

      // Now we start adding builders with pre-requisites to the results list. If a builder has no pre-
      // requisites among the other remaining builders, then all of its pre-requisites are already ahead of it
      // in the results list and so we can add it.
      //
      // We repeat this process until either there are no more remaining builders or we are unable to add any
      // remaining builders to the results list. The latter case indicates some sort of loop among the pre-
      // requisites, so we cannot put them in a consistent order and we must throw.
      let remainingCount = remaining.size;
      while (remainingCount > 0) {
        remaining.forEach((prereqs, builder) => {
          if (prereqs.every((prereq) => !remaining.has(prereq))) {
            // If a builder has no pre-requisites among the remaining builders, we can add it to the
            // results list and remove it from the remaining builders.
            results.add(builder);
            remaining.delete(builder);
          }
        });
        const newCount = remaining.size;
        if (newCount === remainingCount) {
          // This means that all of the remaining builders have a pre-requisite of some other remaining
          // builders. This implies that there's some sort of loop, and we cannot consistently order the
          // remaining builders.
          throw new IllegalStateError(
            `Can't consistently sort element builders for protocol classes [${Array.from(
              remaining.keys(),
            )
              .map((builder) => builder.elementClassName)
              .join(
                ', ',
              )}]: this implies presence of loop(s) in the pre-requite chain between these builders`,
          );
        }
        remainingCount = newCount;
      }
    }

    return Array.from(results.values());
  }
}
