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

import seedrandom from 'seedrandom';

let rng = seedrandom();

/**
 * This method is exposed to allow setting seeds in test.
 * NOTE: Disable this during production for security.
 */
export const setSeed = (seed?: string): void => {
  // eslint-disable-next-line no-process-env
  if (process.env.NODE_ENV === 'production') {
    return;
  }
  rng = seedrandom(seed);
};

export const getRandomFloat = (): number => rng.quick();

export const getRandomDouble = (): number => rng.double();

export const getRandomSignedInteger = (): number => rng.int32();

export const getRandomPositiveInteger = (max?: number): number =>
  max
    ? Math.floor(getRandomFloat() * Math.floor(max))
    : Math.abs(getRandomSignedInteger());

export const getRandomItemInCollection = <T>(collection: T[]): T =>
  collection[getRandomPositiveInteger(collection.length)];

export const getRandomDate = (start: Date, end: Date): Date =>
  new Date(
    start.getTime() +
      Math.floor(getRandomFloat() * (end.getTime() - start.getTime())),
  );
