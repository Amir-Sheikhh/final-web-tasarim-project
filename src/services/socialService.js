import { createId } from "../db/init.js";
import { runRead, runWrite } from "../db/query.js";
import { AppError } from "../lib/http.js";
import { escapeHtml } from "../lib/sanitize.js";
import { removeSavedUpload, removeUploadByUrl, savePostMedia } from "../lib/uploads.js";

function normalizeText(value) {
  return String(value ?? "").trim();
}

function assertRequired(value, message) {
  if (!normalizeText(value)) {
    throw new Error(message);
  }
}

async function getPostOwner(postId) {
  const result = await runRead(
    `
      MATCH (author:User)-[:AUTHORED]->(post:Post {id: $postId})
      RETURN author.id AS authorId,
             post.mediaUrl AS mediaUrl,
             post.content AS content
      LIMIT 1
    `,
    { postId }
  );

  const record = result.records[0];

  if (!record) {
    throw new AppError("Gonderi bulunamadi.", 404);
  }

  return {
    authorId: record.get("authorId"),
    mediaUrl: record.get("mediaUrl"),
    content: record.get("content") ?? ""
  };
}

function assertPostPermission(post, userId, role) {
  if (post.authorId !== userId && role !== "admin") {
    throw new AppError("Bu gonderi icin yetkiniz yok.", 403);
  }
}

function pickFirstUser(users, fallbackId) {
  if (fallbackId && users.some((user) => user.id === fallbackId)) {
    return fallbackId;
  }

  return users[0]?.id ?? null;
}

export async function listUsers(viewerId, { limit = 50, offset = 0 } = {}) {
  const result = await runRead(
    `
      MATCH (user:User)
      OPTIONAL MATCH (user)<-[:FOLLOWS]-(follower:User)
      WITH user, count(DISTINCT follower) AS followerCount
      OPTIONAL MATCH (user)-[:FOLLOWS]->(following:User)
      WITH user, followerCount, count(DISTINCT following) AS followingCount
      OPTIONAL MATCH (user)-[:AUTHORED]->(post:Post)
      WITH user, followerCount, followingCount, count(DISTINCT post) AS postCount
      OPTIONAL MATCH (viewer:User {id: $viewerId})-[rel:FOLLOWS]->(user)
      RETURN user {
        .id,
        .name,
        .headline,
        .bio,
        .city,
        .color,
        .profileImageUrl,
        .role,
        .createdAt,
        followerCount: followerCount,
        followingCount: followingCount,
        postCount: postCount,
        isViewer: user.id = $viewerId,
        followedByViewer: rel IS NOT NULL
      } AS user
      ORDER BY followerCount DESC, user.name
      SKIP $offset LIMIT $limit
    `,
    { viewerId, limit: Number(limit), offset: Number(offset) }
  );

  return result.records.map((record) => record.get("user"));
}

export async function getUserById(userId, viewerId) {
  const result = await runRead(
    `
      MATCH (user:User {id: $userId})
      OPTIONAL MATCH (user)<-[:FOLLOWS]-(follower:User)
      WITH user, count(DISTINCT follower) AS followerCount
      OPTIONAL MATCH (user)-[:FOLLOWS]->(following:User)
      WITH user, followerCount, count(DISTINCT following) AS followingCount
      OPTIONAL MATCH (user)-[:AUTHORED]->(post:Post)
      WITH user, followerCount, followingCount, count(DISTINCT post) AS postCount
      OPTIONAL MATCH (viewer:User {id: $viewerId})-[rel:FOLLOWS]->(user)
      RETURN user {
        .id,
        .name,
        .headline,
        .bio,
        .city,
        .color,
        .profileImageUrl,
        .role,
        .createdAt,
        followerCount: followerCount,
        followingCount: followingCount,
        postCount: postCount,
        isViewer: user.id = $viewerId,
        followedByViewer: rel IS NOT NULL
      } AS user
      LIMIT 1
    `,
    { userId, viewerId }
  );

  return result.records[0]?.get("user") ?? null;
}

