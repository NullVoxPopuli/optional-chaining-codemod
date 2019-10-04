#!/usr/bin/env node
'use strict';

require('codemod-cli').runTransform(
  __dirname,
  'optional-chaining',
  process.argv.slice(2) /* paths or globs */
);
