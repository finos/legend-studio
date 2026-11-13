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

import { test, expect, jest } from '@jest/globals';
import { unitTest } from '../../__test-utils__/TestUtils.js';
import { buildUrl, downloadBlob } from '../NetworkUtils.js';

test(unitTest('Build URL'), () => {
  expect(buildUrl(['http://www.example.org/', '/subroute'])).toEqual(
    'http://www.example.org/subroute',
  );
  expect(
    buildUrl([
      'http://www.example.org/',
      '/subroute/////',
      '//////another-subroute////',
    ]),
  ).toEqual('http://www.example.org/subroute/another-subroute');
  expect(
    buildUrl(['http://www.example.org', 'subroute', 'another-subroute']),
  ).toEqual('http://www.example.org/subroute/another-subroute');
});

test(unitTest('Download a blob'), () => {
  const url = URL as unknown as {
    createObjectURL: (blob: Blob) => string;
  };
  const { createObjectURL } = url;
  url.createObjectURL = jest.fn(() => 'blob:file');
  // This package's tests run without a DOM: just what the download touches.
  const clicked: { download: string; href: string }[] = [];
  const link = {
    download: '',
    href: '',
    click(): void {
      clicked.push({ download: link.download, href: link.href });
    },
  };
  const global = globalThis as unknown as { document?: unknown };
  global.document = {
    createElement: () => link,
    body: { appendChild: jest.fn(), removeChild: jest.fn() },
  };

  try {
    downloadBlob('files.zip', new Blob(['zip']));

    expect(clicked).toEqual([{ download: 'files.zip', href: 'blob:file' }]);
  } finally {
    delete global.document;
    url.createObjectURL = createObjectURL;
  }
});
