module.exports = {
    title: 'Hello World',
    tagline: 'A basic Docusaurus site',
    url: 'https://your-domain.com',
    baseUrl: '/',
    favicon: 'img/favicon.ico',
    organizationName: 'your-username',
    projectName: 'hello-world',

    themeConfig: {
      navbar: {
        title: 'Hello World',
        items: [
          {
            to: 'docs/',
            activeBasePath: 'docs',
            label: 'Docs',
            position: 'left',
          },
          {
            to: 'blog',
            label: 'Blog',
            position: 'left'
          },
        ],
      },
      footer: {
        style: 'dark',
        copyright: `Copyright © ${new Date().getFullYear()} Hello World App. Built with Docusaurus.`,
      },
    },
    presets: [
      [
        '@docusaurus/preset-classic',
        {
          docs: {
            sidebarPath: require.resolve('./sidebars.js'),
          },
          theme: {
            customCss: require.resolve('./src/css/custom.css'),
          },
        },
      ],
    ],
  };