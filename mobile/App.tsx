import React, { useState } from 'react';
import {
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
};

type Tab = 'home' | 'worlds' | 'journey' | 'you';
type Screen = Tab | 'detail' | 'setup' | 'run' | 'recap' | 'history' | 'settings';

const worlds = [
  { title: 'The North Road', genre: 'Worlds Original', tone: 'A kingdom at dusk', colors: ['#151B1A', '#4D6C55'] as const },
  { title: 'Signal Lost', genre: 'Future World', tone: 'Deep-space survival', colors: ['#101322', '#536DFE'] as const },
  { title: 'Blackwater', genre: 'Creator World', tone: 'Coastal mystery', colors: ['#111B20', '#315665'] as const },
];

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [tab, setTab] = useState<Tab>('home');
  const [runLength, setRunLength] = useState('30 min');

  const goTab = (next: Tab) => {
    setTab(next);
    setScreen(next);
  };

  const showTabs = ['home', 'worlds', 'journey', 'you'].includes(screen);
  const dark = screen === 'run';

  return (
    <SafeAreaView style={[styles.safe, dark && styles.safeDark]}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      {screen === 'home' && <Home onContinue={() => setScreen('setup')} onWorld={() => setScreen('detail')} />}
      {screen === 'worlds' && <Worlds onWorld={() => setScreen('detail')} />}
      {screen === 'journey' && <Journey />}
      {screen === 'you' && <You onHistory={() => setScreen('history')} onSettings={() => setScreen('settings')} />}
      {screen === 'detail' && <WorldDetail onBack={() => setScreen(tab)} onEnter={() => setScreen('setup')} />}
      {screen === 'setup' && (
        <PreRun
          length={runLength}
          onLength={setRunLength}
          onBack={() => setScreen('detail')}
          onStart={() => setScreen('run')}
        />
      )}
      {screen === 'run' && <ActiveRun onFinish={() => setScreen('recap')} />}
      {screen === 'recap' && <Recap onDone={() => goTab('home')} />}
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
            <Text style={styles.heroEyebrow}>CURRENT JOURNEY · THE NORTH ROAD</Text>
            <Text style={styles.heroTitle}>Reach the bell tower before dark.</Text>
            <Text style={styles.heroState}>Mara is injured. The northern gate is closed.</Text>
            <PrimaryButton label="Continue · 30 min" onPress={onContinue} />
          </View>
        </LinearGradient>
      </Pressable>

      <SectionTitle title="For tonight" action="Curated for 30 min" />
      <Pressable onPress={onWorld} style={styles.featureRow}>
        <WorldArt colors={worlds[0].colors} compact />
        <View style={styles.featureCopy}>
          <Text style={styles.cardEyebrow}>WORLDS ORIGINAL</Text>
          <Text style={styles.cardTitle}>The North Road</Text>
          <Text style={styles.bodyMuted}>A fugitive princess. One road left north.</Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </Pressable>

      <View style={styles.consequence}>
        <Text style={styles.cardEyebrow}>LAST CONSEQUENCE</Text>
        <Text style={styles.consequenceText}>You chose the forest. Ilan remembers.</Text>
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
          <Text style={styles.artEyebrow}>A KINGDOM AT DUSK</Text>
          <Text style={styles.artTitle}>The North Road</Text>
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
            <Text style={styles.detailTitle}>The North Road</Text>
          </View>
        </View>
        <View style={styles.detailBody}>
          <Text style={styles.hook}>The crown has fallen. Before dawn, decide who rises in its place.</Text>
          <Pressable style={styles.preview}>
            <View style={styles.playCircle}><Text style={styles.play}>▶</Text></View>
            <View style={styles.grow}>
              <Text style={styles.previewTitle}>Hear the world</Text>
              <Text style={styles.meta}>Voice preview · 24 sec</Text>
            </View>
            <View style={styles.wave}><Text style={styles.waveText}>╵╷│╵╷│╵</Text></View>
          </Pressable>
          <SectionTitle title="Your movement matters" />
          <View style={styles.mechanics}>
            <Mechanic symbol="↱" title="Direction" body="Choose the road" />
            <Mechanic symbol="≈" title="Pace" body="Escape or hide" />
            <Mechanic symbol="•" title="Stops" body="Find what others miss" />
          </View>
          <View style={styles.creditBlock}>
            <Text style={styles.cardEyebrow}>AUTHORED WORLD</Text>
            <Text style={styles.body}>Created for Worlds · Featuring Mara, Ilan and The Warden</Text>
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
  onBack,
  onStart,
}: {
  length: string;
  onLength: (value: string) => void;
  onBack: () => void;
  onStart: () => void;
}) {
  return (
    <Page noTab>
      <Header eyebrow="THE NORTH ROAD" title="Shape this run." onBack={onBack} />
      <Text style={styles.intro}>We’ll adapt the next story beat to the time and effort you choose.</Text>
      <FormSection title="Run length" note="30 min recommended">
        <Pills values={['15 min', '30 min', '45 min']} selected={length} onSelect={onLength} />
      </FormSection>
      <FormSection title="Intensity" note="In physical terms">
        <Pills values={['Recovery', 'Steady', 'Challenge']} selected="Steady" onSelect={() => {}} />
      </FormSection>
      <View style={styles.readiness}>
        <ReadinessRow label="Headphones" value="Connected" ready />
        <ReadinessRow label="Location" value="GPS ready" ready />
        <ReadinessRow label="Audio" value="Volume safe" ready />
      </View>
      <View style={styles.safetyNote}>
        <Text style={styles.safetyTitle}>Stay aware of your surroundings.</Text>
        <Text style={styles.bodyMuted}>Choose a familiar route and obey local traffic rules.</Text>
      </View>
      <View style={styles.bottomAction}>
        <PrimaryButton label="Start story" onPress={onStart} />
      </View>
    </Page>
  );
}

