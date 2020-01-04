const path = require('path')
const TerserPlugin = require('terser-webpack-plugin')

const isDev = process.env.NODE_ENV === 'development'

const optimization = isDev ? undefined : {
  minimize: !isDev,
  minimizer: [
    new TerserPlugin({
      terserOptions: {
        keep_classnames: true,
      },
    }),
  ],
}

module.exports = {
  devtool: isDev ? 'eval-cheap-module-source-map' : 'source-map',
  entry: path.resolve(__dirname, 'src', 'StarWarsTheOldRepublicPnP.js'),
  output: {
    path: path.resolve(__dirname, 'module'),
    filename: 'sw-tor.bundle.js'
  },
  module: {
    rules: [
      {
        test: /\.m?js$/,
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              [
                '@babel/preset-env',
                {
                  targets: {
                    chrome: "70",
                  },
                }
              ]
            ],
            plugins: [
              '@babel/plugin-proposal-class-properties',
              [
                "@babel/plugin-transform-runtime",
                {
                  "regenerator": true,
                }
              ]
            ],
            cacheDirectory: true
          }
        }
      }
    ]
  },
  optimization,
  watchOptions: {
    ignored: /node_modules/
  }
}
