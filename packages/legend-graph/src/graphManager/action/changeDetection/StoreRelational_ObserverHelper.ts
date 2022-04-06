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

import { computed, makeObservable, observable, override } from 'mobx';
import {
  type AuthenticationStrategy,
  ApiTokenAuthenticationStrategy,
  DefaultH2AuthenticationStrategy,
  DelegatedKerberosAuthenticationStrategy,
  GCPApplicationDefaultCredentialsAuthenticationStrategy,
  OAuthAuthenticationStrategy,
  SnowflakePublicAuthenticationStrategy,
  UsernamePasswordAuthenticationStrategy,
  GCPWorkloadIdentityFederationAuthenticationStrategy,
} from '../../../models/metamodels/pure/packageableElements/store/relational/connection/AuthenticationStrategy';
import {
  type DatasourceSpecification,
  BigQueryDatasourceSpecification,
  DatabricksDatasourceSpecification,
  EmbeddedH2DatasourceSpecification,
  LocalH2DatasourceSpecification,
  RedshiftDatasourceSpecification,
  SnowflakeDatasourceSpecification,
  StaticDatasourceSpecification,
} from '../../../models/metamodels/pure/packageableElements/store/relational/connection/DatasourceSpecification';
import { MapperPostProcessor } from '../../../models/metamodels/pure/packageableElements/store/relational/connection/postprocessor/MapperPostProcessor';
import type { PostProcessor } from '../../../models/metamodels/pure/packageableElements/store/relational/connection/postprocessor/PostProcessor';
import type {
  DatabaseConnection,
  RelationalDatabaseConnection,
} from '../../../models/metamodels/pure/packageableElements/store/relational/connection/RelationalDatabaseConnection';
import type { EmbeddedRelationalInstanceSetImplementation } from '../../../models/metamodels/pure/packageableElements/store/relational/mapping/EmbeddedRelationalInstanceSetImplementation';
import type { FilterMapping } from '../../../models/metamodels/pure/packageableElements/store/relational/mapping/FilterMapping';
import type { GroupByMapping } from '../../../models/metamodels/pure/packageableElements/store/relational/mapping/GroupByMapping';
import type { InlineEmbeddedRelationalInstanceSetImplementation } from '../../../models/metamodels/pure/packageableElements/store/relational/mapping/InlineEmbeddedRelationalInstanceSetImplementation';
import type { OtherwiseEmbeddedRelationalInstanceSetImplementation } from '../../../models/metamodels/pure/packageableElements/store/relational/mapping/OtherwiseEmbeddedRelationalInstanceSetImplementation';
import type { RelationalInputData } from '../../../models/metamodels/pure/packageableElements/store/relational/mapping/RelationalInputData';
import type { RelationalInstanceSetImplementation } from '../../../models/metamodels/pure/packageableElements/store/relational/mapping/RelationalInstanceSetImplementation';
import type { RelationalPropertyMapping } from '../../../models/metamodels/pure/packageableElements/store/relational/mapping/RelationalPropertyMapping';
import type { RootRelationalInstanceSetImplementation } from '../../../models/metamodels/pure/packageableElements/store/relational/mapping/RootRelationalInstanceSetImplementation';
import { Column } from '../../../models/metamodels/pure/packageableElements/store/relational/model/Column';
import type { ColumnMapping } from '../../../models/metamodels/pure/packageableElements/store/relational/model/ColumnMapping';
import type { ColumnReference } from '../../../models/metamodels/pure/packageableElements/store/relational/model/ColumnReference';
import type { Database } from '../../../models/metamodels/pure/packageableElements/store/relational/model/Database';
import type { Filter } from '../../../models/metamodels/pure/packageableElements/store/relational/model/Filter';
import type { FilterReference } from '../../../models/metamodels/pure/packageableElements/store/relational/model/FilterReference';
import type { Join } from '../../../models/metamodels/pure/packageableElements/store/relational/model/Join';
import type { JoinReference } from '../../../models/metamodels/pure/packageableElements/store/relational/model/JoinReference';
import {
  type Milestoning,
  TemporalMilestoning,
} from '../../../models/metamodels/pure/packageableElements/store/relational/model/milestoning/Milestoning';
import {
  type RelationalDataType,
  Binary,
  BigInt,
  Bit,
  Char,
  Decimal,
  Double,
  Float,
  Integer,
  Numeric,
  Other,
  Real,
  SemiStructured,
  SmallInt,
  Timestamp,
  TinyInt,
  VarBinary,
  VarChar,
} from '../../../models/metamodels/pure/packageableElements/store/relational/model/RelationalDataType';
import {
  RelationalOperationElement,
  type NamedRelation,
  type JoinTreeNode,
  DynaFunction,
  TableAlias,
  TableAliasColumn,
  Literal,
  LiteralList,
  RelationalOperationElementWithJoin,
} from '../../../models/metamodels/pure/packageableElements/store/relational/model/RelationalOperationElement';
import type { Schema } from '../../../models/metamodels/pure/packageableElements/store/relational/model/Schema';
import type { Table } from '../../../models/metamodels/pure/packageableElements/store/relational/model/Table';
import {
  type NamedRelationalReference,
  TableReference,
} from '../../../models/metamodels/pure/packageableElements/store/relational/model/TableReference';
import type { View } from '../../../models/metamodels/pure/packageableElements/store/relational/model/View';
import { ViewReference } from '../../../models/metamodels/pure/packageableElements/store/relational/model/ViewReference';
import type { StoreRelational_PureGraphManagerPlugin_Extension } from '../../StoreRelational_PureGraphManagerPlugin_Extension';
import {
  type ObserverContext,
  observe_Abstract_PackageableElement,
  observe_PackageableElementReference,
  skipObserved,
  skipObservedWithContext,
} from './CoreObserverHelper';
import { observe_BindingTransformer } from './DSLExternalFormat_ObserverHelper';
import {
  observe_Abstract_Connection,
  observe_Abstract_InstanceSetImplementation,
  observe_Abstract_PropertyMapping,
  observe_PropertyMapping,
  observe_SetImplementation,
} from './DSLMapping_ObserverHelper';

