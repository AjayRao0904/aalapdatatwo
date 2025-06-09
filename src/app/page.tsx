"use client";
export const runtime = "nodejs";

import React, { useState, useRef, useEffect } from "react";

interface AudioPair {
  id: string;
  sfx_id: string;
  music_id: string;
}

interface AudioResponse {
  sfx_id: string;
  music_id: string;
  timestamp: number;
}

const HomePage = () => {
  const [availablePairs, setAvailablePairs] = useState<AudioPair[]>([]);
  const [currentPair, setCurrentPair] = useState<AudioPair | null>(null);
  const [sliderValue, setSliderValue] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timestamp, setTimestamp] = useState(0);
  const [sfxUrl, setSfxUrl] = useState("");
  const [musicUrl, setMusicUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const soundEffectRef = useRef<HTMLAudioElement | null>(null);

  // Fetch available audio pairs on component mount
  useEffect(() => {
    fetchAvailablePairs();
  }, []);

  const fetchAvailablePairs = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/available-pairs');
      if (!res.ok) throw new Error('Failed to fetch available pairs');
      
      const data = await res.json();
      setAvailablePairs(data.pairs);
      
      // Set the first pair as current if available
      if (data.pairs.length > 0) {
        setCurrentPair(data.pairs[0]);
      }
    } catch (error) {
      console.error('Error fetching available pairs:', error);
      setError('Failed to load audio pairs');
    } finally {
      setLoading(false);
    }
  };

  // Fetch audio files when current pair changes
  useEffect(() => {
    if (currentPair) {
      fetchAudioFiles(currentPair);
    }
  }, [currentPair]);

  const fetchAudioFiles = async (pair: AudioPair) => {
    try {
      setLoading(true);
      setError("");
      
      // Cleanup previous blob URLs
      if (sfxUrl) URL.revokeObjectURL(sfxUrl);
      if (musicUrl) URL.revokeObjectURL(musicUrl);
      
      const res = await fetch(`/api/audio?sfx_id=${pair.sfx_id}&music_id=${pair.music_id}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'API fetch failed');
      }

      const data = await res.json();

      // Create blobs with correct MIME types
      const sfxBlob = new Blob(
        [Uint8Array.from(atob(data.sfx), (c) => c.charCodeAt(0))],
        { type: "audio/mpeg" } // SFX files are .mp3
      );
      const musicBlob = new Blob(
        [Uint8Array.from(atob(data.music), (c) => c.charCodeAt(0))],
        { type: "audio/wav" } // Music files are .wav
      );

      setSfxUrl(URL.createObjectURL(sfxBlob));
      setMusicUrl(URL.createObjectURL(musicBlob));
      
      // Reset player state
      setSliderValue(0);
      setTimestamp(0);
      setIsPlaying(false);
    } catch (error) {
      console.error("Error fetching audio files:", error);
      setError(error instanceof Error ? error.message : 'Failed to load audio files');
    } finally {
      setLoading(false);
    }
  };

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      if (sfxUrl) URL.revokeObjectURL(sfxUrl);
      if (musicUrl) URL.revokeObjectURL(musicUrl);
    };
  }, [sfxUrl, musicUrl]);

  const handleNextPair = () => {
    if (!currentPair) return;
    
    const currentIndex = availablePairs.findIndex(pair => pair.id === currentPair.id);
    const nextIndex = (currentIndex + 1) % availablePairs.length;
    setCurrentPair(availablePairs[nextIndex]);
  };

  const handlePreviousPair = () => {
    if (!currentPair) return;
    
    const currentIndex = availablePairs.findIndex(pair => pair.id === currentPair.id);
    const prevIndex = currentIndex === 0 ? availablePairs.length - 1 : currentIndex - 1;
    setCurrentPair(availablePairs[prevIndex]);
  };

  // Update slider to seek audio position
  const handleSliderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(event.target.value);
    setSliderValue(value);
    if (audioRef.current && audioRef.current.duration) {
      const time = (value / 100) * audioRef.current.duration;
      audioRef.current.currentTime = time;
      setTimestamp(time);
    }
  };

  // Keep slider in sync with audio playback
  const handleAudioTimeUpdate = () => {
    if (audioRef.current && audioRef.current.duration) {
      const progress = (audioRef.current.currentTime / audioRef.current.duration) * 100;
      setSliderValue(progress);
      setTimestamp(audioRef.current.currentTime);
    }
  };

  const toggleAudioPlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const playSoundEffect = () => {
    if (soundEffectRef.current) {
      soundEffectRef.current.currentTime = 0;
      soundEffectRef.current.play();
    }
  };

  const handleSubmit = async () => {
    if (!currentPair) return;
    
    try {
      setSubmitting(true);
      const response: AudioResponse = {
        sfx_id: currentPair.sfx_id,
        music_id: currentPair.music_id,
        timestamp
      };

      const res = await fetch('/api/submit-response', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(response),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to submit response');
      }

      // Remove the submitted pair from available pairs
      setAvailablePairs(prev => prev.filter(pair => pair.id !== currentPair.id));
      
      // Move to next pair
      handleNextPair();
      
      alert("Response submitted successfully!");
    } catch (error) {
      console.error("Error submitting response:", error);
      alert(error instanceof Error ? error.message : "Failed to submit response");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !currentPair) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="text-white text-xl">Loading audio pairs...</div>
      </div>
    );
  }

  if (availablePairs.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="text-white text-xl">No more audio pairs to rate!</div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-screen bg-black">
      <div className="bg-gray-800 p-6 rounded-lg shadow-lg w-[600px]">
        {/* Header with pair info and navigation */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-white text-xl font-bold">
            Audio Pair {currentPair?.id}
          </h1>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePreviousPair}
              className="bg-gray-600 text-white py-2 px-3 rounded"
              disabled={availablePairs.length <= 1}
            >
              ←
            </button>
            <span className="text-white text-sm">
              {availablePairs.findIndex(pair => pair.id === currentPair?.id) + 1} / {availablePairs.length}
            </span>
            <button
              onClick={handleNextPair}
              className="bg-gray-600 text-white py-2 px-3 rounded"
              disabled={availablePairs.length <= 1}
            >
              →
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-600 text-white p-3 rounded mb-4">
            {error}
          </div>
        )}

        <h2 className="text-white text-lg mb-4">Sound Effect</h2>
        <button
          onClick={playSoundEffect}
          className="bg-orange-500 text-white py-2 px-4 rounded mb-6"
          disabled={loading || !sfxUrl}
        >
          {loading ? 'Loading...' : 'Play Sound Effect'}
        </button>

        {/* Only render audio if src is available */}
        {sfxUrl && (
          <audio ref={soundEffectRef} src={sfxUrl} />
        )}

        <h2 className="text-white text-lg mb-4">Music Track</h2>
        <div className="flex items-center">
          <button
            onClick={toggleAudioPlay}
            className="bg-orange-500 text-white py-2 px-4 rounded"
            disabled={loading || !musicUrl}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>
          <div className="flex-grow mx-4 bg-gray-700 h-10 rounded relative">
            <div
              className="absolute top-0 left-0 h-full bg-orange-500"
              style={{ width: `${sliderValue}%` }}
            />
            {/* Slider overlays the audio bar */}
            <input
              type="range"
              min="0"
              max="100"
              value={sliderValue}
              onChange={handleSliderChange}
              className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
              disabled={loading}
            />
            {/* Timestamp marker */}
            <div
              className="absolute top-[-20px] text-white text-sm"
              style={{ left: `${sliderValue}%`, transform: 'translateX(-50%)' }}
            >
              {timestamp.toFixed(2)}s
            </div>
          </div>
        </div>

        {/* Only render audio if src is available */}
        {musicUrl && (
          <audio 
            ref={audioRef} 
            src={musicUrl}
            onTimeUpdate={handleAudioTimeUpdate}
          />
        )}

        <button
          onClick={handleSubmit}
          className="bg-orange-500 text-white py-2 px-4 rounded mt-6 w-full"
          disabled={loading || submitting || !currentPair}
        >
          {submitting ? 'Submitting...' : `Submit Response (${timestamp.toFixed(2)}s)`}
        </button>
      </div>
    </div>
  );
};

export default HomePage;
