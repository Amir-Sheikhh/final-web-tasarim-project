import { getSession } from "../db/neo4j.js";
import { runRead, runWrite } from "../db/query.js";
import { getShortestPath } from "./socialService.js";

async function listProcedureNames() {
  const session = getSession();

  try {
    const result = await session.run("SHOW PROCEDURES YIELD name");
    return result.records.map((record) => record.get("name"));
  } catch (_error) {
    return [];
  } finally {
    await session.close();
  }
}

async function hasProcedurePrefix(prefix) {
  const names = await listProcedureNames();
  return names.some((name) => name.startsWith(prefix));
}

async function createProjectedGraph() {
  const gdsAvailable = await hasProcedurePrefix("gds.");

  if (!gdsAvailable) {
    return null;
  }

  const graphName = `graphlink-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

  try {
    await runWrite(
      `
        CALL gds.graph.project(
          $graphName,
          "User",
          {
            FOLLOWS: {
              orientation: "UNDIRECTED",
              properties: "weight"
            }
          }
        )
        YIELD graphName
        RETURN graphName
      `,
      { graphName }
    );

    return graphName;
  } catch (_error) {
    return null;
  }
}

async function dropProjectedGraph(graphName) {
  if (!graphName) {
    return;
  }

  try {
    await runWrite(
      `
        CALL gds.graph.drop($graphName, false)
        YIELD graphName
        RETURN graphName
      `,
      { graphName }
    );
  } catch (_error) {
    // Projection cleanup should not break the UI.
  }
}

async function withProjectedGraph(task) {
  const graphName = await createProjectedGraph();

  if (!graphName) {
    return null;
  }

  try {
    return await task(graphName);
  } catch (_error) {
    return null;
  } finally {
    await dropProjectedGraph(graphName);
  }
}

async function getProcedureVersion(expression) {
  try {
    const result = await runRead(`RETURN ${expression} AS version`);
    return result.records[0]?.get("version") ?? "installed";
  } catch (_error) {
    return "installed";
  }
}

export async function getGraphRuntimeStatus() {
  const [gdsAvailable, apocAvailable] = await Promise.all([
    hasProcedurePrefix("gds."),
    hasProcedurePrefix("apoc.")
  ]);

  return {
    gdsAvailable,
    gdsVersion: gdsAvailable ? await getProcedureVersion("gds.version()") : null,
    apocAvailable,
    apocVersion: apocAvailable ? await getProcedureVersion("apoc.version()") : null
  };
}

export async function getGraphNetwork(viewerId) {
  const usersResult = await runRead(
    `
      MATCH (viewer:User {id: $viewerId})
      OPTIONAL MATCH (viewer)-[:FOLLOWS*0..2]-(user:User)
      WITH viewer, collect(DISTINCT user) + viewer AS rawUsers
      UNWIND rawUsers AS user
      WITH collect(DISTINCT user) AS users
      RETURN [user IN users WHERE user IS NOT NULL |
        {
          data: {
            id: user.id,
            label: user.name,
            type: "User",
            headline: user.headline,
            color: user.color,
            isViewer: user.id = $viewerId
          }
        }
      ] AS nodes,
      [user IN users WHERE user IS NOT NULL | user.id] AS userIds
    `,
    { viewerId }
  );

  const record = usersResult.records[0];
  const nodes = record?.get("nodes") ?? [];
  const userIds = record?.get("userIds") ?? [];

  if (!userIds.length) {
    return {
      nodes: [],
      edges: []
    };
  }

  const postsResult = await runRead(
    `
      MATCH (author:User)-[:AUTHORED]->(post:Post)
      WHERE author.id IN $userIds
      RETURN collect(
        DISTINCT {
          data: {
            id: post.id,
            label: "Post",
            type: "Post",
            headline: left(post.content, 80),
            color: "#f59e0b",
            isViewer: false
          }
        }
      ) AS postNodes
    `,
    { userIds }
  );

  const followEdgesResult = await runRead(
    `
      MATCH (source:User)-[:FOLLOWS]->(target:User)
      WHERE source.id IN $userIds AND target.id IN $userIds
      RETURN collect(
        DISTINCT {
          data: {
            id: "follow-" + source.id + "-" + target.id,
            source: source.id,
            target: target.id,
            label: "FOLLOWS",
            type: "FOLLOWS"
          }
        }
      ) AS edges
    `,
    { userIds }
  );

  const authoredEdgesResult = await runRead(
    `
      MATCH (author:User)-[:AUTHORED]->(post:Post)
      WHERE author.id IN $userIds
      RETURN collect(
        DISTINCT {
          data: {
            id: "authored-" + author.id + "-" + post.id,
            source: author.id,
            target: post.id,
            label: "AUTHORED",
            type: "AUTHORED"
          }
        }
      ) AS edges
    `,
    { userIds }
  );

  const likedEdgesResult = await runRead(
    `
      MATCH (user:User)-[:LIKED]->(post:Post)<-[:AUTHORED]-(author:User)
      WHERE user.id IN $userIds AND author.id IN $userIds
      RETURN collect(
        DISTINCT {
          data: {
            id: "liked-" + user.id + "-" + post.id,
            source: user.id,
            target: post.id,
            label: "LIKED",
            type: "LIKED"
          }
        }
      ) AS edges
    `,
    { userIds }
  );

  return {
    nodes: [...nodes, ...(postsResult.records[0]?.get("postNodes") ?? [])],
    edges: [
      ...(followEdgesResult.records[0]?.get("edges") ?? []),
      ...(authoredEdgesResult.records[0]?.get("edges") ?? []),
      ...(likedEdgesResult.records[0]?.get("edges") ?? [])
    ]
  };
}

export async function getCommunities() {
  const result = await withProjectedGraph(async (graphName) =>
    runRead(
      `
        CALL gds.louvain.stream($graphName)
        YIELD nodeId, communityId
        WITH communityId, gds.util.asNode(nodeId) AS member
        WITH communityId, collect(member {
          .id,
          .name,
          .headline,
          .color
        }) AS members
        RETURN {
          communityId: communityId,
          size: size(members),
          members: members[0..6]
        } AS community
        ORDER BY community.size DESC, community.communityId
        LIMIT 6
      `,
      { graphName }
    )
  );

  if (!result) {
    return [];
  }

  return result.records.map((record) => record.get("community"));
}

export async function getPageRankLeaders() {
  const result = await withProjectedGraph(async (graphName) =>
    runRead(
      `
        CALL gds.pageRank.stream($graphName)
        YIELD nodeId, score
        WITH gds.util.asNode(nodeId) AS userNode, score
        RETURN {
          user: userNode {
            .id,
            .name,
            .headline,
            .color
          },
          score: round(score * 1000) / 1000
        } AS rank
        ORDER BY rank.score DESC
        LIMIT 8
      `,
      { graphName }
    )
  );

  if (!result) {
    return [];
  }

  return result.records.map((record) => record.get("rank"));
}

export async function getEmbeddingPreview() {
  const result = await withProjectedGraph(async (graphName) =>
    runRead(
      `
        CALL gds.fastRP.stream($graphName, {
          embeddingDimension: 8,
          randomSeed: 42
        })
        YIELD nodeId, embedding
        WITH gds.util.asNode(nodeId) AS userNode, embedding
        RETURN {
          user: userNode {
            .id,
            .name,
            .headline,
            .color
          },
          embedding: embedding[0..4]
        } AS item
        ORDER BY item.user.name
        LIMIT 8
      `,
      { graphName }
    )
  );

  if (!result) {
    return [];
  }

  return result.records.map((record) => record.get("item"));
}

export async function getDijkstraPath(viewerId, targetId) {
  if (!targetId) {
    return getShortestPath(viewerId, targetId);
  }

  const result = await withProjectedGraph(async (graphName) =>
    runRead(
      `
        MATCH (source:User {id: $viewerId}), (target:User {id: $targetId})
        CALL gds.shortestPath.dijkstra.stream($graphName, {
          sourceNode: source,
          targetNode: target,
          relationshipWeightProperty: "weight"
        })
        YIELD totalCost, nodeIds
        WITH totalCost, [nodeId IN nodeIds | gds.util.asNode(nodeId)] AS dbNodes
        RETURN {
          nodes: [node IN dbNodes | node { .id, .name }],
          hops: totalCost
        } AS path
        LIMIT 1
      `,
      { graphName, viewerId, targetId }
    )
  );

  if (!result || !result.records.length) {
    return getShortestPath(viewerId, targetId);
  }

  return result.records[0].get("path");
}
