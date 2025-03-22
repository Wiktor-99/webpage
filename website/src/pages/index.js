import React from 'react';
import Layout from '@theme/Layout';

export default function Home() {
  return (
    <Layout
      title="Hello World"
      description="A basic Docusaurus site">
      <main style={{
        padding: '2rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '50vh'
      }}>
      </main>
    </Layout>
  );
}