export async function getUserProfile(userId, viewerId) {
  const user = await getUserById(userId, viewerId);

  if (!user) {
    throw new AppError("Kullanici bulunamadi.", 404);
  }

  const [followingResult, followersResult, postsResult, mutualResult, suggestionResult] = await Promise.all([
    runRead(
      `
        MATCH (:User {id: $userId})-[:FOLLOWS]->(person:User)
        OPTIONAL MATCH (viewer:User {id: $viewerId})-[rel:FOLLOWS]->(person)
        RETURN person {
          .id,
          .name,
          .headline,
          .bio,
          .city,
          .color,
          .profileImageUrl,
          isViewer: person.id = $viewerId,
          followedByViewer: rel IS NOT NULL
        } AS person
        ORDER BY person.name
      `,
      { userId, viewerId }
    ),
    runRead(
      `
        MATCH (person:User)-[:FOLLOWS]->(:User {id: $userId})
        OPTIONAL MATCH (viewer:User {id: $viewerId})-[rel:FOLLOWS]->(person)
        RETURN person {
          .id,
          .name,
          .headline,
          .bio,
          .city,
          .color,
          .profileImageUrl,
          isViewer: person.id = $viewerId,
          followedByViewer: rel IS NOT NULL
        } AS person
        ORDER BY person.name
      `,
      { userId, viewerId }
    ),
    runRead(
      `
        MATCH (author:User {id: $userId})-[:AUTHORED]->(post:Post)
        OPTIONAL MATCH (post)<-[:LIKED]-(liker:User)
        WITH author, post, count(DISTINCT liker) AS likeCount, collect(DISTINCT liker.id) AS likerIds
        OPTIONAL MATCH (comment:Comment)-[:ON_POST]->(post)
        WITH author, post, likeCount, likerIds, count(DISTINCT comment) AS commentCount
        RETURN post {
          .*,
          likeCount: likeCount,
          likedByViewer: $viewerId IN likerIds,
          authoredByViewer: author.id = $viewerId,
          commentCount: commentCount,
          comments: [],
          author: author {
            .id,
            .name,
            .headline,
            .color,
            .profileImageUrl,
            .city
          }
        } AS post
        ORDER BY post.createdAt DESC
        LIMIT 8
      `,
      { userId, viewerId }
    ),
    runRead(
      `
        MATCH (viewer:User {id: $viewerId})-[:FOLLOWS]->(mutual:User)<-[:FOLLOWS]-(:User {id: $userId})
        RETURN mutual {
          .id,
          .name,
          .headline,
          .bio,
          .city,
          .color,
          .profileImageUrl,
          isViewer: mutual.id = $viewerId,
          followedByViewer: true
        } AS mutual
        ORDER BY mutual.name
        LIMIT 8
      `,
      { userId, viewerId }
    ),
    runRead(
      `
        MATCH (target:User {id: $userId}), (viewer:User {id: $viewerId})
        MATCH (candidate:User)
        WHERE candidate <> target
          AND candidate <> viewer
          AND NOT (viewer)-[:FOLLOWS]->(candidate)
        OPTIONAL MATCH (target)-[targetFollow:FOLLOWS]->(candidate)
        WITH target, candidate, count(targetFollow) AS targetFollows
        OPTIONAL MATCH (candidate)-[candidateFollow:FOLLOWS]->(target)
        WITH target, candidate, targetFollows, count(candidateFollow) AS followsTarget
        OPTIONAL MATCH (target)-[:FOLLOWS]->(bridge:User)-[:FOLLOWS]->(candidate)
        WITH candidate,
             targetFollows,
             followsTarget,
             count(DISTINCT bridge) AS bridgeScore,
             collect(DISTINCT bridge.name)[0..3] AS bridgeNames
        WITH candidate,
             targetFollows,
             followsTarget,
             bridgeScore,
             bridgeNames,
             (targetFollows * 3) + (followsTarget * 2) + bridgeScore AS score
        WHERE score > 0
        OPTIONAL MATCH (candidate)<-[:FOLLOWS]-(follower:User)
        WITH candidate, targetFollows, followsTarget, bridgeScore, bridgeNames, score, count(DISTINCT follower) AS followerCount
        RETURN candidate {
          .id,
          .name,
          .headline,
          .bio,
          .city,
          .color,
          .profileImageUrl,
          score: score,
          bridgeNames: bridgeNames,
          followedByViewer: false,
          reason: CASE
            WHEN targetFollows > 0 THEN 'Bu profilin takip ettigi kisi'
            WHEN followsTarget > 0 THEN 'Bu profili takip ediyor'
            ELSE 'Bu profilin baglantilari tarafindan takip ediliyor'
          END
        } AS suggestion
        ORDER BY score DESC, followerCount DESC, candidate.name
        LIMIT 6
      `,
      { userId, viewerId }
    )
  ]);

  return {
    user,
    following: followingResult.records.map((record) => record.get("person")),
    followers: followersResult.records.map((record) => record.get("person")),
    posts: postsResult.records.map((record) => record.get("post")),
    mutualConnections: mutualResult.records.map((record) => record.get("mutual")),
    friendSuggestions: suggestionResult.records.map((record) => record.get("suggestion"))
  };
}

