"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, BookOpenText, Clock3, Mic, Send, Square, Volume2 } from "lucide-react";
import { authClient } from "@/lib/auth/client";
import type { Scenario } from "../demo-data";
import { findLanguage } from "../demo-data";
import { VisualAsset } from "./VisualAsset";

type Message = { role: "user" | "assistant"; text: string; audioUrl?: string | null };

export function StudentConversation({ scenario, contextId }: { scenario: Scenario; contextId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState("");
  const [audioState, setAudioState] = useState("");
  const [activeReplyIndex, setActiveReplyIndex] = useState<number | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const audioPlayer = useRef<HTMLAudioElement | null>(null);
  const audioUrls = useRef<string[]>([]);
  const input = useRef<HTMLInputElement | null>(null);
  const disposed = useRef(false);
  const language = findLanguage(scenario.languageId);
  const speaking = audioState.startsWith("Playing");
  const voiceState = recording ? "listening" : busy ? "processing" : speaking ? "speaking" : error ? "error" : "idle";

  useEffect(() => {
    disposed.current = false;
    return () => {
      disposed.current = true;
      if (recorder.current?.state === "recording") recorder.current.stop();
      stream.current?.getTracks().forEach((track) => track.stop());
      audioPlayer.current?.pause();
      window.speechSynthesis?.cancel();
      audioUrls.current.forEach((url) => URL.revokeObjectURL(url));
      audioUrls.current = [];
    };
  }, []);

  function speakLocal(text: string) {
    if (!window.speechSynthesis) { setAudioState("Audio playback is unavailable in this browser."); return; }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language?.locale ?? "en-US";
    utterance.rate = 0.92;
    utterance.onend = () => setAudioState("");
    setAudioState("Playing device voice…");
    window.speechSynthesis.speak(utterance);
  }

  function speak(message: Message, index: number, automatic = false) {
    try {
      audioPlayer.current?.pause();
      window.speechSynthesis?.cancel();
      setActiveReplyIndex(index);
      setAudioState("");
      if (message.audioUrl) {
        const player = new Audio(message.audioUrl);
        audioPlayer.current = player;
        player.onended = () => { if (audioPlayer.current === player) setAudioState(""); };
        player.onerror = () => {
          if (audioPlayer.current === player) setAudioState("Gemini audio could not play. Use your device voice below.");
        };
        void player.play().then(() => {
          if (audioPlayer.current === player) setAudioState("Playing Gemini voice…");
        }).catch(() => {
          if (audioPlayer.current === player) setAudioState(automatic
            ? "Tap Play voice to hear this reply."
            : "Audio could not play. Try your device voice.");
        });
      } else speakLocal(message.text);
    } catch { setAudioState("Audio playback is unavailable in this browser."); }
  }

  function deviceVoice(message: Message, index: number) {
    audioPlayer.current?.pause();
    window.speechSynthesis?.cancel();
    setActiveReplyIndex(index);
    speakLocal(message.text);
  }

  function createAudioUrl(base64: string | null, mime: string | null): string | null {
    if (!base64 || !mime) return null;
    try {
      const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes.buffer as ArrayBuffer], { type: mime }));
      audioUrls.current.push(url);
      return url;
    } catch {
      return null;
    }
  }

  async function send(text?: string, audio?: { data: string; mime: string }) {
    if (busy || (!text?.trim() && !audio)) return;
    setBusy(true); setError(""); setAudioState("");
    try {
      const result = await authClient.studentDemoTurn({
        context_id: contextId, scenario_id: scenario.id, text: text?.trim(),
        audio_base64: audio?.data, audio_mime: audio?.mime,
        history: messages.slice(-6).map(({ role, text: item }) => ({ role, text: item })),
      });
      if (disposed.current) return;
      const assistant: Message = { role: "assistant", text: result.reply, audioUrl: createAudioUrl(result.audio_base64, result.audio_mime) };
      setMessages((previous) => [...previous, { role: "user", text: result.transcript }, assistant]);
      setDraft("");
      speak(assistant, messages.length + 1, true);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not send this message. Please retry."); }
    finally { setBusy(false); }
  }

  async function startRecording() {
    setError("");
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") { setError("Voice recording is unavailable in this browser. You can type your message."); return; }
    try {
      const mime = ["audio/webm", "audio/mp4", "audio/ogg"].find((item) => MediaRecorder.isTypeSupported(item));
      if (!mime) { setError("This browser cannot record a supported audio format. You can type your message."); return; }
      const media = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.current = media;
      const active = new MediaRecorder(media, { mimeType: mime });
      const chunks: BlobPart[] = [];
      active.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
      active.onstop = () => {
        media.getTracks().forEach((track) => track.stop());
        if (disposed.current) return;
        setRecording(false);
        const blob = new Blob(chunks, { type: active.mimeType });
        if (!blob.size) { setError("No voice was captured. Please retry."); return; }
        if (blob.size > 1_500_000) { setError("Recording is too long. Keep it under about 20 seconds."); return; }
        const reader = new FileReader();
        reader.onload = () => { const data = String(reader.result).split(",")[1]; if (data) void send(undefined, { data, mime: active.mimeType.split(";")[0] }); };
        reader.readAsDataURL(blob);
      };
      recorder.current = active;
      active.start(); setRecording(true);
    } catch { setError("Microphone permission was denied or the device is unavailable. You can type instead."); }
  }

  function chooseSuggestion(value: string) { setDraft(value); input.current?.focus(); }
  function toggleRecording() { if (recording) recorder.current?.stop(); else void startRecording(); }

  return <div className="student-conversation-page pb-12">
    <Link href="/student/practice" className="student-text-link"><ArrowLeft size={15} aria-hidden="true" /> All situations</Link>
    <div className="student-conversation-layout"><section className="student-conversation" aria-label={`${scenario.title} conversation`}><header className="student-conversation-head"><VisualAsset kind="scenario" imageSrc={scenario.imageSrc} className="student-conversation-head-art" /><div><span className="student-section-path">Communication Path</span><h1>{scenario.title}</h1><p>{language?.name} · {scenario.level} <span aria-hidden="true">·</span> <Clock3 size={14} aria-hidden="true" /> {scenario.minutes} min</p></div></header>
      <div className={`student-conversation-messages ${messages.length ? "has-messages" : "is-lobby"}`} aria-live="polite">{messages.length === 0 ? <div className="student-conversation-lobby"><div className="student-lobby-heading"><span className="student-lobby-label">Your mission</span><h2>{scenario.objective}</h2><p>Begin with one sentence. Your AI partner will take it from there.</p></div><div className="student-lobby-focus"><span>Today you can practise</span><div>{scenario.focus.map((focus) => <strong key={focus}>{focus}</strong>)}</div></div><div className="student-lobby-start"><button type="button" onClick={toggleRecording} disabled={busy} aria-label={recording ? "Stop recording" : "Record voice message"} className={`student-voice-orb student-voice-${voiceState}`}>{recording ? <Square size={24} aria-hidden="true" /> : <Mic size={28} aria-hidden="true" />}</button><div><strong>{recording ? "Listening to you" : busy ? "Preparing your reply" : "Ready to speak?"}</strong><p>{recording ? "Tap again when you finish." : "Tap to record, or start with a line below."}</p>{!recording && !busy && <button type="button" className="student-text-link" onClick={() => { chooseSuggestion(scenario.starter); }}>Start with text <ArrowRight size={15} aria-hidden="true" /></button>}</div></div><div className="student-lobby-suggestions"><span>A few ways in</span><div>{scenario.suggestions.map((suggestion) => <button type="button" key={suggestion} disabled={recording || busy} onClick={() => chooseSuggestion(suggestion)}>{suggestion}</button>)}</div></div></div> : messages.map((message, index) => <div key={index} className={`student-bubble ${message.role === "user" ? "student-bubble-user" : "student-bubble-assistant"}`}><span>{message.role === "user" ? "You" : "AI partner"}</span><p>{message.text}</p>{message.role === "assistant" && <div className="student-reply-audio"><button type="button" onClick={() => speak(message, index)} className="student-reply-audio-button"><Volume2 size={17} aria-hidden="true" /> Play reply</button>{message.audioUrl && <button type="button" onClick={() => deviceVoice(message, index)} className="student-reply-device-button">Use device voice</button>}{activeReplyIndex === index && audioState && <span role="status" className="student-reply-audio-status">{audioState}</span>}</div>}</div>)}{busy && messages.length > 0 && <div role="status" className="student-thinking"><span className="student-thinking-dots" aria-hidden="true"><i /><i /><i /></span> AI partner is thinking…</div>}</div>
      <div className="student-conversation-compose">{error && <p role="alert" className="student-conversation-error">{error}</p>}{(recording || busy) && <div role="status" className="student-audio-status">{recording ? "Listening… tap Stop when you finish." : "Processing your message…"}</div>}<form onSubmit={(event) => { event.preventDefault(); void send(draft); }}><button type="button" onClick={toggleRecording} disabled={busy} aria-label={recording ? "Stop recording" : busy ? "Processing voice message" : "Record voice message"} className={`student-voice-button student-voice-${voiceState}`}>{recording ? <Square size={18} aria-hidden="true" /> : <Mic size={19} aria-hidden="true" />}</button><input ref={input} value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={500} disabled={busy || recording} placeholder={recording ? "Recording… tap Stop when done" : "Type a message to begin…"} aria-label="Your message" className="student-message-input" /><button type="submit" disabled={busy || recording || !draft.trim()} aria-label="Send message" className="student-send-button"><Send size={18} aria-hidden="true" /></button></form><p>Voice is sent after you stop recording. Each turn is short.</p></div>
    </section><aside className="student-conversation-aside"><div className="student-scene-card"><span>In this scene</span><h2>{scenario.title}</h2><p>{scenario.description}</p><div><strong>Your goal</strong><p>{scenario.objective}</p></div></div><div className="student-lesson-connection"><BookOpenText size={20} aria-hidden="true" /><strong>From lesson to life</strong><p>{scenario.bridge}</p><Link href="/student/learn" className="student-text-link">Explore lessons <ArrowRight size={15} aria-hidden="true" /></Link></div></aside></div>
  </div>;
}
