import { LegendApplicationConfig } from '@finos/legend-application';

export class LegendVSCodeApplicationConfig extends LegendApplicationConfig {
  override getDefaultApplicationStorageKey(): string {
    return 'legend-vs-code';
  }
}
