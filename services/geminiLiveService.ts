
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';

export interface VoiceCallbacks {
  onTranscription: (text: string, role: 'user' | 'assistant') => void;
  onAudioStart: () => void;
  onAudioEnd: () => void;
  onError: (error: string) => void;
  onConnectionStatus: (status: 'connecting' | 'connected' | 'idle') => void;
}

export class GeminiVoiceService {
  private ai?: any;
  private session: any;
  private inputAudioContext?: AudioContext;
  private outputAudioContext?: AudioContext;
  private nextStartTime = 0;
  private sources = new Set<AudioBufferSourceNode>();
  private isSessionActive = false;

  constructor() {}

  async connect(systemInstruction: string, callbacks: VoiceCallbacks) {
    try {
      callbacks.onConnectionStatus('connecting');
      
      this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Standardize sample rates for model compatibility
      this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

      await this.inputAudioContext.resume();
      await this.outputAudioContext.resume();

      const sessionPromise = this.ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            console.debug('PoliVoice: Session Started');
            this.isSessionActive = true;
            callbacks.onConnectionStatus('connected');
            
            const source = this.inputAudioContext!.createMediaStreamSource(stream);
            const scriptProcessor = this.inputAudioContext!.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (e) => {
              if (!this.isSessionActive) return;
              
              const inputData = e.inputBuffer.getChannelData(0);
              // Only send if there is actual audio data
              if (inputData.length > 0) {
                const pcmBlob = this.createBlob(inputData);
                sessionPromise.then((s: any) => {
                  if (s && this.isSessionActive) {
                    try {
                      s.sendRealtimeInput({ media: pcmBlob });
                    } catch (err) {
                      console.error("Failed to send audio chunk", err);
                    }
                  }
                });
              }
            };
            
            source.connect(scriptProcessor);
            scriptProcessor.connect(this.inputAudioContext!.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.outputTranscription) {
              callbacks.onTranscription(message.serverContent.outputTranscription.text, 'assistant');
            } else if (message.serverContent?.inputTranscription) {
              callbacks.onTranscription(message.serverContent.inputTranscription.text, 'user');
            }

            if (message.serverContent?.interrupted) {
              this.stopAllAudio();
              this.nextStartTime = 0;
            }

            const audioPart = message.serverContent?.modelTurn?.parts?.find(p => p.inlineData);
            if (audioPart?.inlineData?.data) {
              this.playAudio(audioPart.inlineData.data);
            }
          },
          onerror: (e: any) => {
            console.error('PoliVoice: Live API Error', e);
            this.isSessionActive = false;
            callbacks.onError('সার্ভারে অভ্যন্তরীণ সমস্যা হয়েছে। দয়া করে আবার চেষ্টা করুন।');
            callbacks.onConnectionStatus('idle');
          },
          onclose: () => {
            this.isSessionActive = false;
            callbacks.onConnectionStatus('idle');
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          outputAudioTranscription: {},
          inputAudioTranscription: {},
          systemInstruction: { parts: [{ text: systemInstruction }] },
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } }
          }
        }
      });

      this.session = await sessionPromise;
    } catch (err) {
      this.isSessionActive = false;
      callbacks.onConnectionStatus('idle');
      throw err;
    }
  }

  private stopAllAudio() {
    this.sources.forEach(source => {
      try { source.stop(); } catch (e) {}
    });
    this.sources.clear();
  }

  private createBlob(data: Float32Array) {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
      // Improved clamping and conversion
      const s = Math.max(-1, Math.min(1, data[i]));
      int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return { 
      data: this.encode(new Uint8Array(int16.buffer)), 
      mimeType: 'audio/pcm;rate=16000' 
    };
  }

  private async playAudio(base64: string) {
    if (!this.outputAudioContext) return;
    
    try {
      const audioBuffer = await this.decodeAudioData(this.decode(base64), this.outputAudioContext, 24000, 1);
      const source = this.outputAudioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.outputAudioContext.destination);
      
      this.nextStartTime = Math.max(this.nextStartTime, this.outputAudioContext.currentTime);
      source.start(this.nextStartTime);
      this.nextStartTime += audioBuffer.duration;
      
      this.sources.add(source);
      source.onended = () => this.sources.delete(source);
    } catch (e) {
      console.error('Playback Error', e);
    }
  }

  private decode(base64: string) {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
    return bytes;
  }

  private encode(bytes: Uint8Array) {
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  }

  private async decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
    }
    return buffer;
  }

  stop() {
    this.isSessionActive = false;
    this.stopAllAudio();
    this.session?.close();
    this.inputAudioContext?.close();
    this.outputAudioContext?.close();
    this.session = null;
  }
}