export async function getPostList(viewerId, { limit = 20, offset = 0 } = {}) {
  const result = await runRead(
    `
      MATCH (author:User)-[:AUTHORED]->(post:Post)
      OPTIONAL MATCH (post)<-[:LIKED]-(liker:User)
      WITH author, post, count(DISTINCT liker) AS likeCount, collect(DISTINCT liker.id) AS likerIds
      OPTIONAL MATCH (commentAuthor:User)-[:COMMENTED]->(comment:Comment)-[:ON_POST]->(post)
      WITH author, post, likeCount, likerIds, commentAuthor, comment
      ORDER BY comment.createdAt DESC
      WITH author, post, likeCount, likerIds,
           collect(
             CASE
               WHEN comment IS NULL THEN null
               ELSE comment {
                 .id,
                 .content,
                 .createdAt,
                 author: commentAuthor {
                  .id,
                  .name,
                  .headline,
                  .color,
                  .profileImageUrl
                 },
                 authoredByViewer: commentAuthor.id = $viewerId
               }
             END
           ) AS rawComments
      WITH author, post, likeCount, likerIds, [item IN rawComments WHERE item IS NOT NULL] AS comments
      RETURN post {
        .*,
        likeCount: likeCount,
        likedByViewer: $viewerId IN likerIds,
        authoredByViewer: author.id = $viewerId,
        commentCount: size(comments),
        comments: comments[0..3],
        author: author {
          .id,
          .name,
          .headline,
          .color,
          .profileImageUrl,
          .city
        }
      } AS post
      ORDER BY post.createdAt DESC
      SKIP $offset LIMIT $limit
    `,
    { viewerId, limit: Number(limit), offset: Number(offset) }
  );

  return result.records.map((record) => record.get("post"));
}

export async function getPostById(postId, viewerId) {
  const result = await runRead(
    `
      MATCH (author:User)-[:AUTHORED]->(post:Post {id: $postId})
      OPTIONAL MATCH (post)<-[:LIKED]-(liker:User)
      WITH author, post, count(DISTINCT liker) AS likeCount, collect(DISTINCT liker.id) AS likerIds
      OPTIONAL MATCH (commentAuthor:User)-[:COMMENTED]->(comment:Comment)-[:ON_POST]->(post)
      WITH author, post, likeCount, likerIds, commentAuthor, comment
      ORDER BY comment.createdAt DESC
      WITH author, post, likeCount, likerIds,
           collect(
             CASE
               WHEN comment IS NULL THEN null
               ELSE comment {
                 .id,
                 .content,
                 .createdAt,
                 author: commentAuthor {
                   .id,
                   .name,
                  .headline,
                  .color,
                  .profileImageUrl
                 },
                 authoredByViewer: commentAuthor.id = $viewerId
               }
             END
           ) AS rawComments
      WITH author, post, likeCount, likerIds, [item IN rawComments WHERE item IS NOT NULL] AS comments
      RETURN post {
        .*,
        likeCount: likeCount,
        likedByViewer: $viewerId IN likerIds,
        authoredByViewer: author.id = $viewerId,
        commentCount: size(comments),
        comments: comments[0..12],
        author: author {
          .id,
          .name,
          .headline,
          .color,
          .profileImageUrl,
          .city
        }
      } AS post
      LIMIT 1
    `,
    { postId, viewerId }
  );

  return result.records[0]?.get("post") ?? null;
}

export async function getStats() {
  const result = await runRead(`
    CALL {
      MATCH (user:User)
      RETURN count(user) AS users
    }
    CALL {
      MATCH ()-[follow:FOLLOWS]->()
      RETURN count(follow) AS follows
    }
    CALL {
      MATCH (post:Post)
      RETURN count(post) AS posts
    }
    CALL {
      MATCH ()-[like:LIKED]->()
      RETURN count(like) AS likes
    }
    CALL {
      MATCH (comment:Comment)
      RETURN count(comment) AS comments
    }
    RETURN {
      users: users,
      follows: follows,
      posts: posts,
      likes: likes,
      comments: comments
    } AS stats
  `);

  return result.records[0]?.get("stats") ?? {
    users: 0,
    follows: 0,
    posts: 0,
    likes: 0,
    comments: 0
  };
}

export async function getSecondDegreeConnections(viewerId) {
  if (!viewerId) {
    return [];
  }

  const result = await runRead(
    `
      MATCH (viewer:User {id: $viewerId})-[:FOLLOWS]->(middle:User)-[:FOLLOWS]->(candidate:User)
      WHERE viewer <> candidate AND NOT (viewer)-[:FOLLOWS]->(candidate)
      WITH candidate, count(DISTINCT middle) AS viaCount, collect(DISTINCT middle.name)[0..3] AS viaNames
      RETURN candidate {
        .id,
        .name,
        .headline,
        .bio,
        .city,
        .color,
        viaCount: viaCount,
        viaNames: viaNames
      } AS connection
      ORDER BY viaCount DESC, candidate.name
      LIMIT 6
    `,
    { viewerId }
  );

  return result.records.map((record) => record.get("connection"));
}

