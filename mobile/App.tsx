import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Image,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar as NativeStatusBar,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { GlassView, isGlassEffectAPIAvailable } from 'expo-glass-effect';
import { Ionicons } from '@expo/vector-icons';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
} from 'expo-audio';
import * as Device from 'expo-device';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import {
  getGreywatchStory,
  resolveRun,
  resolveVocalDecision,
  startRun,
  transcribeRecordedAnswer,
  type StoryLine,
  type StoryNode,
} from './src/api';

const C = {
  ink: '#0B0C0E',
  paper: '#F4F2ED',
  white: '#FFFFFF',
  muted: '#686A70',
  line: '#D8D6D0',
  torch: '#FF4F2E',
  torchDark: '#C92D14',
  moss: '#234C3B',
  sky: '#536DFE',
  amber: '#F3A712',
  success: '#198754',
  danger: '#D92D20',
};

type Tab = 'home' | 'worlds' | 'journey' | 'you';
type Screen = Tab | 'detail' | 'setup' | 'run' | 'summary' | 'recap' | 'history' | 'settings';

type RunSummaryData = {
  runId: string | null;
  nodeId: string;
  elapsedSeconds: number;
  distanceKm: number;
  averagePaceSeconds: number;
  checkpoint: string;
  objective: string;
  storyStep: number;
  storyTotal: number;
  lastResult: string;
};

const worlds = [
  { title: 'Greywatch', genre: 'Worlds Original', tone: 'Blood in the chapel', colors: ['#17100F', '#613329'] as const },
  { title: 'The North Road', genre: 'Future World', tone: 'A kingdom at dusk', colors: ['#151B1A', '#4D6C55'] as const },
  { title: 'Signal Lost', genre: 'Future World', tone: 'Deep-space survival', colors: ['#101322', '#536DFE'] as const },
  { title: 'Blackwater', genre: 'Creator World', tone: 'Coastal mystery', colors: ['#111B20', '#315665'] as const },
];

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [tab, setTab] = useState<Tab>('home');
  const [runLength, setRunLength] = useState('30 min');
  const [targetPace, setTargetPace] = useState('6:00 /km');
  const [lastRun, setLastRun] = useState<RunSummaryData | null>(null);
  const [resumeRun, setResumeRun] = useState<RunSummaryData | null>(null);

  const openNewRunSetup = () => {
    setResumeRun(null);
    setScreen('setup');
  };

  const goTab = (next: Tab) => {
    setTab(next);
    setScreen(next);
  };

  const showTabs = ['home', 'worlds', 'journey', 'you'].includes(screen);
  const dark = screen === 'run';

  return (
    <SafeAreaView style={[styles.safe, dark && styles.safeDark]}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      {screen === 'home' && <Home onContinue={openNewRunSetup} onWorld={() => setScreen('detail')} />}
      {screen === 'worlds' && <Worlds onWorld={() => setScreen('detail')} />}
      {screen === 'journey' && <Journey />}
      {screen === 'you' && <You onHistory={() => setScreen('history')} onSettings={() => setScreen('settings')} />}
      {screen === 'detail' && <WorldDetail onBack={() => setScreen(tab)} onEnter={openNewRunSetup} />}
      {screen === 'setup' && (
        <PreRun
          length={runLength}
          onLength={setRunLength}
          targetPace={targetPace}
          onTargetPace={setTargetPace}
          resumeCheckpoint={resumeRun?.runId ? resumeRun.checkpoint : null}
          onBack={() => setScreen(resumeRun?.runId ? 'summary' : 'detail')}
          onStart={() => setScreen('run')}
        />
      )}
      {screen === 'run' && (
        <ActiveRun
          targetPace={targetPace}
          resumeFrom={resumeRun}
          onFinish={(summary, storyComplete) => {
            setLastRun(summary);
            if (storyComplete) setResumeRun(null);
            setScreen(storyComplete ? 'recap' : 'summary');
          }}
        />
      )}
      {screen === 'summary' && lastRun && (
        <RunSummary
          run={lastRun}
          onDone={() => goTab('home')}
          onResume={() => {
            setResumeRun(lastRun);
            setScreen('setup');
          }}
        />
      )}
      {screen === 'recap' && <Recap run={lastRun} onDone={() => goTab('home')} onNewRun={openNewRunSetup} />}
      {screen === 'history' && <RunHistory onBack={() => setScreen('you')} onRun={() => setScreen('recap')} />}
      {screen === 'settings' && <Settings onBack={() => setScreen('you')} />}
      {showTabs && <TabBar active={tab} onSelect={goTab} />}
    </SafeAreaView>
  );
}

function Header({ eyebrow, title, onBack }: { eyebrow?: string; title: string; onBack?: () => void }) {
  return (
    <View style={styles.header}>
      {onBack && (
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={onBack} style={styles.back}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
      )}
      <View style={styles.headerCopy}>
        {eyebrow && <Text style={styles.eyebrow}>{eyebrow}</Text>}
        <Text style={styles.pageTitle}>{title}</Text>
      </View>
    </View>
  );
}

function Home({ onContinue, onWorld }: { onContinue: () => void; onWorld: () => void }) {
  return (
    <Page>
      <Text style={styles.brand}>WORLDS</Text>
      <Text style={styles.greeting}>Your story is waiting.</Text>
      <Pressable onPress={onContinue} style={styles.heroWrap}>
        <LinearGradient colors={['#0E1514', '#28483B', '#101312']} style={styles.hero}>
          <View style={styles.moon} />
          <View style={styles.ridgeBack} />
          <View style={styles.ridgeFront} />
          <View style={styles.heroShade} />
          <View style={styles.heroCopy}>
            <Text style={styles.heroEyebrow}>PLAYABLE STORY · GREYWATCH</Text>
            <Text style={styles.heroTitle}>Decide whether Edric leaves the chapel alive.</Text>
            <Text style={styles.heroState}>Garrick has drawn his sword. Mara is begging you to act.</Text>
            <PrimaryButton label="Start a new run" onPress={onContinue} />
          </View>
        </LinearGradient>
      </Pressable>

      <SectionTitle title="For tonight" action="Curated for 30 min" />
      <Pressable onPress={onWorld} style={styles.featureRow}>
        <WorldArt colors={worlds[0].colors} compact />
        <View style={styles.featureCopy}>
          <Text style={styles.cardEyebrow}>WORLDS ORIGINAL</Text>
          <Text style={styles.cardTitle}>Greywatch</Text>
          <Text style={styles.bodyMuted}>A murder. A living key. One choice before the blade falls.</Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </Pressable>

      <View style={styles.consequence}>
        <Text style={styles.cardEyebrow}>LAST CONSEQUENCE</Text>
        <Text style={styles.consequenceText}>No run yet. Greywatch is waiting.</Text>
      </View>
    </Page>
  );
}

function Worlds({ onWorld }: { onWorld: () => void }) {
  return (
    <Page>
      <Header eyebrow="CURATED STORIES" title="Enter a world." />
      <Text style={styles.intro}>Premium authored adventures shaped by how you move.</Text>
      <SectionTitle title="Worlds Originals" action="Featured" />
      <Pressable onPress={onWorld}>
        <WorldArt colors={worlds[0].colors} large>
          <Text style={styles.artEyebrow}>BLOOD IN THE CHAPEL</Text>
          <Text style={styles.artTitle}>Greywatch</Text>
        </WorldArt>
      </Pressable>
      <SectionTitle title="Coming next" action="Preview" />
      <View style={styles.posterRow}>
        {worlds.slice(1).map((world) => (
          <Pressable key={world.title} onPress={onWorld} style={styles.posterItem}>
            <WorldArt colors={world.colors} poster />
            <Text style={styles.cardTitleSmall}>{world.title}</Text>
            <Text style={styles.meta}>{world.genre}</Text>
          </Pressable>
        ))}
      </View>
    </Page>
  );
}

function WorldDetail({ onBack, onEnter }: { onBack: () => void; onEnter: () => void }) {
  return (
    <View style={styles.flex}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.detailContent}>
        <View style={styles.detailArt}>
          <LinearGradient colors={['#101716', '#365445', '#111312']} style={StyleSheet.absoluteFill} />
          <View style={styles.detailMoon} />
          <View style={styles.detailMountain} />
          <Pressable onPress={onBack} style={styles.backDark} accessibilityLabel="Go back">
            <Text style={styles.backDarkText}>‹</Text>
          </Pressable>
          <View style={styles.detailArtCopy}>
            <Text style={styles.artEyebrow}>WORLDS ORIGINAL</Text>
            <Text style={styles.detailTitle}>Greywatch</Text>
          </View>
        </View>
        <View style={styles.detailBody}>
          <Text style={styles.hook}>Edric murdered Thomas. Garrick wants his blood. Mara says only Edric can open the Lantern Vault.</Text>
          <Pressable style={styles.preview}>
            <View style={styles.playCircle}><Text style={styles.play}>▶</Text></View>
            <View style={styles.grow}>
              <Text style={styles.previewTitle}>Hear the world</Text>
              <Text style={styles.meta}>Prerecorded cast · Full branching scene</Text>
            </View>
          </Pressable>
          <SectionTitle title="Your movement matters" />
          <View style={styles.mechanics}>
            <Mechanic symbol="↱" title="Direction" body="Choose the road" />
            <Mechanic symbol="≈" title="Pace" body="Escape or hide" />
            <Mechanic symbol="•" title="Stops" body="Find what others miss" />
          </View>
          <View style={styles.creditBlock}>
            <Text style={styles.cardEyebrow}>AUTHORED WORLD</Text>
            <Text style={styles.body}>Created for Worlds · Featuring Mara, Garrick, Edric and Rowan</Text>
          </View>
          <PrimaryButton label="Enter this world" onPress={onEnter} />
        </View>
      </ScrollView>
    </View>
  );
}

