import type { VersionedProjectData } from '@finos/legend-server-depot';

export abstract class CubeInputSource {}

export abstract class LegendDepotSavedSource {
  project!: VersionedProjectData;
}

export class LegendSavedQuerySource extends CubeInputSource {
  id: string;

  constructor(id: string) {
    super();
    this.id = id;
  }
}

export class LegendDepotService extends LegendDepotSavedSource {
  service!: string;
}

export class LegendDepotFunction extends LegendDepotSavedSource {
  _function!: string;
}

export class LegendDepotTable extends LegendDepotSavedSource {
  database!: string;
  schema!: string;
  table!: string;
  runtime!: string;
}
