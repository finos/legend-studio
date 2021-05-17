import { isEmpty } from '@finos/legend-studio-shared';

export type RawRelationalOperationElement = object; // @MARKER GENERATED MODEL DISCREPANCY --- Studio does not process relational operation element

export const createStubRelationalOperationElement = (): RawRelationalOperationElement => ({});
export const isStubRelationalOperationElement = (
  operation: RawRelationalOperationElement,
): boolean => isEmpty(operation);
