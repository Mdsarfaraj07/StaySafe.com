package com.staysafe.repo;

import com.staysafe.model.ChatMessage;
import com.staysafe.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {
    List<ChatMessage> findByConversationUserOrderByCreatedAtAsc(User conversationUser);
    List<ChatMessage> findTop100ByOrderByCreatedAtDesc();
}