// ------------------------------------- Operation -------------------------------------

export const observe_RelationalDataType = skipObserved(
  (metamodel: RelationalDataType): RelationalDataType => {
    if (
      metamodel instanceof BigInt ||
      metamodel instanceof SmallInt ||
      metamodel instanceof TinyInt ||
      metamodel instanceof Integer ||
      metamodel instanceof Float ||
      metamodel instanceof Double ||
      metamodel instanceof Timestamp ||
      metamodel instanceof Date ||
      metamodel instanceof Other ||
      metamodel instanceof Bit ||
      metamodel instanceof Real ||
      metamodel instanceof SemiStructured
    ) {
      return makeObservable(metamodel, {
        hashCode: computed,
      });
    } else if (
      metamodel instanceof VarChar ||
      metamodel instanceof Char ||
      metamodel instanceof VarBinary ||
      metamodel instanceof Binary
    ) {
      return makeObservable(metamodel, {
        size: observable,
        hashCode: computed,
      });
    } else if (metamodel instanceof Decimal || metamodel instanceof Numeric) {
      return makeObservable(metamodel, {
        precision: observable,
        scale: observable,
        hashCode: computed,
      });
    }
    return metamodel;
  },
);

export const observe_Column = skipObserved((metamodel: Column): Column => {
  makeObservable(metamodel, {
    name: observable,
    type: observable,
    nullable: observable,
    hashCode: computed,
  });

  observe_RelationalDataType(metamodel.type);

  return metamodel;
});

export const observe_TableReference = skipObserved(
  (metamodel: TableReference): TableReference => {
    makeObservable(metamodel, {
      value: observable,
      pointerHashCode: computed,
      selfJoinPointerHashCode: computed,
    });

    observe_PackageableElementReference(metamodel.ownerReference);

    return metamodel;
  },
);

export const observe_ViewReference = skipObserved(
  (metamodel: ViewReference): ViewReference => {
    makeObservable(metamodel, {
      value: observable,
      pointerHashCode: computed,
      selfJoinPointerHashCode: computed,
    });

    observe_PackageableElementReference(metamodel.ownerReference);

    return metamodel;
  },
);

