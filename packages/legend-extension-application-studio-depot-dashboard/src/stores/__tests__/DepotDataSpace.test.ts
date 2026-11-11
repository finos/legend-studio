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

import { expect, test } from '@jest/globals';
import { DepotDataSpace } from '../DepotDataSpace.js';

test('counts execution contexts, executables and diagrams', () => {
  const dataSpace = DepotDataSpace.fromContent({
    _type: 'dataSpace',
    name: 'Trades',
    package: 'test',
    title: 'Trades',
    defaultExecutionContext: 'prod',
    executionContexts: [
      { name: 'prod', mapping: { path: 'test::Mapping' } },
      { name: 'uat', mapping: { path: 'test::Mapping' } },
      { name: 'legacy', mapping: { path: 'test::LegacyMapping' } },
    ],
    elements: [{ path: 'test::Trade' }, { path: 'test::Desk' }],
    executables: [
      {
        _type: 'dataSpaceTemplateExecutable',
        id: 'q1',
        title: 'Trades by desk',
        query: { _type: 'lambda', body: [], parameters: [] },
      },
      {
        _type: 'dataSpacePackageableElementExecutable',
        title: 'Trade service',
        executable: { path: 'test::TradeService' },
      },
    ],
    diagrams: [{ title: 'Model', diagram: { path: 'test::ModelDiagram' } }],
    supportInfo: { _type: 'email', address: 'team@example.com' },
  });

  expect(dataSpace.title).toBe('Trades');
  expect(dataSpace.defaultExecutionContext).toBe('prod');
  expect(dataSpace.executionContextNames).toEqual(['prod', 'uat', 'legacy']);
  // each mapping once, however many contexts use it
  expect(dataSpace.mappingPaths).toEqual([
    'test::Mapping',
    'test::LegacyMapping',
  ]);
  expect(dataSpace.elementCount).toBe(2);
  expect(dataSpace.executableCount).toBe(2);
  expect(dataSpace.templateQueryCount).toBe(1);
  expect(dataSpace.executableTitles).toEqual([
    'Trades by desk',
    'Trade service',
  ]);
  expect(dataSpace.diagramPaths).toEqual(['test::ModelDiagram']);
  expect(dataSpace.supportLabel).toBe('Email');
});

test('counts featured diagrams of older data spaces as diagrams', () => {
  expect(
    DepotDataSpace.fromContent({
      diagrams: [{ title: 'New', diagram: { path: 'test::New' } }],
      featuredDiagrams: [{ type: 'DIAGRAM', path: 'test::Old' }],
    }).diagramPaths,
  ).toEqual(['test::New', 'test::Old']);
});

test('counts nothing when the lists are missing', () => {
  const dataSpace = DepotDataSpace.fromContent({
    _type: 'dataSpace',
    name: 'Empty',
    package: 'test',
  });

  expect(dataSpace.title).toBeUndefined();
  expect(dataSpace.executionContextNames).toEqual([]);
  expect(dataSpace.mappingPaths).toEqual([]);
  expect(dataSpace.elementCount).toBe(0);
  expect(dataSpace.executableCount).toBe(0);
  expect(dataSpace.diagramPaths).toEqual([]);
  expect(dataSpace.supportLabel).toBe('None');
});
