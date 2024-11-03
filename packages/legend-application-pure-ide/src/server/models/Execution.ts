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

import { uuid } from '@finos/legend-shared';
import {
  createModelSchema,
  deserialize,
  list,
  object,
  optional,
  primitive,
} from 'serializr';

export interface ExecutionActivity {
  executing: boolean;
  text: string;
}

export abstract class ExecutionResult {
  text?: string;
  // compiler!: string;
  reinit?: boolean;
}

export class ExecutionSuccessResult extends ExecutionResult {
  declare text: string;
  cache!: boolean;
  modifiedFiles: string[] = [];
  declare reinit: boolean;
}

createModelSchema(ExecutionSuccessResult, {
  text: primitive(),
  cache: primitive(),
  modifiedFiles: list(primitive()),
  reinit: primitive(),
});

export class ExecutionFailureResult extends ExecutionResult {
  declare text: string;
  RO!: boolean;
  line?: number;
  column?: number;
  source?: string;
  error!: boolean;
  sessionError?: string;
}

createModelSchema(ExecutionFailureResult, {
  text: primitive(),
  RO: primitive(),
  line: optional(primitive()),
  column: optional(primitive()),
  source: optional(primitive()),
  error: primitive(),
  sessionError: primitive(),
});

class GetConceptJumpTo {
  RO!: string;
  line!: number;
  column!: number;
  source!: string;
}

createModelSchema(GetConceptJumpTo, {
  RO: primitive(),
  line: primitive(),
  column: primitive(),
  source: primitive(),
});

export class GetConceptResult extends ExecutionResult {
  declare text: string;
  jumpTo!: GetConceptJumpTo;
}

createModelSchema(GetConceptResult, {
  text: primitive(),
  jumpTo: object(GetConceptJumpTo),
});

export class CandidateWithPackageImported {
  uuid = uuid();
  sourceID!: string;
  line!: number;
  column!: number;
  foundName!: string;
}

createModelSchema(CandidateWithPackageImported, {
  sourceID: primitive(),
  line: primitive(),
  column: primitive(),
  foundName: primitive(),
});

export class CandidateWithPackageNotImported {
  uuid = uuid();
  sourceID!: string;
  line!: number;
  column!: number;
  foundName!: string;
  add!: boolean;
  messageToBeModified!: string;
  fileToBeModified!: string;
  lineToBeModified!: number;
  columnToBeModified!: number;
}

createModelSchema(CandidateWithPackageNotImported, {
  sourceID: primitive(),
  line: primitive(),
  column: primitive(),
  foundName: primitive(),
  add: primitive(),
  messageToBeModified: primitive(),
  fileToBeModified: primitive(),
  lineToBeModified: primitive(),
  columnToBeModified: primitive(),
});

export class UnmatchedFunctionResult extends ExecutionFailureResult {
  candidateName!: string;
  candidatesWithPackageImported: CandidateWithPackageImported[] = [];
  candidatesWithPackageNotImported: CandidateWithPackageNotImported[] = [];
}

createModelSchema(UnmatchedFunctionResult, {
  candidateName: primitive(),
  candidatesWithPackageImported: list(object(CandidateWithPackageImported)),
  candidatesWithPackageNotImported: list(
    object(CandidateWithPackageNotImported),
  ),
});

export class UnknownSymbolResult extends ExecutionFailureResult {
  candidateName!: string;
  candidates: CandidateWithPackageNotImported[] = [];
}

createModelSchema(UnknownSymbolResult, {
  candidateName: primitive(),
  candidates: list(object(CandidateWithPackageNotImported)),
});

export class TestAttribute {
  id!: string;
  parentId!: string;
  file!: string;
  line!: string; // number
  column!: string; // number
}

createModelSchema(TestAttribute, {
  id: primitive(),
  parentId: primitive(),
  file: primitive(),
  line: primitive(),
  column: primitive(),
});

export class TestInfo {
  children: TestInfo[] = [];
  li_attr!: TestAttribute;
  text!: string;
  type?: string; // presence indicate this is the leaf
}

createModelSchema(TestInfo, {
  children: list(object(TestInfo)),
  li_attr: object(TestAttribute),
  text: primitive(),
  type: primitive(),
});

export class TestExecutionResult extends ExecutionResult {
  count!: number;
  filterPaths: string[] = [];
  path!: string;
  pctAdapter?: string | undefined;
  relevantTestsOnly!: boolean;
  runnerId!: number;
  tests: TestInfo[] = [];
}

createModelSchema(TestExecutionResult, {
  count: primitive(),
  filterPaths: list(primitive()),
  path: primitive(),
  pctAdapter: optional(primitive()),
  relevantTestsOnly: primitive(),
  runnerId: primitive(),
  tests: list(object(TestInfo)),
});

export const deserializeExecutionResult = (
  value: Record<PropertyKey, unknown>,
): ExecutionResult => {
  if (value.error) {
    if (value.candidateName && value.PureUnmatchedFunctionException) {
      return deserialize(UnmatchedFunctionResult, value);
    } else if (value.candidateName && value.candidates) {
      return deserialize(UnknownSymbolResult, value);
    }
    return deserialize(ExecutionFailureResult, value);
  } else if (value.jumpTo) {
    return deserialize(GetConceptResult, value);
  } else if (value.tests) {
    return deserialize(TestExecutionResult, value);
  }
  return deserialize(ExecutionSuccessResult, value);
};
