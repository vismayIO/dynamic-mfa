const HtmlWebpackPlugin = require("html-webpack-plugin");
const {
  createRemoteWidgetFederationConfig,
} = require("./webpack.federation.cjs");

const deps = require("./package.json").dependencies;

module.exports = {
  entry: "./src/index.ts",
  output: {
    publicPath: "auto",
    clean: true,
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js", ".mjs"],
    fullySpecified: false,
  },
  devServer: {
    port: Number(process.env.PORT || 3001),
    historyApiFallback: true,
    hot: true,
  },
  module: {
    rules: [
      {
        test: /\.m?js$/,
        resolve: {
          fullySpecified: false,
        },
      },
      {
        test: /\.(ts|tsx)$/i,
        use: {
          loader: "ts-loader",
          options: {
            configFile: "tsconfig.app.json",
            transpileOnly: true,
            compilerOptions: {
              noEmit: false,
            },
          },
        },
        exclude: /node_modules/,
      },
      {
        test: /\.css$/i,
        use: ["style-loader", "css-loader", "postcss-loader"],
      },
      {
        test: /\.(svg|png|jpe?g|gif)$/i,
        type: "asset/resource",
      },
    ],
  },
  plugins: [
    createRemoteWidgetFederationConfig({
      deps,
    }),
    new HtmlWebpackPlugin({
      template: "./index.html",
    }),
  ],
};
