import appJson from "./app.json";

export default {
  ...appJson.expo,
  extra: {
    EXPO_PUBLIC_BACKEND_URL:
      process.env.EXPO_PUBLIC_BACKEND_URL,
  },
};