function ActiveRun({ onFinish }: { onFinish: () => void }) {
  const [paused, setPaused] = useState(false);
  return (
    <View style={styles.runScreen}>
      <NativeStatusBar barStyle="light-content" />
      <View style={styles.runMetrics}>
        <View><Text style={styles.runMetricLabel}>ELAPSED</Text><Text style={styles.runMetric}>18:42</Text></View>
        <View style={styles.metricRight}><Text style={styles.runMetricLabel}>PACE</Text><Text style={styles.runMetric}>5:48</Text></View>
      </View>
      <View style={styles.map}>
        <View style={styles.mapGridA} />
        <View style={styles.mapGridB} />
        <View style={[styles.route, styles.routePast]} />
        <View style={[styles.route, styles.routeCurrent]} />
        <View style={[styles.route, styles.routeAlternate]} />
        <View style={styles.storyPoint}><View style={styles.storyPointCore} /></View>
        <View style={styles.runnerHalo}><View style={styles.runnerMarker} /></View>
        <View style={styles.mapLabel}><Text style={styles.mapLabelText}>BELL TOWER</Text></View>
      </View>
      <View style={styles.objectiveWrap}>
        <Text style={styles.runEyebrow}>CURRENT OBJECTIVE</Text>
        <Text style={styles.objective}>Keep north. The riders are close.</Text>
        <View style={styles.audioLine}>
          <View style={styles.audioDot} />
          <Text style={styles.audioText}>Mara is speaking</Text>
          <Text style={styles.audioWave}>╵╷│╵╷│</Text>
        </View>
      </View>
      <View style={styles.runControls}>
        <Pressable style={styles.roundControl}><Text style={styles.controlGlyph}>CC</Text><Text style={styles.controlText}>Captions</Text></Pressable>
        <Pressable onPress={() => setPaused(true)} style={styles.pauseControl}><Text style={styles.pauseGlyph}>Ⅱ</Text></Pressable>
        <Pressable style={styles.roundControl}><Text style={styles.controlGlyph}>↶</Text><Text style={styles.controlText}>Repeat</Text></Pressable>
      </View>
      <Modal transparent visible={paused} animationType="slide" onRequestClose={() => setPaused(false)}>
        <Pressable style={styles.modalShade} onPress={() => setPaused(false)} />
        <View style={styles.pauseSheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.pageTitle}>Story paused.</Text>
          <Text style={styles.bodyMuted}>Your route and story state are safe.</Text>
          <PrimaryButton label="Resume story" onPress={() => setPaused(false)} />
          <Pressable style={styles.secondaryButton} onPress={onFinish}><Text style={styles.secondaryButtonText}>End demo run</Text></Pressable>
        </View>
      </Modal>
    </View>
  );
}