export async function getMutualConnections(viewerId, targetId) {
  if (!viewerId || !targetId || viewerId === targetId) {
    return [];
  }

  const result = await runRead(
    `
      MATCH (viewer:User {id: $viewerId})-[:FOLLOWS]->(mutual:User)<-[:FOLLOWS]-(target:User {id: $targetId})
      RETURN mutual {
        .id,
        .name,
        .headline,
        .bio,
        .city,
        .color
      } AS mutual
      ORDER BY mutual.name
      LIMIT 10
    `,
    { viewerId, targetId }
  );

  return result.records.map((record) => record.get("mutual"));
}

export async function getRecommendations(viewerId) {
  if (!viewerId) {
    return [];
  }

  const result = await runRead(
    `
      MATCH (viewer:User {id: $viewerId})
      MATCH (candidate:User)
      WHERE candidate <> viewer AND NOT (viewer)-[:FOLLOWS]->(candidate)
      OPTIONAL MATCH (viewer)-[:FOLLOWS]->(mutual:User)-[:FOLLOWS]->(candidate)
      WITH viewer, candidate, count(DISTINCT mutual) AS mutualScore, collect(DISTINCT mutual.name)[0..3] AS mutualNames
      OPTIONAL MATCH (viewer)-[:LIKED]->(:Post)<-[:LIKED]-(peer:User)-[:FOLLOWS]->(candidate)
      WITH candidate, mutualScore, mutualNames, count(DISTINCT peer) AS peerScore, collect(DISTINCT peer.name)[0..3] AS peerNames
      WITH candidate, mutualScore, mutualNames, peerScore, peerNames, (mutualScore * 2) + peerScore AS score
      WHERE score > 0
      RETURN candidate {
        .id,
        .name,
        .headline,
        .bio,
        .city,
        .color,
        score: score,
        mutualNames: mutualNames,
        peerNames: peerNames,
        reason: CASE
          WHEN peerScore > 0 AND mutualScore > 0 THEN 'Ortak baglantilar ve benzer begeniler'
          WHEN peerScore > 0 THEN 'Benzer begenilere sahip kullanicilar takip ediyor'
          ELSE 'Baglantilarinizin takip ettigi kisiler'
        END
      } AS recommendation
      ORDER BY score DESC, candidate.name
      LIMIT 6
    `,
    { viewerId }
  );

  return result.records.map((record) => record.get("recommendation"));
}

export async function getShortestPath(viewerId, targetId) {
  if (!viewerId || !targetId) {
    return {
      nodes: [],
      hops: null
    };
  }

  if (viewerId === targetId) {
    const users = await listUsers(viewerId);
    const current = users.find((user) => user.id === viewerId);

    return {
      nodes: current ? [{ id: current.id, name: current.name }] : [],
      hops: 0
    };
  }

  const result = await runRead(
    `
      MATCH (start:User {id: $viewerId}), (target:User {id: $targetId})
      OPTIONAL MATCH path = shortestPath((start)-[:FOLLOWS*..6]-(target))
      RETURN
        CASE
          WHEN path IS NULL THEN []
          ELSE [node IN nodes(path) | node { .id, .name }]
        END AS nodes,
        CASE
          WHEN path IS NULL THEN null
          ELSE length(path)
        END AS hops
    `,
    { viewerId, targetId }
  );

  const record = result.records[0];

  return {
    nodes: record?.get("nodes") ?? [],
    hops: record?.get("hops") ?? null
  };
}

export async function getCypherExamples(viewerId, targetId) {
  return [
    {
      title: "2. derece baglantilar",
      query: `MATCH (u:User {id: "${viewerId ?? "viewer"}"})-[:FOLLOWS]->(:User)-[:FOLLOWS]->(candidate)\nRETURN candidate`
    },
    {
      title: "Ortak baglantilar",
      query: `MATCH (x:User {id: "${viewerId ?? "viewer"}"})-[:FOLLOWS]->(m:User)<-[:FOLLOWS]-(y:User {id: "${targetId ?? "target"}"})\nRETURN m`
    },
    {
      title: "En kisa yol",
      query: `MATCH path = shortestPath((x:User {id: "${viewerId ?? "viewer"}"})-[:FOLLOWS*..6]-(y:User {id: "${targetId ?? "target"}"}))\nRETURN path`
    }
  ];
}

