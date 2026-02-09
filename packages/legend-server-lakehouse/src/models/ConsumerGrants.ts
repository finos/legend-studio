import {
  customListWithSchema,
  optionalCustomListWithSchema,
  SerializationFactory,
} from '@finos/legend-shared';
import { createModelSchema, primitive } from 'serializr';

export class LakehouseConsumerGrantAccessPointGroup {
  dataProductName!: string;
  accessPointGroupName!: string;
  roleName!: string;
  producerIngestEnv!: string;
  producerDid!: string;

  static readonly serialization = new SerializationFactory(
    createModelSchema(LakehouseConsumerGrantAccessPointGroup, {
      dataProductName: primitive(),
      accessPointGroupName: primitive(),
      roleName: primitive(),
      producerIngestEnv: primitive(),
      producerDid: primitive(),
    }),
  );
}

export class LakehouseConsumerGrantUser {
  username!: string;
  contractId!: string;
  targetAccount!: string;

  static readonly serialization = new SerializationFactory(
    createModelSchema(LakehouseConsumerGrantUser, {
      username: primitive(),
      contractId: primitive(),
      targetAccount: primitive(),
    }),
  );
}

export class LakehouseConsumerGrantResponse {
  contractId!: string;
  accessPointGroups!: LakehouseConsumerGrantAccessPointGroup[];
  users?: LakehouseConsumerGrantUser[];

  static readonly serialization = new SerializationFactory(
    createModelSchema(LakehouseConsumerGrantResponse, {
      contractId: primitive(),
      accessPointGroups: customListWithSchema(
        LakehouseConsumerGrantAccessPointGroup.serialization.schema,
      ),
      users: optionalCustomListWithSchema(
        LakehouseConsumerGrantUser.serialization.schema,
      ),
    }),
  );
}
