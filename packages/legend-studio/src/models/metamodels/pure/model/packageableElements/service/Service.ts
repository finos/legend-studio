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

import { observable, action, computed, makeObservable } from 'mobx';
import {
  hashArray,
  IllegalStateError,
  uniq,
  uuid,
  addUniqueEntry,
} from '@finos/legend-studio-shared';
import type { Hashable } from '@finos/legend-studio-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../MetaModelConst';
import type { ServiceExecution } from './ServiceExecution';
import type { ServiceTest } from './ServiceTest';
import { SingleExecutionTest } from './ServiceTest';
import type { PackageableElementVisitor } from '../../../model/packageableElements/PackageableElement';
import { PackageableElement } from '../../../model/packageableElements/PackageableElement';
import type { ValidationIssue } from '../../../action/validator/ValidationResult';
import { createValidationError } from '../../../action/validator/ValidationResult';

export const DEFAULT_SERVICE_PATTERN = '/';

// TODO: to move to service
export const validateServicePattern = (pattern: string): ValidationIssue => {
  const errors: string[] = [];
  if (!pattern) {
    addUniqueEntry(errors, 'Pattern must not be empty');
  } else if (!pattern.startsWith('/')) {
    addUniqueEntry(errors, `Pattern must start with a '/'`);
  }
  // TODO: potentially do more validation
  return createValidationError(errors);
};

export class Service extends PackageableElement implements Hashable {
  pattern = DEFAULT_SERVICE_PATTERN;
  owners: string[] = [];
  documentation = '';
  autoActivateUpdates = true;
  execution!: ServiceExecution;
  test: ServiceTest;

  constructor(name: string) {
    super(name);

    makeObservable(this, {
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
      hashCode: computed({ keepAlive: true }),
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

  get hashCode(): string {
    if (this._isDisposed) {
      throw new IllegalStateError(`Element '${this.path}' is already disposed`);
    }
    if (this._isImmutable) {
      throw new IllegalStateError(
        `Readonly element '${this.path}' is modified`,
      );
    }
    return hashArray([
      CORE_HASH_STRUCTURE.SERVICE,
      super.hashCode,
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
