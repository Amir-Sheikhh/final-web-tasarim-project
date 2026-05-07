import crypto from "node:crypto";
import { appConfig } from "../config.js";
import { hashPassword } from "../lib/security.js";
import { getSession } from "./neo4j.js";

const constraints = [
  "CREATE CONSTRAINT user_id IF NOT EXISTS FOR (user:User) REQUIRE user.id IS UNIQUE",
  "CREATE CONSTRAINT user_email IF NOT EXISTS FOR (user:User) REQUIRE user.email IS UNIQUE",
  "CREATE CONSTRAINT post_id IF NOT EXISTS FOR (post:Post) REQUIRE post.id IS UNIQUE",
  "CREATE CONSTRAINT comment_id IF NOT EXISTS FOR (comment:Comment) REQUIRE comment.id IS UNIQUE",
  "CREATE CONSTRAINT session_id IF NOT EXISTS FOR (session:Session) REQUIRE session.id IS UNIQUE",
  "CREATE CONSTRAINT session_token_hash IF NOT EXISTS FOR (session:Session) REQUIRE session.tokenHash IS UNIQUE",
  "CREATE CONSTRAINT group_id IF NOT EXISTS FOR (group:Group) REQUIRE group.id IS UNIQUE"
];

const demoUsers = [
  {
    id: "user-aleyna",
    name: "Aleyna Demir",
    email: "aleyna@graphlink.local",
    headline: "Frontend Developer",
    bio: "Interfaces that feel light, fast, and clear.",
    city: "Istanbul",
    color: "#0f766e",
    role: "member"
  },
  {
    id: "user-emir",
    name: "Emir Kaya",
    email: "emir@graphlink.local",
    headline: "Backend Engineer",
    bio: "APIs, events, and data models for products that scale.",
    city: "Ankara",
    color: "#b45309",
    role: "member"
  },
  {
    id: "user-zeynep",
    name: "Zeynep Arslan",
    email: "zeynep@graphlink.local",
    headline: "Data Analyst",
    bio: "Graphs, insights, and recommendation logic.",
    city: "Izmir",
    color: "#1d4ed8",
    role: "member"
  },
  {
    id: "user-baris",
    name: "Baris Sen",
    email: "baris@graphlink.local",
    headline: "Product Designer",
    bio: "Human-centered product flows with strong visual systems.",
    city: "Bursa",
    color: "#be123c",
    role: "member"
  },
  {
    id: "user-defne",
    name: "Defne Yildiz",
    email: "defne@graphlink.local",
    headline: "Fraud Detection Specialist",
    bio: "Turning relationship data into actionable risk signals.",
    city: "Antalya",
    color: "#7c3aed",
    role: "member"
  },
  {
    id: "user-kerem",
    name: "Kerem Aydin",
    email: "kerem@graphlink.local",
    headline: "AI Engineer",
    bio: "Recommendations, embeddings, and graph-aware tooling.",
    city: "Eskisehir",
    color: "#0f172a",
    role: "admin"
  }
];

const demoPosts = [
  {
    id: "post-neo4j-launch",
    authorId: "user-aleyna",
    content: "GraphLink arayuzunu tamamladim. Kullanici kartlari artik dogrudan graph sorgulari ile senkron calisiyor.",
    createdAt: "2026-04-21T08:00:00.000Z"
  },
  {
    id: "post-recommendations",
    authorId: "user-kerem",
    content: "Ortak baglantilar ve benzer begeniler uzerinden hibrit tavsiye akisini test ettim. Sonuclar gayet tutarli.",
    createdAt: "2026-04-21T08:35:00.000Z"
  },
  {
    id: "post-cypher",
    authorId: "user-emir",
    content: "Cypher ile shortest path sorgusu tek queryde okunabilir kaliyor. Bu kisim iliskisel modele gore cok daha dogal.",
    createdAt: "2026-04-21T09:05:00.000Z"
  },
  {
    id: "post-network",
    authorId: "user-zeynep",
    content: "2. derece baglantilar paneli artik hangi kisi uzerinden gelindigini de gosteriyor.",
    createdAt: "2026-04-21T09:20:00.000Z"
  }
];

