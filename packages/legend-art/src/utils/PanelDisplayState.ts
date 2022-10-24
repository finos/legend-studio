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

import { action, computed, makeObservable, observable } from 'mobx';

export class PanelDisplayState {
  private readonly _initialDefaultSize: number;
  private _tempSize: number;

  size: number;
  defaultSize: number;
  snapSize?: number | undefined;
  maxSize?: number | undefined;

  constructor(size: {
    initial: number;
    default: number;
    snap: number | undefined;
  }) {
    this.size = size.initial;
    this._tempSize = size.default;
    this.defaultSize = size.default;
    this._initialDefaultSize = size.default;
    this.snapSize = size.snap;

    makeObservable<PanelDisplayState, '_tempSize'>(this, {
      _tempSize: observable,
      size: observable,
      defaultSize: observable,
      snapSize: observable,
      maxSize: observable,
      isOpen: computed,
      isMaximizable: computed,
      isMaximized: computed,
      // open/close
      setSize: action,
      open: action,
      close: action,
      toggle: action,
      // maximize/minimize
      setMaxSize: action,
      maximize: action,
      minimize: action,
      toggleMaximize: action,
    });
  }

  get isOpen(): boolean {
    return this.size !== 0;
  }

  get isMaximizable(): boolean {
    return this.maxSize !== undefined;
  }

  get isMaximized(): boolean {
    return this.maxSize !== undefined && this.size === this.maxSize;
  }

  setSize(val: number): void {
    // correct the value (cannot be less than 0 and greater than max size)
    val = Math.max(val, 0);
    if (this.maxSize) {
      val = Math.min(val, this.maxSize);
    }

    // do nothing if the size is the same as the value
    if (this.size === val) {
      return;
    }

    if (this.snapSize !== undefined) {
      if (val > this.size) {
        // expanding
        if (this.maxSize && val > this.maxSize - this.snapSize) {
          this.size = this.maxSize;
        } else {
          this.size = val < this.snapSize ? this.defaultSize : val;
        }
      } else {
        // shrinking
        this.size = val < this.snapSize ? 0 : val;
      }
    } else {
      this.size = val;
    }
  }

  open(): void {
    if (this.size === 0) {
      this.size = this._tempSize;
    }
  }

  close(): void {
    if (this.size !== 0) {
      this._tempSize = this.size || this.defaultSize;
      this.size = 0;
    }
  }

  toggle(): void {
    if (this.size === 0) {
      this.open();
    } else {
      this.close();
    }
  }

  setMaxSize(val: number): void {
    this._tempSize = Math.min(this._tempSize, val);
    this.size = Math.min(this.size, val);
    this.defaultSize = Math.min(this._initialDefaultSize, val);
    this.maxSize = val;
  }

  maximize(): void {
    if (this.maxSize !== undefined) {
      if (this.size !== this.maxSize) {
        this._tempSize = this.size;
        this.size = this.maxSize;
      }
    }
  }

  minimize(): void {
    if (this.maxSize !== undefined) {
      if (this.size === this.maxSize) {
        this.size =
          this._tempSize === this.maxSize ? this.defaultSize : this._tempSize;
      }
    }
  }

  toggleMaximize(): void {
    if (this.maxSize !== undefined) {
      if (this.size === this.maxSize) {
        this.minimize();
      } else {
        this.maximize();
      }
    }
  }
}
