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

export enum PURE_GRAMMAR_TOKEN {
  WHITESPACE = '',

  KEYWORD = 'keyword',
  IDENTIFIER = 'identifier',
  OPERATOR = 'operator',
  DELIMITER = 'delimiter',

  PARSER = 'parser',
  NUMBER = 'number',
  DATE = 'date',
  COLOR = 'color',
  PACKAGE = 'package',
  STRING = 'string',
  COMMENT = 'comment',

  LANGUAGE_STRUCT = 'language-struct',
  MULTIPLICITY = 'multiplicity',
  GENERICS = 'generics',
  PROPERTY = 'property',
  PARAMETER = 'parameter',
  VARIABLE = 'variable',
  TYPE = 'type',

  INVALID = 'invalid',
}
