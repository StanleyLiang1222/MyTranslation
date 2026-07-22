/**
 * Speaks an English word utilizing native browser-based Speech Synthesis.
 */
export function speakWord(word: string): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    console.warn("Speech synthesis is not supported in this browser environment.");
    return;
  }

  try {
    // Cancel any ongoing speech to prevent overlapping sounds
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = "en-US";
    utterance.rate = 0.85; // Slightly measured rate to assist learning phonetics
    utterance.pitch = 1.0;

    // Retrieve voices and optimize for high-quality English
    let voices = window.speechSynthesis.getVoices();
    
    const findVoice = () => {
      return (
        voices.find((v) => v.lang === "en-US" && (v.name.includes("Google") || v.name.includes("Natural"))) ||
        voices.find((v) => v.lang.startsWith("en-US")) ||
        voices.find((v) => v.lang.startsWith("en"))
      );
    };

    const voice = findVoice();
    if (voice) {
      utterance.voice = voice;
    }

    // Speak!
    window.speechSynthesis.speak(utterance);
  } catch (error) {
    console.error("Speech synthesis failed:", error);
  }
}
