import { FieldGroup, Icon, ListItem } from '@expo/ui';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Alert, Share } from 'react-native';

import { useClient } from '@/auth/session';
import { useCollectionView, usePublicUsers } from '@/data/queries';
import { isOwner } from '@/data/selectors';
import { useCollectionsActions } from '@/data/useCollectionsActions';
import { tr } from '@/i18n';
import { useActionSheet } from '@/ui/ActionSheet';
import { icons } from '@/ui/icons';
import { RowIcon, useRowTheme } from '@/ui/rows';
import { Sub } from '@/ui/Sub';
import { useColors } from '@/ui/theme';
import { Text } from '@/ui/Text';
import { Host } from '@/ui/Host';

const fullName = (u: { username: string; first_name?: string | null; last_name?: string | null }) =>
  [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username;

/**
 * Owner only: who the collection is shared with, and invites. An invite is not a share yet: the other user has to
 * accept it (in the app under "Einladungen", or on the website). Only users with a public profile can be invited.
 */
export default function CollectionShareScreen() {
  const { collectionId } = useLocalSearchParams<{ collectionId: string }>();
  const { view } = useCollectionView(collectionId);
  const actions = useCollectionsActions();
  const users = usePublicUsers(actions.online);
  const rt = useRowTheme();
  const colors = useColors();
  const sheet = useActionSheet(rt);
  const client = useClient();
  if (!view) return null;
  const collection = view.collection;
  if (!isOwner(collection)) return null;

  const publicLink = `${client.baseUrl}/collections/${encodeURIComponent(collectionId)}`;
  const members = collection.collaborators.filter((c) => !c.is_owner);
  const memberIds = new Set(collection.collaborators.map((c) => c.uuid));
  const candidates = (users.data ?? []).filter((u) => !memberIds.has(u.uuid));

  const invite = (uuid: string, name: string) =>
    sheet.open(name, [
      {
        label: tr('collectionShare.invite'),
        icon: 'personAdd',
        onPress: async () => {
          const ok = await actions.share(collectionId, uuid);
          if (ok)
            Alert.alert(tr('collectionShare.invitationSent'), tr('collectionShare.nameWillSeeTripOnce', { name }));
        },
      },
      {
        label: tr('collectionShare.withdrawInvitation'),
        icon: 'personRemove',
        onPress: () => actions.revokeInvite(collectionId, uuid),
      },
    ]);

  const remove = (uuid: string, name: string) =>
    Alert.alert(
      tr('collectionShare.removeNameConfirm', { name }),
      tr('collectionShare.tripDisappearsFromTheirPhones'),
      [
        { text: tr('common.cancel'), style: 'cancel' },
        { text: tr('common.remove'), style: 'destructive', onPress: () => void actions.unshare(collectionId, uuid) },
      ],
    );

  return (
    <>
      <Stack.Screen options={{ title: tr('common.share') }} />
      <Host style={{ flex: 1 }}>
        <FieldGroup>
          <FieldGroup.Section title={tr('collectionShare.sharedWith')}>
            {members.length === 0 ? (
              <Text textStyle={{ color: colors.secondary }}>{tr('collectionShare.notSharedWithAnyoneYet')}</Text>
            ) : (
              members.map((m) => (
                <ListItem
                  key={m.uuid}
                  colors={rt.listColors}
                  leading={<RowIcon name="group" />}
                  supportingText={<Sub>{m.username}</Sub>}
                  onPress={actions.online ? () => remove(m.uuid, fullName(m)) : undefined}>
                  {fullName(m)}
                </ListItem>
              ))
            )}
          </FieldGroup.Section>

          {actions.online ? (
            <FieldGroup.Section title={tr('collectionShare.invite')}>
              {users.isLoading ? <Text textStyle={{ color: colors.secondary }}>{tr('common.loading')}</Text> : null}
              {users.isError ? (
                <Text textStyle={{ color: colors.secondary }}>{tr('collectionShare.userListNotAvailable')}</Text>
              ) : null}
              {candidates.map((u) => (
                <ListItem
                  key={u.uuid}
                  colors={rt.listColors}
                  leading={<RowIcon name="personAdd" />}
                  supportingText={<Sub>{u.username}</Sub>}
                  onPress={() => invite(u.uuid, fullName(u))}>
                  {fullName(u)}
                </ListItem>
              ))}
              {!users.isLoading && !users.isError && candidates.length === 0 ? (
                <Text textStyle={{ color: colors.secondary }}>{tr('collectionShare.noOneElseInvite')}</Text>
              ) : null}
              <FieldGroup.SectionFooter>
                <Text textStyle={{ fontSize: 13, color: colors.secondary }}>
                  {tr('collectionShare.onlyAccountsWithPublicProfile')}
                </Text>
              </FieldGroup.SectionFooter>
            </FieldGroup.Section>
          ) : null}

          <FieldGroup.Section title={tr('common.visibility')}>
            <ListItem
              colors={rt.listColors}
              leading={<RowIcon name="world" />}
              supportingText={<Sub>{tr('collectionShare.anyoneWithLinkCanSee')}</Sub>}
              trailing={
                <Icon
                  name={icons[collection.is_public ? 'checked' : 'unchecked']}
                  size={22}
                  color={collection.is_public ? colors.tint : colors.secondary}
                />
              }
              onPress={actions.online ? () => void actions.setPublic(collectionId, !collection.is_public) : undefined}>
              {tr('common.public')}
            </ListItem>
            {collection.is_public ? (
              <ListItem
                colors={rt.listColors}
                leading={<RowIcon name="share" />}
                supportingText={<Sub>{publicLink.replace(/^https?:\/\//, '')}</Sub>}
                onPress={() => void Share.share({ message: publicLink, url: publicLink })}>
                {tr('collectionShare.shareLink')}
              </ListItem>
            ) : null}
          </FieldGroup.Section>
        </FieldGroup>
      </Host>
      {sheet.sheet}
    </>
  );
}
