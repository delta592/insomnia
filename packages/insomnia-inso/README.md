# Documentation

How to use [Inso CLI](https://docs.insomnia.rest/inso-cli/introduction).

## Testing

From repo root (recommended — handles libcurl install, build, smoke server, and restores Electron libcurl after):

```shell
npm run test:inso:bundle   # dev bundle e2e
npm run test:inso:binary   # packaged binary e2e
```

Or run steps manually:

```shell
# unit tests (libcurl mocked)
npm run test:unit -w insomnia-inso

# bundle e2e — pretest/posttest hooks install the correct libcurl binary automatically
npm run test:bundle -w insomnia-inso   # requires smoke server on :4010

# start smoke test api (required for e2e tests if not using test:inso:bundle)
npm run serve -w insomnia-smoke-test
```

## Development

### Getting started

```shell
npm run inso-start
npm run test -w insomnia-inso
# will default to insomnia app database
$PWD/packages/insomnia-inso/bin/inso run test
# will use config, useful for testing with fewer args
$PWD/packages/insomnia-inso/bin/inso -w packages/insomnia-inso/src/db/fixtures/git-repo script runTest
```

### node-libcurl

Insomnia app uses the Electron build; Inso CLI uses the Node build. `scripts/install-libcurl.mjs` downloads prebuilt binaries for your current Node/Electron version, or builds from source (Homebrew `curl` on macOS). `postinstall` installs the Electron binary; bundle test hooks switch to Node and back automatically.

```shell
npm run install-libcurl-node       # inso / Node
npm run install-libcurl-electron   # app / Electron (also runs on postinstall)
```

## Run CLI Smoke Tests

```shell
# Run CLI tests
npm run test:bundle -w insomnia-inso
# Package the Inso CLI binaries
npm run inso-package
npm run test:binary -w insomnia-inso
```

## Debugging CLI tests using watcher

This is helpful for debugging failing api tests

From project root, in separate terminals:

```sh
# start smoke test api
npm run serve -w insomnia-smoke-test

# watch inso
npm run start -w insomnia-inso

# run api test with dev bundle. To debug run this in a Javascript Debug Terminal in VSCode
$PWD/packages/insomnia-inso/bin/inso run test "Echo Test Suite" -w $PWD/packages/insomnia-smoke-test/fixtures/inso-nedb --env Dev --verbose
```

## How to debug pkg

```sh
# run modify package command and then a unit test
npm run package -w insomnia-inso && \
$PWD/packages/insomnia-inso/binaries/inso run test "Echo Test Suite" -w $PWD/packages/insomnia-smoke-test/fixtures/inso-nedb --env Dev --verbose

```

## How to update the `inso-nedb` fixtures

Run Insomnia with `INSOMNIA_DATA_PATH` environment variable set to `fixtures/inso-nedb`, e.g.:

```bash
INSOMNIA_DATA_PATH=packages/insomnia-smoke-test/fixtures/inso-nedb /Applications/Insomnia.app/Contents/MacOS/Insomnia
```

Relaunch the app one more time, so that Insomnia compacts the database.

The `.gitignore` file will explicitly ignore certain database files, to keep the directory size down and avoid prevent sensitive data leaks.

## How to run inso with the `inso-nedb` fixture locally?

Set the `-w` argument pointed to `packages/insomnia-smoke-test/fixtures/inso-nedb`:

```bash
# if installed globally
inso -w <INSO_NEDB_PATH>

# using the package bin
./packages/insomnia-inso/bin/inso -w <INSO_NEDB_PATH>

# using a binary
./packages/insomnia-inso/binaries/insomnia-inso -w <INSO_NEDB_PATH>
```

## How to debug the bundled assets

```bash
DEBUG=1 npm run build
```

This will generate an `artifacts` directory containing information about the bundled assets.
The meta.json can be uploaded to https://esbuild.github.io/analyze/ to visualize the bundle.
The bundle-analysis.log can be used to see the dependency tree of the bundle.

## How to generate documents about inso

1. Use Node **26.5.1** from the repo root `.nvmrc` (`fnm use "$(cat .nvmrc)"` or equivalent).
1. Run the script below, which will build inso in dev mode in order to use it to generate docs about itself
1. The docs appear in your vscode diff, or you can look in `./packages/insomnia-inso/reference/` if the version number looks wrong you might need to check what branch you're on, it should be run from develop ideally as the only changes in the release branch should be hotfixes that dont affect inso docs

```sh
npm i && npm run build -w insomnia-inso && $PWD/packages/insomnia-inso/bin/inso generate-docs
```