const observe_NamedRelationalReference = (
  metamodel: NamedRelationalReference,
): NamedRelationalReference => {
  if (metamodel instanceof ViewReference) {
    return observe_ViewReference(metamodel);
  } else if (metamodel instanceof TableReference) {
    return observe_TableReference(metamodel);
  }
  return metamodel;
};

export const observe_TableAlias = skipObserved(
  (metamodel: TableAlias): TableAlias => {
    makeObservable(metamodel, {
      relation: observable,
      name: observable,
      database: observable,
      isSelfJoinTarget: observable,
    });

    observe_NamedRelationalReference(metamodel.relation);
    // TODO?: database?: Database | undefined;

    return metamodel;
  },
);

export const observe_DynaFunction = skipObserved(
  (metamodel: DynaFunction): DynaFunction => {
    makeObservable(metamodel, {
      name: observable,
      parameters: observable,
      hashCode: computed,
    });

    metamodel.parameters.forEach(observe_RelationalOperationElement);

    return metamodel;
  },
);

export const observe_ColumnReference = skipObserved(
  (metamodel: ColumnReference): ColumnReference => {
    makeObservable(metamodel, {
      value: observable,
    });

    observe_PackageableElementReference(metamodel.ownerReference);

    return metamodel;
  },
);

export const observe_TableAliasColumn = skipObserved(
  (metamodel: TableAliasColumn): TableAliasColumn => {
    makeObservable(metamodel, {
      alias: observable,
      column: observable,
      columnName: observable,
      hashCode: computed,
    });

    observe_TableAlias(metamodel.alias);
    observe_ColumnReference(metamodel.column);

    return metamodel;
  },
);

export const observe_JoinReference = skipObserved(
  (metamodel: JoinReference): JoinReference => {
    makeObservable(metamodel, {
      value: observable,
    });

    observe_PackageableElementReference(metamodel.ownerReference);

    return metamodel;
  },
);

export const observe_JoinTreeNode = skipObserved(
  (metamodel: JoinTreeNode): JoinTreeNode => {
    makeObservable(metamodel, {
      alias: observable,
      children: observable,
      joinType: observable,
      hashCode: computed,
    });

    if (metamodel.alias) {
      observe_TableAlias(metamodel.alias);
    }
    metamodel.children.forEach(observe_JoinTreeNode);
    observe_JoinReference(metamodel.join);

    return metamodel;
  },
);

export const observe_RelationalOperationElementWithJoin = skipObserved(
  (
    metamodel: RelationalOperationElementWithJoin,
  ): RelationalOperationElementWithJoin => {
    makeObservable(metamodel, {
      relationalOperationElement: observable,
      joinTreeNode: observable,
      hashCode: computed,
    });

    if (metamodel.relationalOperationElement) {
      observe_RelationalOperationElement(metamodel.relationalOperationElement);
    }
    if (metamodel.joinTreeNode) {
      observe_JoinTreeNode(metamodel.joinTreeNode);
    }

    return metamodel;
  },
);

export const observe_Literal = skipObserved((metamodel: Literal): Literal => {
  makeObservable(metamodel, {
    value: observable,
    hashCode: computed,
  });

  if (metamodel.value instanceof RelationalOperationElement) {
    observe_RelationalOperationElement(metamodel.value);
  }

  return metamodel;
});

export const observe_LiteralList = skipObserved(
  (metamodel: LiteralList): LiteralList => {
    makeObservable(metamodel, {
      values: observable,
      hashCode: computed,
    });

    metamodel.values.forEach(observe_Literal);

    return metamodel;
  },
);

export function observe_RelationalOperationElement(
  metamodel: RelationalOperationElement,
): RelationalOperationElement {
  if (metamodel instanceof DynaFunction) {
    return observe_DynaFunction(metamodel);
  } else if (metamodel instanceof TableAlias) {
    return observe_TableAlias(metamodel);
  } else if (metamodel instanceof TableAliasColumn) {
    return observe_TableAliasColumn(metamodel);
  } else if (metamodel instanceof Column) {
    return observe_Column(metamodel);
  } else if (metamodel instanceof Literal) {
    return observe_Literal(metamodel);
  } else if (metamodel instanceof LiteralList) {
    return observe_LiteralList(metamodel);
  } else if (metamodel instanceof RelationalOperationElementWithJoin) {
    return observe_RelationalOperationElementWithJoin(metamodel);
  }
  return metamodel;
}

