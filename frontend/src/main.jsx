import React, { Component } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.error('Scoresheet render error:', error);
  }

  render() {
    if (this.state.failed) {
      return <main className="fatal-error"><div><span>Mezani Scoresheet</span><h1>The page needs to reload</h1><p>The application received unexpected data. Your submitted records remain safe.</p><button onClick={() => window.location.reload()}>Reload scoresheet</button></div></main>;
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode><AppErrorBoundary><App /></AppErrorBoundary></React.StrictMode>,
);
