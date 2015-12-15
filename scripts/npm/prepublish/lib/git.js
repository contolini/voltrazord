var exec = require('child-process-promise').exec,
    util = require('./lib');

var git = {
  checkoutMaster: function() {
    return exec('git checkout master');
  },
  commit: function(version) {
    var msg = version || 'Auto-incrementing version';
    return exec('git commit -am "' + msg + '"');
  },
  push: function() {
    if (process.env.GH_TOKEN) {
      return exec('git push "https://' + process.env.GH_TOKEN + '@' + util.pkg.repository.url + '" master:master');
    }
    return exec('git push ' + util.pkg.repository.url + ' master');
  }
}

module.exports = git;
