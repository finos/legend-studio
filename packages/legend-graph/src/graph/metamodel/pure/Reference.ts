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

import { uuid } from '@finos/legend-shared';

/**
 * Reference implies pointer-based relationship in the protocol. This means that during graph-building,
 * we figure out/infer the reference using pointer of some form. Take the following example:
 *
 * 1. For the properties that a class is holding, we don't need to have them as reference because the class actually
 *    owns the properties, the relationship is direct, these properties definitions are contained within the class
 *    definition
 * 2. On the other hand, if we have a property mapping, the property in this protocol is a pointer, because the specification
 *    for the property is not contained within the mapping.
 *
 * There is more to reference than just a pointer. While building the graph, reference is also the result of a
 * deduction/inference process in identifying the right object to point. Many things could affect the decision as to
 * which object gets resolved in the reference, for example, the import statements, the section, the types, etc. These
 * information might be valuable to store because during serialization, we need to use them to derive user-intended input
 * (let's say the user put in an import statement and expect the pointer to just have name of class instead of its full-path,
 * we would like to keep the pointer as is during serialization if the class has not been changed).
 *
 * As such, this class `Reference` is kept to be as generic as possible, because we can extend it hold more
 * information. But regardless, only one thing we know for sure that is a reference must have a `value`, which is the actual
 * object-reference
 *
 * Given such meaning for reference, below are some guideline on how we modify the reference while modifying the metamodel:
 * 1. For property which is required and single (multiplicity: [1]):
 *    NEVER change the reference instance: only change the value of the reference so other information (inference context)
 *    are kept, so we can do proper serialization
 * 2. For property which is optional and single (multiplicity: [0..1]):
 *    NEVER change the reference instance, unless the reference is removed (i.e. set to `undefined`).
 *    If the reference is unset, and later on re-established, we will create a fresh new reference, even if it has the
 *    same as the original's. This is intended so the behavior is consistent with case (3) below.
 *    NOTE: We have considered another alternative to always keep the reference, just like case (1) using the
 *    construct `OptionalReference`; this way we can keep the inference context. However, there are a few downsides to this:
 *      i. it is complicated, it makes the code for reference complex for a small gain
 *      ii. it makes our treatment of reference diverging from Pure and would make it hard to code-generate the metamodels
 *      iii. it makes case (2) and case (3) treatment seem inconsistent.
 * 3. For property which can be multiple (multiplicity: [*] or similar):
 *    ALWAYS change the reference instance, for DELETE or ADD, this is obvious, but for MODIFY, we can follow case (1),
 *    but for simplicity sake, we will just swap out to use new a new reference
 */
export abstract class Reference {
  readonly _UUID = uuid();

  abstract value: unknown;
}

/**
 * This can be used for references to sub-elements, such as property pointer, enum-value pointer, etc.
 * since those references are often resolved after we resolve the reference to the class or enumeration they belong to.
 * In other words, these reference has an owner reference.
 *
 * The rule for modifying these references is similar to that of `Reference` with one addition. That is
 * if we modify the child, we should ALWAYS modify the owner reference accordingly (except when we have a list, we will
 * trash the reference)
 */
export abstract class ReferenceWithOwner extends Reference {
  readonly ownerReference: Reference;

  protected constructor(ownerReference: Reference) {
    super();
    this.ownerReference = ownerReference;
  }
}
