import { getSession } from "./neo4j.js";

function normalizeParams(params = {}) {
  return Object.fromEntries(Object.entries(params).map(([key, value]) => [key, value === undefined ? null : value]));
}

export async function runRead(query, params = {}) {
  const session = getSession();

  try {
    return await session.executeRead((tx) => tx.run(query, normalizeParams(params)));
  } finally {
    await session.close();
  }
}

export async function runWrite(query, params = {}) {
  const session = getSession();

  try {
    return await session.executeWrite((tx) => tx.run(query, normalizeParams(params)));
  } finally {
    await session.close();
  }
}
