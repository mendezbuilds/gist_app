import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, StyleSheet, Alert, TextInput, ScrollView, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../../src/theme';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase as typedSupabase } from '../../../src/lib/supabase';
const supabase = typedSupabase as any;
import { ChatWithMembers } from '../../../src/lib/messaging';
import { useContactsStore } from '../../../src/store/contactsStore';
import { ArrowLeft, UserPlus, LogOut, Check, Edit2 } from 'lucide-react-native';
import { Avatar } from '../../../src/components/ui/Avatar';

export default function GroupInfoScreen() {
  const { colors, spacing, fontSize } = useTheme();
  const { chatId } = useLocalSearchParams<{ chatId: string }>();
  const router = useRouter();

  const { contacts } = useContactsStore();
  const [chat, setChat] = useState<ChatWithMembers | null>(null);
  const [loading, setLoading] = useState(true);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Edit group name state
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  
  // Add member modal state
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);

  const loadGroupDetails = async () => {
    if (!chatId) return;

    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (user) {
        setMyUserId(user.id);
      }

      // Fetch chat details
      const { data: chatData, error: chatError } = await supabase
        .from('chats')
        .select('*')
        .eq('id', chatId)
        .single();

      if (chatError || !chatData) {
        console.error('[GroupInfo] Error loading chat:', chatError);
        return;
      }

      // Fetch chat members
      const { data: membersData, error: membersError } = await supabase
        .from('chat_members')
        .select(`
          chat_id,
          user_id,
          role,
          profile:profiles (
            id,
            username,
            display_name,
            avatar_url,
            e2e_public_key
          )
        `)
        .eq('chat_id', chatId);

      if (membersError || !membersData) {
        console.error('[GroupInfo] Error loading members:', membersError);
        return;
      }

      const assembledChat = {
        ...chatData,
        members: membersData.map((m: any) => ({
          user_id: m.user_id,
          role: m.role,
          profile: m.profile,
        })),
      } as ChatWithMembers;

      setChat(assembledChat);

      // Check if current user is admin
      const myMemberRecord = assembledChat.members.find(m => m.user_id === user?.id);
      setIsAdmin(myMemberRecord?.role === 'admin');
      setNewName(assembledChat.name || '');
    } catch (e) {
      console.error('[GroupInfo] loadGroupDetails exception:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGroupDetails();
  }, [chatId]);

  const handleUpdateName = async () => {
    if (!newName.trim() || !chat) return;

    try {
      const { error } = await supabase
        .from('chats')
        .update({ name: newName.trim() })
        .eq('id', chat.id);

      if (error) {
        Alert.alert('Error', error.message);
      } else {
        setChat(prev => prev ? { ...prev, name: newName.trim() } : null);
        setIsEditingName(false);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update name');
    }
  };

  const handleRemoveMember = async (targetUserId: string) => {
    if (!chat) return;

    Alert.alert(
      'Remove Member',
      'Are you sure you want to remove this member from the group?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('chat_members')
                .delete()
                .eq('chat_id', chat.id)
                .eq('user_id', targetUserId);

              if (error) {
                Alert.alert('Error', error.message);
              } else {
                // Update local state
                setChat(prev => {
                  if (!prev) return null;
                  return {
                    ...prev,
                    members: prev.members.filter(m => m.user_id !== targetUserId),
                  };
                });
              }
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Failed to remove member');
            }
          },
        },
      ]
    );
  };

  const handleToggleAdminRole = async (targetUserId: string, currentRole: string) => {
    if (!chat) return;
    const newRole = currentRole === 'admin' ? 'member' : 'admin';

    try {
      const { error } = await supabase
        .from('chat_members')
        .update({ role: newRole })
        .eq('chat_id', chat.id)
        .eq('user_id', targetUserId);

      if (error) {
        Alert.alert('Error', error.message);
      } else {
        setChat(prev => {
          if (!prev) return null;
          return {
            ...prev,
            members: prev.members.map(m => m.user_id === targetUserId ? { ...m, role: newRole } : m),
          };
        });
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update member role');
    }
  };

  const handleAddMember = async (userId: string) => {
    if (!chat) return;

    try {
      const { error } = await supabase
        .from('chat_members')
        .insert({
          chat_id: chat.id,
          user_id: userId,
          role: 'member',
        });

      if (error) {
        Alert.alert('Error', error.message);
      } else {
        setIsAddModalVisible(false);
        loadGroupDetails(); // Reload fresh details from DB
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to add member');
    }
  };

  const handleLeaveGroup = async () => {
    if (!chat || !myUserId) return;

    Alert.alert(
      'Leave Group',
      'Are you sure you want to leave this group chat?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('chat_members')
                .delete()
                .eq('chat_id', chat.id)
                .eq('user_id', myUserId);

              if (error) {
                Alert.alert('Error', error.message);
              } else {
                router.replace('/(app)/chats');
              }
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Failed to leave group');
            }
          },
        },
      ]
    );
  };

  // Find contacts that are not yet in the group
  const nonGroupContacts = contacts.filter(
    c => !chat?.members.some(m => m.user_id === c.id)
  );

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.tabActive} />
      </SafeAreaView>
    );
  }

  if (!chat) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, padding: spacing[5] }}>
        <Text style={{ fontFamily: 'Nunito_700Bold', color: colors.textPrimary }}>Group not found.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: spacing[4],
          paddingVertical: spacing[3],
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          backgroundColor: colors.surface,
        }}
      >
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4, marginRight: spacing[2] }}>
          <ArrowLeft size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={{ fontFamily: 'Nunito_700Bold', fontSize: fontSize.lg, color: colors.textPrimary }}>
          Group Details
        </Text>
      </View>

      <ScrollView style={{ flex: 1 }}>
        {/* Profile Card */}
        <View style={{ alignItems: 'center', paddingVertical: spacing[5], backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <Avatar uri={chat.avatar_url || undefined} name={chat.name || 'Group'} size={90} />
          
          {isEditingName ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing[3], width: '80%' }}>
              <TextInput
                value={newName}
                onChangeText={setNewName}
                style={{
                  flex: 1,
                  fontFamily: 'Nunito_700Bold',
                  fontSize: fontSize.lg,
                  color: colors.textPrimary,
                  borderBottomWidth: 2,
                  borderBottomColor: colors.tabActive,
                  paddingVertical: 4,
                  marginRight: spacing[2],
                }}
              />
              <TouchableOpacity onPress={handleUpdateName} style={{ backgroundColor: colors.tabActive, padding: 8, borderRadius: 20 }}>
                <Check size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing[3] }}>
              <Text style={{ fontFamily: 'Nunito_800ExtraBold', fontSize: fontSize.xl, color: colors.textPrimary }}>
                {chat.name}
              </Text>
              {isAdmin && (
                <TouchableOpacity onPress={() => setIsEditingName(true)} style={{ marginLeft: spacing[2], padding: 4 }}>
                  <Edit2 size={16} color={colors.tabActive} />
                </TouchableOpacity>
              )}
            </View>
          )}

          <Text style={{ fontFamily: 'Nunito_400Regular', fontSize: fontSize.sm, color: colors.textTertiary, marginTop: 4 }}>
            Group • {chat.members.length} members
          </Text>
        </View>

        {/* Action Controls for Admin */}
        {isAdmin && (
          <View style={{ backgroundColor: colors.surface, marginTop: spacing[3], borderBottomWidth: 1, borderBottomColor: colors.border, borderTopWidth: 1, borderTopColor: colors.border }}>
            <TouchableOpacity
              onPress={() => setIsAddModalVisible(true)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: spacing[4],
                paddingHorizontal: spacing[5],
              }}
            >
              <UserPlus size={20} color={colors.tabActive} style={{ marginRight: spacing[3] }} />
              <Text style={{ fontFamily: 'Nunito_700Bold', fontSize: fontSize.base, color: colors.tabActive }}>
                Add Members
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Member list section */}
        <View style={{ paddingHorizontal: spacing[5], paddingVertical: spacing[3] }}>
          <Text style={{ fontFamily: 'Nunito_600SemiBold', fontSize: fontSize.sm, color: colors.textTertiary }}>
            MEMBERS
          </Text>
        </View>

        <View style={{ backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border, borderTopWidth: 1, borderTopColor: colors.border }}>
          {chat.members.map((member) => {
            const isTargetMe = member.user_id === myUserId;
            
            return (
              <View
                key={member.user_id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: spacing[3],
                  paddingHorizontal: spacing[5],
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                }}
              >
                <Avatar uri={member.profile?.avatar_url || undefined} name={member.profile?.display_name || '?'} size={40} />
                
                <View style={{ flex: 1, marginLeft: spacing[3] }}>
                  <Text style={{ fontFamily: 'Nunito_700Bold', fontSize: fontSize.base, color: colors.textPrimary }}>
                    {member.profile?.display_name} {isTargetMe && '(You)'}
                  </Text>
                  <Text style={{ fontFamily: 'Nunito_400Regular', fontSize: fontSize.sm, color: colors.textSecondary }}>
                    @{member.profile?.username}
                  </Text>
                </View>

                {member.role === 'admin' && (
                  <View style={{ backgroundColor: colors.border, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginRight: 8 }}>
                    <Text style={{ fontFamily: 'Nunito_600SemiBold', fontSize: fontSize.xs - 2, color: colors.textSecondary }}>
                      Group Admin
                    </Text>
                  </View>
                )}

                {isAdmin && !isTargetMe && (
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                      onPress={() => handleToggleAdminRole(member.user_id, member.role)}
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 6,
                        borderWidth: 1,
                        borderColor: colors.border,
                      }}
                    >
                      <Text style={{ fontFamily: 'Nunito_600SemiBold', fontSize: fontSize.xs, color: colors.textSecondary }}>
                        {member.role === 'admin' ? 'Dismiss Admin' : 'Make Admin'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleRemoveMember(member.user_id)}
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 6,
                        borderWidth: 1,
                        borderColor: '#FFD2D2',
                        backgroundColor: '#FFF2F2',
                      }}
                    >
                      <Text style={{ fontFamily: 'Nunito_600SemiBold', fontSize: fontSize.xs, color: '#D8000C' }}>
                        Remove
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Leave Group Button */}
        <View style={{ marginVertical: spacing[5], paddingHorizontal: spacing[5] }}>
          <TouchableOpacity
            onPress={handleLeaveGroup}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#FFF2F2',
              borderColor: '#FFD2D2',
              borderWidth: 1,
              borderRadius: 12,
              paddingVertical: spacing[3],
            }}
          >
            <LogOut size={18} color="#D8000C" style={{ marginRight: spacing[2] }} />
            <Text style={{ fontFamily: 'Nunito_700Bold', fontSize: fontSize.base, color: '#D8000C' }}>
              Leave Group
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Add Member Modal */}
      <Modal
        visible={isAddModalVisible}
        animationType="slide"
        onRequestClose={() => setIsAddModalVisible(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
          {/* Modal Header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: spacing[4],
              paddingVertical: spacing[3],
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
              backgroundColor: colors.surface,
            }}
          >
            <TouchableOpacity onPress={() => setIsAddModalVisible(false)} style={{ padding: 4, marginRight: spacing[2] }}>
              <ArrowLeft size={22} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={{ fontFamily: 'Nunito_700Bold', fontSize: fontSize.lg, color: colors.textPrimary }}>
              Add Members
            </Text>
          </View>

          {/* Non-Group Contacts List */}
          {nonGroupContacts.length === 0 ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing[5] }}>
              <Text style={{ fontFamily: 'Nunito_400Regular', color: colors.textSecondary, textAlign: 'center' }}>
                All synced contacts are already members of this group.
              </Text>
            </View>
          ) : (
            <FlatList
              data={nonGroupContacts}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => handleAddMember(item.id)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: spacing[3],
                    paddingHorizontal: spacing[5],
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                  }}
                >
                  <Avatar uri={item.avatar_url} name={item.display_name} size={45} />
                  <View style={{ flex: 1, marginLeft: spacing[3] }}>
                    <Text style={{ fontFamily: 'Nunito_700Bold', fontSize: fontSize.base, color: colors.textPrimary }}>
                      {item.display_name}
                    </Text>
                    <Text style={{ fontFamily: 'Nunito_400Regular', fontSize: fontSize.sm, color: colors.textSecondary }}>
                      @{item.username}
                    </Text>
                  </View>
                  <Text style={{ fontFamily: 'Nunito_600SemiBold', fontSize: fontSize.xs, color: colors.tabActive }}>
                    ADD
                  </Text>
                </TouchableOpacity>
              )}
            />
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
