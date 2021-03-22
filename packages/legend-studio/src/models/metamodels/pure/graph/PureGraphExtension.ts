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

import type { Clazz } from '@finos/legend-studio-shared';
import { observable, computed, action, makeObservable } from 'mobx';
import type { PackageableElement } from '../model/packageableElements/PackageableElement';

export class PureGraphExtension<T extends PackageableElement> {
  private readonly _class: Clazz<T>;
  private readonly index = new Map<string, T>();

  constructor(_class: Clazz<T>) {
    makeObservable<PureGraphExtension<T>, 'index'>(this, {
      index: observable,
      elements: computed,
      setElement: action,
      removeElement: action,
    });
    this._class = _class;
  }

  getElementClass(): Clazz<T> {
    return this._class;
  }

  get elements(): T[] {
    return Array.from(this.index.values());
  }

  getElement(path: string): T | undefined {
    return this.index.get(path);
  }

  setElement(path: string, val: T): void {
    this.index.set(path, val);
  }

  removeElement(path: string): void {
    this.index.delete(path);
  }
}