function PreRun({
  length,
  onLength,
  targetPace,
  onTargetPace,
  resumeCheckpoint,
  onBack,
  onStart,
}: {
  length: string;
  onLength: (value: string) => void;
  targetPace: string;
  onTargetPace: (value: string) => void;
  resumeCheckpoint: string | null;
  onBack: () => void;
  onStart: () => void;
}) {
  return (
    <Page noTab>
      <Header
        eyebrow={resumeCheckpoint ? 'CONTINUE GREYWATCH' : 'GREYWATCH · BLOOD IN THE CHAPEL'}
        title={resumeCheckpoint ? 'Return to the story.' : 'Shape this run.'}
        onBack={onBack}
      />
      <Text style={styles.intro}>
        {resumeCheckpoint
          ? `Resume at ${resumeCheckpoint}. Choose how long you want to run next.`
          : 'Set the pace that “hold it” means for this run. Demo controls replace GPS.'}
      </Text>
      <FormSection title="Run length" note="30 min recommended">
        <Pills values={['15 min', '30 min', '45 min']} selected={length} onSelect={onLength} />
      </FormSection>
      <FormSection title="Desired pace" note="Per kilometre">
        <Pills values={['5:30 /km', '6:00 /km', '6:30 /km']} selected={targetPace} onSelect={onTargetPace} />
      </FormSection>
      <View style={styles.readiness}>
        <ReadinessRow label="Headphones" value="Connected" ready />
        <ReadinessRow label="Movement" value="Demo controls" ready />
        <ReadinessRow label="Audio" value="Volume safe" ready />
      </View>
      <View style={styles.safetyNote}>
        <Text style={styles.safetyTitle}>Stay aware of your surroundings.</Text>
        <Text style={styles.bodyMuted}>Choose a familiar route and obey local traffic rules.</Text>
      </View>
      <View style={styles.bottomAction}>
        <PrimaryButton label={resumeCheckpoint ? 'Resume story' : 'Start story'} onPress={onStart} />
      </View>
    </Page>
  );
}

function paceToSeconds(pace: string) {
  const match = pace.match(/(\d+):(\d+)/);
  return match ? Number(match[1]) * 60 + Number(match[2]) : 360;
}

