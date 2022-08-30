import { RawLambda } from '@finos/legend-graph';
import { hashObject } from '@finos/legend-shared';
import type { QueryBuilderState } from './QueryBuilderState.js';

export class QueryBuilderChangeDetectionState {
  querybuildState: QueryBuilderState;
  queryHashCode = hashObject(new RawLambda(undefined, undefined));
  isEnabled = false;

  constructor(queryBuilderState: QueryBuilderState) {
    this.querybuildState = queryBuilderState;
  }

  setQueryHashCode(val: string): void {
    this.queryHashCode = val;
  }

  setIsEnabled(val: boolean): void {
    this.isEnabled = val;
  }
}
