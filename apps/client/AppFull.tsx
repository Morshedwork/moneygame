import { useEffect, useRef, useState, FormEvent, lazy, Suspense } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  Play,
  BookOpen,
  Home,
  Store,
  Map,
  Users,
  Settings,
  LogOut,
  Volume2,
  VolumeX,
  Shield,
  Star,
  Check,
  Lock,
  Coins,
  Landmark,
  Dices,
  ChevronLeft,
  X,
  Menu,
  Download,
  Sparkles,
  Heart,
  Flag,
} from "lucide-react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  onAuthStateChanged,
  signOut,
  updateProfile,
  sendEmailVerification,
} from "firebase/auth";
import { doc, onSnapshot, collection, query, where } from "firebase/firestore";
import { auth, db, cloud, friendlyError } from "./firebase";
import { useGame, ViewPlayer } from "./store";
import {
  lessons,
  gate,
  mascots,
  boardNames,
  glossary,
} from "../../packages/curriculum";
import { totals, Game } from "../../packages/game-rules";
import { leadTheme } from "./theme";
import { useBoardPresentation } from "./useBoardPresentation";
import {
  WorldPreview,
  CharacterPortrait,
  BoardWorld,
} from "./World";
import { VillageExperience } from "./village/VillageExperience";
import HeroLab from "./hero-lab/HeroLab";
import { heroCompleted } from "../../packages/hero-lab";
import { ShopSetup } from "./shop/ShopSetup";
import { BoardEventCards } from "./board-cards/BoardEventCards";
const Brand = () => (
  <span className="brand">
    <span className="brand-symbol">✦</span>
    <span>
      <span className="brand-word"><span>L</span><span>E</span><span>A</span><span>D</span></span><small>MONEY GAME</small>
    </span>
  </span>
);
const Button = ({
  children,
  onClick,
  secondary = false,
  disabled = false,
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  secondary?: boolean;
  disabled?: boolean;
  type?: "button" | "submit";
}) => (
  <button
    type={type}
    className={secondary ? "button secondary" : "button primary"}
    onClick={onClick}
    disabled={disabled}
  >
    {children}
  </button>
);
const Chip = ({ children }: { children: React.ReactNode }) => (
  <span className="eyebrow">{children}</span>
);
function nextPage(p: ViewPlayer) {
  return !p.rewarded
    ? "learn"
    : !p.game
      ? "setup"
      : p.game.phase === "reflection"
        ? "reflection"
        : p.game.phase === "village"
          ? "village"
          : "board";
}
function Landing() {
  const { setPage, startPractice } = useGame();
  return (
    <div className="landing">
      <nav className="landing-nav">
        <a href="#" aria-label="LEAD home">
          <Brand />
        </a>
        <div className="nav-links">
          <a href="#adventure">The adventure</a>
          <a href="#how">How it works</a>
          <a href="#parents">For parents</a>
        </div>
        <Button secondary onClick={() => setPage("login")}>
          Log in <ArrowUpRight size={17} />
        </Button>
      </nav>
      <main>
        <section className="hero" id="adventure">
          <div className="hero-copy">
            <Chip>
              <span className="status-dot" /> A JAPAN-INSPIRED FESTIVAL ADVENTURE
            </Chip>
            <h1>
              Small steps.
              <br />
              Big <em>possibilities.</em>
            </h1>
            <p>
              Paper lanterns. Cherry blossoms. Your very own bento stall.
              Discover the joy of making smart money choices in Yatai Village—one
              adventure at a time.
            </p>
            <div className="hero-actions">
              <a className="button primary" href="/mission">Play four-quarter Money Quest</a>
              <Button onClick={() => setPage("signup")}>
                Start your adventure <ArrowUpRight size={19} />
              </Button>
              <button className="text-button" onClick={startPractice}>
                <span className="play-circle">
                  <Play size={14} fill="currentColor" />
                </span>{" "}
                Try practice
              </button>
            </div>
            <div className="hero-meta">
              <span>AGES 9–15</span>
              <i />
              <span>LEARN BY DOING</span>
              <i />
              <span>YOUR PACE. YOUR PATH.</span>
            </div>
          </div>
          <div className="hero-world">
            <WorldPreview />
            <div className="world-label">
              <span>01 / LANTERN-LIT STREETS. BRIGHT IDEAS.</span>
              <strong>
                Yatai Village <ArrowUpRight size={23} />
              </strong>
            </div>
            <div className="floating-note">
              <span>✦</span> Little choices.
              <br />
              <b>Real growth.</b>
            </div>
          </div>
        </section>
        <section className="intro-strip">
          <Chip>
            REAL SKILLS.
            <br />
            PLAYFUL POSSIBILITIES.
          </Chip>
          {[
            [Coins, "Understand money"],
            [Store, "Build something yours"],
            [Sparkles, "Grow with every choice"],
          ].map(([Icon, label]: any, i) => (
            <div key={i}>
              <span className={"feature-icon color-" + i}>
                <Icon size={22} />
              </span>
              <b>{label}</b>
            </div>
          ))}
        </section>
        <section className="how-section" id="how">
          <div>
            <Chip>THE ADVENTURE, IN THREE LITTLE STEPS</Chip>
            <h2>
              Learn it. Try it.
              <br />
              <em>Make it your own.</em>
            </h2>
          </div>
          <div className="steps-grid">
            {[
              [
                "01",
                "Meet your money mentor",
                "Sparko brings price, cost, and profit to life. Practice until it makes sense.",
              ],
              [
                "02",
                "Open your first business",
                "Name your stall. Set a price. Meet customers and navigate a changing market.",
              ],
              [
                "03",
                "Find your place in the village",
                "Reflect on your first quarter, then explore a world of kind characters and bright ideas.",
              ],
            ].map((s) => (
              <article key={s[0]}>
                <span>{s[0]}</span>
                <h3>{s[1]}</h3>
                <p>{s[2]}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="friends-section">
          <Chip>GOOD COMPANY FOR A GREAT ADVENTURE</Chip>
          <h2>Meet your little team.</h2>
          <div className="mentor-grid">
            {mascots.map((m) => (
              <article
                key={m.id}
                style={{ "--mentor": m.color } as React.CSSProperties}
              >
                <div className="mentor-portrait">
                  <CharacterPortrait name={m.id} animation={m.id === "lido" ? "Wave" : m.id === "prena" ? "Explain" : m.id === "oty" ? "Encourage" : "Ask"} />
                </div>
                <div>
                  <h3>{m.name}</h3>
                  <small>{m.role}</small>
                  <p>{m.motto}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
        <section className="parent-intro" id="parents">
          <div className="parent-symbol">
            <Heart size={46} />
          </div>
          <div>
            <Chip>A LITTLE PEACE OF MIND</Chip>
            <h2>Growing together starts here.</h2>
            <p>
              Stay close to their learning. Link your child’s account, follow
              their progress, and talk about the choices they made. No public
              chat. No purchases. No pressure to be perfect.
            </p>
          </div>
          <Button secondary onClick={() => setPage("signup-parent")}>
            Explore parent access <ArrowUpRight size={18} />
          </Button>
        </section>
      </main>
      <footer>
        <Brand />
        <p>Leadership · Entrepreneurship · Authenticity · Diversity</p>
        <button className="text-button" onClick={() => setPage("privacy")}>
          Privacy & safety
        </button>
        <span>© {new Date().getFullYear()} LEAD</span>
      </footer>
    </div>
  );
}
function AuthPage() {
  const { page, setPage, setPlayer, setError, startPractice } = useGame();
  const signup = page.startsWith("signup");
  const reset = page === "reset";
  const [role, setRole] = useState(
    page === "signup-parent" ? "parent" : "student",
  );
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (reset) {
        await sendPasswordResetEmail(auth, email);
        setDone(
          "If an account exists, a reset email is on its way. Check your inbox.",
        );
        return;
      }
      const credential = signup
        ? await createUserWithEmailAndPassword(auth, email, password)
        : await signInWithEmailAndPassword(auth, email, password);
      if (signup) {
        await updateProfile(credential.user, { displayName: name });
        await sendEmailVerification(credential.user).catch(() => {});
      }
      const p = await cloud("init", {
        name: signup ? name : credential.user.displayName || "Explorer",
        role,
      });
      setPlayer(p);
      setPage(p.role === "student" ? "dashboard" : p.role);
    } catch (error) {
      setError(friendlyError(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-page">
      <button className="back" onClick={() => setPage("home")}>
        <ChevronLeft size={18} /> Back to the village
      </button>
      <section className="auth-story">
        <Brand />
        <Chip>YOUR NEXT CHAPTER STARTS HERE</Chip>
        <h1>
          A little courage.
          <br />A big adventure.
        </h1>
        <p>Every great idea starts with someone like you.</p>
        <div className="auth-character">
          <CharacterPortrait name="sparko" animation="Wave" />
        </div>
        <span className="quote">
          “You don’t need to be perfect.
          <br />
          You just need to try.”
        </span>
      </section>
      <section className="auth-form">
        <Chip>
          {reset
            ? "LET’S GET YOU BACK IN"
            : signup
              ? "WELCOME TO LEAD"
              : "GOOD TO SEE YOU AGAIN"}
        </Chip>
        <h2>
          {reset
            ? "Forgot your password?"
            : signup
              ? "Create your account"
              : "Welcome back."}
        </h2>
        <p>
          {signup
            ? "Your world is waiting. Let’s make it yours."
            : "Ready to keep growing?"}
        </p>
        {done ? (
          <div className="success-box">
            {done}
            <Button secondary onClick={() => setPage("login")}>
              Return to log in
            </Button>
          </div>
        ) : (
          <form onSubmit={submit}>
            {signup && (
              <>
                <div className="role-tabs">
                  <button
                    type="button"
                    className={role === "student" ? "selected" : ""}
                    onClick={() => setRole("student")}
                  >
                    <Star size={17} /> Student
                  </button>
                  <button
                    type="button"
                    className={role === "parent" ? "selected" : ""}
                    onClick={() => setRole("parent")}
                  >
                    <Shield size={17} /> Parent
                  </button>
                </div>
                <label>
                  {role === "student"
                    ? "Display name (not your full name)"
                    : "Your name"}
                  <input
                    autoComplete="nickname"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    minLength={2}
                    maxLength={32}
                    placeholder="What should we call you?"
                  />
                </label>
              </>
            )}
            <label>
              Email address
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
              />
            </label>
            {!reset && (
              <label>
                Password
                <input
                  type="password"
                  autoComplete={signup ? "new-password" : "current-password"}
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="At least 8 characters"
                />
              </label>
            )}
            {signup && (
              <label className="checkbox">
                <input type="checkbox" required />{" "}
                <span>
                  {role === "student"
                    ? "My parent or guardian has approved this account."
                    : "I am the parent or guardian using this account."}{" "}
                  I agree to the{" "}
                  <button
                    type="button"
                    className="inline-link"
                    onClick={() => setPage("privacy")}
                  >
                    privacy & safety information
                  </button>
                  .
                </span>
              </label>
            )}
            <Button type="submit" disabled={busy}>
              {busy
                ? "Connecting…"
                : reset
                  ? "Send reset email"
                  : signup
                    ? "Create account"
                    : "Log in"}
              <ArrowRight size={18} />
            </Button>
            {!signup && !reset && (
              <button
                type="button"
                className="inline-link"
                onClick={() => setPage("reset")}
              >
                Forgot your password?
              </button>
            )}
          </form>
        )}
        <p className="auth-switch">
          {signup ? "Already have an account?" : "New to LEAD?"}{" "}
          <button
            className="inline-link"
            onClick={() => {
              setPage(signup ? "login" : "signup");
              setDone("");
            }}
          >
            {signup ? "Log in" : "Create account"}
          </button>
        </p>
        <div className="auth-practice">
          <span>Just looking around?</span>
          <button className="inline-link" onClick={startPractice}>
            Try an unsaved practice adventure <ArrowRight size={14} />
          </button>
        </div>
        <small className="muted">
          Administrators use their invited account to log in. Admin access is
          assigned securely by the project owner.
        </small>
      </section>
    </div>
  );
}
function Shell({ children }: { children: React.ReactNode }) {
  const {
    player: p,
    page,
    setPage,
    practice,
    muted,
    toggleSound,
    exit,
  } = useGame();
  const [menu, setMenu] = useState(false);
  const items =
    p?.role === "student"
      ? [
          [Home, "dashboard", "Overview"],
          [BookOpen, "learn", "Learning"],
          [Sparkles, "hero-lab", "Hero Lab"],
          [Dices, "board", "My adventure"],
          [Map, "village", "Yatai Village"],
          [Store, "journal", "My business"],
          [Users, "friends", "Play with friends"],
          [Settings, "settings", "Settings"],
        ]
      : [
          [Home, p?.role || "parent", "Overview"],
          [Settings, "settings", "Settings"],
        ];
  return (
    <div className="app-shell">
      <aside className={menu ? "sidebar open" : "sidebar"}>
        <button className="brand-button" onClick={() => setPage("dashboard")}>
          <Brand />
        </button>
        <div className="side-label">YOUR LITTLE WORLD</div>
        <nav>
          {items.map(([Icon, id, label]: any) => (
            <button
              key={id}
              className={page === id ? "active" : ""}
              onClick={() => {
                setPage(id);
                setMenu(false);
              }}
            >
              <Icon size={20} />
              {label}
              {id === "village" && p?.game?.phase !== "village" && (
                <Lock size={13} />
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="side-tip">
            <Sparkles size={20} />
            <p>
              Big things start
              <br />
              with small steps.
            </p>
          </div>
          <button
            onClick={async () => {
              if (!practice) await signOut(auth);
              exit();
            }}
          >
            <LogOut size={18} />
            {practice ? "End practice" : "Log out"}
          </button>
        </div>
      </aside>
      <div className="app-content">
        <header className="app-header">
          <button
            className="icon-button mobile-menu"
            aria-label="Toggle menu"
            onClick={() => setMenu(!menu)}
          >
            <Menu size={22} />
          </button>
          <div className="breadcrumb">
            Your journey <span>/</span>{" "}
            <b>
              {String(
                items.find((i: any) => i[1] === page)?.[2] || "Adventure",
              )}
            </b>
          </div>
          <div className="header-tools">
            {practice && (
              <span className="practice-badge">PRACTICE · NOT SAVED</span>
            )}
            <button
              className="icon-button"
              aria-label={muted ? "Enable sound" : "Mute sound"}
              onClick={toggleSound}
            >
              {muted ? <VolumeX size={19} /> : <Volume2 size={19} />}
            </button>
            <span className={"mini-avatar " + p?.avatar}>
              {p?.name.charAt(0)}
            </span>
            <b>{p?.name}</b>
          </div>
        </header>
        {practice && (
          <div className="practice-note">
            Practice is on this page only. Real accounts use Firebase; no
            practice progress is uploaded or saved.
          </div>
        )}
        <main className="page-content">{children}</main>
      </div>
    </div>
  );
}
function Dashboard() {
  const { player: p, setPage, practice } = useGame();
  const [code, setCode] = useState("");
  const [linkError, setLinkError] = useState("");
  if (!p) return null;
  const g = p.game;
  const done = p.rewarded ? 100 : Math.round(((p.lesson + p.gate) / 9) * 100);
  return (
    <>
      <div className="page-heading">
        <div>
          <Chip>EVERY DAY IS A CHANCE TO GROW</Chip>
          <h1>
            Hello, {p.name}
            <span className="wave"> ✦</span>
          </h1>
          <p>Your next little adventure is waiting.</p>
        </div>
        <span className="chapter-chip">CHAPTER 01 / YATAI VILLAGE</span>
      </div>
      <div className="dashboard-hero">
        <div>
          <Chip>
            {g?.phase === "village"
              ? "YOU DID SOMETHING BRAVE"
              : "YOUR NEXT STEP"}
          </Chip>
          <h2>
            {!p.rewarded
              ? "Good businesses start with bright ideas."
              : !g
                ? "Let’s bring your idea to life."
                : g.phase === "village"
                  ? "The village is yours to discover."
                  : "Every choice tells a story."}
          </h2>
          <p>
            {!p.rewarded
              ? "Meet Sparko and discover how money works. A little learning now makes a world of difference later."
              : !g
                ? "Your five learning coins are ready. Give your stall a name and set your very first price."
                : "Take a breath, follow your curiosity, and see what happens next."}
          </p>
          <Button onClick={() => setPage(nextPage(p))}>
            {!p.rewarded
              ? "Meet Sparko & learn"
              : !g
                ? "Create my business"
                : g.phase === "village"
                  ? "Explore the village"
                  : "Continue my adventure"}
            <ArrowUpRight size={18} />
          </Button>
        </div>
        <div className="dashboard-mascot">
          <CharacterPortrait
            name={!p.rewarded ? "sparko" : p.avatar}
            animation="Wave"
          />
          <span className="mascot-name">
            {!p.rewarded ? "SPARKO · YOUR MONEY MENTOR" : "YOUR HERO-PRENEUR"}
          </span>
        </div>
      </div>
      <div className="stat-grid">
        <Stat
          icon={<BookOpen />}
          value={`${done}%`}
          label="Finance foundations"
        />
        <Stat
          icon={<Coins />}
          value={g?.wallet ?? (p.rewarded ? 5 : 0)}
          label="LEAD Coins in wallet"
        />
        <Stat
          icon={<Landmark />}
          value={g?.savings ?? 0}
          label="Coins saved for tomorrow"
        />
        <Stat
          icon={<Flag />}
          value={
            g?.phase === "village"
              ? "Complete"
              : g
                ? `${g.position}/20`
                : "Ready when you are"
          }
          label="Your first quarter"
        />
      </div>
      <div className="section-title">
        <h2>Your adventure map</h2>
        <span>No rush. You set the pace.</span>
      </div>
      <section className="panel hero-lab-invite">
        <div><Chip>NEW · THE HERO LAB</Chip><h2>Twelve little trails. One bigger adventure.</h2><p>Discover your strengths, solve festival challenges, design a sign and bring your idea to life. {heroCompleted(p.heroLab)} of 12 learning stamps collected.</p></div>
        <Button onClick={() => setPage("hero-lab")}>Explore the Hero Lab <Sparkles size={18} /></Button>
      </section>
      <div className="journey-cards">
        {[
          [
            "01",
            "Finance foundations",
            "Meet Sparko, watch, practice, and understand.",
            "learn",
            false,
            p.rewarded,
          ],
          [
            "02",
            "Your first business",
            "A name. A menu. A chance to make it yours.",
            "setup",
            !p.rewarded,
            !!g,
          ],
          [
            "03",
            "A quarter of choices",
            "Twenty spaces. Real decisions. Room to grow.",
            "board",
            !g,
            g?.phase !== "board" && !!g,
          ],
          [
            "04",
            "Life in Yatai Village",
            "Explore, connect, and celebrate your first chapter.",
            "village",
            g?.phase !== "village",
            g?.phase === "village",
          ],
        ].map(([num, title, text, target, locked, completed]: any) => (
          <button
            key={num}
            className={"journey-card " + (locked ? "locked" : "")}
            onClick={() => setPage(target)}
            disabled={locked}
          >
            <div>
              <span>{num}</span>
              {completed ? (
                <Check size={19} />
              ) : locked ? (
                <Lock size={17} />
              ) : (
                <ArrowUpRight size={19} />
              )}
            </div>
            <h3>{title}</h3>
            <p>{text}</p>
            <small>
              {completed
                ? "COMPLETED"
                : locked
                  ? "COMING NEXT"
                  : "READY TO EXPLORE"}
            </small>
          </button>
        ))}
      </div>
      <section className="family-invite">
        <Shield size={26} />
        <div>
          <h3>Learning is better together.</h3>
          <p>
            Invite a parent to follow your progress. Only share this private
            code with your parent or guardian.
          </p>
          {code && (
            <p className="invite-code">
              {code} <small>Expires in 10 minutes</small>
            </p>
          )}
          {linkError && <p role="alert">{linkError}</p>}
        </div>
        <Button
          secondary
          disabled={practice}
          onClick={async () => {
            try {
              setCode((await cloud("linkCode")).code);
            } catch (e) {
              setLinkError(friendlyError(e));
            }
          }}
        >
          Get parent link code
        </Button>
      </section>
    </>
  );
}
function Stat({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: any;
  label: string;
}) {
  return (
    <div className="stat">
      <span className="stat-icon">{icon}</span>
      <strong>{value}</strong>
      <small>{label}</small>
    </div>
  );
}
function CoinStory({ mode }: { mode: string }) {
  return (
    <div
      className={"coin-story " + mode}
      aria-label="Six coins received as revenue, three spent on production, three left as profit"
    >
      <div className="coin-revenue">
        CUSTOMER PAYS
        <b>
          +6 <Coins size={20} />
        </b>
      </div>
      <div className="coin-flow">
        {Array.from({ length: 6 }, (_, i) => (
          <span key={i} style={{ "--i": i } as React.CSSProperties}>
            ✦
          </span>
        ))}
      </div>
      <div className="bento-illustration">
        <div>🍱</div>
        <small>FRESH BENTO</small>
      </div>
      <div className="coin-cost">
        COST TO MAKE
        <b>
          −3 <Coins size={20} />
        </b>
      </div>
      <div className="coin-profit">
        WHAT YOU KEEP <b>3 coins profit</b>
      </div>
    </div>
  );
}
function Learning() {
  const { player: p, send, busy, feedback, setPage } = useGame();
  const [cursor, setCursor] = useState(p?.rewarded ? 0 : p?.lesson || 0);
  const [gateCursor, setGateCursor] = useState(p?.gate || 0);
  const [review, setReview] = useState(!!p?.rewarded);
  const [stage, setStage] = useState<"learn" | "practice">(
    !p?.rewarded && p?.lesson === lessons.length && (p?.gate || 0) > 0
      ? "practice"
      : "learn",
  );
  const [answered, setAnswered] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const teachingHeadingRef = useRef<HTMLHeadingElement>(null);
  const questionHeadingRef = useRef<HTMLHeadingElement>(null);
  const completionHeadingRef = useRef<HTMLHeadingElement>(null);
  const completed = !!p && !review && p.rewarded;
  useEffect(() => {
    if (completed && answered) {
      completionHeadingRef.current?.focus();
      return;
    }
    const heading =
      stage === "practice" ? questionHeadingRef.current : teachingHeadingRef.current;
    heading?.focus();
  }, [stage, cursor, gateCursor, completed, answered]);
  if (!p) return null;
  const isGate = !review && cursor >= lessons.length;
  const index = isGate ? gateCursor : cursor;
  const lesson = lessons[Math.min(cursor, lessons.length - 1)];
  const question = isGate ? gate[Math.min(index, gate.length - 1)] : lesson;
  const quizTerms: ReadonlyArray<readonly [string, string]> = lessons.flatMap(
    (item) =>
      item.terms as ReadonlyArray<readonly [string, string]>,
  );
  if (completed && answered)
    return (
      <section className="lesson-complete">
        <div className="celebrate-portrait">
          <CharacterPortrait name="sparko" animation="Celebrate" />
        </div>
        <Chip>YOU UNDERSTOOD. YOU EARNED IT.</Chip>
        <h1 ref={completionHeadingRef} tabIndex={-1}>
          Your first five coins.
        </h1>
        <p>
          You know the difference between money coming in and profit left over.
          Now it’s time to put your ideas into action.
        </p>
        <div className="reward-coins">
          {[1, 2, 3, 4, 5].map((i) => (
            <span key={i}>✦</span>
          ))}
        </div>
        <Button onClick={() => setPage(p.game ? "dashboard" : "setup")}>
          {p.game ? "Back to my journey" : "Create my bento business"}
          <ArrowRight size={18} />
        </Button>
      </section>
    );
  async function answer(i: number) {
    if (review) {
      setSelected(i);
      setAnswered(true);
      return;
    }
    setSelected(i);
    const ok = await send(isGate ? "gate" : "lesson", {
      index: isGate ? p!.gate : cursor,
      answer: i,
    });
    if (ok) setAnswered(true);
  }
  const correct = review ? selected === question.answer : feedback?.correct;
  return (
    <>
      <div className="page-heading">
        <div>
          <Chip>
            {isGate ? "FINAL QUIZ" : "FINANCE FOUNDATIONS"}
          </Chip>
          <h1>
            {isGate ? "Show what you understand." : "Learn it. See it. Try it."}
          </h1>
          <p>
            {isGate
              ? stage === "learn"
                ? "Review the key words first. Start the quiz when you feel ready."
                : "Use what you learned. You can try as many times as you need."
              : stage === "learn"
                ? "First, understand the words and example. Practice comes next."
                : "Now use the idea in one short practice question."}
          </p>
        </div>
        <span className="chapter-chip">
          {isGate
            ? stage === "learn"
              ? "LESSONS COMPLETE"
              : `QUESTION ${Math.min(gateCursor + 1, gate.length)} / ${gate.length}`
            : `LESSON ${cursor + 1} / ${lessons.length}`}
        </span>
      </div>
      <div className="learning-progress">
        <span
          style={{
            width: `${((isGate ? lessons.length + p.gate : cursor + 1) / (lessons.length + gate.length)) * 100}%`,
          }}
        />
      </div>
      <div
        className={`learning-layout ${stage === "learn" ? "learning-only" : ""}`}
      >
        <section className="lesson-stage">
          <div className="lesson-sparko">
            <CharacterPortrait
              name="sparko"
              animation={answered && correct ? "Celebrate" : "Explain"}
            />
            <div className="speech-label">
              SPARKO <small>Your money mentor</small>
            </div>
          </div>
          <div className="lesson-teaching">
            <Chip>{isGate ? "QUICK REVIEW" : lesson.concept}</Chip>
            <h2 ref={teachingHeadingRef} tabIndex={-1}>
              {isGate ? "Words worth knowing" : lesson.title}
            </h2>
            <p>
              {isGate
                ? "Read through these meanings once more. The quiz asks you to use them in real money stories, not just memorise them."
                : lesson.text}
            </p>
            {isGate ? (
              <div className="quiz-term-review">
                {quizTerms.map(([term, meaning]) => (
                  <div key={term}>
                    <b>{term}</b>
                    <span>{meaning}</span>
                  </div>
                ))}
              </div>
            ) : (
              <>
                <div className="term-definitions">
                  {lesson.terms.map(([term, meaning]) => (
                    <div key={term}>
                      <b>{term}</b>
                      <span>{meaning}</span>
                    </div>
                  ))}
                </div>
                <div className="lesson-why">
                  <b>Why it matters</b>
                  <p>{lesson.why}</p>
                </div>
                <div className="worked-example">
                  <b>Worked example</b>
                  <p>{lesson.example}</p>
                </div>
                <div className="remember-rule">
                  <span>REMEMBER</span>
                  <b>{lesson.rule}</b>
                </div>
                <CoinStory mode={lesson.visual} />
              </>
            )}
            {stage === "learn" && (
              <Button onClick={() => setStage("practice")}>
                {isGate ? "Start the final quiz" : "Try a practice question"}
                <ArrowRight size={16} />
              </Button>
            )}
          </div>
        </section>
        {stage === "practice" && (
          <section className="question-card">
            <Chip>
              {isGate ? "FINAL QUIZ" : review ? "REVISIT & PRACTICE" : "PRACTICE"}
            </Chip>
            {!isGate && <span className="practice-term">Use: {lesson.concept}</span>}
            <h3 ref={questionHeadingRef} tabIndex={-1}>
              {isGate
                ? (question as (typeof gate)[number]).question
                : (question as (typeof lessons)[number]).prompt}
            </h3>
            <div className="answer-options">
              {question.choices.map((c, i) => (
                <button
                  key={i}
                  disabled={busy || !!(answered && correct)}
                  className={
                    selected === i ? (correct ? "correct" : "incorrect") : ""
                  }
                  onClick={() => answer(i)}
                >
                  <span>{String.fromCharCode(65 + i)}</span>
                  {c}
                  {selected === i && correct && <Check size={18} />}
                </button>
              ))}
            </div>
            {answered && (
              <div
                className={correct ? "answer-feedback good" : "answer-feedback"}
                role="status"
              >
                <b>
                  {correct
                    ? "That’s it. Nicely thought through!"
                    : "Let’s look at it another way."}
                </b>
                <p>{review ? question.explain : feedback?.text}</p>
                {correct && (
                  <Button
                    onClick={() => {
                      setAnswered(false);
                      setSelected(null);
                      if (review) {
                        if (cursor === lessons.length - 1) setPage("dashboard");
                        else {
                          setCursor(cursor + 1);
                          setStage("learn");
                        }
                      } else {
                        setCursor(p.lesson);
                        setGateCursor(p.gate);
                        if (!isGate) setStage("learn");
                      }
                    }}
                  >
                    {review && cursor === lessons.length - 1
                      ? "Back to overview"
                      : cursor === lessons.length - 1 && !isGate
                        ? "Review terms before final quiz"
                        : isGate
                          ? "Next question"
                          : "Continue to next lesson"}
                    <ArrowRight size={16} />
                  </Button>
                )}
              </div>
            )}
            <p className="gentle-note">
              <Heart size={14} /> Mistakes are part of learning. There is no
              penalty.
            </p>
          </section>
        )}
      </div>
      <div className="lesson-index">
        {lessons.map((l, i) => (
          <span key={l.title} className={i <= cursor ? "done" : ""}>
            {i < p.lesson ? <Check size={13} /> : i + 1} {l.concept}
          </span>
        ))}
      </div>
    </>
  );
}
function Setup() {
  const { player: p, send, busy, setPage } = useGame();
  if (!p?.rewarded)
    return (
      <Locked
        title="Your first ingredient is understanding."
        text="Finish Finance Foundations before opening your business."
        action="Meet Sparko"
        page="learn"
      />
    );
  if (p.game)
    return (
      <Locked
        title="Your business is already open."
        text="Your stall and saved choices are ready for you."
        action="Continue adventure"
        page={nextPage(p)}
      />
    );
  return <ShopSetup avatar={p.avatar} busy={busy}
    onAvatar={(avatar) => { void send("profile", { avatar }); }}
    onOpen={async (values) => { if (await send("setup", values)) setPage("board"); }} />;
}
function Locked({
  title,
  text,
  action,
  page,
}: {
  title: string;
  text: string;
  action: string;
  page: string;
}) {
  const setPage = useGame((s) => s.setPage);
  return (
    <section className="locked-state">
      <div>
        <Lock size={32} />
      </div>
      <Chip>ONE LITTLE STEP AT A TIME</Chip>
      <h1>{title}</h1>
      <p>{text}</p>
      <Button onClick={() => setPage(page)}>
        {action}
        <ArrowRight size={17} />
      </Button>
    </section>
  );
}
function Board() {
  const { player: p, send, busy, presenting, reduced, setPage, error } = useGame();
  const [room, setRoom] = useState<any>(null);
  const [sceneReady, setSceneReady] = useState(false);
  const g = p?.game;
  const presentation = useBoardPresentation(g, reduced);
  const motion = !presentation.complete;
  useEffect(() => {
    if (!p || p.id === "practice") return;
    let unsubRoom = () => {};
    const unsub = onSnapshot(doc(db, "memberships", p.id), (s) => {
      unsubRoom();
      if (s.exists())
        unsubRoom = onSnapshot(doc(db, "roomViews", s.data().roomId), (r) =>
          setRoom(r.data()),
        );
      else setRoom(null);
    });
    return () => {
      unsub();
      unsubRoom();
    };
  }, [p?.id]);
  if (!g)
    return (
      <Locked
        title="Every adventure starts with a little preparation."
        text="Learn the basics, then create your bento stall."
        action="Take my next step"
        page={p ? nextPage(p) : "learn"}
      />
    );
  if (g.phase === "reflection" && !motion) return <Reflection />;
  if (g.phase === "village")
    return (
      <Locked
        title="Your first quarter is complete."
        text="Your full journey is in your business journal. The village is ready to explore."
        action="Explore Yatai Village"
        page="village"
      />
    );
  const myTurn = !room?.started || room.members[room.turn] === p?.id;
  const disabled = busy || presenting || motion || !sceneReady || !myTurn || !!(room && !room.started);
  return (
    <>
      <div className="board-top">
        <div>
          <Chip>QUARTER 01 · {room ? "WITH FRIENDS" : "SOLO ADVENTURE"}</Chip>
          <h1>{g.name}</h1>
        </div>
        <div className="wallet-pills">
          <span>
            <Coins size={18} /> {g.wallet} <small>wallet</small>
          </span>
          <span>
            <Landmark size={18} /> {g.savings} <small>saved</small>
          </span>
          <button
            className="icon-button"
            aria-label="Open business journal"
            onClick={() => setPage("journal")}
          >
            <BookOpen size={20} />
          </button>
        </div>
      </div>
      <div className="board-layout" data-roll-stage={presentation.rolling ? "rolling" : presentation.walking ? "walking" : "complete"}
        data-die-value={presentation.value} data-pawn-tile={presentation.tile}>
        <section className="board-canvas">
          <BoardWorld roster={room?.players} presentation={presentation} onReady={setSceneReady} />
          <div className="board-overlay">
            <span>
              YOUR PRICE <b>{g.price} coins</b>
            </span>
            <span>
              YOUR PLACE{" "}
              <b>
                {presentation.tile === 0
                  ? "Start"
                  : `${presentation.tile} · ${boardNames[presentation.tile]}`}
              </b>
            </span>
          </div>
          <span className="board-camera-hint">
            Drag to orbit · Scroll to explore the board
          </span>
        </section>
        <aside className="decision-panel">
          {!sceneReady && <div className="board-loading-note" role="status">
            <p>Preparing your 3D board. You can also play with the labeled die and text controls.</p>
            <Button secondary onClick={() => setSceneReady(true)}>Play with text controls</Button>
          </div>}
          <div className="turn-label">
            <span className="status-dot" />
            {room && !room.started
              ? "Waiting for your room"
              : myTurn
                ? "YOUR TURN"
                : `${room?.players.find((x: any) => x.id === room.members[room.turn])?.name}’S TURN`}
            <span>TURN {g.turn || 1}</span>
          </div>
          <div className={"dice " + (presentation.rolling ? "rolling" : "")} aria-hidden="true">
            {["✦", "⚀", "⚁", "⚂", "⚃", "⚄", "⚅"][presentation.value]}
          </div>
          <div className="dice-caption" role="status" aria-live="polite">
            {presentation.rolling ? "Rolling the die…" : presentation.value
              ? `${presentation.replacement ? "Replacement" : "You rolled"} ${presentation.value}${presentation.replacement ? " · Stay on this space" : ` · ${g.path.length} ${g.path.length === 1 ? "space" : "spaces"}${g.path.length < presentation.value ? " to finish" : ""}`}`
              : "Roll to begin your village journey"}
          </div>
          <BoardEventCards
            game={g}
            motion={motion}
            reduced={reduced}
            disabled={disabled}
            myTurn={myTurn && !(room && !room.started)}
            error={error}
            onDecision={(data) => send("decision", data)}
            onRoll={() => send("roll", { expectedTurn: g.turn })}
          />
          {g.revisionAllowed && !g.pending && !motion && (
            <div className="price-revise">
              <small>RETHINK YOUR PRICE?</small>
              <div>
                {[g.price - 1, g.price, g.price + 1]
                  .filter((n) => n >= 4 && n <= 8)
                  .map((n) => (
                    <button
                      key={n}
                      disabled={busy}
                      onClick={() => send("price", { price: n })}
                    >
                      {n === g.price ? "Keep" : `${n} coins`}
                    </button>
                  ))}
              </div>
            </div>
          )}
          <div className="quarter-progress">
            <span style={{ width: `${(g.position / 20) * 100}%` }} />
          </div>
          <small className="muted">
            One clockwise lap. No time pressure. Every choice is a chance to
            learn.
          </small>
        </aside>
      </div>
      {g.effects.length > 0 && (
        <div className="effect-strip">
          <Sparkles size={18} />
          <b>Coming next:</b>
          {g.effects.map((e) => (
            <span key={e.id}>
              {e.name}
              {e.visitors
                ? ` · +${e.visitors} visitors`
                : e.cost
                  ? ` · ${e.cost > 0 ? "+" : ""}${e.cost} cost`
                  : ""}
            </span>
          ))}
        </div>
      )}
    </>
  );
}
function Reflection() {
  const { player: p, send, setPage, busy } = useGame();
  const [text, setText] = useState("");
  const [rating, setRating] = useState(2);
  const g = p!.game!;
  const t = totals(g as Game);
  return (
    <section className="reflection-page">
      <div className="reflection-character">
        <CharacterPortrait name="sparko" animation="Encourage" />
      </div>
      <Chip>A FULL LAP. A NEW PERSPECTIVE.</Chip>
      <h1>Look how far you’ve come.</h1>
      <p>
        It’s not just about the coins. It’s about what you noticed, tried, and
        learned.
      </p>
      <div className="stat-grid">
        <Stat icon={<Coins />} value={t.revenue} label="Sales revenue" />
        <Stat icon={<Store />} value={t.profit} label="Business profit" />
        <Stat icon={<Landmark />} value={g.savings} label="Coins saved" />
      </div>
      <form
        className="panel"
        onSubmit={async (e) => {
          e.preventDefault();
          if (await send("reflect", { text, rating })) setPage("village");
        }}
      >
        <label>
          What choice taught you something? What might you try differently?
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            minLength={12}
            maxLength={500}
            required
            placeholder="I noticed… Next time, I might…"
          />
        </label>
        <p className="muted">
          Share your learning, not private personal details. Your linked parent
          can read this reflection.
        </p>
        <label>How confident do you feel now?</label>
        <div className="confidence">
          {["Still growing", "Finding my feet", "Ready to try more"].map(
            (s, i) => (
              <button
                type="button"
                key={s}
                className={rating === i + 1 ? "selected" : ""}
                onClick={() => setRating(i + 1)}
              >
                {Array.from({ length: i + 1 }, (_, j) => (
                  <Star key={j} size={15} />
                ))}
                {s}
              </button>
            ),
          )}
        </div>
        <Button type="submit" disabled={busy || text.trim().length < 12}>
          Step into Yatai Village <ArrowRight size={18} />
        </Button>
      </form>
    </section>
  );
}
function Journal() {
  const { player: p, send, busy } = useGame();
  const g = p?.game;
  if (!g)
    return (
      <Locked
        title="Your story is just beginning."
        text="Open your business to start your journal."
        action="Take my next step"
        page={p ? nextPage(p) : "learn"}
      />
    );
  const t = totals(g as Game);
  function download() {
    if (!g) return;
    const blob = new Blob(
      [
        JSON.stringify(
          {
            business: g.name,
            rules: g.rulesVersion,
            summary: t,
            ledger: g.ledger,
            reflection: g.reflection,
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "my-lead-learning-journal.json";
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <Chip>THE STORY BEHIND YOUR CHOICES</Chip>
          <h1>My business journal.</h1>
          <p>
            {g.name} · “{g.goal}”
          </p>
        </div>
        <Button secondary onClick={download}>
          <Download size={17} /> Export my journal
        </Button>
      </div>
      <div className="stat-grid">
        <Stat icon={<Coins />} value={t.revenue} label="Sales revenue" />
        <Stat
          icon={<Store />}
          value={t.cost + t.expense + t.refund}
          label="Costs, expenses & refunds"
        />
        <Stat
          icon={<Sparkles />}
          value={t.profit}
          label="Business profit (not wallet)"
        />
        <Stat icon={<Landmark />} value={g.savings} label="Protected savings" />
      </div>
      {g.liability > 0 && (
        <div className="notice">
          <p>
            <b>Recovery advance: {g.liability} coins</b>
            <br />
            An advance helps you keep learning. It is money you owe, not
            revenue.
          </p>
          <Button
            disabled={busy || !g.wallet}
            onClick={() =>
              send("repay", { amount: Math.min(g.wallet, g.liability) })
            }
          >
            Repay {Math.min(g.wallet, g.liability)} coins
          </Button>
        </div>
      )}
      {g.reflection && (
        <div className="reflection-note">
          <Chip>MY END-OF-QUARTER REFLECTION</Chip>
          <p>“{g.reflection}”</p>
        </div>
      )}
      <section className="panel">
        <div className="section-title">
          <h2>Every coin has a story.</h2>
          <span>{g.ledger.length} recorded moments</span>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Moment</th>
                <th>Category</th>
                <th>Wallet</th>
                <th>Savings</th>
                <th>Owed</th>
              </tr>
            </thead>
            <tbody>
              {[...g.ledger].reverse().map((e) => (
                <tr key={e.id}>
                  <td>
                    <b>{e.note}</b>
                    <small>
                      Turn {e.turn} · {boardNames[e.tile]}
                    </small>
                  </td>
                  <td>
                    <span className="table-tag">{e.category}</span>
                  </td>
                  <td className={e.walletDelta >= 0 ? "positive" : ""}>
                    {e.walletDelta > 0 ? "+" : ""}
                    {e.walletDelta}
                  </td>
                  <td>
                    {e.savingsDelta > 0 ? "+" : ""}
                    {e.savingsDelta}
                  </td>
                  <td>
                    {e.liabilityDelta > 0 ? "+" : ""}
                    {e.liabilityDelta}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <div className="glossary-grid">
        {glossary.map(([a, b]) => (
          <article key={a}>
            <h3>{a}</h3>
            <p>{b}</p>
          </article>
        ))}
      </div>
    </>
  );
}
function VillagePage() {
  const p = useGame((s) => s.player);
  if (p?.game?.phase !== "village")
    return (
      <Locked
        title="A village of possibilities awaits."
        text="Complete your first quarter and reflection to unlock free exploration."
        action="Continue my journey"
        page={p ? nextPage(p) : "learn"}
      />
    );
  return <VillageExperience/>;
}
function Friends() {
  const { practice, player: p, setError, setPage } = useGame();
  const [code, setCode] = useState("");
  const [room, setRoom] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (practice || !p) return;
    let off = () => {};
    const unsub = onSnapshot(doc(db, "memberships", p.id), (s) => {
      off();
      if (s.exists())
        off = onSnapshot(
          doc(db, "roomViews", s.data().roomId),
          (r) => setRoom(r.data()),
          (e) => setError(friendlyError(e)),
        );
      else setRoom(null);
    });
    return () => {
      off();
      unsub();
    };
  }, [p?.id, practice]);
  async function act(operation: string, data = {}) {
    setBusy(true);
    try {
      await cloud(operation, data);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <Chip>SMALL STALLS. SHARED ADVENTURES.</Chip>
          <h1>Better with friends.</h1>
          <p>
            Private rooms for 2–4 people you know. Your money and decisions
            remain yours.
          </p>
        </div>
      </div>
      {practice ? (
        <div className="panel">
          <Shield size={30} />
          <h2>Friends need a real account.</h2>
          <p>
            Practice is a solo, unsaved adventure. Sign in after Firebase is
            configured to use private friend rooms.
          </p>
        </div>
      ) : !p?.game || (p.game.turn > 0 && !room) ? (
        <Locked
          title="Start together from the beginning."
          text="Finish learning and create your business. Join a room before taking your first turn."
          action="Continue my journey"
          page={nextPage(p!)}
        />
      ) : room ? (
        <div className="panel room-panel">
          <Chip>ONLY SHARE WITH PEOPLE YOU KNOW</Chip>
          <h2>
            Room <span className="room-code">{room.code}</span>
          </h2>
          <div className="room-members">
            {room.players.map((r: any) => (
              <article key={r.id}>
                <span className={"mini-avatar " + r.avatar}>{r.name[0]}</span>
                <b>{r.name}</b>
                <span>
                  {room.ready.includes(r.id) ? "✓ Ready" : "Getting ready"}
                </span>
              </article>
            ))}
          </div>
          {!room.started ? (
            <div className="button-row">
              <Button onClick={() => act("readyRoom")} disabled={busy}>
                {room.ready.includes(p!.id) ? "Not ready yet" : "I’m ready"}
              </Button>
              {room.host === p!.id && (
                <Button
                  onClick={() => act("startRoom")}
                  disabled={
                    busy ||
                    room.players.length < 2 ||
                    room.ready.length !== room.players.length
                  }
                >
                  Start together
                </Button>
              )}
              <Button
                secondary
                onClick={() => act("leaveRoom")}
                disabled={busy}
              >
                Leave room
              </Button>
            </div>
          ) : (
            <Button onClick={() => setPage("board")}>
              Go to the board <ArrowRight size={17} />
            </Button>
          )}
          <div className="reactions">
            {["Good idea!", "You can do it!", "Learning together!"].map(
              (text) => (
                <button
                  key={text}
                  onClick={() => act("reactRoom", { text })}
                  disabled={busy}
                >
                  {text}
                </button>
              ),
            )}
          </div>
          {room.reactions?.slice(-4).map((r: any, i: number) => (
            <p key={i} className="muted">
              {r.name}: {r.text}
            </p>
          ))}
        </div>
      ) : (
        <div className="friends-layout">
          <section className="panel">
            <Users size={32} />
            <h2>Make a little room.</h2>
            <p>
              Invite up to three trusted friends. Everyone completes their
              finance learning first.
            </p>
            <Button onClick={() => act("createRoom")} disabled={busy}>
              Create a private room
            </Button>
          </section>
          <form
            className="panel"
            onSubmit={(e) => {
              e.preventDefault();
              act("joinRoom", { code });
            }}
          >
            <h2>Join your friends.</h2>
            <p>Ask your friend for their eight-character room code.</p>
            <label>
              Room code
              <input
                value={code}
                maxLength={8}
                minLength={8}
                required
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="XXXXXXXX"
              />
            </label>
            <Button type="submit" disabled={busy}>
              Join room <ArrowRight size={17} />
            </Button>
          </form>
        </div>
      )}
      <div className="notice">
        <Shield size={22} />
        <p>
          No public chat, public matchmaking, money transfers, or open profiles.
          A private code is an invitation: share it thoughtfully.
        </p>
      </div>
    </>
  );
}
function Parent() {
  const { player: p, setError } = useGame();
  const [children, setChildren] = useState<ViewPlayer[]>([]);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!p) return;
    return onSnapshot(
      query(collection(db, "views"), where("parents", "array-contains", p.id)),
      (s) => setChildren(s.docs.map((d) => d.data() as ViewPlayer)),
      (e) => setError(friendlyError(e)),
    );
  }, [p?.id]);
  return (
    <>
      <div className="page-heading">
        <div>
          <Chip>A PARTNER IN THEIR GROWTH</Chip>
          <h1>A little window into their world.</h1>
          <p>
            Celebrate effort. Get curious about their choices. Grow together.
          </p>
        </div>
      </div>
      <form
        className="panel parent-link"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await cloud("linkChild", { code });
            setCode("");
          } catch (e) {
            setError(friendlyError(e));
          } finally {
            setBusy(false);
          }
        }}
      >
        <Shield size={28} />
        <div>
          <h3>Link your child’s account</h3>
          <p>
            Ask your child to generate a private parent code from their
            overview.
          </p>
        </div>
        <input
          aria-label="Parent link code"
          value={code}
          minLength={12}
          maxLength={12}
          required
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="12-character code"
        />
        <Button type="submit" disabled={busy}>
          Link account
        </Button>
      </form>
      {children.length === 0 ? (
        <div className="empty-state">
          <Users size={40} />
          <h2>Your child’s journey will appear here.</h2>
          <p>
            Once linked, you can see learning progress, their business journal,
            and reflections.
          </p>
        </div>
      ) : (
        children.map((child) => (
          <section className="panel child-panel" key={child.id}>
            <div className="section-title">
              <h2>{child.name}’s journey</h2>
              <Button
                secondary
                onClick={async () => {
                  try {
                    await cloud("parentSettings", {
                      child: child.id,
                      paused: !child.paused,
                    });
                  } catch (e) {
                    setError(friendlyError(e));
                  }
                }}
              >
                {child.paused ? "Resume play" : "Pause play"}
              </Button>
            </div>
            <div className="stat-grid">
              <Stat
                icon={<BookOpen />}
                value={`${Math.round(((child.lesson + child.gate) / 9) * 100)}%`}
                label="Finance foundations"
              />
              <Stat
                icon={<Store />}
                value={child.game?.name || "Not open yet"}
                label="Their business"
              />
              <Stat
                icon={<Star />}
                value={child.game?.phase || "Learning"}
                label="Current chapter"
              />
              <Stat icon={<Sparkles />} value={`${heroCompleted(child.heroLab)}/12`} label="Hero Lab learning stamps" />
            </div>
            {child.game?.reflection && (
              <div className="reflection-note">
                <Chip>THEIR REFLECTION</Chip>
                <p>“{child.game.reflection}”</p>
              </div>
            )}
            <h3>A conversation to try at home</h3>
            <p>
              “Tell me about a choice you made. What surprised you? What would
              you like to try next?”
            </p>
          </section>
        ))
      )}
    </>
  );
}
function Admin() {
  const { setError } = useGame();
  const [rows, setRows] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loaded, setLoaded] = useState(false);
  async function refresh() {
    try {
      setRows((await cloud("adminList")).players);
      setLoaded(true);
    } catch (e) {
      setError(friendlyError(e));
    }
  }
  useEffect(() => {
    refresh();
  }, []);
  return (
    <>
      <div className="page-heading">
        <div>
          <Chip>LEAD OPERATIONS</Chip>
          <h1>Learning at a glance.</h1>
          <p>
            Protected administrator tools. Only approved Firebase admin claims
            can access this data.
          </p>
        </div>
        <Button secondary onClick={refresh}>
          Refresh
        </Button>
      </div>
      <div className="stat-grid">
        <Stat
          icon={<Users />}
          value={rows.length}
          label="Accounts (up to 200)"
        />
        <Stat
          icon={<BookOpen />}
          value={rows.filter((r) => r.gate === 3).length}
          label="Finance gate complete"
        />
        <Stat
          icon={<Flag />}
          value={rows.filter((r) => r.phase === "village").length}
          label="First quarters completed"
        />
      </div>
      <section className="panel">
        <label>
          Find an account
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search display name"
          />
        </label>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Learner</th>
                <th>Role</th>
                <th>Lessons</th>
                <th>Hero Lab</th>
                <th>Chapter</th>
                <th>Play access</th>
              </tr>
            </thead>
            <tbody>
              {rows
                .filter((r) =>
                  r.name.toLowerCase().includes(search.toLowerCase()),
                )
                .map((r) => (
                  <tr key={r.id}>
                    <td>{r.name}</td>
                    <td>{r.role}</td>
                    <td>{r.lesson}/6</td>
                    <td>{r.heroStamps ?? 0}/12</td>
                    <td>{r.phase}</td>
                    <td>
                      {r.role === "student" && (
                        <button
                          className="inline-link"
                          onClick={async () => {
                            try {
                              await cloud("parentSettings", {
                                child: r.id,
                                paused: !r.paused,
                              });
                              refresh();
                            } catch (e) {
                              setError(friendlyError(e));
                            }
                          }}
                        >
                          {r.paused ? "Resume" : "Pause"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        {loaded && !rows.length && <p>No accounts to display.</p>}
      </section>
      <div className="notice">
        <Shield size={23} />
        <p>
          Role grants and curriculum releases require a trusted deployment. They
          are intentionally not editable by the browser.
        </p>
      </div>
    </>
  );
}
function SettingsPage() {
  const {
    player: p,
    send,
    busy,
    muted,
    toggleSound,
    reduced,
    toggleMotion,
    practice,
  } = useGame();
  const [name, setName] = useState(p?.name || "");
  return (
    <>
      <div className="page-heading">
        <div>
          <Chip>MAKE YOURSELF AT HOME</Chip>
          <h1>Your preferences.</h1>
          <p>A comfortable space to learn and explore.</p>
        </div>
      </div>
      <div className="settings-grid">
        <form
          className="panel"
          onSubmit={(e) => {
            e.preventDefault();
            send("profile", { name });
          }}
        >
          <h2>About your hero</h2>
          <label>
            Display name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              minLength={2}
              maxLength={32}
              required
            />
          </label>
          <Button type="submit" disabled={busy}>
            Save display name
          </Button>
        </form>
        <section className="panel">
          <h2>Sound & motion</h2>
          <div className="setting-row">
            <div>
              <b>Gentle sound effects</b>
              <p>Off by default. No autoplay audio.</p>
            </div>
            <button
              className={"switch " + (!muted ? "on" : "")}
              role="switch"
              aria-checked={!muted}
              aria-label="Sound effects"
              onClick={toggleSound}
            >
              <span />
            </button>
          </div>
          <div className="setting-row">
            <div>
              <b>Reduced motion</b>
              <p>Pause decorative motion and simplify animations.</p>
            </div>
            <button
              className={"switch " + (reduced ? "on" : "")}
              role="switch"
              aria-checked={reduced}
              aria-label="Reduced motion"
              onClick={toggleMotion}
            >
              <span />
            </button>
          </div>
          <p className="muted">
            Keyboard: Tab to navigate, Enter to activate. Village: WASD / arrows
            to move, Shift to run, E to interact, Esc to close conversations.
            Touch movement controls and connected gamepads are supported.
          </p>
        </section>
        <section className="panel">
          <h2>Privacy & progress</h2>
          <p>
            {practice
              ? "This is an unsaved practice session. Nothing here is sent to Firebase."
              : "Your learning and game state are protected by your Firebase account and server-side rules."}
          </p>
          <p>
            Only linked parents and authorized administrators can access
            learning records. Analytics is not enabled by default.
          </p>
        </section>
      </div>
    </>
  );
}
function Privacy() {
  const setPage = useGame((s) => s.setPage);
  return (
    <main className="privacy-page">
      <Brand />
      <button className="back" onClick={() => setPage("home")}>
        <ChevronLeft size={17} />
        Back home
      </button>
      <Chip>PRIVACY & SAFETY</Chip>
      <h1>A thoughtful place to grow.</h1>
      <p>
        LEAD Money Game uses Firebase for email/password authentication, display
        names, learning progress, business decisions, and reflections. Never
        include your address, school, phone number, or other private details in
        display names, stall names, or reflections.
      </p>
      <h2>Who sees your information?</h2>
      <p>
        You, the parent accounts you explicitly link with a short-lived code,
        and authorized project administrators. Friend rooms share only display
        name, avatar, board position, readiness, and preset reactions—not your
        wallet ledger or reflection.
      </p>
      <h2>Practice is different.</h2>
      <p>
        Practice Adventure runs only in memory on the current page. Refreshing
        or closing the page clears it. Practice does not create a Firebase
        account and does not upload progress.
      </p>
      <h2>Parent involvement</h2>
      <p>
        Students should create accounts with a parent or guardian’s approval.
        Parent linking is not an age-verification or legal-consent system. The
        project operator must supply appropriate consent procedures and a
        contact and deletion process before a public child-facing launch.
      </p>
      <h2>No advertising profiles</h2>
      <p>
        No purchases, public chat, or behavioural advertising are included.
        Firebase Analytics is not enabled by default.
      </p>
      <Button onClick={() => setPage("home")}>Back to the adventure</Button>
    </main>
  );
}
export default function App() {
  const {
    page,
    player,
    practice,
    setPlayer,
    setPage,
    error,
    setError,
    muted,
    reduced,
  } = useGame();
  useEffect(() => {
    document.documentElement.dataset.reduced = String(reduced);
  }, [reduced]);
  useEffect(() => {
    let off = () => {};
    const unsub = onAuthStateChanged(auth, async (user) => {
      off();
      if (useGame.getState().practice) return;
      if (user) {
        try {
          const p = await cloud("get");
          setPlayer(p);
          if (["home", "login", "signup"].includes(useGame.getState().page))
            setPage(p.role === "student" ? "dashboard" : p.role);
          off = onSnapshot(
            doc(db, "views", user.uid),
            (s) => {
              if (s.exists()) setPlayer(s.data() as ViewPlayer);
            },
            () => {},
          );
        } catch {
          /* Initial signup completes provisioning explicitly in AuthPage. */
        }
      } else setPlayer(null);
    });
    return () => {
      unsub();
      off();
    };
  }, []);
  useEffect(() => {
    if (muted) return;
    const sound = () => {
      try {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(660, ctx.currentTime);
        gain.gain.setValueAtTime(0.025, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.11);
        osc.onended = () => ctx.close();
      } catch {}
    };
    document.addEventListener("click", sound);
    return () => document.removeEventListener("click", sound);
  }, [muted]);
  useEffect(() => {
    const ctx = (document as any).modelContext;
    if (!ctx?.registerTool) return;
    const lifecycle = new AbortController();
    const tools = [
      {
        name: "read_learning_progress",
        title: "Read LEAD progress",
        description:
          "Read the signed-in learner’s visible learning progress. Does not expose private decks or change progress.",
        inputSchema: {
          type: "object",
          properties: {},
          additionalProperties: false,
        },
        annotations: { readOnlyHint: true },
        execute: (input: any) => {
          if (Object.keys(input || {}).length)
            throw new Error("No arguments expected.");
          const p = useGame.getState().player;
          if (!p) throw new Error("Sign in or start practice first.");
          return {
            name: p.name,
            lessons: p.lesson,
            checks: p.gate,
            phase: p.game?.phase || "learning",
            practice: useGame.getState().practice,
          };
        },
      },
      {
        name: "open_business_journal",
        title: "Open business journal",
        description:
          "Navigate to the existing business journal. Does not change the game or spend coins.",
        inputSchema: {
          type: "object",
          properties: {},
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false },
        execute: (input: any) => {
          if (Object.keys(input || {}).length)
            throw new Error("No arguments expected.");
          if (!useGame.getState().player?.game)
            throw new Error("Create a business first.");
          useGame.getState().setPage("journal");
          return { opened: "journal" };
        },
      },
    ];
    for (const tool of tools)
      Promise.resolve(
        ctx.registerTool(tool, { signal: lifecycle.signal }),
      ).catch(() => {});
    return () => lifecycle.abort();
  }, []);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [page]);
  let content;
  if (page === "home") content = <Landing />;
  else if (page === "privacy") content = <Privacy />;
  else if (["login", "signup", "signup-parent", "reset"].includes(page))
    content = <AuthPage key={page} />;
  else if (!player) content = <AuthPage />;
  else {
    const pages: Record<string, React.ReactNode> = {
      dashboard: <Dashboard />,
      learn: <Learning />,
      "hero-lab": <HeroLab />,
      setup: <Setup />,
      board: <Board />,
      reflection: <Reflection />,
      journal: <Journal />,
      village: <VillagePage />,
      friends: <Friends />,
      settings: <SettingsPage />,
      parent: <Parent />,
      admin: <Admin />,
    };
    content = (
      <Shell>
        {player.paused ? (
          <Locked
            title="Time for a little check-in."
            text="Your parent has paused play. Have a conversation together, and come back when you’re ready."
            action="Open settings"
            page="settings"
          />
        ) : (
          pages[page] || <Dashboard />
        )}
      </Shell>
    );
  }
  return (
    <>
      {content}
      {error && !(page === "hero-lab" && player?.role === "student" && !player.paused) && (
        <div className="global-error" role="alert">
          <Shield size={20} />
          <span>{error}</span>
          <button
            className="icon-button"
            aria-label="Dismiss message"
            onClick={() => setError("")}
          >
            <X size={18} />
          </button>
        </div>
      )}
    </>
  );
}
