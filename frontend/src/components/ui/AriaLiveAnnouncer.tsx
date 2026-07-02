'use client';

import { useEffect, useState } from 'react';

// A simple global announcer store
type AnnouncerFn = (msg: string) => void;
let announceFn: AnnouncerFn | null = null;

export function announceToScreenReader(message: string) {
  if (announceFn) {
    announceFn(message);
  }
}

export function AriaLiveAnnouncer() {
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    announceFn = (msg: string) => {
      setAnnouncement(msg);
      // Clear after a short delay so the same message can be announced again if needed
      setTimeout(() => setAnnouncement(''), 3000);
    };
    return () => {
      announceFn = null;
    };
  }, []);

  return (
    <div 
      aria-live="polite" 
      aria-atomic="true" 
      className="sr-only"
      style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' }}
    >
      {announcement}
    </div>
  );
}
