import type * as FoxySDK from '@foxy.io/sdk';

export type Rel = FoxySDK.Integration.Rels.Subscriptions;
export type Data = FoxySDK.Core.Resource<
  Rel,
  { zoom: [{ transaction_template: 'items' }, 'last_transaction'] }
>;
