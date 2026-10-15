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
// Pure text Cube writes for the engine to parse, as a user would type it: an
// Extend's columns from Explore JSON (PLAN §11.20), and the column names the
// expression editors insert.

const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/u;

/** A Pure string literal: quoted, its backslashes and quotes escaped */
export const pureStringLiteral = (text: string): string =>
  `'${text.replace(/\\/gu, '\\\\').replace(/'/gu, "\\'")}'`;

/** How an expression reads a column: `$x.NAME`, or `$x.'a name'` for one that isn't an identifier */
export const columnAccessOf = (name: string): string =>
  IDENTIFIER.test(name) ? `$x.${name}` : `$x.${pureStringLiteral(name)}`;
