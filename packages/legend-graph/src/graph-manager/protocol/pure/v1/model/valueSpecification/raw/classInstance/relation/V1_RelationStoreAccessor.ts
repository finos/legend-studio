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

import { V1_ClassInstanceType } from '../../../../../transformation/pureProtocol/serializationHelpers/V1_ValueSpecificationSerializer.js';

export abstract class V1_Accessor {
  path: string[] = [];

  abstract INSTANCE_TYPE: V1_ClassInstanceType;
}

export class V1_RelationStoreAccessor extends V1_Accessor {
  metadata?: boolean;

  get INSTANCE_TYPE(): V1_ClassInstanceType {
    return V1_ClassInstanceType.RELATION_STORE_ACCESSOR;
  }
}

export class V1_DataProductAccessor extends V1_Accessor {
  parameters: string[] = [];
  get INSTANCE_TYPE(): V1_ClassInstanceType {
    return V1_ClassInstanceType.DATA_PRODUCT_ACCESSOR;
  }
}

export class V1_IngestDefinitionAccessor extends V1_Accessor {
  metadata = false;

  get INSTANCE_TYPE(): V1_ClassInstanceType {
    return V1_ClassInstanceType.INGEST_ACCESSOR;
  }
}

export class V1_SQLAccessor extends V1_Accessor {
  sql!: string;

  get INSTANCE_TYPE(): V1_ClassInstanceType {
    return V1_ClassInstanceType.SQL_ACCESSOR;
  }
}