// ------------------------------------- Milestoning -------------------------------------

export const observe_TemporalMilstoning = skipObserved(
  (metamodel: TemporalMilestoning): TemporalMilestoning =>
    // TODO
    metamodel,
);

const observe_Milestoning = skipObservedWithContext(
  (metamodel: Milestoning, context): Milestoning => {
    if (metamodel instanceof TemporalMilestoning) {
      return observe_TemporalMilstoning(metamodel);
    }
    const extraMilestoningObservers = context.plugins.flatMap(
      (plugin) =>
        (
          plugin as StoreRelational_PureGraphManagerPlugin_Extension
        ).getExtraMilestoningObservers?.() ?? [],
    );
    for (const observer of extraMilestoningObservers) {
      const observedMiletoning = observer(metamodel, context);
      if (observedMiletoning) {
        return observedMiletoning;
      }
    }
    return metamodel;
  },
);

// ------------------------------------- Store -------------------------------------

export const observe_ColumnMapping = skipObserved(
  (metamodel: ColumnMapping): ColumnMapping => {
    makeObservable(metamodel, {
      columnName: observable,
      relationalOperationElement: observable,
      hashCode: computed,
    });

    observe_RelationalOperationElement(metamodel.relationalOperationElement);

    return metamodel;
  },
);

export const observe_FilterReference = skipObserved(
  (metamodel: FilterReference): FilterReference => {
    makeObservable(metamodel, {
      value: observable,
    });

    observe_PackageableElementReference(metamodel.ownerReference);

    return metamodel;
  },
);

export const observe_FilterMapping = skipObserved(
  (metamodel: FilterMapping): FilterMapping => {
    makeObservable(metamodel, {
      joinTreeNode: observable,
      database: observable,
      filterName: observable,
      hashCode: computed,
    });

    if (metamodel.joinTreeNode) {
      observe_JoinTreeNode(metamodel.joinTreeNode);
    }
    observe_FilterReference(metamodel.filter);

    return metamodel;
  },
);

export const observe_GroupByMapping = skipObserved(
  (metamodel: GroupByMapping): GroupByMapping => {
    makeObservable(metamodel, {
      columns: observable,
    });

    metamodel.columns.forEach(observe_RelationalOperationElement);

    return metamodel;
  },
);

const observe_Abstract_NamedRelation = (metamodel: NamedRelation): void => {
  makeObservable(metamodel, {
    columns: observable,
    name: observable,
  });
};

export const observe_Table = skipObservedWithContext(
  (metamodel: Table, context): Table => {
    observe_Abstract_NamedRelation(metamodel);

    makeObservable(metamodel, {
      primaryKey: observable,
      hashCode: computed,
    });

    metamodel.primaryKey.forEach(observe_Column);
    metamodel.milestoning.forEach((m) => observe_Milestoning(m, context));

    return metamodel;
  },
);

export const observe_View = skipObservedWithContext(
  (metamodel: View, context): View => {
    observe_Abstract_NamedRelation(metamodel);

    makeObservable(metamodel, {
      primaryKey: observable,
      columnMappings: observable,
      filter: observable,
      distinct: observable,
      groupBy: observable,
      hashCode: computed,
    });

    metamodel.primaryKey.forEach(observe_Column);
    metamodel.columnMappings.forEach(observe_ColumnMapping);
    if (metamodel.filter) {
      observe_FilterMapping(metamodel.filter);
    }
    if (metamodel.groupBy) {
      observe_GroupByMapping(metamodel.groupBy);
    }

    return metamodel;
  },
);

export const observe_Schema = skipObservedWithContext(
  (metamodel: Schema, context): Schema => {
    makeObservable(metamodel, {
      name: observable,
      tables: observable,
      views: observable,
      hashCode: computed,
    });

    metamodel.tables.forEach((table) => observe_Table(table, context));
    metamodel.views.forEach((view) => observe_View(view, context));

    return metamodel;
  },
);

