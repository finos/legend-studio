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

import { describe, expect, test } from '@jest/globals';
import { readdirSync, readFileSync } from 'fs';
import { join, relative, resolve } from 'path';
import ts from 'typescript';
import { unitTest } from '../__test-utils__/CubeTestUtils.js';

/**
 * Guards the host-free rule of the core (see README.md): outside tests, the core
 * imports only its own modules and uses only ECMAScript globals. ESLint and the
 * build config enforce the same rule; this test also runs when those are skipped.
 */

const PACKAGE_DIR = resolve(__dirname, '../..');
const SOURCE_DIR = resolve(PACKAGE_DIR, 'src');
const TEST_ONLY_FOLDERS = new Set(['__tests__', '__test-utils__', '__mocks__']);

/**
 * Tooling the core may declare as dev dependencies. A runtime dependency of any
 * kind, or any other dev dependency, breaks the host-free rule.
 */
const ALLOWED_DEV_DEPENDENCIES = new Set([
  '@finos/legend-dev-utils',
  '@jest/globals',
  'cross-env',
  'eslint',
  'jest',
  'npm-run-all',
  'rimraf',
  'typescript',
]);

const collectSourceFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      return TEST_ONLY_FOLDERS.has(entry.name) ? [] : collectSourceFiles(path);
    }
    return /\.tsx?$/u.test(entry.name) ? [path] : [];
  });

const isRelativeModuleSpecifier = (specifier: string): boolean =>
  specifier.startsWith('./') || specifier.startsWith('../');

/**
 * Lists every module reference in the file that is not relative: static imports
 * and re-exports (type-only ones included), `import()` calls and types,
 * `require()`, `import x = require()`, and any triple-slash directive.
 */
