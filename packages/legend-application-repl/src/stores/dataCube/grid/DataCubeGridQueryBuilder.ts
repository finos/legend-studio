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

/*****************************************************************************
 * [GRID]
 *
 * This is a collection of utilities used to directly build adhoc
 * executable queries for fetching data for the grid. The grid comes with
 * features that requires building slight modifications of the query that
 * would be generated from the snapshot, such as in the case of pagination,
 * drilldown (group by).
 *****************************************************************************/
