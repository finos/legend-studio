import { createModelSchema, optional, primitive } from 'serializr';
import {
  V1_Terminal,
  V1_TERMINAL_PRODUCT_ELEMENT_PROTOCOL_TYPE,
} from '../../../model/packageableElements/dataProduct/V1_Terminal.js';
import {
  usingConstantValueSchema,
  customListWithSchema,
  optionalCustomUsingModelSchema,
} from '@finos/legend-shared';
import {
  V1_AccessPointGroupModelSchema,
  V1_SupportInfoModelSchema,
} from './V1_DataProductSerializationHelper.js';

export const V1_TerminalModelSchema = createModelSchema(V1_Terminal, {
  _type: usingConstantValueSchema(V1_TERMINAL_PRODUCT_ELEMENT_PROTOCOL_TYPE),

  package: primitive(),
  name: primitive(),

  id: optional(primitive()),
  title: optional(primitive()),
  vendorName: optional(primitive()),
  category: optional(primitive()),
  description: optional(primitive()),
  applicationName: optional(primitive()),
  vendorProfileId: optional(primitive()),
  tieredPrice: optional(primitive()),

  icon: optional(primitive()),
  imageUrl: optional(primitive()),

  accessPointGroups: customListWithSchema(V1_AccessPointGroupModelSchema),
  supportInfo: optionalCustomUsingModelSchema(V1_SupportInfoModelSchema),
});
