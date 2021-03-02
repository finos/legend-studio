/**
 * Copyright 2020 Goldman Sachs
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
 * TODO: we plan to deprecate this as it is unecessary and makes metamodel more heavy, while it's purely an UI state
 * @deprecated
 * The UI has the need to create stub elements for example Class needs to be able to create empty Constraint
 * or Class Mapping needs blank Property Mapping. In these cases, we want to be able to discern these stubs
 * and omit them from let's say transformer or hash computation
 */
export interface Stubable {
  // NOTE: since we cannot have static member for an interface, we leave this comment to remind user of
  // this interface to implement a static `createStub()` method
  // static createStub: (...args: any) => T;
  isStub: boolean;
}

/**
 * TODO: we plan to deprecate the whole Stubable mechanism
 * @deprecated
 */
export const isStubArray = (arr: Stubable[]): boolean =>
  !arr.filter((p) => !p.isStub).length;
