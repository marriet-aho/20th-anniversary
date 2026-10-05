import { spfi, SPFI, SPFx } from '@pnp/sp';
import { WebPartContext } from '@microsoft/sp-webpart-base';
import '@pnp/sp/webs';
import '@pnp/sp/lists';
import '@pnp/sp/items';
import '@pnp/sp/site-groups/web';
import '@pnp/sp/site-users/web';
import '@pnp/sp/security/web';

export type { SPFI };

export function createSP(context: WebPartContext): SPFI {
  return spfi().using(SPFx(context));
}
