"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trophy, QrCode, Users, TimerReset } from "lucide-react";
import { QRCodeCanvas as QRCode } from "qrcode.react";
import { motion } from "framer-motion";
// ---- Types ----
type Attempt = {
  id: string;
  eventId?: string;
  name?: string;
  email?: string | null;
  score: number;
  total: number;
  durationMs: number;
  createdAt?: { toDate?: () => Date }; // Firestore Timestamp wrapper
};
// --- Branding & event settings ---
const QUIZ_TITLE = "Deep dive quiz";
// Set to "" (empty) to hide the logo completely
const LOGO_URL = "";

// Change this string for each new run so the leaderboard separates by event.
// Example: deep-dive-YYYY-MM-DD (no spaces)
const EVENT_ID = "deep-dive-2025-09-04";

// Firebase
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy,
  limit,
  getDocs,
  where,
} from "firebase/firestore";

/**
 * Quick start
 * 1) Create a Firebase project and enable Firestore (test mode for setup)
 * 2) Paste your web app config below
 * 3) Run locally with `npm run dev`, then deploy with Vercel
 *
 * Host view: open the same URL with `?host=1` to show a big QR code + live leaderboard
 */

// === Replace with your Firebase config ===
const firebaseConfig = {
  apiKey: "AIzaSyAZlW-iUUVg8fKUmoJ4a6xfVq5ckiYZd2E",
  authDomain: "deep-dive-quiz.firebaseapp.com",
  projectId: "deep-dive-quiz",
  storageBucket: "deep-dive-quiz.firebasestorage.app",
  messagingSenderId: "794396547313",
  appId: "Y1:794396547313:web:3adbda041b397ac250f150",
};
// ========================================

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

