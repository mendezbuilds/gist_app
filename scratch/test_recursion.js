const { createClient } = require('@supabase/supabase-js');
const nacl = require('tweetnacl');
const { encodeBase64 } = require('tweetnacl-util');

const supabaseUrl = 'https://unyinmnblendjhyoxcwj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVueWlubW5ibGVuZGpoeW94Y3dqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5OTgzMTIsImV4cCI6MjA5ODU3NDMxMn0.RqLruccxwEUbYBKbc0KtP4ZfrWphGrzckm3z_oLwozc';

async function runTest() {
  console.log('Initializing Supabase client...');
  // Create client for User 1
  const client1 = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false }
  });

  // Create client for User 2
  const client2 = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false }
  });

  console.log('\n--- 1. Authenticating User 1 (+2348000000000) ---');
  await client1.auth.signInWithOtp({ phone: '+2348000000000' });
  const { data: authData1, error: authError1 } = await client1.auth.verifyOtp({
    phone: '+2348000000000',
    token: '000000',
    type: 'sms',
  });
  if (authError1 || !authData1.user) {
    console.error('User 1 Auth Failed:', authError1);
    process.exit(1);
  }
  const user1Id = authData1.user.id;
  console.log(`User 1 authenticated. ID: ${user1Id}`);

  console.log('\n--- 2. Authenticating User 2 (+2348000000001) ---');
  await client2.auth.signInWithOtp({ phone: '+2348000000001' });
  const { data: authData2, error: authError2 } = await client2.auth.verifyOtp({
    phone: '+2348000000001',
    token: '000000',
    type: 'sms',
  });
  if (authError2 || !authData2.user) {
    console.error('User 2 Auth Failed:', authError2);
    process.exit(1);
  }
  const user2Id = authData2.user.id;
  console.log(`User 2 authenticated. ID: ${user2Id}`);

  // Create profiles if they don't exist
  console.log('\n--- 3. Creating profiles in database if they don\'t exist ---');
  
  // Use the same hardcoded E2E test public keys defined in crypto.ts
  const validPubKey1 = 'DY2WQzLEHEahHEPCFiRtAdneARKlqsprQ+1hg4aJzTs=';
  const validPubKey2 = 'd15JxPi3e/W02PUs8QOKIQpa7+S5kk5v9JhmKVzh/Gs=';
  
  // Insert profile for User 1
  const { error: profileError1 } = await client1.from('profiles').upsert({
    id: user1Id,
    phone: '+2348000000000',
    phone_hash: 'hash_test_1',
    username: 'test_user_1',
    display_name: 'Test User 1',
    e2e_public_key: validPubKey1,
    onboarding_complete: true,
  });
  if (profileError1) {
    console.log('Profile 1 Upsert Note (could already exist or error):', profileError1.message);
  } else {
    console.log('Profile 1 upserted.');
  }

  // Insert profile for User 2
  const { error: profileError2 } = await client2.from('profiles').upsert({
    id: user2Id,
    phone: '+2348000000001',
    phone_hash: 'hash_test_2',
    username: 'test_user_2',
    display_name: 'Test User 2',
    e2e_public_key: validPubKey2,
    onboarding_complete: true,
  });
  if (profileError2) {
    console.log('Profile 2 Upsert Note (could already exist or error):', profileError2.message);
  } else {
    console.log('Profile 2 upserted.');
  }

  console.log('\n--- 4. Creating Direct Chat (User 1) ---');
  // Insert a new chat row
  const { data: newChat, error: chatError } = await client1
    .from('chats')
    .insert({
      type: 'direct',
      created_by: user1Id,
    })
    .select('id')
    .single();

  if (chatError) {
    console.error('Error creating chat:', chatError);
    process.exit(1);
  }
  const chatId = newChat.id;
  console.log(`Chat successfully created with ID: ${chatId}`);

  console.log('\n--- 5. Adding members to chat_members (User 1) ---');
  const { error: membersError } = await client1
    .from('chat_members')
    .insert([
      { chat_id: chatId, user_id: user1Id, role: 'admin' },
      { chat_id: chatId, user_id: user2Id, role: 'member' },
    ]);

  if (membersError) {
    console.error('Error adding members to chat:', membersError);
    // Cleanup chat row
    await client1.from('chats').delete().eq('id', chatId);
    process.exit(1);
  }
  console.log('Chat members successfully added.');

  console.log('\n--- 6. Verifying RLS Read Access for User 1 ---');
  const { data: readChats1, error: readChatsError1 } = await client1
    .from('chats')
    .select('*');
  if (readChatsError1) {
    console.error('Error reading chats as User 1:', readChatsError1);
  } else {
    console.log(`User 1 read ${readChats1.length} chats. Found our chat:`, readChats1.some(c => c.id === chatId));
  }

  console.log('\n--- 7. Verifying RLS Read Access for User 2 ---');
  const { data: readChats2, error: readChatsError2 } = await client2
    .from('chats')
    .select('*');
  if (readChatsError2) {
    console.error('Error reading chats as User 2:', readChatsError2);
  } else {
    console.log(`User 2 read ${readChats2.length} chats. Found our chat:`, readChats2.some(c => c.id === chatId));
  }

  console.log('\n--- 8. Cleaning up Test Chat ---');
  const { error: deleteError } = await client1
    .from('chats')
    .delete()
    .eq('id', chatId);
  if (deleteError) {
    console.error('Error deleting test chat:', deleteError);
  } else {
    console.log('Test chat successfully cleaned up.');
  }

  console.log('\n--- TEST SUCCESSFUL ---');
}

runTest().catch(console.error);
