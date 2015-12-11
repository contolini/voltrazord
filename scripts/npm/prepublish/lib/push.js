var exec = require('child-process-promise').exec;

function push() {
  return exec('git push "https://' + process.env.GH_TOKEN + '@' + process.env.GH_REF + '" master:master');
}

module.exports = push;
