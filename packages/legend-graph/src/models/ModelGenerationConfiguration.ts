export abstract class ModelGenerationConfiguration {
  key: string;
  label?: string | undefined;

  protected constructor(key: string, label: string | undefined) {
    this.key = key;
    this.label = label;
  }
}
