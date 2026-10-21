import iconUrl from '../assets/icon.png';
import { version } from '../../../package.json';
import './DownloadPage.css';

const MAC_DOWNLOAD_URL =
  import.meta.env.VITE_DOWNLOAD_MAC_URL ||
  'https://github.com/NVIDIA-CoreMind/CoreMind-Application/releases';
const WINDOWS_DOWNLOAD_URL = import.meta.env.VITE_DOWNLOAD_WIN_URL || '';
const SOURCE_URL = 'https://github.com/NVIDIA-CoreMind/CoreMind-Application';

const FEATURES = [
  {
    title: 'AI workspace',
    body: 'Describe a task. CoreMind proposes a plan and file diffs, and nothing is applied until you approve it.',
  },
  {
    title: 'Code editor',
    body: 'The Monaco editor engine, with multi-tab editing, syntax highlighting, and file search.',
  },
  {
    title: 'Integrated terminal',
    body: 'Real shell sessions in the app, so builds and tests run where you work.',
  },
  {
    title: 'Mobile tooling',
    body: 'Flutter and Android device controls, with emulator management and logs in one panel.',
  },
];

const INSTALL_STEPS = [
  'Download the .dmg file for your Mac.',
  'Open it and drag CoreMind into Applications.',
  'Open CoreMind from Applications. The current build is not yet notarized by Apple, so on first launch, right-click CoreMind and choose Open.',
];

export function DownloadPage() {
  return (
    <div className="dl">
      <header className="dl-header">
        <div className="dl-brand">
          <img src={iconUrl} alt="" width={28} height={28} />
          <span>CoreMind</span>
        </div>
        <a className="dl-link" href={SOURCE_URL} target="_blank" rel="noopener noreferrer">
          Source on GitHub
        </a>
      </header>

      <main>
        <section className="dl-hero" aria-labelledby="dl-title">
          <p className="dl-eyebrow">Desktop app for macOS</p>
          <h1 id="dl-title">The AI-native IDE, on your desktop</h1>
          <p className="dl-lead">
            CoreMind pairs a full code editor and terminal with an AI workspace that plans, edits, and
            verifies changes in your project. It runs as a desktop app so it can work with the files on
            your machine.
          </p>

          <div className="dl-actions">
            <a className="dl-button dl-button-primary" href={MAC_DOWNLOAD_URL} target="_blank" rel="noopener noreferrer">
              Download for macOS
            </a>
            {WINDOWS_DOWNLOAD_URL ? (
              <a className="dl-button" href={WINDOWS_DOWNLOAD_URL} target="_blank" rel="noopener noreferrer">
                Download for Windows
              </a>
            ) : (
              <span className="dl-button dl-button-disabled" aria-disabled="true">
                Windows: coming soon
              </span>
            )}
          </div>
          <p className="dl-meta">
            Apple silicon (arm64) · macOS 12 or later · Version {version}
          </p>
          <p className="dl-note">
            A browser cannot open files on your computer or run the terminal, so the editor is available only in the
            desktop app.
          </p>
        </section>

        <section className="dl-section" aria-labelledby="dl-install">
          <h2 id="dl-install">Install in three steps</h2>
          <ol className="dl-steps">
            {INSTALL_STEPS.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>

        <section className="dl-section" aria-labelledby="dl-features">
          <h2 id="dl-features">What is inside</h2>
          <div className="dl-grid">
            {FEATURES.map((feature) => (
              <article className="dl-card" key={feature.title}>
                <h3>{feature.title}</h3>
                <p>{feature.body}</p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="dl-footer">
        <span>© 2026 CoreMind Authors · MIT License</span>
        <a href={SOURCE_URL} target="_blank" rel="noopener noreferrer">
          github.com/NVIDIA-CoreMind/CoreMind-Application
        </a>
      </footer>
    </div>
  );
}
