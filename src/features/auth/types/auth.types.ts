export type AuthUser = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
};

export type RegisterPayload = {
  name: string;
  email: string;
  password: string;
};
