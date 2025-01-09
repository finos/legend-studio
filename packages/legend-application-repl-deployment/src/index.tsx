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

import { LegendREPLWebApplication } from '@finos/legend-application-repl';
import './index.css';
// NOTE: tailwind style takes precedence over other styles since it's generated and we should not allow
// other styles to override it
import '../lib/tailwind.css'; // eslint-disable-line @finos/legend/no-cross-workspace-non-export-usage

// Resolve baseUrl relatively for application to work in vscode code-server
const relativeBaseUrl = new URL('./', window.location.href).pathname;
LegendREPLWebApplication.run(relativeBaseUrl);
