import crypto from "node:crypto";
import { appConfig } from "../config.js";
import { hashPassword } from "../lib/security.js";
import { getSession } from "./neo4j.js";

const constraints = [
  "CREATE CONSTRAINT user_id IF NOT EXISTS FOR (user:User) REQUIRE user.id IS UNIQUE",
  "CREATE CONSTRAINT user_email IF NOT EXISTS FOR (user:User) REQUIRE user.email IS UNIQUE",
  "CREATE CONSTRAINT post_id IF NOT EXISTS FOR (post:Post) REQUIRE post.id IS UNIQUE",
  "CREATE CONSTRAINT comment_id IF NOT EXISTS FOR (comment:Comment) REQUIRE comment.id IS UNIQUE",
  "CREATE CONSTRAINT message_id IF NOT EXISTS FOR (message:Message) REQUIRE message.id IS UNIQUE",
  "CREATE CONSTRAINT session_id IF NOT EXISTS FOR (session:Session) REQUIRE session.id IS UNIQUE",
  "CREATE CONSTRAINT session_token_hash IF NOT EXISTS FOR (session:Session) REQUIRE session.tokenHash IS UNIQUE",
  "CREATE CONSTRAINT notification_read_id IF NOT EXISTS FOR (receipt:NotificationRead) REQUIRE receipt.id IS UNIQUE",
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
    id: "user-selin",
    name: "Selin Aktas",
    email: "selin@graphlink.local",
    headline: "Cybersecurity Analyst",
    bio: "Identity, access, and secure collaboration for high-trust teams.",
    city: "Istanbul",
    color: "#dc2626",
    role: "member"
  },
  {
    id: "user-mert",
    name: "Mert Ozkan",
    email: "mert@graphlink.local",
    headline: "Growth Strategist",
    bio: "Building community loops with clean metrics and sharp experiments.",
    city: "Konya",
    color: "#2563eb",
    role: "member"
  },
  {
    id: "user-deniz",
    name: "Deniz Sari",
    email: "deniz@graphlink.local",
    headline: "Cloud Architect",
    bio: "Reliable infrastructure, observability, and deployment discipline.",
    city: "Trabzon",
    color: "#0891b2",
    role: "member"
  },
  {
    id: "user-lara",
    name: "Lara Koc",
    email: "lara@graphlink.local",
    headline: "UX Researcher",
    bio: "Turning user signals into product decisions people can feel.",
    city: "Mugla",
    color: "#c026d3",
    role: "member"
  },
  {
    id: "user-can",
    name: "Can Eren",
    email: "can@graphlink.local",
    headline: "Mobile Engineer",
    bio: "Fast, polished mobile experiences with real-time product moments.",
    city: "Samsun",
    color: "#16a34a",
    role: "member"
  },
  {
    id: "user-irem",
    name: "Irem Gunes",
    email: "irem@graphlink.local",
    headline: "Content Lead",
    bio: "Premium community storytelling, launches, and product narratives.",
    city: "Gaziantep",
    color: "#ea580c",
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
  },
  {
    id: "post-security",
    authorId: "user-selin",
    content: "Bildirim ve mesaj akisini test ederken session guvenligini de izledim. HttpOnly cookie, rate limit ve server-side yetki kontrolu birlikte guzel duruyor.",
    createdAt: "2026-04-21T10:10:00.000Z"
  },
  {
    id: "post-home-refresh",
    authorId: "user-lara",
    content: "Home sayfasinda daha temiz bir ilk bakis gerekiyor: kimin aktif oldugu, hangi gonderinin one ciktigi ve toplulugun ritmi hemen anlasilmali.",
    createdAt: "2026-04-21T10:32:00.000Z"
  },
  {
    id: "post-realtime-chat",
    authorId: "user-can",
    content: "Mesajlasma tarafinda real-time akisi denedim. Konusma acikken gelen mesajlar aninda gorunuyor, okunma durumu da UI'da net.",
    createdAt: "2026-04-21T10:48:00.000Z"
  },
  {
    id: "post-cloud-runtime",
    authorId: "user-deniz",
    content: "Local Neo4j runtime ve Express API ayni anda ayaga kalkinca demo akisi cok daha hizli test ediliyor. Monitoring paneli burada iyi bir kontrol noktasi.",
    createdAt: "2026-04-21T11:04:00.000Z"
  },
  {
    id: "post-community-growth",
    authorId: "user-mert",
    content: "Elite Circle icin growth tarafinda en kritik sinyal tekrar eden etkilesim: takip, mesaj, yorum ve bildirim ayni dongude birbirini besliyor.",
    createdAt: "2026-04-21T11:24:00.000Z"
  },
  {
    id: "post-content-system",
    authorId: "user-irem",
    content: "Yeni kullanicilar icin Home akisi ilk guven sinyali. Daha dolu gonderiler ve net profil kartlari platformu canli hissettiriyor.",
    createdAt: "2026-04-21T11:42:00.000Z"
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
  ["user-selin", "user-emir"],
  ["user-selin", "user-deniz"],
  ["user-mert", "user-irem"],
  ["user-mert", "user-lara"],
  ["user-deniz", "user-kerem"],
  ["user-deniz", "user-selin"],
  ["user-lara", "user-baris"],
  ["user-lara", "user-can"],
  ["user-can", "user-aleyna"],
  ["user-can", "user-lara"],
  ["user-irem", "user-mert"],
  ["user-irem", "user-zeynep"],
  ["user-kerem", "user-baris"],
  ["user-kerem", "user-defne"],
  ["user-kerem", "user-deniz"]
];

