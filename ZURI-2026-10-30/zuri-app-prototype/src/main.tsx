import './experience/chat-options.css';
import './experience/person-profile.css';
import './experience/lore-timeline.css';
import './experience/creation.css';
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import ErrorBoundary from './components/ErrorBoundary'
import './index.css'
import './experience/experience.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary><App /></ErrorBoundary>
  </React.StrictMode>,
)

// The production app caches its own shell; API and third-party data are excluded.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, {scope:import.meta.env.BASE_URL}).catch(() => {
      console.info('ZURI offline installation is unavailable; the app still works online.');
    });
  });
}

import './experience/mobile.css'

import './experience/flows.css'

import './experience/polish.css'

import './experience/pamoja.css'

import './experience/day.css'
import './experience/ios.css'
import './experience/personality.css'
import './experience/readability.css'
import './experience/channels.css'
import './experience/bottom-navigation.css'
import './experience/chapter-planning.css'
import './experience/spaces.css'
import './experience/requests.css'

import './experience/chat-beauty.css'

import './experience/icon-theme.css'

import './experience/connections.css'

import './experience/surfaces.css'

import './experience/intents.css'

import './experience/viola-workbox.css'

import './experience/opportunities.css';

import './experience/notifications.css';

import "./experience/cloud-account.css";

import './experience/cloud-world.css';
import './experience/cloud-login.css';
