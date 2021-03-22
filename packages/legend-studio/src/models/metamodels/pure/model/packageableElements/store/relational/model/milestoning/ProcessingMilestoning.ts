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

import { TemporalMilestoning } from './Milestoning';
import { CORE_HASH_STRUCTURE } from '../../../../../../../../MetaModelConst';
import { hashArray } from '@finos/legend-studio-shared';

export class ProcessingMilestoning extends TemporalMilestoning {
  // TODO: resolve in,out to a column
  in: string;
  out: string;
  outIsInclusive: boolean;

  constructor(_in: string, out: string, outIsInclusive: boolean) {
    super();
    this.in = _in;
    this.out = out;
    this.outIsInclusive = outIsInclusive;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.PROCESSING_MILESTONING,
      this.infinityDate ?? '',
      this.in,
      this.out,
      this.outIsInclusive.toString(),
    ]);
  }
}