const demoFollows = [
  ["user-aleyna", "user-emir"],
  ["user-aleyna", "user-zeynep"],
  ["user-emir", "user-zeynep"],
  ["user-emir", "user-kerem"],
  ["user-zeynep", "user-defne"],
  ["user-zeynep", "user-kerem"],
  ["user-baris", "user-aleyna"],
  ["user-baris", "user-emir"],
  ["user-defne", "user-kerem"],
  ["user-defne", "user-aleyna"],
  ["user-kerem", "user-baris"],
  ["user-kerem", "user-defne"]
];

const demoLikes = [
  ["user-emir", "post-neo4j-launch"],
  ["user-zeynep", "post-neo4j-launch"],
  ["user-kerem", "post-recommendations"],
  ["user-defne", "post-recommendations"],
  ["user-aleyna", "post-cypher"],
  ["user-baris", "post-cypher"],
  ["user-defne", "post-network"],
  ["user-kerem", "post-network"]
];

const demoComments = [
  {
    id: "comment-a11y-note",
    authorId: "user-baris",
    postId: "post-neo4j-launch",
    content: "Kart akisi mobilde de net gorunuyor, renk kontrastini da korumusuz.",
    createdAt: "2026-04-21T09:45:00.000Z"
  },
  {
    id: "comment-ranking-note",
    authorId: "user-zeynep",
    postId: "post-recommendations",
    content: "Mutual skorunu agirliklandirmak tavsiye listesini daha okunur hale getirdi.",
    createdAt: "2026-04-21T09:52:00.000Z"
  },
  {
    id: "comment-cypher-note",
    authorId: "user-kerem",
    postId: "post-cypher",
    content: "Bu sorguyu Dijkstra fallback ile yan yana gostermek rapor icin iyi kanit olur.",
    createdAt: "2026-04-21T10:04:00.000Z"
  }
];

export function getDemoAccounts() {
  return demoUsers.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  }));
}

async function buildDemoPayload() {
  const passwordHash = await hashPassword(appConfig.demoPassword);

  return {
    users: demoUsers.map((user) => ({
      ...user,
      passwordHash,
      createdAt: "2026-04-20T12:00:00.000Z"
    })),
    posts: demoPosts,
    follows: demoFollows.map(([from, to]) => ({
      from,
      to,
      createdAt: "2026-04-21T07:30:00.000Z"
    })),
    likes: demoLikes.map(([userId, postId]) => ({
      userId,
      postId,
      createdAt: "2026-04-21T09:30:00.000Z"
    })),
    comments: demoComments
  };
}

async function backfillDemoGraph(session, payload) {
  await session.executeWrite((tx) =>
    tx.run(
      `
        UNWIND $users AS user
        MATCH (current:User {id: user.id})
        SET current.email = coalesce(current.email, user.email),
            current.passwordHash = coalesce(current.passwordHash, user.passwordHash),
            current.role = coalesce(current.role, user.role),
            current.color = coalesce(current.color, user.color),
            current.city = coalesce(current.city, user.city),
            current.bio = coalesce(current.bio, user.bio),
            current.headline = coalesce(current.headline, user.headline),
            current.createdAt = coalesce(current.createdAt, user.createdAt)
      `,
      { users: payload.users }
    )
  );

  await session.executeWrite((tx) =>
    tx.run(
      `
        MATCH (:User)-[rel:FOLLOWS]->(:User)
        SET rel.weight = coalesce(rel.weight, 1)
      `
    )
  );

  await session.executeWrite((tx) =>
    tx.run(
      `
        UNWIND $comments AS comment
        MATCH (author:User {id: comment.authorId})
        MATCH (post:Post {id: comment.postId})
        MERGE (current:Comment {id: comment.id})
        SET current.content = coalesce(current.content, comment.content),
            current.createdAt = coalesce(current.createdAt, comment.createdAt)
        MERGE (author)-[:COMMENTED]->(current)
        MERGE (current)-[:ON_POST]->(post)
      `,
      { comments: payload.comments }
    )
  );

  await session.executeWrite((tx) =>
    tx.run(
      `
        MERGE (group:Group {id: "group-demo-accounts"})
        SET group.name = "demo account",
            group.description = "Demo accounts for testing",
            group.createdAt = coalesce(group.createdAt, "2026-04-20T12:00:00.000Z")
        WITH group
        MATCH (user:User)
        WHERE user.id IN ["user-aleyna", "user-emir", "user-zeynep", "user-baris", "user-defne", "user-kerem"]
        MERGE (user)-[:MEMBER_OF]->(group)
      `
    )
  );
}

