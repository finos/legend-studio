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

import { observable, action, computed, makeObservable, override } from 'mobx';
import { hashArray, uniq, uuid, addUniqueEntry } from '@finos/legend-shared';
import type { Hashable } from '@finos/legend-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../MetaModelConst';
import type { ServiceExecution } from './ServiceExecution';
import type { ServiceTest } from './ServiceTest';
import { SingleExecutionTest } from './ServiceTest';
import type { PackageableElementVisitor } from '../PackageableElement';
import { PackageableElement } from '../PackageableElement';
import type { StereotypeReference } from '../domain/StereotypeReference';
import type { TaggedValue } from '../domain/TaggedValue';

export const DEFAULT_SERVICE_PATTERN = '/';

export class Service extends PackageableElement implements Hashable {
  stereotypes: StereotypeReference[] = [];
  taggedValues: TaggedValue[] = [];
  pattern = '/';
  owners: string[] = [];
  documentation = '';
  autoActivateUpdates = true;
  execution!: ServiceExecution;
  test: ServiceTest;

  constructor(name: string) {
    super(name);

    makeObservable<Service, '_elementHashCode'>(this, {
      pattern: observable,
      owners: observable,
      documentation: observable,
      autoActivateUpdates: observable,
      execution: observable,
      test: observable,
      initNewService: action,
      setExecution: action,
      setTest: action,
      setPattern: action,
      setDocumentation: action,
      setAutoActivateUpdates: action,
      addOwner: action,
      updateOwner: action,
      deleteOwner: action,
      removePatternParameter: action,
      patternParameters: computed,
      _elementHashCode: override,
    });

    this.test = new SingleExecutionTest(this, '');
  }

  initNewService(userId?: string): void {
    this.pattern = `/${uuid()}`; // initialize the service pattern with an UUID to avoid people leaving the pattern as /
    if (userId) {
      this.owners.push(userId);
    } // this is used to add the current user as the first owner by default
  }

  setExecution(value: ServiceExecution): void {
    this.execution = value;
  }

  setTest(value: ServiceTest): void {
    this.test = value;
  }

  setPattern(value: string): void {
    this.pattern = value;
  }

  setDocumentation(value: string): void {
    this.documentation = value;
  }

  setAutoActivateUpdates(value: boolean): void {
    this.autoActivateUpdates = value;
  }

  addOwner(value: string): void {
    addUniqueEntry(this.owners, value);
  }

  updateOwner(value: string, idx: number): void {
    this.owners[idx] = value;
  }

  deleteOwner(idx: number): void {
    this.owners.splice(idx, 1);
  }

  removePatternParameter(value: string): void {
    const newPattern = this.pattern
      .replace(new RegExp(`\\/\\{${value}\\}`, 'ug'), '')
      .replace(/\/{2,}/gu, '/');
    this.pattern = newPattern !== '' ? newPattern : DEFAULT_SERVICE_PATTERN;
  }

  get patternParameters(): string[] {
    return uniq(
      (this.pattern.match(/\{\w+\}/gu) ?? []).map((parameter) =>
        parameter.substring(1, parameter.length - 1),
      ),
    );
  }

  protected override get _elementHashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.SERVICE,
      hashArray(
        this.stereotypes.map((stereotype) => stereotype.pointerHashCode),
      ),
      hashArray(this.taggedValues),
      this.path,
      this.pattern,
      hashArray(this.owners),
      this.documentation,
      this.autoActivateUpdates.toString(),
      this.execution,
      this.test,
    ]);
  }

  accept_PackageableElementVisitor<T>(
    visitor: PackageableElementVisitor<T>,
  ): T {
    return visitor.visit_Service(this);
  }
}
