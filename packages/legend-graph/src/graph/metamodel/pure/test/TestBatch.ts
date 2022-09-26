import type { Hashable } from '@finos/legend-shared';
import type { TestAssertion } from './assertion/TestAssertion.js';

export abstract class TestBatch implements Hashable {
  id!: string;
  batchId!: string;
  assertions: TestAssertion[] = [];

  abstract get hashCode(): string;
}
