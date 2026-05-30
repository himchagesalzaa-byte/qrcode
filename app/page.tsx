'use client';

import { useEffect, useState } from 'react';

export default function Page() {
  const [url, setUrl] = useState('');

  useEffect(() => {
    // Unregister any rogue service workers that might be causing blank screens/redirect loops
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(function(registrations) {
        for (let registration of registrations) {
          registration.unregister();
        }
      });
    }
    // Load the vanilla HTML file with any URL parameters
    setUrl('/vanilla.html' + window.location.search);
  }, []);

  if (!url) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#121214',
        color: 'white',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
      }}>
        Loading App Environment...
      </div>
    );
  }

  return (
    <iframe 
      src={url} 
      style={{ width: '100vw', height: '100vh', border: 'none', display: 'block' }} 
      title="Vanilla App"
      allow="camera"
    />
  );
}
