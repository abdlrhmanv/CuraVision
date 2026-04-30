/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output produces a minimal server bundle in `.next/standalone`
  // that the Docker image copies directly — no need to ship `node_modules`.
  output: "standalone",

  // Cornerstone's WASM codecs reference Node built-ins (`fs`, `path`, ...) at
  // module load time. They're only ever used in the browser, so we shim the
  // Node-only modules to `false` for client builds. Having a `webpack` hook
  // also signals Next to compile with webpack instead of Turbopack, which is
  // required until Turbopack ships a `resolve.fallback` equivalent.
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve = config.resolve || {};
      config.resolve.fallback = {
        ...(config.resolve.fallback || {}),
        fs: false,
        path: false,
        crypto: false,
        stream: false,
        zlib: false,
        os: false,
        module: false,
        worker_threads: false,
      };
    }
    return config;
  },
};

export default nextConfig;
