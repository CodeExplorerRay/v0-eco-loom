export function parseReviewerIds(value?: string | null) {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  } catch {
    return [];
  }
}

export function buildReviewerSnapshot(
  users: Array<{ id: string; name: string; email: string }>
) {
  return {
    reviewerIds: users.map((user) => user.id),
    reviewerNames: users.map((user) => user.name),
    recipientEmails: users.map((user) => user.email),
  };
}
