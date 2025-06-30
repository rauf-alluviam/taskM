import React, { useState, useRef, useEffect } from 'react';
import { FaMicrophone, FaStop, FaTrash, FaPlayCircle, FaPauseCircle } from 'react-icons/fa';

interface VoiceEnabledDescriptionProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  disabled?: boolean;
  onVoiceNoteAdded?: () => void; // Callback when a voice note is added
}

const VoiceEnabledDescription: React.FC<VoiceEnabledDescriptionProps> = ({
  value,
  onChange,
  placeholder = "Enter description...",
  rows = 4,
  className = "",
  disabled = false,
  onVoiceNoteAdded
}) => {
  // Voice recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Handle recording start
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/wav",
        });
        setAudioBlob(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      alert("Please allow microphone access to record voice notes");
    }
  };

  // Handle recording stop
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      setIsRecording(false);
    }
  };

  // Reset recording data
  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
    setIsRecording(false);
    setRecordingTime(0);
    setAudioBlob(null);
  };

  // Handle playing/pausing audio
  const togglePlayPause = () => {
    if (!audioBlob) return;

    if (!audioPlayerRef.current) {
      const audioUrl = URL.createObjectURL(audioBlob);
      audioPlayerRef.current = new Audio(audioUrl);
      audioPlayerRef.current.addEventListener("ended", () => {
        setIsPlaying(false);
      });
    }

    if (isPlaying) {
      audioPlayerRef.current.pause();
      setIsPlaying(false);
    } else {
      audioPlayerRef.current.play();
      setIsPlaying(true);
    }
  };

  // Add voice note to description
  const addVoiceNoteToDescription = () => {
    if (audioBlob) {
      const timestamp = new Date().toLocaleString();
      const voiceNoteText = `\n\n[🎤 Voice Note recorded at ${timestamp}]\n`;
      const newValue = value + voiceNoteText;
      onChange(newValue);
      
      // Call the callback to notify that a voice note was added
      if (onVoiceNoteAdded) {
        onVoiceNoteAdded();
      }
      
      // Reset recording state
      setAudioBlob(null);
      setRecordingTime(0);
      
      // Focus back to textarea
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newValue.length, newValue.length);
      }
    }
  };

  // Format recording time
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? "0" : ""}${remainingSeconds}`;
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        URL.revokeObjectURL(audioPlayerRef.current.src);
      }
    };
  }, []);

  return (
    <div className="space-y-3">
      {/* Main textarea */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className={`input w-full pr-12 ${className}`}
          disabled={disabled || isRecording}
        />
        
        {/* Voice recording button */}
        <button
          type="button"
          onClick={startRecording}
          disabled={disabled || isRecording || !!audioBlob}
          className="absolute right-3 top-3 p-1 text-gray-500 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Record voice note"
        >
          <FaMicrophone size={16} />
        </button>
      </div>

      {/* Recording indicator */}
      {isRecording && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="animate-pulse w-2 h-2 bg-red-500 rounded-full"></div>
            <span className="text-red-600 font-medium text-sm">
              Recording... {formatTime(recordingTime)}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={cancelRecording}
              className="p-1 text-red-600 hover:bg-red-100 rounded-full"
              title="Cancel recording"
            >
              <FaTrash size={14} />
            </button>
            <button
              type="button"
              onClick={stopRecording}
              className="p-1 text-red-600 hover:bg-red-100 rounded-full"
              title="Stop recording"
            >
              <FaStop size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Recorded audio preview */}
      {audioBlob && !isRecording && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={togglePlayPause}
              className="text-blue-600 hover:text-blue-700"
            >
              {isPlaying ? (
                <FaPauseCircle size={16} />
              ) : (
                <FaPlayCircle size={16} />
              )}
            </button>
            <span className="text-blue-600 font-medium text-sm">
              Voice note recorded ({formatTime(recordingTime)})
            </span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={cancelRecording}
              className="p-1 text-red-600 hover:bg-red-100 rounded-full"
              title="Discard recording"
            >
              <FaTrash size={14} />
            </button>
            <button
              type="button"
              onClick={addVoiceNoteToDescription}
              className="bg-blue-600 text-white py-1 px-3 rounded-md hover:bg-blue-700 text-sm"
            >
              Add to Description
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VoiceEnabledDescription;
