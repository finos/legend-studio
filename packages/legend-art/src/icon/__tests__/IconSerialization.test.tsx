/**
 * Copyright (c) 2026-present, Goldman Sachs
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
import { isValidElement } from 'react';
import { unitTest } from '@finos/legend-shared/test';
import { deserializeIcon } from '../IconSerialization.js';
import { Database, IconSelectorIcons } from '../Icon.js';

test(unitTest('Deserialize a known react-icons icon'), () => {
  const [iconId, iconComponent] = Object.entries(IconSelectorIcons)[0] as [
    string,
    unknown,
  ];

  const element = deserializeIcon('react-icons', iconId);

  expect(isValidElement(element)).toBe(true);
  expect((element as React.ReactElement).type).toBe(iconComponent);
});

test(unitTest('Deserialize an unknown icon id'), () => {
  const element = deserializeIcon('react-icons', 'NotARealIconId');

  // an unrecognized id still renders something rather than nothing
  expect(isValidElement(element)).toBe(true);
  expect((element as React.ReactElement).type).toBe(Database);
});

test(unitTest('Deserialize an icon from an unsupported library'), () => {
  expect(deserializeIcon('some-other-library', 'TbUser')).toBeUndefined();
  expect(deserializeIcon('', 'TbUser')).toBeUndefined();
});

test(unitTest('Icon selector icons are all components'), () => {
  const entries = Object.entries(IconSelectorIcons);
  expect(entries.length).toBeGreaterThan(0);
  entries.forEach(([iconId, iconComponent]) => {
    expect(typeof iconComponent).toBe('function');
    expect(iconId).not.toEqual('');
  });
});
