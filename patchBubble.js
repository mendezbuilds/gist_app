const fs = require('fs');

const path = 'app/(app)/chats/[chatId].tsx';
let code = fs.readFileSync(path, 'utf-8');

const startBubble = `
const MessageBubble = React.memo(({
  item,
  isMe,
  showTimeSeparator,
  isContinuation,
  repliedMessage,
  senderDisplayName,
  senderAvatarUrl,
  isGroup,
  isReadByOther,
  isDeliveredToOther,
  readByNames,
  theme,
  onLongPress,
  onPressBubble,
  onReply,
  onScrollToIndex
}: any) => {
  const { colors, spacing, fontSize, borderRadius } = theme;
  const msgDate = new Date(item.created_at);
  const timeString = msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const showSenderName = isGroup && !isMe && senderDisplayName && !isContinuation;

  const bRadius = isMe ? borderRadius.bubbleMine : borderRadius.bubbleTheirs;
  const dynamicBorderRadius = {
    borderTopLeftRadius: !isMe && isContinuation ? 4 : bRadius.topLeft,
    borderTopRightRadius: isMe && isContinuation ? 4 : bRadius.topRight,
    borderBottomLeftRadius: bRadius.bottomLeft,
    borderBottomRightRadius: bRadius.bottomRight,
  };

  const swipeRef = useRef<any>(null);

  return (
    <Animated.View 
      entering={item._isNew ? (isMe ? FadeIn.duration(150) : FadeInDown.springify().damping(15)) : undefined}
      layout={Layout.springify()}
      style={{ width: '100%', paddingVertical: isContinuation ? 2 : spacing[1] }}
    >
      {showTimeSeparator && (
        <View style={{ alignItems: 'center', marginVertical: spacing[4] }}>
          <Text
            style={{
              fontFamily: 'Nunito_600SemiBold',
              fontSize: fontSize.xs,
              color: colors.textSecondary,
              backgroundColor: colors.surfaceElevated,
              paddingHorizontal: spacing[3],
              paddingVertical: spacing[1],
              borderRadius: 12,
              overflow: 'hidden',
            }}
          >
            {timeString}
          </Text>
        </View>
      )}

      <View
        style={{
          flexDirection: 'row',
          justifyContent: isMe ? 'flex-end' : 'flex-start',
          paddingHorizontal: spacing[4],
        }}
      >
        {!isMe && isGroup && (
          <View style={{ width: 30, marginRight: spacing[2], justifyContent: 'flex-end' }}>
            {!isContinuation && (
              <Avatar
                uri={senderAvatarUrl || undefined}
                name={senderDisplayName || '?'}
                size={30}
              />
            )}
          </View>
        )}

        <View style={{ maxWidth: '78%' }}>
          <Swipeable
            ref={swipeRef}
            onSwipeableWillOpen={() => {
              onReply(item);
              setTimeout(() => swipeRef.current?.close(), 500);
            }}
            renderLeftActions={(progress, dragX) => {
              const scale = dragX.interpolate({
                inputRange: [0, 40],
                outputRange: [0, 1],
                extrapolate: 'clamp',
              });
              return (
                <View style={{ justifyContent: 'center', paddingLeft: spacing[2], paddingRight: spacing[4] }}>
                  <RNAnimated.View style={{ transform: [{ scale }] }}>
                    <CornerUpLeft size={24} color={colors.textTertiary} />
                  </RNAnimated.View>
                </View>
              );
            }}
          >
            <TouchableOpacity
              activeOpacity={0.9}
              onLongPress={() => onLongPress(item)}
              onPress={() => onPressBubble(item, readByNames)}
              style={[
                {
                  backgroundColor: isMe ? colors.bubbleMine : colors.bubbleTheirs,
                  paddingTop: spacing[3],
                  paddingBottom: spacing[2],
                  paddingHorizontal: spacing[4],
                  borderColor: isMe ? 'transparent' : colors.border,
                  borderWidth: isMe ? 0 : 1,
                  overflow: 'hidden',
                  elevation: 3,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.15,
                  shadowRadius: 4,
                },
                dynamicBorderRadius
              ]}
            >
            {isMe && <AdirePattern opacity={0.2} strokeColor="#FFFFFF" width="100%" height="100%" style={{ zIndex: 0 }} />}
            
            {item.is_forwarded && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                <Forward size={12} color={isMe ? 'rgba(255,255,255,0.7)' : colors.textTertiary} style={{ marginRight: 4 }} />
                <Text style={{ fontFamily: 'Nunito_600SemiBold', fontSize: 11, color: isMe ? 'rgba(255,255,255,0.7)' : colors.textTertiary, fontStyle: 'italic' }}>Forwarded</Text>
              </View>
            )}

            {repliedMessage && (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => onScrollToIndex(repliedMessage.id)}
                style={{
                  backgroundColor: isMe ? 'rgba(255,255,255,0.15)' : colors.surfaceOverlay,
                  borderLeftWidth: 3,
                  borderLeftColor: isMe ? '#FFF' : colors.brandHighlight,
                  padding: spacing[2],
                  borderRadius: 6,
                  marginBottom: spacing[2],
                }}
              >
                <Text style={{ fontFamily: 'Nunito_700Bold', fontSize: 11, color: isMe ? '#FFF' : colors.brandHighlight, marginBottom: 2 }}>
                  {repliedMessage.sender_id === item.sender_id ? 'You' : (repliedMessage.senderDisplayName || 'Someone')}
                </Text>
                <Text numberOfLines={2} style={{ fontFamily: 'Nunito_400Regular', fontSize: 12, color: isMe ? 'rgba(255,255,255,0.9)' : colors.textSecondary }}>
                  {repliedMessage.decrypted_text || 'Message...'}
                </Text>
              </TouchableOpacity>
            )}

            {showSenderName && (
              <Text style={{ fontFamily: 'Nunito_700Bold', fontSize: fontSize.xs, color: colors.accent, marginBottom: 2 }}>
                {senderDisplayName}
              </Text>
            )}
            
            <Text style={{ fontFamily: 'Nunito_400Regular', fontSize: fontSize.base, color: isMe ? colors.bubbleMineText : colors.bubbleTheirsText, lineHeight: 22 }}>
              {item.decrypted_text || 'Decrypting...'}
              {item.edited_at && <Text style={{ fontSize: 10, opacity: 0.7 }}> (edited)</Text>}
            </Text>

            <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 2 }}>
              <View style={{ flex: 1 }} />
              <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 12 }}>
                <Text style={{ fontSize: 10, fontFamily: 'Nunito_600SemiBold', color: isMe ? 'rgba(255,255,255,0.7)' : colors.textTertiary, marginRight: isMe && !isGroup ? 4 : 0 }}>
                  {timeString}
                </Text>
                {isMe && !isGroup && (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {isReadByOther ? (
                      <Animated.View entering={ZoomIn.springify()}>
                        <DoubleTick size={16} color={colors.brandHighlight} />
                      </Animated.View>
                    ) : isDeliveredToOther ? (
                      <DoubleTick size={16} color={colors.bubbleMineText} />
                    ) : (
                      <SingleTick size={15} color={colors.bubbleMineText} />
                    )}
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
          </Swipeable>

          {item.message_reactions && item.message_reactions.length > 0 && (
            <View style={{ flexDirection: 'row', marginTop: 4, flexWrap: 'wrap', backgroundColor: colors.surfaceElevated, borderRadius: 12, paddingHorizontal: 6, paddingVertical: 2, alignSelf: isMe ? 'flex-end' : 'flex-start', borderWidth: 1, borderColor: colors.border, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 }}>
              {Array.from(new Set(item.message_reactions.map((r: any) => r.emoji))).map((emoji: any, i) => (
                <Text key={i} style={{ fontSize: 12, marginRight: 2 }}>{emoji}</Text>
              ))}
            </View>
          )}
        </View>
      </View>
    </Animated.View>
  );
}, (prev, next) => {
  return (
    prev.item.decrypted_text === next.item.decrypted_text &&
    prev.item.edited_at === next.item.edited_at &&
    prev.item.message_reactions?.length === next.item.message_reactions?.length &&
    prev.showTimeSeparator === next.showTimeSeparator &&
    prev.isContinuation === next.isContinuation &&
    prev.isReadByOther === next.isReadByOther &&
    prev.isDeliveredToOther === next.isDeliveredToOther &&
    prev.readByNames.length === next.readByNames.length &&
    prev.item.is_forwarded === next.item.is_forwarded &&
    prev.item.encrypted_content === next.item.encrypted_content
  );
});

export default function ChatRoomScreen() {`;