const demoLikes = [
  ["user-emir", "post-neo4j-launch"],
  ["user-zeynep", "post-neo4j-launch"],
  ["user-kerem", "post-recommendations"],
  ["user-defne", "post-recommendations"],
  ["user-aleyna", "post-cypher"],
  ["user-baris", "post-cypher"],
  ["user-defne", "post-network"],
  ["user-kerem", "post-network"],
  ["user-emir", "post-security"],
  ["user-deniz", "post-security"],
  ["user-baris", "post-home-refresh"],
  ["user-irem", "post-home-refresh"],
  ["user-aleyna", "post-realtime-chat"],
  ["user-lara", "post-realtime-chat"],
  ["user-kerem", "post-cloud-runtime"],
  ["user-selin", "post-cloud-runtime"],
  ["user-zeynep", "post-community-growth"],
  ["user-can", "post-community-growth"],
  ["user-mert", "post-content-system"],
  ["user-defne", "post-content-system"]
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
  },
  {
    id: "comment-security-note",
    authorId: "user-deniz",
    postId: "post-security",
    content: "Backend event akisi guzel; yetki kontrolu server tarafinda kalinca UI daha sade tutulabiliyor.",
    createdAt: "2026-04-21T10:22:00.000Z"
  },
  {
    id: "comment-home-note",
    authorId: "user-baris",
    postId: "post-home-refresh",
    content: "Home icin spotlight alanini daha premium gostermek iyi olur.",
    createdAt: "2026-04-21T10:39:00.000Z"
  },
  {
    id: "comment-chat-note",
    authorId: "user-emir",
    postId: "post-realtime-chat",
    content: "SSE bu proje icin yeterince hafif ve dogru secim.",
    createdAt: "2026-04-21T10:58:00.000Z"
  },
  {
    id: "comment-growth-note",
    authorId: "user-lara",
    postId: "post-community-growth",
    content: "Kullanici davranisi Home'da daha net gorunurse yeni gelenler daha hizli adapte olur.",
    createdAt: "2026-04-21T11:31:00.000Z"
  }
];

const demoMessages = [
  {
    id: "message-aleyna-emir-1",
    from: "user-aleyna",
    to: "user-emir",
    content: "API dokumantasyonundaki auth akisini kontrol ettim. Mesajlar panelini de ayni netlikte tutalim.",
    createdAt: "2026-04-21T10:15:00.000Z",
    seenAt: "2026-04-21T10:18:00.000Z"
  },
  {
    id: "message-emir-aleyna-1",
    from: "user-emir",
    to: "user-aleyna",
    content: "Tamam, read receipt ve bildirim sync tarafini backend eventleriyle baglayacagim.",
    createdAt: "2026-04-21T10:19:00.000Z",
    seenAt: null
  },
  {
    id: "message-zeynep-kerem-1",
    from: "user-zeynep",
    to: "user-kerem",
    content: "PageRank liderlerini mesaj bildirimleriyle beraber test edebiliriz.",
    createdAt: "2026-04-21T10:28:00.000Z",
    seenAt: "2026-04-21T10:30:00.000Z"
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
    comments: demoComments,
    messages: demoMessages
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
        UNWIND $posts AS post
        MATCH (author:User {id: post.authorId})
        MERGE (current:Post {id: post.id})
        ON CREATE SET current.content = post.content,
                      current.createdAt = post.createdAt
        SET current.content = coalesce(current.content, post.content),
            current.createdAt = coalesce(current.createdAt, post.createdAt)
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
        SET rel.createdAt = coalesce(rel.createdAt, follow.createdAt),
            rel.weight = coalesce(rel.weight, 1)
      `,
      { follows: payload.follows }
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
        UNWIND $likes AS like
        MATCH (user:User {id: like.userId})
        MATCH (post:Post {id: like.postId})
        MERGE (user)-[rel:LIKED]->(post)
        SET rel.createdAt = coalesce(rel.createdAt, like.createdAt)
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
        UNWIND $messages AS message
        MATCH (sender:User {id: message.from})
        MATCH (recipient:User {id: message.to})
        MERGE (current:Message {id: message.id})
        SET current.content = coalesce(current.content, message.content),
            current.createdAt = coalesce(current.createdAt, message.createdAt),
            current.seenAt = coalesce(current.seenAt, message.seenAt)
        MERGE (sender)-[:SENT]->(current)
        MERGE (current)-[:TO]->(recipient)
      `,
      { messages: payload.messages }
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
        WHERE user.id IN [
          "user-aleyna", "user-emir", "user-zeynep", "user-baris", "user-defne", "user-selin",
          "user-mert", "user-deniz", "user-lara", "user-can", "user-irem", "user-kerem"
        ]
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
          UNWIND $messages AS message
          MATCH (sender:User {id: message.from})
          MATCH (recipient:User {id: message.to})
          MERGE (current:Message {id: message.id})
          SET current.content = message.content,
              current.createdAt = message.createdAt,
              current.seenAt = message.seenAt
          MERGE (sender)-[:SENT]->(current)
          MERGE (current)-[:TO]->(recipient)
        `,
        { messages: payload.messages }
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
          WHERE user.id IN [
            "user-aleyna", "user-emir", "user-zeynep", "user-baris", "user-defne", "user-selin",
            "user-mert", "user-deniz", "user-lara", "user-can", "user-irem", "user-kerem"
          ]
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
