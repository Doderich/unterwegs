import { FieldGroup } from '@expo/ui';
import { Platform } from 'react-native';

import { tr } from '@/i18n';
import { FormHost } from '@/ui/FormHost';
import { Text } from '@/ui/Text';

/** How to give a self-hosted server HTTPS, with or without a domain. Opened from the login screen. */
export default function HttpsHelpScreen() {
  return (
    <FormHost>
      <FieldGroup>
        <FieldGroup.Section title={tr('httpsHelp.why')}>
          <Text>{tr('httpsHelp.whyText')}</Text>
        </FieldGroup.Section>
        <FieldGroup.Section title={tr('httpsHelp.withName')}>
          <Text>{tr('httpsHelp.withNameText')}</Text>
          <Text>{tr('httpsHelp.tailscale')}</Text>
          <Text>{tr('httpsHelp.domain')}</Text>
        </FieldGroup.Section>
        <FieldGroup.Section title={tr('httpsHelp.ownCertificate')}>
          <Text>{tr('httpsHelp.ownCertificateText')}</Text>
          <Text>{Platform.OS === 'ios' ? tr('httpsHelp.iosSteps') : tr('httpsHelp.androidSteps')}</Text>
          <Text>{tr('httpsHelp.thenSignIn')}</Text>
        </FieldGroup.Section>
        <FieldGroup.Section title={tr('httpsHelp.caution')}>
          <Text>{tr('httpsHelp.cautionText')}</Text>
        </FieldGroup.Section>
      </FieldGroup>
    </FormHost>
  );
}