function formatPace(seconds: number) {
  const safe = Math.max(180, Math.min(900, seconds));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`;
}

function formatElapsed(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`
    : `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

const PACE_VARIATION_SECONDS = [12, -8, 18, -14, 6, -19, 15, -4];

type RunPhase = 'loading' | 'playing' | 'awaiting' | 'resolving' | 'listening' | 'complete' | 'error';

function ActiveRun({
  targetPace,
  resumeFrom,
  onFinish,
}: {
  targetPace: string;
  resumeFrom: RunSummaryData | null;
  onFinish: (summary: RunSummaryData, storyComplete: boolean) => void;
}) {
  const targetPaceSeconds = paceToSeconds(targetPace);
  const [paused, setPaused] = useState(false);
  const [captions, setCaptions] = useState(true);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [distanceKm, setDistanceKm] = useState(0);
  const [phase, setPhase] = useState<RunPhase>('loading');
  const [runId, setRunId] = useState<string | null>(null);
  const [node, setNode] = useState<StoryNode | null>(null);
  const [lineIndex, setLineIndex] = useState(0);
  const [currentPace, setCurrentPace] = useState(targetPaceSeconds);
  const [storyStep, setStoryStep] = useState(1);
  const [transcript, setTranscript] = useState('');
  const [lastResult, setLastResult] = useState('');
  const [error, setError] = useState('');
  const currentLine: StoryLine | undefined = node?.lines[lineIndex];
  const isIOSSimulator = Platform.OS === 'ios' && !Device.isDevice;
  const simulatorRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  // Keep each remote line as the player's initial source. Replacing a shared,
  // download-first player during AVFoundation's completion callback can drop
  // the next short line on iOS.
  const player = useAudioPlayer(currentLine?.audioUrl ?? null, { updateInterval: 150 });
  const playback = useAudioPlayerStatus(player);
  const startedLine = useRef('');
  const heardPlayingLine = useRef('');
  const finishedLine = useRef('');
  const latestTranscript = useRef('');
  const speechSubmitted = useRef(false);
  const speechFailed = useRef(false);
  const speechCancelledByControl = useRef(false);
  const speechEndTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeElapsedMs = useRef(0);
  const distanceKmRef = useRef(0);
  const currentPaceRef = useRef(currentPace);
  const variationIndex = useRef(0);

  useEffect(() => {
    currentPaceRef.current = currentPace;
  }, [currentPace]);

  useEffect(() => {
    let lastTickAt = Date.now();
    const telemetryTimer = setInterval(() => {
      const now = Date.now();
      const intervalMs = now - lastTickAt;
      lastTickAt = now;
      if (paused) return;

      activeElapsedMs.current += intervalMs;
      distanceKmRef.current += (intervalMs / 1000) / currentPaceRef.current;
      setElapsedSeconds(Math.floor(activeElapsedMs.current / 1000));
      setDistanceKm(distanceKmRef.current);
    }, 250);

    return () => clearInterval(telemetryTimer);
  }, [paused]);

  useEffect(() => {
    if (paused) return;
    const paceTimer = setInterval(() => {
      const variation = PACE_VARIATION_SECONDS[variationIndex.current % PACE_VARIATION_SECONDS.length];
      variationIndex.current += 1;
      setCurrentPace(Math.max(180, Math.min(900, targetPaceSeconds + variation)));
    }, 5000);

    return () => clearInterval(paceTimer);
  }, [paused, targetPaceSeconds]);

  useEffect(() => {
    let active = true;
    const initializeRun = async () => {
      const story = await getGreywatchStory();
      const run = resumeFrom?.runId
        ? { id: resumeFrom.runId, currentNodeId: resumeFrom.nodeId }
        : await startRun(targetPaceSeconds);
      return { story, run };
    };
    initializeRun()
      .then(({ story, run }) => {
        if (!active) return;
        const opening = story.nodes.find((candidate) => candidate.id === run.currentNodeId);
        if (!opening) throw new Error('The saved Greywatch scene is missing.');
        setRunId(run.id);
        setNode(opening);
        setStoryStep(resumeFrom?.storyStep ?? 1);
        setLineIndex(0);
        setPhase('loading');
      })
      .catch((reason) => {
        if (!active) return;
        setError(reason instanceof Error ? reason.message : 'Could not start this run.');
        setPhase('error');
      });
    return () => {
      active = false;
      if (speechEndTimer.current) clearTimeout(speechEndTimer.current);
      ExpoSpeechRecognitionModule.abort();
    };
  }, [resumeFrom?.nodeId, resumeFrom?.runId, resumeFrom?.storyStep, targetPaceSeconds]);

  useEffect(() => {
    if (!currentLine) return;
    startedLine.current = '';
    heardPlayingLine.current = '';
    finishedLine.current = '';
    setPhase('loading');
  }, [currentLine?.id]);

  useEffect(() => {
    if (!currentLine) return;
    if (paused) return;
    if (playback.isLoaded && phase === 'loading' && startedLine.current !== currentLine.id) {
      startedLine.current = currentLine.id;
      player.play();
      setPhase('playing');
    }
    if (playback.playing && startedLine.current === currentLine.id) {
      heardPlayingLine.current = currentLine.id;
    }
    if (
      playback.didJustFinish
      && heardPlayingLine.current === currentLine.id
      && finishedLine.current !== currentLine.id
    ) {
      finishedLine.current = currentLine.id;
      if (node && lineIndex < node.lines.length - 1) {
        setLineIndex((value) => value + 1);
      } else {
        setPhase('awaiting');
      }
    }
  }, [playback.isLoaded, playback.playing, playback.didJustFinish, currentLine?.id, lineIndex, node, paused, phase]);

  useEffect(() => {
    if (!currentLine || currentLine.audioUrl || !node?.generated || paused) return;
    startedLine.current = currentLine.id;
    heardPlayingLine.current = currentLine.id;
    setPhase('playing');
    const wordCount = currentLine.text.trim().split(/\s+/).length;
    const readingTimeMs = Math.max(1800, Math.min(6000, wordCount * 260));
    const fallbackTimer = setTimeout(() => {
      if (finishedLine.current === currentLine.id) return;
      finishedLine.current = currentLine.id;
      if (lineIndex < node.lines.length - 1) {
        setLineIndex((value) => value + 1);
      } else {
        setPhase('awaiting');
      }
    }, readingTimeMs);
    return () => clearTimeout(fallbackTimer);
  }, [currentLine?.audioUrl, currentLine?.id, lineIndex, node, paused]);

  const enterNode = useCallback((nextNode: StoryNode, result: string) => {
    setNode(nextNode);
    setStoryStep((value) => Math.min(4, value + 1));
    setLineIndex(0);
    setTranscript('');
    setLastResult(result);
    setError('');
    setPhase('loading');
  }, []);

  const resolveMovement = useCallback(async (input: Record<string, unknown>) => {
    if (!runId || phase !== 'awaiting') return;
    setPhase('resolving');
    try {
      const response = await resolveRun(runId, input);
      enterNode(response.nextNode, response.result);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The story could not react.');
      setPhase('awaiting');
    }
  }, [enterNode, phase, runId]);

  const submitTranscript = useCallback(async (spokenText: string) => {
    if (!runId || !spokenText.trim()) return;
    setTranscript(spokenText.trim());
    setPhase('resolving');
    try {
      const response = await resolveVocalDecision(runId, spokenText.trim());
      if (response.nextNode) {
        enterNode(response.nextNode, response.choice.label);
      } else {
        setLastResult(response.choice.label);
        setTranscript(response.transcript);
        setPhase('complete');
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Your response was not understood.');
      setPhase('awaiting');
    }
  }, [enterNode, runId]);

  const submitTranscriptRef = useRef(submitTranscript);
  useEffect(() => { submitTranscriptRef.current = submitTranscript; }, [submitTranscript]);

  const submitLatestSpeech = useCallback(() => {
    const spokenText = latestTranscript.current.trim();
    if (!spokenText || speechSubmitted.current || speechFailed.current) return false;
    speechSubmitted.current = true;
    submitTranscriptRef.current(spokenText);
    return true;
  }, []);

  useSpeechRecognitionEvent('start', () => {
    speechSubmitted.current = false;
    speechFailed.current = false;
    speechCancelledByControl.current = false;
    latestTranscript.current = '';
    setPhase('listening');
  });
  useSpeechRecognitionEvent('result', (event) => {
    const spokenText = event.results[0]?.transcript?.trim() ?? '';
    if (spokenText) {
      latestTranscript.current = spokenText;
      setTranscript(spokenText);
    }
    if (event.isFinal && spokenText) submitLatestSpeech();
  });
  useSpeechRecognitionEvent('end', () => {
    if (speechCancelledByControl.current) return;
    // On iOS, stop() may end after delivering only an interim result. Give the
    // native bridge a moment to deliver its last result, then submit whichever
    // transcript the runner could see instead of silently resetting the choice.
    if (speechEndTimer.current) clearTimeout(speechEndTimer.current);
    speechEndTimer.current = setTimeout(() => {
      if (submitLatestSpeech()) return;
      setPhase((value) => value === 'listening' ? 'awaiting' : value);
      if (!speechFailed.current && !latestTranscript.current.trim()) {
        setError(
          Platform.OS === 'ios' && !Device.isDevice
            ? 'Simulator received no microphone audio. Choose Device → Sound → Sound Input → System, then try again.'
            : 'I did not hear an answer. Tap Speak and try again.',
        );
      }
    }, 250);
  });
  useSpeechRecognitionEvent('nomatch', () => {
    if (speechCancelledByControl.current) return;
    if (speechSubmitted.current) return;
    speechFailed.current = true;
    setError(
      Platform.OS === 'ios' && !Device.isDevice
        ? 'Simulator received no microphone audio. Choose Device → Sound → Sound Input → System, then try again.'
        : 'I could not make out that answer. Tap Speak and try again.',
    );
    setPhase('awaiting');
  });
  useSpeechRecognitionEvent('error', (event) => {
    if (speechCancelledByControl.current) return;
    // iOS may report a late recognizer shutdown error after the visible
    // transcript has already been accepted and sent to the director.
    if (speechSubmitted.current) return;
    speechFailed.current = true;
    const message = event.message || `Speech recognition failed: ${event.error}`;
    setError(
      Platform.OS === 'ios' && !Device.isDevice && message.includes('209')
        ? 'The iOS Simulator speech service did not start. Tap Speak to try again; private on-device recognition is available on a physical iPhone.'
        : message,
    );
    setPhase('awaiting');
  });

  const startListening = useCallback(async () => {
    if (!node || phase !== 'awaiting') return;
    setError('');
    if (isIOSSimulator) {
      try {
        const permission = await requestRecordingPermissionsAsync();
        if (!permission.granted) {
          setError('Microphone permission is required for vocal decisions.');
          return;
        }
        latestTranscript.current = '';
        speechSubmitted.current = false;
        speechFailed.current = false;
        setTranscript('');
        await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
        await simulatorRecorder.prepareToRecordAsync();
        simulatorRecorder.record();
        setPhase('listening');
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : 'The Simulator could not start recording.');
        setPhase('awaiting');
      }
      return;
    }
    if (!ExpoSpeechRecognitionModule.isRecognitionAvailable()) {
      setError('Speech recognition is not available on this device.');
      return;
    }
    if (!ExpoSpeechRecognitionModule.supportsOnDeviceRecognition() && Platform.OS === 'android') {
      await ExpoSpeechRecognitionModule.androidTriggerOfflineModelDownload({ locale: 'en-US' });
      setError('Install the English offline speech model, then tap Speak again.');
      return;
    }
    if (!ExpoSpeechRecognitionModule.supportsOnDeviceRecognition() && Platform.OS === 'ios' && Device.isDevice) {
      setError('This device does not support private on-device speech recognition.');
      return;
    }
    const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!permission.granted) {
      setError('Microphone permission is required for vocal decisions.');
      return;
    }
    setTranscript('');
    latestTranscript.current = '';
    speechSubmitted.current = false;
    speechFailed.current = false;
    ExpoSpeechRecognitionModule.start({
      lang: 'en-US',
      interimResults: true,
      continuous: false,
      maxAlternatives: 1,
      // The iOS Simulator has no reliable downloadable on-device speech model.
      // Physical iPhones still transcribe locally; the simulator may use
      // Apple's speech service, and only the resulting text reaches our API.
      requiresOnDeviceRecognition: Platform.OS === 'ios' ? Device.isDevice : Platform.OS !== 'web',
      contextualStrings: node.vocalOptions?.flatMap((option) => [option.label, ...option.aliases]),
    });
  }, [isIOSSimulator, node, phase, simulatorRecorder]);

  const finishListening = useCallback(async () => {
    if (isIOSSimulator) {
      setPhase('resolving');
      try {
        await simulatorRecorder.stop();
        await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
        const uri = simulatorRecorder.uri;
        if (!uri) throw new Error('The Simulator did not produce an audio recording.');
        const result = await transcribeRecordedAnswer(uri);
        latestTranscript.current = result.transcript;
        setTranscript(result.transcript);
        speechSubmitted.current = true;
        await submitTranscriptRef.current(result.transcript);
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : 'The recorded answer could not be transcribed.');
        setPhase('awaiting');
      }
      return;
    }
    ExpoSpeechRecognitionModule.stop();
    // Tapping finish is an explicit confirmation of the transcript currently
    // on screen. Submit it immediately; the end handler remains the fallback
    // for a final result that arrives during stop().
    submitLatestSpeech();
  }, [isIOSSimulator, simulatorRecorder, submitLatestSpeech]);

  const repeatNode = () => {
    if (!node) return;
    player.pause();
    if (lineIndex === 0 && currentLine) {
      startedLine.current = '';
      heardPlayingLine.current = '';
      finishedLine.current = '';
      setPhase('loading');
      player.seekTo(0);
    } else {
      setLineIndex(0);
    }
  };

  const skipToChoice = () => {
    if (!currentLine || (phase !== 'loading' && phase !== 'playing')) return;
    player.pause();
    // Mark the current line as handled so a late playback completion event
    // cannot advance or restart dialogue after the demo control is used.
    finishedLine.current = currentLine.id;
    setPhase('awaiting');
  };

  const resume = () => {
    setPaused(false);
    if (phase === 'playing') player.play();
  };

  const togglePause = async () => {
    if (paused) {
      resume();
      return;
    }
    player.pause();
    if (phase === 'listening') {
      speechCancelledByControl.current = true;
      if (isIOSSimulator) {
        try {
          await simulatorRecorder.stop();
          await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
        } catch {
          // Pausing should remain reliable even if the Simulator recorder has
          // already stopped itself.
        }
      } else {
        ExpoSpeechRecognitionModule.abort();
      }
      setPhase('awaiting');
    }
    setPaused(true);
  };

  const buildSummary = (): RunSummaryData => ({
    runId,
    nodeId: node?.id ?? 'root',
    elapsedSeconds,
    distanceKm,
    averagePaceSeconds: distanceKm > 0.01 ? Math.round(elapsedSeconds / distanceKm) : currentPace,
    checkpoint: node?.title ?? 'Blood in the Chapel',
    objective: node?.objective ?? 'Return to Greywatch.',
    storyStep,
    storyTotal: 4,
    lastResult,
  });

  const endRun = () => {
    player.pause();
    if (phase === 'listening') {
      speechCancelledByControl.current = true;
      ExpoSpeechRecognitionModule.abort();
    }
    onFinish(buildSummary(), false);
  };

  const finishRun = () => {
    player.pause();
    onFinish(buildSummary(), true);
  };

  const audioState = paused
    ? 'Story paused'
    : node?.generated && currentLine && !currentLine.audioUrl && (phase === 'playing' || phase === 'loading')
    ? 'Voice unavailable · showing captions'
    : phase === 'playing' || phase === 'loading'
    ? `${currentLine?.speaker ?? 'Story'} is ${phase === 'loading' ? 'loading' : 'speaking'}`
    : phase === 'listening' ? (isIOSSimulator ? 'Recording from Mac microphone' : 'Listening on this device') : phase === 'resolving' ? 'Directing the story' : 'Awaiting your movement';

  const paceStatus = currentPace > targetPaceSeconds
    ? { label: 'Below target', color: C.danger, icon: 'arrow-down' as const }
    : currentPace < targetPaceSeconds
      ? { label: 'Above target', color: C.success, icon: 'arrow-up' as const }
      : { label: 'On target', color: C.white, icon: 'remove' as const };

  return (
    <View style={styles.runScreen}>
      <NativeStatusBar barStyle="light-content" />
      <View style={styles.runTopBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Pause run"
          hitSlop={8}
          onPress={togglePause}
          style={({ pressed }) => [styles.runBack, pressed && styles.runControlPressed]}
        >
          <Ionicons name="chevron-back" size={28} color={C.white} />
        </Pressable>
        <View style={styles.runMetrics}>
          <View style={styles.runMetricBlock}>
            <Text style={styles.runMetricLabel}>ELAPSED</Text>
            <Text style={styles.runMetric}>{formatElapsed(elapsedSeconds)}</Text>
          </View>
          <View style={styles.runMetricBlock}>
            <Text style={styles.runMetricLabel}>DISTANCE</Text>
            <Text style={styles.runMetric}>{distanceKm.toFixed(2)} <Text style={styles.runMetricUnit}>KM</Text></Text>
          </View>
        </View>
        <View
          accessibilityLabel={`Current pace ${formatPace(currentPace)} per kilometre, ${paceStatus.label.toLowerCase()}`}
          style={styles.paceMetric}
        >
          <Text style={styles.runMetricLabel}>CURRENT PACE</Text>
          <Text style={[styles.runMetric, { color: paceStatus.color }]}>{formatPace(currentPace)}</Text>
          <View style={styles.paceStatusRow}>
            <Ionicons name={paceStatus.icon} size={10} color={paceStatus.color} />
            <Text style={[styles.paceStatusText, { color: paceStatus.color }]}>{paceStatus.label.toUpperCase()}</Text>
          </View>
        </View>
      </View>
      <View style={styles.map}>
        <Image
          source={require('./assets/maps/toronto-torch-map.png')}
          resizeMode="cover"
          style={styles.mapImage}
        />
        <Ionicons name="navigate" size={22} color={C.torch} style={styles.runnerMarker} />
      </View>
      <View style={styles.objectiveWrap}>
        <Text style={styles.runEyebrow}>{node?.label?.toUpperCase() ?? 'GREYWATCH'}</Text>
        <Text numberOfLines={2} style={styles.objective}>{error || node?.objective || 'Opening the chapel…'}</Text>
        <View style={styles.captionSlot}>
          {(captions || (node?.generated && !currentLine?.audioUrl)) && currentLine && (phase === 'playing' || phase === 'loading') && (
            <Text numberOfLines={3} style={styles.runCaption}>{currentLine.text}</Text>
          )}
        </View>
        <View style={styles.audioLine}>
          <View style={[styles.audioDot, paused && styles.audioDotPaused]} />
          <Text style={styles.audioText}>{audioState}</Text>
          {(phase === 'playing' || phase === 'loading') && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Skip dialogue and show the choice"
              accessibilityHint="Demo control"
              hitSlop={6}
              onPress={skipToChoice}
              style={({ pressed }) => [styles.skipChoiceButton, pressed && styles.skipChoiceButtonPressed]}
            >
              <Ionicons name="play-skip-forward" size={14} color={C.white} />
              <Text style={styles.skipChoiceText}>Skip to choice</Text>
            </Pressable>
          )}
        </View>
        {lastResult ? <Text style={styles.sensorResult}>LAST INPUT · {lastResult.toUpperCase()}</Text> : null}
        {phase === 'awaiting' && node?.interaction === 'direction' && (
          <View style={styles.sensorRow}>
            <DemoButton label="← Left" onPress={() => resolveMovement({ direction: 'left' })} />
            <DemoButton label="Right →" onPress={() => resolveMovement({ direction: 'right' })} />
          </View>
        )}
        {phase === 'awaiting' && node?.interaction === 'pace' && (
          <View style={styles.sensorBlock}>
            <View style={styles.paceAdjustRow}>
              <DemoButton label="Faster" onPress={() => setCurrentPace((value) => Math.max(180, value - 15))} />
              <Text style={styles.sensorValue}>{formatPace(currentPace)} /km</Text>
              <DemoButton label="Slower" onPress={() => setCurrentPace((value) => Math.min(900, value + 15))} />
            </View>
            <DemoButton wide label="Use this pace" onPress={() => resolveMovement({ currentPaceSeconds: currentPace })} />
          </View>
        )}
        {phase === 'awaiting' && node?.interaction === 'stop' && (
          <View style={styles.sensorRow}>
            <DemoButton label="Stop" onPress={() => resolveMovement({ stopped: true })} />
            <DemoButton label="Keep moving" onPress={() => resolveMovement({ stopped: false })} />
          </View>
        )}
        {(phase === 'awaiting' || phase === 'listening') && node?.interaction === 'vocal' && (
          <View style={styles.sensorBlock}>
            {transcript ? <Text style={styles.transcript}>“{transcript}”</Text> : null}
            <DemoButton
              wide
              label={phase === 'listening' ? (isIOSSimulator ? 'Recording… tap when finished' : 'Listening… tap when finished') : 'Speak your answer'}
              onPress={phase === 'listening' ? finishListening : startListening}
            />
          </View>
        )}
        {phase === 'complete' && (
          <View style={styles.sensorBlock}>
            <Text style={styles.transcript}>The story heard “{transcript}” and chose {lastResult}.</Text>
            <DemoButton wide label="Finish this run" onPress={finishRun} />
          </View>
        )}
      </View>
      <View style={styles.runControls}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={captions ? 'Hide captions' : 'Show captions'}
          accessibilityState={{ selected: captions }}
          onPress={() => setCaptions((value) => !value)}
          style={({ pressed }) => [styles.roundControl, pressed && styles.runControlPressed]}
        >
          <Text style={[styles.controlGlyph, captions && styles.controlGlyphActive]}>CC</Text>
          <Text style={[styles.controlText, captions && styles.controlTextActive]}>Captions</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={paused ? 'Resume story' : 'Pause story'}
          onPress={togglePause}
          style={({ pressed }) => [styles.pauseControl, pressed && styles.pauseControlPressed]}
        >
          <Ionicons name={paused ? 'play' : 'pause'} size={28} color={C.ink} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Repeat last scene"
          onPress={repeatNode}
          style={({ pressed }) => [styles.roundControl, pressed && styles.runControlPressed]}
        >
          <Ionicons name="refresh" size={20} color={C.white} />
          <Text style={styles.controlText}>Repeat</Text>
        </Pressable>
      </View>
      <Modal transparent visible={paused} animationType="slide" onRequestClose={resume}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Resume run"
          onPress={resume}
          style={styles.modalShade}
        />
        <View style={styles.pauseSheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.pauseEyebrow}>GREYWATCH · RUN PAUSED</Text>
          <Text style={styles.pageTitle}>Catch your breath.</Text>
          <Text style={styles.pauseBody}>Your time, route and story checkpoint are safe.</Text>
          <View style={styles.pauseFacts}>
            <Stat value={formatElapsed(elapsedSeconds)} label="TIME" />
            <Stat value={distanceKm.toFixed(2)} label="KM" />
          </View>
          <PrimaryButton label="Resume run" onPress={resume} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="End run and view summary"
            style={({ pressed }) => [styles.endRunButton, pressed && styles.endRunButtonPressed]}
            onPress={endRun}
          >
            <Text style={styles.endRunButtonText}>End run & view summary</Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

function RunSummary({
  run,
  onDone,
  onResume,
}: {
  run: RunSummaryData;
  onDone: () => void;
  onResume: () => void;
}) {
  return (
    <Page noTab>
      <Header eyebrow="RUN SAVED · GREYWATCH" title="Your run." />
      <View style={styles.summaryStats}>
        <View style={styles.summaryPrimaryStat}>
          <Text style={styles.summaryStatValue}>{run.distanceKm.toFixed(2)}</Text>
          <Text style={styles.summaryStatUnit}>KM</Text>
          <Text style={[styles.summaryStatLabel, styles.summaryPrimaryLabel]}>DISTANCE</Text>
        </View>
        <View style={styles.summarySecondaryStats}>
          <View style={styles.summarySecondaryStat}>
            <Text style={styles.summarySecondaryValue}>{formatElapsed(run.elapsedSeconds)}</Text>
            <Text style={styles.summaryStatLabel}>TIME</Text>
          </View>
          <View style={styles.summarySecondaryStat}>
            <Text style={styles.summarySecondaryValue}>{formatPace(run.averagePaceSeconds)}</Text>
            <Text style={styles.summaryStatLabel}>AVG PACE /KM</Text>
          </View>
        </View>
      </View>

      <View style={styles.storyProgressHeader}>
        <Text style={styles.cardEyebrow}>STORY PROGRESS</Text>
        <Text style={styles.storyProgressCount}>{run.storyStep} OF {run.storyTotal} MOMENTS</Text>
      </View>
      <View
        accessibilityLabel={`Story progress, ${run.storyStep} of ${run.storyTotal} moments reached`}
        style={styles.storyProgressTrack}
      >
        {Array.from({ length: run.storyTotal }).map((_, index) => (
          <View
            key={index}
            style={[styles.storyProgressSegment, index < run.storyStep && styles.storyProgressSegmentReached]}
          />
        ))}
      </View>
      <View style={styles.storyCheckpoint}>
        <Text style={styles.storyCheckpointLabel}>CHECKPOINT SAVED</Text>
        <Text style={styles.storyCheckpointTitle}>{run.checkpoint}</Text>
        <Text style={styles.bodyMuted}>{run.lastResult ? `Your last choice: ${run.lastResult}. ` : ''}Next: {run.objective}</Text>
      </View>

      <View style={styles.summaryActions}>
        <PrimaryButton label={run.runId ? 'Resume story' : 'Start a new run'} onPress={onResume} />
        <Text style={styles.summaryActionHint}>
          {run.runId
            ? 'Choose the length of your next run. Greywatch will continue from this checkpoint.'
            : 'The checkpoint could not be saved. You can still begin a new run.'}
        </Text>
        <Pressable style={styles.secondaryButton} onPress={onDone}>
          <Text style={styles.secondaryButtonText}>Return home</Text>
        </Pressable>
      </View>
    </Page>
  );
}

function Recap({ run, onDone, onNewRun }: { run: RunSummaryData | null; onDone: () => void; onNewRun: () => void }) {
  return (
    <Page noTab>
      <Header eyebrow="RUN COMPLETE · GREYWATCH" title="The chapel remembers your choice." />
      <Text style={styles.recapLead}>Your movement decided who crossed the Lantern Gate and what Greywatch learned about Thomas.</Text>
      <View style={styles.recapMap}>
        <View style={[styles.recapRoute, { transform: [{ rotate: '-16deg' }] }]} />
        <View style={[styles.recapRoute, styles.recapRouteTwo, { transform: [{ rotate: '24deg' }] }]} />
        <Moment style={styles.momentOne} number="1" />
        <Moment style={styles.momentTwo} number="2" />
        <Moment style={styles.momentThree} number="3" />
        <Text style={styles.recapMapLabel}>YOUR PATH THROUGH GREYWATCH</Text>
      </View>
      <SectionTitle title="What changed" />
      <Consequence tag="DECISION" text="You decided whether Edric left the chapel alive." />
      <Consequence tag="MOVEMENT" text="Your direction selected the route to the Lantern Vault." />
      <Consequence tag="CONSEQUENCE" text="Your pace determined who made it through the gate." />
      <View style={styles.stats}>
        <Stat value={run ? formatElapsed(run.elapsedSeconds) : '30:08'} label="TIME" />
        <Stat value={run ? run.distanceKm.toFixed(2) : '5.14'} label="KM" />
        <Stat value={run ? formatPace(run.averagePaceSeconds) : '5:52'} label="AVG PACE" />
      </View>
      <View style={styles.nextHook}>
        <Text style={styles.cardEyebrow}>NEXT TIME</Text>
        <Text style={styles.cardTitle}>The forged order is still inside Greywatch.</Text>
        <Text style={styles.bodyMuted}>Recommended: at least 20 minutes</Text>
      </View>
      <PrimaryButton label="Start a new run" onPress={onNewRun} />
      <Pressable style={styles.secondaryButton} onPress={onDone}><Text style={styles.secondaryButtonText}>Return home</Text></Pressable>
    </Page>
  );
}

function Journey() {
  return (
    <Page>
      <Header eyebrow="THE NORTH ROAD" title="Your journey." />
      <View style={styles.journeyHero}>
        <Text style={styles.cardEyebrow}>CURRENT OBJECTIVE</Text>
        <Text style={styles.journeyTitle}>Reach the bell tower before dark.</Text>
        <Text style={styles.bodyMuted}>Chapter 2 · The crown has fallen</Text>
      </View>
      <SectionTitle title="The story so far" />
      <TimelineItem type="DECISION" title="You entered Alder Wood" detail="Instead of returning to the village." active />
      <TimelineItem type="RELATIONSHIP" title="Ilan trusts you" detail="He revealed the hidden northern road." />
      <TimelineItem type="CONSEQUENCE" title="The gate was closed" detail="Mara took the lower path alone." />
      <TimelineItem type="DISCOVERY" title="The king’s seal" detail="Found beneath the old bridge." last />
    </Page>
  );
}

function You({ onHistory, onSettings }: { onHistory: () => void; onSettings: () => void }) {
  return (
    <Page>
      <Header eyebrow="RUNNER" title="You." />
      <View style={styles.profileCard}>
        <View style={styles.avatar}><Text style={styles.avatarText}>A</Text></View>
        <View><Text style={styles.cardTitle}>Alex</Text><Text style={styles.bodyMuted}>4 stories run · 18.2 km</Text></View>
      </View>
      <View style={styles.youStats}>
        <Stat value="4" label="RUNS" />
        <Stat value="1:52" label="STORY TIME" />
        <Stat value="2" label="WORLDS" />
      </View>
      <SectionTitle title="Your running" />
      <MenuRow label="Run history" value="4 runs" onPress={onHistory} />
      <MenuRow label="Weekly goal" value="2 of 3 runs" />
      <SectionTitle title="Experience" />
      <MenuRow label="Audio & accessibility" value="Captions on" onPress={onSettings} />
      <MenuRow label="Safety & privacy" value="Location while using" onPress={onSettings} />
      <MenuRow label="Account" onPress={onSettings} />
    </Page>
  );
}

function RunHistory({ onBack, onRun }: { onBack: () => void; onRun: () => void }) {
  return (
    <Page noTab>
      <Header title="Run history." onBack={onBack} />
      <Text style={styles.intro}>Your runs, remembered by what happened.</Text>
      <HistoryItem date="TODAY · 30 MIN" title="You reached the bell tower alone." detail="The North Road · 5.14 km" onPress={onRun} />
      <HistoryItem date="JUL 14 · 24 MIN" title="Ilan revealed the hidden road." detail="The North Road · 4.08 km" onPress={onRun} />
      <HistoryItem date="JUL 09 · 18 MIN" title="You escaped the riders." detail="The North Road · 3.21 km" onPress={onRun} />
      <HistoryItem date="JUL 02 · 40 MIN" title="The signal answered." detail="Signal Lost · 6.72 km" onPress={onRun} />
    </Page>
  );
}

function Settings({ onBack }: { onBack: () => void }) {
  const [captions, setCaptions] = useState(true);
  const [haptics, setHaptics] = useState(true);
  const [motion, setMotion] = useState(false);
  return (
    <Page noTab>
      <Header title="Settings." onBack={onBack} />
      <SectionTitle title="Audio & access" />
      <ToggleRow label="Captions" value={captions} onChange={setCaptions} />
      <ToggleRow label="Story haptics" value={haptics} onChange={setHaptics} />
      <ToggleRow label="Reduced motion" value={motion} onChange={setMotion} />
      <MenuRow label="Voice balance" value="Standard" />
      <MenuRow label="Audio check" value="Ready" />
      <SectionTitle title="Safety & privacy" />
      <MenuRow label="Location access" value="While using" />
      <MenuRow label="Emergency information" value="Not set" />
      <MenuRow label="Privacy" />
      <Text style={styles.settingsFoot}>Skeleton settings only. No account, health, location or audio data is collected.</Text>
    </Page>
  );
}

function Page({ children, noTab = false }: { children: React.ReactNode; noTab?: boolean }) {
  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[styles.page, noTab ? styles.pageNoTab : styles.pageWithTab]}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );
}

function TabBar({ active, onSelect }: { active: Tab; onSelect: (tab: Tab) => void }) {
  type IconName = React.ComponentProps<typeof Ionicons>['name'];
  const items: { key: Tab; label: string; icon: IconName; activeIcon: IconName }[] = [
    { key: 'home', label: 'Home', icon: 'home-outline', activeIcon: 'home' },
    { key: 'worlds', label: 'Worlds', icon: 'compass-outline', activeIcon: 'compass' },
    { key: 'journey', label: 'Journey', icon: 'map-outline', activeIcon: 'map' },
    { key: 'you', label: 'You', icon: 'person-outline', activeIcon: 'person' },
  ];
  const canUseNativeGlass = Platform.OS === 'ios' && isGlassEffectAPIAvailable();
  const tabs = (
    <View style={styles.tabContent}>
      {items.map((item) => {
        const selected = active === item.key;
        return (
          <Pressable
            key={item.key}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={item.label}
            onPress={() => onSelect(item.key)}
            style={styles.tabItem}
          >
            <Ionicons
              name={selected ? item.activeIcon : item.icon}
              size={selected ? 31 : 29}
              color={selected ? C.white : '#92959A'}
            />
            <Text style={[styles.tabLabel, selected && styles.tabActive]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
  return (
    <View style={styles.tabBarPosition}>
      {canUseNativeGlass ? (
        <GlassView
          glassEffectStyle="regular"
          tintColor="#202124"
          isInteractive
          style={styles.tabGlass}
        >
          {tabs}
        </GlassView>
      ) : (
        <View style={styles.tabFallback}>{tabs}</View>
      )}
    </View>
  );
}

function PrimaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}>
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

function DemoButton({ label, onPress, wide = false }: { label: string; onPress: () => void; wide?: boolean }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.demoButton, wide && styles.demoButtonWide, pressed && styles.demoButtonPressed]}>
      <Text style={styles.demoButtonText}>{label}</Text>
    </Pressable>
  );
}

function SectionTitle({ title, action }: { title: string; action?: string }) {
  return (
    <View style={styles.sectionTitle}>
      <Text style={styles.sectionTitleText}>{title}</Text>
      {action && <Text style={styles.sectionAction}>{action}</Text>}
    </View>
  );
}

function WorldArt({ colors, children, compact, large, poster }: { colors: readonly [string, string]; children?: React.ReactNode; compact?: boolean; large?: boolean; poster?: boolean }) {
  return (
    <LinearGradient colors={colors} style={[styles.worldArt, compact && styles.worldArtCompact, large && styles.worldArtLarge, poster && styles.worldArtPoster]}>
      <View style={styles.artSun} />
      <View style={styles.artLand} />
      <View style={styles.artOverlay} />
      {children && <View style={styles.worldArtCopy}>{children}</View>}
    </LinearGradient>
  );
}

function Mechanic({ symbol, title, body }: { symbol: string; title: string; body: string }) {
  return <View style={styles.mechanic}><Text style={styles.mechanicSymbol}>{symbol}</Text><Text style={styles.mechanicTitle}>{title}</Text><Text style={styles.mechanicBody}>{body}</Text></View>;
}

function FormSection({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return <View style={styles.formSection}><View style={styles.formHeading}><Text style={styles.formTitle}>{title}</Text>{note && <Text style={styles.meta}>{note}</Text>}</View>{children}</View>;
}

function Pills({ values, selected, onSelect }: { values: string[]; selected: string; onSelect: (value: string) => void }) {
  return <View style={styles.pills}>{values.map((value) => <Pressable key={value} onPress={() => onSelect(value)} style={[styles.pill, selected === value && styles.pillSelected]}><Text style={[styles.pillText, selected === value && styles.pillTextSelected]}>{value}</Text></Pressable>)}</View>;
}

function ReadinessRow({ label, value, ready }: { label: string; value: string; ready?: boolean }) {
  return <View style={styles.readinessRow}><Text style={styles.body}>{label}</Text><View style={styles.readinessValue}><View style={[styles.readyDot, ready && styles.readyDotOn]} /><Text style={styles.bodyMuted}>{value}</Text></View></View>;
}

function Moment({ style, number }: { style: object; number: string }) {
  return <View style={[styles.moment, style]}><Text style={styles.momentText}>{number}</Text></View>;
}

function Consequence({ tag, text }: { tag: string; text: string }) {
  return <View style={styles.consequenceRow}><Text style={styles.consequenceTag}>{tag}</Text><Text style={styles.consequenceBody}>{text}</Text></View>;
}

function Stat({ value, label }: { value: string; label: string }) {
  return <View style={styles.stat}><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>;
}

function TimelineItem({ type, title, detail, active, last }: { type: string; title: string; detail: string; active?: boolean; last?: boolean }) {
  return <View style={styles.timelineItem}><View style={styles.timelineRail}><View style={[styles.timelineDot, active && styles.timelineDotActive]} />{!last && <View style={styles.timelineLine} />}</View><View style={styles.timelineCopy}><Text style={styles.cardEyebrow}>{type}</Text><Text style={styles.timelineTitle}>{title}</Text><Text style={styles.bodyMuted}>{detail}</Text></View></View>;
}

function MenuRow({ label, value, onPress }: { label: string; value?: string; onPress?: () => void }) {
  return <Pressable onPress={onPress} style={styles.menuRow}><Text style={styles.body}>{label}</Text><View style={styles.menuRight}>{value && <Text style={styles.meta}>{value}</Text>}<Text style={styles.chevronSmall}>›</Text></View></Pressable>;
}

function HistoryItem({ date, title, detail, onPress }: { date: string; title: string; detail: string; onPress: () => void }) {
  return <Pressable onPress={onPress} style={styles.historyItem}><View style={styles.historyMark} /><View style={styles.grow}><Text style={styles.cardEyebrow}>{date}</Text><Text style={styles.timelineTitle}>{title}</Text><Text style={styles.bodyMuted}>{detail}</Text></View><Text style={styles.chevron}>›</Text></Pressable>;
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  return <View style={styles.menuRow}><Text style={styles.body}>{label}</Text><Switch value={value} onValueChange={onChange} trackColor={{ false: C.line, true: C.ink }} thumbColor={value ? C.torch : C.white} /></View>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, grow: { flex: 1 }, safe: { flex: 1, backgroundColor: C.paper }, safeDark: { backgroundColor: C.ink },
  page: { paddingHorizontal: 20, paddingTop: 12 }, pageWithTab: { paddingBottom: 116 }, pageNoTab: { paddingBottom: 48 },
  brand: { fontFamily: 'Arial', fontSize: 13, fontWeight: '800', letterSpacing: 3.4, color: C.ink, marginTop: 4 },
  greeting: { fontFamily: 'Arial', fontSize: 30, lineHeight: 34, fontWeight: '700', color: C.ink, marginTop: 30, marginBottom: 20 },
  header: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 4, marginBottom: 12 }, headerCopy: { flex: 1 },
  back: { width: 44, height: 44, alignItems: 'flex-start', justifyContent: 'center', marginLeft: -4 }, backText: { fontSize: 38, lineHeight: 40, color: C.ink, fontWeight: '300' },
  eyebrow: { fontFamily: 'Arial', fontSize: 11, letterSpacing: 1.7, color: C.muted, fontWeight: '700', marginBottom: 7 },
  pageTitle: { fontFamily: 'Arial', fontSize: 30, lineHeight: 34, color: C.ink, fontWeight: '700', letterSpacing: -0.7 },
  intro: { fontFamily: 'Arial', fontSize: 16, lineHeight: 23, color: C.muted, marginBottom: 26, maxWidth: 340 },
  heroWrap: { borderRadius: 24, overflow: 'hidden' }, hero: { height: 430, padding: 22, justifyContent: 'flex-end', overflow: 'hidden' },
  moon: { position: 'absolute', top: 55, right: 48, width: 72, height: 72, borderRadius: 36, backgroundColor: '#D7D2B8', opacity: 0.68 },
  ridgeBack: { position: 'absolute', left: -60, right: -70, bottom: 125, height: 180, backgroundColor: '#263C32', transform: [{ rotate: '-9deg' }] },
  ridgeFront: { position: 'absolute', left: -90, right: -40, bottom: 25, height: 190, backgroundColor: '#101513', transform: [{ rotate: '8deg' }] },
  heroShade: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(3,6,5,0.15)' }, heroCopy: { zIndex: 2 },
  heroEyebrow: { fontFamily: 'Arial', fontSize: 10, lineHeight: 14, letterSpacing: 1.5, color: '#D9DED8', fontWeight: '700' },
  heroTitle: { fontFamily: 'Arial', fontSize: 27, lineHeight: 31, color: C.white, fontWeight: '700', marginTop: 10, maxWidth: 290 },
  heroState: { fontFamily: 'Arial', fontSize: 14, lineHeight: 20, color: '#CED4CF', marginVertical: 12, maxWidth: 300 },
  primaryButton: { minHeight: 56, backgroundColor: C.torch, borderRadius: 28, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, marginTop: 10 },
  buttonPressed: { backgroundColor: C.torchDark, transform: [{ scale: 0.99 }] }, primaryButtonText: { fontFamily: 'Arial', color: C.ink, fontWeight: '700', fontSize: 16 },
  sectionTitle: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 30, marginBottom: 14 },
  sectionTitleText: { fontFamily: 'Arial', fontSize: 20, lineHeight: 24, fontWeight: '700', color: C.ink }, sectionAction: { fontFamily: 'Arial', fontSize: 12, color: C.muted },
  featureRow: { minHeight: 94, flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.line, paddingVertical: 14 },
  featureCopy: { flex: 1, marginLeft: 14 }, cardEyebrow: { fontFamily: 'Arial', fontSize: 10, lineHeight: 14, color: C.muted, letterSpacing: 1.35, fontWeight: '700', marginBottom: 4 },
  cardTitle: { fontFamily: 'Arial', fontSize: 19, lineHeight: 23, color: C.ink, fontWeight: '700' }, cardTitleSmall: { fontFamily: 'Arial', fontSize: 16, lineHeight: 20, color: C.ink, fontWeight: '700', marginTop: 9 },
  body: { fontFamily: 'Arial', fontSize: 15, lineHeight: 21, color: C.ink }, bodyMuted: { fontFamily: 'Arial', fontSize: 14, lineHeight: 20, color: C.muted }, meta: { fontFamily: 'Arial', fontSize: 12, lineHeight: 17, color: C.muted },
  chevron: { fontSize: 29, fontWeight: '300', color: C.muted, marginLeft: 8 }, chevronSmall: { fontSize: 24, fontWeight: '300', color: C.muted, marginLeft: 8 },
  consequence: { backgroundColor: '#E9E6DF', padding: 18, borderRadius: 16, marginTop: 24 }, consequenceText: { fontFamily: 'Arial', fontSize: 16, lineHeight: 22, color: C.ink, fontWeight: '600' },
  worldArt: { overflow: 'hidden', backgroundColor: C.ink }, worldArtCompact: { width: 76, height: 76, borderRadius: 12 }, worldArtLarge: { height: 252, borderRadius: 20 }, worldArtPoster: { width: '100%', aspectRatio: 0.8, borderRadius: 16 },
  artSun: { position: 'absolute', top: '18%', right: '18%', width: 52, height: 52, borderRadius: 26, backgroundColor: '#E5DDBA', opacity: 0.55 },
  artLand: { position: 'absolute', left: -25, right: -35, bottom: -35, height: '62%', backgroundColor: 'rgba(5,8,8,0.58)', transform: [{ rotate: '7deg' }] }, artOverlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0,0,0,0.08)' },
  worldArtCopy: { position: 'absolute', left: 20, right: 20, bottom: 20 }, artEyebrow: { fontFamily: 'Arial', fontSize: 10, letterSpacing: 1.6, color: '#E0E2DE', fontWeight: '700' }, artTitle: { fontFamily: 'Arial', fontSize: 27, lineHeight: 32, color: C.white, fontWeight: '700', marginTop: 5 },
  posterRow: { flexDirection: 'row', gap: 14 }, posterItem: { flex: 1 },
  detailContent: { paddingBottom: 48 }, detailArt: { height: 400, overflow: 'hidden', justifyContent: 'flex-end' }, detailMoon: { position: 'absolute', width: 105, height: 105, borderRadius: 60, backgroundColor: '#DCD5B4', opacity: 0.48, top: 74, right: 35 },
  detailMountain: { position: 'absolute', left: -60, right: -40, height: 220, bottom: -50, backgroundColor: '#0F1613', transform: [{ rotate: '-8deg' }] },
  backDark: { position: 'absolute', top: 14, left: 16, width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(11,12,14,0.5)', alignItems: 'center', justifyContent: 'center' }, backDarkText: { fontSize: 38, lineHeight: 40, color: C.white, marginTop: -4 },
  detailArtCopy: { paddingHorizontal: 20, paddingBottom: 26 }, detailTitle: { fontFamily: 'Arial', fontSize: 36, lineHeight: 40, color: C.white, fontWeight: '700', marginTop: 7 }, detailBody: { paddingHorizontal: 20 },
  hook: { fontFamily: 'Arial', fontSize: 21, lineHeight: 29, color: C.ink, fontWeight: '600', marginVertical: 24 },
  preview: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.line }, playCircle: { width: 46, height: 46, borderRadius: 23, backgroundColor: C.ink, justifyContent: 'center', alignItems: 'center', marginRight: 14 }, play: { color: C.paper, fontSize: 14, marginLeft: 2 }, previewTitle: { fontFamily: 'Arial', fontSize: 16, color: C.ink, fontWeight: '700' },
  mechanics: { flexDirection: 'row', gap: 10 }, mechanic: { flex: 1, minHeight: 130, borderWidth: 1, borderColor: C.line, borderRadius: 16, padding: 12 }, mechanicSymbol: { fontSize: 24, color: C.torch, height: 38 }, mechanicTitle: { fontFamily: 'Arial', fontSize: 14, fontWeight: '700', color: C.ink }, mechanicBody: { fontFamily: 'Arial', fontSize: 11, lineHeight: 15, color: C.muted, marginTop: 4 }, creditBlock: { paddingVertical: 22, marginTop: 20, borderTopWidth: 1, borderColor: C.line },
  formSection: { marginTop: 20 }, formHeading: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }, formTitle: { fontFamily: 'Arial', fontSize: 17, fontWeight: '700', color: C.ink },
  pills: { flexDirection: 'row', gap: 8 }, pill: { flex: 1, minHeight: 48, borderRadius: 24, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' }, pillSelected: { backgroundColor: C.ink, borderColor: C.ink }, pillText: { fontFamily: 'Arial', fontSize: 13, color: C.ink, fontWeight: '600' }, pillTextSelected: { color: C.white },
  readiness: { borderTopWidth: 1, borderColor: C.line, marginTop: 30 }, readinessRow: { minHeight: 52, borderBottomWidth: 1, borderColor: C.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, readinessValue: { flexDirection: 'row', alignItems: 'center', gap: 8 }, readyDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.line }, readyDotOn: { backgroundColor: C.moss },
  safetyNote: { marginTop: 22, padding: 16, backgroundColor: '#E9E6DF', borderRadius: 14 }, safetyTitle: { fontFamily: 'Arial', fontSize: 14, fontWeight: '700', color: C.ink, marginBottom: 3 }, bottomAction: { marginTop: 18 },
  runScreen: { flex: 1, backgroundColor: C.ink, paddingTop: 4 },
  runTopBar: { minHeight: 76, flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 12, paddingTop: 10, zIndex: 2 },
  runBack: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', marginRight: 2 },
  runMetrics: { flex: 1, flexDirection: 'row', justifyContent: 'space-around', paddingTop: 2 },
  runMetricBlock: { minWidth: 64 },
  paceMetric: { width: 100, alignItems: 'flex-end', paddingTop: 2 },
  runMetricLabel: { fontFamily: 'Arial', fontSize: 8, lineHeight: 11, letterSpacing: 1.2, color: '#8E9298', fontWeight: '700' },
  runMetric: { fontFamily: 'Arial Narrow', fontVariant: ['tabular-nums'], fontSize: 22, lineHeight: 27, color: C.white, fontWeight: '700' },
  runMetricUnit: { fontFamily: 'Arial', fontSize: 8, lineHeight: 10, color: '#8E9298', fontWeight: '700' },
  paceStatusRow: { height: 12, flexDirection: 'row', alignItems: 'center', gap: 2 },
  paceStatusText: { fontFamily: 'Arial', fontSize: 7, lineHeight: 9, letterSpacing: 0.6, fontWeight: '700' },
  map: { flex: 1, marginTop: 12, overflow: 'hidden' },
  mapImage: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, width: '100%', height: '100%', transform: [{ scale: 1.24 }] },
  runnerMarker: { position: 'absolute', left: '44%', top: '55%', transform: [{ rotate: '-45deg' }] },
  objectiveWrap: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 14, borderTopWidth: 1, borderColor: '#202328' }, runEyebrow: { fontFamily: 'Arial', fontSize: 9, letterSpacing: 1.5, color: C.torch, fontWeight: '700' }, objective: { minHeight: 52, fontFamily: 'Arial', fontSize: 20, lineHeight: 26, color: C.white, fontWeight: '600', marginTop: 6 }, captionSlot: { height: 51, justifyContent: 'center', overflow: 'hidden' }, audioLine: { minHeight: 48, flexDirection: 'row', alignItems: 'center', marginTop: 4 }, audioDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.torch, marginRight: 8 }, audioDotPaused: { backgroundColor: '#686A70' }, audioText: { fontFamily: 'Arial', fontSize: 12, color: '#A5A8AC', flex: 1 },
  skipChoiceButton: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 24, borderWidth: 1, borderColor: '#4A4E53', paddingHorizontal: 14, marginLeft: 10 }, skipChoiceButtonPressed: { backgroundColor: '#25282D', borderColor: C.torch }, skipChoiceText: { fontFamily: 'Arial', fontSize: 11, color: C.white, fontWeight: '700' },
  runCaption: { fontFamily: 'Arial', fontSize: 12, lineHeight: 17, color: '#A5A8AC' }, sensorResult: { fontFamily: 'Arial', fontSize: 8, letterSpacing: 1.2, color: '#74787D', fontWeight: '700', marginTop: 10 },
  sensorRow: { flexDirection: 'row', gap: 10, marginTop: 12 }, sensorBlock: { gap: 9, marginTop: 12 }, paceAdjustRow: { flexDirection: 'row', alignItems: 'center', gap: 8 }, sensorValue: { flex: 1, textAlign: 'center', fontFamily: 'Arial Narrow', fontSize: 18, color: C.white, fontWeight: '700' }, transcript: { fontFamily: 'Arial', fontSize: 12, lineHeight: 17, color: '#D5D7D9' },
  demoButton: { flex: 1, minHeight: 42, borderRadius: 21, borderWidth: 1, borderColor: '#4A4E53', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 }, demoButtonWide: { flex: 0, width: '100%' }, demoButtonPressed: { backgroundColor: '#25282D', borderColor: C.torch }, demoButtonText: { fontFamily: 'Arial', fontSize: 12, color: C.white, fontWeight: '700' },
  runControls: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 35, paddingVertical: 18, paddingHorizontal: 20 }, roundControl: { width: 62, minHeight: 48, alignItems: 'center', justifyContent: 'center', gap: 5 }, controlGlyph: { color: '#8F9297', fontFamily: 'Arial', fontSize: 14, fontWeight: '700' }, controlGlyphActive: { color: C.white }, controlText: { color: '#8F9297', fontFamily: 'Arial', fontSize: 10 }, controlTextActive: { color: C.white }, runControlPressed: { opacity: 0.6 }, pauseControl: { width: 64, height: 64, borderRadius: 32, backgroundColor: C.paper, alignItems: 'center', justifyContent: 'center' }, pauseControlPressed: { backgroundColor: '#D8D6D0', transform: [{ scale: 0.97 }] },
  modalShade: { flex: 1, backgroundColor: 'rgba(0,0,0,0.62)' },
  pauseSheet: { backgroundColor: C.paper, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  sheetHandle: { width: 40, height: 4, backgroundColor: C.line, borderRadius: 2, alignSelf: 'center', marginBottom: 24 },
  pauseEyebrow: { fontFamily: 'Arial', fontSize: 10, lineHeight: 14, letterSpacing: 1.5, color: C.muted, fontWeight: '700', marginBottom: 7 },
  pauseBody: { fontFamily: 'Arial', fontSize: 15, lineHeight: 21, color: C.muted, marginTop: 8 },
  pauseFacts: { flexDirection: 'row', backgroundColor: '#E9E6DF', borderRadius: 16, paddingVertical: 16, marginTop: 20, marginBottom: 8 },
  endRunButton: { minHeight: 56, borderRadius: 28, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  endRunButtonPressed: { backgroundColor: '#E9E6DF' },
  endRunButtonText: { fontFamily: 'Arial', fontSize: 15, lineHeight: 20, color: C.ink, fontWeight: '700' },
  secondaryButton: { height: 52, alignItems: 'center', justifyContent: 'center', marginTop: 6 }, secondaryButtonText: { fontFamily: 'Arial', fontSize: 15, fontWeight: '700', color: C.muted },
  summaryStats: { backgroundColor: C.ink, borderRadius: 20, padding: 20, marginTop: 12 },
  summaryPrimaryStat: { flexDirection: 'row', alignItems: 'baseline', borderBottomWidth: 1, borderBottomColor: '#292C31', paddingBottom: 18 },
  summaryStatValue: { fontFamily: 'Arial Narrow', fontVariant: ['tabular-nums'], fontSize: 58, lineHeight: 62, color: C.white, fontWeight: '700', letterSpacing: -1.5 },
  summaryStatUnit: { fontFamily: 'Arial', fontSize: 13, lineHeight: 18, color: '#A5A8AC', fontWeight: '700', marginLeft: 7 },
  summaryStatLabel: { fontFamily: 'Arial', fontSize: 8, lineHeight: 11, letterSpacing: 1.2, color: '#8E9298', fontWeight: '700' },
  summaryPrimaryLabel: { marginLeft: 'auto' },
  summarySecondaryStats: { flexDirection: 'row', paddingTop: 18 },
  summarySecondaryStat: { flex: 1 },
  summarySecondaryValue: { fontFamily: 'Arial Narrow', fontVariant: ['tabular-nums'], fontSize: 24, lineHeight: 29, color: C.white, fontWeight: '700' },
  storyProgressHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 30 },
  storyProgressCount: { fontFamily: 'Arial', fontSize: 9, lineHeight: 13, letterSpacing: 1.1, color: C.muted, fontWeight: '700' },
  storyProgressTrack: { flexDirection: 'row', gap: 6, marginTop: 10 },
  storyProgressSegment: { flex: 1, height: 5, borderRadius: 3, backgroundColor: C.line },
  storyProgressSegmentReached: { backgroundColor: C.torch },
  storyCheckpoint: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.line, paddingVertical: 18, marginTop: 18 },
  storyCheckpointLabel: { fontFamily: 'Arial', fontSize: 9, lineHeight: 13, letterSpacing: 1.3, color: C.muted, fontWeight: '700' },
  storyCheckpointTitle: { fontFamily: 'Arial', fontSize: 20, lineHeight: 25, color: C.ink, fontWeight: '700', marginTop: 6, marginBottom: 5 },
  summaryActions: { marginTop: 18 },
  summaryActionHint: { fontFamily: 'Arial', fontSize: 12, lineHeight: 18, color: C.muted, textAlign: 'center', marginHorizontal: 18, marginTop: 9 },
  recapLead: { fontFamily: 'Arial', fontSize: 16, lineHeight: 23, color: C.muted, marginTop: 4, marginBottom: 22 }, recapMap: { height: 240, borderRadius: 20, backgroundColor: '#171A19', overflow: 'hidden' }, recapRoute: { position: 'absolute', left: 15, top: 135, width: 260, height: 5, borderRadius: 3, backgroundColor: C.torch }, recapRouteTwo: { left: 200, top: 92, width: 150, backgroundColor: '#71757A' }, moment: { position: 'absolute', width: 26, height: 26, borderRadius: 13, backgroundColor: C.paper, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: C.ink }, momentOne: { left: 54, top: 143 }, momentTwo: { left: 170, top: 106 }, momentThree: { right: 42, top: 79 }, momentText: { fontFamily: 'Arial', fontSize: 10, fontWeight: '700', color: C.ink }, recapMapLabel: { position: 'absolute', left: 16, bottom: 14, fontFamily: 'Arial', fontSize: 9, letterSpacing: 1.4, color: '#9EA19E', fontWeight: '700' },
  consequenceRow: { flexDirection: 'row', paddingVertical: 14, borderTopWidth: 1, borderColor: C.line }, consequenceTag: { width: 104, fontFamily: 'Arial', fontSize: 9, letterSpacing: 1.2, color: C.muted, fontWeight: '700', paddingTop: 3 }, consequenceBody: { flex: 1, fontFamily: 'Arial', fontSize: 14, lineHeight: 20, color: C.ink, fontWeight: '600' },
  stats: { flexDirection: 'row', backgroundColor: '#E9E6DF', borderRadius: 16, paddingVertical: 18, marginTop: 24 }, stat: { flex: 1, alignItems: 'center' }, statValue: { fontFamily: 'Arial Narrow', fontSize: 21, color: C.ink, fontWeight: '700' }, statLabel: { fontFamily: 'Arial', fontSize: 8, letterSpacing: 1.1, color: C.muted, fontWeight: '700', marginTop: 3 }, nextHook: { borderTopWidth: 1, borderColor: C.line, paddingTop: 20, marginTop: 28, marginBottom: 8 },
  journeyHero: { backgroundColor: C.ink, borderRadius: 20, padding: 22, marginTop: 10, marginBottom: 2 }, journeyTitle: { fontFamily: 'Arial', fontSize: 22, lineHeight: 28, color: C.white, fontWeight: '700', marginVertical: 8 }, timelineItem: { flexDirection: 'row', minHeight: 105 }, timelineRail: { width: 38, alignItems: 'center' }, timelineDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: C.paper, borderWidth: 2, borderColor: C.muted, zIndex: 2 }, timelineDotActive: { backgroundColor: C.torch, borderColor: C.torch }, timelineLine: { width: 1, flex: 1, backgroundColor: C.line }, timelineCopy: { flex: 1, paddingBottom: 22 }, timelineTitle: { fontFamily: 'Arial', fontSize: 16, lineHeight: 21, color: C.ink, fontWeight: '700', marginBottom: 3 },
  profileCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: 20, borderBottomWidth: 1, borderColor: C.line }, avatar: { width: 58, height: 58, borderRadius: 29, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center', marginRight: 14 }, avatarText: { fontFamily: 'Arial', fontSize: 21, color: C.paper, fontWeight: '700' }, youStats: { flexDirection: 'row', paddingVertical: 22, borderBottomWidth: 1, borderColor: C.line }, menuRow: { minHeight: 58, borderTopWidth: 1, borderColor: C.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, menuRight: { flexDirection: 'row', alignItems: 'center' },
  historyItem: { flexDirection: 'row', alignItems: 'center', minHeight: 108, borderTopWidth: 1, borderColor: C.line, paddingVertical: 16 }, historyMark: { width: 3, height: 56, borderRadius: 2, backgroundColor: C.torch, marginRight: 14 }, settingsFoot: { fontFamily: 'Arial', fontSize: 12, lineHeight: 18, color: C.muted, marginTop: 24 },
  tabBarPosition: { position: 'absolute', left: 12, right: 12, bottom: 10, height: 82, borderRadius: 29, shadowColor: '#000', shadowOpacity: 0.22, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 10 },
  tabGlass: { flex: 1, borderRadius: 29, overflow: 'hidden' },
  tabFallback: { flex: 1, borderRadius: 29, overflow: 'hidden', backgroundColor: 'rgba(11,12,14,0.94)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.16)' },
  tabContent: { flex: 1, flexDirection: 'row', paddingHorizontal: 6, paddingTop: 9, paddingBottom: 7 },
  tabItem: { flex: 1, minWidth: 64, alignItems: 'center', justifyContent: 'center' },
  tabLabel: { fontFamily: 'Arial', color: '#92959A', fontSize: 11, lineHeight: 14, marginTop: 4, fontWeight: '600' }, tabActive: { color: C.white },
});
