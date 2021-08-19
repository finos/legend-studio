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

import seedrandom from 'seedrandom';

export class Randomizer {
  private rng = seedrandom();

  /**
   * This method is exposed to allow setting seeds in test.
   * NOTE: Disable this during production for security.
   */
  setSeed(seed?: string): void {
    // eslint-disable-next-line no-process-env
    if (process.env.NODE_ENV === 'production') {
      return;
    }
    this.rng = seedrandom(seed);
  }

  getRandomFloat(): number {
    return this.rng.quick();
  }

  getRandomDouble(): number {
    return this.rng.double();
  }

  getRandomSignedInteger(): number {
    return this.rng.int32();
  }

  getRandomPositiveInteger(max?: number): number {
    return max
      ? Math.floor(this.getRandomFloat() * Math.floor(max))
      : Math.abs(this.getRandomSignedInteger());
  }

  getRandomItemInCollection<T>(collection: T[]): T {
    return collection[this.getRandomPositiveInteger(collection.length - 1)];
  }

  getRandomDate(start: Date, end: Date): Date {
    return new Date(
      start.getTime() +
        Math.round(this.getRandomFloat() * (end.getTime() - start.getTime())),
    );
  }
}
