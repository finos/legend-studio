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

export enum LEGEND_DATACUBE_APP_EVENT {
  CREATE_DATACUBE__SUCCESS = 'data-cube.create.success',
  CREATE_DATACUBE__FAILURE = 'data-cube.create.failure',
  LOAD_DATACUBE__SUCCESS = 'data-cube.load.success',
  LOAD_DATACUBE__FAILURE = 'data-cube.load.failure',
  NEW_DATACUBE__SUCCESS = 'data-cube.new.success',
  NEW_DATACUBE__FAILURE = 'data-cube.new.failure',
  UPDATE_DATACUBE__SUCCESS = 'data-cube.update.success',
  UPDATE_DATACUBE__FAILURE = 'data-cube.update.failure',
  DELETE_DATACUBE__SUCCESS = 'data-cube.delete.success',
  DELETE_DATACUBE__FAILURE = 'data-cube.delete.failure',
}
