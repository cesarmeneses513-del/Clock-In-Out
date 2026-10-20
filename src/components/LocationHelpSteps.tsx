import React from 'react';

const isAppleDevice =
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
