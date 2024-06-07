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

import { LegendREPLGridClientWebApplication } from '@finos/legend-application-repl';
import './index.scss';
import config from '../repl.config.js';

// Resolve baseUrl relatively for application to work in vscode code-server
const relativeBaseUrl = new URL('./', window.location.href).pathname;
// TODO: Fix this to show DataCube in developer workspaces
LegendREPLGridClientWebApplication.run(config.baseUrl);
