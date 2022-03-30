import { ModelGenerationConfiguration } from  '@finos/legend-graph';

export class V1_MappingGenConfiguration extends ModelGenerationConfiguration {
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
    key: string,
    label?: string | undefined,
  ) {
    super(key, label);
    this.sourceMapping = sourceMapping;
    this.mappingToRegenerate = mappingToRegenerate;
    this.mappingNewName = mappingNewName;
    this.storeNewName = storeNewName;
    this.m2mAdditionalMappings = m2mAdditionalMappings;
  }
}
