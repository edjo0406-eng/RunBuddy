import type { Runner } from '@workspace/api-client-react';

export const ANONYMOUS_RUNNER_PUBLIC_FIELDS = [
  'id',
  'name',
  'city',
  'country',
  'profileType',
  'clubName',
  'lookingFor',
  'experience',
  'createdAt',
  'updatedAt',
] as const satisfies readonly (keyof Runner)[];

export type AnonymousRunnerPreview = Pick<
  Runner,
  (typeof ANONYMOUS_RUNNER_PUBLIC_FIELDS)[number]
>;

type AnonymousRunnerDraft = {
  name: string;
  city: string;
  country: string;
  experience: Runner['experience'];
};

export function createAnonymousRunnerPreview(
  runner: Runner,
  draft: AnonymousRunnerDraft,
): AnonymousRunnerPreview {
  return {
    id: runner.id,
    name: draft.name.trim() || 'Your name',
    city: draft.city.trim() || null,
    country: draft.country.trim() || null,
    profileType: runner.profileType,
    clubName: runner.clubName ?? null,
    lookingFor: runner.lookingFor,
    experience: draft.experience,
    createdAt: runner.createdAt,
    updatedAt: runner.updatedAt,
  };
}
