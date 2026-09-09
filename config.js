// ============================================================
// config.js — Eswaramma High School Class of '99 Reunion
// UPDATE these values before deployment!
// ============================================================

const CONFIG = {
  // ⚙️ Step 1: Paste your Google Apps Script Web App URL here after deployment
  API_URL: "https://script.google.com/macros/s/AKfycbzxBCfq9Mo2t_EDFV9Kfjpb7NEIF2iciInJmYdOGGLhr28PFIsM_d5vdAekKsg477DTNw/exec",

  // ⚙️ Step 2: Paste your GitHub Pages URL here after publishing
  SITE_URL: "https://manu220883.github.io/reunion99",

  // Event info
  SCHOOL_NAME: "Eswaramma High School",
  BATCH: "Class of 1999",
  REUNION_YEAR: 2026,

  // ⚙️ Step 3: Update this to the confirmed reunion date once voting is complete
  // Format: ISO 8601 — "YYYY-MM-DDTHH:mm:ss"
  COUNTDOWN_DATE: "2026-11-21T10:00:00",

  // ⚙️ Nostalgic background music — YouTube video or playlist ID
  // Change to any YouTube video ID for a different song
  // Empty string "" disables the music player
  MUSIC_YOUTUBE_ID: "5UfA_hGRGz0",  // Raktha Sambandhagala — Jolly Days (Kannada, 1999 era)

  // WhatsApp message template — {URL} is replaced with SITE_URL automatically
  WHATSAPP_MESSAGE:
    "Hey! We're bringing the Eswaramma High School Class of '99 together! 🎓❤️\n\n" +
    "We're planning our reunion in November 2026.\n\n" +
    "Vote for the location and date here:\n\n{URL}\n\n" +
    "Come on... let's make this reunion unforgettable! ❤️",
};
