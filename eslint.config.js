import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

// eslint-config-next 16 ships native flat config arrays — spread them directly
// (the old FlatCompat.extends("next/core-web-vitals") bridge is no longer needed).
const config = [
  { ignores: ["design/**"] },
  ...nextCoreWebVitals,
];

export default config;
