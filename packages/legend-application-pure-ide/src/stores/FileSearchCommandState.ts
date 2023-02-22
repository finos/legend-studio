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

import { action, makeObservable, observable } from 'mobx';

export class FileSearchCommandState {
  text = '';
  isCaseSensitive = false;
  isRegExp = false;

  constructor() {
    makeObservable(this, {
      text: observable,
      isCaseSensitive: observable,
      isRegExp: observable,
      reset: action,
      setText: action,
      setCaseSensitive: action,
      setRegExp: action,
    });
  }

  reset(): void {
    this.setText('');
    this.setCaseSensitive(false);
    this.setRegExp(false);
  }

  setText(value: string): void {
    this.text = value;
  }

  setCaseSensitive(value: boolean): void {
    this.isCaseSensitive = value;
  }

  setRegExp(value: boolean): void {
    this.isRegExp = value;
  }
}
