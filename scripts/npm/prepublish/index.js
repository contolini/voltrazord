var path = require('path'),
    fs = require('fs'),
    readdir = require('fs-readdir-promise'),
    Promise = require('bluebird'),
    semver = require('semver'),
    inPublish = require('in-publish').inPublish,
    logSymbols = require('log-symbols'),
    util = require('./lib'),
    isTravis = require('is-travis'),
    componentsDir = path.join(__dirname, '..', '..', '..', 'src'),
    componentsToPublish = [];

// Check git's status.
util.getGitStatus('./')
  // Abort if the working directory isn't clean.
  .then(handleGitStatus)
  // Travis operates in a detached head state so checkout the master branch.
  .then(checkoutMaster)
  // Get a list of CF components from the components/ dir.
  .then(getComponents)
  // Filter the components that have been updated and need to be published.
  .then(filterComponents)
  // Build the components.
  .then(buildComponents)
  // Confirm that the user wants to publish them.
  .then(confirmPublish)
  // Publish those components.
  .then(publishComponents)
  // Bump CF's new version number in package.json and commit the change.
  .then(commit)
  // Push the change to GitHub.
  .then(push)
  // All done.
  .then(finish)
  // Report any errors that happen along the way.
  .catch(handleError);

function handleError(msg) {
  util.printLn.error(msg);
  process.exit(1);
}

function handleGitStatus(result) {
  if (!result.stdout && !result.stderr) {
    util.printLn.info('Git working directory is clean.');
  } else {
    util.printLn.error('Git working directory is not clean. Commit your work before publishing.');
    process.exit(1);
  }
}

function checkCredentials(result) {
  if (isTravis) return;
  util.printLn.info('Checking credentials...');
  var npmrc = path.join(process.env.HOME || process.env.USERPROFILE, '.npmrc');
  if (!fs.existsSync(npmrc) || !/_auth/.test(npmrc)) {
    util.printLn.error('You need to be logged into npm and have permission to administer CF components. Talk to a node-ledgable coworker for assistance.');
    process.exit(1);
  }
}

function checkoutMaster() {
  // We only checkout master if this script is being run by Travis.
  if (isTravis) {
    util.printLn.info('Checking out master branch...');
    return util.git.checkoutMaster();
  }
}

function getComponents() {
  return readdir(componentsDir);
}

function filterComponents(components) {
  var promises = components.map(compareVersionNumber);
  promises.push()
  util.printLn.info('Checking which components need to be published to npm...');
  return Promise.all(promises);
}

function compareVersionNumber(component) {
  if (component.indexOf('voltrazord-') !== 0) return;
  var manifest = componentsDir + '/' + component + '/package.json',
      localVersion = JSON.parse(fs.readFileSync(manifest, 'utf8')).version;
  return util.getNpmVersion(component).then(function(data) {
    var npmVersion = data['dist-tags'].latest;
    if (semver.gt(localVersion, npmVersion)) {
      util.printLn.success(component + ': ' + npmVersion + ' -> ' + localVersion, true);
      return {
        name: component,
        newVersion: localVersion,
        oldVersion: npmVersion
      };
    } else if (semver.lt(localVersion, npmVersion)) {
      util.printLn.error('Error: ' + component + ' was bumped to ' + localVersion + ' locally but the latest version on npm is ' + npmVersion + '.', true);
    } else {
      util.printLn.info(component + ' remains ' + npmVersion, true);
    }
  }).catch(function(err) {
    util.printLn.error(err);
    process.exit(1);
  });
}

function buildComponents(components) {
  var newVersion,
      bumps = [];

  // TODO: Fix bug that results in some entries in the components array to be
  // blank. For now, filter them out.
  componentsToPublish = components.filter(function(component) {
    if (component) {
      // While we're iterating, keep track of each component's semver diff
      bumps.push(semver.diff(component.oldVersion, component.newVersion));
      return component.name !== undefined;
    }
  });

  // If no components were updated, check if the master component was updated.
  if (!componentsToPublish.length) {
    util.printLn.error('No components\' versions were updated.');
    return checkMasterComponentVersionNumber().then(function(versions) {
      if (semver.gt(versions.new, versions.old)) {
        util.printLn.success('voltrazord\'s version was manually updated: ' + versions.old + ' -> ' + versions.new + '.');
        return util.build();
      }
      util.printLn.error('voltrazord\'s version also wasn\'t updated. Nothing to publish. Abort.');
      process.exit(1);
    });
  }

  // Sort the diffs and increment CF by whatever the first (largest) increment is
  newVersion = semver.inc(util.pkg.version, bumps.sort().shift());
  util.printLn.success('voltrazord will also be published: ' + util.pkg.version + ' -> ' + newVersion + '. See https://goo.gl/cZvnnL.');
  util.pkg.version = newVersion;
  fs.writeFileSync('package.json', JSON.stringify(util.pkg, null, 2))
  util.printLn.info('Building components now...');
  return util.build();
}

function checkMasterComponentVersionNumber() {
  return util.getNpmVersion('voltrazord').then(function(data) {
    return {
      new: util.pkg.version,
      old: data['dist-tags'].latest
    };
  });
}

function confirmPublish() {
  util.printLn.info('Components have been built to tmp/.');
  return util.confirm({
    prompt: '    Publish the above components marked with a ' + logSymbols.success + ' ?',
    yes: 'Publishing the components to npm...',
    no: 'Aborting. See ya!'
  });
}

function publishComponents() {
  if (!componentsToPublish.length) return;
  var components = componentsToPublish.map(function(component) {
    return component.name;
  });
  return Promise.all(components.map(util.publish));
}

function commit(result) {
  if (!componentsToPublish.length) return;
  if (result && result.stdout) util.printLn.console(result.stdout);
  util.printLn.info('Committing change to manifest...');
  return util.git.commit(util.pkg.version);
}

function push(result) {
  if (!componentsToPublish.length) return;
  if (result && result.stdout) util.printLn.console(result.stdout);
  util.printLn.info('Pushing commit to GitHub...');
  return util.git.push(util.pkg.repository.url);
}

function finish(result) {
  if (!componentsToPublish.length) return;
  if (result && result.stdout) util.printLn.console(result.stdout);
  util.printLn.success('Hooray! All done!');
  process.exit(0);
}
