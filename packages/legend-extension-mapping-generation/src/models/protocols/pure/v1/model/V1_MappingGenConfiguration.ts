import { type Hashable, hashArray } from '@finos/legend-shared';

export class V1_MappingGenConfiguration implements Hashable {
  sourceMapping?: string | undefined;
  mappingToRegenerate?: string | undefined;
  mappingNewName?: string | undefined;
  storeNewName?: string | undefined;
  m2mAdditionalMappings: string[] = [];

  constructor(
    sourceMapping: string | undefined,
    mappingToRegenerate: string | undefined,
    mappingNewName: string | undefined,
    storeNewName: string | undefined,
    m2mAdditionalMappings: string[],
  ) {
    this.sourceMapping = sourceMapping;
    this.mappingToRegenerate = mappingToRegenerate;
    this.mappingNewName = mappingNewName;
    this.storeNewName = storeNewName;
    this.m2mAdditionalMappings = m2mAdditionalMappings;
  }

  get hashCode(): string {
    return hashArray([
      'MAPPING_GEN_CONFIGURATION',
      this.sourceMapping ?? '',
      this.mappingToRegenerate ?? '',
      hashArray(this.m2mAdditionalMappings),
      this.mappingNewName ?? '',
      this.storeNewName ?? '',
    ]);
  }
}