export async function initializeGraph({ autoSeed = true } = {}) {
  const session = getSession();

  try {
    for (const query of constraints) {
      await session.run(query);
    }

    if (!autoSeed) {
      return;
    }

    const existing = await session.run("MATCH (user:User) RETURN count(user) AS count");
    const count = existing.records[0]?.get("count") ?? 0;

    if (count === 0) {
      await seedDemoGraph();
      return;
    }

    await backfillDemoGraph(session, await buildDemoPayload());
  } finally {
    await session.close();
  }
}

export async function seedDemoGraph({ reset = false } = {}) {
  const session = getSession();
  const payload = await buildDemoPayload();

  try {
    if (reset) {
      await session.run("MATCH (node) DETACH DELETE node");

      for (const query of constraints) {
        await session.run(query);
      }
    }

    await session.executeWrite((tx) =>
      tx.run(
        `
          UNWIND $users AS user
          MERGE (current:User {id: user.id})
          SET current.name = user.name,
              current.email = user.email,
              current.passwordHash = user.passwordHash,
              current.role = user.role,
              current.headline = user.headline,
              current.bio = user.bio,
              current.city = user.city,
              current.color = user.color,
              current.createdAt = user.createdAt
        `,
        { users: payload.users }
      )
    );

    await session.executeWrite((tx) =>
      tx.run(
        `
          UNWIND $posts AS post
          MATCH (author:User {id: post.authorId})
          MERGE (current:Post {id: post.id})
          SET current.content = post.content,
              current.createdAt = post.createdAt
          MERGE (author)-[:AUTHORED]->(current)
        `,
        { posts: payload.posts }
      )
    );

    await session.executeWrite((tx) =>
      tx.run(
        `
          UNWIND $follows AS follow
          MATCH (from:User {id: follow.from})
          MATCH (to:User {id: follow.to})
          MERGE (from)-[rel:FOLLOWS]->(to)
          SET rel.createdAt = follow.createdAt,
              rel.weight = 1
        `,
        { follows: payload.follows }
      )
    );

    await session.executeWrite((tx) =>
      tx.run(
        `
          UNWIND $likes AS like
          MATCH (user:User {id: like.userId})
          MATCH (post:Post {id: like.postId})
          MERGE (user)-[rel:LIKED]->(post)
          SET rel.createdAt = like.createdAt
        `,
        { likes: payload.likes }
      )
    );

    await session.executeWrite((tx) =>
      tx.run(
        `
          UNWIND $comments AS comment
          MATCH (author:User {id: comment.authorId})
          MATCH (post:Post {id: comment.postId})
          MERGE (current:Comment {id: comment.id})
          SET current.content = comment.content,
              current.createdAt = comment.createdAt
          MERGE (author)-[:COMMENTED]->(current)
          MERGE (current)-[:ON_POST]->(post)
        `,
        { comments: payload.comments }
      )
    );

    await session.executeWrite((tx) =>
      tx.run(
        `
          MERGE (group:Group {id: "group-demo-accounts"})
          SET group.name = "demo account",
              group.description = "Demo accounts for testing",
              group.createdAt = "2026-04-20T12:00:00.000Z"
          WITH group
          MATCH (user:User)
          WHERE user.id IN ["user-aleyna", "user-emir", "user-zeynep", "user-baris", "user-defne", "user-kerem"]
          MERGE (user)-[:MEMBER_OF]->(group)
        `
      )
    );
  } finally {
    await session.close();
  }
}

export function createId(prefix) {
  return `${prefix}-${crypto.randomUUID()}`;
}
