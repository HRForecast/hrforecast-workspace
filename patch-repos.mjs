import fs from "node:fs/promises";
import path from "node:path";
import child_process from "node:child_process";
import util from "node:util";

const shell = util.promisify(child_process.exec);

const mapDeps = {
  "@smart/api": "../NodeJS-smartAPI",
  "@smart/ui": "../UI-components",
  "@smart/eslint-config": "../eslint-config",
  "@smart/stylelint-config": "../stylelint-config",
  "@smart/prettier-config": "../prettier-config",
  "@smart/bundle-config": "../bundle-config",
  "@smart/tsconfig": "../tsconfig",
  "@smart/git-hooks-config": "../git-hooks-config"
};
const unmapDeps = {
  "@smart/api": "git@github.com:HRForecast/NodeJS-smartAPI.git",
  "@smart/ui": "git@github.com:HRForecast/UI-components.git",
};

const CWD = process.cwd();
const [executable, currFile, COMMAND] = process.argv;

const listdir = await fs.readdir(CWD);
const dircontents = await Promise.all(
  listdir.map(async (content) => {
    const p = path.resolve(CWD, content);
    const stat = await fs.stat(p);
    const contents = stat.isDirectory() ? await fs.readdir(p) : content;

    return { dir: content, contents };
  })
);
const gitNpmFolders = dircontents.filter(
  ({ contents }) =>
    contents.includes(".git") && contents.includes("package.json")
);

async function patchDep({ pkg, name, isDev, branch }) {
  switch (COMMAND) {
    case "-u": {
      const branchSuffix = branch === "master" ? "" : `#${branch.trim()}`;

      if (unmapDeps[name]) {
        pkg[isDev ? "devDependencies" : "dependencies"][name] =
          unmapDeps[name] + branchSuffix;
      }
      break;
    }
    case "-p": {
      if (mapDeps[name]) {
        pkg[isDev ? "devDependencies" : "dependencies"][name] = mapDeps[name];
      }
      break;
    }
    default: {
      console.log("[patchPKG] Command not found");
      process.exit(1);
    }
  }
}

async function patchPkgJson({ dir }) {
  const pkgFile = path.resolve(CWD, dir, "package.json");
  const { default: pkg } = await import(pkgFile, { assert: { type: "json" } });

  const { stdout: branch } = await shell(
    `cd ${dir} && git branch --show-current`
  );
  const { dependencies = {}, devDependencies = {} } = pkg;

  for (const dep in dependencies) {
    if (dep.startsWith("@smart/")) {
      await patchDep({ pkg, name: dep, isDev: false, branch });
    }
  }
  for (const dep in devDependencies) {
    if (dep.startsWith("@smart/")) {
      await patchDep({ pkg, name: dep, isDev: true, branch });
    }
  }

  await fs.writeFile(pkgFile, JSON.stringify(pkg, null, 2) + "\n");

  if (COMMAND === "-p") {
    // `cd ${dir} && rm -rf node_modules package-lock.json yarn.lock bun.lockb pnpm-lock.yaml && pnpm install`
    /* await shell(
      `cd ${dir} && pnpm install`
    ); */
  }
}

await Promise.all(gitNpmFolders.map(patchPkgJson));
