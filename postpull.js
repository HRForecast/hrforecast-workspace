#!/usr/bin/env node
const { exec } = require("node:child_process");
const fs = require("node:fs/promises");
const { resolve } = require("node:path");
const util = require("node:util");

const aexec = util.promisify(exec);

const { argv } = process;
const [, , targetDir] = argv;

const invalid = (err) => {
  console.error(err);
  process.exit(1);
};

async function processModules(modules, existingModules) {
  for await (const { name, path, url, branch } of modules) {
    if (existingModules.includes(name)) {
      continue;
    }
    if (await fs.stat(`${targetDir}/${path}`).catch(() => false)) {
      await aexec(`git rm --cached ${path} -rf --ignore-unmatch`);
      await aexec(`rm -rf ${targetDir}/${path}`);
    }

    const cmd = `git submodule add -b ${branch} --force --name ${name} ${url} ${path}`;

    await aexec(`bash -c "${cmd}"`)
      .catch(() => aexec(`bash -c "${cmd}"`))
      .then(() => console.log(`Submodule ${name} reloaded successfully`));
  }
}

async function parseModules(gitmodules, existingModules) {
  const module_lines = gitmodules.split("\n");

  const modules = [];
  module_lines.forEach((line) => {
    if (line.startsWith("[submodule")) {
      const [, name] = line.trim().match(/\[submodule \"(.*)"\]/);
      modules.push({ name });
    } else {
      let [key, value] = line.trim().split(" = ");

      if (key === "path" && value.charAt(0) === '"') {
        value = value.substring(1, value.length - 1);
      }

      if (key && value) {
        modules[modules.length - 1][key] = value;
      }
    }
  });

  await processModules(modules, existingModules);
}

async function main() {
  const ls = await fs.readdir(targetDir);

  if (!ls.includes(".git")) {
    invalid("The target directory is not a Git repository");
  }
  if (!ls.includes(".gitmodules")) {
    invalid("The target directory does not contains Git-modules file");
  }

  await aexec(`cd ${targetDir}`);
  const gitmodule = await fs.readFile(`${targetDir}/.gitmodules`, {
    encoding: "utf8",
  });

  const module = (await aexec("git submodule")).stdout
    .trim()
    .split("\n")
    .slice(1)
    .map((line) => line.split(" ")[2]);

  await parseModules(gitmodule, module);
  await aexec("gitsu");
}
main();
