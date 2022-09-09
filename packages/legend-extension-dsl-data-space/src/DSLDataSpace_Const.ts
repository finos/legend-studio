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

// NOTE: these are non-compilable profile and tag that we come up with for query
// so that it records the dataSpace it is created from
export const QUERY_PROFILE_PATH = 'meta::pure::profiles::query';
export const QUERY_PROFILE_TAG_DATA_SPACE = 'dataSpace';

export const DEFAULT_DATA_SPACE_LOADER_LIMIT = 10;
export const MINIMUM_DATA_SPACE_LOADER_SEARCH_LENGTH = 3;
