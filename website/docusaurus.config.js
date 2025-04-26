module.exports = {
  title : 'Wiktor Bajor',
  tagline : 'A personal website and blog',
  url : 'https://wiktorbajor.com',
  baseUrl : '/',
  favicon : 'img/favicon.ico',
  organizationName : 'Wiktor Bajor',
  projectName : 'website',

  themeConfig : {
    navbar : {
      title : 'Wiktor Bajor',
      items :
            [
              {to : 'blog', label : 'Blog', position : 'left'},
              {
                type : 'doc',
                docId : 'intro',
                position : 'left',
                label : 'Documentation',
              },
            ],
    },
    footer : {
      style : 'dark',
      copyright : `Copyright © ${
                    new Date()
                        .getFullYear()} Wiktor Bajor. Built with Docusaurus.`,
    },
  },
  presets :
          [
            [
              '@docusaurus/preset-classic',
              {
                docs : {
                  sidebarPath : require.resolve('./sidebars.js'),
                },
                theme : {
                  customCss : require.resolve('./src/css/custom.css'),
                },
              },
            ],
          ],
};