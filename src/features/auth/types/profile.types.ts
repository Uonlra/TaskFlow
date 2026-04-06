export type Profile = {
  id: string;
  fullName: string;
  email: string;
  avatarUrl?: string;
  updatedAt?: string;
};

export type ProfileFormValues = {
  fullName: string;
  avatarUrl: string;
};
