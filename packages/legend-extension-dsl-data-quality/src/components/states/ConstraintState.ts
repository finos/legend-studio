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
  type Constraint,
  buildSourceInformationSourceId,
  LAMBDA_PIPE,
} from '@finos/legend-graph';
import { action, makeObservable, observable } from 'mobx';
import { uuid } from '@finos/legend-shared';

export const CONSTRAINT_SOURCE_ID_LABEL = 'constraint';
export const VALIDATION_SOURCE_ID_LABEL = 'validation';
export const VALIDATION_ROW_MAP_ID_LABEL = 'validation_row_map';

export class ConstraintState {
  readonly uuid = uuid();
  constraint: Constraint;
  lambdaString: string;
  isSelected = false;
  lambdaPrefix: string = LAMBDA_PIPE;

  constructor(constraint: Constraint) {
    makeObservable(this, {
      constraint: observable,
      isSelected: observable,
      lambdaString: observable,
      setLambdaString: action,
      setIsSelected: action,
    });

    this.constraint = constraint;
    this.lambdaString = '';
  }

  setLambdaString(val: string): void {
    this.lambdaString = val;
  }

  setIsSelected(val: boolean) {
    this.isSelected = val;
  }

  extractLambdaString(fullLambdaString: string): string {
    return fullLambdaString.substring(
      fullLambdaString.indexOf(this.lambdaPrefix) + this.lambdaPrefix.length,
      fullLambdaString.length,
    );
  }

  get lambdaId(): string {
    return buildSourceInformationSourceId([
      this.constraint._OWNER.path,
      CONSTRAINT_SOURCE_ID_LABEL,
      this.constraint.name,
      this.uuid, // in case of duplications
    ]);
  }
}
