import React, { useState, useRef, useEffect } from 'react';
import { FaMicrophone, FaStop, FaTrash, FaPlayCircle, FaPauseCircle, FaEdit, FaCheck, FaTimes, FaCloudUploadAlt } from 'react-icons/fa';

interface VoiceAttachment {
  id: string;
  name: string;
  url: string;
  duration: number;
  size: number;
  uploadedAt: Date;
}

interface VoiceEnabledDescriptionProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  disabled?: boolean;
  voiceAttachments?: VoiceAttachment[];
  onVoiceAttachmentAdd?: (attachment: VoiceAttachment) => void;
  onVoiceAttachmentDelete?: (attachmentId: string) => void;
  onVoiceAttachmentRename?: (attachmentId: string, newName: string) => void;
  taskId?: string; // Required for uploading voice attachments
}

const VoiceEnabledDescription: React.FC<VoiceEnabledDescriptionProps> = ({
  value,
  onChange,
  placeholder = "Enter description...",
  rows = 4,
  className = "",
  disabled = false,
  voiceAttachments = [],
  onVoiceAttachmentAdd,
  onVoiceAttachmentDelete,
  onVoiceAttachmentRename,
  taskId
}) => {
  // Voice recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [recordingName, setRecordingName] = useState('');
  const [isNaming, setIsNaming] = useState(false);
  const [editingAttachment, setEditingAttachment] = useState<string | null>(null);
  const [newAttachmentName, setNewAttachmentName] = useState('');
  const [waveformData, setWaveformData] = useState<number[]>(Array(32).fill(0));
  const [currentPlayingId, setCurrentPlayingId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [attachmentToDelete, setAttachmentToDelete] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const animationRef = useRef<number | null>(null);
  const progressUpdateRef = useRef<number | null>(null);

  // Handle recording start
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Set up audio context for waveform visualization
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      
      analyserRef.current.fftSize = 1024;
      analyserRef.current.smoothingTimeConstant = 0.3;
      analyserRef.current.minDecibels = -90;
      analyserRef.current.maxDecibels = -10;
      const bufferLength = analyserRef.current.frequencyBinCount;
      dataArrayRef.current = new Uint8Array(bufferLength);
      
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
        
        // Stop audio context
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close();
        }
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingName('');
      
      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
      
      // Start waveform animation
      animateWaveform();
    } catch (error) {
      console.error("Error accessing microphone:", error);
      // You could add a notification here instead of alert
    }
  };

  // Animate waveform during recording
  const animateWaveform = () => {
    if (!analyserRef.current || !dataArrayRef.current || !isRecording) return;
    
    analyserRef.current.getByteFrequencyData(dataArrayRef.current);
    
    // Create more responsive waveform with real voice detection
    const barCount = 32;
    const newWaveformData: number[] = [];
    
    // Calculate overall audio level for the pulsing effect
    let totalLevel = 0;
    let maxLevel = 0;
    
    // Group frequency data into bars with better voice frequency focus
    for (let i = 0; i < barCount; i++) {
      // Focus on human voice frequencies (85Hz - 8kHz range)
      const startFreq = 85 + (i / barCount) * 8000;
      const endFreq = 85 + ((i + 1) / barCount) * 8000;
      
      // Map frequencies to array indices
      const startIndex = Math.floor((startFreq / 22050) * dataArrayRef.current.length);
      const endIndex = Math.floor((endFreq / 22050) * dataArrayRef.current.length);
      
      // Calculate average amplitude for this frequency range
      let sum = 0;
      let count = 0;
      for (let j = startIndex; j < Math.min(endIndex, dataArrayRef.current.length); j++) {
        sum += dataArrayRef.current[j];
        count++;
      }
      
      const average = count > 0 ? sum / count : 0;
      
      // Apply logarithmic scaling for better visual response
      const scaledValue = Math.pow(average / 255, 0.7) * 255;
      
      // Add some smoothing and minimum height
      const finalValue = Math.max(2, scaledValue * 1.5);
      
      newWaveformData.push(Math.min(255, finalValue));
      totalLevel += average;
      maxLevel = Math.max(maxLevel, average);
    }
    
    // Set overall audio level for pulsing animation
    setAudioLevel(totalLevel / barCount);
    setWaveformData(newWaveformData);
    
    // Continue animation
    animationRef.current = requestAnimationFrame(animateWaveform);
  };

  // Handle recording stop
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      setIsRecording(false);
      setIsNaming(true);
      setWaveformData(Array(32).fill(0));
      setAudioLevel(0);
    }
  };

  // Reset recording data
  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }
    setIsRecording(false);
    setRecordingTime(0);
    setAudioBlob(null);
    setIsNaming(false);
    setRecordingName('');
    setWaveformData(Array(32).fill(0));
    setAudioLevel(0);
  };

  // Handle playing/pausing audio for attachments
  const toggleAttachmentPlayPause = (attachment: VoiceAttachment) => {
    if (currentPlayingId === attachment.id) {
      // Stop current playing audio
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        if (progressUpdateRef.current) {
          cancelAnimationFrame(progressUpdateRef.current);
        }
      }
      setCurrentPlayingId(null);
      setAudioProgress(0);
    } else {
      // Start playing new audio
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        if (progressUpdateRef.current) {
          cancelAnimationFrame(progressUpdateRef.current);
        }
      }
      
      const audio = new Audio(attachment.url);
      audioPlayerRef.current = audio;
      
      audio.addEventListener("loadedmetadata", () => {
        setAudioDuration(audio.duration);
      });
      
      audio.addEventListener("ended", () => {
        setCurrentPlayingId(null);
        setAudioProgress(0);
        if (progressUpdateRef.current) {
          cancelAnimationFrame(progressUpdateRef.current);
        }
      });
      
      // Update progress during playback
      const updateProgress = () => {
        if (audioPlayerRef.current && !isDragging && 
            audioPlayerRef.current.duration && 
            isFinite(audioPlayerRef.current.duration)) {
          const progress = (audioPlayerRef.current.currentTime / audioPlayerRef.current.duration) * 100;
          setAudioProgress(isNaN(progress) ? 0 : Math.max(0, Math.min(100, progress)));
        }
        if (currentPlayingId === attachment.id) {
          progressUpdateRef.current = requestAnimationFrame(updateProgress);
        }
      };
      
      audio.play();
      setCurrentPlayingId(attachment.id);
      setAudioProgress(0);
      updateProgress();
    }
  };

  // Handle playing/pausing preview audio
  const togglePlayPause = () => {
    if (!audioBlob) return;

    if (!audioPlayerRef.current) {
      const audioUrl = URL.createObjectURL(audioBlob);
      audioPlayerRef.current = new Audio(audioUrl);
      
      audioPlayerRef.current.addEventListener("loadedmetadata", () => {
        setAudioDuration(audioPlayerRef.current!.duration);
      });
      
      audioPlayerRef.current.addEventListener("ended", () => {
        setIsPlaying(false);
        setAudioProgress(0);
        if (progressUpdateRef.current) {
          cancelAnimationFrame(progressUpdateRef.current);
        }
      });
    }

    if (isPlaying) {
      audioPlayerRef.current.pause();
      setIsPlaying(false);
      if (progressUpdateRef.current) {
        cancelAnimationFrame(progressUpdateRef.current);
      }
    } else {
      audioPlayerRef.current.play();
      setIsPlaying(true);
      
      // Update progress during playback
      const updateProgress = () => {
        if (audioPlayerRef.current && !isDragging && 
            audioPlayerRef.current.duration && 
            isFinite(audioPlayerRef.current.duration)) {
          const progress = (audioPlayerRef.current.currentTime / audioPlayerRef.current.duration) * 100;
          setAudioProgress(isNaN(progress) ? 0 : Math.max(0, Math.min(100, progress)));
        }
        if (isPlaying) {
          progressUpdateRef.current = requestAnimationFrame(updateProgress);
        }
      };
      updateProgress();
    }
  };

  // Handle seek bar interaction
  const handleSeekBarClick = (e: React.MouseEvent<HTMLDivElement>, attachment?: VoiceAttachment) => {
    if (!audioPlayerRef.current) return;
    
    // Check if audio is loaded and has valid duration
    if (!audioPlayerRef.current.duration || 
        !isFinite(audioPlayerRef.current.duration) || 
        isNaN(audioPlayerRef.current.duration) ||
        audioPlayerRef.current.duration <= 0) {
      return;
    }
    
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (clickX / rect.width) * 100));
    const newTime = (percentage / 100) * audioPlayerRef.current.duration;
    
    // Additional validation for the calculated time
    if (isFinite(newTime) && !isNaN(newTime) && newTime >= 0 && newTime <= audioPlayerRef.current.duration) {
      audioPlayerRef.current.currentTime = newTime;
      setAudioProgress(percentage);
    }
  };

  // Handle seek bar drag
  const handleSeekBarMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioPlayerRef.current || 
        !audioPlayerRef.current.duration || 
        !isFinite(audioPlayerRef.current.duration)) {
      return;
    }
    setIsDragging(true);
    handleSeekBarClick(e);
  };

  const handleSeekBarMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !audioPlayerRef.current || 
        !audioPlayerRef.current.duration || 
        !isFinite(audioPlayerRef.current.duration)) {
      return;
    }
    handleSeekBarClick(e);
  };

  const handleSeekBarMouseUp = () => {
    setIsDragging(false);
  };

  // Upload voice note to S3 as attachment
  const uploadVoiceAttachment = async () => {
    if (!audioBlob || !recordingName.trim() || !taskId) {
      console.error('Missing required data for upload:', { audioBlob: !!audioBlob, recordingName, taskId });
      return;
    }

    setIsUploading(true);
    try {
      // Use recorded time as primary duration since it's most reliable
      let audioDuration = recordingTime;
      
      // Try to get actual audio duration as validation, but don't rely on it
      try {
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        
        const actualDuration = await new Promise<number>((resolve) => {
          const timeout = setTimeout(() => {
            URL.revokeObjectURL(audioUrl);
            resolve(recordingTime); // Fallback to recorded time
          }, 2000); // Reduced timeout to 2 seconds
          
          audio.addEventListener('loadedmetadata', () => {
            clearTimeout(timeout);
            URL.revokeObjectURL(audioUrl);
            const duration = audio.duration;
            // Only use actual duration if it's valid and reasonable
            if (duration && isFinite(duration) && !isNaN(duration) && duration > 0 && duration < 3600) {
              resolve(Math.round(duration));
            } else {
              resolve(recordingTime);
            }
          });
          
          audio.addEventListener('error', () => {
            clearTimeout(timeout);
            URL.revokeObjectURL(audioUrl);
            resolve(recordingTime);
          });
          
          // Try to load the audio
          audio.load();
        });
        
        // Use actual duration if it seems reasonable, otherwise stick with recorded time
        if (actualDuration > 0 && Math.abs(actualDuration - recordingTime) < 5) {
          audioDuration = actualDuration;
        }
      } catch (durationError) {
        console.log('Could not calculate audio duration, using recorded time:', durationError);
        // audioDuration is already set to recordingTime
      }

      // Create form data for upload
      const formData = new FormData();
      formData.append('file', audioBlob, `${recordingName}.wav`);
      formData.append('attachedTo', 'task');
      formData.append('attachedToId', taskId);
      formData.append('description', `Voice note: ${recordingName}`);

      // Upload to server/S3 using existing attachments endpoint
      const response = await fetch(`${(import.meta as any).env.VITE_API_URL}/attachments/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Upload failed');
      }

      const result = await response.json();
      const uploadedAttachment = result.attachment;
      
      // Create attachment object for local state
      const attachment: VoiceAttachment = {
        id: uploadedAttachment._id,
        name: recordingName,
        url: uploadedAttachment.url,
        duration: audioDuration,
        size: audioBlob.size,
        uploadedAt: new Date(uploadedAttachment.createdAt),
      };

      // Notify parent component
      if (onVoiceAttachmentAdd) {
        onVoiceAttachmentAdd(attachment);
      }

      // Reset recording state
      setAudioBlob(null);
      setRecordingTime(0);
      setRecordingName('');
      setIsNaming(false);
      
    } catch (error) {
      console.error('Error uploading voice attachment:', error);
      // You could add a notification here instead of alert
    } finally {
      setIsUploading(false);
    }
  };

  // Handle attachment renaming
  const handleRenameAttachment = (attachmentId: string) => {
    const attachment = voiceAttachments.find(a => a.id === attachmentId);
    if (attachment) {
      setEditingAttachment(attachmentId);
      setNewAttachmentName(attachment.name);
    }
  };

  // Save renamed attachment
  const saveAttachmentRename = async (attachmentId: string) => {
    if (!newAttachmentName.trim()) return;

    try {
      const response = await fetch(`${(import.meta as any).env.VITE_API_URL}/attachments/${attachmentId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ description: `Voice note: ${newAttachmentName.trim()}` }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Rename failed');
      }

      // Update local state
      if (onVoiceAttachmentRename) {
        onVoiceAttachmentRename(attachmentId, newAttachmentName.trim());
      }
    } catch (error) {
      console.error('Error renaming attachment:', error);
      // You could add a notification here instead of alert
    }

    setEditingAttachment(null);
    setNewAttachmentName('');
  };

  // Cancel attachment rename
  const cancelAttachmentRename = () => {
    setEditingAttachment(null);
    setNewAttachmentName('');
  };

  // Delete attachment
  const deleteAttachment = async (attachmentId: string) => {
    setAttachmentToDelete(attachmentId);
    setShowDeleteDialog(true);
  };

  // Confirm delete attachment
  const confirmDeleteAttachment = async () => {
    if (!attachmentToDelete) return;

    try {
      const response = await fetch(`${(import.meta as any).env.VITE_API_URL}/attachments/${attachmentToDelete}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Delete failed');
      }

      // Update local state
      if (onVoiceAttachmentDelete) {
        onVoiceAttachmentDelete(attachmentToDelete);
      }
    } catch (error) {
      console.error('Error deleting attachment:', error);
      // You could add a notification here instead of alert
    } finally {
      setShowDeleteDialog(false);
      setAttachmentToDelete(null);
    }
  };

  // Cancel delete
  const cancelDelete = () => {
    setShowDeleteDialog(false);
    setAttachmentToDelete(null);
  };

  // Format recording time
  const formatTime = (seconds: number) => {
    // Handle invalid or infinite numbers
    if (!seconds || !isFinite(seconds) || isNaN(seconds)) {
      return "0:00";
    }
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
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
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (progressUpdateRef.current) {
        cancelAnimationFrame(progressUpdateRef.current);
      }
    };
  }, []);

  // Add global mouse event listeners for seek bar dragging
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mouseup', handleGlobalMouseUp);
      return () => document.removeEventListener('mouseup', handleGlobalMouseUp);
    }
  }, [isDragging]);

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

      {/* Recording indicator with waveform */}
      {isRecording && (
        <div className="bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div 
                className="w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-lg"
                style={{
                  boxShadow: `0 0 ${8 + (audioLevel / 255) * 12}px rgba(239, 68, 68, 0.6)`
                }}
              ></div>
              <div className="flex flex-col">
                <span className="text-red-600 font-semibold text-sm">
                  Recording...
                </span>
                <span className="text-red-500 text-xs font-mono">
                  {formatTime(recordingTime)}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={cancelRecording}
                className="p-2 text-red-600 hover:bg-red-100 rounded-full transition-colors duration-200 shadow-sm hover:shadow-md"
                title="Cancel recording"
              >
                <FaTrash size={14} />
              </button>
              <button
                type="button"
                onClick={stopRecording}
                className="p-2 text-red-600 hover:bg-red-100 rounded-full transition-colors duration-200 shadow-sm hover:shadow-md"
                title="Stop recording"
              >
                <FaStop size={14} />
              </button>
            </div>
          </div>
          
          {/* Enhanced waveform visualization */}
          <div className="relative">
            {/* Background glow effect */}
            <div 
              className="absolute inset-0 bg-gradient-to-r from-red-200 to-pink-200 rounded-lg opacity-30 blur-sm"
              style={{
                transform: `scale(${1 + (audioLevel / 255) * 0.1})`,
                transition: 'transform 0.1s ease-out'
              }}
            ></div>
            
            {/* Main waveform container */}
            <div className="relative bg-white/50 backdrop-blur-sm rounded-lg p-3 border border-red-100">
              <div className="flex items-center justify-center gap-0.5 h-12 overflow-hidden">
                {waveformData.map((value, index) => {
                  const height = Math.max(3, (value / 255) * 48);
                  const intensity = value / 255;
                  
                  return (
                    <div
                      key={index}
                      className="bg-gradient-to-t from-red-500 to-pink-400 rounded-full transition-all duration-75 ease-out"
                      style={{
                        width: '3px',
                        height: `${height}px`,
                        opacity: 0.7 + intensity * 0.3,
                        transform: `scaleY(${0.2 + intensity * 0.8}) scaleX(${0.8 + intensity * 0.4})`,
                        boxShadow: intensity > 0.3 ? `0 0 ${intensity * 12}px rgba(239, 68, 68, ${intensity * 0.6})` : 'none',
                        animation: intensity > 0.5 ? `pulse 0.3s ease-in-out` : 'none'
                      }}
                    />
                  );
                })}
              </div>
              
              {/* Audio level indicator */}
              <div className="mt-2 flex justify-center">
                <div className="flex items-center gap-1">
                  <span className="text-xs text-red-600 font-medium">Level:</span>
                  <div className="w-20 h-1 bg-red-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-red-400 to-pink-500 rounded-full transition-all duration-100"
                      style={{ width: `${Math.min(100, (audioLevel / 255) * 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Name input for recorded audio */}
      {isNaming && audioBlob && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
          <div className="flex items-center justify-between mb-3">
            <span className="text-blue-600 font-medium text-sm">
              Name your voice note ({formatTime(recordingTime)})
            </span>
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
          </div>
          
          {/* Preview seek bar */}
          {(isPlaying || audioProgress > 0) && (
            <div className="mb-3">
              <div 
                className="w-full h-2 bg-blue-200 rounded-full cursor-pointer relative overflow-hidden"
                onClick={handleSeekBarClick}
                onMouseDown={handleSeekBarMouseDown}
                onMouseMove={handleSeekBarMouseMove}
                onMouseUp={handleSeekBarMouseUp}
                onMouseLeave={handleSeekBarMouseUp}
              >
                <div 
                  className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all duration-100"
                  style={{ width: `${audioProgress}%` }}
                />
                <div 
                  className="absolute top-1/2 w-3 h-3 bg-blue-600 rounded-full shadow-md transform -translate-y-1/2 -translate-x-1/2 cursor-grab active:cursor-grabbing"
                  style={{ left: `${audioProgress}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-blue-600 mt-1">
                <span>{formatTime(isFinite(audioDuration) ? (audioProgress / 100) * audioDuration : 0)}</span>
                <span>{formatTime(isFinite(audioDuration) ? audioDuration : 0)}</span>
              </div>
            </div>
          )}
          
          <div className="flex gap-2">
            <input
              type="text"
              value={recordingName}
              onChange={(e) => setRecordingName(e.target.value)}
              placeholder="Enter voice note name..."
              className="flex-1 px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <button
              type="button"
              onClick={cancelRecording}
              className="px-3 py-1 text-red-600 hover:bg-red-100 rounded-md text-sm"
              title="Discard recording"
            >
              <FaTimes size={14} />
            </button>
            <button
              type="button"
              onClick={uploadVoiceAttachment}
              disabled={!recordingName.trim() || isUploading || !taskId}
              className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            >
              {isUploading ? (
                <>
                  <div className="animate-spin w-3 h-3 border border-white border-t-transparent rounded-full"></div>
                  Uploading...
                </>
              ) : !taskId ? (
                'Task ID Required'
              ) : (
                <>
                  <FaCloudUploadAlt size={14} />
                  Save
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Voice attachments list */}
      {voiceAttachments.length > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Voice Notes</h4>
          <div className="space-y-2">
            {voiceAttachments.map((attachment) => (
              <div key={attachment.id} className="flex items-center justify-between bg-white rounded-md p-2 border">
                <div className="flex items-center gap-2 flex-1">
                  <button
                    type="button"
                    onClick={() => toggleAttachmentPlayPause(attachment)}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    {currentPlayingId === attachment.id ? (
                      <FaPauseCircle size={16} />
                    ) : (
                      <FaPlayCircle size={16} />
                    )}
                  </button>
                  
                  {editingAttachment === attachment.id ? (
                    <div className="flex items-center gap-1 flex-1">
                      <input
                        type="text"
                        value={newAttachmentName}
                        onChange={(e) => setNewAttachmentName(e.target.value)}
                        className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => saveAttachmentRename(attachment.id)}
                        className="p-1 text-green-600 hover:bg-green-100 rounded"
                      >
                        <FaCheck size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={cancelAttachmentRename}
                        className="p-1 text-red-600 hover:bg-red-100 rounded"
                      >
                        <FaTimes size={12} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex-1">
                      <span className="text-sm font-medium text-gray-800">{attachment.name}</span>
                      <div className="text-xs text-gray-500 mb-1">
                        {formatTime(attachment.duration)} • {(attachment.size / 1024).toFixed(1)}KB
                      </div>
                      
                      {/* Seek bar for playing attachment */}
                      {currentPlayingId === attachment.id && (
                        <div className="mt-2">
                          <div 
                            className="w-full h-1.5 bg-blue-200 rounded-full cursor-pointer relative overflow-hidden"
                            onClick={(e) => handleSeekBarClick(e, attachment)}
                            onMouseDown={handleSeekBarMouseDown}
                            onMouseMove={handleSeekBarMouseMove}
                            onMouseUp={handleSeekBarMouseUp}
                            onMouseLeave={handleSeekBarMouseUp}
                          >
                            <div 
                              className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all duration-100"
                              style={{ width: `${audioProgress}%` }}
                            />
                            <div 
                              className="absolute top-1/2 w-2 h-2 bg-blue-600 rounded-full shadow-sm transform -translate-y-1/2 -translate-x-1/2 cursor-grab active:cursor-grabbing"
                              style={{ left: `${audioProgress}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <span>{formatTime(isFinite(attachment.duration) ? (audioProgress / 100) * attachment.duration : 0)}</span>
                            <span>{formatTime(attachment.duration)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                {editingAttachment !== attachment.id && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleRenameAttachment(attachment.id)}
                      className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                      title="Rename"
                    >
                      <FaEdit size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteAttachment(attachment.id)}
                      className="p-1 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                      title="Delete"
                    >
                      <FaTrash size={12} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Delete confirmation dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Delete Voice Note</h3>
            <p className="text-sm text-gray-500 mb-6">
              Are you sure you want to delete this voice note? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={cancelDelete}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteAttachment}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VoiceEnabledDescription;
