import path from 'path';
import fs from 'fs';
import { EOL } from 'os';
import { App } from '@core/express/express-apps';
import { getAppsAndNodes } from '../src/config';

if (!(process.argv[2]?.length > 0)) {
  const scriptName = path.basename(__filename);
  console.error(`Usage: sudo ts-node ${scriptName} <add|remove>
Example: sudo ts-node ${scriptName} add`);
  process.exit(1);
}

const pattern = '# [PAF]';

const action = process.argv[2];

const hostsFile = '/etc/hosts';

(async () => {
  let content = (await fs.promises.readFile(hostsFile))
    .toString()
    .split(EOL)
    .filter((n) => !n.includes(pattern))
    .join(EOL);

  if (action === 'remove') {
    // The content is already cleaned
  } else if (action === 'add') {
    const { websites, clientNodes, operators, cdns } = await getAppsAndNodes();

    const allApps: App[] = [
      ...websites,
      ...cdns,
      ...operators.map((operator) => operator.app),
      ...clientNodes.map((clientNode) => clientNode.app),
    ];

    for (const app of allApps) {
      content += `127.0.0.1 ${app.hostName} ${pattern} ${app.name}${EOL}`;
    }
  } else {
    console.error(`Unsupported action ${action}`);
    process.exit(1);
  }

  await fs.promises.writeFile(hostsFile, content);

  process.exit(0);
})();
