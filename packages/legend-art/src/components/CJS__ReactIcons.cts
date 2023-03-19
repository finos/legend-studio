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

/**
 * Previously, these exports rely on ES module interop to expose `default` export
 * properly. But since we use `ESM` for Typescript resolution now, we lose this
 * so we have to workaround by importing these and re-export them from CJS
 *
 * TODO: remove these when the package properly work with Typescript's nodenext
 * module resolution
 *
 * @workaround ESM
 * See https://github.com/microsoft/TypeScript/issues/49298
 *
 * In addition to that, due to our upgrade to Typescript 5.0, we are forced to enable
 * --verbatimModuleSyntax flag, so we have to use CommonJS syntax in this file
 * See https://devblogs.microsoft.com/typescript/announcing-typescript-5-0/#verbatimmodulesyntax
 */
import FA = require('react-icons/fa');
import GI = require('react-icons/gi');
import MD = require('react-icons/md');
import VSC = require('react-icons/vsc');
import GO = require('react-icons/go');
import SI = require('react-icons/si');
import IO5 = require('react-icons/io5');
import BS = require('react-icons/bs');
import BI = require('react-icons/bi');
import CG = require('react-icons/cg');
import FI = require('react-icons/fi');
import RI = require('react-icons/ri');
import TB = require('react-icons/tb');
import HI = require('react-icons/hi');

export = {
  FA,
  GI,
  MD,
  VSC,
  GO,
  SI,
  IO5,
  BS,
  BI,
  CG,
  FI,
  RI,
  TB,
  HI,
};
