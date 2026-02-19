const { container } = require("webpack");

const ModuleFederationPlugin = container.ModuleFederationPlugin;

function createRemoteWidgetFederationConfig(options) {
  const {
    deps,
    remoteName = process.env.REMOTE_NAME || "remoteWidget",
    widgetModulePath = "./src/Widget",
  } = options;

  return new ModuleFederationPlugin({
    name: remoteName,
    filename: "remoteEntry.js",
    exposes: {
      "./Widget": widgetModulePath,
    },
    shared: {
      react: {
        singleton: true,
        requiredVersion: deps.react,
      },
      "react-dom": {
        singleton: true,
        requiredVersion: deps["react-dom"],
      },
      "@workspace/ui-sdk": {
        singleton: true,
        requiredVersion: deps["@workspace/ui-sdk"],
      },
    },
  });
}

module.exports = {
  createRemoteWidgetFederationConfig,
};
