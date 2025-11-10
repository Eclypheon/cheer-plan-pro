import { useCallback } from 'react';
import { analyzeFullBuffer } from 'realtime-bpm-analyzer';

export const useBpmDetection = () => {
  const detectBpm = useCallback(async (file: File): Promise<number | null> => {
    return new Promise((resolve) => {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const reader = new FileReader();

      reader.onload = async (event) => {
        const arrayBuffer = event.target?.result as ArrayBuffer;
        try {
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

          // Use the professional realtime-bpm-analyzer library
          const bpmCandidates = await analyzeFullBuffer(audioBuffer);

          if (bpmCandidates && bpmCandidates.length > 0) {
            // Sort by confidence and get the most confident result
            const sortedCandidates = bpmCandidates.sort((a, b) => b.confidence - a.confidence);
            const bestCandidate = sortedCandidates[0];

            // Validate BPM is in reasonable range (60-200 BPM)
            if (bestCandidate.tempo >= 60 && bestCandidate.tempo <= 200) {
              resolve(Math.round(bestCandidate.tempo));
            } else {
              // Try the next candidate if the best one is out of range
              const nextCandidate = sortedCandidates.find(c => c.tempo >= 60 && c.tempo <= 200);
              resolve(nextCandidate ? Math.round(nextCandidate.tempo) : null);
            }
          } else {
            resolve(null);
          }
        } catch (error) {
          console.error('Error detecting BPM with realtime-bpm-analyzer:', error);
          // Fallback to basic detection if the library fails
          try {
            const fallbackBpm = await fallbackBpmDetection(audioContext, arrayBuffer);
            resolve(fallbackBpm);
          } catch (fallbackError) {
            console.error('Fallback BPM detection also failed:', fallbackError);
            resolve(null);
          }
        } finally {
          audioContext.close();
        }
      };

      reader.onerror = () => {
        console.error('Error reading file');
        resolve(null);
      };

      reader.readAsArrayBuffer(file);
    });
  }, []);

  return { detectBpm };
};

// Fallback BPM detection using basic autocorrelation (our original implementation)
async function fallbackBpmDetection(audioContext: AudioContext, arrayBuffer: ArrayBuffer): Promise<number | null> {
  try {
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    const channelData = audioBuffer.getChannelData(0);

    // Simple BPM detection using autocorrelation
    const bpm = detectBpmFromBuffer(channelData, audioBuffer.sampleRate);
    return bpm;
  } catch (error) {
    console.error('Fallback BPM detection failed:', error);
    return null;
  }
}

// Simple BPM detection using autocorrelation (fallback implementation)
function detectBpmFromBuffer(buffer: Float32Array, sampleRate: number): number | null {
  // Downsample for performance
  const downsampled = downsampleBuffer(buffer, 1024);

  // Calculate autocorrelation
  const correlations = calculateAutocorrelation(downsampled);

  // Find peaks in autocorrelation (corresponding to beat intervals)
  const peaks = findPeaks(correlations);

  if (peaks.length === 0) return null;

  // Convert the most prominent peak to BPM
  // The peak index represents samples between beats
  const samplesPerBeat = peaks[0].index;
  const secondsPerBeat = samplesPerBeat / (sampleRate / 1024); // Adjust for downsampling
  const bpm = 60 / secondsPerBeat;

  // Clamp to reasonable BPM range (60-200)
  return Math.max(60, Math.min(200, Math.round(bpm)));
}

function downsampleBuffer(buffer: Float32Array, targetLength: number): Float32Array {
  if (buffer.length <= targetLength) return buffer;

  const downsampled = new Float32Array(targetLength);
  const ratio = buffer.length / targetLength;

  for (let i = 0; i < targetLength; i++) {
    const start = Math.floor(i * ratio);
    const end = Math.floor((i + 1) * ratio);
    let sum = 0;

    for (let j = start; j < end; j++) {
      sum += Math.abs(buffer[j]);
    }

    downsampled[i] = sum / (end - start);
  }

  return downsampled;
}

function calculateAutocorrelation(buffer: Float32Array): Float32Array {
  const correlations = new Float32Array(buffer.length / 2);

  for (let lag = 0; lag < correlations.length; lag++) {
    let sum = 0;
    for (let i = 0; i < buffer.length - lag; i++) {
      sum += buffer[i] * buffer[i + lag];
    }
    correlations[lag] = sum;
  }

  return correlations;
}

function findPeaks(correlations: Float32Array): Array<{ index: number; value: number }> {
  const peaks: Array<{ index: number; value: number }> = [];
  const minDistance = 10; // Minimum samples between peaks

  for (let i = minDistance; i < correlations.length - minDistance; i++) {
    const value = correlations[i];
    let isPeak = true;

    // Check if this is a local maximum
    for (let j = -minDistance; j <= minDistance; j++) {
      if (j !== 0 && correlations[i + j] >= value) {
        isPeak = false;
        break;
      }
    }

    if (isPeak && value > 0.1) { // Threshold to filter noise
      peaks.push({ index: i, value });
    }
  }

  // Sort by value (highest first) and return top peaks
  return peaks
    .sort((a, b) => b.value - a.value)
    .slice(0, 5); // Return top 5 peaks
}
