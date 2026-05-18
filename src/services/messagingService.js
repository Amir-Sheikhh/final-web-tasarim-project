import { createId } from "../db/init.js";
import { runRead, runWrite } from "../db/query.js";
import { AppError } from "../lib/http.js";
import { emitToUsers, isUserOnline } from "../lib/realtime.js";

function normalizeText(value) {
  return String(value ?? "").trim();
}

function assertRequired(value, message) {
  if (!normalizeText(value)) {
    throw new AppError(message, 400);
  }
}

function publicUserProjection(alias = "user") {
  return `${alias} {
    .id,
    .name,
    .headline,
    .city,
    .color,
    .profileImageUrl
  }`;
}

function enrichPresence(conversation) {
  return {
    ...conversation,
    participant: {
      ...conversation.participant,
      online: isUserOnline(conversation.participant.id)
    }
  };
}

export async function listConversations(viewerId, search = "") {
  assertRequired(viewerId, "Mesajlar icin kullanici oturumu gerekli.");

  const result = await runRead(
    `
      MATCH (viewer:User {id: $viewerId})
      MATCH (participant:User)
      WHERE participant.id <> $viewerId
        AND (
          $search = ""
          OR toLower(participant.name) CONTAINS $search
          OR toLower(participant.headline) CONTAINS $search
          OR toLower(coalesce(participant.city, "")) CONTAINS $search
        )
      OPTIONAL MATCH (sender:User)-[:SENT]->(message:Message)-[:TO]->(recipient:User)
      WHERE (sender = viewer AND recipient = participant)
         OR (sender = participant AND recipient = viewer)
      WITH participant,
           sender,
           message,
           CASE WHEN message IS NOT NULL AND sender = participant AND message.seenAt IS NULL THEN 1 ELSE 0 END AS unreadFlag
      ORDER BY message.createdAt DESC
      WITH participant, sum(unreadFlag) AS unreadCount, collect(message)[0] AS latestMessage
      RETURN {
        participant: ${publicUserProjection("participant")},
        unreadCount: unreadCount,
        latestMessage: CASE
          WHEN latestMessage IS NULL THEN null
          ELSE latestMessage {
            .id,
            .content,
            .createdAt,
            .seenAt,
            sentByViewer: EXISTS {
              MATCH (:User {id: $viewerId})-[:SENT]->(latestMessage)
            }
          }
        END
      } AS conversation
      ORDER BY conversation.latestMessage.createdAt DESC, participant.name
      LIMIT 40
    `,
    {
      viewerId,
      search: normalizeText(search).toLowerCase()
    }
  );

  return result.records.map((record) => enrichPresence(record.get("conversation")));
}

export async function getConversation(viewerId, participantId) {
  assertRequired(viewerId, "Mesajlar icin kullanici oturumu gerekli.");
  assertRequired(participantId, "Konusma kullanicisi secilmedi.");

  if (viewerId === participantId) {
    throw new AppError("Kendinizle mesajlasamazsiniz.", 400);
  }

  const result = await runRead(
    `
      MATCH (viewer:User {id: $viewerId})
      MATCH (participant:User {id: $participantId})
      OPTIONAL MATCH (sender:User)-[:SENT]->(message:Message)-[:TO]->(recipient:User)
      WHERE (sender = viewer AND recipient = participant)
         OR (sender = participant AND recipient = viewer)
      WITH viewer, participant, sender, recipient, message
      ORDER BY message.createdAt ASC
      WITH participant,
           collect(
             CASE
               WHEN message IS NULL THEN null
               ELSE message {
                 .id,
                 .content,
                 .createdAt,
                 .seenAt,
                 fromUserId: sender.id,
                 toUserId: recipient.id,
                 sentByViewer: sender.id = $viewerId
               }
             END
           ) AS messages
      RETURN {
        participant: ${publicUserProjection("participant")},
        messages: messages
      } AS conversation
      LIMIT 1
    `,
    { viewerId, participantId }
  );

  const conversation = result.records[0]?.get("conversation");

  if (!conversation) {
    throw new AppError("Kullanici bulunamadi.", 404);
  }

  return {
    ...conversation,
    participant: {
      ...conversation.participant,
      online: isUserOnline(participantId)
    },
    messages: (conversation.messages ?? []).filter(Boolean)
  };
}

export async function sendMessage(viewerId, recipientId, content) {
  assertRequired(viewerId, "Mesaj gondermek icin kullanici oturumu gerekli.");
  assertRequired(recipientId, "Alici secilmedi.");

  if (viewerId === recipientId) {
    throw new AppError("Kendinize mesaj gonderemezsiniz.", 400);
  }

  const cleanContent = normalizeText(content);
  assertRequired(cleanContent, "Mesaj metni bos olamaz.");

  if (cleanContent.length > 1000) {
    throw new AppError("Mesaj en fazla 1000 karakter olabilir.", 400);
  }

  const message = {
    id: createId("message"),
    content: cleanContent,
    createdAt: new Date().toISOString(),
    seenAt: null
  };

  const result = await runWrite(
    `
      MATCH (sender:User {id: $viewerId})
      MATCH (recipient:User {id: $recipientId})
      CREATE (message:Message {
        id: $message.id,
        content: $message.content,
        createdAt: $message.createdAt,
        seenAt: $message.seenAt
      })
      CREATE (sender)-[:SENT]->(message)
      CREATE (message)-[:TO]->(recipient)
      RETURN message {
        .id,
        .content,
        .createdAt,
        .seenAt,
        fromUserId: sender.id,
        toUserId: recipient.id,
        sentByViewer: true,
        sender: ${publicUserProjection("sender")},
        recipient: ${publicUserProjection("recipient")}
      } AS message
    `,
    { viewerId, recipientId, message }
  );

  const created = result.records[0]?.get("message");

  if (!created) {
    throw new AppError("Alici kullanici bulunamadi.", 404);
  }

  emitToUsers([viewerId, recipientId], "message:new", {
    message: created
  });
  emitToUsers([recipientId], "notification:new", {
    notificationId: `message-${created.id}`
  });

  return created;
}

export async function markConversationRead(viewerId, participantId) {
  assertRequired(viewerId, "Mesaj okuma durumu icin kullanici oturumu gerekli.");
  assertRequired(participantId, "Konusma kullanicisi secilmedi.");

  const seenAt = new Date().toISOString();
  const result = await runWrite(
    `
      MATCH (:User {id: $participantId})-[:SENT]->(message:Message)-[:TO]->(:User {id: $viewerId})
      WHERE message.seenAt IS NULL
      SET message.seenAt = $seenAt
      RETURN collect(message.id) AS messageIds
    `,
    { viewerId, participantId, seenAt }
  );

  const messageIds = result.records[0]?.get("messageIds") ?? [];

  if (messageIds.length) {
    emitToUsers([viewerId, participantId], "message:seen", {
      viewerId,
      participantId,
      messageIds,
      seenAt
    });
  }

  return {
    messageIds,
    seenAt
  };
}
