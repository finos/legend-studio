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
 * As such, this class `Reference` is kept to be as generic as possible, because we can extend it to have many various
 * information. But only one thing we know for sure that is a refernece must have a `value`, which is the actual
 * object-reference
 *
 * Given such meaning for reference, below are some guideline on how we modify the reference while modifying the metamodel:
 * 1. For property which is required and single (multiplicity: [1]):
 *    NEVER change the reference instance: only change the value of the reference so other information (inference context)
 *    are kept, so we can do proper serialization
 * 2. For property which is optional and single (multiplicity: [0..1]):
 *    NEVER change the reference instance. Turn this into a required single property of `OptionalReference`
 *    so the value can be `undefined`. This way we can keep the inference context.
 * 3. For property which can be multiple (multiplicity: [*] or similar):
 *    ALWAYS change the reference instance, for DELETE or ADD, this is obvious, but for MODIFY, we can follow case 1,
 *    but for simplicity sake, we will just swap out to use new a new reference
 */
export abstract class Reference {
  abstract value?: unknown;

  abstract setValue(value: unknown | undefined): void;
}

export abstract class OptionalReference extends Reference {}

export abstract class RequiredReference extends Reference {
  abstract override value: unknown;
}

/**
 * This is intended for information derived from a reference, such as property pointer, enum-value pointer, etc.
 * since those references we resolve after we resolve the reference to the class or enumeration they belong to.
 * In other words, these reference has an owner reference.
 *
 * The rule for modifying these references is similar to that of `Reference` with one addition. That is
 * if we modify the child, we should ALWAYS modify the owner reference accordingly (except when we have a list, we will
 * trash the reference)
 */
export abstract class ReferenceWithOwner extends RequiredReference {
  readonly ownerReference: RequiredReference;

  protected constructor(ownerReference: RequiredReference) {
    super();
    this.ownerReference = ownerReference;
  }
}
