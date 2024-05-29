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

import { test, expect } from '@jest/globals';
import { unitTest } from '@finos/legend-shared/test';
import {
  parseGACoordinates,
  parseGAVCoordinates,
  parseProjectIdentifier,
} from '../DependencyUtils.js';

test(unitTest('Parse GA(V) coordinates'), () => {
  expect(parseGACoordinates('test.group:test-artifactId')).toEqual({
    artifactId: 'test-artifactId',
    groupId: 'test.group',
  });
  expect(() => parseGACoordinates('test.group')).toThrow();
  expect(() =>
    parseGACoordinates('test.group:test-artifactId:1.0.0'),
  ).toThrow();
  expect(parseGAVCoordinates('test.group:test-artifactId:1.0.0')).toEqual({
    artifactId: 'test-artifactId',
    groupId: 'test.group',
    versionId: '1.0.0',
  });
  expect(() => parseGAVCoordinates('test.group')).toThrow();
  expect(() => parseGAVCoordinates('test.group:test-artifactId')).toThrow();
});

test(unitTest('Parse project identifier'), () => {
  expect(parseProjectIdentifier('PREFIX-0')).toEqual({
    prefix: 'PREFIX',
    id: 0,
  });
  expect(parseProjectIdentifier('PROD-12345')).toEqual({
    prefix: 'PROD',
    id: 12345,
  });
  expect(parseProjectIdentifier('12345')).toEqual({
    id: 12345,
  });
  expect(() => parseProjectIdentifier('PROD-abasd')).toThrow();
  expect(() => parseProjectIdentifier('abcd')).toThrow();
});
