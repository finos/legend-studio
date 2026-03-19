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

import {
  QUERY_PROFILE_PATH,
  QueryTaggedValue,
  isValidFullPath,
  type Query,
} from '@finos/legend-graph';

export const QUERY_PROFILE_TAG_DATA_PRODUCT = 'dataProduct';

export const createQueryDataProductTaggedValue = (
  dataProductPath: string,
): QueryTaggedValue => {
  const taggedValue = new QueryTaggedValue();
  taggedValue.profile = QUERY_PROFILE_PATH;
  taggedValue.tag = QUERY_PROFILE_TAG_DATA_PRODUCT;
  taggedValue.value = dataProductPath;
  return taggedValue;
};

export const getDataProductQueryExecutionInfo = (
  query: Query,
): string | undefined => {
  const dataProductTaggedValue = query.taggedValues?.find(
    (taggedValue) =>
      taggedValue.profile === QUERY_PROFILE_PATH &&
      taggedValue.tag === QUERY_PROFILE_TAG_DATA_PRODUCT &&
      isValidFullPath(taggedValue.value),
  );
  return dataProductTaggedValue?.value;
};