export const observe_Filter = skipObserved((metamodel: Filter): Filter => {
  makeObservable(metamodel, {
    name: observable,
    operation: observable,
    hashCode: computed,
  });

  observe_RelationalOperationElement(metamodel.operation);

  return metamodel;
});

export const observe_Join = skipObserved((metamodel: Join): Join => {
  makeObservable(metamodel, {
    name: observable,
    target: observable,
    aliases: observable,
    operation: observable,
    hashCode: computed,
  });

  if (metamodel.target) {
    observe_TableAlias(metamodel.target);
  }
  observe_RelationalOperationElement(metamodel.operation);
  // TODO?: aliases: Pair<TableAlias, TableAlias>[] = [];

  return metamodel;
});

export const observe_Database = skipObservedWithContext(
  (metamodel: Database, context): Database => {
    observe_Abstract_PackageableElement(metamodel);

    makeObservable<Database, '_elementHashCode'>(metamodel, {
      schemas: observable,
      joins: observable,
      filters: observable,
      _elementHashCode: override,
    });

    metamodel.schemas.forEach((schema) => observe_Schema(schema, context));
    metamodel.joins.forEach(observe_Join);
    metamodel.filters.forEach(observe_Filter);

    return metamodel;
  },
);

// ------------------------------------- Mapping -------------------------------------

export const observe_RelationalPropertyMapping = skipObservedWithContext(
  (
    metamodel: RelationalPropertyMapping,
    context,
  ): RelationalPropertyMapping => {
    observe_Abstract_PropertyMapping(metamodel, context);

    makeObservable(metamodel, {
      transformer: observable,
      relationalOperation: observable.ref,
      bindingTransformer: observable,
      hashCode: computed,
    });

    // TODO transformer?: EnumerationMapping | undefined;
    if (metamodel.bindingTransformer) {
      observe_BindingTransformer(metamodel.bindingTransformer);
    }

    return metamodel;
  },
);

export const observe_Abstract_EmbeddedRelationalInstanceSetImplementation = (
  metamodel: EmbeddedRelationalInstanceSetImplementation,
  context: ObserverContext,
): EmbeddedRelationalInstanceSetImplementation => {
  observe_Abstract_InstanceSetImplementation(metamodel, context);
  observe_Abstract_PropertyMapping(metamodel, context);

  makeObservable(metamodel, {
    id: observable,
    propertyMappings: observable,
    rootInstanceSetImplementation: observable,
    parent: observable,
    primaryKey: observable,
  });

  metamodel.primaryKey.forEach(observe_RelationalOperationElement);

  return metamodel;
};

export const observe_EmbeddedRelationalInstanceSetImplementation =
  skipObservedWithContext(
    observe_Abstract_EmbeddedRelationalInstanceSetImplementation,
  );

export const observe_InlineEmbeddedRelationalInstanceSetImplementation =
  skipObservedWithContext(
    (
      metamodel: InlineEmbeddedRelationalInstanceSetImplementation,
      context,
    ): InlineEmbeddedRelationalInstanceSetImplementation => {
      observe_Abstract_EmbeddedRelationalInstanceSetImplementation(
        metamodel,
        context,
      );

      makeObservable(metamodel, {
        inlineSetImplementation: observable,
      });

      observe_SetImplementation(metamodel.inlineSetImplementation, context);

      return metamodel;
    },
  );

export const observe_OtherwiseEmbeddedRelationalInstanceSetImplementation =
  skipObservedWithContext(
    (
      metamodel: OtherwiseEmbeddedRelationalInstanceSetImplementation,
      context,
    ): OtherwiseEmbeddedRelationalInstanceSetImplementation => {
      observe_Abstract_EmbeddedRelationalInstanceSetImplementation(
        metamodel,
        context,
      );

      makeObservable(metamodel, {
        otherwisePropertyMapping: observable,
        hashCode: computed,
      });

      observe_PropertyMapping(metamodel.otherwisePropertyMapping, context);

      return metamodel;
    },
  );

