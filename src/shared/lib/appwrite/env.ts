export const appwriteEndpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
export const appwriteProjectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
export const appwriteApiKey = process.env.APPWRITE_API_KEY;
export const appwriteDatabaseId = process.env.APPWRITE_DATABASE_ID;
export const appwriteTasksTableId = process.env.APPWRITE_TASKS_TABLE_ID;
export const appwriteSessionCookieName = process.env.APPWRITE_SESSION_COOKIE_NAME || "taskflow-session";
const vercelPublicHost = process.env.NEXT_PUBLIC_VERCEL_URL || process.env.VERCEL_URL;
export const publicSiteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || (vercelPublicHost ? `https://${vercelPublicHost}` : undefined);

export const hasAppwritePublicEnv = Boolean(appwriteEndpoint && appwriteProjectId);

export const hasAppwriteAuthEnv = Boolean(hasAppwritePublicEnv && appwriteApiKey);

export const hasAppwriteDatabaseEnv = Boolean(hasAppwriteAuthEnv && appwriteDatabaseId && appwriteTasksTableId);

export const hasAppwriteEnv = hasAppwritePublicEnv;
