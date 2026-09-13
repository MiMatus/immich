import inlineDark from '#lib/assets/brand/pixalery-logo-inline-dark.svg';
import inlineLight from '#lib/assets/brand/pixalery-logo-inline-light.svg';
import stackedDark from '#lib/assets/brand/pixalery-logo-stacked-dark.svg';
import stackedLight from '#lib/assets/brand/pixalery-logo-stacked-light.svg';
import mark from '#lib/assets/brand/pixalery-mark.svg';
import type { LogoSet } from '@immich/ui';

export { default as brandMark } from '#lib/assets/brand/pixalery-mark.svg';

export const BRAND_NAME = 'Pixalery';

/** Logo set injected into `@immich/ui`'s `logoManager` so every `<Logo>` renders the Pixalery artwork. */
export const brandLogos: LogoSet = {
  icon: mark,
  unstacked: { light: inlineLight, dark: inlineDark },
  stacked: { light: stackedLight, dark: stackedDark },
  stacked_futo: { light: stackedLight, dark: stackedDark },
};

/** Public Pixalery URLs. Placeholders until the pages exist; keep in sync with mobile/lib/constants/constants.dart. */
export const BRAND_URLS = {
  site: 'https://pixelary.com',
  docs: 'https://pixelary.com/docs',
  support: 'https://pixelary.com/support',
  source: 'https://pixelary.com/source',
  issues: 'https://pixelary.com/issues',
  releases: 'https://pixelary.com/releases',
} as const;

export const docsUrl = (path: string) => `${BRAND_URLS.docs}${path}`;
