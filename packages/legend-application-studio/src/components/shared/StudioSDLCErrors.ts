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

export enum STUDIO_SDLC_USER_ERRORS {
  COMMIT_WORKSPACE_WITH_SNAPSHOT = "Can't create review:  Snapshot dependencies are mutable and should be only used in the context of your workspace for testing. Once ready to merge to master you should choose a fixed version of said project to be able to commit your changes.",
}