function Recap({ onDone }: { onDone: () => void }) {
  return (
    <Page noTab>
      <Header eyebrow="RUN COMPLETE" title="You reached the bell tower alone." />
      <Text style={styles.recapLead}>Mara held the lower road so you could carry the king’s seal north.</Text>
      <View style={styles.recapMap}>
        <View style={[styles.recapRoute, { transform: [{ rotate: '-16deg' }] }]} />
        <View style={[styles.recapRoute, styles.recapRouteTwo, { transform: [{ rotate: '24deg' }] }]} />
        <Moment style={styles.momentOne} number="1" />
        <Moment style={styles.momentTwo} number="2" />
        <Moment style={styles.momentThree} number="3" />
        <Text style={styles.recapMapLabel}>YOUR NORTH ROAD</Text>
      </View>
      <SectionTitle title="What changed" />
      <Consequence tag="DECISION" text="You entered Alder Wood." />
      <Consequence tag="CONSEQUENCE" text="Mara was injured at the northern gate." />
      <Consequence tag="DISCOVERY" text="You carry the king’s seal." />
      <View style={styles.stats}>
        <Stat value="30:08" label="TIME" />
        <Stat value="5.14" label="KM" />
        <Stat value="5:52" label="AVG PACE" />
      </View>
      <View style={styles.nextHook}>
        <Text style={styles.cardEyebrow}>NEXT TIME</Text>
        <Text style={styles.cardTitle}>The tower is occupied.</Text>
        <Text style={styles.bodyMuted}>Recommended: at least 20 minutes</Text>
      </View>
      <PrimaryButton label="Return home" onPress={onDone} />
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
  preview: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.line }, playCircle: { width: 46, height: 46, borderRadius: 23, backgroundColor: C.ink, justifyContent: 'center', alignItems: 'center', marginRight: 14 }, play: { color: C.paper, fontSize: 14, marginLeft: 2 }, previewTitle: { fontFamily: 'Arial', fontSize: 16, color: C.ink, fontWeight: '700' }, wave: { marginLeft: 8 }, waveText: { color: C.torch, fontSize: 16 },
  mechanics: { flexDirection: 'row', gap: 10 }, mechanic: { flex: 1, minHeight: 130, borderWidth: 1, borderColor: C.line, borderRadius: 16, padding: 12 }, mechanicSymbol: { fontSize: 24, color: C.torch, height: 38 }, mechanicTitle: { fontFamily: 'Arial', fontSize: 14, fontWeight: '700', color: C.ink }, mechanicBody: { fontFamily: 'Arial', fontSize: 11, lineHeight: 15, color: C.muted, marginTop: 4 }, creditBlock: { paddingVertical: 22, marginTop: 20, borderTopWidth: 1, borderColor: C.line },
  formSection: { marginTop: 20 }, formHeading: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }, formTitle: { fontFamily: 'Arial', fontSize: 17, fontWeight: '700', color: C.ink },
  pills: { flexDirection: 'row', gap: 8 }, pill: { flex: 1, minHeight: 48, borderRadius: 24, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' }, pillSelected: { backgroundColor: C.ink, borderColor: C.ink }, pillText: { fontFamily: 'Arial', fontSize: 13, color: C.ink, fontWeight: '600' }, pillTextSelected: { color: C.white },
  readiness: { borderTopWidth: 1, borderColor: C.line, marginTop: 30 }, readinessRow: { minHeight: 52, borderBottomWidth: 1, borderColor: C.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, readinessValue: { flexDirection: 'row', alignItems: 'center', gap: 8 }, readyDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.line }, readyDotOn: { backgroundColor: C.moss },
  safetyNote: { marginTop: 22, padding: 16, backgroundColor: '#E9E6DF', borderRadius: 14 }, safetyTitle: { fontFamily: 'Arial', fontSize: 14, fontWeight: '700', color: C.ink, marginBottom: 3 }, bottomAction: { marginTop: 18 },
  runScreen: { flex: 1, backgroundColor: C.ink, paddingTop: 12 }, runMetrics: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10, zIndex: 2 }, metricRight: { alignItems: 'flex-end' }, runMetricLabel: { fontFamily: 'Arial', fontSize: 9, letterSpacing: 1.4, color: '#8E9298', fontWeight: '700' }, runMetric: { fontFamily: 'Arial Narrow', fontSize: 26, lineHeight: 30, color: C.white, fontWeight: '600' },
  map: { flex: 1, marginTop: 12, overflow: 'hidden' }, mapGridA: { position: 'absolute', left: -80, right: -70, top: '34%', height: 1, backgroundColor: '#22252A', transform: [{ rotate: '-23deg' }] }, mapGridB: { position: 'absolute', left: -50, right: -80, top: '62%', height: 1, backgroundColor: '#22252A', transform: [{ rotate: '18deg' }] },
  route: { position: 'absolute', height: 6, borderRadius: 3, transformOrigin: 'left center' }, routePast: { width: 190, left: -18, top: '76%', backgroundColor: '#55585C', transform: [{ rotate: '-50deg' }] }, routeCurrent: { width: 260, left: '39%', top: '51%', backgroundColor: C.torch, transform: [{ rotate: '-57deg' }] }, routeAlternate: { width: 180, left: '45%', top: '50%', height: 3, backgroundColor: '#3B3D42', transform: [{ rotate: '-14deg' }] },
  runnerHalo: { position: 'absolute', left: '39%', top: '47%', width: 42, height: 42, borderRadius: 21, borderWidth: 1, borderColor: 'rgba(255,79,46,0.4)', alignItems: 'center', justifyContent: 'center' }, runnerMarker: { width: 15, height: 21, backgroundColor: C.torch, borderTopLeftRadius: 8, borderTopRightRadius: 8, borderBottomRightRadius: 8, transform: [{ rotate: '36deg' }] },
  storyPoint: { position: 'absolute', right: 50, top: '16%', width: 22, height: 22, borderRadius: 11, borderWidth: 1, borderColor: '#A6A8AB', alignItems: 'center', justifyContent: 'center' }, storyPointCore: { width: 5, height: 5, borderRadius: 3, backgroundColor: C.white }, mapLabel: { position: 'absolute', right: 20, top: '24%' }, mapLabelText: { color: '#95989C', fontFamily: 'Arial', fontSize: 9, letterSpacing: 1.4, fontWeight: '700' },
  objectiveWrap: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 14, borderTopWidth: 1, borderColor: '#202328' }, runEyebrow: { fontFamily: 'Arial', fontSize: 9, letterSpacing: 1.5, color: C.torch, fontWeight: '700' }, objective: { fontFamily: 'Arial', fontSize: 20, lineHeight: 26, color: C.white, fontWeight: '600', marginTop: 6 }, audioLine: { flexDirection: 'row', alignItems: 'center', marginTop: 12 }, audioDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.torch, marginRight: 8 }, audioText: { fontFamily: 'Arial', fontSize: 12, color: '#A5A8AC', flex: 1 }, audioWave: { color: '#A5A8AC', fontSize: 13 },
  runControls: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 35, paddingVertical: 18, paddingHorizontal: 20 }, roundControl: { width: 62, alignItems: 'center', gap: 5 }, controlGlyph: { color: C.white, fontFamily: 'Arial', fontSize: 14, fontWeight: '700' }, controlText: { color: '#8F9297', fontFamily: 'Arial', fontSize: 10 }, pauseControl: { width: 64, height: 64, borderRadius: 32, backgroundColor: C.paper, alignItems: 'center', justifyContent: 'center' }, pauseGlyph: { color: C.ink, fontFamily: 'Arial', fontSize: 24, fontWeight: '800' },
  modalShade: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' }, pauseSheet: { backgroundColor: C.paper, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 36, borderTopLeftRadius: 24, borderTopRightRadius: 24 }, sheetHandle: { width: 40, height: 4, backgroundColor: C.line, borderRadius: 2, alignSelf: 'center', marginBottom: 24 }, secondaryButton: { height: 52, alignItems: 'center', justifyContent: 'center', marginTop: 6 }, secondaryButtonText: { fontFamily: 'Arial', fontSize: 15, fontWeight: '700', color: C.muted },
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