const findForbiddenModuleReferences = (
  fileName: string,
  text: string,
): string[] => {
  const sourceFile = ts.createSourceFile(
    fileName,
    text,
    ts.ScriptTarget.Latest,
    true,
  );
  const references = [
    ...sourceFile.typeReferenceDirectives.map(
      (directive) => `/// <reference types="${directive.fileName}" />`,
    ),
    ...sourceFile.libReferenceDirectives.map(
      (directive) => `/// <reference lib="${directive.fileName}" />`,
    ),
    ...sourceFile.referencedFiles.map(
      (directive) => `/// <reference path="${directive.fileName}" />`,
    ),
  ];
  const visit = (node: ts.Node): void => {
    let specifier: ts.Node | undefined;
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      specifier = node.moduleSpecifier;
    } else if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference)
    ) {
      specifier = node.moduleReference.expression;
    } else if (
      ts.isCallExpression(node) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) &&
          node.expression.text === 'require'))
    ) {
      specifier = node.arguments[0];
    } else if (
      ts.isImportTypeNode(node) &&
      ts.isLiteralTypeNode(node.argument)
    ) {
      specifier = node.argument.literal;
    }
    if (specifier) {
      if (!ts.isStringLiteralLike(specifier)) {
        references.push(`(computed) ${specifier.getText(sourceFile)}`);
      } else if (!isRelativeModuleSpecifier(specifier.text)) {
        references.push(specifier.text);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return references;
};

/**
 * Compiler options with the ECMAScript library alone and no ambient types: any
 * browser or Node global (`window`, `fetch`, `console`, `setTimeout`, `process`,
 * ...) is a missing name.
 */
const HOST_FREE_COMPILER_OPTIONS: ts.CompilerOptions = {
  target: ts.ScriptTarget.ESNext,
  module: ts.ModuleKind.NodeNext,
  moduleResolution: ts.ModuleResolutionKind.NodeNext,
  lib: ['lib.esnext.d.ts'],
  types: [],
  strict: true,
  noEmit: true,
  skipLibCheck: true,
};

// Library files never change, so parse them once for all the compilations below
const LIBRARY_SOURCE_FILE_CACHE = new Map<string, ts.SourceFile | undefined>();

/**
 * Type-checks the given files (path to content) with the host-free options and
 * returns the diagnostics as `file:line: message`.
 */
const compileHostFree = (files: Map<string, string>): string[] => {
  // the compiler works with forward slashes on every platform
  const filesToCheck = new Map(
    Array.from(files.entries()).map(([path, text]) => [
      path.replaceAll('\\', '/'),
      text,
    ]),
  );
  const host = ts.createCompilerHost(HOST_FREE_COMPILER_OPTIONS);
  const getLibrarySourceFile = host.getSourceFile.bind(host);
  const libraryFileExists = host.fileExists.bind(host);
  const readLibraryFile = host.readFile.bind(host);
  host.getSourceFile = (fileName, languageVersionOrOptions, ...rest) => {
    const text = filesToCheck.get(fileName);
    if (text !== undefined) {
      return ts.createSourceFile(
        fileName,
        text,
        languageVersionOrOptions,
        true,
      );
    }
    if (!LIBRARY_SOURCE_FILE_CACHE.has(fileName)) {
      LIBRARY_SOURCE_FILE_CACHE.set(
        fileName,
        getLibrarySourceFile(fileName, languageVersionOrOptions, ...rest),
      );
    }
    return LIBRARY_SOURCE_FILE_CACHE.get(fileName);
  };
  host.fileExists = (fileName) =>
    filesToCheck.has(fileName) || libraryFileExists(fileName);
  host.readFile = (fileName) =>
    filesToCheck.get(fileName) ?? readLibraryFile(fileName);
  const program = ts.createProgram(
    Array.from(filesToCheck.keys()),
    HOST_FREE_COMPILER_OPTIONS,
    host,
  );
  return ts.getPreEmitDiagnostics(program).map((diagnostic) => {
    const message = ts.flattenDiagnosticMessageText(
      diagnostic.messageText,
      '\n',
    );
    if (diagnostic.file === undefined || diagnostic.start === undefined) {
      return message;
    }
    const { line } = diagnostic.file.getLineAndCharacterOfPosition(
      diagnostic.start,
    );
    return `${relative(PACKAGE_DIR, diagnostic.file.fileName)}:${line + 1}: ${message}`;
  });
};

// Fixtures are compiled as if they sat next to this test, so that relative imports
// between them resolve, and the package's `"type": "module"` applies to them
const fixturePath = (name: string): string =>
  resolve(SOURCE_DIR, '__tests__', `__HostFreeFixture__${name}.ts`);

describe(unitTest('Module reference scan'), () => {
  test.each([
    ["import { observable } from 'mobx';", 'mobx'],
    [
      "import type { PlainObject } from '@finos/legend-shared';",
      '@finos/legend-shared',
    ],
    ["export * from 'react';", 'react'],
    ["export { type GridApi } from 'ag-grid-community';", 'ag-grid-community'],
    ["const fs = await import('fs');", 'fs'],
    ["const path = require('node:path');", 'node:path'],
    ["import fs = require('fs');", 'fs'],
    [
      "type GridApi = import('ag-grid-community').GridApi;",
      'ag-grid-community',
    ],
    ["const name = 'fs'; await import(name);", '(computed) name'],
    ['/// <reference lib="dom" />', '/// <reference lib="dom" />'],
    ['/// <reference types="node" />', '/// <reference types="node" />'],
  ])('Flags `%s`', (text, reference) => {
    expect(findForbiddenModuleReferences('fixture.ts', text)).toEqual([
      reference,
    ]);
  });

  test('Allows relative module references', () => {
    expect(
      findForbiddenModuleReferences(
        'fixture.ts',
        [
          "import { a } from './a.js';",
          "import type { B } from '../b.js';",
          "export * from './c.js';",
          "export { type D } from '../d.js';",
          "const e = await import('./e.js');",
          'export {};',
        ].join('\n'),
      ),
    ).toEqual([]);
  });
});

describe(unitTest('Host-free compilation'), () => {
  test.each([
    // [code, what the error message mentions]
    ['window.innerWidth', "Cannot find name 'window'"],
    ['document.title', "Cannot find name 'document'"],
    ["localStorage.getItem('key')", "Cannot find name 'localStorage'"],
    ["fetch('https://example.org')", "Cannot find name 'fetch'"],
    ['globalThis.window', "type 'typeof globalThis' has no index signature"],
    ["console.log('message')", "Cannot find name 'console'"],
    ['setTimeout(() => undefined, 0)', "Cannot find name 'setTimeout'"],
    ['process.env.HOME', "Cannot find name 'process'"],
    ['structuredClone({})', "Cannot find name 'structuredClone'"],
  ])('Rejects `%s`', (expression, message) => {
    const diagnostics = compileHostFree(
      new Map([
        [
          fixturePath('host-global'),
          `export const value = (): unknown => ${expression};`,
        ],
      ]),
    );
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toContain(message);
  });

  test('Accepts ECMAScript-only code that spans modules', () => {
    expect(
      compileHostFree(
        new Map([
          [
            fixturePath('a'),
            'export const total = (values: number[]): number => values.reduce((sum, value) => sum + value, 0);',
          ],
          [
            fixturePath('b'),
            [
              "import { total } from './__HostFreeFixture__a.js';",
              'export const describeTotal = (values: number[]): string =>',
              "  `${new Intl.NumberFormat('en-US').format(total(values))} over ${new Set(values).size} values`;",
            ].join('\n'),
          ],
        ]),
      ),
    ).toEqual([]);
  });
});

describe(unitTest('Legend Cube core'), () => {
  test('Declares no runtime dependency and only tooling dev dependencies', () => {
    const packageJson = JSON.parse(
      readFileSync(resolve(PACKAGE_DIR, 'package.json'), 'utf-8'),
    ) as {
      dependencies?: Record<string, string>;
      peerDependencies?: Record<string, string>;
      optionalDependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    expect(packageJson.dependencies).toBeUndefined();
    expect(packageJson.peerDependencies).toBeUndefined();
    expect(packageJson.optionalDependencies).toBeUndefined();
    expect(
      Object.keys(packageJson.devDependencies ?? {}).filter(
        (name) => !ALLOWED_DEV_DEPENDENCIES.has(name),
      ),
    ).toEqual([]);
  });

  const sourceFiles = collectSourceFiles(SOURCE_DIR);

  test('Imports only its own modules', () => {
    expect(sourceFiles).not.toHaveLength(0);
    expect(
      sourceFiles.flatMap((file) =>
        findForbiddenModuleReferences(file, readFileSync(file, 'utf-8')).map(
          (reference) => `${relative(PACKAGE_DIR, file)}: ${reference}`,
        ),
      ),
    ).toEqual([]);
  });

  test('Compiles against the ECMAScript library alone', () => {
    expect(
      compileHostFree(
        new Map(sourceFiles.map((file) => [file, readFileSync(file, 'utf-8')])),
      ),
    ).toEqual([]);
  });
});
