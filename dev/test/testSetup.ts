/**
 * Copyright 2020 Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import testConfig from 'Dev/test/testConfig.json';
import { executionClient } from 'API/ExecutionClient';
import { sdlcClient } from 'API/SdlcClient';
import { Log, LOG_LEVEL } from 'Utilities/Logger';

// We don't need to initialize Network Client because it is already mocked
// tracer client does not need to be initialized because we mocked Network Client to bypass tracing support completely
executionClient.initialize(testConfig.sdlcServer);
sdlcClient.initialize(testConfig.execServer);

// Mute log by default, only show error if occured, for tests that require seeing log,
// tester need to unmute and spy accordingly
Log.mute(LOG_LEVEL.ERROR);
