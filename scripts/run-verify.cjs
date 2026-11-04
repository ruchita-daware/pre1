const path = require('path');
const jiti = require('jiti')(__filename, {
  alias: {
    '@': path.resolve(__dirname, '..', 'src'),
  },
});
jiti('./verify-recurring-transport.ts');