// ---- Question bank (35 items, 3 options each; answerIndex points to the correct option) ----
const QUESTION_BANK = [
  { id: "q01", text: "Did you know that US refrigerated warehouses consume _____more energy per sq. ft. than standard commercial buildings?", options: ["10-15x", "4-5x", "15-20x"], answerIndex: 1 },
  { id: "q02", text: "Did you know that there is a looming capacity crisis, with an estimated _____ financial advisors expected to retire by 2034 in the US?", options: ["110k", "55k", "220k"], answerIndex: 0 },
  { id: "q03", text: "Did you know that a single Bitcoin transaction can consume as much electricity as an average person in a developing country uses in ____ years?", options: ["6", "2", "3"], answerIndex: 2 },
  { id: "q04", text: "Did you know that the US had 5.7m hotel rooms across 60k operational hotels, making up roughly ____ of the global inventory?", options: ["30%", "40%", "15%"], answerIndex: 0 },
  { id: "q05", text: "Did you know that AI enabled predictive maintenance for drones cuts average downtime by _____?", options: ["15%", "25%", "50%"], answerIndex: 1 },
  { id: "q06", text: "Did you know that _____ of corrugated boxes are recycled in the US?", options: [">90%", ">45%", ">20%"], answerIndex: 0 },
  { id: "q07", text: "Did you know that food processing equipment typically has a useful life of _____ years?", options: ["10-15", "5-10", "1-5"], answerIndex: 0 },
  { id: "q08", text: "Did you know that the top _____ wood manufacturers in the US collectively held about 50% of the market share in 2023?", options: ["5", "10", "20"], answerIndex: 1 },
  { id: "q09", text: "Did you know that the number of EV chargers in North America is expected to rise from about 1.3m in 2019 to _____ by 2030?", options: ["~6m", "~11m", "~22m"], answerIndex: 1 },
  { id: "q10", text: "Did you know that the US accounts for _____ of consumer neurotechnology companies globally?", options: ["~95%", "~25%", "~50%"], answerIndex: 2 },
  { id: "q11", text: "Did you know that the number of new cancer cases globally is projected to rise from 20m in 2022 to _____ by 2050?", options: [">35m", ">50m", ">75m"], answerIndex: 0 },
  { id: "q12", text: "Did you know that the US spends more on defense than the next _____ countries with the largest military budgets combined?", options: ["9", "5", "20"], answerIndex: 0 },
  { id: "q13", text: "Did you know that geopolitical conflicts have restricted access to key maritime corridors, with _____ mines being deployed and ongoing attacks on commercial vessels?", options: [">100m", ">50m", ">200m"], answerIndex: 0 },
  { id: "q14", text: "Did you know that total US household debt reached a record about $18tn in Q4 2024, with the average household carrying about $_____ in debt?", options: ["55k", "210k", "105k"], answerIndex: 2 },
  { id: "q15", text: "Did you know that outsourcing billing can reduce costs by _____% for hospitals and healthcare providers?", options: ["30-40", "0-10", "50-60"], answerIndex: 0 },
  { id: "q16", text: "Did you know that women under 30 now account for _____ of all births in the US?", options: ["~10%", "~50%", "~90%"], answerIndex: 1 },
  { id: "q17", text: "Did you know that the US accounted for the _____ share of global confectionery sales in 2023?", options: ["3rd largest", "largest", "5th largest"], answerIndex: 0 },
  { id: "q18", text: "Did you know that deploying sensors in manufacturing can help reduce maintenance costs by _____?", options: ["75%", "50%", "25%"], answerIndex: 2 },
  { id: "q19", text: "Did you know that LEDs are expected to make up _____ of all global lighting sources by 2030?", options: ["~90%", "~45%", "~20%"], answerIndex: 0 },
  { id: "q20", text: "Did you know that _____ of beer consumed in the US was domestically produced?", options: ["~80%", "~40%", "~20%"], answerIndex: 0 },
  { id: "q21", text: "Did you know that about _____ of warehouses in North America are expected to employ some level of automation by 2028?", options: ["10%", "25%", "5%"], answerIndex: 1 },
  { id: "q22", text: "Did you know that the top _____ players hold about 60% of the oncology therapy market in 2024?", options: ["10", "50", "20"], answerIndex: 0 },
  { id: "q23", text: "Did you know that average monthly US household data usage is projected to reach 700GB by the end of 2024 and _____ by 2028?", options: ["2TB", "800GB", "1TB"], answerIndex: 2 },
  { id: "q24", text: "Did you know that the US has _____ miles of bike trails and dedicated lanes?", options: [">5k", ">35k", ">75k"], answerIndex: 1 },
  { id: "q25", text: "Did you know that manufacturing costs for EV batteries in the US are _____ higher than in China?", options: ["~20%", "~70%", "~5%"], answerIndex: 0 },
  { id: "q26", text: "Did you know that modern wind turbines can generate enough electricity in just _____ minutes to power an average American home for an entire month?", options: ["~200m", "~10m", "~50m"], answerIndex: 2 },
  { id: "q27", text: "Did you know that over _____ of total fashion sales in the US now happen online?", options: ["35%", "5%", "75%"], answerIndex: 0 },
  { id: "q28", text: "Did you know that North American farmers lead global AgTech adoption, with _____ using or planning to adopt at least one AgTech technology?", options: ["~10%", "~60%", "~95%"], answerIndex: 1 },
  { id: "q29", text: "Did you know that every $1 spent on OTC medicines saves the US healthcare system _____ by reducing doctor visits, prescription costs, and related expenses?", options: ["$6-7", "$30-34", "$100-110"], answerIndex: 0 },
  { id: "q30", text: "Did you know that AI can reduce product development times by up to _____ for polymers and other specialty chemical manufacturers, while also improving product performance?", options: ["30%", "15%", "60%"], answerIndex: 0 },
  { id: "q31", text: "Did you know that the average annual cost per student at US private higher education institutions rose significantly to about $_____ in 2022?", options: ["~100k", "~35k", "~10k"], answerIndex: 1 },
  { id: "q32", text: "Did you know that nearly _____ movie tickets were sold in the US?", options: ["600m", "100m", "25m"], answerIndex: 0 },
  { id: "q33", text: "Did you know that robotic assisted surgeries are expected to account for _____ of all orthopedic surgical procedures in the US by 2028?", options: [">90%", ">10%", ">50%"], answerIndex: 2 },
  { id: "q34", text: "Did you know that the global demand for AI ready data center capacity is expected to grow by _____ annually from 2023 to 2030?", options: ["33%", "66%", "99%"], answerIndex: 0 },
  { id: "q35", text: "Did you know _____ of dogs in the US visit the veterinarian at least once a year?", options: ["70%", "35%", "5%"], answerIndex: 1 },
];

const QUIZ_SIZE = 10; // pick 10 at runtime

