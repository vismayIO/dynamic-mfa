const webpack = require('webpack')
const { container } = webpack
const HtmlWebpackPlugin = require('html-webpack-plugin')
const path = require('path')
const dotenv = require('dotenv')

dotenv.config({ path: path.resolve(__dirname, '.env'), override: true, quiet: true })
dotenv.config({ path: path.resolve(__dirname, '.env.local'), override: true, quiet: true })

const ModuleFederationPlugin = container.ModuleFederationPlugin
const deps = require('./package.json').dependencies
const buildEnv = {
  MODULE_REGISTRY_API_URL: process.env.MODULE_REGISTRY_API_URL || '',
  MODULE_REGISTRY_UPLOAD_API_URL: process.env.MODULE_REGISTRY_UPLOAD_API_URL || '',
  MODULE_REGISTRY_API_KEY: process.env.MODULE_REGISTRY_API_KEY || '',
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
      __MODULE_REGISTRY_API_URL__: JSON.stringify(buildEnv.MODULE_REGISTRY_API_URL),
      __MODULE_REGISTRY_UPLOAD_API_URL__: JSON.stringify(buildEnv.MODULE_REGISTRY_UPLOAD_API_URL),
      __MODULE_REGISTRY_API_KEY__: JSON.stringify(buildEnv.MODULE_REGISTRY_API_KEY),
    }),
    new HtmlWebpackPlugin({
      template: './index.html',
    }),
  ],
}
