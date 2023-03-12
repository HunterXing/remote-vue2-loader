import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import { uglify } from 'rollup-plugin-uglify';
export default {
  input: "./src/loadVue.js",
  output: [
    {
      file: './lib/remoteVueLoader.js',
      format: 'umd',
      name: 'remoteVueLoader'
    }
  ],
  plugins: [
    resolve(),
    commonjs(),
    uglify()
  ]
}