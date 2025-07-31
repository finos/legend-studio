import { createModelSchema, optional, primitive } from 'serializr';
import { V1_Terminal } from '../../../model/packageableElements/dataProduct/V1_Terminal.js';

export const V1_TerminalModelSchema = createModelSchema(V1_Terminal, {
  id: primitive(),
  providerName: primitive(),
  productName: primitive(),
  category: primitive(),
  vendorProfileId: primitive(),
  modelName: primitive(),
  description: primitive(),
  applicationName: primitive(),
  tieredPrice: primitive(),
  price: primitive(),
  totalFirmPrice: primitive(),

  icon: optional(primitive()),
  imageUrl: optional(primitive()),
});
