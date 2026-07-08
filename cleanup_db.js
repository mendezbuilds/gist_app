const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Parse .env from workspace directory
const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    } else if (value.startsWith("'") && value.endsWith("'")) {
      value = value.slice(1, -1);
    }
    env[match[1]] = value.trim();
  }
});

const supabaseUrl = env['EXPO_PUBLIC_SUPABASE_URL'];
const supabaseAnonKey = env['EXPO_PUBLIC_SUPABASE_ANON_KEY'];

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false }
});

async function run() {
  const phone = '+2348000000000'; // User 1
  await supabase.auth.signInWithOtp({ phone });
  const { data: authData, error: authError } = await supabase.auth.verifyOtp({
    phone,
    token: '000000',
    type: 'sms',
  });
  
  if (authError || !authData.user) {
    console.error(`Auth failed for ${phone}:`, authError);
    return;
  }
  const myId = authData.user.id;
  console.log(`Authenticated as ${phone}. User ID: ${myId}`);

  // Fetch all chats
  const { data: chats, error: chatsErr } = await supabase
    .from('chats')
    .select(`
      id,
      type,
      created_by,
      created_at,
      chat_members (
        user_id
      )
    `);

  if (chatsErr) {
    console.error('Error fetching chats:', chatsErr);
    return;
  }

  // Let's check for duplicates:
  const chatGroups = {};
  chats.forEach(c => {
    if (c.type === 'direct') {
      const sortedMemberIds = c.chat_members.map(m => m.user_id).sort().join(',');
      if (!chatGroups[sortedMemberIds]) {
        chatGroups[sortedMemberIds] = [];
      }
      chatGroups[sortedMemberIds].push(c);
    }
  });

  for (const [members, group] of Object.entries(chatGroups)) {
    if (group.length > 1) {
      console.log(`Participants: [${members}] - Found ${group.length} chat(s). Cleaning up...`);
      group.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      const [keep, ...dupes] = group;
      console.log(`Keeping chat ${keep.id}`);
      
      for (const dupe of dupes) {
        console.log(`Deleting duplicate chat ${dupe.id}...`);
        
        const { error: delMembersErr } = await supabase
          .from('chat_members')
          .delete()
          .eq('chat_id', dupe.id);
          
        if (delMembersErr) {
            console.error(`Failed to delete members for ${dupe.id}:`, delMembersErr);
        } else {
            console.log(`Successfully deleted members for duplicate chat ${dupe.id}`);
        }
      }
    }
  }
  console.log('Done cleaning up.');
}

run();
