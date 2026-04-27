export type AuthUser = {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
};

export type AuthSession = {
  expire?: string;
};
