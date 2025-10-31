// PumpkinOverlay.jsx (frissített audio rész és lejátszás logika)
import React, { useEffect, useRef, useState } from 'react';
import './pumpkin.css';
import { usePumpkins } from './PumpkinContext.jsx';

export const PumpkinOverlay = () => {
  const { showPumpkins, muted, setMuted } = usePumpkins();
  const audioRef = useRef(null);
  const [pumpkins, setPumpkins] = useState([]);

  useEffect(() => {
    if (!showPumpkins) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      setPumpkins([]);
      return;
    }

    const spawn = Array.from({ length: 8 }).map(() => ({
      left: Math.random() * 100,
      top: Math.random() * 100,
      scale: 0.7 + Math.random() * 0.9,
      delay: Math.random() * 0.8,
      id: Math.random().toString(36).slice(2),
    }));
    setPumpkins(spawn);

    const audio = audioRef.current;
    if (!audio) return;

    audio.loop = true;
    audio.preload = 'auto';
    audio.muted = muted;

    // Fallback: több source (mp3, wav). Ha egyik se megy, a catch feltárja.
    const tryPlay = () => {
      const p = audio.play();
      if (p && typeof p.catch === 'function') {
        p.catch(err => {
          console.debug('Pumpkin audio play() rejected:', err);
          // Ha a play blokkolva van, várjuk a felhasználói gesztust
          const resume = () => {
            // próbáljuk meg újra user gesture után
            audio.play().catch(e => console.warn('Pumpkin audio resume failed:', e));
            document.removeEventListener('pointerdown', resume);
          };
          document.addEventListener('pointerdown', resume, { once: true, passive: true });
        });
      }
    };

    // Ellenőrizzük, hogy a források léteznek-e és a böngésző le tudja-e játszani őket
    const canPlayMp3 = audio.canPlayType('audio/mpeg');
    const canPlayWav = audio.canPlayType('audio/wav');

    // logoljunk, ha egyik sem támogatott — segít debugolni
    if (!canPlayMp3 && !canPlayWav) {
      console.warn('PumpkinOverlay: browser claims it cannot play mp3 or wav:', { canPlayMp3, canPlayWav });
    }

    // próbáljuk elindítani
    tryPlay();

    return () => {
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
      setPumpkins([]);
    };
  }, [showPumpkins, muted]);

  if (!showPumpkins) return null;

  return (
    <div className="global-pumpkin-overlay" aria-hidden="true">
      {pumpkins.map(p => (
        <div
          key={p.id}
          className="global-pumpkin"
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            transform: `translate(-50%, -50%) scale(${p.scale})`,
            animationDelay: `${p.delay}s`
          }}
        >
          🎃
        </div>
      ))}

      <button
        className="global-pumpkin-mute"
        onClick={(e) => { e.stopPropagation(); setMuted(prev => !prev); if (audioRef.current) { if (!muted) audioRef.current.pause(); else audioRef.current.play().catch(()=>{});} }}
        title={muted ? 'Unmute' : 'Mute'}
      >
        {muted ? '🔇' : '🔊'}
      </button>

      {/* több source fallback: előbb mp3, majd wav */}
      <audio ref={audioRef} style={{ display: 'none' }}>
        <source src="/sounds/halloween_cackle.mp3" type="audio/mpeg" />
        <source src="/sounds/halloween_cackle.wav" type="audio/wav" />
        {/* Ha a szervered más néven szolgálja, módosítsd a src-eket */}
      </audio>
    </div>
  );
};
