#! /usr/bin/env node

const tsconfig = require("./tsconfig.json");

require('ts-node').register(tsconfig);
require('./main.ts');