code = code.replace('export default function ChatRoomScreen() {', startBubble);

const newRenderMessageItem = `
  const handleScrollToMessage = useCallback((msgId: string) => {
    const idx = messages.findIndex(m => m.id === msgId);
    if (idx !== -1) flatListRef.current?.scrollToIndex({ index: idx, animated: true });
  }, [messages]);

  const handlePressBubble = useCallback((item: MessageWithSender, readByNames: string[]) => {
    if (isGroup && item.sender_id === myUserId) {
      if (readByNames.length > 0) {
        alert(\`Read by:\\n\${readByNames.join('\\n')}\`);
      } else {
        alert('Not read by anyone yet');
      }
    }
  }, [isGroup, myUserId]);

  const handleLongPressBubble = useCallback((item: MessageWithSender) => {
    setSelectedMessage(item);
    setContextMenuVisible(true);
    import('expo-haptics').then(Haptics => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
  }, []);

  const handleReplyBubble = useCallback((item: MessageWithSender) => {
    setSelectedMessage(item);
    handleStartReply();
  }, [handleStartReply]);

  const renderMessageItem = useCallback(({ item, index }: { item: MessageWithSender; index: number }) => {
    if (item.encrypted_content === null) return null;

    const isMe = item.sender_id === myUserId;
    
    let showTimeSeparator = false;
    let isContinuation = false;

    if (index === 0) {
      showTimeSeparator = true;
    } else {
      const prevMsg = messages[index - 1];
      const prevDate = new Date(prevMsg.created_at);
      const currDate = new Date(item.created_at);
      const diffMs = currDate.getTime() - prevDate.getTime();
      if (diffMs / 60000 > 10) showTimeSeparator = true;
      else if (prevMsg.sender_id === item.sender_id) isContinuation = true;
    }

    const sender = chat?.members.find(m => m.user_id === item.sender_id);
    const repliedMessage = item.reply_to_message_id ? messages.find(m => m.id === item.reply_to_message_id) : undefined;
    
    let repliedMessageWithSender;
    if (repliedMessage) {
      const repliedSender = chat?.members.find(m => m.user_id === repliedMessage.sender_id);
      repliedMessageWithSender = { ...repliedMessage, senderDisplayName: repliedSender?.profile?.display_name };
    }

    const isReadByOther = messageReads.some(r => r.message_id === item.id && r.user_id !== myUserId);
    const isDeliveredToOther = item.message_deliveries?.some(d => d.user_id !== myUserId) ?? false;
    const readByNames = (isGroup && isMe) 
      ? messageReads.filter(r => r.message_id === item.id && r.user_id !== myUserId).map(r => chat?.members.find(m => m.user_id === r.user_id)?.profile?.display_name || 'Unknown')
      : [];

    return (
      <MessageBubble
        item={item}
        isMe={isMe}
        showTimeSeparator={showTimeSeparator}
        isContinuation={isContinuation}
        repliedMessage={repliedMessageWithSender}
        senderDisplayName={sender?.profile?.display_name}
        senderAvatarUrl={sender?.profile?.avatar_url}
        isGroup={isGroup}
        isReadByOther={isReadByOther}
        isDeliveredToOther={isDeliveredToOther}
        readByNames={readByNames}
        theme={{ colors, spacing, fontSize, borderRadius }}
        onLongPress={handleLongPressBubble}
        onPressBubble={handlePressBubble}
        onReply={handleReplyBubble}
        onScrollToIndex={handleScrollToMessage}
      />
    );
  }, [messages, messageReads, myUserId, chat, isGroup, colors, spacing, fontSize, borderRadius, handleScrollToMessage, handlePressBubble, handleLongPressBubble, handleReplyBubble]);

  const renderTypingIndicator = () => {`;

const startIdx = code.indexOf('const renderMessageItem = ({');
const endIdx = code.indexOf('const renderTypingIndicator = () => {');

if (startIdx === -1 || endIdx === -1) {
  console.log('Error finding indices');
} else {
  code = code.substring(0, startIdx) + newRenderMessageItem + code.substring(endIdx + 'const renderTypingIndicator = () => {'.length);
  fs.writeFileSync(path, code);
  console.log('Success');
}