export async function getDashboard({ viewerId, targetId }) {
  const initialUsers = await listUsers(viewerId);
  const resolvedViewerId = pickFirstUser(initialUsers, viewerId);
  const users = viewerId === resolvedViewerId ? initialUsers : await listUsers(resolvedViewerId);
  const resolvedTargetId = pickFirstUser(
    users.filter((user) => user.id !== resolvedViewerId),
    targetId && targetId !== resolvedViewerId ? targetId : undefined
  );

  const [stats, posts, secondDegree, mutualConnections, recommendations, shortestPath, cypherExamples] =
    await Promise.all([
      getStats(),
      getPostList(resolvedViewerId),
      getSecondDegreeConnections(resolvedViewerId),
      getMutualConnections(resolvedViewerId, resolvedTargetId),
      getRecommendations(resolvedViewerId),
      getShortestPath(resolvedViewerId, resolvedTargetId),
      getCypherExamples(resolvedViewerId, resolvedTargetId)
    ]);

  return {
    viewerId: resolvedViewerId,
    targetId: resolvedTargetId,
    stats,
    users,
    posts,
    insights: {
      secondDegree,
      mutualConnections,
      recommendations,
      shortestPath,
      cypherExamples
    }
  };
}

export async function getNotifications(viewerId) {
  assertRequired(viewerId, "Bildirimler icin kullanici oturumu gerekli.");

  const [followersResult, likesResult, commentsResult, messagesResult, viewerResult, readResult] = await Promise.all([
    runRead(
      `
        MATCH (actor:User)-[rel:FOLLOWS]->(:User {id: $viewerId})
        RETURN {
          id: "follow-" + actor.id + "-" + coalesce(toString(rel.createdAt), ""),
          type: "follow",
          title: "Yeni takipci",
          body: actor.name + " sizi takip etmeye basladi.",
          createdAt: coalesce(rel.createdAt, actor.createdAt),
          unread: true,
          actor: actor {
            .id,
            .name,
            .headline,
            .color,
            .profileImageUrl
          }
        } AS notification
        ORDER BY notification.createdAt DESC
        LIMIT 8
      `,
      { viewerId }
    ),
    runRead(
      `
        MATCH (actor:User)-[rel:LIKED]->(post:Post)<-[:AUTHORED]-(:User {id: $viewerId})
        WHERE actor.id <> $viewerId
        RETURN {
          id: "like-" + actor.id + "-" + post.id,
          type: "like",
          title: "Yeni begeni",
          body: actor.name + " gonderinizi begendi.",
          createdAt: coalesce(rel.createdAt, post.createdAt),
          unread: true,
          postId: post.id,
          actor: actor {
            .id,
            .name,
            .headline,
            .color,
            .profileImageUrl
          }
        } AS notification
        ORDER BY notification.createdAt DESC
        LIMIT 8
      `,
      { viewerId }
    ),
    runRead(
      `
        MATCH (actor:User)-[:COMMENTED]->(comment:Comment)-[:ON_POST]->(post:Post)<-[:AUTHORED]-(:User {id: $viewerId})
        WHERE actor.id <> $viewerId
        RETURN {
          id: "comment-" + comment.id,
          type: "comment",
          title: "Yeni yorum",
          body: actor.name + " gonderinize yorum yazdi: " + comment.content,
          createdAt: comment.createdAt,
          unread: true,
          postId: post.id,
          actor: actor {
            .id,
            .name,
            .headline,
            .color,
            .profileImageUrl
          }
        } AS notification
        ORDER BY notification.createdAt DESC
        LIMIT 8
      `,
      { viewerId }
    ),
    runRead(
      `
        MATCH (actor:User)-[:SENT]->(message:Message)-[:TO]->(:User {id: $viewerId})
        WHERE message.seenAt IS NULL
        RETURN {
          id: "message-" + message.id,
          type: "message",
          title: "Yeni mesaj",
          body: actor.name + " size mesaj gonderdi: " + message.content,
          createdAt: message.createdAt,
          unread: true,
          actor: actor {
            .id,
            .name,
            .headline,
            .color,
            .profileImageUrl
          }
        } AS notification
        ORDER BY notification.createdAt DESC
        LIMIT 12
      `,
      { viewerId }
    ),
    runRead(
      `
        MATCH (viewer:User {id: $viewerId})
        RETURN viewer {
          .createdAt,
          .name
        } AS viewer
        LIMIT 1
      `,
      { viewerId }
    ),
    runRead(
      `
        MATCH (:User {id: $viewerId})-[:READ_NOTIFICATION]->(receipt:NotificationRead)
        RETURN collect({notificationId: receipt.notificationId, readAt: receipt.readAt}) AS receipts
      `,
      { viewerId }
    )
  ]);

  const viewer = viewerResult.records[0]?.get("viewer");
  const readReceipts = new Map(
    (readResult.records[0]?.get("receipts") ?? []).map((receipt) => [receipt.notificationId, receipt.readAt])
  );
  const welcomeNotification = viewer
    ? [
        {
          id: `welcome-${viewerId}`,
          type: "system",
          title: "Elite Circle hesabiniz hazir",
          body: `${viewer.name}, sosyal graph akisiniz ve bildirim merkeziniz kullanima acik.`,
          createdAt: viewer.createdAt,
          unread: false,
          actor: null
        }
      ]
    : [];
  const notifications = [
    ...followersResult.records.map((record) => record.get("notification")),
    ...likesResult.records.map((record) => record.get("notification")),
    ...commentsResult.records.map((record) => record.get("notification")),
    ...messagesResult.records.map((record) => record.get("notification")),
    ...welcomeNotification
  ];

  return notifications
    .filter((notification) => notification?.createdAt)
    .map((notification) => ({
      ...notification,
      unread: !readReceipts.has(notification.id) && notification.unread !== false,
      readAt: readReceipts.get(notification.id) ?? null
    }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 24);
}

export async function markNotificationRead(viewerId, notificationId) {
  assertRequired(viewerId, "Bildirim okuma durumu icin kullanici oturumu gerekli.");
  assertRequired(notificationId, "Bildirim secilmedi.");

  const notifications = await getNotifications(viewerId);
  const notification = notifications.find((item) => item.id === notificationId);

  if (!notification) {
    throw new AppError("Bildirim bulunamadi veya bu kullaniciya ait degil.", 404);
  }

  const readAt = new Date().toISOString();
  await runWrite(
    `
      MATCH (viewer:User {id: $viewerId})
      MERGE (receipt:NotificationRead {id: $receiptId})
      ON CREATE SET receipt.createdAt = $readAt
      SET receipt.notificationId = $notificationId,
          receipt.readAt = $readAt
      MERGE (viewer)-[:READ_NOTIFICATION]->(receipt)
    `,
    {
      viewerId,
      notificationId,
      receiptId: `${viewerId}:${notificationId}`,
      readAt
    }
  );

  return {
    ...notification,
    unread: false,
    readAt
  };
}

export async function markAllNotificationsRead(viewerId) {
  assertRequired(viewerId, "Bildirim okuma durumu icin kullanici oturumu gerekli.");

  const notifications = await getNotifications(viewerId);
  const unreadNotifications = notifications.filter((notification) => notification.unread);

  if (!unreadNotifications.length) {
    return notifications;
  }

  const readAt = new Date().toISOString();
  const receipts = unreadNotifications.map((notification) => ({
    notificationId: notification.id,
    receiptId: `${viewerId}:${notification.id}`
  }));

  await runWrite(
    `
      MATCH (viewer:User {id: $viewerId})
      UNWIND $receipts AS receiptData
      MERGE (receipt:NotificationRead {id: receiptData.receiptId})
      ON CREATE SET receipt.createdAt = $readAt
      SET receipt.notificationId = receiptData.notificationId,
          receipt.readAt = $readAt
      MERGE (viewer)-[:READ_NOTIFICATION]->(receipt)
    `,
    {
      viewerId,
      receipts,
      readAt
    }
  );

  return notifications.map((notification) => ({
    ...notification,
    unread: false,
    readAt: notification.readAt || readAt
  }));
}

export async function createUser(payload) {
  const name = normalizeText(payload.name);
  const headline = normalizeText(payload.headline);
  const bio = normalizeText(payload.bio);
  const city = normalizeText(payload.city);

  assertRequired(name, "Kullanici adi zorunludur.");
  assertRequired(headline, "Baslik zorunludur.");

  const user = {
    id: createId("user"),
    name,
    headline,
    bio: bio || "Yeni kullanici.",
    city: city || "Unknown",
    color: payload.color || "#0f766e",
    role: payload.role || "member",
    createdAt: new Date().toISOString()
  };

  await runWrite(
    `
      CREATE (user:User {
        id: $user.id,
        name: $user.name,
        headline: $user.headline,
        bio: $user.bio,
        city: $user.city,
        color: $user.color,
        role: $user.role,
        createdAt: $user.createdAt
      })
    `,
    { user }
  );

  return user;
}

export async function followUser(viewerId, targetId) {
  assertRequired(viewerId, "Takip eden kullanici secilmedi.");
  assertRequired(targetId, "Takip edilecek kullanici secilmedi.");

  if (viewerId === targetId) {
    throw new Error("Bir kullanici kendini takip edemez.");
  }

  const result = await runWrite(
    `
      MATCH (viewer:User {id: $viewerId})
      MATCH (target:User {id: $targetId})
      MERGE (viewer)-[rel:FOLLOWS]->(target)
      SET rel.createdAt = coalesce(rel.createdAt, $createdAt),
          rel.weight = 1
      RETURN rel
    `,
    {
      viewerId,
      targetId,
      createdAt: new Date().toISOString()
    }
  );

  if (!result.records.length) {
    throw new AppError("Takip edilecek kullanici bulunamadi.", 404);
  }
}

export async function unfollowUser(viewerId, targetId) {
  assertRequired(viewerId, "Takip eden kullanici secilmedi.");
  assertRequired(targetId, "Takipten cikilacak kullanici secilmedi.");

  const result = await runWrite(
    `
      MATCH (viewer:User {id: $viewerId})
      MATCH (target:User {id: $targetId})
      OPTIONAL MATCH (viewer)-[rel:FOLLOWS]->(target)
      WITH rel
      WHERE rel IS NOT NULL
      DELETE rel
      RETURN count(rel) AS deletedCount
    `,
    { viewerId, targetId }
  );

  if (!result.records.length || Number(result.records[0].get("deletedCount")) === 0) {
    throw new AppError("Takip iliskisi bulunamadi.", 404);
  }
}

export async function createPost(payload) {
  const authorId = normalizeText(payload.authorId);
  const content = escapeHtml(normalizeText(payload.content));

  assertRequired(authorId, "Paylasim yapacak kullanici secilmedi.");
  const media = await savePostMedia(payload.media);

  if (!content && !media) {
    throw new Error("Paylasim icin metin, fotograf veya video ekleyin.");
  }

  const post = {
    id: createId("post"),
    content,
    authorId,
    createdAt: new Date().toISOString(),
    mediaUrl: media?.url ?? null,
    mediaType: media?.type ?? null,
    mediaMime: media?.mime ?? null,
    mediaName: media?.name ?? null
  };

  try {
    const result = await runWrite(
      `
        MATCH (author:User {id: $authorId})
        CREATE (post:Post {
          id: $post.id,
          content: $post.content,
          createdAt: $post.createdAt
        })
        FOREACH (_ IN CASE WHEN $post.mediaUrl IS NULL THEN [] ELSE [1] END |
          SET post.mediaUrl = $post.mediaUrl,
              post.mediaType = $post.mediaType,
              post.mediaMime = $post.mediaMime,
              post.mediaName = $post.mediaName
        )
        CREATE (author)-[:AUTHORED]->(post)
        RETURN post.id AS postId
      `,
      { authorId, post }
    );

    if (!result.records.length) {
      throw new AppError("Paylasim yapacak kullanici bulunamadi.", 404);
    }
  } catch (error) {
    await removeSavedUpload(media);
    throw error;
  }

  return post;
}

export async function updatePost(userId, role, postId, payload) {
  assertRequired(userId, "Gonderiyi duzenleyecek kullanici secilmedi.");
  assertRequired(postId, "Duzenlenecek gonderi bulunamadi.");

  const existing = await getPostOwner(postId);
  assertPostPermission(existing, userId, role);

  const content = escapeHtml(normalizeText(payload.content));
  const media = await savePostMedia(payload.media);
  const removeMedia = Boolean(payload.removeMedia);
  const keepsExistingMedia = !media && !removeMedia && Boolean(existing.mediaUrl);

  if (!content && !media && !keepsExistingMedia) {
    await removeSavedUpload(media);
    throw new AppError("Gonderi icin metin, fotograf veya video kalmali.", 400);
  }

  const nextPost = {
    content,
    updatedAt: new Date().toISOString(),
    mediaUrl: media?.url ?? null,
    mediaType: media?.type ?? null,
    mediaMime: media?.mime ?? null,
    mediaName: media?.name ?? null
  };

  try {
    const result = await runWrite(
      `
        MATCH (author:User)-[:AUTHORED]->(post:Post {id: $postId})
        SET post.content = $post.content,
            post.updatedAt = $post.updatedAt
        FOREACH (_ IN CASE WHEN $setMedia THEN [1] ELSE [] END |
          SET post.mediaUrl = $post.mediaUrl,
              post.mediaType = $post.mediaType,
              post.mediaMime = $post.mediaMime,
              post.mediaName = $post.mediaName
        )
        FOREACH (_ IN CASE WHEN $clearMedia THEN [1] ELSE [] END |
          REMOVE post.mediaUrl
          REMOVE post.mediaType
          REMOVE post.mediaMime
          REMOVE post.mediaName
        )
        RETURN post {
          .*,
          authoredByViewer: author.id = $userId,
          author: author {
            .id,
            .name,
            .headline,
            .color,
            .profileImageUrl,
            .city
          }
        } AS post
      `,
      {
        userId,
        postId,
        post: nextPost,
        setMedia: Boolean(media),
        clearMedia: removeMedia && !media
      }
    );

    if (media || removeMedia) {
      await removeUploadByUrl(existing.mediaUrl);
    }

    return result.records[0]?.get("post") ?? null;
  } catch (error) {
    await removeSavedUpload(media);
    throw error;
  }
}

export async function deletePost(userId, role, postId) {
  assertRequired(userId, "Gonderiyi silecek kullanici secilmedi.");
  assertRequired(postId, "Silinecek gonderi bulunamadi.");

  const existing = await getPostOwner(postId);
  assertPostPermission(existing, userId, role);

  await runWrite(
    `
      MATCH (post:Post {id: $postId})
      OPTIONAL MATCH (comment:Comment)-[:ON_POST]->(post)
      WITH post, collect(comment) AS comments
      FOREACH (comment IN comments | DETACH DELETE comment)
      DETACH DELETE post
    `,
    { postId }
  );

  await removeUploadByUrl(existing.mediaUrl);
}

export async function likePost(userId, postId) {
  assertRequired(userId, "Begenecek kullanici secilmedi.");
  assertRequired(postId, "Begenilecek gonderi bulunamadi.");

  const result = await runWrite(
    `
      MATCH (user:User {id: $userId})
      MATCH (post:Post {id: $postId})
      MERGE (user)-[rel:LIKED]->(post)
      SET rel.createdAt = coalesce(rel.createdAt, $createdAt)
      RETURN rel
    `,
    {
      userId,
      postId,
      createdAt: new Date().toISOString()
    }
  );

  if (!result.records.length) {
    throw new AppError("Begenilecek gonderi bulunamadi.", 404);
  }
}

export async function unlikePost(userId, postId) {
  assertRequired(userId, "Begeni kaldiracak kullanici secilmedi.");
  assertRequired(postId, "Gonderi bulunamadi.");

  const result = await runWrite(
    `
      MATCH (user:User {id: $userId})
      MATCH (post:Post {id: $postId})
      OPTIONAL MATCH (user)-[rel:LIKED]->(post)
      WITH rel
      WHERE rel IS NOT NULL
      DELETE rel
      RETURN count(rel) AS deletedCount
    `,
    { userId, postId }
  );

  if (!result.records.length || Number(result.records[0].get("deletedCount")) === 0) {
    throw new AppError("Begeni bulunamadi.", 404);
  }
}

export async function createComment(payload) {
  const authorId = normalizeText(payload.authorId);
  const postId = normalizeText(payload.postId);
  const content = escapeHtml(normalizeText(payload.content));

  assertRequired(authorId, "Yorum yapacak kullanici secilmedi.");
  assertRequired(postId, "Yorum yapilacak gonderi bulunamadi.");
  assertRequired(content, "Yorum metni bos olamaz.");

  const comment = {
    id: createId("comment"),
    content,
    authorId,
    postId,
    createdAt: new Date().toISOString()
  };

  const result = await runWrite(
    `
      MATCH (author:User {id: $authorId})
      MATCH (post:Post {id: $postId})
      CREATE (comment:Comment {
        id: $comment.id,
        content: $comment.content,
        createdAt: $comment.createdAt
      })
      CREATE (author)-[:COMMENTED]->(comment)
      CREATE (comment)-[:ON_POST]->(post)
      RETURN comment {
        .*,
        author: author {
          .id,
          .name,
                  .headline,
                  .color,
                  .profileImageUrl
        },
        authoredByViewer: true
      } AS comment
    `,
    {
      authorId,
      postId,
      comment
    }
  );

  const created = result.records[0]?.get("comment");

  if (!created) {
    throw new AppError("Yorum yapilacak gonderi bulunamadi.", 404);
  }

  return created;
}

export async function deleteComment(userId, postId, commentId, role = "member") {
  assertRequired(userId, "Yorumu silecek kullanici secilmedi.");
  assertRequired(postId, "Yorumun ait oldugu gonderi bulunamadi.");
  assertRequired(commentId, "Silinecek yorum bulunamadi.");

  const result = await runRead(
    `
      MATCH (author:User)-[:COMMENTED]->(comment:Comment {id: $commentId})-[:ON_POST]->(:Post {id: $postId})
      RETURN author.id AS authorId
      LIMIT 1
    `,
    { postId, commentId }
  );
  const authorId = result.records[0]?.get("authorId");

  if (!authorId) {
    throw new AppError("Yorum bulunamadi.", 404);
  }

  if (authorId !== userId && role !== "admin") {
    throw new AppError("Bu yorumu silme yetkiniz yok.", 403);
  }

  await runWrite(
    `
      MATCH (comment:Comment {id: $commentId})-[:ON_POST]->(:Post {id: $postId})
      DETACH DELETE comment
    `,
    { postId, commentId }
  );
}

export async function getGroups() {
  const result = await runRead(
    `
      MATCH (group:Group)
      OPTIONAL MATCH (user:User)-[:MEMBER_OF]->(group)
      WITH group, count(DISTINCT user) AS memberCount, collect(DISTINCT user {.id, .name, .email, .color, .profileImageUrl}) AS members
      RETURN group {
        .id,
        .name,
        .description,
        .createdAt,
        memberCount: memberCount,
        members: members
      } AS group
      ORDER BY group.name
    `
  );

  return result.records.map((record) => record.get("group"));
}
