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
 * Sometimes people can give us corrupted protocol or ones with missing information, it is then the job
 * of the graph builder (in Studio) or the compiler (in the execution server) to do inference
 * and "fill in" these spots (or throw errors). However, during graph serialization, we should make decision
 * on these holes. We classify these holes into 2 categories:
 *  1. Information that we fill in when we build the graph (maybe?) or when the user start to open editor for things:
 *    - automatically nominate a root class mapping during resolution
 *    - diagram width/height line points gets updated due to layout styling changes
 *    - lambda gets updated to the new form sometimes
 *    - patch we do to bring older protocol model to the newer ones (let's say we just added a new flag in the protocol,
 *      now the users use their old protocol with the app auto-populating this as part of serialization
 *  For this case, we will take this as an auto-improvement to the protocol and prompt user to sync the change
 *  2. Information that we need to resolve/infer but it is the user intention to have them inferred:
 *    - default class mapping id (:: -> `_`)
 *    - path to element (as users use imports in their code)
 *  For this case, we need to handle this case to not bypass/ignore the intent of the user
 *
 * `InferableValue` is an attempt to solve case 2, it stores the value inferred/resolved, but also user original input
 * here we adhere to the user's intent during serializations to the best of our abilities
 *
 * NOTE: Although this can be used for just about any inference, one popular use case is to use this for pointers.
 * The obvious ones are element pointers (either they come in actual point form - i.e. `PackageableElementPointer`,
 * or as a string). The less obvious ones are pointers to sub-elements, such as property, tag, stereotype, generic type, enum value, etc.
 * In fact, it is  important to note that each reference/pointer in the protocol will need to be converted into an inferable value
 */
export abstract class InferableValue<T, V> {
  value: T;

  constructor(value: T) {
    this.value = value;
  }

  abstract get valueForSerialization(): V;
}
