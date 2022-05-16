import { WebSiteConfig } from './website-config';
import { App } from '@core/express/express-apps';
import { anythingButAssets } from './demo-utils';

export const pafPublisherWebSiteConfig: WebSiteConfig = {
  name: 'PAF publisher',
  host: 'www.pafdemopublisher.com',
  cdnHost: 'cdn.pafdemopublisher.com',
};

export const pafPublisherWebSiteApp = new App(pafPublisherWebSiteConfig.name).setHostName(
  pafPublisherWebSiteConfig.host
);

pafPublisherWebSiteApp.app.get(anythingButAssets, (req, res) => {
  const view = 'publisher/index';
  res.render(view, {
    title: pafPublisherWebSiteConfig.name,
    cdnDomain: pafPublisherWebSiteConfig.cdnHost,
    // Using the CMP backend as a PAF client node
    pafNodeHost: 'cmp.pafdemopublisher.com',
    cmp: true,
  });

  // Send full URL in referer header, for testing this config
  res.setHeader('Referrer-Policy', 'unsafe-url');
});

export const pafPublisherCdnApp = new App(pafPublisherWebSiteConfig.name).setHostName(
  pafPublisherWebSiteConfig.cdnHost
);
