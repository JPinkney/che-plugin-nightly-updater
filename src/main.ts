import * as core from '@actions/core'
import * as github from '@actions/github';
import * as fs from 'fs';
import * as path from 'path';
/**
 * Main function that is ran when the github action is started
 */
async function run(): Promise<void> {
  try {

    process.chdir(path.join('che-plugin-registry'));

    const vscodeExtensionsPath = "vscode-extensions.json";
    const userToken = core.getInput('token');

    const octokit = github.getOctokit(userToken)

    const extensionsFile = fs.readFileSync(vscodeExtensionsPath, 'utf-8');
    const extensionsJSON = JSON.parse(extensionsFile);
    console.log(extensionsJSON);
    for (const extIndex in extensionsJSON.extensions) {
      // Check the repository to see if it has a newer tag
      const ext = extensionsJSON.extensions[extIndex];
      const repository = ext.repository;
      const websiteOwnerRepo = getWebsiteOwnerRepo(repository);
      console.log(websiteOwnerRepo);
      const tags = await octokit.repos.listTags({
        owner: websiteOwnerRepo.owner,
        repo: websiteOwnerRepo.repo
      });
      console.log(tags);
      /**
       * [
          {
            "name": "v0.1",
            "commit": {
              "sha": "c5b97d5ae6c19d5c5df71a34c7fbeeda2479ccbc",
              "url": "https://api.github.com/repos/octocat/Hello-World/commits/c5b97d5ae6c19d5c5df71a34c7fbeeda2479ccbc"
            },
            "zipball_url": "https://github.com/octocat/Hello-World/zipball/v0.1",
            "tarball_url": "https://github.com/octocat/Hello-World/tarball/v0.1"
          }
        ]
       */

      /**
       * Get the first tag in the response. It's guarenteed to be the newest.
       * If the name and the sha are not equal to the revision number in vscode-extensions.json
       * then we need to update because there is a newer version
       */
      const firstTag = tags.data.length > 0 ? tags.data[0] : undefined;
      if (firstTag) {
        if (firstTag.name != ext.revision && firstTag.commit.sha != ext.revision) {
          // We need to update
          extensionsJSON.extensions[extIndex].revision = firstTag.name;
          console.log("here");
          console.log(firstTag.name);
          console.log(extensionsJSON.extensions[extIndex].revision)
        }
      }
      // Technically we need to handle the case when revision is a sha1 nightly but I'll ignore that for now
    }

    fs.writeFileSync(vscodeExtensionsPath, 'utf-8');
  } catch (error) {
    core.setFailed(error.message)
  }
}

interface WebsiteOwnerRepo {
  website: string;
  owner: string;
  repo: string;
}

function getWebsiteOwnerRepo(repository: string): WebsiteOwnerRepo {
  // repository https://github.com/asciidoctor/asciidoctor-vscode
  const uri = new URL(repository);
  const ownerRepo = uri.pathname.split("/"); // Gets something like [ "", "asciidoctor", "asciidoctor-vscode" ]
  return {
    website: uri.origin,
    owner: ownerRepo[1],
    repo: ownerRepo[2]
  }

}

run()