// -------------------------- Utilities --------------------------
function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function pickRandom<T>(arr: T[], n: number): T[] {
  return shuffle(arr).slice(0, n);
}
function msToClock(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m.toString().padStart(2, "0")}:${r.toString().padStart(2, "0")}`;
}

export default function BYODQuiz() {
  const [isHost, setIsHost] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true); // we are now in the browser
    const url = new URL(window.location.href);
    setIsHost(url.searchParams.get("host") === "1");
  }, []);

  // Optional: while mounting, render nothing to avoid flakey SSR issues
  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto p-4 md:p-8">
        <Header isHost={isHost} />
        {isHost ? <HostView /> : <PlayerView />}
      </div>
    </div>
  );
}

function Header({ isHost }: { isHost: boolean }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        <Users className="w-6 h-6" />
        <h1 className="text-2xl font-semibold">{QUIZ_TITLE}</h1>
      </div>
      <div className="flex items-center gap-2 text-sm">
        {isHost ? (
          <span className="px-2 py-1 bg-yellow-100 rounded-full">Host mode</span>
        ) : (
          <span className="px-2 py-1 bg-emerald-100 rounded-full">Player mode</span>
        )}
      </div>
    </div>
  );
}

function HostView() {
  const [top, setTop] = useState<Attempt[]>([]);
useEffect(() => {
  const q = query(
    collection(db, "attempts"),
    where("eventId", "==", EVENT_ID),
    orderBy("score", "desc"),
    orderBy("durationMs", "asc"),
    orderBy("createdAt", "asc"),
    limit(100)
  );
  const unsub = onSnapshot(q, (snap) => {
    const rows: Attempt[] = [];
snap.forEach((doc) =>
  rows.push({ id: doc.id, ...(doc.data() as Omit<Attempt, "id">) })
);
    setTop(rows);
  });
  return () => unsub();
}, []);

  const joinUrl = useMemo(() => {
  if (typeof window === "undefined") return "";
  return window.location.origin + window.location.pathname;
}, []); 

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card className="shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <QrCode className="w-5 h-5" />
            <h2 className="text-lg font-medium">Join by scanning</h2>
          </div>
          <div className="flex flex-col items-center">
            <QRCode value={joinUrl} size={220} />
            <p className="text-sm mt-3 text-gray-600">Or visit: {joinUrl}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Trophy className="w-5 h-5" />
            <h2 className="text-lg font-medium">Live leaderboard</h2>
          </div>
          <LeaderboardTable rows={top} />
        </CardContent>
      </Card>
    </div>
  );
}

function LeaderboardTable({ rows }: { rows: Attempt[] }) {
  return (
    <div className="overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>#</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Score</TableHead>
            <TableHead>Time</TableHead>
            <TableHead>Submitted</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r, idx) => (
            <TableRow key={r.id}>
              <TableCell className="font-medium">{idx + 1}</TableCell>
              <TableCell>{r.name || "Anonymous"}</TableCell>
              <TableCell>
                <span className="font-semibold">{r.score}</span>
                <span className="text-gray-500">/{r.total}</span>
              </TableCell>
              <TableCell>{msToClock(r.durationMs || 0)}</TableCell>
              <TableCell>{r.createdAt?.toDate?.().toLocaleTimeString?.() || ""}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function PlayerView() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [started, setStarted] = useState(false);
  const [questions, setQuestions] = useState<typeof QUESTION_BANK>([]);
  const [answers, setAnswers] = useState<number[]>([]);
  const [index, setIndex] = useState(0);
  const [startMs, setStartMs] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<{ score: number; total: number; durationMs: number } | null>(null);
const [now, setNow] = useState<number>(Date.now());

useEffect(() => {
  if (started && startMs) {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }
}, [started, startMs]);

  // Restore state on refresh
  useEffect(() => {
    const saved = localStorage.getItem("quiz_state_v1");
    if (saved) {
      const s = JSON.parse(saved);
      setName(s.name || "");
      setEmail(s.email || "");
      setStarted(s.started || false);
      setQuestions(s.questions || []);
      setAnswers(s.answers || []);
      setIndex(s.index || 0);
      setStartMs(s.startMs || null);
      setSubmitted(s.submitted || false);
    }
    // ✳️ 6B: block re-entry if already submitted this EVENT_ID
  const done = localStorage.getItem(`quiz_done_${EVENT_ID}`) === "1";
  if (done) {
    setSubmitted(true);
    setResult(null);
  }
  }, []);
  useEffect(() => {
    const state = { name, email, started, questions, answers, index, startMs, submitted };
    localStorage.setItem("quiz_state_v1", JSON.stringify(state));
  }, [name, email, started, questions, answers, index, startMs, submitted]);
async function ensureUniqueName() {
  const trimmed = name.trim();
  if (!trimmed) {
    alert("Please enter your name.");
    return false;
  }
  // Check Firestore for an existing attempt with the same name for this event
  const nameQ = query(
    collection(db, "attempts"),
    where("eventId", "==", EVENT_ID),
    where("name", "==", trimmed)
  );
  const snap = await getDocs(nameQ);
  if (!snap.empty) {
    alert("That name is already taken. Please add an initial or choose a different name.");
    return false;
  }
  return true;
}

  function begin() {
    const picked = pickRandom(QUESTION_BANK, Math.min(QUIZ_SIZE, QUESTION_BANK.length));
    setQuestions(picked);
    setAnswers(new Array(picked.length).fill(-1));
    setIndex(0);
    setStartMs(Date.now());
    setStarted(true);
  }
  function choose(optionIndex: number) {
    const next = answers.slice();
    next[index] = optionIndex;
    setAnswers(next);
  }
  function nextQ() { if (index < questions.length - 1) setIndex(index + 1); }
  function prevQ() { if (index > 0) setIndex(index - 1); }

  async function submit() {
    if (!startMs) return;
    const durationMs = Date.now() - startMs;
    let score = 0;
    questions.forEach((q, i) => { if (answers[i] === q.answerIndex) score += 1; });

    const payload = {
      eventId: EVENT_ID,
      name: name.trim() || "Anonymous",
      email: email.trim() || null,
      score,
      total: questions.length,
      durationMs,
      createdAt: serverTimestamp(),
    };

    try {
      // Prevent duplicate submissions by same email within 1 hour (optional)
      if (payload.email) {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const dupQ = query(collection(db, "attempts"), where("email", "==", payload.email));
        const snap = await getDocs(dupQ);
        const hasRecent = snap.docs.some((d) => {
          const ts = d.data().createdAt?.toDate?.();
          return ts && ts > oneHourAgo;
        });
        if (hasRecent) {
          alert("An attempt for this email was recorded recently. Please try again later or use a different email.");
          return;
        }
      }
// Block duplicate by name within this event
{
  const dupByNameQ = query(
    collection(db, "attempts"),
    where("eventId", "==", EVENT_ID),
    where("name", "==", payload.name)
  );
  const nameSnap = await getDocs(dupByNameQ);
  if (!nameSnap.empty) {
    alert("An attempt under this name already exists for this event.");
    return;
  }
}

      await addDoc(collection(db, "attempts"), payload);
      localStorage.setItem(`quiz_done_${EVENT_ID}`, "1");
      setResult({ score: payload.score, total: payload.total, durationMs: payload.durationMs });
      setSubmitted(true);
    } catch (e) {
      console.error(e);
      alert("Could not submit. Please check your connection and try again.");
    }
  }

if (submitted) {
  return (
    <Card className="shadow-sm">
      <CardContent className="p-6">
        <h2 className="text-xl font-semibold mb-2">Thanks for playing</h2>
        {result ? (
          <p className="mb-4">
            Your score: <span className="font-semibold">{result.score}</span> of {result.total} in {msToClock(result.durationMs)}
          </p>
        ) : (
          <p className="mb-4">Our records show you have already submitted this quiz.</p>
        )}
        <p className="text-sm text-gray-600">You can watch the live leaderboard on the host screen.</p>
      </CardContent>
    </Card>
  );
}

  if (!started) {
    return (
      <Card className="shadow-sm">
        <CardContent className="p-6">
          <div className="grid md:grid-cols-2 gap-6 items-center">
            <div>
              <h2 className="text-xl font-semibold mb-1">Welcome to the quiz</h2>
              <p className="text-gray-600 mb-4">10 multiple choice questions. You will appear on the leaderboard after you submit.</p>
              <div className="grid gap-3">
                <Input placeholder="Your full name, including initials" value={name} onChange={(e) => setName(e.target.value)} />
                <Input placeholder="Email (optional)" value={email} onChange={(e) => setEmail(e.target.value)} />
                <Button
  className="w-full"
  onClick={async () => { if (await ensureUniqueName()) begin(); }}
  disabled={!name.trim()}
>
  Start quiz
</Button>

              </div>
            </div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="hidden md:block">
  {LOGO_URL && (
    <img
      alt="logo"
      src={LOGO_URL}
      className="rounded-2xl shadow max-h-40 object-contain bg-white p-4"
    />
  )}
</motion.div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const q = questions[index];
  const progressPct = Math.round(((index + 1) / questions.length) * 100);

  return (
    <Card className="shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TimerReset className="w-4 h-4" />
            <span className="text-sm text-gray-600">Elapsed: {startMs ? msToClock(now - startMs) : "00:00"}</span>
          </div>
          <div className="text-sm text-gray-600">Question {index + 1} of {questions.length}</div>
        </div>
        <Progress value={progressPct} className="mb-4" />

        <div className="mb-4">
          <h3 className="text-lg font-medium">{q?.text}</h3>
        </div>

        <div className="grid gap-3 mb-6">
          {q?.options.map((opt: string, i: number) => (
            <Button
              key={i}
              variant={answers[index] === i ? "default" : "outline"}
              className="justify-start h-auto whitespace-normal py-3"
              onClick={() => choose(i)}
            >
              <span className="mr-2">{String.fromCharCode(65 + i)}.</span> {opt}
            </Button>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={prevQ} disabled={index === 0}>Back</Button>
          {index < questions.length - 1 ? (
            <Button onClick={nextQ} disabled={answers[index] === -1}>Next</Button>
          ) : (
            <Button onClick={submit} disabled={answers.includes(-1)}>Submit</Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
