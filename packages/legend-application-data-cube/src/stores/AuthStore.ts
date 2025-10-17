// authStore.ts
let accessToken: string | undefined = undefined;

export const setAccessToken = (token: string | undefined) => {
  accessToken = token;
};

export const getAccessToken = () => accessToken;
