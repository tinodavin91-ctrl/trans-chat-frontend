// app/page.tsx
// TransChat marketing/landing page — served at "/"
//
// SETUP NOTES:
// 1. Move your current inbox UI (the sidebar + conversation view you already have)
//    from app/page.tsx into a new file: app/chat/page.tsx
// 2. Drop this file in as the new app/page.tsx
// 3. In your auth logic, redirect:
//      - logged-in users hitting "/"      -> router.push("/chat")
//      - logged-out users hitting "/chat" -> router.push("/")
//    (Do this in a layout, middleware, or a simple useEffect check — whatever
//    pattern your Sanctum auth context already uses elsewhere in the app.)
// 4. Fonts: this uses next/font/google so no <link> tags or manual font loading needed.
// 5. Everything is self-contained via styled-jsx (built into Next.js) — no Tailwind
//    config changes required. If you'd rather have it in Tailwind classes instead,
//    let me know and I'll convert it.

"use client";

import Link from "next/link";
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
});
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
});
const jbMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

export default function LandingPage() {
  return (
    <div
      className={`${spaceGrotesk.variable} ${inter.variable} ${jbMono.variable} page`}
    >
      {/* NAV */}
      <div className="wrap">
        <nav>
          <div className="logo">
            <div className="logoMark">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 6L12 3L20 6V12C20 16.5 17 20 12 21C7 20 4 16.5 4 12V6Z" stroke="#0A0E14" strokeWidth="2" strokeLinejoin="round"/>
                <path d="M9 12L11 14L15 10" stroke="#0A0E14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            TransChat
          </div>
          <div className="navlinks">
            <a href="#features">Features</a>
            <a href="#how">How it works</a>
            <Link href="/login">Sign in</Link>
          </div>
          <Link href="/register" className="btnPrimary">Get Started</Link>
        </nav>

        {/* HERO */}
        <section className="hero">
          <div>
            <div className="eyebrow"><span className="dot" /> Live over websockets, powered by Reverb</div>
            <h1>Say it.<br />It&apos;s already <span className="accent">there.</span></h1>
            <p className="lede">
              TransChat relays every message the instant you send it — <b>direct messages,
              group chats,</b> and everything in between — with no refresh, no delay, no polling.
            </p>
            <div className="ctaRow">
              <Link href="/login" className="btnPrimary big">Start chatting</Link>
              <a href="#how" className="btnGhost">See how it works →</a>
            </div>
            <div className="stats">
              <div><div className="statNum c1">&lt;100ms</div><div className="statLabel">Relay time</div></div>
              <div><div className="statNum c2">DMs + Groups</div><div className="statLabel">One inbox</div></div>
              <div><div className="statNum c3">Zero refresh</div><div className="statLabel">Always live</div></div>
            </div>
          </div>

          <div className="mockStage">
            <div className="groupPill">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 00-3-3.87" />
                <path d="M16 3.13a4 4 0 010 7.75" />
              </svg>
              Match Day Squad · 12
            </div>
            <div className="relayPill">
              <span className="bar" /><span className="bar" /><span className="bar" /> broadcasting
            </div>

            <div className="chatCard">
              <div className="chatHead">
                <div className="avatarWrap">
                  <div className="ring" />
                  <div className="ring r2" />
                  <div className="ring r3" />
                  <div className="avatar">K</div>
                  <div className="presenceDot" />
                </div>
                <div>
                  <div className="chatName">Kwame</div>
                  <div className="chatStatus">online · <span className="mono">relayed via Reverb</span></div>
                </div>
              </div>
              <div className="thread">
                <div className="msg in">Did you catch the match last night? 🔥</div>
                <div className="msg out">Yeah — that finish was unreal 😅</div>
                <div className="msg in">Group&apos;s already blowing up about it</div>
                <div className="typing"><span /><span /><span /></div>
              </div>
              <div className="composer">
                <input type="text" placeholder="Message Kwame..." disabled />
                <div className="sendDot">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0A0E14" strokeWidth="2.4">
                    <path d="M22 2L11 13" /><path d="M22 2l-7 20-4-9-9-4 20-7z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* FEATURES */}
      <section id="features" className="section">
        <div className="wrap">
          <div className="sectionHead">
            <span className="sectionEyebrow">What&apos;s inside</span>
            <h2>Built for conversations that don&apos;t wait</h2>
            <p className="sectionSub">Everything routes through one real-time layer — so a message sent is a message seen.</p>
          </div>
          <div className="featureGrid">
            {features.map((f) => (
              <div className="featureCard" key={f.title}>
                <div className={`fIcon ${f.color}`} dangerouslySetInnerHTML={{ __html: f.icon }} />
                <h3>{f.title}</h3>
                <p>{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="section">
        <div className="wrap">
          <div className="sectionHead">
            <span className="sectionEyebrow">Three steps</span>
            <h2>Up and chatting in seconds</h2>
            <p className="sectionSub">No setup ceremony — connect and start talking.</p>
          </div>
          <div className="steps">
            {steps.map((s, i) => (
              <div className="stepCard" key={s.title}>
                <div className="stepNum">{`0${i + 1}`}</div>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <div className="wrap">
        <section className="section">
          <div className="finalCta">
            <h2>Your next conversation is one click away</h2>
            <p>Free to join. Built to feel instant.</p>
            <Link href="/register" className="btnPrimary big">Get Started →</Link>
          </div>
        </section>

        <footer>
          <div>© 2026 TransChat</div>
          <div className="mono">relayed in real time via Laravel Reverb</div>
        </footer>
      </div>

      <style jsx>{`
        .page {
          --bg: #0a0e14;
          --bg-raised: #10151d;
          --bg-card: #131924;
          --border: #1f2937;
          --cyan: #22d3ee;
          --violet: #8b5cf6;
          --coral: #fb7185;
          --text: #eaf0f6;
          --text-dim: #8b98a9;
          --text-faint: #5b6779;
          background: var(--bg);
          color: var(--text);
          font-family: var(--font-body), sans-serif;
          background-image: radial-gradient(
              ellipse 900px 500px at 15% -10%,
              rgba(139, 92, 246, 0.14),
              transparent
            ),
            radial-gradient(ellipse 700px 500px at 100% 10%, rgba(34, 211, 238, 0.1), transparent);
          min-height: 100vh;
        }
        .wrap { max-width: 1180px; margin: 0 auto; padding: 0 32px; }
        a { color: inherit; text-decoration: none; }

        nav { display: flex; align-items: center; justify-content: space-between; padding: 26px 0; }
        .logo { display: flex; align-items: center; gap: 10px; font-weight: 700; font-size: 19px; letter-spacing: -0.01em; font-family: var(--font-display); }
        .logoMark { width: 34px; height: 34px; border-radius: 10px; background: linear-gradient(135deg, var(--cyan), var(--violet)); display: flex; align-items: center; justify-content: center; }
        .logoMark svg { width: 18px; height: 18px; }
        .navlinks { display: flex; align-items: center; gap: 36px; font-size: 14.5px; color: var(--text-dim); font-weight: 500; }
        .navlinks a:hover { color: var(--text); }
        @media (max-width: 820px) { .navlinks { display: none; } }

        :global(.btnPrimary) { background: var(--text); color: #0a0e14; padding: 10px 20px; border-radius: 9px; font-weight: 600; font-size: 14.5px; border: none; cursor: pointer; display: inline-flex; transition: transform 0.15s ease, box-shadow 0.15s ease; }
        :global(.btnPrimary:hover) { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(34, 211, 238, 0.18); }
        :global(.btnPrimary.big) { padding: 13px 28px; font-size: 15px; }
        .btnGhost { border: 1px solid var(--border); color: var(--text); padding: 12px 22px; border-radius: 9px; font-weight: 600; font-size: 14.5px; display: inline-flex; align-items: center; gap: 8px; transition: border-color 0.15s ease, background 0.15s ease; }
        .btnGhost:hover { border-color: #374151; background: var(--bg-card); }

        .hero { display: grid; grid-template-columns: 1.05fr 0.95fr; gap: 56px; align-items: center; padding: 20px 0 100px; }
        @media (max-width: 980px) { .hero { grid-template-columns: 1fr; padding: 12px 0 60px; } }

        .eyebrow { display: inline-flex; align-items: center; gap: 8px; border: 1px solid var(--border); background: rgba(34, 211, 238, 0.06); padding: 7px 14px; border-radius: 100px; font-size: 12.5px; font-weight: 500; color: var(--cyan); margin-bottom: 26px; }
        .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--cyan); box-shadow: 0 0 0 3px rgba(34, 211, 238, 0.2); }

        h1 { font-family: var(--font-display); font-size: clamp(40px, 5.2vw, 62px); line-height: 1.03; letter-spacing: -0.025em; font-weight: 700; margin-bottom: 22px; }
        .accent { background: linear-gradient(90deg, var(--cyan), var(--violet)); -webkit-background-clip: text; background-clip: text; color: transparent; }

        .lede { font-size: 17px; line-height: 1.65; color: var(--text-dim); max-width: 480px; margin-bottom: 34px; }
        .lede b { color: var(--text); font-weight: 600; }

        .ctaRow { display: flex; gap: 14px; margin-bottom: 52px; flex-wrap: wrap; }

        .stats { display: flex; gap: 36px; }
        .statNum { font-family: var(--font-display); font-size: 26px; font-weight: 700; }
        .statLabel { font-size: 11.5px; color: var(--text-faint); letter-spacing: 0.06em; text-transform: uppercase; margin-top: 2px; }
        .c1 { color: var(--cyan); } .c2 { color: var(--violet); } .c3 { color: var(--coral); }

        .mockStage { position: relative; display: flex; justify-content: center; }
        .chatCard { width: 100%; max-width: 400px; background: var(--bg-raised); border: 1px solid var(--border); border-radius: 18px; overflow: hidden; box-shadow: 0 30px 80px -20px rgba(0, 0, 0, 0.6); position: relative; z-index: 2; }
        .chatHead { padding: 18px 20px; display: flex; align-items: center; gap: 12px; border-bottom: 1px solid var(--border); background: var(--bg-card); }
        .avatarWrap { position: relative; width: 42px; height: 42px; flex-shrink: 0; }
        .ring { position: absolute; inset: 0; border-radius: 50%; border: 1.5px solid var(--cyan); animation: pulseRing 2.6s cubic-bezier(0.2, 0.6, 0.4, 1) infinite; opacity: 0; }
        .ring.r2 { animation-delay: 0.9s; }
        .ring.r3 { animation-delay: 1.8s; }
        @keyframes pulseRing { 0% { transform: scale(0.9); opacity: 0.55; } 80% { transform: scale(2.1); opacity: 0; } 100% { opacity: 0; } }
        .avatar { width: 42px; height: 42px; border-radius: 50%; position: relative; z-index: 2; background: linear-gradient(135deg, var(--violet), #6d28d9); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 15px; border: 2px solid var(--bg-card); }
        .presenceDot { position: absolute; bottom: -1px; right: -1px; width: 11px; height: 11px; border-radius: 50%; background: #34d399; border: 2px solid var(--bg-card); z-index: 3; }
        .chatName { font-weight: 600; font-size: 15px; }
        .chatStatus { font-size: 12px; color: #34d399; display: flex; align-items: center; gap: 5px; margin-top: 1px; }
        .mono { font-family: var(--font-mono); font-size: 11px; color: var(--text-faint); }

        .groupPill { position: absolute; top: 14%; left: -14%; background: var(--bg-card); border: 1px solid var(--border); padding: 9px 14px; border-radius: 100px; font-size: 12.5px; font-weight: 500; display: flex; align-items: center; gap: 7px; z-index: 3; box-shadow: 0 10px 24px rgba(0, 0, 0, 0.35); }
        @media (max-width: 980px) { .groupPill { display: none; } }

        .relayPill { position: absolute; top: 8px; right: -8%; background: rgba(139, 92, 246, 0.12); border: 1px solid rgba(139, 92, 246, 0.35); color: #c4b5fd; padding: 8px 13px; border-radius: 100px; font-size: 11.5px; font-weight: 500; display: flex; align-items: center; gap: 6px; z-index: 3; }
        @media (max-width: 980px) { .relayPill { right: 2%; } }
        .bar { width: 2px; height: 8px; background: #c4b5fd; border-radius: 2px; animation: bars 1.1s ease-in-out infinite; }
        .bar:nth-child(2) { animation-delay: 0.15s; }
        .bar:nth-child(3) { animation-delay: 0.3s; }
        @keyframes bars { 0%, 100% { transform: scaleY(0.4); } 50% { transform: scaleY(1); } }

        .thread { padding: 20px; display: flex; flex-direction: column; gap: 10px; min-height: 280px; }
        .msg { max-width: 78%; padding: 10px 14px; border-radius: 14px; font-size: 14px; line-height: 1.4; }
        .msg.in { background: var(--bg-card); border: 1px solid var(--border); align-self: flex-start; border-bottom-left-radius: 4px; }
        .msg.out { background: linear-gradient(135deg, var(--violet), #6d28d9); align-self: flex-end; border-bottom-right-radius: 4px; color: #fff; }

        .typing { align-self: flex-start; display: flex; gap: 4px; padding: 12px 14px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 14px; border-bottom-left-radius: 4px; }
        .typing span { width: 6px; height: 6px; border-radius: 50%; background: var(--text-faint); animation: bounce 1.2s infinite; display: inline-block; }
        .typing span:nth-child(2) { animation-delay: 0.15s; }
        .typing span:nth-child(3) { animation-delay: 0.3s; }
        @keyframes bounce { 0%, 60%, 100% { transform: translateY(0); } 30% { transform: translateY(-4px); } }

        .composer { padding: 14px 16px; border-top: 1px solid var(--border); display: flex; align-items: center; gap: 10px; background: var(--bg-card); }
        .composer input { flex: 1; background: transparent; border: none; outline: none; color: var(--text-dim); font-size: 13.5px; }
        .sendDot { width: 30px; height: 30px; border-radius: 8px; background: linear-gradient(135deg, var(--cyan), var(--violet)); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }

        .section { padding: 90px 0; }
        .sectionHead { text-align: center; max-width: 560px; margin: 0 auto 56px; }
        .sectionEyebrow { display: inline-block; font-size: 12px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--violet); border: 1px solid rgba(139, 92, 246, 0.3); background: rgba(139, 92, 246, 0.06); padding: 6px 14px; border-radius: 100px; margin-bottom: 20px; }
        h2 { font-family: var(--font-display); font-size: clamp(30px, 3.6vw, 42px); font-weight: 700; letter-spacing: -0.02em; line-height: 1.15; margin-bottom: 16px; }
        .sectionSub { color: var(--text-dim); font-size: 16px; line-height: 1.6; }

        .featureGrid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
        @media (max-width: 900px) { .featureGrid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 620px) { .featureGrid { grid-template-columns: 1fr; } }
        .featureCard { background: var(--bg-raised); border: 1px solid var(--border); border-radius: 16px; padding: 26px; transition: border-color 0.2s ease, transform 0.2s ease; }
        .featureCard:hover { border-color: #374151; transform: translateY(-2px); }
        .fIcon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; margin-bottom: 18px; }
        .fIcon.cyan { background: rgba(34, 211, 238, 0.1); color: var(--cyan); }
        .fIcon.violet { background: rgba(139, 92, 246, 0.1); color: var(--violet); }
        .fIcon.coral { background: rgba(251, 113, 133, 0.1); color: var(--coral); }
        .featureCard h3 { font-size: 16.5px; font-weight: 600; margin-bottom: 8px; }
        .featureCard p { font-size: 14px; color: var(--text-dim); line-height: 1.55; }

        .steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
        @media (max-width: 820px) { .steps { grid-template-columns: 1fr; } }
        .stepCard { background: var(--bg-raised); border: 1px solid var(--border); border-radius: 16px; padding: 30px 26px; }
        .stepNum { font-family: var(--font-mono); font-size: 12px; color: var(--bg); background: var(--cyan); width: 26px; height: 26px; border-radius: 7px; display: flex; align-items: center; justify-content: center; font-weight: 600; margin-bottom: 20px; }
        .stepCard:nth-child(2) .stepNum { background: var(--violet); color: #fff; }
        .stepCard:nth-child(3) .stepNum { background: var(--coral); color: #1a0a0d; }
        .stepCard h3 { font-size: 17px; font-weight: 600; margin-bottom: 9px; }
        .stepCard p { font-size: 14px; color: var(--text-dim); line-height: 1.55; }

        .finalCta { background: var(--bg-raised); border: 1px solid var(--border); border-radius: 24px; padding: 64px 40px; text-align: center; position: relative; overflow: hidden; }
        .finalCta::before { content: ""; position: absolute; inset: 0; background: radial-gradient(600px 300px at 50% 0%, rgba(139, 92, 246, 0.14), transparent); }
        .finalCta > * { position: relative; z-index: 1; }
        .finalCta h2 { margin-bottom: 14px; }
        .finalCta p { color: var(--text-dim); margin-bottom: 30px; }

        footer { padding: 36px 0; border-top: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; color: var(--text-faint); font-size: 13px; }
        @media (max-width: 600px) { footer { flex-direction: column; gap: 10px; text-align: center; } }
      `}</style>
    </div>
  );
}

const features = [
  {
    title: "Direct messages",
    body: "One-on-one threads that arrive the moment they're sent — read receipts and presence included.",
    color: "cyan",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>`,
  },
  {
    title: "Group chats",
    body: "Spin up a room for your crew, your team, or your match-day squad — everyone in sync, instantly.",
    color: "violet",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>`,
  },
  {
    title: "Live presence",
    body: "See who's online right now, not who was online five minutes ago. Presence updates over the socket.",
    color: "coral",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>`,
  },
  {
    title: "Typing indicators",
    body: "Know the moment someone's replying — no refreshing, no guessing, no awkward silences.",
    color: "cyan",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.97-4.03 9-9 9-1.5 0-2.9-.37-4.14-1.02L3 21l1.02-3.86A8.96 8.96 0 013 12c0-4.97 4.03-9 9-9s9 4.03 9 9z"/></svg>`,
  },
  {
    title: "Read receipts",
    body: "Every message tracks its own journey — sent, delivered, seen — right down to the timestamp.",
    color: "violet",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>`,
  },
  {
    title: "Sanctum-secured",
    body: "Token-based auth keeps every conversation locked to the people actually in it.",
    color: "coral",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>`,
  },
];

const steps = [
  { title: "Create your account", body: "Sign up with an email and password. Sanctum issues your token behind the scenes — nothing for you to configure." },
  { title: "Find your people", body: "Start a direct message or spin up a group. Add whoever needs to be in the room." },
  { title: "Go live", body: "Your socket connects automatically. From here, every message relays in real time — no reloads required." },
];