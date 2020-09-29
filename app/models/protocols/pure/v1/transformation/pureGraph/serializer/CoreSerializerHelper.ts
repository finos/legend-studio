/**
 * Copyright 2020 Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { custom, SKIP, serialize, primitive, optional, PropSchema, ModelSchema, createSimpleSchema } from 'serializr';
import { toJS } from 'mobx';
import { Package as MM_Package } from 'MM/model/packageableElements/domain/Package';
import { PackageableElement as MM_PackageableElement } from 'MM/model/packageableElements/PackageableElement';
import { PackageableElementReference as MM_PackageableElementReference, OptionalPackageableElementReference as MM_OptionalPackageableElementReference } from 'MM/model/packageableElements/PackageableElementReference';
import { PackageableElementPointerType } from 'V1/model/packageableElements/PackageableElement';

export const SKIP_FN = (): typeof SKIP => SKIP;
// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types
export const transformArray = (values: any, transformFn: (val: any) => any, setToUndefIfEmpty: boolean): any[] | typeof SKIP =>
  Array.isArray(values)
    ? values.length
      ? values.map(value => transformFn(value))
      : setToUndefIfEmpty ? SKIP : []
    : SKIP;
export const constant = (constantValue: unknown): PropSchema => custom(() => constantValue, SKIP_FN);
export const usingModelSchema = <T>(schema: ModelSchema<T>): PropSchema => custom(value => serialize(schema, value), SKIP_FN);
export const packagePathSerializer = custom((_package: MM_Package | undefined) => _package?.fullPath ?? '', SKIP_FN);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const elementReferenceSerializer = custom(<T extends MM_PackageableElement>(ref: MM_PackageableElementReference<T>) => ref.valueForSerialization, SKIP_FN);
export const optionalElementReferenceSerializer = custom(<T extends MM_PackageableElement>(ref: MM_OptionalPackageableElementReference<T>) => ref.valueForSerialization ?? SKIP, SKIP_FN);
export const elementReferencePointerSerializer = (pointerType: PackageableElementPointerType): PropSchema => custom(<T extends MM_PackageableElement>(ref: MM_PackageableElementReference<T>) => ({ path: ref.valueForSerialization, type: pointerType }), SKIP_FN);
export const plainSerializer = custom(value => toJS(value), SKIP_FN);
export const optionalPrimitiveSerializer = optional(primitive());
// NOTE: for the following 3 optional serializer, we should have been able to use something like `optional(custom(...))`
// as those are very declarative, but seem like `optional` does not work like we would expect it to as it will call `custom`
// first and if `custom` serializer returns undefined, then `optional` will kick in and return `SKIP`
// See https://github.com/mobxjs/serializr/issues/131
export const optionalPlainSerializer = custom(value => value ? toJS(value) : SKIP, SKIP_FN);
export const multiplicitySchema = createSimpleSchema({
  lowerBound: custom(value => value !== undefined ? value : undefined, SKIP_FN),
  upperBound: optionalPrimitiveSerializer,
});
