import * as React from 'react';
import { Link, Text } from 'react-email';

export const ImmichFooter = () => (
  <Text className="text-center text-sm text-immich-footer">
    <Link href="https://pixelary.com">Pixalery</Link> is built on the open-source Immich project, available under the
    GNU AGPL v3 license.
  </Text>
);