export const observe_RelationalInstanceSetImplementation =
  skipObservedWithContext(
    (
      metamodel: RelationalInstanceSetImplementation,
      context,
    ): RelationalInstanceSetImplementation => {
      observe_Abstract_InstanceSetImplementation(metamodel, context);

      makeObservable(metamodel, {
        primaryKey: observable,
      });

      metamodel.primaryKey.forEach(observe_RelationalOperationElement);

      return metamodel;
    },
  );

export const observe_RootRelationalInstanceSetImplementation =
  skipObservedWithContext(
    (
      metamodel: RootRelationalInstanceSetImplementation,
      context,
    ): RootRelationalInstanceSetImplementation => {
      observe_Abstract_InstanceSetImplementation(metamodel, context);

      makeObservable(metamodel, {
        columnMappings: observable,
        filter: observable,
        distinct: observable,
        groupBy: observable,
        mainTableAlias: observable,
        superSetImplementationId: observable,
        hashCode: computed,
      });

      metamodel.columnMappings.forEach(observe_ColumnMapping);
      if (metamodel.filter) {
        observe_FilterMapping(metamodel.filter);
      }
      if (metamodel.groupBy) {
        observe_GroupByMapping(metamodel.groupBy);
      }
      if (metamodel.mainTableAlias) {
        observe_TableAlias(metamodel.mainTableAlias);
      }

      return metamodel;
    },
  );

export const observe_RelationalInputData = skipObserved(
  (metamodel: RelationalInputData): RelationalInputData => {
    makeObservable(metamodel, {
      data: observable,
      inputType: observable,
      validationResult: computed,
      hashCode: computed,
    });

    observe_PackageableElementReference(metamodel.database);

    return metamodel;
  },
);

// ------------------------------------- Connection -------------------------------------

export const observe_StaticDatasourceSpecification = skipObserved(
  (metamodel: StaticDatasourceSpecification): StaticDatasourceSpecification =>
    makeObservable(metamodel, {
      host: observable,
      port: observable,
      databaseName: observable,
      hashCode: computed,
    }),
);

export const observe_DatabricksDatasourceSpecification = skipObserved(
  (
    metamodel: DatabricksDatasourceSpecification,
  ): DatabricksDatasourceSpecification =>
    makeObservable(metamodel, {
      hostname: observable,
      port: observable,
      protocol: observable,
      httpPath: observable,
      hashCode: computed,
    }),
);

export const observe_EmbeddedH2DatasourceSpecification = skipObserved(
  (
    metamodel: EmbeddedH2DatasourceSpecification,
  ): EmbeddedH2DatasourceSpecification =>
    makeObservable(metamodel, {
      databaseName: observable,
      directory: observable,
      autoServerMode: observable,
      hashCode: computed,
    }),
);

export const observe_LocalH2DatasourceSpecification = skipObserved(
  (metamodel: LocalH2DatasourceSpecification): LocalH2DatasourceSpecification =>
    makeObservable(metamodel, {
      testDataSetupCsv: observable,
      testDataSetupSqls: observable,
      hashCode: computed,
    }),
);

export const observe_SnowflakeDatasourceSpecification = skipObserved(
  (
    metamodel: SnowflakeDatasourceSpecification,
  ): SnowflakeDatasourceSpecification =>
    makeObservable(metamodel, {
      accountName: observable,
      region: observable,
      warehouseName: observable,
      databaseName: observable,
      cloudType: observable,
      quotedIdentifiersIgnoreCase: observable,
      proxyHost: observable,
      proxyPort: observable,
      nonProxyHosts: observable,
      organization: observable,
      accountType: observable,
      role: observable,
      hashCode: computed,
    }),
);

export const observe_RedshiftDatasourceSpecification = skipObserved(
  (
    metamodel: RedshiftDatasourceSpecification,
  ): RedshiftDatasourceSpecification =>
    makeObservable(metamodel, {
      databaseName: observable,
      endpointURL: observable,
      port: observable,
      region: observable,
      clusterID: observable,
      host: observable,
      hashCode: computed,
    }),
);

