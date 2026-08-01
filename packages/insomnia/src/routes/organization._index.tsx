import type { Organization } from 'insomnia-api';
import { services } from 'insomnia-data';
import { href, redirect } from 'react-router';

import * as session from '~/ui/account/session';
import { findMigrationTargetSpaceId, migrateProjectsUnderOrganization, syncOrganizations } from '~/ui/organization-utils';

import type { Route } from './+types/organization._index';

export async function clientLoader(_args: Route.ClientLoaderArgs) {
  const { id: sessionId, accountId } = await services.userSession.get();
  if (sessionId) {
    await syncOrganizations(sessionId, accountId);

    const organizations = JSON.parse(localStorage.getItem(`${accountId}:spaces`) || '[]') as Organization[];
    if (!organizations.length) {
      console.warn('[organization] No organizations available after sync; signing out.');
      await session.logout();
      return redirect(href('/auth/login'));
    }

    try {
      await migrateProjectsUnderOrganization(findMigrationTargetSpaceId(organizations), sessionId);
    } catch (error) {
      console.warn('[organization] Project migration failed; continuing startup.', error);
    }

    const specificOrgRedirectAfterAuthorize = window.localStorage.getItem('specificOrgRedirectAfterAuthorize');
    if (specificOrgRedirectAfterAuthorize && specificOrgRedirectAfterAuthorize !== '') {
      window.localStorage.removeItem('specificOrgRedirectAfterAuthorize');
      return redirect(`/organization/${specificOrgRedirectAfterAuthorize}`);
    }

    const landingOrganizationId = organizations[0].id;
    return redirect(`/organization/${landingOrganizationId}`);
  }

  await session.logout();
  return redirect(href('/auth/login'));
}
