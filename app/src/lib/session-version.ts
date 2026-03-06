type SessionVersionToken = {
  id?: string;
  nickname?: string | null;
  sessionVersion?: number;
  sessionInvalidated?: boolean;
};

type SessionVersionUser = {
  id: string;
  nickname?: string | null;
  sessionVersion?: number | null;
};

type CurrentSessionVersionState = {
  sessionVersion: number;
  nickname?: string | null;
};

export function applyUserSessionStateToToken<
  TToken extends SessionVersionToken,
  TUser extends SessionVersionUser,
>(token: TToken, user: TUser) {
  token.id = user.id;
  token.nickname = user.nickname ?? null;
  if (typeof user.sessionVersion === "number") {
    token.sessionVersion = user.sessionVersion;
  }
  delete token.sessionInvalidated;
  return token;
}

export function syncSessionVersionToken<TToken extends SessionVersionToken>(
  token: TToken,
  currentState: CurrentSessionVersionState | null,
) {
  if (!currentState) {
    token.id = undefined;
    token.nickname = null;
    token.sessionInvalidated = true;
    return token;
  }

  const currentVersion = currentState.sessionVersion;
  const tokenVersion =
    typeof token.sessionVersion === "number" ? token.sessionVersion : null;

  token.nickname = currentState.nickname ?? token.nickname ?? null;
  token.sessionVersion = currentVersion;

  if (tokenVersion === null) {
    if (currentVersion > 0) {
      token.id = undefined;
      token.nickname = null;
      token.sessionInvalidated = true;
      return token;
    }
    delete token.sessionInvalidated;
    return token;
  }

  if (tokenVersion !== currentVersion) {
    token.id = undefined;
    token.nickname = null;
    token.sessionInvalidated = true;
    return token;
  }

  delete token.sessionInvalidated;
  return token;
}
