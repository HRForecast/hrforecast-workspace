const localDeps = {
  "@smart/api": "file:../NodeJS-smartAPI",
  "@smart/ui": "file:../UI-components",
  "@smart/eslint-config": "file:../eslint-config",
  "@smart/stylelint-config": "file:../stylelint-config",
  "@smart/prettier-config": "file:../prettier-config",
  "@smart/bundle-config": "file:../bundle-config",
  "@smart/tsconfig": "file:../tsconfig",
  "@smart/git-hooks-config": "file:../git-hooks-config",
};

function readPackage(pkg) {
  for (const key in pkg.dependencies) {
    if (localDeps[key]) {
      pkg.dependencies[key] = localDeps[key];
    }
  }
  return pkg;
}

module.exports = {
  hooks: {
    readPackage,
  },
};
