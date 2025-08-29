// frontend/src/components/shared/VoiceInput.js - FIXED VERSION
import React, { useState, useRef, useEffect, useCallback } from 'react';
import './VoiceInput.css';

const VoiceInput = ({ 
    onVoiceResult, 
    onTranscriptionStart, 
    onTranscriptionEnd,
    isEnabled = true,
    language = 'en-US'
}) => {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [isSupported, setIsSupported] = useState(false);
    const [error, setError] = useState(null);
    const [volume, setVolume] = useState(0);
    
    const recognitionRef = useRef(null);
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const animationRef = useRef(null);
    const mediaStreamRef = useRef(null);

    // ✅ FIXED: Memoize callback to avoid dependency issues
    const startVolumeAnalysis = useCallback(async () => {
        try {
            // ✅ FIXED: Clean up existing audio context first
            if (audioContextRef.current) {
                try {
                    await audioContextRef.current.close();
                } catch (err) {
                    console.log('Previous audio context cleanup:', err.message);
                }
            }

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamRef.current = stream;
            
            // ✅ FIXED: Create new AudioContext properly
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const analyser = audioContext.createAnalyser();
            const source = audioContext.createMediaStreamSource(stream);
            
            analyser.fftSize = 256;
            source.connect(analyser);
            
            audioContextRef.current = audioContext;
            analyserRef.current = analyser;
            
            const updateVolume = () => {
                if (!analyserRef.current || !isListening) return;
                
                const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
                analyserRef.current.getByteFrequencyData(dataArray);
                
                const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
                setVolume(average);
                
                if (isListening && audioContextRef.current?.state === 'running') {
                    animationRef.current = requestAnimationFrame(updateVolume);
                }
            };
            
            updateVolume();
        } catch (error) {
            console.error('Error accessing microphone:', error);
            setError('Could not access microphone. Please check permissions.');
        }
    }, [isListening]);

    // ✅ FIXED: Proper cleanup function
    const stopVolumeAnalysis = useCallback(() => {
        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
            animationRef.current = null;
        }
        
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
        }
        
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close().catch(err => {
                console.log('Audio context close error (can be ignored):', err.message);
            });
            audioContextRef.current = null;
        }
    }, []);

    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (SpeechRecognition) {
            setIsSupported(true);
            const recognition = new SpeechRecognition();
            
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = language;
            recognition.maxAlternatives = 1;

            recognition.onstart = () => {
                console.log('🎤 Voice recognition started');
                setIsListening(true);
                setError(null);
                if (onTranscriptionStart) onTranscriptionStart();
                startVolumeAnalysis();
            };

            recognition.onresult = (event) => {
                let finalTranscript = '';
                let interimTranscript = '';

                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcript = event.results[i][0].transcript;
                    
                    if (event.results[i].isFinal) {
                        finalTranscript += transcript;
                    } else {
                        interimTranscript += transcript;
                    }
                }

                const fullTranscript = finalTranscript || interimTranscript;
                setTranscript(fullTranscript);
                
                if (finalTranscript && onVoiceResult) {
                    console.log('🗣️ Final transcript:', finalTranscript);
                    onVoiceResult(finalTranscript.trim());
                }
            };

            recognition.onerror = (event) => {
                console.error('🚫 Speech recognition error:', event.error);
                setError(event.error);
                setIsListening(false);
                stopVolumeAnalysis();
                
                if (onTranscriptionEnd) onTranscriptionEnd();
                
                switch (event.error) {
                    case 'no-speech':
                        setError('No speech detected. Please try again.');
                        break;
                    case 'network':
                        setError('Network error. Check your connection.');
                        break;
                    case 'not-allowed':
                        setError('Microphone permission denied. Please enable microphone access.');
                        break;
                    default:
                        setError('Speech recognition error. Please try again.');
                }
            };

            recognition.onend = () => {
                console.log('🛑 Voice recognition ended');
                setIsListening(false);
                stopVolumeAnalysis();
                if (onTranscriptionEnd) onTranscriptionEnd();
            };

            recognitionRef.current = recognition;
        } else {
            console.warn('🚫 Speech recognition not supported');
            setIsSupported(false);
        }

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
            stopVolumeAnalysis();
        };
    }, [language, onVoiceResult, onTranscriptionStart, onTranscriptionEnd, startVolumeAnalysis, stopVolumeAnalysis]);

    const startListening = async () => {
        if (!isSupported || !recognitionRef.current) return;
        
        try {
            await navigator.mediaDevices.getUserMedia({ audio: true });
            
            setTranscript('');
            setError(null);
            recognitionRef.current.start();
        } catch (error) {
            console.error('Error starting voice recognition:', error);
            setError('Could not access microphone. Please check permissions.');
        }
    };

    const stopListening = () => {
        if (recognitionRef.current && isListening) {
            recognitionRef.current.stop();
        }
    };

    const toggleListening = () => {
        if (isListening) {
            stopListening();
        } else {
            startListening();
        }
    };

    if (!isSupported) {
        return (
            <div className="voice-input-unsupported">
                <p>🚫 Voice input not supported in this browser</p>
                <small>Try using Chrome, Edge, or Safari</small>
            </div>
        );
    }

    return (
        <div className="voice-input-container">
            <button 
                className={`voice-button ${isListening ? 'listening' : ''} ${!isEnabled ? 'disabled' : ''}`}
                onClick={toggleListening}
                disabled={!isEnabled}
                title={isListening ? 'Click to stop recording' : 'Click to start voice input'}
            >
                {isListening ? (
                    <div className="listening-animation">
                        <div className="voice-waves">
                            <div 
                                className="wave" 
                                style={{ height: `${Math.max(10, volume / 3)}px` }}
                            ></div>
                            <div 
                                className="wave" 
                                style={{ height: `${Math.max(15, volume / 2)}px` }}
                            ></div>
                            <div 
                                className="wave" 
                                style={{ height: `${Math.max(20, volume)}px` }}
                            ></div>
                            <div 
                                className="wave" 
                                style={{ height: `${Math.max(15, volume / 2)}px` }}
                            ></div>
                            <div 
                                className="wave" 
                                style={{ height: `${Math.max(10, volume / 3)}px` }}
                            ></div>
                        </div>
                        <span className="listening-text">Listening...</span>
                    </div>
                ) : (
                    <>
                        🎤
                        <span className="voice-text">Voice</span>
                    </>
                )}
            </button>

            {transcript && (
                <div className="live-transcript">
                    <div className="transcript-content">
                        <span className="transcript-label">You said:</span>
                        <span className="transcript-text">{transcript}</span>
                    </div>
                </div>
            )}

            {error && (
                <div className="voice-error">
                    <span className="error-icon">⚠️</span>
                    <span className="error-text">{error}</span>
                </div>
            )}

            <div className="voice-commands-help">
                <details>
                    <summary>📝 Voice Commands</summary>
                    <div className="commands-list">
                        <p><strong>Order Commands:</strong></p>
                        <ul>
                            <li>"I want to order biryani"</li>
                            <li>"Show me pizza restaurants"</li>
                            <li>"Add chicken karahi to cart"</li>
                            <li>"Place my order"</li>
                        </ul>
                        <p><strong>Navigation:</strong></p>
                        <ul>
                            <li>"Show my cart"</li>
                            <li>"My order history"</li>
                            <li>"Show recommendations"</li>
                        </ul>
                    </div>
                </details>
            </div>
        </div>
    );
};

export default VoiceInput;