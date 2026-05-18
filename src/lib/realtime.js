const clientsByUser = new Map();

function getUserClients(userId) {
  if (!clientsByUser.has(userId)) {
    clientsByUser.set(userId, new Set());
  }

  return clientsByUser.get(userId);
}

function writeEvent(res, event, payload) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

export function attachRealtimeClient(userId, res) {
  const clients = getUserClients(userId);
  clients.add(res);

  writeEvent(res, "ready", {
    onlineUserIds: listOnlineUserIds()
  });

  broadcastPresence();

  return () => {
    const userClients = clientsByUser.get(userId);
    userClients?.delete(res);

    if (userClients?.size === 0) {
      clientsByUser.delete(userId);
      broadcastPresence();
    }
  };
}

export function emitToUser(userId, event, payload = {}) {
  const clients = clientsByUser.get(userId);

  if (!clients?.size) {
    return;
  }

  for (const client of clients) {
    writeEvent(client, event, payload);
  }
}

export function emitToUsers(userIds, event, payload = {}) {
  [...new Set(userIds.filter(Boolean))].forEach((userId) => {
    emitToUser(userId, event, payload);
  });
}

export function isUserOnline(userId) {
  return Boolean(clientsByUser.get(userId)?.size);
}

export function listOnlineUserIds() {
  return [...clientsByUser.keys()];
}

export function broadcastPresence() {
  const onlineUserIds = listOnlineUserIds();

  for (const [userId] of clientsByUser) {
    emitToUser(userId, "presence:update", { onlineUserIds });
  }
}
