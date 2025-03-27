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

export enum DATACUBE_APP_EVENT {
  CREATE_DATACUBE__SUCCESS = 'dataCube.create-dataCube.success',
  CREATE_DATACUBE__FAILURE = 'dataCube.create-dataCube.failure',
  LOAD_DATACUBE__SUCCESS = 'dataCube.load-dataCube.success',
  LOAD_DATACUBE__FAILURE = 'dataCube.load-dataCube.failure',
  NEW_DATACUBE__SUCCESS = 'dataCube.new-dataCube.success',
  NEW_DATACUBE__FAILURE = 'dataCube.new-dataCube.failure',
  UPDATE_DATACUBE__SUCCESS = 'dataCube.update-dataCube.success',
  UPDATE_DATACUBE__FAILURE = 'dataCube.update-dataCube.failure',
  DELETE_DATACUBE__SUCCESS = 'dataCube.delete-dataCube.success',
  DELETE_DATACUBE__FAILURE = 'dataCube.delete-dataCube.failure',
}