export const observe_BigQueryDatasourceSpecification = skipObserved(
  (
    metamodel: BigQueryDatasourceSpecification,
  ): BigQueryDatasourceSpecification =>
    makeObservable(metamodel, {
      projectId: observable,
      defaultDataset: observable,
      hashCode: computed,
    }),
);

export const observe_DatasourceSpecification = (
  metamodel: DatasourceSpecification,
  context: ObserverContext,
): DatasourceSpecification => {
  if (metamodel instanceof StaticDatasourceSpecification) {
    return observe_StaticDatasourceSpecification(metamodel);
  } else if (metamodel instanceof DatabricksDatasourceSpecification) {
    return observe_DatabricksDatasourceSpecification(metamodel);
  } else if (metamodel instanceof EmbeddedH2DatasourceSpecification) {
    return observe_EmbeddedH2DatasourceSpecification(metamodel);
  } else if (metamodel instanceof LocalH2DatasourceSpecification) {
    return observe_LocalH2DatasourceSpecification(metamodel);
  } else if (metamodel instanceof SnowflakeDatasourceSpecification) {
    return observe_SnowflakeDatasourceSpecification(metamodel);
  } else if (metamodel instanceof RedshiftDatasourceSpecification) {
    return observe_RedshiftDatasourceSpecification(metamodel);
  } else if (metamodel instanceof BigQueryDatasourceSpecification) {
    return observe_BigQueryDatasourceSpecification(metamodel);
  }
  const extraObservers = context.plugins.flatMap(
    (plugin) =>
      (
        plugin as StoreRelational_PureGraphManagerPlugin_Extension
      ).getExtraDatasourceSpecificationObservers?.() ?? [],
  );
  for (const observer of extraObservers) {
    const observedDatasourceSpec = observer(metamodel, context);
    if (observedDatasourceSpec) {
      return observedDatasourceSpec;
    }
  }
  return metamodel;
};

export const observe_DelegatedKerberosAuthenticationStrategy = skipObserved(
  (
    metamodel: DelegatedKerberosAuthenticationStrategy,
  ): DelegatedKerberosAuthenticationStrategy =>
    makeObservable(metamodel, {
      serverPrincipal: observable,
      hashCode: computed,
    }),
);

export const observe_DefaultH2AuthenticationStrategy = skipObserved(
  (
    metamodel: DefaultH2AuthenticationStrategy,
  ): DefaultH2AuthenticationStrategy =>
    makeObservable(metamodel, {
      hashCode: computed,
    }),
);

export const observe_ApiTokenAuthenticationStrategy = skipObserved(
  (metamodel: ApiTokenAuthenticationStrategy): ApiTokenAuthenticationStrategy =>
    makeObservable(metamodel, {
      apiToken: observable,
      hashCode: computed,
    }),
);

export const observe_OAuthAuthenticationStrategy = skipObserved(
  (metamodel: OAuthAuthenticationStrategy): OAuthAuthenticationStrategy =>
    makeObservable(metamodel, {
      oauthKey: observable,
      scopeName: observable,
      hashCode: computed,
    }),
);

export const observe_SnowflakePublicAuthenticationStrategy = skipObserved(
  (
    metamodel: SnowflakePublicAuthenticationStrategy,
  ): SnowflakePublicAuthenticationStrategy =>
    makeObservable(metamodel, {
      privateKeyVaultReference: observable,
      passPhraseVaultReference: observable,
      publicUserName: observable,
      hashCode: computed,
    }),
);

export const observe_GCPApplicationDefaultCredentialsAuthenticationStrategy =
  skipObserved(
    (
      metamodel: GCPApplicationDefaultCredentialsAuthenticationStrategy,
    ): GCPApplicationDefaultCredentialsAuthenticationStrategy =>
      makeObservable(metamodel, {
        hashCode: computed,
      }),
  );

export const observe_UsernamePasswordAuthenticationStrategy = skipObserved(
  (
    metamodel: UsernamePasswordAuthenticationStrategy,
  ): UsernamePasswordAuthenticationStrategy =>
    makeObservable(metamodel, {
      hashCode: computed,
      userNameVaultReference: observable,
      passwordVaultReference: observable,
      baseVaultReference: observable,
    }),
);

