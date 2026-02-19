const webpack = require('webpack')
const { container } = webpack
const HtmlWebpackPlugin = require('html-webpack-plugin')

const ModuleFederationPlugin = container.ModuleFederationPlugin
const deps = require('./package.json').dependencies
const buildEnv = {
  REMOTE_WIDGET_ENTRY_URL:
    process.env.REMOTE_WIDGET_ENTRY_URL || '/remotes/remote-widget/remoteEntry.js',
  REMOTE_WIDGET_SCOPE: process.env.REMOTE_WIDGET_SCOPE || 'remoteWidget',
}

module.exports = {
  entry: './src/index.ts',
  output: {
    publicPath: 'auto',
    clean: true,
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.mjs'],
    fullySpecified: false,
  },
  devServer: {
    port: 3000,
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
          loader: 'ts-loader',
          options: {
            configFile: 'tsconfig.app.json',
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
        use: ['style-loader', 'css-loader', 'postcss-loader'],
      },
      {
        test: /\.(svg|png|jpe?g|gif)$/i,
        type: 'asset/resource',
      },
    ],
  },
  plugins: [
    new ModuleFederationPlugin({
      name: 'host',
      shared: {
        react: {
          singleton: true,
          requiredVersion: deps.react,
        },
        'react-dom': {
          singleton: true,
          requiredVersion: deps['react-dom'],
        },
        '@workspace/ui-sdk': {
          singleton: true,
          requiredVersion: deps['@workspace/ui-sdk'],
        },
      },
    }),
    new webpack.DefinePlugin({
      __REMOTE_WIDGET_ENTRY_URL__: JSON.stringify(buildEnv.REMOTE_WIDGET_ENTRY_URL),
      __REMOTE_WIDGET_SCOPE__: JSON.stringify(buildEnv.REMOTE_WIDGET_SCOPE),
    }),
    new HtmlWebpackPlugin({
      template: './index.html',
    }),
  ],
}
