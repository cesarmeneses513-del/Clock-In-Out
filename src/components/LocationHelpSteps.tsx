import React from 'react';

export const isAppleDevice =
  typeof navigator !== 'undefined' &&
  (/iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

// How to turn location on (a web page cannot open the phone's Settings itself)
export const LocationHelpSteps: React.FC = () =>
  isAppleDevice ? (
    <ol className="list-decimal pl-5 space-y-2 text-xs text-slate-800 font-medium">
      <li>
        Open <strong>Settings</strong> → <strong>Privacy &amp; Security</strong> →{' '}
        <strong>Location Services</strong> and make sure it is <strong>On</strong>.
      </li>
      <li>
        In the same screen open <strong>Safari Websites</strong> and choose{' '}
        <strong>While Using the App</strong> (keep <strong>Precise Location</strong> on).
      </li>
      <li>
        Back in Safari, tap <strong>aA</strong> in the address bar → <strong>Website Settings</strong> →{' '}
        <strong>Location</strong> → <strong>Allow</strong>.
      </li>
      <li>Return here and pull the screen down to refresh.</li>
    </ol>
  ) : (
    <ol className="list-decimal pl-5 space-y-2 text-xs text-slate-800 font-medium">
      <li>
        Make sure the phone's <strong>Location</strong> is on (swipe down from the top of the screen).
      </li>
      <li>
        In Chrome, tap the icon to the left of the address → <strong>Permissions</strong> →{' '}
        <strong>Location</strong> → <strong>Allow</strong>.
      </li>
      <li>Return here and pull the screen down to refresh.</li>
    </ol>
  );

// iPhone asks for location every time unless Safari websites are allowed "While Using the App"
export const StopAskingSteps: React.FC = () => (
  <details className="text-xs text-slate-700">
    <summary className="font-bold text-blue-700 cursor-pointer">Does your iPhone ask every time you open the app?</summary>
    <ol className="list-decimal pl-5 space-y-1.5 mt-2 font-medium">
      <li>
        Open <strong>Settings</strong> → <strong>Privacy &amp; Security</strong> → <strong>Location Services</strong>.
      </li>
      <li>
        Scroll down to <strong>Safari Websites</strong> and choose <strong>While Using the App</strong> (keep{' '}
        <strong>Precise Location</strong> on).
      </li>
      <li>
        Optional: <strong>Settings</strong> → <strong>Apps</strong> → <strong>Safari</strong> → <strong>Location</strong> →{' '}
        <strong>Allow</strong>.
      </li>
    </ol>
    <p className="mt-1.5">It stays allowed until you change it there.</p>
  </details>
);