export const observe_GCPWorkloadIdentityFederationAuthenticationStrategy =
  skipObserved(
    (
      metamodel: GCPWorkloadIdentityFederationAuthenticationStrategy,
    ): GCPWorkloadIdentityFederationAuthenticationStrategy =>
      makeObservable(metamodel, {
        hashCode: computed,
        serviceAccountEmail: observable,
        additionalGcpScopes: observable,
      }),
  );

export const observe_AuthenticationStrategy = (
  metamodel: AuthenticationStrategy,
  context: ObserverContext,
): AuthenticationStrategy => {
  if (metamodel instanceof DelegatedKerberosAuthenticationStrategy) {
    return observe_DelegatedKerberosAuthenticationStrategy(metamodel);
  } else if (metamodel instanceof DefaultH2AuthenticationStrategy) {
    return observe_DefaultH2AuthenticationStrategy(metamodel);
  } else if (metamodel instanceof ApiTokenAuthenticationStrategy) {
    return observe_ApiTokenAuthenticationStrategy(metamodel);
  } else if (metamodel instanceof OAuthAuthenticationStrategy) {
    return observe_OAuthAuthenticationStrategy(metamodel);
  } else if (metamodel instanceof SnowflakePublicAuthenticationStrategy) {
    return observe_SnowflakePublicAuthenticationStrategy(metamodel);
  } else if (
    metamodel instanceof GCPApplicationDefaultCredentialsAuthenticationStrategy
  ) {
    return observe_GCPApplicationDefaultCredentialsAuthenticationStrategy(
      metamodel,
    );
  } else if (metamodel instanceof UsernamePasswordAuthenticationStrategy) {
    return observe_UsernamePasswordAuthenticationStrategy(metamodel);
  } else if (
    metamodel instanceof GCPWorkloadIdentityFederationAuthenticationStrategy
  ) {
    return observe_GCPWorkloadIdentityFederationAuthenticationStrategy(
      metamodel,
    );
  }
  const extraObservers = context.plugins.flatMap(
    (plugin) =>
      (
        plugin as StoreRelational_PureGraphManagerPlugin_Extension
      ).getExtraAuthenticationStrategyObservers?.() ?? [],
  );
  for (const observer of extraObservers) {
    const observedAuthStrategy = observer(metamodel, context);
    if (observedAuthStrategy) {
      return observedAuthStrategy;
    }
  }
  return metamodel;
};

export const observe_PostProcessor = (
  metamodel: PostProcessor,
  context: ObserverContext,
): PostProcessor => {
  if (metamodel instanceof MapperPostProcessor) {
    // TODO
    return metamodel;
  }
  const extraObservers = context.plugins.flatMap(
    (plugin) =>
      (
        plugin as StoreRelational_PureGraphManagerPlugin_Extension
      ).getExtraPostProcessorObservers?.() ?? [],
  );
  for (const observer of extraObservers) {
    const observedPostProcessor = observer(metamodel, context);
    if (observedPostProcessor) {
      return observedPostProcessor;
    }
  }
  return metamodel;
};

const observe_Abstract_DatabaseConnection = (
  metamodel: DatabaseConnection,
): void => {
  observe_Abstract_Connection(metamodel);

  makeObservable(metamodel, {
    type: observable,
    timeZone: observable,
    quoteIdentifiers: observable,
  });
};

export const observe_RelationalDatabaseConnection = skipObservedWithContext(
  (
    metamodel: RelationalDatabaseConnection,
    context,
  ): RelationalDatabaseConnection => {
    observe_Abstract_DatabaseConnection(metamodel);

    makeObservable(metamodel, {
      datasourceSpecification: observable,
      authenticationStrategy: observable,
      hashCode: computed,
    });

    observe_DatasourceSpecification(metamodel.datasourceSpecification, context);
    observe_AuthenticationStrategy(metamodel.authenticationStrategy, context);
    metamodel.postProcessors.forEach((postProcessor) =>
      observe_PostProcessor(postProcessor, context),
    );

    return metamodel;
  },
);
