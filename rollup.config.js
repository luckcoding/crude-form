var babel = require('rollup-plugin-babel');
var commonjs = require('rollup-plugin-commonjs');
var nodeResolve = require('rollup-plugin-node-resolve');
var peerDepsExternal = require('rollup-plugin-peer-deps-external');
var replace = require('rollup-plugin-replace');
var minify = require('rollup-plugin-babel-minify');
var pkg = require('./package.json');

var peerDependencies = Object.keys(pkg.peerDependencies);
var dependencies = Object.keys(pkg.dependencies);

var banner = '//  @crude/form v' + pkg.version + '\n'
  + '//  And @crude/form under the MIT license.\n';

function globals() {
  return {
    react: 'React',
    'prop-types': 'PropTypes'
  };
}

function baseConfig() {
  return {
    input: 'src/index.js',
    plugins: [
      nodeResolve(),
      commonjs({
        include: 'node_modules/**'
      }),
      peerDepsExternal(),
      babel({
        babelrc: false,
        presets: [
          [
            '@babel/env',
            {
              loose: true,
              shippedProposals: true,
              modules: false,
              targets: {
                ie: 9
              }
            }
          ],
          '@babel/react'
        ],
        exclude: 'node_modules/**'
      })
    ],
  }
}

function baseUmdConfig(minified) {
  var config = Object.assign(baseConfig(), {
    external: peerDependencies,
  });
  config.plugins.push(replace({
    'process.env.NODE_ENV': JSON.stringify('production'),
  }));

  if (minified) {
    config.plugins.push(minify({ comments: false }));
  }

  return config;
}

/**
 * commonjs
 */
const libConfig = baseConfig();
// Do not include any of the dependencies
libConfig.external = peerDependencies.concat(dependencies);
libConfig.output = [
  { sourcemap: true, name: 'crudeForm', file: 'dist/form.cjs.js', format: 'cjs' },
  { sourcemap: true, name: 'crudeForm', file: 'dist/form.es.js', format: 'es' },
];

/**
 * umd
 */
const umdFullConfig = baseUmdConfig(false);
umdFullConfig.output = [
  { globals: globals(), sourcemap: true, name: 'crudeForm', file: 'dist/form.full.js', format: 'umd', banner: banner },
];

// Validate globals in main UMD config
const missingGlobals = peerDependencies.filter(dep => !(dep in globals()));
if (missingGlobals.length) {
  console.error('All peer dependencies need to be mentioned in globals, please update rollup.config.js.');
  console.error('Missing: ' + missingGlobals.join(', '));
  console.error('Aborting build.');
  process.exit(1);
}

const umdFullConfigMin = baseUmdConfig(true);
umdFullConfigMin.output = [
  { globals: globals(), sourcemap: true, name: 'crudeForm', file: 'dist/form.full.min.js', format: 'umd' },
];

const umdConfig = baseUmdConfig(false);
umdConfig.output = [
  { globals: globals(), sourcemap: true, name: 'crudeForm', file: 'dist/form.js', format: 'umd', banner: banner },
];

const umdConfigMin = baseUmdConfig(true);
umdConfigMin.output = [
  { globals: globals(), sourcemap: true, name: 'crudeForm', file: 'dist/form.min.js', format: 'umd' },
];

module.exports = [
  libConfig,
  umdFullConfig,
  umdFullConfigMin,
  umdConfig,
  umdConfigMin,
];